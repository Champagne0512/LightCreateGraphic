const app = getApp();

Page({
  data: {
    keyword: '',
    scenes: [],
    recoTemplates: []
  },
  
  onLoad() {
    console.log('涓婚〉闈㈠姞杞?);
    this.initPageData();
  },
  
  onShow() {
    // 椤甸潰鏄剧ず鏃堕噸鏂板姞杞芥暟鎹?    this.initPageData();
  },
  
  initPageData() {
    const scenes = app.globalData.scenes || [];
    const templates = app.globalData.templates || [];
    
    console.log('鍔犺浇鍦烘櫙鏁版嵁:', scenes.length);
    console.log('鍔犺浇妯℃澘鏁版嵁:', templates.length);
    
    this.setData({
      scenes: scenes.length > 0 ? scenes : this.getDefaultScenes(),
      recoTemplates: templates.length > 0 ? templates.slice(0, 4) : this.getDefaultTemplates()
    });
  },
  
  // 榛樿鍦烘櫙鏁版嵁
  getDefaultScenes() {
    return [
      { id: 'business', name: '鍟嗗姟娴锋姤', icon: '馃捈', children: [{id: '1', name: '浼氳娴锋姤'}, {id: '2', name: '浜у搧灞曠ず'}] },
      { id: 'social', name: '绀句氦濯掍綋', icon: '馃摫', children: [{id: '3', name: '鏈嬪弸鍦?}, {id: '4', name: '寰崥'}] },
      { id: 'education', name: '鏁欒偛鍩硅', icon: '馃摎', children: [{id: '5', name: '璇剧▼娴锋姤'}, {id: '6', name: '鐭ヨ瘑鍒嗕韩'}] },
      { id: 'ecommerce', name: '鐢靛晢浜у搧', icon: '馃洅', children: [{id: '7', name: '鍟嗗搧涓诲浘'}, {id: '8', name: '淇冮攢娴锋姤'}] }
    ];
  },
  
  // 榛樿妯℃澘鏁版嵁
  getDefaultTemplates() {
    return [
      { id: 'template-1', name: '鍟嗗姟浼氳娴锋姤', scene: '鍟嗗姟娴锋姤', coverColor: '#3498db', description: '涓撲笟鐨勫晢鍔′細璁浼犳ā鏉? },
      { id: 'template-2', name: '浜у搧淇冮攢娴锋姤', scene: '鐢靛晢浜у搧', coverColor: '#e74c3c', description: '鍚稿紩鐪肩悆鐨勪骇鍝佷績閿€璁捐' },
      { id: 'template-3', name: '鏁欒偛鍩硅妯℃澘', scene: '鏁欒偛鍩硅', coverColor: '#2ecc71', description: '閫傚悎鏁欒偛鍩硅鏈烘瀯鐨勬ā鏉? },
      { id: 'template-4', name: '绀句氦濯掍綋灏侀潰', scene: '绀句氦濯掍綋', coverColor: '#f39c12', description: '绀句氦濯掍綋骞冲彴涓撶敤灏侀潰' }
    ];
  },
  
  onSearchInput(e) { 
    this.setData({ keyword: e.detail.value }); 
  },
  
  onSearch() {
    const kw = (this.data.keyword || '').trim();
    if (!kw) {
      wx.showToast({ title: '璇疯緭鍏ユ悳绱㈠叧閿瘝', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/templates/list?kw=${encodeURIComponent(kw)}` });
  },
  
  // 蹇€熸悳绱?  quickSearch(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword });
    wx.navigateTo({ url: `/pages/templates/list?kw=${encodeURIComponent(keyword)}` });
  },
  
  openScene(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/templates/list?scene=${id}` });
  },
  
  // 鎵撳紑鍦烘櫙鍒嗙被
  openSceneCategory(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/templates/list?scene=${id}` });
  },
  
  useTemplate(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/editor/index?templateId=${id}` });
  },
  
  createBlank() {
    wx.navigateTo({ url: '/pages/editor/index?templateId=tpl_blank_square' });
  },
  
  openDrafts() {
    wx.navigateTo({ url: '/pages/profile/index?section=drafts' });
  },
  
  // 鎵撳紑妯℃澘搴?  openTemplates() {
    wx.navigateTo({ url: '/pages/templates/list' });
  },
  
  // 鎵撳紑鏁欑▼
  openTutorial() {
    wx.showToast({ title: '鏁欑▼鍔熻兘寮€鍙戜腑', icon: 'none' });
  },
  
  // 鏌ョ湅鎵€鏈夊満鏅?  viewAllScenes() {
    wx.navigateTo({ url: '/pages/templates/list' });
  },
  
  // 鏌ョ湅鎵€鏈夋ā鏉?  viewAllTemplates() {
    wx.navigateTo({ url: '/pages/templates/list' });
  }
});


