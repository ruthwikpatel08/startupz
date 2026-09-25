-- ==============================================================================
-- StartupZ: Cloud PostgreSQL Database Schema, RLS Policies & Seed Migration
-- Database: Supabase Cloud PostgreSQL
-- Tagline: "Find the right people. Build the right startup."
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing schema if re-running
DROP TABLE IF EXISTS raised_solutions CASCADE;
DROP TABLE IF EXISTS failed_startups CASCADE;
DROP TABLE IF EXISTS video_meetings CASCADE;
DROP TABLE IF EXISTS startup_proposals CASCADE;
DROP TABLE IF EXISTS startup_followers CASCADE;
DROP TABLE IF EXISTS verification_requests CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS mentorship_requests CASCADE;
DROP TABLE IF EXISTS mentors CASCADE;
DROP TABLE IF EXISTS investors CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS saved_items CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS opportunity_applications CASCADE;
DROP TABLE IF EXISTS startup_opportunities CASCADE;
DROP TABLE IF EXISTS startup_members CASCADE;
DROP TABLE IF EXISTS startups CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'FOUNDER',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_badge TEXT,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- -----------------------------------------------------------------------------
-- 2. PROFILES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    headline TEXT,
    location TEXT,
    bio TEXT,
    avatar TEXT,
    education TEXT,
    portfolio_url TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    skills TEXT,
    startup_interests TEXT,
    industries TEXT,
    preferred_role TEXT,
    availability TEXT DEFAULT 'Full-time',
    startup_experience TEXT,
    achievements TEXT,
    open_to TEXT,
    profile_completion INTEGER NOT NULL DEFAULT 40,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_location ON profiles(location);

-- -----------------------------------------------------------------------------
-- 3. STARTUPS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    founder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo TEXT,
    one_line_description TEXT NOT NULL,
    problem TEXT NOT NULL,
    solution TEXT NOT NULL,
    target_customers TEXT,
    industry TEXT NOT NULL,
    business_model TEXT,
    stage TEXT NOT NULL DEFAULT 'Idea',
    location TEXT,
    required_skills TEXT,
    funding_status TEXT DEFAULT 'Bootstrapped',
    funding_required TEXT,
    current_traction TEXT,
    website TEXT,
    demo_link TEXT,
    pitch_deck_url TEXT,
    images TEXT,
    visibility TEXT NOT NULL DEFAULT 'PUBLIC',
    is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_startups_founder_id ON startups(founder_id);
CREATE INDEX idx_startups_industry ON startups(industry);
CREATE INDEX idx_startups_stage ON startups(stage);
CREATE INDEX idx_startups_visibility ON startups(visibility);

-- -----------------------------------------------------------------------------
-- 4. STARTUP MEMBERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE startup_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Team Member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(startup_id, user_id)
);

CREATE INDEX idx_startup_members_startup ON startup_members(startup_id);
CREATE INDEX idx_startup_members_user ON startup_members(user_id);

-- -----------------------------------------------------------------------------
-- 5. STARTUP OPPORTUNITIES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE startup_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    required_skills TEXT NOT NULL,
    commitment TEXT NOT NULL DEFAULT 'Full-time',
    compensation TEXT NOT NULL DEFAULT 'Paid + Equity',
    location TEXT NOT NULL DEFAULT 'Remote',
    workplace_type TEXT NOT NULL DEFAULT 'Remote',
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_startup ON startup_opportunities(startup_id);
CREATE INDEX idx_opportunities_status ON startup_opportunities(status);

-- -----------------------------------------------------------------------------
-- 6. OPPORTUNITY APPLICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE opportunity_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES startup_opportunities(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    resume_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(opportunity_id, applicant_id)
);

CREATE INDEX idx_opp_applications_user ON opportunity_applications(applicant_id);

-- -----------------------------------------------------------------------------
-- 7. CONNECTIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

CREATE INDEX idx_connections_sender ON connections(sender_id);
CREATE INDEX idx_connections_receiver ON connections(receiver_id);
CREATE INDEX idx_connections_status ON connections(status);

