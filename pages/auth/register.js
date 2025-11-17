const { getClientUid } = require('../../utils/client.js');
const { setStorage } = require('../../utils/storage.js');

Page({
  data: {
    formData: {
      phone: '',
      captcha: '',
      password: '',
      confirmPassword: '',
      agreed: false
    },
    showPassword: false,
    countdown: 0,
    isLoading: false
  },

  // 手机号输入处理
  onPhoneInput(e) {
    const phone = e.detail.value.replace(/\D/g, '');
    this.setData({
      'formData.phone': phone
    });
  },

  // 验证码输入处理
  onCaptchaInput(e) {
    this.setData({
      'formData.captcha': e.detail.value
    });
  },

  // 密码输入处理
  onPasswordInput(e) {
    this.setData({
      'formData.password': e.detail.value
    });
  },

  // 确认密码输入处理
  onConfirmPasswordInput(e) {
    this.setData({
      'formData.confirmPassword': e.detail.value
    });
  },

  // 切换密码可见性
  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 用户协议状态改变
  onAgreementChange(e) {
    const agreed = e.detail.value.includes('agreement');
    this.setData({
      'formData.agreed': agreed
    });
  },

  // 发送验证码
  async sendCaptcha() {
    const { phone } = this.data.formData;

    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }

    if (phone.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    // 开始倒计时
    this.startCountdown();

    try {
      // 调用发送验证码API
      const result = await this.sendCaptchaCode(phone);
      
      if (result.success) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message || '发送失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 开始倒计时
  startCountdown() {
    this.setData({ countdown: 60 });
    
    const timer = setInterval(() => {
      this.setData({ countdown: this.data.countdown - 1 });
      
      if (this.data.countdown <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  },

  // 处理注册
  async handleRegister(e) {
    const { phone, captcha, password, confirmPassword, agreed } = this.data.formData;
    
    // 表单验证
    if (!this.validateForm()) {
      return;
    }

    this.setData({ isLoading: true });

    try {
      // 调用注册API
      const result = await this.registerWithPhone(phone, captcha, password);
      
      if (result.success) {
        // 保存登录状态
        await this.saveLoginState(result.userInfo);
        
        // 显示成功消息
        wx.showToast({
          title: '注册成功',
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
          title: result.message || '注册失败',
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('注册失败:', error);
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
    const { phone, captcha, password, confirmPassword, agreed } = this.data.formData;

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

    if (!captcha) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      });
      return false;
    }

    if (captcha.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
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

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次输入的密码不一致',
        icon: 'none'
      });
      return false;
    }

    if (!agreed) {
      wx.showToast({
        title: '请同意用户协议和隐私政策',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 发送验证码
  async sendCaptchaCode(phone) {
    // 模拟发送验证码
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: '验证码已发送'
        });
      }, 1000);
    });
  },

  // 手机号注册
  async registerWithPhone(phone, captcha, password) {
    // 这里应该调用实际的注册API
    // 暂时模拟注册过程
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟注册成功
        if (captcha === '123456') {
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
            message: '验证码错误'
          });
        }
      }, 1500);
    });
  },

  // 保存登录状态
  async saveLoginState(userInfo) {
    // 保存用户信息
    await setStorage('user_info', userInfo);
    await setStorage('is_logged_in', true);
    await setStorage('login_token', 'mock-jwt-token');

    // 更新全局数据
    const app = getApp();
    app.globalData.userInfo = userInfo;
    app.globalData.isLoggedIn = true;
  },

  // 显示用户协议
  showUserAgreement() {
    wx.showToast({
      title: '用户协议功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.showToast({
      title: '隐私政策功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 跳转到登录页面
  navigateToLogin() {
    wx.navigateTo({
      url: '/pages/auth/login'
    });
  }
});