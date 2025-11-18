const { listDraftVersions, getDraftVersion, restoreDraftVersion } = require('../../../utils/storage.js');
const supa = require('../../../services/supa.js');

Page({
  data: {
    draftId: '',
    draftName: '',
    versions: [],
    loading: false,
    currentVersion: null
  },

  onLoad(options) {
    const { draftId, draftName } = options;
    this.setData({
      draftId: draftId || '',
      draftName: draftName || '草稿'
    });

    wx.setNavigationBarTitle({
      title: '版本历史'
    });

    this.loadVersions();
  },

  // 加载版本历史
  async loadVersions() {
    this.setData({ loading: true });

    try {
      // 加载本地版本
      const localVersions = listDraftVersions(this.data.draftId);
      
      // 尝试加载云端版本
      let cloudVersions = [];
      try {
        const result = await supa.listDraftVersions(this.data.draftId);
        if (result.success) {
          cloudVersions = result.items || [];
        }
      } catch (e) {
        console.warn('加载云端版本失败:', e);
      }

      // 合并版本列表
      const versions = [
        ...localVersions.map(v => ({ ...v, source: 'local' })),
        ...cloudVersions.map(v => ({ ...v, source: 'cloud' }))
      ].sort((a, b) => new Date(b.ts || b.timestamp) - new Date(a.ts || a.timestamp));

      this.setData({
        versions,
        loading: false,
        currentVersion: versions[0] || null
      });
    } catch (error) {
      console.error('加载版本失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 查看版本详情
  viewVersion(e) {
    const { index } = e.currentTarget.dataset;
    const version = this.data.versions[index];
    
    wx.showModal({
      title: `版本 ${this.formatTime(version.ts)}`,
      content: `版本号: ${version.no}\n大小: ${this.formatSize(version.size || 0)}\n备注: ${version.note || '无'}`,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 恢复版本
  restoreVersion(e) {
    const { index } = e.currentTarget.dataset;
    const version = this.data.versions[index];
    
    wx.showModal({
      title: '确认恢复',
      content: `确定要恢复到版本 ${this.formatTime(version.ts)} 吗？当前版本将被覆盖。`,
      confirmColor: '#10B981',
      success: (res) => {
        if (res.confirm) {
          this.performRestore(version);
        }
      }
    });
  },

  // 执行版本恢复
  async performRestore(version) {
    this.setData({ loading: true });

    try {
      // 恢复本地版本
      const success = restoreDraftVersion(this.data.draftId, version.no);
      
      if (success) {
        // 如果是云端版本，同步到云端
        if (version.source === 'cloud') {
          await supa.upsertDraft({
            draftId: this.data.draftId,
            workData: version.workData,
            note: `恢复至版本 ${version.no}`
          });
        }
        
        wx.showToast({ title: '恢复成功', icon: 'success' });
        
        // 返回草稿编辑页面
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: '恢复失败', icon: 'none' });
      }
    } catch (error) {
      console.error('恢复版本失败:', error);
      wx.showToast({ title: '恢复失败', icon: 'none' });
    }

    this.setData({ loading: false });
  },

  // 下载版本
  downloadVersion(e) {
    const { index } = e.currentTarget.dataset;
    const version = this.data.versions[index];
    
    wx.showModal({
      title: '下载版本',
      content: '此功能将在后续版本中提供',
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  },

  // 格式化大小
  formatSize(size) {
    if (!size) return '0B';
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});