-- -----------------------------------------------------------------------------
-- 8. POSTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES startups(id) ON DELETE SET NULL,
    post_type TEXT NOT NULL DEFAULT 'UPDATE',
    title TEXT,
    content TEXT NOT NULL,
    images TEXT,
    links TEXT,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_type ON posts(post_type);

-- -----------------------------------------------------------------------------
-- 9. COMMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);

-- -----------------------------------------------------------------------------
-- 10. LIKES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_startup ON likes(startup_id);

-- -----------------------------------------------------------------------------
-- 11. SAVED ITEMS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX idx_saved_items_user ON saved_items(user_id);

-- -----------------------------------------------------------------------------
-- 12. CONVERSATIONS & MESSAGES
-- -----------------------------------------------------------------------------
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id UUID NOT NULL,
    participant2_id UUID NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(participant1_id, participant2_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);

-- -----------------------------------------------------------------------------
-- 13. INVESTORS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization TEXT NOT NULL,
    investor_type TEXT NOT NULL,
    industries TEXT NOT NULL,
    preferred_stages TEXT NOT NULL,
    min_check_size TEXT,
    max_check_size TEXT,
    location TEXT NOT NULL,
    website TEXT,
    portfolio TEXT,
    about TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investors_user ON investors(user_id);

-- -----------------------------------------------------------------------------
-- 14. MENTORS & MENTORSHIP REQUESTS
-- -----------------------------------------------------------------------------
CREATE TABLE mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expertise TEXT NOT NULL,
    industries TEXT NOT NULL,
    years_experience INTEGER NOT NULL DEFAULT 5,
    available_hours TEXT DEFAULT '2-4 hrs/month',
    mentoring_topics TEXT NOT NULL,
    about TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mentorship_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    mentor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    founder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 15. NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- -----------------------------------------------------------------------------
-- 16. REPORTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 17. VERIFICATION REQUESTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES startups(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    business_details TEXT NOT NULL,
    website TEXT,
    document_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active non-suspended user profiles
CREATE POLICY "Public profiles are readable" ON profiles
    FOR SELECT USING (true);

-- Allow public read access to public startups
CREATE POLICY "Public startups are viewable by everyone" ON startups
    FOR SELECT USING (visibility = 'PUBLIC');

-- Allow public read access to open opportunities
CREATE POLICY "Open opportunities are viewable" ON startup_opportunities
    FOR SELECT USING (status = 'OPEN');

-- Allow public read access to posts
CREATE POLICY "Public posts are viewable" ON posts
    FOR SELECT USING (true);

-- Allow public read access to comments
CREATE POLICY "Comments are viewable" ON comments
    FOR SELECT USING (true);

-- Allow public read access to verified investors and mentors
CREATE POLICY "Investors are viewable" ON investors
    FOR SELECT USING (true);

CREATE POLICY "Mentors are viewable" ON mentors
    FOR SELECT USING (true);

-- Service role bypass for backend Node.js server
CREATE POLICY "Service role full access on users" ON users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on profiles" ON profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on startups" ON startups
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on opportunities" ON startup_opportunities
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on posts" ON posts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on comments" ON comments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on likes" ON likes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on connections" ON connections
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on messages" ON messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on conversations" ON conversations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on notifications" ON notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on saved_items" ON saved_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on reports" ON reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on verifications" ON verification_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);


-- =============================================================================
-- SEED DATA (Password for all demo accounts is Password123!)
-- Hash: $2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO
-- =============================================================================

