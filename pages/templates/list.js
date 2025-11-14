const app = getApp();

Page({
  data: {
    list: [],
    scene: '',
    sceneName: '',
    kw: ''
  },
  onLoad(query) {
    const { scene = '', kw = '' } = query || {};
    const templates = app.globalData.templates || [];
    let list = templates;
    let sceneName = '';
    if (scene) {
      list = list.filter(t => t.scene === scene || t.scene === 'any');
      const scenes = app.globalData.scenes || [];
      scenes.forEach(cat => (cat.children||[]).forEach(s => { if (s.id === scene) sceneName = s.name; }));
    }
    if (kw) {
      list = list.filter(t => (t.name||'').toLowerCase().includes(decodeURIComponent(kw).toLowerCase()));
    }
    this.setData({ list, scene, sceneName, kw: decodeURIComponent(kw) });
  },
  useTemplate(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/editor/index?templateId=${id}` });
  }
});

