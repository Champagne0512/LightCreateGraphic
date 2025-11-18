// pages/profile/privacy/index.js
const supa = require('../../../services/supa.js');

Page({
  data: {
    settings: {
      profile_visible: true,
      works_visible: true,
      show_online_status: true,
      data_collection: true,
      marketing_emails: false,
      personalized_ads: false
    },
    isLoading: false,
    saved: false
  },

  onLoad() {
    this.loadPrivacySettings();
  },

  async loadPrivacySettings() {
    this.setData({ isLoading: true });
    try {
      const app = getApp();
      const u = app.globalData.userInfo || {};
      if (!u || !u.userId) return;

      const res = await supa.getPrivacySettings(u.userId);
      if (res && res.success) {
        this.setData({ settings: Object.assign({}, this.data.settings, res.settings) });
      }
    } catch (error) {
      console.error('加载隐私设置失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 切换设置
  toggleSetting(e) {
    const setting = e.currentTarget.dataset.setting;
    const currentValue = this.data.settings[setting];
    this.setData({ 
      [`settings.${setting}`]: !currentValue,
      saved: false
    });
  },

  // 保存设置
  async saveSettings() {
    this.setData({ isLoading: true });
    try {
      const app = getApp();
      const u = app.globalData.userInfo || {};
      if (!u || !u.userId) {
        throw new Error('用户未登录');
      }

      const res = await supa.updatePrivacySettings(u.userId, this.data.settings);
      if (res && res.success) {
        this.setData({ saved: true });
        wx.showToast({ title: '隐私设置已保存', icon: 'success' });
      } else {
        throw new Error(res.message || '保存失败');
      }
    } catch (error) {
      console.error('保存隐私设置失败:', error);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 重置为默认设置
  resetToDefault() {
    wx.showModal({
      title: '确认重置',
      content: '确定要将隐私设置重置为默认值吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            settings: {
              profile_visible: true,
              works_visible: true,
              show_online_status: true,
              data_collection: true,
              marketing_emails: false,
              personalized_ads: false
            },
            saved: false
          });
          wx.showToast({ title: '已重置为默认设置', icon: 'success' });
        }
      }
    });
  },

  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们致力于保护您的隐私。您的个人信息将仅用于改善服务体验，不会与第三方共享。详细政策请访问我们的官方网站。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 导出个人数据
  exportPersonalData() {
    wx.showModal({
      title: '导出个人数据',
      content: '确定要导出您的个人数据吗？这可能需要一些时间。',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '准备数据中...' });
          // 模拟导出过程
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({ 
              title: '数据导出成功', 
              icon: 'success',
              duration: 2000 
            });
          }, 2000);
        }
      }
    });
  },

  // 删除账户数据
  deleteAccountData() {
    wx.showModal({
      title: '删除账户数据',
      content: '警告：此操作将永久删除您的所有数据，包括作品、收藏和个人信息。此操作不可撤销！',
      confirmText: '确认删除',
      confirmColor: '#dc3545',
      success: (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '最后确认',
            content: '您确定要删除所有数据吗？此操作无法撤销！',
            confirmText: '永久删除',
            confirmColor: '#dc3545',
            success: (res2) => {
              if (res2.confirm) {
                wx.showLoading({ title: '删除中...' });
                // 模拟删除过程
                setTimeout(() => {
                  wx.hideLoading();
                  wx.showToast({ 
                    title: '数据已删除', 
                    icon: 'success',
                    duration: 2000 
                  });
                }, 3000);
              }
            }
          });
        }
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  }
})