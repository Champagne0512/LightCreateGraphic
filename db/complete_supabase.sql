-- =============================================
-- LightCreateGraphic 轻创图文数据库配置
-- Supabase 兼容的完整SQL文件
-- =============================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 用户表 (users)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 添加索引
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =============================================
-- 模板表 (templates)
-- =============================================
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    cover_url VARCHAR(500) NOT NULL,
    template_data JSONB NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    download_count INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    tags VARCHAR(500)[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 添加索引
    CONSTRAINT valid_price CHECK (price >= 0)
);

-- =============================================
-- 用户作品表 (user_works)
-- =============================================
CREATE TABLE IF NOT EXISTS user_works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id),
    title VARCHAR(200) NOT NULL,
    work_data JSONB NOT NULL,
    cover_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    download_count INTEGER DEFAULT 0,
    tags VARCHAR(500)[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 添加索引
    INDEX idx_user_works_user_id (user_id),
    INDEX idx_user_works_template_id (template_id)
);

-- =============================================
-- 模板分类表 (template_categories)
-- =============================================
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 用户收藏表 (user_favorites)
-- =============================================
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 唯一约束，防止重复收藏
    UNIQUE(user_id, template_id),
    
    -- 添加索引
    INDEX idx_user_favorites_user_id (user_id),
    INDEX idx_user_favorites_template_id (template_id)
);

-- =============================================
-- 下载记录表 (download_records)
-- =============================================
CREATE TABLE IF NOT EXISTS download_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    download_type VARCHAR(20) DEFAULT 'template' CHECK (download_type IN ('template', 'work')),
    file_format VARCHAR(20) DEFAULT 'png' CHECK (file_format IN ('png', 'jpg', 'pdf', 'svg')),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 添加索引
    INDEX idx_download_records_user_id (user_id),
    INDEX idx_download_records_template_id (template_id)
);

-- =============================================
-- 系统设置表 (system_settings)
-- =============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 添加索引
    INDEX idx_system_settings_key (setting_key)
);

-- =============================================
-- 操作日志表 (operation_logs)
-- =============================================
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    operation_type VARCHAR(50) NOT NULL,
    operation_target VARCHAR(100),
    target_id UUID,
    operation_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 添加索引
    INDEX idx_operation_logs_user_id (user_id),
    INDEX idx_operation_logs_operation_type (operation_type),
    INDEX idx_operation_logs_created_at (created_at)
);

-- =============================================
-- 文件存储表 (file_storage)
-- =============================================
CREATE TABLE IF NOT EXISTS file_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    bucket_name VARCHAR(100) DEFAULT 'public',
    uploaded_by UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 添加索引
    INDEX idx_file_storage_file_path (file_path),
    INDEX idx_file_storage_uploaded_by (uploaded_by)
);

-- =============================================
-- 插入初始数据
-- =============================================

-- 插入默认模板分类
INSERT INTO template_categories (name, description, sort_order) VALUES
('商务海报', '适用于商务场景的海报模板', 1),
('社交媒体', '适用于社交媒体的图片模板', 2),
('活动推广', '活动宣传和推广模板', 3),
('教育培训', '教育和培训相关模板', 4),
('电商产品', '电商产品展示模板', 5)
ON CONFLICT (name) DO NOTHING;

-- 插入默认系统设置
INSERT INTO system_settings (setting_key, setting_value, description, setting_type, is_public) VALUES
('site_name', '轻创图文', '网站名称', 'string', TRUE),
('site_description', '专业在线图文设计平台', '网站描述', 'string', TRUE),
('max_file_size', '10485760', '最大文件上传大小(字节)', 'number', FALSE),
('allow_registration', 'true', '是否允许用户注册', 'boolean', FALSE),
('default_user_role', 'user', '新用户默认角色', 'string', FALSE),
('template_categories', '["商务海报","社交媒体","活动推广","教育培训","电商产品"]', '模板分类列表', 'json', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

-- 插入默认管理员用户 (密码: admin123)
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@lightcreate.com', crypt('admin123', gen_salt('bf')), '系统管理员', 'admin')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- 创建触发器函数 (自动更新updated_at)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新时间的表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_works_updated_at BEFORE UPDATE ON user_works FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON template_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 创建视图 (简化查询)
-- =============================================

-- 模板详情视图
CREATE OR REPLACE VIEW template_details AS
SELECT 
    t.*,
    u.name as creator_name,
    c.name as category_name,
    COUNT(f.id) as favorite_count
FROM templates t
LEFT JOIN users u ON t.created_by = u.id
LEFT JOIN template_categories c ON t.category = c.name
LEFT JOIN user_favorites f ON t.id = f.template_id
GROUP BY t.id, u.name, c.name;

-- 用户统计视图
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT w.id) as work_count,
    COUNT(DISTINCT f.id) as favorite_count,
    COUNT(DISTINCT d.id) as download_count,
    u.last_login,
    u.created_at
FROM users u
LEFT JOIN user_works w ON u.id = w.user_id
LEFT JOIN user_favorites f ON u.id = f.user_id
LEFT JOIN download_records d ON u.id = d.user_id
GROUP BY u.id, u.name, u.email, u.last_login, u.created_at;

-- =============================================
-- 创建索引 (优化查询性能)
-- =============================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 模板表索引
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_download_count ON templates(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);

-- 用户作品表索引
CREATE INDEX IF NOT EXISTS idx_user_works_status ON user_works(status);
CREATE INDEX IF NOT EXISTS idx_user_works_created_at ON user_works(created_at DESC);

-- 操作日志索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_target_id ON operation_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at_desc ON operation_logs(created_at DESC);

-- =============================================
-- 创建Row Level Security (RLS) 策略
-- =============================================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_storage ENABLE ROW LEVEL SECURITY;

-- 用户表策略
CREATE POLICY "用户只能查看自己的信息" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "用户可以更新自己的信息" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "管理员可以管理所有用户" ON users FOR ALL USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
));

-- 模板表策略
CREATE POLICY "任何人都可以查看激活的模板" ON templates FOR SELECT USING (status = 'active');
CREATE POLICY "管理员可以管理所有模板" ON templates FOR ALL USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
));

-- 用户作品策略
CREATE POLICY "用户可以查看和管理自己的作品" ON user_works FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "任何人都可以查看已发布的作品" ON user_works FOR SELECT USING (status = 'published');

-- =============================================
-- 创建Supabase认证触发器
-- =============================================

-- 当Supabase Auth创建新用户时，同步到users表
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器（需要在Supabase仪表板中手动创建）
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- 数据库完成提示
-- =============================================
COMMENT ON DATABASE current_database IS 'LightCreateGraphic 轻创图文数据库 - 完成配置';

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '✅ LightCreateGraphic 数据库配置完成！';
    RAISE NOTICE '📊 已创建 % 个表', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
    RAISE NOTICE '👤 默认管理员账号: admin@lightcreate.com / admin123';
    RAISE NOTICE '🚀 请将SQL文件导入Supabase项目即可使用';
END $$;