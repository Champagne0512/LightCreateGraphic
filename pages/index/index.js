const app = getApp();

Page({
  data: {
    keyword: '',
    scenes: [],
    recoTemplates: [],
    loggedIn: false,
    userName: ''
  },

  onLoad() {
    this.initPageData();
    this.syncAuth();
  },

  onShow() {
    this.syncAuth();
    this.initPageData();
  },

  syncAuth() {
    const app = getApp();
    const globalData = app.globalData || {};
    
    // 检查多个可能的登录状态字段
    const isLoggedIn = globalData.isLogin || globalData.isLoggedIn || false;
    const userName = globalData.userInfo ? 
      (globalData.userInfo.nickname || globalData.userInfo.name || '用户') : 
      '';
    
    this.setData({
      loggedIn: isLoggedIn,
      userName: userName
    });
    
    console.log('登录状态同步:', {
      loggedIn: isLoggedIn,
      userName: userName,
      globalData: {
        isLogin: globalData.isLogin,
        isLoggedIn: globalData.isLoggedIn,
        userInfo: globalData.userInfo
      }
    });
  },

  initPageData() {
    const scenes = app.globalData.scenes || [];
    const templates = app.globalData.templates || [];
    this.setData({
      scenes: scenes.length > 0 ? scenes : this.getDefaultScenes(),
      recoTemplates: templates.length > 0 ? templates.slice(0, 4) : this.getDefaultTemplates()
    });
  },

  // 默认场景数据
  getDefaultScenes() {
    return [
      { id: 'business', name: '商务海报', icon: '💼', children: [{ id: '1', name: '会议海报' }, { id: '2', name: '产品展示' }] },
      { id: 'social', name: '社交媒体', icon: '📱', children: [{ id: '3', name: '朋友圈' }, { id: '4', name: '微博' }] },
      { id: 'education', name: '教育培训', icon: '📚', children: [{ id: '5', name: '课程海报' }, { id: '6', name: '知识分享' }] },
      { id: 'ecommerce', name: '电商产品', icon: '🛒', children: [{ id: '7', name: '商品主图' }, { id: '8', name: '促销海报' }] }
    ];
  },

  // 默认模板数据
  getDefaultTemplates() {
    return [
      { id: 'template-1', name: '商务会议海报', scene: '商务海报', coverColor: '#3498db', description: '专业的商务会议宣传模板' },
      { id: 'template-2', name: '产品促销海报', scene: '电商产品', coverColor: '#e74c3c', description: '吸引眼球的产品促销设计' },
      { id: 'template-3', name: '教育培训模板', scene: '教育培训', coverColor: '#2ecc71', description: '适合教育培训机构的模板' },
      { id: 'template-4', name: '社交媒体封面', scene: '社交媒体', coverColor: '#f39c12', description: '社交媒体平台专用封面' }
    ];
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    const kw = (this.data.keyword || '').trim();
    if (!kw) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/templates/list?kw=${encodeURIComponent(kw)}` });
  },

  // 快速搜索
  quickSearch(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword });
    wx.navigateTo({ url: `/pages/templates/list?kw=${encodeURIComponent(keyword)}` });
  },

  // 打开场景分类
  openSceneCategory(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/templates/list?scene=${id}` });
  },

  useTemplate(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/editor/index?templateId=${id}` });
  },

  // 新建：弹出尺寸预设
  createBlank() {
    const options = ['正方形 1080×1080', '竖版 1080×1920', '横版 1920×1080'];
    const map = [ {w:1080,h:1080}, {w:1080,h:1920}, {w:1920,h:1080} ];
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const sel = map[res.tapIndex] || map[0];
        wx.navigateTo({ url: `/pages/editor/index?templateId=tpl_blank_square&w=${sel.w}&h=${sel.h}` });
      }
    });
  },

  openDrafts() { wx.navigateTo({ url: '/pages/profile/index?section=drafts' }); },
  openTemplates() { wx.switchTab({ url: '/pages/templates/index' }); },
  goLogin() { wx.navigateTo({ url: '/pages/auth/login' }); },
  goRegister() { wx.navigateTo({ url: '/pages/auth/register' }); },
  openProfile() { wx.switchTab({ url: '/pages/profile/index' }); },
  logoutFromHome() {
    const app = getApp();
    try { app.logout(); }
    catch(e){ wx.removeStorageSync('token'); wx.removeStorageSync('userInfo'); wx.reLaunch({ url: '/pages/index/index' }); }
  }
});