const app = getApp()

Page({
  data: {
    searchKeyword: '',
    userList: [],
    filteredUsers: [],
    filterOptions: ['全部用户', '正常用户', '禁用用户', '管理员'],
    filterIndex: 0,
    showUserModal: false,
    selectedUser: null
  },

  onLoad() {
    this.checkAdminAuth()
    this.loadUsers()
  },

  checkAdminAuth() {
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      wx.navigateBack()
      return false
    }
    return true
  },

  loadUsers() {
    const mockUsers = [
      { id: 1, name: '张三', email: 'zhangsan@example.com', avatar: '/images/avatars/user1.jpg', registerTime: '2024-01-15', status: 'active', role: 'user', templateCount: 12, lastLogin: '2024-11-17 09:30' },
      { id: 2, name: '李四', email: 'lisi@example.com', avatar: '/images/avatars/user2.jpg', registerTime: '2024-02-20', status: 'active', role: 'user', templateCount: 8, lastLogin: '2024-11-16 14:20' },
      { id: 3, name: '王五', email: 'wangwu@example.com', registerTime: '2024-03-10', status: 'inactive', role: 'user', templateCount: 3, lastLogin: '2024-10-25 11:15' },
      { id: 4, name: '管理员', email: 'admin@example.com', avatar: '/images/avatars/admin.jpg', registerTime: '2024-01-01', status: 'active', role: 'admin', templateCount: 25, lastLogin: '2024-11-17 10:00' }
    ]
    this.setData({ userList: mockUsers, filteredUsers: mockUsers })
  },

  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    this.filterUsers(keyword)
  },

  onFilterChange(e) {
    const index = e.detail.value
    this.setData({ filterIndex: index })
    this.filterUsers(this.data.searchKeyword)
  },

  filterUsers(keyword) {
    const { userList, filterIndex } = this.data
    let filtered = userList
    if (filterIndex === 1) filtered = filtered.filter(u => u.status === 'active')
    else if (filterIndex === 2) filtered = filtered.filter(u => u.status === 'inactive')
    else if (filterIndex === 3) filtered = filtered.filter(u => u.role === 'admin')
    if (keyword) filtered = filtered.filter(u => u.name.includes(keyword) || u.email.includes(keyword))
    this.setData({ filteredUsers: filtered })
  },

  viewUserDetail(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.userList.find(u => u.id === id)
    if (user) this.setData({ showUserModal: true, selectedUser: user })
  },

  hideUserModal() { this.setData({ showUserModal: false }) },

  toggleUserStatus(e) {
    const status = e.currentTarget.dataset.status
    const newStatus = status === 'active' ? 'inactive' : 'active'
    wx.showModal({
      title: '确认操作',
      content: `确定要${newStatus === 'active' ? '启用' : '禁用'}这个用户吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: `用户已${newStatus === 'active' ? '启用' : '禁用'}`, icon: 'success' })
          this.loadUsers()
        }
      }
    })
  },

  deleteUser() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个用户吗？此操作不可恢复',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '用户删除成功', icon: 'success' })
          this.loadUsers()
        }
      }
    })
  }
})

