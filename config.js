// 配置文件
// 请根据实际环境修改以下配置

module.exports = {
  // Supabase配置
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-supabase-anon-key'
  },
  
  // 小程序配置
  app: {
    name: '轻创图文',
    version: '1.0.0',
    description: '专业在线图文设计平台'
  },
  
  // API配置
  api: {
    baseUrl: 'https://your-api-domain.com/api',
    timeout: 10000
  },
  
  // 文件上传配置
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
  },
  
  // 模板配置
  templates: {
    defaultCategories: ['商务海报', '社交媒体', '活动推广', '教育培训', '电商产品']
  },
  
  // 开发环境配置
  development: {
    debug: true,
    mockData: true
  }
};