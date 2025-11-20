const { loadDrafts } = require('../../utils/storage.js');
const { getClientUid } = require('../../utils/client.js');
const supa = require('../../services/supa.js');

Page({
  data: {
    drafts: [],
    cloudWorks: [],
    stats: { 
      works: 0, 
      favorites: 0, 
      drafts: 0,
      templates: 0,
      downloads: 0,
      views: 0,
      memberDays: 0
    },
    profile: { 
      id: '', 
      phone: '', 
      name: '', 
      nickname: '', 
      avatar_url: '', 
      bio: '', 
      location: '', 
      website: '',
      member_status: false,
      member_expire: '',
      security_level: 'standard',
      privacy_settings: {
        profile_visible: true,
        works_visible: true,
        show_online_status: true
      }
    },
    notifications: [],
    unreadCount: 0,
    activeTab: 'profile',
    editing: false,
    isLoading: false,
    _preventReload: false
  },

  async onShow() {
    if (this.data._preventReload) return;
    
    // 检查登录状态
    const app = getApp();
    if (!app.globalData.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.navigateBack();
      return;
    }

    // 本地草稿
    const drafts = loadDrafts();
    this.setData({ drafts, 'stats.drafts': drafts.length });

    // 云端作品
    try {
      if (supa.enabled()) {
        const list = await supa.listWorks(getClientUid());
        this.setData({ cloudWorks: Array.isArray(list) ? list : [] });
      }
    } catch (e) {
      console.error('加载云端作品失败:', e);
    }

    // 加载个人资料与统计
    try { 
      await this.loadProfileAndStats(); 
      await this.loadNotifications();
    } catch (e) {
      console.error('加载数据失败:', e);
    }
  },

  onLoad(options) {
    // 页面加载时检查登录状态
    const app = getApp();
    if (!app.globalData.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.navigateBack();
      return;
    }
  },

  async loadProfileAndStats() {
    const app = getApp();
    const u = app.globalData.userInfo || {};
    if (!u || !u.userId) {
      wx.showToast({ title: '用户信息缺失', icon: 'none' });
      return;
    }
    
    this.setData({ isLoading: true });
    try {
      // 加载用户资料
      const res = await supa.getUserProfileById(u.userId);
      if (res && res.success) {
        this.setData({ profile: Object.assign({}, this.data.profile, res.user) });
      }
      
      // 加载用户统计
      const stats = await supa.getUserStats(u.userId, getClientUid());
      if (stats && stats.success) {
        this.setData({ stats: Object.assign({}, this.data.stats, stats.stats) });
      }
      
      // 加载额外统计信息
      await this.loadExtendedStats(u.userId);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally { 
      this.setData({ isLoading: false }); 
    }
  },

  async loadExtendedStats(userId) {
    // 模拟扩展统计信息
    const extendedStats = {
      templates: Math.floor(Math.random() * 50),
      downloads: Math.floor(Math.random() * 1000),
      views: Math.floor(Math.random() * 5000),
      memberDays: this.data.profile.member_status ? Math.floor(Math.random() * 365) : 0
    };
    this.setData({ 'stats': Object.assign({}, this.data.stats, extendedStats) });
  },

  async loadNotifications() {
    // 模拟通知数据
    const mockNotifications = [
      { id: 1, type: 'system', title: '系统通知', content: '欢迎使用LightCreateGraphic！', time: '2024-11-17 10:00', read: false },
      { id: 2, type: 'template', title: '模板更新', content: '您收藏的模板已更新到最新版本', time: '2024-11-16 15:30', read: false },
      { id: 3, type: 'security', title: '安全提醒', content: '请及时更新您的账户安全设置', time: '2024-11-15 09:15', read: true }
    ];
    const unreadCount = mockNotifications.filter(n => !n.read).length;
    this.setData({ 
      notifications: mockNotifications,
      unreadCount: unreadCount 
    });
  },

  // 编辑资料
  toggleEdit() { 
    this.setData({ editing: !this.data.editing }); 
  },
  
  onNameInput(e) { 
    this.setData({ 'profile.name': e.detail.value }); 
  },
  
  onNicknameInput(e) { 
    this.setData({ 'profile.nickname': e.detail.value }); 
  },
  
  onBioInput(e) { 
    this.setData({ 'profile.bio': e.detail.value }); 
  },
  
  onLocationInput(e) { 
    this.setData({ 'profile.location': e.detail.value }); 
  },
  
  onWebsiteInput(e) { 
    this.setData({ 'profile.website': e.detail.value }); 
  },

  chooseAvatar() {
    const that = this;
    wx.chooseImage({ 
      count: 1, 
      sizeType: ['compressed'], 
      success: async (res) => {
        try {
          that.setData({ _preventReload: true });
          const path = (res.tempFilePaths && res.tempFilePaths[0]) || (res.tempFiles && res.tempFiles[0].path);
          if (!path) return;
          
          wx.showLoading({ title: '上传中...' });
          const app = getApp();
          const uid = (app.globalData.userInfo && app.globalData.userInfo.userId) || '';
          const up = await supa.uploadAvatar(path, uid);
          wx.hideLoading();
          
          if (up && up.success) {
            that.setData({ 'profile.avatar_url': up.url });
            wx.showToast({ title: '头像已更新', icon: 'success' });
            // 自动保存资料，确保头像持久化
            await that.saveProfile();
          } else {
            wx.showToast({ title: (up && up.message) || '上传失败', icon: 'none' });
          }
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        } finally { 
          that.setData({ _preventReload: false }); 
        }
      }
    });
  },

  async saveProfile() {
    let { profile } = this.data;
    
    // 兜底：如果 profile.id 缺失，用全局 userInfo.userId 回填
    if (!profile.id) {
      const app = getApp();
      const u = app.globalData.userInfo || {};
      if (u && u.userId) {
        profile = Object.assign({}, profile, { id: u.userId });
        this.setData({ profile });
      } else {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
    }
    
    this.setData({ isLoading: true });
    try {
      const payload = {
        p_user_id: profile.id,
        p_name: profile.name || null,
        p_nickname: profile.nickname || null,
        p_avatar_url: profile.avatar_url || null,
        p_bio: profile.bio || null,
        p_location: profile.location || null,
        p_website: profile.website || null,
        p_banner_url: profile.banner_url || null
      };
      
      const res = await supa.updateUserProfile(payload);
      if (res && res.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        // 更新全局 userInfo 的可见字段
        const app = getApp();
        app.globalData.userInfo = Object.assign({}, app.globalData.userInfo || {}, { 
          nickname: res.user.nickname || res.user.name, 
          avatar: res.user.avatar_url 
        });
        this.setData({ 
          profile: Object.assign({}, this.data.profile, res.user), 
          editing: false 
        });
      } else {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    } finally { 
      this.setData({ isLoading: false }); 
    }
  },

  openDraft(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/editor/index?draftId=${id}` });
  },

  // 草稿长按操作
  draftActions(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showActionSheet({
      itemList: ['打开', '管理版本', '删除草稿'],
      success(res) {
        const idx = res.tapIndex;
        if (idx === 0) return that.openDraft({ currentTarget: { dataset: { id } } });
        if (idx === 1) return wx.navigateTo({ url: `/pages/drafts/versions/index?draftId=${id}` });
        if (idx === 2) return that.deleteDraftConfirm(id);
      }
    });
  },

  deleteDraftConfirm(id) {
    const that = this;
    wx.showModal({
      title: '删除草稿',
      content: '确定要删除这个草稿吗？此操作不可撤销。',
      confirmColor: '#dc3545',
      success(res) {
        if (!res.confirm) return;
        try {
          const { deleteDraft, loadDrafts } = require('../../utils/storage.js');
          deleteDraft(id);
          const drafts = loadDrafts();
          that.setData({ drafts, 'stats.drafts': drafts.length });
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    });
  },

  // 导航到不同功能页面
  navigateToSecurity() {
    wx.navigateTo({ url: '/pages/profile/security/index' });
  },

  navigateToNotifications() {
    wx.navigateTo({ url: '/pages/profile/notifications/index' });
  },

  navigateToPrivacy() {
    wx.navigateTo({ url: '/pages/profile/privacy/index' });
  },

  navigateToStatistics() {
    wx.navigateTo({ url: '/pages/profile/statistics/index' });
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    
    // 根据标签页加载对应数据
    if (tab === 'works') {
      this.loadWorksData();
    } else if (tab === 'templates') {
      this.loadTemplatesData();
    }
  },

  // 新建草稿（空白画布）
  createNewDraft() {
    wx.navigateTo({ url: '/pages/editor/index?templateId=tpl_blank_square' });
  },

  // 标记通知为已读
  markNotificationAsRead(e) {
    const id = e.currentTarget.dataset.id;
    const notifications = this.data.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    const unreadCount = notifications.filter(n => !n.read).length;
    this.setData({ notifications, unreadCount });
    wx.showToast({ title: '标记为已读', icon: 'success' });
  },

  // 删除通知
  deleteNotification(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: (res) => {
        if (res.confirm) {
          const notifications = this.data.notifications.filter(n => n.id !== id);
          const unreadCount = notifications.filter(n => !n.read).length;
          this.setData({ notifications, unreadCount });
          wx.showToast({ title: '删除成功', icon: 'success' });
        }
      }
    });
  },

  // 打开草稿箱页面
  openDraftsPage() {
    wx.navigateTo({ url: '/pages/drafts/index' });
  },

  // 上传头像
  uploadAvatar() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePaths = res.tempFilePaths;
        if (tempFilePaths && tempFilePaths.length > 0) {
          // 这里应该调用后端API上传头像
          wx.showLoading({ title: '上传中...' });
          // 模拟上传过程
          setTimeout(() => {
            wx.hideLoading();
            that.setData({ 'profile.avatar_url': tempFilePaths[0] });
            wx.showToast({ title: '头像上传成功', icon: 'success' });
            // 自动保存头像
            that.saveProfile();
          }, 1000);
        }
      }
    });
  },

  // 隐私设置切换
  togglePrivacySetting(e) {
    const setting = e.currentTarget.dataset.setting;
    const currentValue = this.data.profile.privacy_settings[setting];
    this.setData({ 
      [`profile.privacy_settings.${setting}`]: !currentValue 
    });
    wx.showToast({ 
      title: `${!currentValue ? '开启' : '关闭'}成功`, 
      icon: 'success' 
    });
  },

  // 保存隐私设置
  async savePrivacySettings() {
    this.setData({ isLoading: true });
    try {
      // 模拟保存隐私设置
      await new Promise(resolve => setTimeout(resolve, 500));
      wx.showToast({ title: '隐私设置已保存', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 加载作品数据
  async loadWorksData() {
    try {
      // 这里可以加载作品相关数据
      console.log('加载作品数据');
    } catch (error) {
      console.error('加载作品数据失败:', error);
    }
  },

  // 加载模板数据
  async loadTemplatesData() {
    try {
      // 这里可以加载模板相关数据
      console.log('加载模板数据');
    } catch (error) {
      console.error('加载模板数据失败:', error);
    }
  },

  // 导航到作品页面
  navigateToWorks() {
    wx.navigateTo({ url: '/pages/works/index' });
  },

  // 导航到模板页面
  navigateToTemplates() {
    wx.navigateTo({ url: '/pages/templates/index' });
  },

  // 打开云端作品
  openCloudWork(e) {
    const work = e.currentTarget.dataset.work;
    wx.navigateTo({ 
      url: `/pages/editor/index?workId=${work.work_id}&from=cloud` 
    });
  },

  // 创建新模板
  createNewTemplate() {
    wx.navigateTo({ 
      url: '/pages/editor/index?templateId=tpl_blank_square&mode=template' 
    });
  }
});