const app = getApp();

Page({
  data: {
    slides: [
      {
        title: '欢迎使用轻创图文',
        description: '快速创建精美海报和设计作品',
        bgColor: '#1677FF',
        icon: '🎨'
      },
      {
        title: '丰富模板库',
        description: '海量专业模板，满足各种场景需求',
        bgColor: '#52C41A',
        icon: '📚'
      },
      {
        title: '简单易用',
        description: '拖拽式操作，轻松完成设计',
        bgColor: '#FA8C16',
        icon: '🖱️'
      }
    ],
    currentIndex: 0,
    showButton: false
  },

  onLoad() {
    console.log('引导页加载');
  },

  onShow() {
    // 检查是否已经完成引导
    const onboarded = wx.getStorageSync('onboarded');
    if (onboarded) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }
  },

  // 滑动切换
  onSwiperChange(e) {
    const current = e.detail.current;
    this.setData({ 
      currentIndex: current,
      showButton: current === this.data.slides.length - 1
    });
  },

  // 点击指示器
  onIndicatorTap(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ 
      currentIndex: index,
      showButton: index === this.data.slides.length - 1
    });
  },

  // 开始使用
  goCreate() {
    try { 
      wx.setStorageSync('onboarded', true); 
    } catch (_) {}
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 跳过引导
  skipOnboarding() {
    try { 
      wx.setStorageSync('onboarded', true); 
    } catch (_) {}
    wx.switchTab({ url: '/pages/index/index' });
  }
});