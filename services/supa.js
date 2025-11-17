const config = require('../config.js');

// Supabase 客户端封装
class SupabaseService {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;
    this.init();
  }

  init() {
    try {
      // 检查配置是否存在
      if (!config || !config.supabase) {
        console.warn('Supabase 配置未找到，使用模拟模式');
        return;
      }

      const { url, anonKey } = config.supabase;
      
      if (!url || !anonKey) {
        console.warn('Supabase 配置不完整，使用模拟模式');
        return;
      }

      // 在实际项目中，这里应该导入Supabase客户端库
      // 由于微信小程序环境限制，这里使用模拟实现
      this.isInitialized = true;
      console.log('Supabase 服务初始化完成');
    } catch (error) {
      console.error('Supabase 初始化失败:', error);
    }
  }

  // 检查服务是否可用
  enabled() {
    return this.isInitialized;
  }

  // 用户认证相关方法
  async signUp(email, password, userInfo) {
    if (!this.enabled()) {
      // 模拟注册成功
      return {
        success: true,
        user: {
          id: 'mock-user-id-' + Date.now(),
          email: email,
          name: userInfo.name || email.split('@')[0],
          role: 'user',
          status: 'active'
        },
        token: 'mock-token-' + Date.now()
      };
    }

    // 实际Supabase注册逻辑
    // 这里应该是实际的API调用
  }

  async signIn(email, password) {
    if (!this.enabled()) {
      // 模拟登录成功
      if (email === 'admin@lightcreate.com' && password === 'admin123') {
        return {
          success: true,
          user: {
            id: 'admin-user-id',
            email: email,
            name: '系统管理员',
            role: 'admin',
            status: 'active'
          },
          token: 'mock-admin-token'
        };
      }
      
      // 普通用户登录
      return {
        success: true,
        user: {
          id: 'mock-user-id-' + Date.now(),
          email: email,
          name: email.split('@')[0],
          role: 'user',
          status: 'active'
        },
        token: 'mock-token-' + Date.now()
      };
    }

    // 实际Supabase登录逻辑
  }

  async signOut() {
    if (!this.enabled()) {
      // 模拟登出成功
      return { success: true };
    }

    // 实际Supabase登出逻辑
  }

  // 模板相关方法
  async listTemplates(category = null) {
    if (!this.enabled()) {
      // 返回模拟模板数据
      return this.getMockTemplates(category);
    }

    // 实际Supabase查询逻辑
  }

  async getTemplateById(id) {
    if (!this.enabled()) {
      // 模拟模板查询
      const templates = this.getMockTemplates();
      return templates.find(t => t.id === id) || null;
    }

    // 实际Supabase查询逻辑
  }

  async createTemplate(templateData) {
    if (!this.enabled()) {
      // 模拟创建模板
      return {
        success: true,
        template: {
          id: 'template-' + Date.now(),
          ...templateData,
          created_at: new Date().toISOString(),
          status: 'active'
        }
      };
    }

    // 实际Supabase创建逻辑
  }

  // 用户作品相关方法
  async saveUserWork(workData) {
    if (!this.enabled()) {
      // 模拟保存作品
      return {
        success: true,
        work: {
          id: 'work-' + Date.now(),
          ...workData,
          created_at: new Date().toISOString()
        }
      };
    }

    // 实际Supabase保存逻辑
  }

  async getUserWorks(userId) {
    if (!this.enabled()) {
      // 模拟获取用户作品
      return [];
    }

    // 实际Supabase查询逻辑
  }

  // 管理后台相关方法
  async getDashboardStats() {
    if (!this.enabled()) {
      // 模拟仪表板数据
      return {
        totalUsers: 156,
        totalTemplates: 23,
        todayVisits: 89,
        activeUsers: 45
      };
    }

    // 实际Supabase查询逻辑
  }

  async getUsers(filter = {}) {
    if (!this.enabled()) {
      // 模拟用户数据
      return this.getMockUsers(filter);
    }

    // 实际Supabase查询逻辑
  }

  // 模拟数据方法
  getMockTemplates(category = null) {
    const templates = [
      {
        id: 'template-1',
        name: '商务会议海报',
        category: '商务海报',
        cover_url: '/images/templates/business-poster.jpg',
        description: '适用于商务会议的专业海报模板',
        download_count: 156,
        usage_count: 89,
        status: 'active',
        created_at: '2024-01-15T00:00:00Z'
      },
      {
        id: 'template-2',
        name: '产品促销海报',
        category: '电商产品',
        cover_url: '/images/templates/promotion-poster.jpg',
        description: '电商产品促销专用海报模板',
        download_count: 234,
        usage_count: 167,
        status: 'active',
        created_at: '2024-02-20T00:00:00Z'
      },
      {
        id: 'template-3',
        name: '教育培训模板',
        category: '教育培训',
        cover_url: '/images/templates/education-poster.jpg',
        description: '教育培训机构专用模板',
        download_count: 89,
        usage_count: 45,
        status: 'inactive',
        created_at: '2024-03-10T00:00:00Z'
      }
    ];

    if (category) {
      return templates.filter(t => t.category === category);
    }

    return templates;
  }

  getMockUsers(filter = {}) {
    const users = [
      {
        id: 'user-1',
        email: 'zhangsan@example.com',
        name: '张三',
        role: 'user',
        status: 'active',
        last_login: '2024-11-17T09:30:00Z',
        created_at: '2024-01-15T00:00:00Z'
      },
      {
        id: 'user-2',
        email: 'lisi@example.com',
        name: '李四',
        role: 'user',
        status: 'active',
        last_login: '2024-11-16T14:20:00Z',
        created_at: '2024-02-20T00:00:00Z'
      },
      {
        id: 'user-3',
        email: 'wangwu@example.com',
        name: '王五',
        role: 'user',
        status: 'inactive',
        last_login: '2024-10-25T11:15:00Z',
        created_at: '2024-03-10T00:00:00Z'
      },
      {
        id: 'admin-user',
        email: 'admin@lightcreate.com',
        name: '系统管理员',
        role: 'admin',
        status: 'active',
        last_login: '2024-11-17T10:00:00Z',
        created_at: '2024-01-01T00:00:00Z'
      }
    ];

    if (filter.status) {
      return users.filter(u => u.status === filter.status);
    }

    if (filter.role) {
      return users.filter(u => u.role === filter.role);
    }

    return users;
  }
}

// 创建单例实例
const supabaseService = new SupabaseService();

// 导出兼容旧版本的函数
module.exports = {
  enabled: () => supabaseService.enabled(),
  listTemplates: (category) => supabaseService.listTemplates(category),
  signUp: (email, password, userInfo) => supabaseService.signUp(email, password, userInfo),
  signIn: (email, password) => supabaseService.signIn(email, password),
  signOut: () => supabaseService.signOut(),
  getDashboardStats: () => supabaseService.getDashboardStats(),
  getUsers: (filter) => supabaseService.getUsers(filter),
  saveUserWork: (workData) => supabaseService.saveUserWork(workData),
  getUserWorks: (userId) => supabaseService.getUserWorks(userId)
};