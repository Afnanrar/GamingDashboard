-- =====================================================
-- GAMING AGENT MANAGEMENT SYSTEM - SUPABASE SCHEMA
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLES
-- =====================================================

-- Businesses table
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Managed agents table
CREATE TABLE managed_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    agent_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Viewer', 'Editor', 'Full Access')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, username)
);

-- Entries table (main transaction data)
CREATE TABLE entries (
    id SERIAL PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Recharge', 'Freeplay', 'Redeem')),
    page_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    points_load INTEGER NOT NULL,
    platform VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('Referral', 'Ads', 'Random')),
    referral_code VARCHAR(50) NOT NULL,
    redeem_type VARCHAR(50) CHECK (redeem_type IN ('Already Paid', 'New Paid')),
    payment_method VARCHAR(255),
    player_history VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table for configurable options
CREATE TABLE business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    setting_type VARCHAR(50) NOT NULL CHECK (setting_type IN ('pageNames', 'platforms', 'paymentMethods', 'playerHistories')),
    setting_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, setting_type, setting_value)
);

-- AI insights cache table
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    page_name VARCHAR(50) NOT NULL,
    insight_text TEXT NOT NULL,
    context_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Business indexes
CREATE INDEX idx_businesses_email ON businesses(email);
CREATE INDEX idx_businesses_created_at ON businesses(created_at);

-- Agent indexes
CREATE INDEX idx_managed_agents_business_id ON managed_agents(business_id);
CREATE INDEX idx_managed_agents_username ON managed_agents(username);
CREATE INDEX idx_managed_agents_status ON managed_agents(status);

-- Entry indexes
CREATE INDEX idx_entries_business_id ON entries(business_id);
CREATE INDEX idx_entries_date ON entries(date);
CREATE INDEX idx_entries_agent_name ON entries(agent_name);
CREATE INDEX idx_entries_category ON entries(category);
CREATE INDEX idx_entries_platform ON entries(platform);
CREATE INDEX idx_entries_referral_code ON entries(referral_code);
CREATE INDEX idx_entries_payment_method ON entries(payment_method);
CREATE INDEX idx_entries_business_date ON entries(business_id, date);
CREATE INDEX idx_entries_business_agent ON entries(business_id, agent_name);

-- Settings indexes
CREATE INDEX idx_business_settings_business_id ON business_settings(business_id);
CREATE INDEX idx_business_settings_type ON business_settings(setting_type);

-- AI insights indexes
CREATE INDEX idx_ai_insights_business_page ON ai_insights(business_id, page_name);
CREATE INDEX idx_ai_insights_expires_at ON ai_insights(expires_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_managed_agents_updated_at BEFORE UPDATE ON managed_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get business statistics
CREATE OR REPLACE FUNCTION get_business_stats(
    p_business_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    total_recharge DECIMAL,
    total_freeplay DECIMAL,
    total_points BIGINT,
    total_entries BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN category = 'Recharge' THEN amount ELSE 0 END), 0) as total_recharge,
        COALESCE(SUM(CASE WHEN category = 'Freeplay' THEN amount ELSE 0 END), 0) as total_freeplay,
        COALESCE(SUM(points_load), 0) as total_points,
        COUNT(*) as total_entries
    FROM entries 
    WHERE business_id = p_business_id
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get agent performance
CREATE OR REPLACE FUNCTION get_agent_performance(
    p_business_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    agent_name VARCHAR,
    total_recharge DECIMAL,
    total_freeplay DECIMAL,
    total_points BIGINT,
    entry_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.agent_name,
        COALESCE(SUM(CASE WHEN e.category = 'Recharge' THEN e.amount ELSE 0 END), 0) as total_recharge,
        COALESCE(SUM(CASE WHEN e.category = 'Freeplay' THEN e.amount ELSE 0 END), 0) as total_freeplay,
        COALESCE(SUM(e.points_load), 0) as total_points,
        COUNT(*) as entry_count
    FROM entries e
    WHERE e.business_id = p_business_id
    AND (p_start_date IS NULL OR e.date >= p_start_date)
    AND (p_end_date IS NULL OR e.date <= p_end_date)
    GROUP BY e.agent_name
    ORDER BY total_recharge DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referral code statistics
CREATE OR REPLACE FUNCTION get_referral_stats(
    p_business_id UUID,
    p_referral_code VARCHAR,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    total_recharge DECIMAL,
    total_freeplay DECIMAL,
    new_paid_count BIGINT,
    already_paid_count BIGINT,
    total_entries BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN category = 'Recharge' THEN amount ELSE 0 END), 0) as total_recharge,
        COALESCE(SUM(CASE WHEN category = 'Freeplay' THEN amount ELSE 0 END), 0) as total_freeplay,
        COUNT(CASE WHEN redeem_type = 'New Paid' THEN 1 END) as new_paid_count,
        COUNT(CASE WHEN redeem_type = 'Already Paid' THEN 1 END) as already_paid_count,
        COUNT(*) as total_entries
    FROM entries 
    WHERE business_id = p_business_id
    AND referral_code = p_referral_code
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample business
INSERT INTO businesses (business_name, owner_name, email, phone, password_hash, logo_url) VALUES
('Epic Gaming Inc.', 'Jane Doe', 'test@test.com', '(555) 123-4567', crypt('password', gen_salt('bf')), 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTIxLDNIM3YxOGgxOHYtMTh6IE0xMSwxdjJoMnYtMmgtMnptMiw0aC0ydjJoMnYtMnptMiw0aC0ydjJoMnYtMnptMiw0aC0ydjJoMnYtMnptLTIsNGgtMnYyaDJ2LTR6bS0yLDJoLTJ2LTJoMnYyem0tMiwyaC0ydi0yaDJ2MnptLTIsMmgtMnYtMmgydjJ6bS0yLDRoMnYtMmgtMnYyem0tMi0yaDJ2LTJoLTJ2MnptLTItMmgydi0yaC0ydjJ6bS0yLTJoMnYtMmgtMnYyeiIvPjwvc3ZnPg==');

-- Insert sample agents
INSERT INTO managed_agents (business_id, agent_name, username, password_hash, role, status) VALUES
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'ahsan', 'ahsan@branhox.com', crypt('password123', gen_salt('bf')), 'Full Access', 'active'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'hassan', 'hassan@branhox.com', crypt('password123', gen_salt('bf')), 'Editor', 'active'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'umer', 'umer@branhox.com', crypt('password123', gen_salt('bf')), 'Viewer', 'active'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'ali', 'ali@branhox.com', crypt('password123', gen_salt('bf')), 'Editor', 'active'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'zara', 'zara@branhox.com', crypt('password123', gen_salt('bf')), 'Viewer', 'inactive');

