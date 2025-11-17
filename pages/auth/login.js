const { setStorage, getStorage } = require('../../utils/storage.js');
const supa = require('../../services/supa.js');

// 临时修复：如果缺少uid函数，提供一个简单的实现
function getClientUid() {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

Page({
  data: {
    formData: {
      phone: '',
      password: '',
      rememberMe: false
    },
    showPassword: false,
    isLoading: false
  },

  onLoad() {
    this.loadRememberedData();
  },

  // 加载记住的登录信息
  async loadRememberedData() {
    try {
      const rememberedData = getStorage('login_remembered_data');
      if (rememberedData) {
        this.setData({
          formData: {
            phone: rememberedData.phone || '',
            password: rememberedData.password || '',
            rememberMe: true
          }
        });
      }
    } catch (error) {
      console.error('加载记住的登录信息失败', error);
    }
  },

  // 手机号输入处理
  onPhoneInput(e) {
    const phone = e.detail.value.replace(/\D/g, '');
    this.setData({ 'formData.phone': phone });
  },

  // 密码输入处理
  onPasswordInput(e) {
    this.setData({ 'formData.password': e.detail.value });
  },

  // 切换密码可见性
  togglePasswordVisibility() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  // 记住密码状态改变
  onRememberChange(e) {
    const rememberMe = e.detail.value.includes('remember');
    this.setData({ 'formData.rememberMe': rememberMe });
  },

  // 处理登录
  async handleLogin() {
    const { phone, password, rememberMe } = this.data.formData;

    if (!this.validateForm()) return;
    this.setData({ isLoading: true });

    try {
      const result = await this.loginWithPhone(phone, password);
      if (result.success) {
        await this.saveLoginState(result.userInfo, rememberMe);
        wx.showToast({ title: '登录成功', icon: 'success', duration: 2000 });
        setTimeout(() => { wx.switchTab({ url: '/pages/index/index' }); }, 1500);
      } else {
        wx.showToast({ title: result.message || '登录失败', icon: 'none', duration: 3000 });
      }
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({ title: '网络错误，请重试', icon: 'none', duration: 3000 });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 表单验证
  validateForm() {
    const { phone, password } = this.data.formData;

    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return false;
    }
    if (phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return false;
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return false;
    }
    if (password.length < 6) {
      wx.showToast({ title: '密码长度至少6位', icon: 'none' });
      return false;
    }
    return true;
  },

  // 手机号登录（优先走 Supabase RPC，失败回退本地模拟）
  async loginWithPhone(phone, password) {
    const res = await supa.signInPhone(phone, password);
    if (res && res.success) {
      const u = res.user || {};
      return {
        success: true,
        userInfo: {
          userId: u.id || getClientUid(),
          phone: u.phone || phone,
          nickname: u.name || ('用户' + phone.slice(-4)),
          role: u.role || 'user',
          avatar: '/images/default-avatar.png',
          memberStatus: false,
          createTime: new Date().toISOString()
        },
        token: res.token || null
      };
    }
    return { success: false, message: (res && res.message) || '登录失败' };
  },

  // 保存登录状态
  async saveLoginState(userInfo, rememberMe) {
    setStorage('user_info', userInfo);
    setStorage('is_logged_in', true);
    setStorage('login_token', 'mock');
    setStorage('userInfo', userInfo);
    setStorage('token', 'mock');

    if (rememberMe) {
      setStorage('login_remembered_data', { phone: userInfo.phone, password: this.data.formData.password });
    } else {
      setStorage('login_remembered_data', null);
    }

    const app = getApp();
    app.globalData.userInfo = userInfo;
    app.globalData.isLoggedIn = true;
    app.globalData.isLogin = true;
    app.globalData.isAdmin = userInfo.role === 'admin';
  },

  // 微信登录
  handleWechatLogin() {
    wx.showToast({ title: '微信登录功能开发中', icon: 'none', duration: 2000 });
  },

  // 忘记密码
  navigateToForgotPassword() {
    wx.showToast({ title: '忘记密码功能开发中', icon: 'none', duration: 2000 });
  },

  // 跳转到注册页
  navigateToRegister() {
    wx.navigateTo({ url: '/pages/auth/register' });
  }
});

