const { getClientUid } = require('../../utils/client.js');
const { setStorage } = require('../../utils/storage.js');
const supa = require('../../services/supa.js');

Page({
  data: {
    formData: {
      phone: '',
      password: '',
      confirmPassword: '',
      agreed: false
    },
    showPassword: false,
    isLoading: false
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

  // 确认密码输入处理
  onConfirmPasswordInput(e) {
    this.setData({ 'formData.confirmPassword': e.detail.value });
  },

  // 切换密码可见性
  togglePasswordVisibility() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  // 用户协议状态改变
  onAgreementChange(e) {
    const agreed = e.detail.value.includes('agreement');
    this.setData({ 'formData.agreed': agreed });
  },

  // 处理注册（手机号 + 密码）
  async handleRegister() {
    const { phone, password, confirmPassword, agreed } = this.data.formData;
    if (!this.validateForm()) return;

    this.setData({ isLoading: true });
    try {
      const res = await supa.signUpPhone(phone, password, '');
      if (res && res.success) {
        const u = res.user || {};
        const userInfo = {
          userId: u.id || getClientUid(),
          phone: u.phone || phone,
          nickname: u.name || ('用户' + phone.slice(-4)),
          role: u.role || 'user',
          avatar: '/images/default-avatar.png',
          memberStatus: false,
          createTime: new Date().toISOString()
        };
        await this.saveLoginState(userInfo);
        wx.showToast({ title: '注册成功', icon: 'success', duration: 2000 });
        setTimeout(() => { wx.switchTab({ url: '/pages/index/index' }); }, 1500);
      } else {
        wx.showToast({ title: (res && res.message) || '注册失败', icon: 'none', duration: 3000 });
      }
    } catch (e) {
      console.error('注册失败:', e);
      wx.showToast({ title: '网络错误，请重试', icon: 'none', duration: 3000 });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 表单验证
  validateForm() {
    const { phone, password, confirmPassword, agreed } = this.data.formData;
    if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return false; }
    if (phone.length !== 11) { wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return false; }
    if (!password) { wx.showToast({ title: '请输入密码', icon: 'none' }); return false; }
    if (password.length < 6) { wx.showToast({ title: '密码长度至少6位', icon: 'none' }); return false; }
    if (password !== confirmPassword) { wx.showToast({ title: '两次输入的密码不一致', icon: 'none' }); return false; }
    if (!agreed) { wx.showToast({ title: '请同意用户协议和隐私政策', icon: 'none' }); return false; }
    return true;
  },

  // 保存登录状态
  async saveLoginState(userInfo) {
    setStorage('user_info', userInfo);
    setStorage('is_logged_in', true);
    setStorage('login_token', 'mock');
    setStorage('userInfo', userInfo);
    setStorage('token', 'mock');

    const app = getApp();
    app.globalData.userInfo = userInfo;
    app.globalData.isLoggedIn = true;
    app.globalData.isLogin = true;
    app.globalData.isAdmin = userInfo.role === 'admin';
  },

  // 显示用户协议
  showUserAgreement() {
    wx.showToast({ title: '用户协议功能开发中', icon: 'none', duration: 2000 });
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.showToast({ title: '隐私政策功能开发中', icon: 'none', duration: 2000 });
  },

  // 跳转到登录页
  navigateToLogin() {
    wx.navigateTo({ url: '/pages/auth/login' });
  }
});

