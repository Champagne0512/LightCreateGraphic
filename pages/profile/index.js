const { loadDrafts } = require('../../utils/storage.js');
const { getClientUid } = require('../../utils/client.js');
const { enabled, listWorks } = (()=>{ try { return require('../../services/supa.js'); } catch(e){ return {enabled:()=>false, listWorks: async()=>[]}; } })();

Page({
  data: { drafts: [], cloudWorks: [] },
  async onShow() {
    const drafts = loadDrafts();
    this.setData({ drafts });
    try {
      if (enabled()) {
        const list = await listWorks(getClientUid());
        this.setData({ cloudWorks: list || [] });
      }
    } catch (e) {}
  },
  openDraft(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/editor/index?draftId=${id}` });
  }
});
