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
    console.log('杞诲垱鍥炬枃灏忕▼搴忓惎鍔?);

    try {
      const { getClientUid } = require('./utils/client.js');
      this.globalData.clientUid = getClientUid();
      const scenes = require('./mock/scenes.js');
      const templates = require('./mock/templates.js');
      this.globalData.scenes = scenes.list || [];
      this.globalData.templates = templates.list || [];
    } catch (e) {
      console.error('Mock 鏁版嵁鍔犺浇澶辫触', e);
    }

    // 妫€鏌ョ櫥褰曠姸鎬?    this.checkLoginStatus();

    // 鍒濆鍖?Supabase锛堢湡瀹炶皟鐢ㄥ湪 services/supa.js锛?    this.initSupabase();

    // 鑻ュ凡鍚敤 Supabase锛屽皾璇曟媺鍙栨ā鏉?    try {
      const supa = require('./services/supa.js');
      if (supa.enabled()) {
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
  },

  checkLoginStatus() {
    // 妫€鏌ユ湰鍦板瓨鍌ㄧ殑鐧诲綍鐘舵€?    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (token && userInfo) {
      this.globalData.isLogin = true;
      this.globalData.isLoggedIn = true;
      this.globalData.userInfo = userInfo;
      this.globalData.isAdmin = userInfo.role === 'admin';

      // 楠岃瘉 token 鏈夋晥鎬э紙鍙寜闇€瀹炵幇锛?      this.validateToken(token);
    }
  },

  initSupabase() {
    console.log('鍒濆鍖朣upabase閰嶇疆');
  },

  validateToken(token) {
    console.log('楠岃瘉token鏈夋晥鎬?);
  },

  // 鐧诲綍鏂规硶
  login(userInfo) {
    this.globalData.isLogin = true;
    this.globalData.isLoggedIn = true;
    this.globalData.userInfo = userInfo;
    this.globalData.isAdmin = userInfo.role === 'admin';

    // 淇濆瓨鍒版湰鍦板瓨鍌?    wx.setStorageSync('token', userInfo.token || 'mock-token');
    wx.setStorageSync('userInfo', userInfo);
  },

  // 鐧诲嚭鏂规硶
  logout() {
    this.globalData.isLogin = false;
    this.globalData.isLoggedIn = false;
    this.globalData.userInfo = null;
    this.globalData.isAdmin = false;

    // 娓呴櫎鏈湴瀛樺偍
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');

    // 璺宠浆鍒扮櫥褰曢〉
    wx.reLaunch({ url: '/pages/auth/login' });
  }
});


