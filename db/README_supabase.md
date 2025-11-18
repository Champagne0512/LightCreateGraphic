# Supabase 后端与数据库

本项目已提供完整的 Supabase（Postgres + PostgREST）数据库结构与 RPC：

- 最小可用脚本：`db/supabase.sql`
- 完整功能脚本：`db/complete_supabase.sql`

推荐在开发环境中直接执行 `db/complete_supabase.sql`，即可满足个人中心（资料、隐私、通知、安全）、作品与模板等页面的数据需求。

## 步骤

1. 打开 Supabase 控制台 → 项目 → SQL Editor。
2. 将 `db/complete_supabase.sql` 内容粘贴到编辑器，执行全部语句。
3. 在小程序 `config.js` 填入真实的 `supabase.url` 与 `supabase.anonKey`。
4. 重新编译并在微信开发者工具中运行小程序。

> 注意：脚本默认开启 RLS，但策略为开发期“全开”。上线前请按需收紧策略（限制 `anon` 的增删改权限，改用服务端中转或使用 `authenticated` 令牌）。

## 表与 RPC 一览

- 表：`auth_users`, `profiles`, `privacy_settings`, `notifications`, `works`, `templates`, `favorites`
- 重要 RPC：
  - `register_user(phone, password, name)`
  - `login_user(phone, password)`
  - `get_user_profile(user_id)` / `update_user_profile(...)`
  - `get_privacy_settings(user_id)` / `update_privacy_settings(user_id, settings jsonb)`
  - `get_user_notifications(user_id, page, page_size)` / `mark_notification_read(user_id, id)` / `delete_notification(user_id, id)`
  - `get_user_stats(user_id, client_uid)`
  - `update_user_password(user_id, old, new)`
  - `get_dashboard_stats()`（管理台概览）

## 与前端的对应关系

- 个人资料页：`services/supa.js` → `getUserProfileById`, `updateUserProfile`
- 隐私设置：`getPrivacySettings`, `updatePrivacySettings`
- 通知中心：`getUserNotifications`, `markNotificationAsRead`, `deleteNotification`
- 安全设置：`updatePassword`,（可选）`enableTwoFactorAuth`/`disableTwoFactorAuth`
- 作品列表：`listWorks`（REST: `/rest/v1/works`）

## 本地调试建议

- 先用 `config.js` 的默认演示项目跑通（或改成你的项目），确认 `services/supa.js` 中 `enabled()` 为 `true`。
- 若需要造数据，可在 SQL Editor 中插入 `auth_users` 一条账号，再执行 `notifications` 等表的 `insert` 语句。

