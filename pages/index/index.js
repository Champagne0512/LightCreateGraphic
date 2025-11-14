const app = getApp();

Page({
  data: {
    keyword: '',
    scenes: [],
    recoTemplates: []
  },
  onLoad() {
    const scenes = app.globalData.scenes || [];
    const templates = app.globalData.templates || [];
    this.setData({
      scenes,
      recoTemplates: templates.slice(0, 4)
    });
  },
  onSearchInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() {
    const kw = (this.data.keyword || '').trim();
    if (!kw) return;
    wx.navigateTo({ url: `/pages/templates/list?kw=${encodeURIComponent(kw)}` });
  },
  openScene(e) {
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
  }
});