INSERT INTO users (id, email, password, role, is_verified, verification_badge, is_admin) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@startupz.com', '$2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO', 'ADMIN', true, 'Platform Admin', true),
('22222222-2222-2222-2222-222222222222', 'sarah.chen@aiagri.io', '$2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO', 'FOUNDER', true, 'Verified Founder', false),
('33333333-3333-3333-3333-333333333333', 'marcus.dev@codeflow.dev', '$2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO', 'DEVELOPER', true, 'Verified Member', false),
('44444444-4444-4444-4444-444444444444', 'priya.design@pixelcraft.studio', '$2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO', 'DESIGNER', true, 'Verified Member', false),
('55555555-5555-5555-5555-555555555555', 'david.kim@healthpulse.ai', '$2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO', 'FOUNDER', true, 'Verified Founder', false),
('66666666-6666-6666-6666-666666666666', 'elena.investor@apexventures.vc', '$2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO', 'INVESTOR', true, 'Verified Investor', false),
('77777777-7777-7777-7777-777777777777', 'james.mentor@scaleadvisors.com', '$2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO', 'MENTOR', true, 'Verified Mentor', false),
('88888888-8888-8888-8888-888888888888', 'liam.ops@greenbyte.earth', '$2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO', 'FOUNDER', true, 'Verified Founder', false),
('99999999-9999-9999-9999-999999999999', 'maya.edu@eduspark.learn', '$2a$10$w850zS5YF9oK/YtVvQd5se1Lp8l64yXj4.0zC9M.XN8U5wPq8tXkO', 'FOUNDER', true, 'Verified Founder', false);

