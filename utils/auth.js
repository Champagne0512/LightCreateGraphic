// 认证工具函数

const app = getApp();

// 检查登录状态
function checkLoginStatus() {
  return app.globalData.isLogin;
}

// 检查管理员权限
function checkAdminPermission() {
  return app.globalData.isAdmin;
}

// 获取用户信息
function getUserInfo() {
  return app.globalData.userInfo;
}

// 保存登录信息
function saveLoginInfo(userInfo, token) {
  app.login({
    ...userInfo,
    token: token
  });
}

// 清除登录信息
function clearLoginInfo() {
  app.logout();
}

// 跳转到登录页
function redirectToLogin() {
  wx.redirectTo({
    url: '/pages/auth/login'
  });
}

// 验证表单输入
function validateForm(formData) {
  const errors = {};
  
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = '请输入有效的邮箱地址';
  }
  
  if (formData.password && formData.password.length < 6) {
    errors.password = '密码长度至少6位';
  }
  
  if (formData.name && formData.name.trim().length < 2) {
    errors.name = '姓名长度至少2位';
  }
  
  if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
    errors.phone = '请输入有效的手机号码';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors: errors
  };
}

// 显示错误提示
function showError(message) {
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  });
}

// 显示成功提示
function showSuccess(message) {
  wx.showToast({
    title: message,
    icon: 'success',
    duration: 2000
  });
}

// 显示加载中
function showLoading(message = '加载中...') {
  wx.showLoading({
    title: message,
    mask: true
  });
}

// 隐藏加载中
function hideLoading() {
  wx.hideLoading();
}

module.exports = {
  checkLoginStatus,
  checkAdminPermission,
  getUserInfo,
  saveLoginInfo,
  clearLoginInfo,
  redirectToLogin,
  validateForm,
  showError,
  showSuccess,
  showLoading,
  hideLoading
};