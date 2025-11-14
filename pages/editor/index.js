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
    exportOpt: { format: 'jpg', transparent: false, watermark: true, upload: true }
  },
  onLoad(query) {
    const { templateId = 'tpl_blank_square', draftId = '' } = query || {};
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
  onUnload() { try { saveDraft(this.data.work); } catch (e) {} },
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
    work.elements = (work.elements||[]).map(el => {
      if (el.type === 'text') {
        const s = approxTextSize(el.text||'', el.fontSize||36);
        el._w = s.w; el._h = s.h;
      } else if (el.type === 'rect') {
        el._w = el.width || 100; el._h = el.height || 50;
      } else if (el.type === 'image') {
        el._w = el.width || 200; el._h = el.height || 200;
      }
      return el;
    });
    this.setData({ work });
  },
  addText() {
    const el = { id: uid('t'), type:'text', text:'双击编辑文字', color:'#111', fontSize:36, x: this.data.work.size.w/2, y: 120, align:'center' };
    const work = this.data.work; work.elements.push(el);
    this.setData({ work, selectedId: el.id, selected: el }, () => this.recomputeOverlay());
  },
  addRect() {
    const el = { id: uid('r'), type:'rect', color:'#07c160', width:200, height:60, x: this.data.work.size.w/2, y: this.data.work.size.h/2 };
    const work = this.data.work; work.elements.push(el);
    this.setData({ work, selectedId: el.id, selected: el }, () => this.recomputeOverlay());
  },
  addImage() {
    const that = this;
    wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album','camera'], success(res) {
      const path = (res.tempFilePaths||[])[0];
      if (!path) return;
      const el = { id: uid('img'), type:'image', src: path, width: 300, height: 300, x: that.data.work.size.w/2, y: that.data.work.size.h/2 };
      const work = that.data.work; work.elements.push(el);
      that.setData({ work, selectedId: el.id, selected: el }, () => { that.recomputeOverlay(); that.commitHistory(); });
    }});
  },
  changeBg() {
    const that = this;
    wx.showActionSheet({
      itemList: this.data.colors,
      success(res) {
        const color = that.data.colors[res.tapIndex];
        const work = that.data.work; work.backgroundColor = color; that.setData({ work });
      }
    });
  },
  setColor(e) {
    const color = e.currentTarget.dataset.color;
    const sel = this.data.selected; if (!sel) return;
    sel.color = color; this.setData({ selected: sel }, () => { this.recomputeOverlay(); this.commitHistory(); });
  },
  onPropInput(e) {
    const key = e.currentTarget.dataset.key;
    const sel = this.data.selected; if (!sel) return;
    sel[key] = e.detail.value;
    this.setData({ selected: sel }, () => { this.recomputeOverlay(); /* 文本实时不入栈 */ });
  },
  onPropSlider(e) {
    const key = e.currentTarget.dataset.key;
    const sel = this.data.selected; if (!sel) return;
    sel[key] = e.detail.value;
    this.setData({ selected: sel }, () => { this.recomputeOverlay(); this.commitHistory(); });
  },
  onMove(e) {
    const id = e.currentTarget.dataset.id;
    const el = (this.data.work.elements||[]).find(x => x.id === id);
    if (!el) return;
    const dx = Math.round(e.detail.x / this.data.scale);
    const dy = Math.round(e.detail.y / this.data.scale);
    const halfW = Math.round((el._w || 80) / 2);
    const halfH = Math.round((el._h || 40) / 2);
    let x = dx + halfW;
    let y = dy + halfH;
    const cx = Math.round(this.data.work.size.w/2);
    const cy = Math.round(this.data.work.size.h/2);
    const th = 8; // 吸附阈值
    const nearV = Math.abs(x - cx) <= th;
    const nearH = Math.abs(y - cy) <= th;
    if (nearV) x = cx;
    if (nearH) y = cy;
    el.x = x; el.y = y;
    this.setData({ selected: el, showVGuide: nearV, showHGuide: nearH });
  },
  // 历史记录（撤销/重做）
  commitHistory() {
    const past = this.data.history.past.slice(0, 49); // 限制50步
    past.push(JSON.parse(JSON.stringify(this.data.work)));
    this.setData({ history: { past, future: [] } });
  },
  undo() {
    const { past, future } = this.data.history;
    if (past.length <= 1) return;
    const current = past[past.length - 1];
    const prev = past[past.length - 2];
    future.unshift(current);
    const newPast = past.slice(0, -1);
    this.setData({ work: JSON.parse(JSON.stringify(prev)), history: { past: newPast, future } }, () => this.recomputeOverlay());
  },
  redo() {
    const { past, future } = this.data.history;
    if (!future.length) return;
    const next = future[0];
    const newFuture = future.slice(1);
    const newPast = past.concat([next]);
    this.setData({ work: JSON.parse(JSON.stringify(next)), history: { past: newPast, future: newFuture } }, () => this.recomputeOverlay());
  },
  deleteSelected() {
    const id = this.data.selectedId; if (!id) return;
    const work = this.data.work; work.elements = (work.elements||[]).filter(el => el.id !== id);
    this.setData({ work, selectedId: '', selected: null }, () => { this.recomputeOverlay(); this.commitHistory(); });
  },
  duplicateSelected() {
    const el = this.data.selected; if (!el) return;
    const copy = JSON.parse(JSON.stringify(el));
    copy.id = uid(copy.type === 'text' ? 't' : copy.type === 'rect' ? 'r' : 'img');
    copy.x += 20; copy.y += 20;
    const work = this.data.work; work.elements.push(copy);
    this.setData({ work, selectedId: copy.id, selected: copy }, () => { this.recomputeOverlay(); this.commitHistory(); });
  },
  bringForward() {
    const id = this.data.selectedId; if (!id) return;
    const list = this.data.work.elements; const idx = list.findIndex(x => x.id === id);
    if (idx >= 0 && idx < list.length - 1) { const t = list[idx]; list[idx] = list[idx+1]; list[idx+1] = t; this.setData({ work: this.data.work }, () => this.commitHistory()); }
  },
  sendBackward() {
    const id = this.data.selectedId; if (!id) return;
    const list = this.data.work.elements; const idx = list.findIndex(x => x.id === id);
    if (idx > 0) { const t = list[idx]; list[idx] = list[idx-1]; list[idx-1] = t; this.setData({ work: this.data.work }, () => this.commitHistory()); }
  },
  replaceImage() {
    const sel = this.data.selected; if (!sel || sel.type !== 'image') return;
    const that = this;
    wx.chooseImage({ count:1, success(res){ const p=(res.tempFilePaths||[])[0]; if(!p) return; sel.src=p; that.setData({ selected: sel }, ()=>{ that.recomputeOverlay(); that.commitHistory(); }); } });
  },
  exportImg() {
    const work = this.data.work;
    const ctx = wx.createCanvasContext('editorCanvas', this);
    const opt = this.data.exportOpt;
    const drawOpt = { transparentBackground: (opt.format==='png' && opt.transparent), watermarkText: opt.watermark ? 'Made with LCG' : '' };
    drawWorkToCanvas(ctx, work, drawOpt);
    ctx.draw(false, () => {
      wx.canvasToTempFilePath({
        canvasId: 'editorCanvas',
        width: work.size.w,
        height: work.size.h,
        destWidth: work.size.w,
        destHeight: work.size.h,
        quality: 1,
        fileType: opt.format === 'png' ? 'png' : 'jpg',
        success: res => {
          const localPath = res.tempFilePath;
          const goPreview = (remoteUrl='') => {
            const url = `/pages/export/index?img=${encodeURIComponent(localPath)}` + (remoteUrl?`&remote=${encodeURIComponent(remoteUrl)}`:'');
            wx.navigateTo({ url });
          };
          // 云端保存作品与预览（可选）
          const doCloud = async () => {
            try {
              if (!enabled() || !this.data.exportOpt.upload) return goPreview('');
              const key = `${getClientUid()}/${Date.now()}_${work.id}.${opt.format==='png'?'png':'jpg'}`;
              const up = await require('../../services/supa.js').uploadPreview(localPath, key);
              const remoteUrl = up.publicUrl || '';
              const payload = {
                client_uid: getClientUid(),
                work_name: work.name || work.id,
                scene_type: work.scene || '',
                template_id: work.template_id || '',
                work_data: work,
                preview_url: remoteUrl,
                is_private: false
              };
              await saveWork(payload).catch(()=>{});
              goPreview(remoteUrl);
            } catch (e) { goPreview(''); }
          };
          doCloud();
        },
        fail: err => wx.showToast({ title: '导出失败', icon: 'none' })
      }, this);
    });
  }
});
