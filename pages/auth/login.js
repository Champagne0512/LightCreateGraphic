const { getClientUid } = require('../../utils/client.js');
const { setStorage, getStorage } = require('../../utils/storage.js');

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
      const rememberedData = await getStorage('login_remembered_data');
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
      console.error('加载记住的登录信息失败:', error);
    }
  },

  // 手机号输入处理
  onPhoneInput(e) {
    const phone = e.detail.value.replace(/\D/g, '');
    this.setData({
      'formData.phone': phone
    });
  },

  // 密码输入处理
  onPasswordInput(e) {
    this.setData({
      'formData.password': e.detail.value
    });
  },

  // 切换密码可见性
  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 记住密码状态改变
  onRememberChange(e) {
    const rememberMe = e.detail.value.includes('remember');
    this.setData({
      'formData.rememberMe': rememberMe
    });
  },

  // 处理登录
  async handleLogin(e) {
    const { phone, password, rememberMe } = this.data.formData;
    
    // 表单验证
    if (!this.validateForm()) {
      return;
    }

    this.setData({ isLoading: true });

    try {
      // 调用登录API
      const result = await this.loginWithPhone(phone, password);
      
      if (result.success) {
        // 保存登录状态
        await this.saveLoginState(result.userInfo, rememberMe);
        
        // 显示成功消息
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000
        });

        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);

      } else {
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 表单验证
  validateForm() {
    const { phone, password } = this.data.formData;

    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return false;
    }

    if (phone.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return false;
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return false;
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码长度至少6位',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 手机号登录
  async loginWithPhone(phone, password) {
    // 这里应该调用实际的登录API
    // 暂时模拟登录过程
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟登录成功
        if (phone === '13800000000' && password === '123456') {
          resolve({
            success: true,
            userInfo: {
              userId: getClientUid(),
              phone: phone,
              nickname: '用户' + phone.slice(-4),
              avatar: '/images/default-avatar.png',
              memberStatus: false,
              createTime: new Date().toISOString()
            },
            token: 'mock-jwt-token-' + Date.now()
          });
        } else {
          resolve({
            success: false,
            message: '手机号或密码错误'
          });
        }
      }, 1500);
    });
  },

  // 保存登录状态
  async saveLoginState(userInfo, rememberMe) {
    // 保存用户信息
    await setStorage('user_info', userInfo);
    await setStorage('is_logged_in', true);
    await setStorage('login_token', 'mock-jwt-token');

    // 如果记住密码，保存登录信息
    if (rememberMe) {
      await setStorage('login_remembered_data', {
        phone: userInfo.phone,
        password: this.data.formData.password
      });
    } else {
      // 清除记住的密码
      await setStorage('login_remembered_data', null);
    }

    // 更新全局数据
    const app = getApp();
    app.globalData.userInfo = userInfo;
    app.globalData.isLoggedIn = true;
  },

  // 微信登录
  handleWechatLogin() {
    wx.showToast({
      title: '微信登录功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 忘记密码
  navigateToForgotPassword() {
    wx.showToast({
      title: '忘记密码功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 跳转到注册页面
  navigateToRegister() {
    wx.navigateTo({
      url: '/pages/auth/register'
    });
  }
});