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

// 将十六进制颜色转换为RGBA格式
function hexToRgba(hex, alpha) {
  // 如果已经是rgba格式，直接返回
  if (hex.startsWith('rgba')) {
    return hex;
  }
  
  // 处理十六进制颜色
  let r, g, b;
  
  // 如果是简写形式 #fff
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } 
  // 如果是完整形式 #ffffff
  else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } 
  // 如果是rgb格式
  else if (hex.startsWith('rgb')) {
    const values = hex.match(/\d+/g);
    r = parseInt(values[0]);
    g = parseInt(values[1]);
    b = parseInt(values[2]);
  } 
  // 默认黑色
  else {
    r = 0;
    g = 0;
    b = 0;
  }
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    drawMode: null, // 'brush' | 'eraser' | 'highlighter' | null
    brushSize: 5,
    brushColor: '#ff4757',
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    highlighterIntensity: 0.8, // 荧光笔强度，0-1之间
    
    // 属性面板折叠状态
    panelCollapsed: false
  },

  onLoad(query) {
    const { templateId = 'tpl_blank_square', draftId = '', w = '', h = '' } = query || {};
    if (draftId) {
      try {
        const { getDraftById } = require('../../utils/storage.js');
        const d = getDraftById(draftId);
        if (d) {
          const work = JSON.parse(JSON.stringify(d));
          this.setData({ work }, () => { this.calcDisplaySize(); this.recomputeOverlay(); this.commitHistory(); });
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
          // 添加错误处理和参数验证
          const draftData = {
            draftId: work.id,
            userId: u.userId || null,
            clientUid: getClientUid(),
            name: work.name || work.id,
            size: work.size,
            workData: work,
            note: 'auto-save'
          };
          
          // 验证必要参数
          if (!draftData.draftId || !draftData.size || !draftData.workData) {
            console.warn('upsertDraft参数不完整，跳过保存');
            return;
          }
          
          // 异步调用，不等待结果
          require('../../services/supa.js').upsertDraft(draftData).catch(err => {
            console.warn('自动保存草稿失败:', err.message);
          });
        }
      } catch (error) {
        console.warn('自动保存草稿异常:', error.message);
      }
    } catch (e) {
      console.warn('本地保存草稿失败:', e.message);
    }
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
    const currentState = JSON.stringify(this.data.work);
    const past = this.data.history.past.slice(0, 19);
    
    // 只有当状态发生变化时才记录历史
    if (past.length === 0 || past[0] !== currentState) {
      past.unshift(currentState);
      this.setData({ 'history.past': past, 'history.future': [] });
    }
  },

  // === 画笔功能 ===
  
  // 辅助函数：将十六进制颜色转换为RGBA格式
  hexToRgba(hex, alpha) {
    // 如果已经是rgba格式，直接返回
    if (hex.startsWith('rgba')) {
      return hex;
    }
    
    // 处理十六进制颜色
    let r, g, b;
    
    // 如果是简写形式 #fff
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } 
    // 如果是完整形式 #ffffff
    else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    } 
    // 如果是rgb格式
    else if (hex.startsWith('rgb')) {
      const values = hex.match(/\d+/g);
      r = parseInt(values[0]);
      g = parseInt(values[1]);
      b = parseInt(values[2]);
    } 
    // 默认黑色
    else {
      r = 0;
      g = 0;
      b = 0;
    }
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  toggleBrushMode() {
    const newMode = this.data.drawMode === 'brush' ? null : 'brush';
    this.setData({ 
      drawMode: newMode,
      selectedId: '',
      selected: null 
    });
    if (newMode === 'brush') {
      this.initBrushCanvas();
    }
  },

  toggleHighlighterMode() {
    const newMode = this.data.drawMode === 'highlighter' ? null : 'highlighter';
    this.setData({ 
      drawMode: newMode,
      selectedId: '',
      selected: null 
    });
    if (newMode === 'highlighter') {
      this.initBrushCanvas();
    }
  },

  toggleEraserMode() {
    const newMode = this.data.drawMode === 'eraser' ? null : 'eraser';
    this.setData({ 
      drawMode: newMode,
      selectedId: '',
      selected: null 
    });
    if (newMode === 'eraser') {
      this.initBrushCanvas();
    }
  },

  initBrushCanvas() {
    const ctx = wx.createCanvasContext('brushCanvas', this);
    ctx.clearRect(0, 0, this.data.displayWidth, this.data.displayHeight);
    ctx.draw();
  },

  onBrushStart(e) {
    if (!this.data.drawMode) return;
    
    const touch = e.touches[0];
    const x = touch.x;
    const y = touch.y;
    
    this.setData({
      isDrawing: true,
      lastX: x,
      lastY: y
    });

    const ctx = wx.createCanvasContext('brushCanvas', this);
    
    if (this.data.drawMode === 'brush') {
      ctx.beginPath();
      ctx.arc(x, y, this.data.brushSize / 2, 0, Math.PI * 2);
      ctx.setFillStyle(this.data.brushColor);
      ctx.fill();
    } else if (this.data.drawMode === 'highlighter') {
      // 荧光笔效果：多层叠加，中间亮白，两侧是颜色光晕
      const size = this.data.brushSize;
      
      // 外层光晕 - 颜色透明度较低
      ctx.beginPath();
      ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
      ctx.setFillStyle(this.hexToRgba(this.data.brushColor, 0.5 * this.data.highlighterIntensity));
      ctx.fill();
      
      // 中层光晕 - 颜色透明度中等
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.setFillStyle(this.hexToRgba(this.data.brushColor, 0.7 * this.data.highlighterIntensity));
      ctx.fill();
      
      // 内层 - 颜色透明度较高
      ctx.beginPath();
      ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
      ctx.setFillStyle(this.hexToRgba(this.data.brushColor, 0.9 * this.data.highlighterIntensity));
      ctx.fill();
      
      // 中心 - 亮白色
      ctx.beginPath();
      ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
      ctx.setFillStyle('rgba(255, 255, 255, 0.6)');
      ctx.fill();
    } else if (this.data.drawMode === 'eraser') {
      ctx.beginPath();
      ctx.arc(x, y, this.data.brushSize / 2, 0, Math.PI * 2);
      ctx.clearRect(x - this.data.brushSize/2, y - this.data.brushSize/2, this.data.brushSize, this.data.brushSize);
    }
    
    ctx.draw(true);
  },

  onBrushMove(e) {
    if (!this.data.isDrawing || !this.data.drawMode) return;
    
    const touch = e.touches[0];
    const x = touch.x;
    const y = touch.y;
    
    // 计算两点之间的距离，用于平滑绘制
    const distance = Math.sqrt(Math.pow(x - this.data.lastX, 2) + Math.pow(y - this.data.lastY, 2));
    const steps = Math.max(Math.floor(distance / 2), 1);
    
    const ctx = wx.createCanvasContext('brushCanvas', this);
    
    if (this.data.drawMode === 'brush') {
      ctx.beginPath();
      ctx.moveTo(this.data.lastX, this.data.lastY);
      ctx.lineTo(x, y);
      ctx.setStrokeStyle(this.data.brushColor);
      ctx.setLineWidth(this.data.brushSize);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      ctx.stroke();
    } else if (this.data.drawMode === 'highlighter') {
      // 荧光笔效果：多层叠加，中间亮白，两侧是颜色光晕
      const size = this.data.brushSize;
      
      // 使用插值点来平滑绘制
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const currentX = this.data.lastX + (x - this.data.lastX) * t;
        const currentY = this.data.lastY + (y - this.data.lastY) * t;
        
        // 绘制多层圆形以创建荧光效果
        // 外层光晕 - 颜色透明度较低
        ctx.beginPath();
        ctx.arc(currentX, currentY, size * 1.5, 0, Math.PI * 2);
        ctx.setFillStyle(this.hexToRgba(this.data.brushColor, 0.5 * this.data.highlighterIntensity));
        ctx.fill();
        
        // 中层光晕 - 颜色透明度中等
        ctx.beginPath();
        ctx.arc(currentX, currentY, size, 0, Math.PI * 2);
        ctx.setFillStyle(this.hexToRgba(this.data.brushColor, 0.7 * this.data.highlighterIntensity));
        ctx.fill();
        
        // 内层 - 颜色透明度较高
        ctx.beginPath();
        ctx.arc(currentX, currentY, size * 0.7, 0, Math.PI * 2);
        ctx.setFillStyle(this.hexToRgba(this.data.brushColor, 0.9 * this.data.highlighterIntensity));
        ctx.fill();
        
        // 中心 - 亮白色
        ctx.beginPath();
        ctx.arc(currentX, currentY, size * 0.4, 0, Math.PI * 2);
        ctx.setFillStyle('rgba(255, 255, 255, 0.6)');
        ctx.fill();
      }
    } else if (this.data.drawMode === 'eraser') {
      // 使用clearRect实现擦除效果
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const clearX = this.data.lastX + (x - this.data.lastX) * t;
        const clearY = this.data.lastY + (y - this.data.lastY) * t;
        ctx.clearRect(clearX - this.data.brushSize/2, clearY - this.data.brushSize/2, this.data.brushSize, this.data.brushSize);
      }
    }
    
    ctx.draw(true);
    
    this.setData({
      lastX: x,
      lastY: y
    });
  },

  onBrushEnd() {
    this.setData({
      isDrawing: false
    });
    
    // 将canvas内容保存为图片元素并自动记录历史
    this.saveCanvasToWork();
  },

  onBrushSizeChange(e) {
    this.setData({
      brushSize: e.detail.value
    });
  },

  onHighlighterIntensityChange(e) {
    this.setData({
      highlighterIntensity: e.detail.value
    });
  },

  setBrushColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      brushColor: color
    });
  },

  clearDrawing() {
    const ctx = wx.createCanvasContext('brushCanvas', this);
    ctx.clearRect(0, 0, this.data.displayWidth, this.data.displayHeight);
    ctx.draw(true);
  },

  // === 撤销/重做功能 ===
  undo() {
    const { past, future } = this.data.history;
    if (past.length < 2) {
      wx.showToast({
        title: '没有可撤销的操作',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    const current = past[0];
    const previous = past[1];
    
    // 将当前状态移到重做栈
    const newFuture = [current, ...future].slice(0, 20);
    const newPast = past.slice(1);
    
    try {
      const work = JSON.parse(previous);
      this.setData({
        work,
        'history.past': newPast,
        'history.future': newFuture,
        selectedId: '',
        selected: null
      }, () => {
        this.recomputeOverlay();
        wx.showToast({
          title: '撤销成功',
          icon: 'success',
          duration: 1000
        });
      });
    } catch (e) {
      console.error('撤销操作失败:', e);
      wx.showToast({
        title: '撤销失败',
        icon: 'none',
        duration: 1500
      });
    }
  },

  redo() {
    const { past, future } = this.data.history;
    if (future.length === 0) {
      wx.showToast({
        title: '没有可重做的操作',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    const next = future[0];
    const newPast = [next, ...past].slice(0, 20);
    const newFuture = future.slice(1);
    
    try {
      const work = JSON.parse(next);
      this.setData({
        work,
        'history.past': newPast,
        'history.future': newFuture,
        selectedId: '',
        selected: null
      }, () => {
        this.recomputeOverlay();
        wx.showToast({
          title: '重做成功',
          icon: 'success',
          duration: 1000
        });
      });
    } catch (e) {
      console.error('重做操作失败:', e);
      wx.showToast({
        title: '重做失败',
        icon: 'none',
        duration: 1500
      });
    }
  },

  // === 元素操作功能 ===
  onMove(e) {
    const id = e.currentTarget.dataset.id;
    const detail = e.detail;
    const work = JSON.parse(JSON.stringify(this.data.work));
    const element = work.elements.find(el => el.id === id);
    
    if (element) {
      // 调整坐标计算，考虑扩展的画布区域
      const canvasOffsetX = this.data.displayWidth * 0.45;
      const canvasOffsetY = this.data.displayHeight * 0.45;
      element.x = (detail.x - canvasOffsetX) / this.data.scale + (element._w || 80) / 2;
      element.y = (detail.y - canvasOffsetY) / this.data.scale + (element._h || 40) / 2;
      this.setData({ work });
    }
  },

  onMoveEnd() {
    this.commitHistory();
  },

  // === 缩放功能 ===
  onScaleChange(e) {
    const id = e.currentTarget.dataset.id;
    const scale = e.detail.value;
    
    const work = JSON.parse(JSON.stringify(this.data.work));
    const element = work.elements.find(el => el.id === id);
    
    if (element) {
      // 保存原始尺寸（如果还没有保存）
      if (!element.originalWidth) {
        element.originalWidth = element._w || element.width || 80;
        element.originalHeight = element._h || element.height || 40;
        element.originalFontSize = element.fontSize || 36;
      }
      
      // 计算新的尺寸
      const scaleFactor = scale / 100;
      
      if (element.type === 'text') {
        // 文字元素调整字体大小
        element.fontSize = Math.max(12, Math.round(element.originalFontSize * scaleFactor));
        // 重新计算文字尺寸
        const size = approxTextSize(element.text, element.fontSize);
        element._w = size.w;
        element._h = size.h;
      } else {
        // 图片和形状元素直接调整宽高
        element.width = Math.max(30, element.originalWidth * scaleFactor);
        element.height = Math.max(30, element.originalHeight * scaleFactor);
        element._w = element.width;
        element._h = element.height;
      }
      
      // 保存缩放比例
      element.scale = scale;
      
      this.setData({ work });
    }
  },

  // === 属性面板折叠功能 ===
  togglePropertyPanel() {
    this.setData({
      panelCollapsed: !this.data.panelCollapsed
    });
  },

  // 属性编辑功能
  onPropInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    this.updateSelectedProperty(key, value);
  },

  onPropSlider(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    this.updateSelectedProperty(key, value);
  },

  updateSelectedProperty(key, value) {
    if (!this.data.selected) return;
    
    const work = JSON.parse(JSON.stringify(this.data.work));
    const element = work.elements.find(el => el.id === this.data.selectedId);
    
    if (element) {
      element[key] = value;
      
      // 更新尺寸相关属性
      if (key === 'fontSize' && element.type === 'text') {
        const size = approxTextSize(element.text, value);
        element._w = size.w;
        element._h = size.h;
      }
      
      this.setData({ 
        work, 
        selected: element 
      });
      this.commitHistory();
    }
  },

  setColor(e) {
    const color = e.currentTarget.dataset.color;
    this.updateSelectedProperty('color', color);
  },

  // 图层操作
  bringForward() {
    this.moveElementInLayer(1);
  },

  sendBackward() {
    this.moveElementInLayer(-1);
  },

  moveElementInLayer(direction) {
    if (!this.data.selected) return;
    
    const work = JSON.parse(JSON.stringify(this.data.work));
    const elements = work.elements;
    const currentIndex = elements.findIndex(el => el.id === this.data.selectedId);
    
    if (currentIndex !== -1) {
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < elements.length) {
        // 交换元素位置
        [elements[currentIndex], elements[newIndex]] = [elements[newIndex], elements[currentIndex]];
        this.setData({ work });
        this.commitHistory();
      }
    }
  },

  duplicateSelected() {
    if (!this.data.selected) return;
    
    const work = JSON.parse(JSON.stringify(this.data.work));
    const original = work.elements.find(el => el.id === this.data.selectedId);
    
    if (original) {
      const duplicate = JSON.parse(JSON.stringify(original));
      duplicate.id = uid('el');
      duplicate.x = (original.x || 0) + 20;
      duplicate.y = (original.y || 0) + 20;
      
      work.elements.push(duplicate);
      this.setData({ 
        work,
        selectedId: duplicate.id,
        selected: duplicate 
      });
      this.commitHistory();
    }
  },

  deleteSelected() {
    if (!this.data.selected) return;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除选中的元素吗？',
      success: (res) => {
        if (res.confirm) {
          const work = JSON.parse(JSON.stringify(this.data.work));
          work.elements = work.elements.filter(el => el.id !== this.data.selectedId);
          
          this.setData({
            work,
            selectedId: '',
            selected: null
          });
          this.commitHistory();
        }
      }
    });
  },

  // 添加元素功能
  addText() {
    const work = JSON.parse(JSON.stringify(this.data.work));
    const textEl = {
      id: uid('el'),
      type: 'text',
      text: '双击编辑文字',
      color: '#111',
      fontSize: 36,
      align: 'left',
      x: work.size.w / 2,
      y: work.size.h / 2
    };
    
    const size = approxTextSize(textEl.text, textEl.fontSize);
    textEl._w = size.w;
    textEl._h = size.h;
    
    work.elements.push(textEl);
    this.setData({ 
      work,
      selectedId: textEl.id,
      selected: textEl 
    });
    this.commitHistory();
  },

  addRect() {
    const work = JSON.parse(JSON.stringify(this.data.work));
    const rectEl = {
      id: uid('el'),
      type: 'rect',
      color: '#ff4757',
      width: 100,
      height: 50,
      x: work.size.w / 2,
      y: work.size.h / 2
    };
    
    rectEl._w = rectEl.width;
    rectEl._h = rectEl.height;
    
    work.elements.push(rectEl);
    this.setData({ 
      work,
      selectedId: rectEl.id,
      selected: rectEl 
    });
    this.commitHistory();
  },

  addImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const work = JSON.parse(JSON.stringify(this.data.work));
        const imgEl = {
          id: uid('el'),
          type: 'image',
          src: tempFilePath,
          width: 200,
          height: 200,
          x: work.size.w / 2,
          y: work.size.h / 2
        };
        
        imgEl._w = imgEl.width;
        imgEl._h = imgEl.height;
        
        work.elements.push(imgEl);
        this.setData({ 
          work,
          selectedId: imgEl.id,
          selected: imgEl 
        });
        this.commitHistory();
      }
    });
  },

  replaceImage() {
    if (!this.data.selected || this.data.selected.type !== 'image') return;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.updateSelectedProperty('src', tempFilePath);
      }
    });
  },

  changeBg() {
    wx.showActionSheet({
      itemList: this.data.colors.map(color => `背景色: ${color}`),
      success: (res) => {
        const color = this.data.colors[res.tapIndex];
        const work = JSON.parse(JSON.stringify(this.data.work));
        work.backgroundColor = color;
        this.setData({ work });
        this.commitHistory();
      }
    });
  },

  // 将canvas内容保存为图片元素到work对象中
  saveCanvasToWork() {
    if (!this.data.drawMode) return;
    
    // 使用微信小程序API获取canvas的临时文件路径
    wx.canvasToTempFilePath({
      canvasId: 'brushCanvas',
      success: (res) => {
        const tempFilePath = res.tempFilePath;
        const work = JSON.parse(JSON.stringify(this.data.work));
        
        // 创建图片元素，位置与画布对齐
        const imgEl = {
          id: uid('el'),
          type: 'image',
          src: tempFilePath,
          width: this.data.work.size.w,
          height: this.data.work.size.h,
          x: this.data.work.size.w / 2,
          y: this.data.work.size.h / 2
        };
        
        imgEl._w = imgEl.width;
        imgEl._h = imgEl.height;
        
        // 添加到work元素中
        work.elements.push(imgEl);
        this.setData({ work }, () => {
          // 清空canvas准备下一次绘制
          this.clearDrawing();
          // 保存完成后记录历史
          this.commitHistory();
        });
      },
      fail: (err) => {
        console.error('保存canvas内容失败:', err);
      }
    }, this);
  }
});