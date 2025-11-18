const supa = require('../../../services/supa.js');

Page({
  data: {
    securitySettings: {
      passwordChangedAt: '2024-11-01',
      twoFactorEnabled: false,
      loginDevices: [
        { device: 'iPhone 14', location: '北京', time: '2024-11-17 10:30', active: true },
        { device: 'Windows PC', location: '上海', time: '2024-11-16 15:20', active: false }
      ],
      securityQuestions: [
        { question: '您的出生地是？', answered: true },
        { question: '您最喜欢的电影是？', answered: false }
      ]
    },
    passwordForm: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    isLoading: false,
    showPasswordForm: false,
    showTwoFactorSetup: false,
    twoFactorCode: '',
    backupCodes: []
  },

  onLoad() {
    this.loadSecuritySettings();
  },

  async loadSecuritySettings() {
    const app = getApp();
    const userId = app.globalData.userInfo?.userId;
    if (!userId) return;

    this.setData({ isLoading: true });
    try {
      // 模拟加载安全设置
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('加载安全设置失败:', error);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 密码修改
  togglePasswordForm() {
    this.setData({ 
      showPasswordForm: !this.data.showPasswordForm,
      passwordForm: { currentPassword: '', newPassword: '', confirmPassword: '' }
    });
  },

  onPasswordInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`passwordForm.${field}`]: e.detail.value });
  },

  async changePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.data.passwordForm;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (newPassword !== confirmPassword) {
      wx.showToast({ title: '新密码不一致', icon: 'none' });
      return;
    }

    if (newPassword.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    try {
      // 模拟密码修改
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      wx.showToast({ title: '密码修改成功', icon: 'success' });
      this.setData({ 
        showPasswordForm: false,
        passwordForm: { currentPassword: '', newPassword: '', confirmPassword: '' },
        'securitySettings.passwordChangedAt': new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      wx.showToast({ title: '修改失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 双重验证
  toggleTwoFactor() {
    const { twoFactorEnabled } = this.data.securitySettings;
    
    if (twoFactorEnabled) {
      wx.showModal({
        title: '关闭双重验证',
        content: '确定要关闭双重验证吗？关闭后账户安全性将降低。',
        success: (res) => {
          if (res.confirm) {
            this.disableTwoFactor();
          }
        }
      });
    } else {
      this.setData({ showTwoFactorSetup: true });
      this.generateTwoFactorSetup();
    }
  },

  generateTwoFactorSetup() {
    // 模拟生成双重验证设置
    const backupCodes = Array.from({length: 8}, (_, i) => 
      Math.random().toString(36).substr(2, 8).toUpperCase()
    );
    
    this.setData({ 
      backupCodes,
      twoFactorCode: ''
    });
  },

  onTwoFactorCodeInput(e) {
    this.setData({ twoFactorCode: e.detail.value });
  },

  async enableTwoFactor() {
    const { twoFactorCode } = this.data;
    
    if (!twoFactorCode) {
      wx.showToast({ title: '请输入验证码', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    try {
      // 模拟启用双重验证
      await new Promise(resolve => setTimeout(resolve, 800));
      
      wx.showToast({ title: '双重验证已启用', icon: 'success' });
      this.setData({ 
        showTwoFactorSetup: false,
        'securitySettings.twoFactorEnabled': true,
        twoFactorCode: '',
        backupCodes: []
      });
    } catch (error) {
      wx.showToast({ title: '启用失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  disableTwoFactor() {
    this.setData({ isLoading: true });
    try {
      // 模拟禁用双重验证
      setTimeout(() => {
        this.setData({ 
          'securitySettings.twoFactorEnabled': false,
          isLoading: false 
        });
        wx.showToast({ title: '双重验证已关闭', icon: 'success' });
      }, 800);
    } catch (error) {
      wx.showToast({ title: '关闭失败，请重试', icon: 'none' });
      this.setData({ isLoading: false });
    }
  },

  // 登录设备管理
  logoutDevice(e) {
    const index = e.currentTarget.dataset.index;
    const device = this.data.securitySettings.loginDevices[index];
    
    wx.showModal({
      title: '确认退出',
      content: `确定要退出设备"${device.device}"吗？`,
      success: (res) => {
        if (res.confirm) {
          const loginDevices = [...this.data.securitySettings.loginDevices];
          loginDevices.splice(index, 1);
          this.setData({ 'securitySettings.loginDevices': loginDevices });
          wx.showToast({ title: '设备已退出', icon: 'success' });
        }
      }
    });
  },

  // 安全问答
  setupSecurityQuestion() {
    wx.showModal({
      title: '设置安全问题',
      content: '请选择并设置安全问题，用于账户恢复。',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/profile/security/questions' });
        }
      }
    });
  },

  // 导出备份代码
  exportBackupCodes() {
    const { backupCodes } = this.data;
    if (backupCodes.length === 0) {
      wx.showToast({ title: '暂无备份代码', icon: 'none' });
      return;
    }

    const codesText = backupCodes.join('\n');
    
    wx.showModal({
      title: '备份代码',
      content: codesText,
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: codesText,
            success: () => {
              wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
            }
          });
        }
      }
    });
  },

  // 取消双重验证设置
  cancelTwoFactorSetup() {
    this.setData({ 
      showTwoFactorSetup: false,
      twoFactorCode: '',
      backupCodes: []
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  }
})