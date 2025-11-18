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
    drawMode: null, // 'brush' 或 'eraser' 或 null
    brushSize: 5,
    brushColor: '#111',
    isDrawing: false,
    lastX: 0,
    lastY: 0
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
    this.setData({ work, selectedId: el.id, selected: el }, () => { this.recomputeOverlay(); this.commitHistory(); });
  },
  addRect() {
    const el = { id: uid('r'), type:'rect', color:'#07c160', width:200, height:60, x: this.data.work.size.w/2, y: this.data.work.size.h/2 };
    const work = this.data.work; work.elements.push(el);
    this.setData({ work, selectedId: el.id, selected: el }, () => { this.recomputeOverlay(); this.commitHistory(); });
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
        const work = that.data.work; work.backgroundColor = color; that.setData({ work }, () => that.commitHistory());
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
  
  onMoveEnd() {
    // 移动结束后提交历史记录
    this.commitHistory();
  },
  // 获取当前画笔内容状态
  getBrushState() {
    return new Promise((resolve) => {
      // 如果没有画笔模式，返回空状态
      if (!this.data.drawMode) {
        resolve({
          brushImage: null,
          drawMode: null,
          brushSize: this.data.brushSize,
          brushColor: this.data.brushColor
        });
        return;
      }
      
      // 获取画笔canvas的内容
      wx.canvasToTempFilePath({
        canvasId: 'brushCanvas',
        success: (res) => {
          resolve({
            brushImage: res.tempFilePath,
            drawMode: this.data.drawMode,
            brushSize: this.data.brushSize,
            brushColor: this.data.brushColor
          });
        },
        fail: () => {
          // 如果获取失败，返回当前画笔状态
          resolve({
            brushImage: null,
            drawMode: this.data.drawMode,
            brushSize: this.data.brushSize,
            brushColor: this.data.brushColor
          });
        }
      }, this);
    });
  },

  // 恢复画笔内容状态
  restoreBrushState(brushState) {
    if (!brushState) return;
    
    const ctx = wx.createCanvasContext('brushCanvas', this);
    ctx.clearRect(0, 0, this.data.displayWidth, this.data.displayHeight);
    
    // 如果有保存的画笔图像，则绘制
    if (brushState.brushImage) {
      ctx.drawImage(brushState.brushImage, 0, 0, this.data.displayWidth, this.data.displayHeight);
    }
    ctx.draw(true);
    
    // 恢复画笔状态
    this.setData({
      drawMode: brushState.drawMode,
      brushSize: brushState.brushSize,
      brushColor: brushState.brushColor
    });
  },

  // 统一历史记录（撤销/重做）
  async commitHistory() {
    const brushState = await this.getBrushState();
    const historyEntry = {
      work: JSON.parse(JSON.stringify(this.data.work)),
      brushState: brushState
    };
    
    const past = this.data.history.past.slice(0, 49); // 限制50步
    past.push(historyEntry);
    this.setData({ history: { past, future: [] } });
  },
  
  undo() {
    // 处理元素操作和画笔内容撤销
    const { past, future } = this.data.history;
    if (past.length <= 1) return;
    const current = past[past.length - 1];
    const prev = past[past.length - 2];
    future.unshift(current);
    const newPast = past.slice(0, -1);
    
    // 恢复工作状态
    this.setData({ 
      work: JSON.parse(JSON.stringify(prev.work)), 
      history: { past: newPast, future },
      selectedId: '',
      selected: null
    }, () => {
      this.recomputeOverlay();
      // 恢复画笔状态
      this.restoreBrushState(prev.brushState);
    });
  },
  
  redo() {
    // 处理元素操作和画笔内容重做
    const { past, future } = this.data.history;
    if (!future.length) return;
    const next = future[0];
    const newFuture = future.slice(1);
    const newPast = past.concat([next]);
    
    // 恢复工作状态
    this.setData({ 
      work: JSON.parse(JSON.stringify(next.work)), 
      history: { past: newPast, future: newFuture },
      selectedId: '',
      selected: null
    }, () => {
      this.recomputeOverlay();
      // 恢复画笔状态
      this.restoreBrushState(next.brushState);
    });
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

  // 画笔功能
  toggleBrushMode() {
    const newMode = this.data.drawMode === 'brush' ? null : 'brush';
    this.setData({ 
      drawMode: newMode,
      selectedId: '',
      selected: null
    }, () => {
      if (newMode === 'brush') {
        // 延迟初始化画布，确保DOM已更新
        setTimeout(() => {
          this.initBrushCanvas();
        }, 100);
      }
    });
  },

  toggleEraserMode() {
    const newMode = this.data.drawMode === 'eraser' ? null : 'eraser';
    this.setData({ 
      drawMode: newMode,
      selectedId: '',
      selected: null
    }, () => {
      if (newMode === 'eraser') {
        // 延迟初始化画布，确保DOM已更新
        setTimeout(() => {
          this.initBrushCanvas();
        }, 100);
      }
    });
  },

  initBrushCanvas() {
    // 确保画布存在且已渲染
    const query = wx.createSelectorQuery();
    query.select('#brushCanvas').fields({
      node: true,
      size: true
    }).exec((res) => {
      if (res[0]) {
        const ctx = wx.createCanvasContext('brushCanvas', this);
        ctx.clearRect(0, 0, this.data.displayWidth, this.data.displayHeight);
        ctx.draw();
      }
    });
  },

  onBrushSizeChange(e) {
    this.setData({ brushSize: e.detail.value });
  },

  setBrushColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({ brushColor: color });
  },

  onBrushStart(e) {
    if (!this.data.drawMode) return;
    
    const touch = e.touches[0];
    // 获取触摸点相对于画布的坐标
    const query = wx.createSelectorQuery();
    query.select('.canvas-wrap').boundingClientRect((rect) => {
      if (!rect) return;
      
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.setData({
        isDrawing: true,
        lastX: x,
        lastY: y
      });

      this.drawPoint(x, y);
    }).exec();
  },

  onBrushMove(e) {
    if (!this.data.isDrawing || !this.data.drawMode) return;
    
    const touch = e.touches[0];
    // 获取触摸点相对于画布的坐标
    const query = wx.createSelectorQuery();
    query.select('.canvas-wrap').boundingClientRect((rect) => {
      if (!rect) return;
      
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.drawLine(this.data.lastX, this.data.lastY, x, y);
      
      this.setData({
        lastX: x,
        lastY: y
      });
    }).exec();
  },

  onBrushEnd() {
    if (!this.data.isDrawing) return;
    
    this.setData({ isDrawing: false });
    
    // 画笔绘制结束后提交历史记录
    if (this.data.drawMode) {
      this.commitHistory();
    }
  },



  drawPoint(x, y) {
    const ctx = wx.createCanvasContext('brushCanvas', this);
    
    if (this.data.drawMode === 'brush') {
      ctx.setStrokeStyle(this.data.brushColor);
      ctx.setLineWidth(this.data.brushSize);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      
      ctx.beginPath();
      ctx.arc(x, y, this.data.brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = this.data.brushColor;
      ctx.fill();
    } else if (this.data.drawMode === 'eraser') {
      ctx.setStrokeStyle('#ffffff');
      ctx.setLineWidth(this.data.brushSize * 2);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      
      ctx.beginPath();
      ctx.arc(x, y, this.data.brushSize, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    
    ctx.draw(true);
  },

  drawLine(x1, y1, x2, y2) {
    const ctx = wx.createCanvasContext('brushCanvas', this);
    
    if (this.data.drawMode === 'brush') {
      ctx.setStrokeStyle(this.data.brushColor);
      ctx.setLineWidth(this.data.brushSize);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (this.data.drawMode === 'eraser') {
      ctx.setStrokeStyle('#ffffff');
      ctx.setLineWidth(this.data.brushSize * 2);
      ctx.setLineCap('round');
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    ctx.draw(true);
  },



  clearDrawing() {
    this.initBrushCanvas();
  },

  // 阻止触摸事件冒泡
  catchTouch(e) {
    // 在微信小程序中，catch事件会自动阻止冒泡
    return false;
  },
  exportImg() {
    const work = this.data.work;
    const ctx = wx.createCanvasContext('editorCanvas', this);
    const opt = this.data.exportOpt;
    const drawOpt = { transparentBackground: (opt.format==='png' && opt.transparent), watermarkText: opt.watermark ? 'Made with LCG' : '' };
    
    // 先绘制基础元素
    drawWorkToCanvas(ctx, work, drawOpt);
    
    // 如果有画笔内容，需要将画笔图层合并到最终图片
    // 由于微信小程序canvas限制，画笔内容无法直接合并到导出图片
    // 这里简化处理，直接调用导出
    this.finalizeExport(ctx, work, opt);
  },

  mergeBrushLayer(ctx, callback) {
    // 由于微信小程序canvas限制，画笔内容无法直接合并到导出图片
    // 这里简化处理，直接调用回调
    if (callback) callback();
  },

  finalizeExport(ctx, work, opt) {
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
