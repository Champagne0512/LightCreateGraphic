const app = getApp()

Page({
  data: {
    searchKeyword: '',
    templateList: [],
    filteredTemplates: [],
    showTemplateModal: false,
    editingTemplate: null,
    templateForm: {
      name: '',
      category: '',
      coverUrl: ''
    },
    categories: ['商务海报', '社交媒体', '活动推广', '教育培训', '电商产品'],
    categoryIndex: 0
  },

  onLoad() {
    this.checkAdminAuth()
    this.loadTemplates()
  },

  checkAdminAuth() {
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      wx.navigateBack()
      return false
    }
    return true
  },

  loadTemplates() {
    const mockTemplates = [
      { id: 1, name: '商务会议海报', category: '商务海报', coverUrl: '/images/templates/business-poster.jpg', downloadCount: 156, usageCount: 89, status: 'active' },
      { id: 2, name: '产品促销海报', category: '电商产品', coverUrl: '/images/templates/promotion-poster.jpg', downloadCount: 234, usageCount: 167, status: 'active' },
      { id: 3, name: '教育培训模板', category: '教育培训', coverUrl: '/images/templates/education-poster.jpg', downloadCount: 89, usageCount: 45, status: 'inactive' }
    ]
    this.setData({ templateList: mockTemplates, filteredTemplates: mockTemplates })
  },

  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    this.filterTemplates(keyword)
  },

  filterTemplates(keyword) {
    const { templateList } = this.data
    if (!keyword) { this.setData({ filteredTemplates: templateList }); return }
    const filtered = templateList.filter(t => t.name.includes(keyword) || t.category.includes(keyword))
    this.setData({ filteredTemplates: filtered })
  },

  showAddTemplate() {
    this.setData({
      showTemplateModal: true,
      editingTemplate: null,
      templateForm: { name: '', category: '', coverUrl: '' },
      categoryIndex: 0
    })
  },

  editTemplate(e) {
    const id = e.currentTarget.dataset.id
    const template = this.data.templateList.find(t => t.id === id)
    if (template) {
      const categoryIndex = this.data.categories.indexOf(template.category)
      this.setData({ showTemplateModal: true, editingTemplate: template, templateForm: { ...template }, categoryIndex: categoryIndex >= 0 ? categoryIndex : 0 })
    }
  },

  hideTemplateModal() { this.setData({ showTemplateModal: false }) },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    const templateForm = { ...this.data.templateForm }
    templateForm[field] = value
    this.setData({ templateForm })
  },

  onCategoryChange(e) {
    const index = e.detail.value
    const templateForm = { ...this.data.templateForm }
    templateForm.category = this.data.categories[index]
    this.setData({ categoryIndex: index, templateForm })
  },

  saveTemplate() {
    const { templateForm, editingTemplate } = this.data
    if (!templateForm.name || !templateForm.category) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    wx.showToast({ title: editingTemplate ? '模板更新成功' : '模板添加成功', icon: 'success' })
    this.hideTemplateModal()
    this.loadTemplates()
  },

  toggleTemplateStatus(e) {
    const status = e.currentTarget.dataset.status
    const newStatus = status === 'active' ? 'inactive' : 'active'
    wx.showModal({
      title: '确认操作',
      content: `确定要${newStatus === 'active' ? '启用' : '禁用'}这个模板吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: `模板已${newStatus === 'active' ? '启用' : '禁用'}`, icon: 'success' })
          this.loadTemplates()
        }
      }
    })
  },

  deleteTemplate() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个模板吗？此操作不可恢复',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '模板删除成功', icon: 'success' })
          this.loadTemplates()
        }
      }
    })
  }
})