-- Insert sample settings
INSERT INTO business_settings (business_id, setting_type, setting_value) VALUES
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'pageNames', 'Gaming Slots'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'pageNames', 'Orion Era'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'pageNames', 'Jeetwin'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'pageNames', 'BetHub'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'pageNames', 'Nolimit Slots'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'pageNames', 'CashDock'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Orion Star'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Juwa'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'FireKirin'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Gamevault'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Ultra Panda'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Cash Machine'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Bigwinner'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Dragon Dynasty'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'VB Link'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Game Room'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'River Sweep'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Moolah'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Yolo'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Panda Master'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Mafia City'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Cameroom'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Milkyway'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'platforms', 'Random'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'paymentMethods', 'Chime'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'paymentMethods', 'CashApp'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'paymentMethods', 'Apple Pay'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'paymentMethods', 'PayPal'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'playerHistories', 'Already Paid'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'playerHistories', 'New Paid'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'playerHistories', 'New Freeplay'),
((SELECT id FROM businesses WHERE email = 'test@test.com'), 'playerHistories', 'Null');

-- Insert sample entries (last 90 days)
DO $$
DECLARE
    business_uuid UUID;
    agent_names VARCHAR[] := ARRAY['ahsan', 'hassan', 'umer', 'ali', 'zara'];
    page_names VARCHAR[] := ARRAY['Gaming Slots', 'Orion Era', 'Jeetwin', 'BetHub', 'Nolimit Slots', 'CashDock'];
    platforms VARCHAR[] := ARRAY['Orion Star', 'Juwa', 'FireKirin', 'Gamevault', 'Ultra Panda', 'Cash Machine', 'Bigwinner', 'Dragon Dynasty', 'VB Link', 'Game Room', 'River Sweep', 'Moolah', 'Yolo', 'Panda Master', 'Mafia City', 'Cameroom', 'Milkyway', 'Random'];
    referral_codes VARCHAR[] := ARRAY['FR2K', 'FR3L', 'UM303', 'HM303', 'BN303', 'AS303', 'JF303', 'HA303', 'MZ303', 'SH303', '2218', '786', 'TP303', 'AL303', 'PT303', 'ADS', 'Random'];
    payment_methods VARCHAR[] := ARRAY['Chime', 'CashApp', 'Apple Pay', 'PayPal'];
    player_histories VARCHAR[] := ARRAY['Already Paid', 'New Paid', 'New Freeplay', 'Null'];
    i INTEGER;
    entry_date DATE;
    agent_name VARCHAR;
    category VARCHAR;
    amount DECIMAL;
    points_load INTEGER;
    platform VARCHAR;
    referral_code VARCHAR;
    payment_method VARCHAR;
    player_history VARCHAR;
    redeem_type VARCHAR;
