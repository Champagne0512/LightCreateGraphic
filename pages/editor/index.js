const app = getApp();
const uid = require('../../utils/uid.js');
const { drawWorkToCanvas } = require('../../utils/draw.js');
const { saveDraft } = require('../../utils/storage.js');
const { enabled, saveWork } = (()=>{ try { return require('../../services/supa.js'); } catch(e){ return {enabled:()=>false, saveWork: async()=>({})}; } })();
const { getClientUid } = require('../../utils/client.js');

function approxTextSize(text, fontSize) {
  const w = Math.floor((text || '').length * (fontSize || 36) * 0.6);
  const h = Math.floor((fontSize || 36) * 1.2);
  return { w, h };
}

Page({
  data: {
    displayWidth: 320,
    displayHeight: 320,
    scale: 1, // display px per design px
    colors: ['#111','#333','#666','#999','#ffffff','#ff4757','#ffa502','#2ed573','#1e90ff','#9c88ff','#07c160'],
    work: {
      id: '',
      size: { w: 1080, h: 1080 },
      backgroundColor: '#ffffff',
      elements: []
    },
    selectedId: '',
    selected: null,
    showVGuide: false,
    showHGuide: false,
    history: { past: [], future: [] },
    showExportPanel: false,
    exportOpt: { format: 'jpg', transparent: false, watermark: true, upload: true },

    // 画笔功能相关数据
    drawMode: null, // 'brush' | 'eraser' | null
    brushSize: 5,
    brushColor: '#111',
    isDrawing: false,
    lastX: 0,
    lastY: 0
  },

  onLoad(query) {
    const { templateId = 'tpl_blank_square', draftId = '', w = '', h = '' } = query || {};
    if (draftId) {
      try {
        const { getDraftById } = require('../../utils/storage.js');
        const d = getDraftById(draftId);
        if (d) {
          const work = JSON.parse(JSON.stringify(d));
          this.setData({ work }, () => { this.calcDisplaySize(); this.recomputeOverlay(); });
          return;
        }
      } catch (e) {}
    }
    const tpl = (app.globalData.templates || []).find(t => t.id === templateId);
    const work = tpl ? JSON.parse(JSON.stringify(tpl.templateData)) : { size:{w:1080,h:1080}, backgroundColor:'#ffffff', elements:[] };
    if (w && h) {
      const wi = parseInt(w, 10); const hi = parseInt(h, 10);
      if (wi > 0 && hi > 0) work.size = { w: wi, h: hi };
    }
    work.id = uid('work');
    this.setData({ work }, () => { this.calcDisplaySize(); this.recomputeOverlay(); this.commitHistory(); });
  },

  // 导出面板交互
  openExportPanel() { this.setData({ showExportPanel: true }); },
  closeExportPanel() { this.setData({ showExportPanel: false }); },
  onFormatChange(e) { const v = e.detail.value; this.setData({ exportOpt: { ...this.data.exportOpt, format: v } }); },
  onTransparentChange(e) { this.setData({ exportOpt: { ...this.data.exportOpt, transparent: e.detail.value } }); },
  onWatermarkChange(e) { this.setData({ exportOpt: { ...this.data.exportOpt, watermark: e.detail.value } }); },
  onUploadChange(e) { this.setData({ exportOpt: { ...this.data.exportOpt, upload: e.detail.value } }); },
  onReady() { this.calcDisplaySize(); },
  onUnload() {
    try {
      const work = this.data.work;
      saveDraft(work);
      try {
        if (enabled()) {
          const app = getApp();
          const u = app.globalData.userInfo || {};
          require('../../services/supa.js').upsertDraft({
            draftId: work.id,
            userId: u.userId || null,
            clientUid: getClientUid(),
            name: work.name || work.id,
            size: work.size,
            workData: work,
            note: 'auto-save'
          });
        }
      } catch (_) {}
    } catch (e) {}
  },
  calcDisplaySize() {
    const sys = wx.getSystemInfoSync();
    const pad = 32; // page padding
    const maxW = sys.windowWidth - pad * 2;
    const { w, h } = this.data.work.size;
    const scale = Math.min(maxW / w, 420 / h, 1) * (w > 0 ? 1 : 1);
    const displayWidth = Math.round(w * scale);
    const displayHeight = Math.round(h * scale);
    this.setData({ displayWidth, displayHeight, scale });
  },
  toPx(v) { return Math.round((v || 0) * this.data.scale); },
  selectEl(e) {
    const id = e.currentTarget.dataset.id;
    const el = (this.data.work.elements || []).find(x => x.id === id);
    this.setData({ selectedId: id, selected: el });
  },
  recomputeOverlay() {
    const work = this.data.work;
    work.elements = (work.elements || []).map(el => el); // placeholder
    this.setData({ work });
  },
  commitHistory() {
    const past = this.data.history.past.slice(0, 19);
    past.unshift(JSON.stringify(this.data.work));
    this.setData({ 'history.past': past, 'history.future': [] });
  }
});