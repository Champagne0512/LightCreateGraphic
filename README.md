# LightCreateGraphic 轻创图文

专业在线图文设计微信小程序，提供丰富的模板库和便捷的设计工具。

## 🚀 项目特性

- 🎨 丰富的模板库，覆盖多种设计场景
- 📱 微信小程序原生开发，体验流畅
- 🔐 完整的用户认证系统
- 👑 完善的后台管理系统
- 💾 Supabase数据库支持
- 📊 数据统计和分析

## 📁 项目结构

```
LightCreateGraphic/
├── app.js                 # 小程序入口文件
├── app.json              # 小程序配置文件
├── app.wxss              # 全局样式
├── config.js             # 配置文件
├── config.example.js     # 配置示例文件
├── pages/                # 页面目录
│   ├── auth/            # 认证相关页面
│   │   ├── login/       # 登录页面
│   │   └── register/    # 注册页面
│   ├── admin/           # 后台管理页面
│   │   ├── dashboard/   # 仪表板
│   │   ├── templates/   # 模板管理
│   │   └── users/       # 用户管理
│   └── ...              # 其他业务页面
├── services/            # 服务层
│   └── supa.js         # Supabase服务
├── db/                  # 数据库配置
│   └── complete_supabase.sql # 完整数据库SQL
├── utils/               # 工具函数
├── images/              # 图片资源
└── README.md            # 项目说明
```

## 🛠️ 快速开始

### 1. 环境准备

1. 安装微信开发者工具
2. 创建Supabase项目
3. 配置小程序AppID

### 2. 数据库配置

1. 在Supabase控制台创建新项目
2. 运行 `db/complete_supabase.sql` 文件
3. 获取项目URL和Anon Key

### 3. 小程序配置

1. 复制 `config.example.js` 为 `config.js`
2. 填入实际的Supabase配置
3. 在微信开发者工具中导入项目

### 4. 运行项目

1. 在微信开发者工具中预览
2. 使用默认管理员账号登录后台
   - 账号: admin@lightcreate.com
   - 密码: admin123

## 📊 数据库设计

项目使用Supabase PostgreSQL数据库，包含以下主要表：

- **users** - 用户信息表
- **templates** - 模板表
- **user_works** - 用户作品表
- **template_categories** - 模板分类表
- **user_favorites** - 用户收藏表
- **download_records** - 下载记录表
- **system_settings** - 系统设置表
- **operation_logs** - 操作日志表

## 🔐 功能模块

### 用户认证
- 用户注册/登录
- 密码加密存储
- 会话管理
- 权限控制

### 模板管理
- 模板分类
- 模板搜索
- 模板收藏
- 下载统计

### 后台管理
- 用户管理
- 模板管理
- 数据统计
- 系统设置

### 设计工具
- 在线编辑器
- 模板应用
- 作品保存
- 导出功能

## 🚀 部署说明

### Supabase部署

1. 在Supabase官网创建项目
2. 导入数据库SQL文件
3. 配置认证设置
4. 获取API密钥

### 小程序发布

1. 在微信公众平台注册小程序
2. 配置服务器域名
3. 提交审核发布

## 📝 开发指南

### 代码规范
- 使用ES6+语法
- 遵循微信小程序开发规范
- 使用Promise进行异步处理

### 安全考虑
- 使用HTTPS通信
- 输入验证和过滤
- 权限控制
- 数据加密

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目。

## 📄 许可证

本项目采用MIT许可证。

## 📞 联系信息

如有问题请联系：champagne0512@example.com

---

**轻创图文 - 让设计更简单**