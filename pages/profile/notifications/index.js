// pages/profile/notifications/index.js
Page({
  data: {
    notifications: [],
    filterType: 'all', // all, unread, system, template, security
    isLoading: false,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onLoad() {
    this.loadNotifications();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.loadNotifications().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadMoreNotifications();
    }
  },

  async loadNotifications() {
    this.setData({ isLoading: true });
    try {
      const notifications = await this.fetchNotifications(1);
      this.setData({ 
        notifications,
        hasMore: notifications.length >= this.data.pageSize
      });
    } catch (error) {
      console.error('加载通知失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async loadMoreNotifications() {
    if (this.data.isLoading || !this.data.hasMore) return;
    
    this.setData({ isLoading: true });
    try {
      const nextPage = this.data.page + 1;
      const newNotifications = await this.fetchNotifications(nextPage);
      
      if (newNotifications.length > 0) {
        this.setData({
          notifications: [...this.data.notifications, ...newNotifications],
          page: nextPage,
          hasMore: newNotifications.length >= this.data.pageSize
        });
      } else {
        this.setData({ hasMore: false });
      }
    } catch (error) {
      console.error('加载更多通知失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async fetchNotifications(page) {
    // 模拟API调用
    return new Promise(resolve => {
      setTimeout(() => {
        const baseNotifications = [
          {
            id: page * 100 + 1,
            type: 'system',
            title: '系统通知',
            content: '欢迎使用LightCreateGraphic！系统已为您优化了创体验。',
            time: '2024-11-17 10:00',
            read: false,
            important: true
          },
          {
            id: page * 100 + 2,
            type: 'template',
            title: '模板更新',
            content: '您收藏的「商务图表模板」已更新到最新版本，新增了更多样式。',
            time: '2024-11-16 15:30',
            read: false,
            important: false
          },
          {
            id: page * 100 + 3,
            type: 'security',
            title: '安全提醒',
            content: '请及时更新您的账户安全设置，增强账户保护。',
            time: '2024-11-15 09:15',
            read: true,
            important: true
          },
          {
            id: page * 100 + 4,
            type: 'works',
            title: '作品审核',
            content: '您的作品「年度报告图表」已通过审核，现在可以公开分享了。',
            time: '2024-11-14 14:20',
            read: true,
            important: false
          },
          {
            id: page * 100 + 5,
            type: 'member',
            title: '会员权益',
            content: '您的会员即将到期，续费可享受专属模板和高级功能。',
            time: '2024-11-13 11:45',
            read: true,
            important: true
          }
        ];
        
        // 根据页面返回对应数据
        const startIndex = (page - 1) * this.data.pageSize;
        const endIndex = startIndex + this.data.pageSize;
        const pageNotifications = baseNotifications.slice(0, this.data.pageSize);
        
        resolve(pageNotifications);
      }, 500);
    });
  },

  // 过滤通知
  filterNotifications(e) {
    const filterType = e.currentTarget.dataset.type;
    this.setData({ filterType });
    this.loadNotifications();
  },

  // 标记为已读
  markAsRead(e) {
    const id = e.currentTarget.dataset.id;
    const notifications = this.data.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    this.setData({ notifications });
    wx.showToast({ title: '标记为已读', icon: 'success' });
  },

  // 标记全部为已读
  markAllAsRead() {
    wx.showModal({
      title: '确认操作',
      content: '确定要将所有通知标记为已读吗？',
      success: (res) => {
        if (res.confirm) {
          const notifications = this.data.notifications.map(n => ({
            ...n,
            read: true
          }));
          this.setData({ notifications });
          wx.showToast({ title: '全部标记为已读', icon: 'success' });
        }
      }
    });
  },

  // 删除通知
  deleteNotification(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: (res) => {
        if (res.confirm) {
          const notifications = this.data.notifications.filter(n => n.id !== id);
          this.setData({ notifications });
          wx.showToast({ title: '删除成功', icon: 'success' });
        }
      }
    });
  },

  // 清空通知
  clearAllNotifications() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有通知吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          this.setData({ notifications: [] });
          wx.showToast({ title: '已清空所有通知', icon: 'success' });
        }
      }
    });
  },

  // 跳转到通知详情
  viewNotificationDetail(e) {
    const id = e.currentTarget.dataset.id;
    const notification = this.data.notifications.find(n => n.id === id);
    if (notification) {
      // 标记为已读
      if (!notification.read) {
        this.markAsRead(e);
      }
      
      wx.showModal({
        title: notification.title,
        content: notification.content,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 获取未读数量
  getUnreadCount() {
    return this.data.notifications.filter(n => !n.read).length;
  },

  // 获取重要通知数量
  getImportantCount() {
    return this.data.notifications.filter(n => n.important && !n.read).length;
  },

  // 阻止事件冒泡
  stopPropagation(e) {
    e.stopPropagation();
  },

  // 获取类型文本
  getTypeText(type) {
    const typeMap = {
      'system': '系统',
      'template': '模板',
      'security': '安全',
      'works': '作品',
      'member': '会员'
    };
    return typeMap[type] || '通知';
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  }
})