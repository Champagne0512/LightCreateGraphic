App({
  globalData: {
    scenes: [],
    templates: [],
    currentWork: null,
    clientUid: '',
    userInfo: null,
    isLogin: false,
    isAdmin: false,
    supabaseConfig: {
      url: 'YOUR_SUPABASE_URL',
      anonKey: 'YOUR_SUPABASE_ANON_KEY'
    }
  },
  
  onLaunch() {
    console.log('轻创图文小程序启动');
    
    try {
      const { getClientUid } = require('./utils/client.js');
      this.globalData.clientUid = getClientUid();
      const scenes = require('./mock/scenes.js');
      const templates = require('./mock/templates.js');
      this.globalData.scenes = scenes.list || [];
      this.globalData.templates = templates.list || [];
    } catch (e) {
      console.error('Mock 数据加载失败', e);
    }

    // 检查登录状态
    this.checkLoginStatus();
    
    // 初始化Supabase
    this.initSupabase();

    // 尝试从 Supabase 拉取模板（存在且已启用时）
    try {
      const supa = require('./services/supa.js');
      if (supa.enabled()) {
        supa.listTemplates().then(list => {
          if (Array.isArray(list) && list.length) this.globalData.templates = list.map(t => ({
            id: t.template_id || t.id,
            scene: t.scene_type || t.scene,
            name: t.template_name || t.name,
            coverColor: (t.cover_color || '#ffffff'),
            templateData: t.template_data || t.templateData
          }));
        }).catch(() => {});
      }
    } catch (e) {}
  },
  
  checkLoginStatus() {
    // 检查本地存储的登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.globalData.isLogin = true;
      this.globalData.userInfo = userInfo;
      this.globalData.isAdmin = userInfo.role === 'admin';
      
      // 验证token有效性
      this.validateToken(token);
    }
  },
  
  initSupabase() {
    // 初始化Supabase客户端
    // 这里需要配置实际的Supabase项目信息
    console.log('初始化Supabase配置');
  },
  
  validateToken(token) {
    // 验证token有效性
    // 实际项目中应该调用API验证
    console.log('验证token有效性');
  },
  
  // 登录方法
  login(userInfo) {
    this.globalData.isLogin = true;
    this.globalData.userInfo = userInfo;
    this.globalData.isAdmin = userInfo.role === 'admin';
    
    // 保存到本地存储
    wx.setStorageSync('token', userInfo.token || 'mock-token');
    wx.setStorageSync('userInfo', userInfo);
  },
  
  // 登出方法
  logout() {
    this.globalData.isLogin = false;
    this.globalData.userInfo = null;
    this.globalData.isAdmin = false;
    
    // 清除本地存储
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/auth/login'
    });
  }
});