BEGIN
    SELECT id INTO business_uuid FROM businesses WHERE email = 'test@test.com';
    
    FOR i IN 1..250 LOOP
        -- Generate random date within last 90 days
        entry_date := CURRENT_DATE - (random() * 90)::INTEGER;
        
        -- Select random agent
        agent_name := agent_names[1 + (i % array_length(agent_names, 1))];
        
        -- Determine category and related fields
        IF random() > 0.3 THEN
            category := 'Recharge';
            amount := (random() * 150 + 10)::DECIMAL;
            points_load := (amount * (random() * 50 + 80))::INTEGER;
            payment_method := payment_methods[1 + (i % array_length(payment_methods, 1))];
            player_history := player_histories[1 + (i % 2)]; -- Only 'Already Paid' or 'New Paid'
            redeem_type := CASE WHEN random() > 0.5 THEN 'New Paid' ELSE 'Already Paid' END;
        ELSE
            category := 'Freeplay';
            amount := 0;
            points_load := (random() * 5000 + 1000)::INTEGER;
            payment_method := payment_methods[1];
            player_history := player_histories[3]; -- 'New Freeplay'
            redeem_type := 'Already Paid';
        END IF;
        
        -- Select random platform and referral code
        platform := platforms[1 + (i % array_length(platforms, 1))];
        referral_code := referral_codes[1 + (i % array_length(referral_codes, 1))];
        
        -- Insert entry
        INSERT INTO entries (
            business_id, date, agent_name, category, page_name, username, 
            amount, points_load, platform, source, referral_code, 
            redeem_type, payment_method, player_history
        ) VALUES (
            business_uuid, entry_date, agent_name, category, 
            page_names[1 + (i % array_length(page_names, 1))], 
            'player' || (i + 101), amount, points_load, platform,
            CASE 
                WHEN referral_code = 'ADS' THEN 'Ads'
                WHEN referral_code = 'Random' THEN 'Random'
                ELSE 'Referral'
            END,
            referral_code, redeem_type, payment_method, player_history
        );
    END LOOP;
END $$;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Daily summary view
CREATE VIEW daily_summary AS
SELECT 
    e.business_id,
    e.date,
    e.agent_name,
    COUNT(*) as total_entries,
    SUM(CASE WHEN e.category = 'Recharge' THEN e.amount ELSE 0 END) as total_recharge,
    SUM(CASE WHEN e.category = 'Freeplay' THEN e.amount ELSE 0 END) as total_freeplay,
    SUM(e.points_load) as total_points
FROM entries e
GROUP BY e.business_id, e.date, e.agent_name;

-- Monthly summary view
CREATE VIEW monthly_summary AS
SELECT 
    e.business_id,
    DATE_TRUNC('month', e.date) as month,
    COUNT(*) as total_entries,
    SUM(CASE WHEN e.category = 'Recharge' THEN e.amount ELSE 0 END) as total_recharge,
    SUM(CASE WHEN e.category = 'Freeplay' THEN e.amount ELSE 0 END) as total_freeplay,
    SUM(e.points_load) as total_points
FROM entries e
GROUP BY e.business_id, DATE_TRUNC('month', e.date);

-- Agent performance view
CREATE VIEW agent_performance AS
SELECT 
    e.business_id,
    e.agent_name,
    COUNT(*) as total_entries,
    SUM(CASE WHEN e.category = 'Recharge' THEN e.amount ELSE 0 END) as total_recharge,
    SUM(CASE WHEN e.category = 'Freeplay' THEN e.amount ELSE 0 END) as total_freeplay,
    SUM(e.points_load) as total_points,
    COUNT(DISTINCT e.username) as unique_players
FROM entries e
GROUP BY e.business_id, e.agent_name;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE businesses IS 'Stores business account information';
COMMENT ON TABLE managed_agents IS 'Stores agent accounts with role-based access control';
COMMENT ON TABLE entries IS 'Main transaction data for gaming operations';
COMMENT ON TABLE business_settings IS 'Configurable options for each business';
COMMENT ON TABLE ai_insights IS 'Cached AI-generated insights for performance';

COMMENT ON FUNCTION get_business_stats IS 'Returns business statistics for a given date range';
COMMENT ON FUNCTION get_agent_performance IS 'Returns agent performance metrics for a given date range';
COMMENT ON FUNCTION get_referral_stats IS 'Returns referral code statistics for a given date range';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
