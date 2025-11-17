// 配置文件
// 请根据实际环境修改以下配置

const env = (typeof process !== 'undefined' && process && process.env) ? process.env : {};

module.exports = {
  // Supabase配置
  supabase: {
    // 运行时优先读取环境变量（若由构建工具注入），否则使用静态值
    url: env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygrcgyhqcgcrfjsktigz.supabase.co',
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncmNneWhxY2djcmZqc2t0aWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNzE1MDAsImV4cCI6MjA3ODY0NzUwMH0.M33ua9YdbcVFhSX7UZBhQjR498w2kfaWiYOz-p7IfXc'
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
