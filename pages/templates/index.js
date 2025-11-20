// pages/templates/index.js
const app = getApp()

Page({
  data: {
    // 搜索相关
    searchValue: '',
    showSearchResult: false,
    
    // 筛选相关
    categories: [
      { id: 'all', name: '全部模板', icon: 'grid' },
      { id: 'business', name: '商务', icon: 'briefcase' },
      { id: 'education', name: '教育', icon: 'book' },
      { id: 'marketing', name: '营销', icon: 'megaphone' },
      { id: 'social', name: '社交', icon: 'users' },
      { id: 'creative', name: '创意', icon: 'palette' }
    ],
    activeCategory: 'all',
    
    // 模板列表
    templates: [
      {
        id: 1,
        name: '商务报告模板',
        category: 'business',
        preview: '/images/templates/business-report.jpg',
        description: '专业的商务报告设计模板',
        isHot: true,
        usageCount: 1284,
        rating: 4.8
      },
      {
        id: 2,
        name: '教育课件模板',
        category: 'education',
        preview: '/images/templates/education-course.jpg',
        description: '适用于教学场景的课件模板',
        isHot: true,
        usageCount: 956,
        rating: 4.6
      },
      {
        id: 3,
        name: '社交媒体海报',
        category: 'social',
        preview: '/images/templates/social-poster.jpg',
        description: '吸引眼球的社交媒体海报模板',
        isHot: false,
        usageCount: 743,
        rating: 4.5
      },
      {
        id: 4,
        name: '营销活动模板',
        category: 'marketing',
        preview: '/images/templates/marketing-campaign.jpg',
        description: '营销活动推广模板',
        isHot: true,
        usageCount: 1120,
        rating: 4.7
      },
      {
        id: 5,
        name: '创意设计模板',
        category: 'creative',
        preview: '/images/templates/creative-design.jpg',
        description: '富有创意的设计模板',
        isHot: false,
        usageCount: 589,
        rating: 4.4
      },
      {
        id: 6,
        name: '企业宣传模板',
        category: 'business',
        preview: '/images/templates/company-presentation.jpg',
        description: '企业宣传和品牌展示模板',
        isHot: false,
        usageCount: 672,
        rating: 4.3
      }
    ],
    
    // 显示模式
    displayMode: 'grid', // grid 或 list
    
    // 热门模板
    hotTemplates: [],
    
    // 筛选结果
    filteredTemplates: [],
    
    // 分页相关
    currentPage: 1,
    pageSize: 12,
    hasMore: true
  },

  onLoad: function(options) {
    this.initTemplates()
  },

  onShow: function() {
    // 页面显示时更新数据
    this.updateHotTemplates()
  },

  // 初始化模板数据
  initTemplates: function() {
    this.setData({
      filteredTemplates: this.data.templates,
      hotTemplates: this.data.templates.filter(template => template.isHot)
    })
  },

  // 搜索模板
  onSearchInput: function(e) {
    const value = e.detail.value
    this.setData({
      searchValue: value,
      showSearchResult: value.length > 0
    })
    
    if (value.length > 0) {
      this.searchTemplates(value)
    } else {
      this.resetSearch()
    }
  },

  // 执行搜索
  searchTemplates: function(keyword) {
    const filtered = this.data.templates.filter(template => 
      template.name.includes(keyword) || 
      template.description.includes(keyword) ||
      template.category.includes(keyword)
    )
    
    this.setData({
      filteredTemplates: filtered
    })
  },

  // 重置搜索
  resetSearch: function() {
    this.setData({
      searchValue: '',
      showSearchResult: false,
      filteredTemplates: this.data.templates
    })
  },

  // 分类筛选
  onCategoryTap: function(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      activeCategory: category
    })
    
    if (category === 'all') {
      this.setData({
        filteredTemplates: this.data.templates
      })
    } else {
      const filtered = this.data.templates.filter(template => 
        template.category === category
      )
      this.setData({
        filteredTemplates: filtered
      })
    }
  },

  // 切换显示模式
  onToggleDisplayMode: function() {
    const newMode = this.data.displayMode === 'grid' ? 'list' : 'grid'
    this.setData({
      displayMode: newMode
    })
  },

  // 更新热门模板
  updateHotTemplates: function() {
    // 这里可以从服务器获取最新的热门模板数据
    const hotTemplates = this.data.templates
      .filter(template => template.isHot)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 4)
    
    this.setData({
      hotTemplates: hotTemplates
    })
  },

  // 模板点击事件
  onTemplateTap: function(e) {
    const templateId = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === templateId)
    
    if (template) {
      wx.navigateTo({
        url: `/pages/editor/index?templateId=${templateId}&templateName=${template.name}`
      })
    }
  },

  // 收藏模板
  onFavoriteTap: function(e) {
    const templateId = e.currentTarget.dataset.id
    wx.showToast({
      title: '已收藏',
      icon: 'success'
    })
    
    // 这里可以调用收藏接口
    console.log('收藏模板:', templateId)
  },

  // 预览模板
  onPreviewTap: function(e) {
    const templateId = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === templateId)
    
    if (template) {
      wx.previewImage({
        urls: [template.preview],
        current: template.preview
      })
    }
  },

  // 加载更多
  onLoadMore: function() {
    // 模拟分页加载
    setTimeout(() => {
      // 这里可以调用接口获取更多数据
      wx.showToast({
        title: '加载完成',
        icon: 'success'
      })
    }, 1000)
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: '发现超多精美模板，快来试试吧！',
      path: '/pages/templates/index'
    }
  }
})