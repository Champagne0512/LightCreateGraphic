App({
  globalData: {
    scenes: [],
    templates: [],
    currentWork: null,
    clientUid: '',
    userInfo: null,
    isLogin: false,
    isLoggedIn: false,
    isAdmin: false,
    supabaseConfig: {
      url: 'YOUR_SUPABASE_URL',
      anonKey: 'YOUR_SUPABASE_ANON_KEY'
    }
  },

  onLaunch() {
    console.log('轻创图文小程序启动');

    // 初始化全局数据
    this.globalData.scenes = [];
    this.globalData.templates = [];

    // 尝试加载 mock 数据
    try {
      const scenes = require('./mock/scenes.js');
      const templates = require('./mock/templates.js');
      
      if (scenes && scenes.list) {
        this.globalData.scenes = scenes.list;
      }
      
      if (templates && templates.list) {
        this.globalData.templates = templates.list;
      }
      
      console.log('Mock数据加载成功');
    } catch (e) {
      console.warn('Mock数据加载失败，使用默认数据');
      // 设置默认数据
      this.globalData.scenes = [
        { id: 'business', name: '商务海报', icon: 'shop', children: [{ id: '1', name: '会议海报' }, { id: '2', name: '产品展示' }] },
        { id: 'social', name: '社交媒体', icon: 'share', children: [{ id: '3', name: '朋友圈' }, { id: '4', name: '微博' }] },
        { id: 'education', name: '教育培训', icon: 'work', children: [{ id: '5', name: '课程海报' }, { id: '6', name: '知识分享' }] },
        { id: 'ecommerce', name: '电商产品', icon: 'shop', children: [{ id: '7', name: '商品主图' }, { id: '8', name: '促销海报' }] }
      ];
      
      this.globalData.templates = [
        { id: 'tpl_blank_square', scene: 'general', name: '空白画布(1:1)', coverColor: '#ffffff', templateData: { size:{w:1080,h:1080}, backgroundColor:'#ffffff', elements: [] } }
      ];
    }

    // 检查登录状态
    this.checkLoginStatus();

    // 初始化 Supabase（真实调用在 services/supa.js）
    this.initSupabase();

    // 延迟加载 Supabase 模板数据
    setTimeout(() => {
      try {
        const supa = require('./services/supa.js');
        if (supa && supa.enabled && supa.enabled()) {
          supa.listTemplates().then(list => {
            if (Array.isArray(list) && list.length) {
              this.globalData.templates = list.map(t => ({
                id: t.template_id || t.id,
                scene: t.scene_type || t.scene,
                name: t.template_name || t.name,
                coverColor: (t.cover_color || '#ffffff'),
                templateData: t.template_data || t.templateData
              }));
            }
          }).catch(() => {});
        }
      } catch (e) {}
    }, 1000);
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token && userInfo) {
      this.globalData.isLogin = true;
      this.globalData.isLoggedIn = true;
      this.globalData.userInfo = userInfo;
      this.globalData.isAdmin = userInfo.role === 'admin';
      this.validateToken(token);
    }
  },

  initSupabase() {
    console.log('初始化 Supabase 配置');
  },

  validateToken(token) {
    console.log('验证 token 有效性');
  },

  // 登录
  login(userInfo) {
    this.globalData.isLogin = true;
    this.globalData.isLoggedIn = true;
    this.globalData.userInfo = userInfo;
    this.globalData.isAdmin = userInfo.role === 'admin';
    wx.setStorageSync('token', userInfo.token || 'mock-token');
    wx.setStorageSync('userInfo', userInfo);
  },

  // 登出
  logout() {
    this.globalData.isLogin = false;
    this.globalData.isLoggedIn = false;
    this.globalData.userInfo = null;
    this.globalData.isAdmin = false;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.reLaunch({ url: '/pages/index/index' });
  }
});