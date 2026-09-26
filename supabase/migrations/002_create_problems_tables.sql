-- ==============================================================================
-- StartupZ: World-wide Problem Statements Migration
-- Database: Supabase Cloud PostgreSQL
-- Purpose: Global challenge aggregation, tags, categories, regions, RLS, and seed data
-- ==============================================================================

-- Enable UUID and Trigram extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Clean existing problem tables if re-running
DROP TABLE IF EXISTS problem_tags CASCADE;
DROP TABLE IF EXISTS problem_regions CASCADE;
DROP TABLE IF EXISTS problem_categories CASCADE;
DROP TABLE IF EXISTS problems CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- -----------------------------------------------------------------------------
-- 1. CATEGORIES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE INDEX idx_categories_name ON categories(name);

-- -----------------------------------------------------------------------------
-- 2. REGIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE INDEX idx_regions_name ON regions(name);

-- -----------------------------------------------------------------------------
-- 3. TAGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE INDEX idx_tags_name ON tags(name);

-- -----------------------------------------------------------------------------
-- 4. PROBLEMS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_url TEXT,
    impact_level INT CHECK (impact_level >= 1 AND impact_level <= 10),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search and filter indexes
CREATE INDEX idx_problems_title ON problems USING gin (title gin_trgm_ops);
CREATE INDEX idx_problems_description ON problems USING gin (description gin_trgm_ops);
CREATE INDEX idx_problems_impact ON problems(impact_level);
CREATE INDEX idx_problems_created_at ON problems(created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. JOIN TABLES (MANY-TO-MANY)
-- -----------------------------------------------------------------------------
CREATE TABLE problem_categories (
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, category_id)
);

CREATE INDEX idx_problem_categories_cat ON problem_categories(category_id);

CREATE TABLE problem_regions (
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, region_id)
);

CREATE INDEX idx_problem_regions_reg ON problem_regions(region_id);

CREATE TABLE problem_tags (
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, tag_id)
);

CREATE INDEX idx_problem_tags_tag ON problem_tags(tag_id);

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_tags ENABLE ROW LEVEL SECURITY;

-- Public read access: Anyone (authenticated or unauthenticated) can view problem statements
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can view regions" ON regions FOR SELECT USING (true);
CREATE POLICY "Public can view tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Public can view problems" ON problems FOR SELECT USING (true);
CREATE POLICY "Public can view problem categories" ON problem_categories FOR SELECT USING (true);
CREATE POLICY "Public can view problem regions" ON problem_regions FOR SELECT USING (true);
CREATE POLICY "Public can view problem tags" ON problem_tags FOR SELECT USING (true);

-- Admin-only write access (INSERT, UPDATE, DELETE)
-- Checks whether auth.jwt() indicates ADMIN role or is_admin flag
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (
        COALESCE(auth.jwt()->>'role', '') = 'ADMIN' OR
        COALESCE((auth.jwt()->'user_metadata'->>'is_admin')::boolean, false) = true
    );

CREATE POLICY "Admins can manage regions" ON regions
    FOR ALL USING (
        COALESCE(auth.jwt()->>'role', '') = 'ADMIN' OR
        COALESCE((auth.jwt()->'user_metadata'->>'is_admin')::boolean, false) = true
    );

CREATE POLICY "Admins can manage tags" ON tags
    FOR ALL USING (
        COALESCE(auth.jwt()->>'role', '') = 'ADMIN' OR
        COALESCE((auth.jwt()->'user_metadata'->>'is_admin')::boolean, false) = true
    );

CREATE POLICY "Admins can insert problems" ON problems
    FOR INSERT WITH CHECK (
        COALESCE(auth.jwt()->>'role', '') = 'ADMIN' OR
        COALESCE((auth.jwt()->'user_metadata'->>'is_admin')::boolean, false) = true
    );

CREATE POLICY "Admins can update problems" ON problems
    FOR UPDATE USING (
        COALESCE(auth.jwt()->>'role', '') = 'ADMIN' OR
        COALESCE((auth.jwt()->'user_metadata'->>'is_admin')::boolean, false) = true
    );

CREATE POLICY "Admins can delete problems" ON problems
    FOR DELETE USING (
        COALESCE(auth.jwt()->>'role', '') = 'ADMIN' OR
        COALESCE((auth.jwt()->'user_metadata'->>'is_admin')::boolean, false) = true
    );

CREATE POLICY "Admins can manage problem categories" ON problem_categories
    FOR ALL USING (
        COALESCE(auth.jwt()->>'role', '') = 'ADMIN' OR
        COALESCE((auth.jwt()->'user_metadata'->>'is_admin')::boolean, false) = true
    );

CREATE POLICY "Admins can manage problem regions" ON problem_regions
    FOR ALL USING (
        COALESCE(auth.jwt()->>'role', '') = 'ADMIN' OR
        COALESCE((auth.jwt()->'user_metadata'->>'is_admin')::boolean, false) = true
    );

CREATE POLICY "Admins can manage problem tags" ON problem_tags
    FOR ALL USING (
        COALESCE(auth.jwt()->>'role', '') = 'ADMIN' OR
        COALESCE((auth.jwt()->'user_metadata'->>'is_admin')::boolean, false) = true
    );
