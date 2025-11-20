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

  // Storage: upload avatar to public bucket (WeChat uploadFile)
  async uploadAvatar(filePath, userId) {
    if (!this.enabled()) {
      return { success: true, url: filePath };
    }
    return new Promise((resolve) => {
      try {
        const bucket = (require('../config.js').storage && require('../config.js').storage.bucket) || 'avatars';
        const ext = (filePath.split('.').pop() || 'jpg').toLowerCase();
        const key = `${bucket}/${encodeURIComponent(userId || 'anon')}/${Date.now()}.${ext}`;
        const uploadUrl = `${this.url}/storage/v1/object/${key}`;
        wx.uploadFile({
          url: uploadUrl,
          filePath,
          name: 'file',
          header: {
            'Authorization': `Bearer ${this.anonKey}`,
            'apikey': this.anonKey,
            'Cache-Control': 'max-age=31536000',
            'x-upsert': 'true'
          },
          success: (res) => {
            // Public bucket can be accessed via /storage/v1/object/public/
            const publicUrl = `${this.url}/storage/v1/object/public/${key}`;
            resolve({ success: true, url: publicUrl });
          },
          fail: (err) => resolve({ success: false, message: err && err.errMsg || 'upload failed' })
        });
      } catch (e) {
        resolve({ success: false, message: e.message || 'upload failed' });
      }
    });
  }

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
      return { success: true, user: { id: `mock-${Date.now()}`, phone, name: `用户${phone.slice(-4)}`, role, status: 'active' }, token: 'mock' };
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
    try { 
      return await this.wxRpc('get_dashboard_stats', {}); 
    } catch (e) { 
      return { totalUsers: 0, totalTemplates: 0, totalWorks: 0, activeUsers: 0 }; 
    }
  }

  async getUsers(filter = {}) {
    if (!this.enabled()) return this.getMockUsers(filter);
    return [];
  }

  async saveUserWork(workData) {
    if (!this.enabled()) return { success: true, id: `mock-${Date.now()}` };
    try {
      const payload = Object.assign({}, workData);
      const res = await this.wxRest('/rest/v1/works', { method: 'POST', data: payload });
      const id = Array.isArray(res) && res[0] && (res[0].work_id || res[0].id) || null;
      return { success: true, id };
    } catch (e) { return { success: false, message: e.message || '保存失败' }; }
  }

  async getUserWorks(userId) {
    if (!this.enabled()) return [];
    try {
      const q = `?select=work_id,work_name,scene_type,template_id,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=100`;
      return await this.wxRest(`/rest/v1/works${q}`);
    } catch (e) { return []; }
  }

  // ===== Profile RPCs =====
  async getUserProfileById(userId) {
    if (!this.enabled()) {
      return { success: true, user: { id: userId || `mock-${Date.now()}`, phone: '13800000000', name: '用户', nickname: '用户', avatar_url: '', bio: '', location: '', website: '', member_status: false } };
    }
    try {
      const data = await this.wxRpc('get_user_profile', { p_user_id: userId });
      return data;
    } catch (e) { return { success: false, message: e.message || '获取用户信息失败' }; }
  }

  async updateUserProfile(payload) {
    if (!this.enabled()) {
      return { success: true, user: payload };
    }
    try {
      const data = await this.wxRpc('update_user_profile', payload);
      return data;
    } catch (e) { return { success: false, message: e.message || '更新失败' }; }
  }

  async getUserStats(userId, clientUid) {
    if (!this.enabled()) {
      return { success: true, stats: { drafts: 0, works: 0, favorites: 0 } };
    }
    try {
      const data = await this.wxRpc('get_user_stats', { p_user_id: userId, p_client_uid: clientUid || null });
      return data;
    } catch (e) { return { success: false, message: e.message || '获取统计失败' }; }
  }

  // ===== Security Settings =====
  async updatePassword(userId, oldPassword, newPassword) {
    if (!this.enabled()) {
      return { success: true, message: '密码更新成功' };
    }
    try {
      const data = await this.wxRpc('update_user_password', { 
        p_user_id: userId, 
        p_old_password: oldPassword, 
        p_new_password: newPassword 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '密码更新失败' }; }
  }

  async enableTwoFactorAuth(userId) {
    if (!this.enabled()) {
      return { success: true, message: '双重验证已开启', qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0xMDAgNTBoMjV2MjVoLTI1eiIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==' };
    }
    try {
      const data = await this.wxRpc('enable_two_factor_auth', { p_user_id: userId });
      return data;
    } catch (e) { return { success: false, message: e.message || '开启双重验证失败' }; }
  }

  async disableTwoFactorAuth(userId, code) {
    if (!this.enabled()) {
      return { success: true, message: '双重验证已关闭' };
    }
    try {
      const data = await this.wxRpc('disable_two_factor_auth', { 
        p_user_id: userId, 
        p_code: code 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '关闭双重验证失败' }; }
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
    } catch (e) { return { success: false, message: e.message || '获取通知失败' }; }
  }

  async markNotificationAsRead(userId, notificationId) {
    if (!this.enabled()) {
      return { success: true, message: '标记成功' };
    }
    try {
      const data = await this.wxRpc('mark_notification_read', { 
        p_user_id: userId, 
        p_notification_id: notificationId 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '标记失败' }; }
  }

  async deleteNotification(userId, notificationId) {
    if (!this.enabled()) {
      return { success: true, message: '删除成功' };
    }
    try {
      const data = await this.wxRpc('delete_notification', { 
        p_user_id: userId, 
        p_notification_id: notificationId 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '删除失败' }; }
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
    } catch (e) { return { success: false, message: e.message || '获取隐私设置失败' }; }
  }

  async updatePrivacySettings(userId, settings) {
    if (!this.enabled()) {
      return { success: true, message: '隐私设置已更新' };
    }
    try {
      const data = await this.wxRpc('update_privacy_settings', { 
        p_user_id: userId, 
        p_settings: settings 
      });
      return data;
    } catch (e) { return { success: false, message: e.message || '更新隐私设置失败' }; }
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
    } catch (e) { return { success: false, message: e.message || '获取扩展统计失败' }; }
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
    } catch (e) { return { success: false, message: e.message || '获取图表数据失败' }; }
  }

  async listWorks(clientUid, userId = null, limit = 50) {
    if (!this.enabled()) return [];
    const params = [];
    if (userId) params.push(`user_id=eq.${encodeURIComponent(userId)}`);
    if (clientUid) params.push(`client_uid=eq.${encodeURIComponent(clientUid)}`);
    const query = `?select=work_id,work_name,scene_type,template_id,created_at&order=created_at.desc&limit=${limit}` + (params.length?`&${params.join('&')}`:'');
    try { return await this.wxRest(`/rest/v1/works${query}`); } catch (e) { return []; }
  }

  // Mock data
  getMockTemplates(category = null) {
    const templates = [
      { id: 'template-1', name: '商务会议海报', category: '商务海报', cover_url: '/images/templates/business-poster.jpg', description: '适用于商务会议', download_count: 156, usage_count: 89, status: 'active', created_at: '2024-01-15T00:00:00Z' },
      { id: 'template-2', name: '产品促销海报', category: '电商产品', cover_url: '/images/templates/promotion-poster.jpg', description: '电商促销', download_count: 234, usage_count: 167, status: 'active', created_at: '2024-02-20T00:00:00Z' },
      { id: 'template-3', name: '教育培训模板', category: '教育培训', cover_url: '/images/templates/education-poster.jpg', description: '教育培训', download_count: 89, usage_count: 45, status: 'inactive', created_at: '2024-03-10T00:00:00Z' }
    ];
    if (category) return templates.filter(t => t.category === category);
    return templates;
  }

  getMockUsers(filter = {}) {
    const users = [
      { id: 'user-1', phone: '13800000001', name: '张三', role: 'user', status: 'active', last_login: '2024-11-17T09:30:00Z', created_at: '2024-01-15T00:00:00Z' },
      { id: 'user-2', phone: '13800000002', name: '李四', role: 'user', status: 'active', last_login: '2024-11-16T14:20:00Z', created_at: '2024-02-20T00:00:00Z' },
      { id: 'admin-user', phone: '13800000000', name: '管理员', role: 'admin', status: 'active', last_login: '2024-11-17T10:00:00Z', created_at: '2024-01-01T00:00:00Z' }
    ];
    if (filter.status) return users.filter(u => u.status === filter.status);
    if (filter.role) return users.filter(u => u.role === filter.role);
    return users;
  }

  // ===== Drafts & Versions =====
  async upsertDraft({ draftId = null, userId = null, clientUid = null, name, size, workData, note = '' }) {
    if (!this.enabled()) return { success: false, message: 'Supabase disabled' };
    try {
      const res = await this.wxRpc('upsert_draft', {
        p_draft_id: draftId,
        p_user_id: userId,
        p_client_uid: clientUid,
        p_name: name,
        p_size: size,
        p_work_data: workData,
        p_note: note
      });
      return res;
    } catch (e) { return { success: false, message: e.message || 'upsert draft failed' }; }
  }

  async listDrafts(userId = null, clientUid = null) {
    if (!this.enabled()) return { success: true, items: [] };
    try { return await this.wxRpc('list_drafts', { p_user_id: userId, p_client_uid: clientUid }); } catch (e) { return { success: false, items: [] }; }
  }

  async getDraft(draftId) {
    if (!this.enabled()) return { success: false };
    try { return await this.wxRpc('get_draft', { p_draft_id: draftId }); } catch (e) { return { success: false }; }
  }

  async listDraftVersions(draftId) {
    if (!this.enabled()) return { success: true, versions: [] };
    try { return await this.wxRpc('list_draft_versions', { p_draft_id: draftId }); } catch (e) { return { success: false, versions: [] }; }
  }

  async deleteDraft(draftId) {
    if (!this.enabled()) return { success: true };
    try { return await this.wxRpc('delete_draft', { p_draft_id: draftId }); } catch (e) { return { success: false }; }
  }

  async restoreDraftVersion(draftId, versionNo, note = null) {
    if (!this.enabled()) return { success: false };
    try { return await this.wxRpc('restore_draft_version', { p_draft_id: draftId, p_version_no: versionNo, p_note: note }); } catch (e) { return { success: false }; }
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
  
  // 新增的用户中心相关API
  updatePassword: (userId, oldPassword, newPassword) => supabaseService.updatePassword(userId, oldPassword, newPassword),
  enableTwoFactorAuth: (userId) => supabaseService.enableTwoFactorAuth(userId),
  disableTwoFactorAuth: (userId, code) => supabaseService.disableTwoFactorAuth(userId, code),
  getUserNotifications: (userId, page, pageSize) => supabaseService.getUserNotifications(userId, page, pageSize),
  markNotificationAsRead: (userId, notificationId) => supabaseService.markNotificationAsRead(userId, notificationId),
  deleteNotification: (userId, notificationId) => supabaseService.deleteNotification(userId, notificationId),
  getPrivacySettings: (userId) => supabaseService.getPrivacySettings(userId),
  updatePrivacySettings: (userId, settings) => supabaseService.updatePrivacySettings(userId, settings),
  getUserExtendedStats: (userId, timeRange) => supabaseService.getUserExtendedStats(userId, timeRange),
  getStatisticsChartData: (userId, timeRange) => supabaseService.getStatisticsChartData(userId, timeRange),
  // drafts
  upsertDraft: (payload) => supabaseService.upsertDraft(payload),
  listDrafts: (userId, clientUid) => supabaseService.listDrafts(userId, clientUid),
  getDraft: (draftId) => supabaseService.getDraft(draftId),
  listDraftVersions: (draftId) => supabaseService.listDraftVersions(draftId),
  deleteDraft: (draftId) => supabaseService.deleteDraft(draftId),
  restoreDraftVersion: (draftId, versionNo, note) => supabaseService.restoreDraftVersion(draftId, versionNo, note)
};
