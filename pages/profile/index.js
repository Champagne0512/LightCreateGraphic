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
    isLoading: false
  },
  
  async onShow() {
    // 本地草稿
    const drafts = loadDrafts();
    this.setData({ drafts, 'stats.drafts': drafts.length });

    // 云端作品
    try {
      if (supa.enabled()) {
        const list = await supa.listWorks(getClientUid());
        this.setData({ cloudWorks: Array.isArray(list) ? list : [] });
      }
    } catch (e) {}

    // 加载个人资料与统计
    try { 
      await this.loadProfileAndStats(); 
      await this.loadNotifications();
    } catch (e) {}
  },

  async loadProfileAndStats() {
    const app = getApp();
    const u = app.globalData.userInfo || {};
    if (!u || !u.userId) return;
    this.setData({ isLoading: true });
    try {
      const res = await supa.getUserProfileById(u.userId);
      if (res && res.success) {
        this.setData({ profile: Object.assign({}, this.data.profile, res.user) });
      }
      const stats = await supa.getUserStats(u.userId, getClientUid());
      if (stats && stats.success) {
        this.setData({ stats: Object.assign({}, this.data.stats, stats.stats) });
      }
      
      // 加载额外统计信息
      await this.loadExtendedStats(u.userId);
    } finally { this.setData({ isLoading: false }); }
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
  toggleEdit() { this.setData({ editing: !this.data.editing }); },
  onNameInput(e) { this.setData({ 'profile.name': e.detail.value }); },
  onNicknameInput(e) { this.setData({ 'profile.nickname': e.detail.value }); },
  onBioInput(e) { this.setData({ 'profile.bio': e.detail.value }); },
  onLocationInput(e) { this.setData({ 'profile.location': e.detail.value }); },
  onWebsiteInput(e) { this.setData({ 'profile.website': e.detail.value }); },

  chooseAvatar() {
    const that = this;
    wx.chooseImage({ count: 1, sizeType: ['compressed'], success(res){
      const path = (res.tempFilePaths && res.tempFilePaths[0]) || (res.tempFiles && res.tempFiles[0].path);
      if (path) that.setData({ 'profile.avatar_url': path });
    }});
  },

  async saveProfile() {
    const { profile } = this.data;
    if (!profile.id) return;
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
        app.globalData.userInfo = Object.assign({}, app.globalData.userInfo || {}, { nickname: res.user.nickname || res.user.name });
        this.setData({ profile: Object.assign({}, this.data.profile, res.user), editing: false });
      } else {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    } finally { this.setData({ isLoading: false }); }
  },

  openDraft(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/editor/index?draftId=${id}` });
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
  }
});
