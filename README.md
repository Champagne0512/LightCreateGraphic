# LightCreateGraphic 轻创图文

面向非设计专业用户的轻量级图文创作小程序：提供场景模板库 + 可视化编辑器 + 一键导出，强调“低门槛、高效率、可商用”。

## 亮点特性

- 模板库：按场景分类，支持搜索与精选推荐
- 编辑器：画布尺寸预设、图层元素、撤销/重做、导出面板（占位）
- 草稿：自动保存本地草稿，支持版本化（简易）
- 账户：手机登录/注册（可接 Supabase 模拟/真实）
- 首次引导：Onboarding 首开引导，提升新手完成率

## 快速开始

1. 使用微信开发者工具导入本项目目录
2. 可直接编译预览（如不配置 Supabase，将自动使用离线 Mock 数据）
3. 首次进入会显示引导页，点击“开始创作”进入首页
4. 首页“立即创作”支持选择画布尺寸，进入编辑器

可选：在 `config.js` 配置 `supabase.url` 与 `supabase.anonKey` 以启用真实后端

## 目录结构（节选）

```
pages/
  index/        // 首页（已优化 CTA、搜索与展示文案）
  editor/       // 编辑器（支持尺寸参数 w/h）
  templates/    // 模板列表（修复文案、完善标签）
  auth/         // 登录/注册页（修复文案与语法问题）
  onboarding/   // 首次使用引导页（新增首开 gating）
  profile/      // 个人中心与统计等
services/
  supa.js       // Supabase 封装（mock 兼容，修复 catch 兼容性）
utils/
  storage.js    // 本地存取、草稿版本管理
  uid.js, draw.js, client.js 等
tools/          // 开发脚本：编码扫描、批量修复、JSON 校验
```

## 已做的质量改进

- 全量移除 UTF‑8 BOM、统一 UTF‑8 编码与行尾
- 修复多处因乱码导致的标签/文案破损（WXML/JS）
- 首页主 CTA 明确化，指向编辑器；新增尺寸预设 ActionSheet
- 编辑器支持通过 `?w=&h=` 设定画布尺寸
- 首开引导（Onboarding）gating（`wx.setStorageSync('onboarded', true)`）
- Supabase `catch {}` 改为 `catch (e) {}`，提高兼容性

## 路线（建议）

- P0：模板应用→编辑→导出的闭环稳定与体验细化
- P1：云端草稿/作品同步、协作分享、更多模板场景
- P2：会员体系、素材库（字体/图标/图片）与合规校验