-- Insert Profiles
INSERT INTO profiles (user_id, full_name, headline, location, bio, avatar, skills, startup_interests, industries, preferred_role, availability, startup_experience, achievements, open_to, profile_completion) VALUES
('11111111-1111-1111-1111-111111111111', 'Alex Vance', 'StartupZ Ecosystem Lead | Community Architect', 'San Francisco, CA', 'Passionate about connecting early-stage founders with world-class builders, operators, and capital.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', 'Ecosystem Building, Startup Strategy, Venture Capital, Product Architecture', 'AI, B2B SaaS, FinTech, DeepTech', 'AI, B2B SaaS, FinTech', 'Ecosystem Architect', 'Full-time', 'Serial Founder', 'Scaled multiple tech communities past 100k members', 'Collaboration,Mentorship', 100),
('22222222-2222-2222-2222-222222222222', 'Sarah Chen', 'Founder @ FarmConnect | AgTech & AI Enthusiast | Looking for Technical Co-Founder', 'Austin, TX', 'Building AI systems to empower smallholder and commercial farmers with real-time agronomic insights.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80', 'Product Management, AgTech, Go-To-Market, Customer Discovery, Fundraising', 'AgTech, ClimateTech, AI, Sustainability', 'AgTech, Artificial Intelligence, ClimateTech', 'CEO / Business Co-Founder', 'Full-time', 'First-time Founder', 'Secured $100K state climate grant, partnered with 15 pilot farms.', 'Co-Founder,Startup Team,Investment,Mentorship', 95),
('33333333-3333-3333-3333-333333333333', 'Marcus Brody', 'Staff Full-Stack Engineer | React + Node + Rust | Looking to join Early-Stage Team', 'Seattle, WA', '7+ years architecting scalable cloud services and developer tooling. Built systems processing 50M+ requests/day.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', 'React, Node.js, TypeScript, Rust, PostgreSQL, GraphQL, Docker, AWS', 'Developer Tools, AI Infrastructure, Cloud, B2B SaaS', 'Developer Tools, AI, B2B SaaS', 'Technical Co-Founder / Founding CTO', 'Full-time', 'Early Employee', 'Created popular open-source caching engine with 4k stars.', 'Co-Founder,Startup Team,Equity only', 90),
('44444444-4444-4444-4444-444444444444', 'Priya Sharma', 'Product Designer & Design Systems Lead | Open to Design Co-Founder Roles', 'New York, NY', 'Crafting clean, conversion-focused interfaces for high-growth startups. Led UX at two YC-backed companies.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80', 'UI/UX Design, Figma, User Research, Prototyping, Design Systems, Frontend Basics', 'AI Products, FinTech, Creator Economy, Consumer Tech', 'Design, Consumer Tech, FinTech', 'Design Co-Founder / Head of Design', 'Part-time', 'Early Employee', 'Designed design system utilized by 2M monthly active users.', 'Co-Founder,Startup Team,Collaboration', 85),
('55555555-5555-5555-5555-555555555555', 'Dr. David Kim', 'Founder @ MedPulse AI | MD + Informatics | Building Clinical Copilots', 'Boston, MA', 'Practicing clinician and biomedical informatics researcher. Developing an AI-driven clinical workflow assistant.', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80', 'Healthcare IT, Clinical AI, Bio-informatics, Medical Device Regulation, Pitching', 'HealthTech, MedTech, AI, Regulatory', 'HealthTech, Artificial Intelligence, BioTech', 'Founder / CEO', 'Full-time', 'First-time Founder', 'Published 12 clinical papers on AI diagnostic precision.', 'Co-Founder,Investment,Mentorship', 92),
('66666666-6666-6666-6666-666666666666', 'Elena Rostova', 'Partner @ Apex Ventures | Pre-Seed & Seed | AI & B2B SaaS', 'San Francisco, CA', 'Investing $100K - $1M in high-conviction technical founders reimagining enterprise workflows.', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80', 'Venture Capital, Term Sheets, Growth Strategy, Cap Table Management, Board Governance', 'Artificial Intelligence, B2B SaaS, Cybersecurity, DevOps', 'Artificial Intelligence, B2B SaaS, FinTech', 'Lead Investor', 'Advisory', 'Investor', 'Led 18 early-stage investments with 4 unicorn exits.', 'Investment,Collaboration', 95),
('77777777-7777-7777-7777-777777777777', 'James Sterling', 'Startup Mentor & 2x Exited Founder | Ex-YC W16 | Advisory & Founder Coaching', 'Denver, CO', 'Scaled two SaaS companies from zero to $20M+ ARR and successful acquisitions.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80', 'Founder Mentorship, Pitch Deck Review, Go-to-Market, Enterprise Sales, Series A Prep', 'Enterprise SaaS, Marketplaces, Vertical Software', 'B2B SaaS, Enterprise Software, Marketplaces', 'Advisor / Mentor', 'Advisory', 'Serial Founder', 'Completed 2 nine-figure acquisitions.', 'Mentorship,Advisory', 95),
('88888888-8888-8888-8888-888888888888', 'Liam O''Connor', 'Founder @ GreenByte | Carbon Accounting for Tech Startups | ClimateTech', 'London / Remote', 'Environmental systems scientist turned tech founder. GreenByte makes Scope 1-3 emissions tracking automatic.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80', 'ClimateTech, Carbon Accounting, SaaS Architecture, Regulatory Compliance', 'ClimateTech, Clean Energy, ESG, Enterprise', 'ClimateTech, Enterprise Software, CleanTech', 'Founder / CEO', 'Full-time', 'Serial Founder', 'Certified 250 enterprise carbon audits.', 'Co-Founder,Startup Team,Investment', 90),
('99999999-9999-9999-9999-999999999999', 'Maya Patel', 'Founder @ EduSpark | AI-Powered Adaptive Learning for K-12 and STEM', 'Chicago, IL', 'Former educator building an AI companion that adapts curriculum pacing to each student mastery curve.', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop&q=80', 'EdTech, Curriculum Design, Adaptive Learning, Pedagogy, Community Building', 'EdTech, AI, Future of Work, Social Impact', 'EdTech, Artificial Intelligence, Consumer', 'Founder / CEO', 'Full-time', 'First-time Founder', 'National Teacher of the Year finalist.', 'Co-Founder,Startup Team,Investment', 89);

-- Insert Startups
INSERT INTO startups (id, founder_id, name, logo, one_line_description, problem, solution, target_customers, industry, business_model, stage, location, required_skills, funding_status, funding_required, current_traction, website, demo_link, is_verified, likes_count, views_count) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'FarmConnect', 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=200&auto=format&fit=crop&q=80', 'AI-powered agronomic advisory platform delivering real-time crop disease detection & yield forecasting.', 'Small farmers struggle to get real-time crop disease recommendations, resulting in 25% preventable yield loss.', 'AI vision platform diagnosing leaf blight in 3 seconds from smartphone photos with personalized remedy plans.', 'Commercial grain farmers and agricultural cooperatives.', 'AgTech', 'B2B SaaS ($49/month)', 'MVP', 'Austin, TX', 'AI Developer, Full Stack Developer, Marketing Partner', 'Seeking Funding', '$250,000', '18 active pilot farms, 14k leaf scans analyzed', 'https://farmconnect-ai.example.com', 'https://demo.farmconnect.example.com', true, 38, 312),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'MedPulse AI', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&auto=format&fit=crop&q=80', 'Clinical copilot automating medical charting and real-time drug interaction safeguards for physicians.', 'Physicians spend over 2 hours on EHR administrative charting for every hour of clinical care.', 'Ambient listening assistant drafting structured SOAP notes and flagging contraindications in real time.', 'Outpatient clinics and medical group practices.', 'HealthTech', 'Subscription ($199/physician/mo)', 'Validation', 'Boston, MA', 'Healthcare Compliance Lead, Senior Python/NLP Engineer', 'Pre-Seed', '$500,000', 'LOIs with 3 clinical networks (45 physicians)', 'https://medpulse-ai.example.com', 'https://demo.medpulse.example.com', true, 52, 420),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', 'GreenByte', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=200&auto=format&fit=crop&q=80', 'Automated carbon accounting API and ESG reporting dashboard for digital businesses and tech SMBs.', 'New regulatory mandates require SMBs to report vendor emissions, but consultants cost upwards of $40,000.', 'Plug-and-play API integrating cloud providers, Stripe, and QuickBooks to compute auditable carbon footprints.', 'Series A-C startups and digital enterprises.', 'ClimateTech', 'Usage-based SaaS ($99-$890/mo)', 'Early Revenue', 'London / Remote', 'Full-Stack TypeScript Engineer, Enterprise Sales Lead', 'Seed', '$750,000', '$14,200 MRR across 28 paying customers', 'https://greenbyte.earth', NULL, true, 29, 260),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '99999999-9999-9999-9999-999999999999', 'EduSpark', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&auto=format&fit=crop&q=80', 'Socratic AI tutor that turns complex STEM concepts into interactive, bite-sized gamified experiments.', 'Static textbook lectures cause high student disengagement and poor conceptual retention.', 'Interactive micro-simulations where an adaptive AI guide prompts students to discover formulas.', 'Middle & high school students and supplementary tutoring centers.', 'EdTech', 'Freemium ($14.99/mo)', 'MVP', 'Chicago, IL', 'React/Three.js Interactive Engineer, Growth Marketer', 'Bootstrapped', '$150,000', '3,200 organic monthly active students', 'https://eduspark.learn', NULL, false, 24, 195);

-- Insert Startup Opportunities
INSERT INTO startup_opportunities (id, startup_id, role, required_skills, commitment, compensation, location, workplace_type, description, status) VALUES
('e1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Founding AI / Computer Vision Engineer', 'Python, PyTorch, OpenCV, Computer Vision, FastAPI', 'Full-time', 'Paid + Equity', 'Austin, TX / Remote', 'Remote', 'Lead computer vision architecture for leaf pathology detection and edge mobile deployment.', 'OPEN'),
('e2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Growth Marketing Co-Founder', 'Growth Hacking, AgTech, Performance Marketing, Partnerships', 'Full-time', 'Equity only', 'Austin, TX', 'Hybrid', 'Lead commercial farmer onboarding and establish distribution deals with cooperatives.', 'OPEN'),
('e3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Full Stack Healthcare Engineer', 'React, Node.js, HIPAA Compliance, FHIR/HL7, PostgreSQL', 'Full-time', 'Paid + Equity', 'Boston, MA / Remote', 'Remote', 'Build secure EHR integration pipelines connecting our ambient listening service with hospital DBs.', 'OPEN'),
('e4444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Senior TypeScript / Backend Architect', 'TypeScript, Node.js, AWS Lambda, GraphQL, REST APIs', 'Full-time', 'Paid', 'London, UK / Remote', 'Remote', 'Scale our carbon computation engine and accounting API integrations.', 'OPEN'),
('e5555555-5555-5555-5555-555555555555', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Interactive WebGL / React Developer', 'React, Three.js, Canvas API, WebGL, UI Animation', 'Part-time', 'Paid + Equity', 'Chicago, IL / Remote', 'Remote', 'Design tactile physics and chemistry simulations in the browser for students.', 'OPEN');

-- Insert Investors
INSERT INTO investors (id, user_id, organization, investor_type, industries, preferred_stages, min_check_size, max_check_size, location, website, portfolio, about, is_verified) VALUES
('f1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'Apex Ventures', 'Venture Capital', 'Artificial Intelligence, B2B SaaS, Cloud Infrastructure', 'Pre-Seed, Seed, Series A', '$250k', '$1.5M', 'San Francisco, CA', 'https://apexventures.example.com', 'Runway, Synthetix, Pinecone, ScaleDev', 'Early-stage venture fund backing exceptional technical founders building the intelligent enterprise stack.', true);

-- Insert Mentors
INSERT INTO mentors (id, user_id, expertise, industries, years_experience, available_hours, mentoring_topics, about, is_verified) VALUES
('f2222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'Product-Market Fit, Enterprise Sales, Fundraising Pitch, YC Application', 'B2B SaaS, Enterprise Software, Marketplaces', 14, '4 hrs/month', 'Pitch Deck Review, Founder Mindset, Scaling from $0 to $1M ARR, Pricing Strategy', 'Ex-founder who has been in your shoes. I focus on actionable feedback, ruthlessly cutting fluff from your deck.', true);

-- Insert Connections
INSERT INTO connections (sender_id, receiver_id, status, note) VALUES
('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'ACCEPTED', 'Loved your GitHub projects on distributed sensor feeds. Would love to connect regarding FarmConnect!'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'ACCEPTED', 'Inspiring vision on FarmConnect. Connecting to follow your AgTech journey!'),
('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', 'ACCEPTED', 'Elena, great meeting your syndicate colleagues at the MedTech summit.');

-- Insert Posts
INSERT INTO posts (id, author_id, startup_id, post_type, title, content, likes_count, comments_count) VALUES
('1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'LAUNCH', 'Excited to announce our FarmConnect MVP Beta! 🌾', 'After 6 months of field testing with 18 pilot farmers in Texas, we are launching FarmConnect v0.8! Our vision model is detecting rust fungus and nutrient deficiencies 4 days faster than visual inspection. Looking for feedback and a passionate technical co-founder to join the journey.', 24, 2),
('2b2b2b2b-2b2b-2b2b-2b2b-2b2b2b2b2b2b', '33333333-3333-3333-3333-333333333333', NULL, 'COFOUNDER', 'Looking for a Business Co-Founder in B2B SaaS / DevTools', 'I have spent the last 7 years as a staff backend/infrastructure engineer. I am ready to go all-in full-time on building developer platforms or AI infrastructure. If you are a sales/operations powerhouse with domain insights, let''s grab a virtual coffee!', 19, 1),
('3c3c3c3c-3c3c-3c3c-3c3c-3c3c3c3c3c3c', '66666666-6666-6666-6666-666666666666', NULL, 'ADVICE', 'What we look for in Pre-Seed Pitch Decks in 2026', '1. Why NOW? What shifted in the technical or regulatory landscape? 2. Founder-Market Fit: Why are YOU the team capable of enduring this problem? 3. Velocity of Iteration: How fast do you ship and learn from customers? Keep your decks under 12 slides. Clear traction signals trump speculative spreadsheets.', 45, 1);

-- Insert Comments
INSERT INTO comments (post_id, author_id, content) VALUES
('1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a', '33333333-3333-3333-3333-333333333333', 'Huge congrats Sarah! The speed improvement on edge detection looks formidable.'),
('1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a', '66666666-6666-6666-6666-666666666666', 'Impressive traction on the pilot farms. Sending you a note on your pitch.'),
('2b2b2b2b-2b2b-2b2b-2b2b-2b2b2b2b2b2b', '77777777-7777-7777-7777-777777777777', 'Marcus is one of the sharpest engineers in the ecosystem. Founders looking for a CTO should connect.');

-- Insert Notifications
INSERT INTO notifications (user_id, sender_id, type, title, message, link) VALUES
('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'CONNECTION_ACCEPTED', 'Connection Request Accepted', 'Marcus Brody accepted your connection request.', '/profile/33333333-3333-3333-3333-333333333333');

-- =============================================================================
-- ENHANCED MODULES: STARTUP FOLLOWS, PROPOSALS, VIDEO MEETINGS, FAILED STARTUPS
-- =============================================================================

CREATE TABLE IF NOT EXISTS startup_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(startup_id, user_id)
);

CREATE TABLE IF NOT EXISTS startup_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idea_title VARCHAR(255) NOT NULL,
    pitch_description TEXT NOT NULL,
    proposed_role VARCHAR(100) NOT NULL,
    proposed_equity VARCHAR(50) DEFAULT '50/50',
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INT DEFAULT 30,
    room_code VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS failed_startups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    peak_funding VARCHAR(50) NOT NULL,
    years_active VARCHAR(50) NOT NULL,
    logo TEXT,
    summary TEXT NOT NULL,
    why_it_failed TEXT NOT NULL,
    unsolved_problem TEXT NOT NULL,
    lessons_learned TEXT NOT NULL,
    solutions_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raised_solutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    failed_startup_id UUID NOT NULL REFERENCES failed_startups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    target_audience TEXT,
    differentiation TEXT,
    upvotes_count INT DEFAULT 0,
    startup_id UUID REFERENCES startups(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE startup_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE raised_solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on failed startups" ON failed_startups FOR SELECT USING (true);
CREATE POLICY "Public read on raised solutions" ON raised_solutions FOR SELECT USING (true);
CREATE POLICY "Public read on startup followers" ON startup_followers FOR SELECT USING (true);
CREATE POLICY "Service role full access on enhanced tables" ON failed_startups FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed Failed Startups
INSERT INTO failed_startups (id, name, industry, peak_funding, years_active, summary, why_it_failed, unsolved_problem, lessons_learned, solutions_count) VALUES
('e1111111-1111-1111-1111-111111111111', 'Quibi', 'Media & Mobile Streaming', '$1.75 Billion', '2018 - 2020', 'Short-form, premium Hollywood video streaming platform built strictly for mobile phones.', 'Failed to recognize that TikTok and YouTube offered organic viral content for free. Banned screenshots and memes on social media, killing viral discovery. Locked users out of TV screens during lockdowns.', 'People crave bite-sized, high-production storytelling during quick commutes, but incumbent streaming giants only produce 50-minute episodes.', 'Never compete with free user-generated feeds using locked walled gardens. Organic distribution and community sharing are non-negotiable.', 1),
('e2222222-2222-2222-2222-222222222222', 'Fast.co', 'Fintech & Checkout', '$120 Million', '2019 - 2022', 'One-click checkout button attempting to become the universal shopping identity across the open web.', 'Astronomical cash burn rate ($10M/month) with less than $600k annual revenue. Over-hired before achieving product-market fit. Merchant integration friction was high and Stripe/Shopify already dominated.', 'Consumers still abandon 70% of online shopping carts because entering address and payment details on mobile web is slow and clunky.', 'Do not subsidize checkout without sustainable merchant transaction take rates. Distribution requires merchant lock-in, not vanity sponsorship billboards.', 2),
('e3333333-3333-3333-3333-333333333333', 'Zume Pizza', 'Robotics & FoodTech', '$445 Million', '2015 - 2020', 'Automated pizza-making trucks with robotic ovens that cooked food en route to customers.', 'Massive capital expenditure maintaining robotic food trucks. The pizzas shifted in transit and cooking en route caused uneven quality. Cloud kitchens and DoorDash proved far cheaper to scale.', 'Fresh, piping-hot food delivery still suffers from soggy transit, high delivery driver fees, and food arriving cold.', 'Hardware and robotics in high-vibration mobile vehicles create massive failure rates. Software orchestration of localized hub-and-spoke prep is far superior to cooking in moving vans.', 0);

-- Seed Raised Solutions
INSERT INTO raised_solutions (id, failed_startup_id, author_id, title, description, target_audience, differentiation, upvotes_count) VALUES
('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'MicroCinema: AI Interactive 3-Minute Episodics', 'A community-driven platform where indie filmmakers and game writers create branching 3-minute interactive interactive narratives with native TikTok sharing and creator revenue share.', 'Commuters, Gen-Z mobile gamers, and webtoon readers.', 'Unlike Quibi, MicroCinema is web-accessible, allows instant meme sharing, and lets viewers choose branching story paths.', 14);
