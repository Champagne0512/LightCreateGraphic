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
      const select = 'template_id,scene_type,template_name,cover_color,template_data,created_at';
      if (category) where.push(`scene_type=eq.${encodeURIComponent(category)}`);
      const query = `?select=${encodeURIComponent(select)}&${where.join('&')}&order=created_at.desc&limit=50`;
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
  getUserWorks: (userId) => supabaseService.getUserWorks(userId)
};

