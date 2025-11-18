const { loadDrafts, saveDraft, deleteDraft, listDraftVersions } = require('../../utils/storage.js');
const supa = require('../../services/supa.js');

Page({
  data: {
    // 草稿列表
    drafts: [],
    // 筛选状态
    filter: 'all', // all, local, cloud
    searchKeyword: '',
    // 排序方式
    sortBy: 'modified', // modified, created, name, size
    sortOrder: 'desc', // asc, desc
    // 加载状态
    loading: false,
    // 空状态
    isEmpty: false,
    // 选中草稿
    selectedDrafts: [],
    // 编辑模式
    editMode: false
  },

  onLoad(options) {
    this.setData({
      showSortMenu: false
    });
    this.loadDrafts();
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '草稿管理'
    });
  },

  onShow() {
    this.loadDrafts();
  },

  // 加载草稿列表
  async loadDrafts() {
    this.setData({ loading: true });
    
    try {
      // 加载本地草稿
      const localDrafts = loadDrafts();
      
      // 尝试加载云端草稿
      let cloudDrafts = [];
      try {
        const result = await supa.listDrafts();
        if (result.success) {
          cloudDrafts = result.items || [];
        }
      } catch (e) {
        console.warn('加载云端草稿失败:', e);
      }

      // 合并草稿列表
      let drafts = [
        ...localDrafts.map(d => ({ ...d, source: 'local' })),
        ...cloudDrafts.map(d => ({ ...d, source: 'cloud' }))
      ];

      // 应用筛选
      drafts = this.applyFilters(drafts);
      
      // 应用排序
      drafts = this.applySort(drafts);

      this.setData({
        drafts,
        loading: false,
        isEmpty: drafts.length === 0
      });
    } catch (error) {
      console.error('加载草稿失败:', error);
      this.setData({ loading: false, isEmpty: true });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 应用筛选
  applyFilters(drafts) {
    let filtered = drafts;
    
    // 来源筛选
    if (this.data.filter !== 'all') {
      filtered = filtered.filter(d => d.source === this.data.filter);
    }
    
    // 关键词搜索
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(d => 
        (d.name || d.id).toLowerCase().includes(keyword) ||
        (d.note || '').toLowerCase().includes(keyword)
      );
    }
    
    return filtered;
  },

  // 应用排序
  applySort(drafts) {
    return drafts.sort((a, b) => {
      let aValue, bValue;
      
      switch (this.data.sortBy) {
        case 'name':
          aValue = (a.name || a.id).toLowerCase();
          bValue = (b.name || b.id).toLowerCase();
          break;
        case 'created':
          aValue = a.createdAt || a.timestamp || 0;
          bValue = b.createdAt || b.timestamp || 0;
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'modified':
        default:
          aValue = a.updatedAt || a.modifiedAt || a.timestamp || 0;
          bValue = b.updatedAt || b.modifiedAt || b.timestamp || 0;
          break;
      }
      
      return this.data.sortOrder === 'desc' ? 
        (bValue > aValue ? 1 : -1) : 
        (aValue > bValue ? 1 : -1);
    });
  },

  // 搜索草稿
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.loadDrafts();
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.loadDrafts();
  },

  // 切换筛选条件
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter });
    this.loadDrafts();
  },

  // 切换排序方式
  onSortChange(e) {
    const { sortBy, sortOrder } = e.currentTarget.dataset;
    this.setData({ sortBy, sortOrder });
    this.loadDrafts();
  },

  // 打开草稿
  openDraft(e) {
    if (this.data.editMode) return;
    
    const { id } = e.currentTarget.dataset;
    const draft = this.data.drafts.find(d => d.id === id);
    if (!draft) return;

    wx.navigateTo({
      url: `/pages/editor/index?draftId=${id}`
    });
  },

  // 长按草稿操作
  onDraftLongPress(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showActionSheet({
      itemList: ['打开草稿', '查看版本', '重命名', '删除草稿'],
      success: (res) => {
        const tapIndex = res.tapIndex;
        switch (tapIndex) {
          case 0:
            this.openDraft(e);
            break;
          case 1:
            this.viewVersions(id);
            break;
          case 2:
            this.renameDraft(id);
            break;
          case 3:
            this.deleteDraftConfirm(id);
            break;
        }
      }
    });
  },

  // 查看版本历史
  viewVersions(draftId) {
    wx.navigateTo({
      url: `/pages/drafts/versions/index?draftId=${draftId}`
    });
  },

  // 重命名草稿
  renameDraft(draftId) {
    const draft = this.data.drafts.find(d => d.id === draftId);
    if (!draft) return;

    wx.showModal({
      title: '重命名草稿',
      content: '请输入新的草稿名称',
      editable: true,
      placeholderText: draft.name || draft.id,
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newName = res.content.trim();
          this.updateDraftName(draftId, newName);
        }
      }
    });
  },

  // 更新草稿名称
  updateDraftName(draftId, newName) {
    const draft = this.data.drafts.find(d => d.id === draftId);
    if (!draft) return;

    const updatedDraft = { ...draft, name: newName };
    
    try {
      saveDraft(updatedDraft);
      
      // 如果是云端草稿，同步到云端
      if (draft.source === 'cloud') {
        supa.upsertDraft({
          draftId: draftId,
          name: newName,
          workData: draft.workData,
          note: draft.note
        });
      }
      
      this.loadDrafts();
      wx.showToast({ title: '重命名成功', icon: 'success' });
    } catch (error) {
      console.error('重命名失败:', error);
      wx.showToast({ title: '重命名失败', icon: 'none' });
    }
  },

  // 确认删除草稿
  deleteDraftConfirm(draftId) {
    const draft = this.data.drafts.find(d => d.id === draftId);
    if (!draft) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除草稿"${draft.name || draft.id}"吗？此操作不可恢复。`,
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          this.deleteDraft(draftId);
        }
      }
    });
  },

  // 删除草稿
  async deleteDraft(draftId) {
    try {
      // 删除本地草稿
      deleteDraft(draftId);
      
      // 如果是云端草稿，同步删除云端
      const draft = this.data.drafts.find(d => d.id === draftId);
      if (draft && draft.source === 'cloud') {
        await supa.deleteDraft(draftId);
      }
      
      this.loadDrafts();
      wx.showToast({ title: '删除成功', icon: 'success' });
    } catch (error) {
      console.error('删除失败:', error);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  // 切换编辑模式
  toggleEditMode() {
    const editMode = !this.data.editMode;
    this.setData({ 
      editMode, 
      selectedDrafts: editMode ? [] : this.data.selectedDrafts 
    });
  },

  // 选择/取消选择草稿
  toggleSelectDraft(e) {
    if (!this.data.editMode) return;
    
    const { id } = e.currentTarget.dataset;
    const selectedDrafts = [...this.data.selectedDrafts];
    const index = selectedDrafts.indexOf(id);
    
    if (index > -1) {
      selectedDrafts.splice(index, 1);
    } else {
      selectedDrafts.push(id);
    }
    
    this.setData({ selectedDrafts });
  },

  // 批量删除
  batchDelete() {
    if (this.data.selectedDrafts.length === 0) return;

    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${this.data.selectedDrafts.length} 个草稿吗？`,
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          this.performBatchDelete();
        }
      }
    });
  },

  // 执行批量删除
  async performBatchDelete() {
    this.setData({ loading: true });
    
    try {
      for (const draftId of this.data.selectedDrafts) {
        await this.deleteDraft(draftId);
      }
      
      this.setData({ 
        editMode: false, 
        selectedDrafts: [],
        loading: false 
      });
      
      wx.showToast({ title: '批量删除成功', icon: 'success' });
    } catch (error) {
      console.error('批量删除失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '批量删除失败', icon: 'none' });
    }
  },

  // 批量上传到云端
  async batchUploadToCloud() {
    if (this.data.selectedDrafts.length === 0) return;

    this.setData({ loading: true });
    
    try {
      let successCount = 0;
      
      for (const draftId of this.data.selectedDrafts) {
        const draft = this.data.drafts.find(d => d.id === draftId);
        if (draft && draft.source === 'local') {
          const result = await supa.upsertDraft({
            draftId: draftId,
            name: draft.name || draft.id,
            workData: draft.workData,
            note: draft.note,
            size: draft.size
          });
          
          if (result.success) successCount++;
        }
      }
      
      this.setData({ 
        editMode: false, 
        selectedDrafts: [],
        loading: false 
      });
      
      wx.showToast({ 
        title: `成功上传 ${successCount} 个草稿到云端`, 
        icon: 'success' 
      });
      
      this.loadDrafts();
    } catch (error) {
      console.error('批量上传失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '批量上传失败', icon: 'none' });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadDrafts().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    // 可在此处实现分页加载
  },

  // 辅助函数
  getSortText() {
    const sortMap = {
      'modified_desc': '最近修改 ↓',
      'modified_asc': '最近修改 ↑',
      'name_asc': '名称排序',
      'created_desc': '创建时间',
      'size_desc': '文件大小'
    };
    return sortMap[`${this.data.sortBy}_${this.data.sortOrder}`] || '排序';
  },

  getDraftIcon(draft) {
    // 根据草稿类型返回不同的图标
    const icons = ['🎨', '📝', '📊', '📋', '🖼️', '📈'];
    const hash = draft.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return icons[hash % icons.length];
  },

  getStatusClass(draft) {
    return draft.source;
  },

  getStatusText(draft) {
    return draft.source === 'local' ? '本地' : '云端';
  },

  formatTime(timestamp) {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
      // 今天
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      // 一周内
      return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
    } else {
      // 更早
      return date.toLocaleDateString('zh-CN');
    }
  },

  formatSize(size) {
    if (!size) return '';
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  },

  goToEditor() {
    wx.navigateTo({
      url: '/pages/editor/index'
    });
  },

  showSortMenu() {
    this.setData({ showSortMenu: true });
  },

  hideSortMenu() {
    this.setData({ showSortMenu: false });
  },

  showActionMenu(e) {
    const { id } = e.currentTarget.dataset;
    this.onDraftLongPress({ currentTarget: { dataset: { id } } });
  }
});