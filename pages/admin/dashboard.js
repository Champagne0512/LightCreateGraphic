const app = getApp()

Page({
  data: {
    stats: { totalUsers: 0, totalTemplates: 0, todayVisits: 0 },
    recentActivities: []
  },

  onLoad() {
    this.checkAdminAuth()
    this.loadDashboardData()
  },

  checkAdminAuth() {
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      wx.navigateBack()
      return false
    }
    return true
  },

  async loadDashboardData() {
    try {
      const mockData = {
        stats: { totalUsers: 156, totalTemplates: 23, todayVisits: 89 },
        recentActivities: [
          { id: 1, time: '09:30', content: '用户张三注册账号' },
          { id: 2, time: '10:15', content: '模板“商务海报”被下载' },
          { id: 3, time: '11:00', content: '系统备份完成' },
          { id: 4, time: '13:45', content: '新用户李四完成首次创' }
        ]
      }
      this.setData({ stats: mockData.stats, recentActivities: mockData.recentActivities })
    } catch (error) {
      console.error('加载仪表板数据失败', error)
      wx.showToast({ title: '数据加载失败', icon: 'none' })
    }
  },

  navigateToTemplates() { wx.navigateTo({ url: '/pages/admin/templates' }) },
  navigateToUsers() { wx.navigateTo({ url: '/pages/admin/users' }) },
  navigateToAnalytics() { wx.showToast({ title: '功能开发中', icon: 'none' }) },
  navigateToSettings() { wx.showToast({ title: '功能开发中', icon: 'none' }) }
})

