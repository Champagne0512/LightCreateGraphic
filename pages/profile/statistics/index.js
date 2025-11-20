// pages/profile/statistics/index.js
const { getClientUid } = require('../../../utils/client.js');
const supa = require('../../../services/supa.js');

Page({
  data: {
    stats: {
      works: { current: 0, total: 0, trend: 'up' },
      favorites: { current: 0, total: 0, trend: 'up' },
      templates: { current: 0, total: 0, trend: 'up' },
      downloads: { current: 0, total: 0, trend: 'up' },
      views: { current: 0, total: 0, trend: 'up' },
      memberDays: { current: 0, total: 0, trend: 'stable' }
    },
    timeRange: 'week', // week, month, year
    chartData: [],
    isLoading: false
  },

  onLoad() {
    this.loadStatistics();
  },

  async loadStatistics() {
    this.setData({ isLoading: true });
    try {
      const app = getApp();
      const u = app.globalData.userInfo || {};
      if (!u || !u.userId) return;

      // 获取基础统计数据
      const stats = await supa.getUserStats(u.userId, getClientUid());
      if (stats && stats.success) {
        this.setData({ 
          'stats.works': { 
            current: stats.stats.works || 0, 
            total: stats.stats.works || 0, 
            trend: 'up' 
          },
          'stats.favorites': { 
            current: stats.stats.favorites || 0, 
            total: stats.stats.favorites || 0, 
            trend: 'up' 
          }
        });
      }

      // 加载扩展统计数据
      await this.loadExtendedStats(u.userId);
      
      // 生成图表数据
      this.generateChartData();
      
    } catch (error) {
      console.error('加载统计数据失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async loadExtendedStats(userId) {
    // 模拟扩展统计数据
    const extendedStats = {
      templates: { current: 25, total: 47, trend: 'up' },
      downloads: { current: 156, total: 892, trend: 'up' },
      views: { current: 1250, total: 4780, trend: 'up' },
      memberDays: { current: 30, total: 120, trend: 'stable' }
    };
    
    this.setData({ 
      stats: Object.assign({}, this.data.stats, extendedStats) 
    });
  },

  generateChartData() {
    // 模拟图表数据
    const chartData = [
      { date: '11-11', works: 3, favorites: 5, downloads: 12 },
      { date: '11-12', works: 5, favorites: 8, downloads: 18 },
      { date: '11-13', works: 7, favorites: 12, downloads: 25 },
      { date: '11-14', works: 6, favorites: 10, downloads: 20 },
      { date: '11-15', works: 8, favorites: 15, downloads: 30 },
      { date: '11-16', works: 10, favorites: 18, downloads: 35 },
      { date: '11-17', works: 12, favorites: 22, downloads: 40 }
    ];
    
    this.setData({ chartData });
  },

  // 切换时间范围
  changeTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({ timeRange: range });
    this.generateChartData(); // 重新生成对应时间范围的数据
    wx.showToast({ title: `切换至${range === 'week' ? '周' : range === 'month' ? '月' : '年'}视图`, icon: 'success' });
  },

  // 导出统计数据
  exportStatistics() {
    wx.showModal({
      title: '导出数据',
      content: '确定要导出您的统计数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '导出中...' });
          // 模拟导出过程
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({ 
              title: '导出成功', 
              icon: 'success',
              duration: 2000 
            });
          }, 1500);
        }
      }
    });
  },

  // 查看详细统计
  viewDetail(e) {
    const type = e.currentTarget.dataset.type;
    const titleMap = {
      works: '作品统计',
      favorites: '收藏统计', 
      templates: '模板统计',
      downloads: '下载统计',
      views: '浏览统计',
      memberDays: '会员统计'
    };
    
    wx.showModal({
      title: titleMap[type] || '详细统计',
      content: `当前值: ${this.data.stats[type].current}\n总计: ${this.data.stats[type].total}\n趋势: ${this.data.stats[type].trend === 'up' ? '上升' : this.data.stats[type].trend === 'down' ? '下降' : '稳定'}`,
      showCancel: false
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  }
})