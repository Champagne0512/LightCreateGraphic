const config = require('../config.js');

// Supabase REST wrapper for WeChat Mini Program (wx.request)
class SupabaseService {
  constructor() {
    this.isInitialized = false;
    this.url = null;
    this.anonKey = null;
    this.init();
  }

  init() {
    try {
      if (!config || !config.supabase) {
        console.warn('Supabase config not found, using mock mode');
        return;
      }
      const { url, anonKey } = config.supabase;
      const isPlaceholder = !url || !anonKey ||
        url.includes('your-project') || url.includes('YOUR_SUPABASE_URL') ||
        anonKey.includes('your-supabase-anon-key') || anonKey.includes('YOUR_SUPABASE_ANON_KEY');
      if (isPlaceholder) {
        console.warn('Supabase config is placeholder, using mock mode');
        return;
      }
      this.url = url.replace(/\/$/, '');
      this.anonKey = anonKey;
      this.isInitialized = true;
      console.log('Supabase service ready');
    } catch (e) {
      console.error('Supabase init failed:', e);
      this.isInitialized = false;
    }
  }

  enabled() { return this.isInitialized; }

  // Core REST call
  wxRest(path, { method = 'GET', data = null, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      if (!this.enabled()) return reject(new Error('Supabase disabled'));
      wx.request({
        url: `${this.url}${path}`,
        method,
        data,
        header: Object.assign({
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json'
        }, headers),
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(res.data);
          reject(new Error((res.data && (res.data.message || res.data.error_description)) || `HTTP ${res.statusCode}`));
        },
        fail: (err) => reject(err)
      });
    });
  }

  // RPC
  wxRpc(name, params) { return this.wxRest(`/rest/v1/rpc/${name}`, { method: 'POST', data: params }); }

  // Auth: phone + password (custom table)
  async signUpPhone(phone, password, name = '') {
    if (!this.enabled()) {
      return { success: true, user: { id: `mock-${Date.now()}`, phone, name: name || `User${phone.slice(-4)}`, role: 'user', status: 'active' }, token: 'mock' };
    }
    try {
      const data = await this.wxRpc('register_user', { p_phone: phone, p_password: password, p_name: name });
      if (data && data.success) return { success: true, user: data.user, token: null };
      return { success: false, message: (data && data.message) || 'Register failed' };
    } catch (e) { return { success: false, message: e.message || 'Register failed' }; }
  }

  async signInPhone(phone, password) {
    if (!this.enabled()) {
      const role = phone === '13800000000' ? 'admin' : 'user';
      return { success: true, user: { id: `mock-${Date.now()}`, phone, name: `鐢ㄦ埛${phone.slice(-4)}`, role, status: 'active' }, token: 'mock' };
    }
    try {
      const data = await this.wxRpc('login_user', { p_phone: phone, p_password: password });
      if (data && data.success) return { success: true, user: data.user, token: null };
      return { success: false, message: (data && data.message) || 'Login failed' };
    } catch (e) { return { success: false, message: e.message || 'Login failed' }; }
  }

  // Aliases for email flows (unused for now)
  async signUp(email, password, userInfo = {}) { return this.signUpPhone(email, password, userInfo.name); }
  async signIn(email, password) { return this.signInPhone(email, password); }

  async signOut() { return { success: true }; }

  // Templates
  async listTemplates(category = null) {
    if (!this.enabled()) return this.getMockTemplates(category);
    try {
      const where = [`status=eq.active`];
      const select = 'template_id,scene_type,template_name,cover_color,template_data';
      if (category) where.push(`scene_type=eq.${encodeURIComponent(category)}`);
      const query = `?select=${encodeURIComponent(select)}&${where.join('&')}&limit=50`;
      const data = await this.wxRest(`/rest/v1/templates${query}`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('fetch templates failed, fallback to mock:', e.message);
      return this.getMockTemplates(category);
    }
  }

  async getDashboardStats() {
    if (!this.enabled()) return { totalUsers: 1234, totalTemplates: 56, totalWorks: 789, activeUsers: 45 };
    return { totalUsers: 0, totalTemplates: 0, totalWorks: 0, activeUsers: 0 };
  }

  async getUsers(filter = {}) {
    if (!this.enabled()) return this.getMockUsers(filter);
    return [];
  }

  async saveUserWork(workData) { return { success: true, id: `work-${Date.now()}` }; }
  async getUserWorks(userId) { return []; }

  // ===== Profile RPCs =====
  async getUserProfileById(userId) {
    if (!this.enabled()) {
      return { success: true, user: { id: userId || `mock-${Date.now()}`, phone: '13800000000', name: '鐢ㄦ埛', nickname: '鐢ㄦ埛', avatar_url: '', bio: '', location: '', website: '', member_status: false } };
    }
    try {
      const data = await this.wxRpc('get_user_profile', { p_user_id: userId });
      return data;
    } catch (e) { return { success: false, message: e.message || '鑾峰彇鐢ㄦ埛淇℃伅澶辫触' }; }
  }

  async updateUserProfile(payload) {
    if (!this.enabled()) {
      return { success: true, user: payload };
    }
    try {
      const data = await this.wxRpc('update_user_profile', payload);
      return data;
    } catch (e) { return { success: false, message: e.message || '鏇存柊澶辫触' }; }
  }

  async getUserStats(userId, clientUid) {
    if (!this.enabled()) {
      return { success: true, stats: { drafts: 0, works: 0, favorites: 0 } };
    }
    try {
      const data = await this.wxRpc('get_user_stats', { p_user_id: userId, p_client_uid: clientUid || null });
      return data;
    } catch (e) { return { success: false, message: e.message || '鑾峰彇缁熻澶辫触' }; }
  }

  // ===== Security Settings =====
  async updatePassword(userId, oldPassword, newPassword) {
    if (!this.enabled()) {
      return { success: true, message: '瀵嗙爜鏇存柊鎴愬姛' };
    }
    try {
      const data = await this.wxRpc('update_user_password', { 
        p_user_id: userId, 
        p_old_password: oldPassword, 
        p_new_password: newPassword 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '瀵嗙爜鏇存柊澶辫触' }; }
  }

  async enableTwoFactorAuth(userId) {
    if (!this.enabled()) {
      return { success: true, message: '鍙岄噸楠岃瘉宸插紑鍚?, qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0xMDAgNTBoMjV2MjVoLTI1eiIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==' };
    }
    try {
      const data = await this.wxRpc('enable_two_factor_auth', { p_user_id: userId });
      return data;
    } catch (e) { return { success: false, message: e.message || '寮€鍚弻閲嶉獙璇佸け璐? }; }
  }

  async disableTwoFactorAuth(userId, code) {
    if (!this.enabled()) {
      return { success: true, message: '鍙岄噸楠岃瘉宸插叧闂? };
    }
    try {
      const data = await this.wxRpc('disable_two_factor_auth', { 
        p_user_id: userId, 
        p_code: code 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '鍏抽棴鍙岄噸楠岃瘉澶辫触' }; }
  }

  // ===== Notifications Management =====
  async getUserNotifications(userId, page = 1, pageSize = 20) {
    if (!this.enabled()) {
      return { success: true, notifications: [], total: 0 };
    }
    try {
      const data = await this.wxRpc('get_user_notifications', { 
        p_user_id: userId, 
        p_page: page, 
        p_page_size: pageSize 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '鑾峰彇閫氱煡澶辫触' }; }
  }

  async markNotificationAsRead(userId, notificationId) {
    if (!this.enabled()) {
      return { success: true, message: '鏍囪鎴愬姛' };
    }
    try {
      const data = await this.wxRpc('mark_notification_read', { 
        p_user_id: userId, 
        p_notification_id: notificationId 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '鏍囪澶辫触' }; }
  }

  async deleteNotification(userId, notificationId) {
    if (!this.enabled()) {
      return { success: true, message: '鍒犻櫎鎴愬姛' };
    }
    try {
      const data = await this.wxRpc('delete_notification', { 
        p_user_id: userId, 
        p_notification_id: notificationId 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '鍒犻櫎澶辫触' }; }
  }

  // ===== Privacy Settings =====
  async getPrivacySettings(userId) {
    if (!this.enabled()) {
      return { success: true, settings: {
        profile_visible: true,
        works_visible: true,
        show_online_status: true,
        data_collection: true,
        marketing_emails: false
      } };
    }
    try {
      const data = await this.wxRpc('get_privacy_settings', { p_user_id: userId });
      return data;
    } catch (e) { return { success: false, message: e.message || '鑾峰彇闅愮璁剧疆澶辫触' }; }
  }

  async updatePrivacySettings(userId, settings) {
    if (!this.enabled()) {
      return { success: true, message: '闅愮璁剧疆宸叉洿鏂? };
    }
    try {
      const data = await this.wxRpc('update_privacy_settings', { 
        p_user_id: userId, 
        p_settings: settings 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '鏇存柊闅愮璁剧疆澶辫触' }; }
  }

  // ===== Extended Statistics =====
  async getUserExtendedStats(userId, timeRange = 'week') {
    if (!this.enabled()) {
      return { success: true, stats: {
        templates: { current: 25, total: 47, trend: 'up' },
        downloads: { current: 156, total: 892, trend: 'up' },
        views: { current: 1250, total: 4780, trend: 'up' },
        memberDays: { current: 30, total: 120, trend: 'stable' }
      } };
    }
    try {
      const data = await this.wxRpc('get_user_extended_stats', { 
        p_user_id: userId, 
        p_time_range: timeRange 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '鑾峰彇鎵╁睍缁熻澶辫触' }; }
  }

  async getStatisticsChartData(userId, timeRange = 'week') {
    if (!this.enabled()) {
      return { success: true, chartData: [
        { date: '11-11', works: 3, favorites: 5, downloads: 12 },
        { date: '11-12', works: 5, favorites: 8, downloads: 18 },
        { date: '11-13', works: 7, favorites: 12, downloads: 25 },
        { date: '11-14', works: 6, favorites: 10, downloads: 20 },
        { date: '11-15', works: 8, favorites: 15, downloads: 30 },
        { date: '11-16', works: 10, favorites: 18, downloads: 35 },
        { date: '11-17', works: 12, favorites: 22, downloads: 40 }
      ] };
    }
    try {
      const data = await this.wxRpc('get_statistics_chart_data', { 
        p_user_id: userId, 
        p_time_range: timeRange 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '鑾峰彇鍥捐〃鏁版嵁澶辫触' }; }
  }

  async listWorks(clientUid, userId = null, limit = 50) {
    if (!this.enabled()) return [];
    const params = [];
    if (userId) params.push(`user_id=eq.${encodeURIComponent(userId)}`);
    if (clientUid) params.push(`client_uid=eq.${encodeURIComponent(clientUid)}`);
    const query = `?select=work_id,work_name,scene_type,template_id,created_at&order=created_at.desc&limit=${limit}` + (params.length?`&${params.join('&')}`:'');
    try { return await this.wxRest(`/rest/v1/works${query}`); } catch { return []; }
  }

  // Mock data
  getMockTemplates(category = null) {
    const templates = [
      { id: 'template-1', name: '鍟嗗姟浼氳娴锋姤', category: '鍟嗗姟娴锋姤', cover_url: '/images/templates/business-poster.jpg', description: '閫傜敤浜庡晢鍔′細璁?, download_count: 156, usage_count: 89, status: 'active', created_at: '2024-01-15T00:00:00Z' },
      { id: 'template-2', name: '浜у搧淇冮攢娴锋姤', category: '鐢靛晢浜у搧', cover_url: '/images/templates/promotion-poster.jpg', description: '鐢靛晢淇冮攢', download_count: 234, usage_count: 167, status: 'active', created_at: '2024-02-20T00:00:00Z' },
      { id: 'template-3', name: '鏁欒偛鍩硅妯℃澘', category: '鏁欒偛鍩硅', cover_url: '/images/templates/education-poster.jpg', description: '鏁欒偛鍩硅', download_count: 89, usage_count: 45, status: 'inactive', created_at: '2024-03-10T00:00:00Z' }
    ];
    if (category) return templates.filter(t => t.category === category);
    return templates;
  }

  getMockUsers(filter = {}) {
    const users = [
      { id: 'user-1', phone: '13800000001', name: '寮犱笁', role: 'user', status: 'active', last_login: '2024-11-17T09:30:00Z', created_at: '2024-01-15T00:00:00Z' },
      { id: 'user-2', phone: '13800000002', name: '鏉庡洓', role: 'user', status: 'active', last_login: '2024-11-16T14:20:00Z', created_at: '2024-02-20T00:00:00Z' },
      { id: 'admin-user', phone: '13800000000', name: '绠＄悊鍛?, role: 'admin', status: 'active', last_login: '2024-11-17T10:00:00Z', created_at: '2024-01-01T00:00:00Z' }
    ];
    if (filter.status) return users.filter(u => u.status === filter.status);
    if (filter.role) return users.filter(u => u.role === filter.role);
    return users;
  }
}

// Singleton export
const supabaseService = new SupabaseService();
module.exports = {
  enabled: () => supabaseService.enabled(),
  listTemplates: (category) => supabaseService.listTemplates(category),
  signUp: (email, password, userInfo) => supabaseService.signUp(email, password, userInfo),
  signIn: (email, password) => supabaseService.signIn(email, password),
  signUpPhone: (phone, password, name) => supabaseService.signUpPhone(phone, password, name),
  signInPhone: (phone, password) => supabaseService.signInPhone(phone, password),
  signOut: () => supabaseService.signOut(),
  getDashboardStats: () => supabaseService.getDashboardStats(),
  getUsers: (filter) => supabaseService.getUsers(filter),
  saveUserWork: (workData) => supabaseService.saveUserWork(workData),
  getUserWorks: (userId) => supabaseService.getUserWorks(userId),
  listWorks: (clientUid, userId, limit) => supabaseService.listWorks(clientUid, userId, limit),
  getUserProfileById: (userId) => supabaseService.getUserProfileById(userId),
  updateUserProfile: (payload) => supabaseService.updateUserProfile(payload),
  getUserStats: (userId, clientUid) => supabaseService.getUserStats(userId, clientUid),
  
  // 鏂板鐨勭敤鎴蜂腑蹇冪浉鍏矨PI
  updatePassword: (userId, oldPassword, newPassword) => supabaseService.updatePassword(userId, oldPassword, newPassword),
  enableTwoFactorAuth: (userId) => supabaseService.enableTwoFactorAuth(userId),
  disableTwoFactorAuth: (userId, code) => supabaseService.disableTwoFactorAuth(userId, code),
  getUserNotifications: (userId, page, pageSize) => supabaseService.getUserNotifications(userId, page, pageSize),
  markNotificationAsRead: (userId, notificationId) => supabaseService.markNotificationAsRead(userId, notificationId),
  deleteNotification: (userId, notificationId) => supabaseService.deleteNotification(userId, notificationId),
  getPrivacySettings: (userId) => supabaseService.getPrivacySettings(userId),
  updatePrivacySettings: (userId, settings) => supabaseService.updatePrivacySettings(userId, settings),
  getUserExtendedStats: (userId, timeRange) => supabaseService.getUserExtendedStats(userId, timeRange),
  getStatisticsChartData: (userId, timeRange) => supabaseService.getStatisticsChartData(userId, timeRange)
};

