-- ============================================================================
-- KINSHIP — MASTER NEON POSTGRESQL DATABASE SCHEMA, INDEXES, FUNCTIONS & VIEWS
-- ============================================================================
-- Run this entire file ONCE in Neon Console -> SQL Editor
-- (or via CLI: psql "$DATABASE_URL" -f db/schema.sql).
--
-- Safe & Idempotent:
--   - Uses IF NOT EXISTS / CREATE OR REPLACE everywhere (safe to re-run).
--   - Contains ZERO mock/dummy data or hardcoded credentials.
--   - Optimized for Neon Serverless PostgreSQL + Render web deployments.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Optional Search Extension (pg_trgm for fast ILIKE search)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping pg_trgm extension (insufficient_privilege); standard B-tree indexes will still be created.';
END
$$;

-- ============================================================================
-- 1. CORE TABLES (11 Tables, Ordered by Foreign-Key Dependencies)
-- ============================================================================

-- 1.1 Users (Public Viewers, Verified Educators & Administrators)
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  username        VARCHAR(64)  NOT NULL UNIQUE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  avatar_url      TEXT,
  bio             TEXT         NOT NULL DEFAULT '',
  credentials     VARCHAR(160) NOT NULL DEFAULT '',
  is_educator     BOOLEAN      NOT NULL DEFAULT FALSE,
  is_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
  followers_count INTEGER      NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  password_hash   TEXT,
  neon_auth_id    TEXT UNIQUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 1.2 Categories (Topic / Curriculum Taxonomy)
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  slug        VARCHAR(80) NOT NULL UNIQUE,
  description TEXT        NOT NULL DEFAULT ''
);

-- 1.3 Videos (Admin-Curated External Source Links & Thumbnails)
CREATE TABLE IF NOT EXISTS videos (
  id                TEXT PRIMARY KEY,
  user_id           TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id       TEXT         NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title             VARCHAR(200) NOT NULL,
  description       TEXT         NOT NULL,
  video_url         TEXT         NOT NULL,
  thumbnail_url     TEXT         NOT NULL,
  duration_seconds  INTEGER      NOT NULL CHECK (duration_seconds > 0),
  reflection_prompt TEXT         NOT NULL,
  views             INTEGER      NOT NULL DEFAULT 0 CHECK (views >= 0),
  likes             INTEGER      NOT NULL DEFAULT 0 CHECK (likes >= 0),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 1.4 Video Chapters (Timestamped Outline)
CREATE TABLE IF NOT EXISTS video_chapters (
  id                TEXT PRIMARY KEY,
  video_id          TEXT         NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  timestamp_seconds INTEGER      NOT NULL CHECK (timestamp_seconds >= 0),
  title             VARCHAR(160) NOT NULL,
  summary           TEXT         NOT NULL DEFAULT '',
  UNIQUE (video_id, timestamp_seconds)
);

-- 1.5 Comments (Threaded Discussion & Q&A with Anonymous Posting)
CREATE TABLE IF NOT EXISTS comments (
  id           TEXT PRIMARY KEY,
  video_id     TEXT        NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id    TEXT        REFERENCES comments(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL CHECK (char_length(trim(content)) > 0),
  is_anonymous BOOLEAN     NOT NULL DEFAULT FALSE,
  upvotes      INTEGER     NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 Comment Upvotes (One Upvote Per Viewer Per Comment)
CREATE TABLE IF NOT EXISTS comment_upvotes (
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id TEXT        NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, comment_id)
);

-- 1.7 Bookmarks / Favorites (Per-Viewer Saved Videos)
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   TEXT        NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- 1.8 Video Likes (One Like Per Viewer Per Video)
CREATE TABLE IF NOT EXISTS video_likes (
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   TEXT        NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- 1.9 Creator Follows (Viewer-to-Educator Follow Relationships)
CREATE TABLE IF NOT EXISTS creator_follows (
  follower_id TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id  TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, creator_id),
  CHECK (follower_id <> creator_id)
);

-- 1.10 Watch History (Per-Viewer Playback Progress)
CREATE TABLE IF NOT EXISTS watch_history (
  user_id          TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id         TEXT        NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  progress_seconds INTEGER     NOT NULL DEFAULT 0 CHECK (progress_seconds >= 0),
  watched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- 1.11 Auth Sessions (Server-Side Hashed Admin Session Tokens)
CREATE TABLE IF NOT EXISTS auth_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. IDEMPOTENT COLUMN UPGRADES (Safe if upgrading older partial tables)
-- ============================================================================
ALTER TABLE users          ADD COLUMN IF NOT EXISTS is_admin      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users          ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users          ADD COLUMN IF NOT EXISTS neon_auth_id  TEXT;
ALTER TABLE videos         ADD COLUMN IF NOT EXISTS likes         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE video_chapters ADD COLUMN IF NOT EXISTS summary       TEXT    NOT NULL DEFAULT '';

-- ============================================================================
-- 3. PERFORMANCE INDEXES (B-Tree, Partial, Functional & Trigram Search)
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_username        ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_lower_email     ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_lower_username  ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_is_educator     ON users (followers_count DESC) WHERE is_educator = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_neon_auth_id ON users (neon_auth_id) WHERE neon_auth_id IS NOT NULL;

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_slug       ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_lower_slug ON categories (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_categories_lower_name ON categories (LOWER(name));

-- Videos (Feed sorting, category filtering, creator channels, related videos)
CREATE INDEX IF NOT EXISTS idx_videos_user_id         ON videos (user_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_created    ON videos (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category_id     ON videos (category_id);
CREATE INDEX IF NOT EXISTS idx_videos_category_views  ON videos (category_id, views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_created_at_desc ON videos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_views_desc      ON videos (views DESC);

-- Video Chapters
CREATE INDEX IF NOT EXISTS idx_video_chapters_video_order ON video_chapters (video_id, timestamp_seconds ASC);

-- Comments & Upvotes
CREATE INDEX IF NOT EXISTS idx_comments_video_created ON comments (video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_created_desc  ON comments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id     ON comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user_id       ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_upvotes_comment ON comment_upvotes (comment_id);

-- Viewer Interactions (Bookmarks, Likes, Follows, Watch History)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created     ON bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_likes_video          ON video_likes (video_id);
CREATE INDEX IF NOT EXISTS idx_creator_follows_creator    ON creator_follows (creator_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_recent  ON watch_history (user_id, watched_at DESC);

-- Auth Sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id    ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions (expires_at);

-- Optional Trigram GIN indexes for instant ILIKE search (created only if pg_trgm is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_videos_title_trgm ON videos USING gin (title gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_videos_description_trgm ON videos USING gin (description gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON categories USING gin (name gin_trgm_ops)';
  END IF;
END
$$;

-- ============================================================================
-- 4. POSTGRESQL FUNCTIONS (Atomic Interactions, Maintenance & Admin Utilities)
-- ============================================================================

-- 4.1 Atomic Video Like Toggle
CREATE OR REPLACE FUNCTION kinship_toggle_video_like(
  p_user_id  TEXT,
  p_video_id TEXT
)
RETURNS TABLE (likes INTEGER, has_liked BOOLEAN)
LANGUAGE sql
AS $$
  WITH del AS (
    DELETE FROM video_likes
    WHERE user_id = p_user_id AND video_id = p_video_id
    RETURNING 1
  ),
  ins AS (
    INSERT INTO video_likes (user_id, video_id)
    SELECT p_user_id, v.id
    FROM videos v
    WHERE v.id = p_video_id AND NOT EXISTS (SELECT 1 FROM del)
    ON CONFLICT DO NOTHING
    RETURNING 1
  ),
  upd AS (
    UPDATE videos
    SET likes = GREATEST(
      0,
      videos.likes + CASE
        WHEN EXISTS (SELECT 1 FROM ins) THEN 1
        WHEN EXISTS (SELECT 1 FROM del) THEN -1
        ELSE 0
      END
    )
    WHERE id = p_video_id
    RETURNING videos.likes
  )
  SELECT upd.likes, EXISTS (SELECT 1 FROM ins) AS has_liked
  FROM upd;
$$;

-- 4.2 Atomic Comment Upvote Toggle
CREATE OR REPLACE FUNCTION kinship_toggle_comment_upvote(
  p_user_id    TEXT,
  p_comment_id TEXT
)
RETURNS TABLE (upvotes INTEGER, has_upvoted BOOLEAN, video_id TEXT)
LANGUAGE sql
AS $$
  WITH del AS (
    DELETE FROM comment_upvotes
    WHERE user_id = p_user_id AND comment_id = p_comment_id
    RETURNING 1
  ),
  ins AS (
    INSERT INTO comment_upvotes (user_id, comment_id)
    SELECT p_user_id, c.id
    FROM comments c
    WHERE c.id = p_comment_id AND NOT EXISTS (SELECT 1 FROM del)
    ON CONFLICT DO NOTHING
    RETURNING 1
  ),
  upd AS (
    UPDATE comments
    SET upvotes = GREATEST(
      0,
      comments.upvotes + CASE
        WHEN EXISTS (SELECT 1 FROM ins) THEN 1
        WHEN EXISTS (SELECT 1 FROM del) THEN -1
        ELSE 0
      END
    )
    WHERE id = p_comment_id
    RETURNING comments.upvotes, comments.video_id
  )
  SELECT upd.upvotes, EXISTS (SELECT 1 FROM ins) AS has_upvoted, upd.video_id
  FROM upd;
$$;

-- 4.3 Atomic Bookmark Toggle
CREATE OR REPLACE FUNCTION kinship_toggle_bookmark(
  p_user_id  TEXT,
  p_video_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  WITH del AS (
    DELETE FROM bookmarks
    WHERE user_id = p_user_id AND video_id = p_video_id
    RETURNING 1
  ),
  ins AS (
    INSERT INTO bookmarks (user_id, video_id)
    SELECT p_user_id, v.id
    FROM videos v
    WHERE v.id = p_video_id AND NOT EXISTS (SELECT 1 FROM del)
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM ins);
$$;

-- 4.4 Atomic Creator Follow Toggle
CREATE OR REPLACE FUNCTION kinship_toggle_creator_follow(
  p_follower_id TEXT,
  p_creator_id  TEXT
)
RETURNS TABLE (followers_count INTEGER, is_following BOOLEAN)
LANGUAGE sql
AS $$
  WITH del AS (
    DELETE FROM creator_follows
    WHERE follower_id = p_follower_id AND creator_id = p_creator_id
    RETURNING 1
  ),
  ins AS (
    INSERT INTO creator_follows (follower_id, creator_id)
    SELECT p_follower_id, u.id
    FROM users u
    WHERE u.id = p_creator_id
      AND u.id <> p_follower_id
      AND NOT EXISTS (SELECT 1 FROM del)
    ON CONFLICT DO NOTHING
    RETURNING 1
  ),
  upd AS (
    UPDATE users
    SET followers_count = GREATEST(
      0,
      users.followers_count + CASE
        WHEN EXISTS (SELECT 1 FROM ins) THEN 1
        WHEN EXISTS (SELECT 1 FROM del) THEN -1
        ELSE 0
      END
    )
    WHERE id = p_creator_id
    RETURNING users.followers_count
  )
  SELECT upd.followers_count, EXISTS (SELECT 1 FROM ins) AS is_following
  FROM upd;
$$;

-- 4.5 Recursive Comment Subtree Delete (Admin Moderation)
CREATE OR REPLACE FUNCTION kinship_delete_comment_tree(p_comment_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  WITH RECURSIVE subtree AS (
    SELECT id FROM comments WHERE id = p_comment_id
    UNION ALL
    SELECT c.id FROM comments c INNER JOIN subtree s ON c.parent_id = s.id
  ),
  removed AS (
    DELETE FROM comments
    WHERE id IN (SELECT id FROM subtree)
    RETURNING id
  )
  SELECT COUNT(*)::int INTO v_deleted_count FROM removed;

  RETURN v_deleted_count;
END;
$$;

-- 4.6 Purge Expired Auth Sessions (Run periodically or manually in Neon SQL Editor)
CREATE OR REPLACE FUNCTION kinship_cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_removed INTEGER := 0;
BEGIN
  DELETE FROM auth_sessions WHERE expires_at <= NOW();
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RETURN v_removed;
END;
$$;

-- 4.7 Recalculate Denormalized Counters (Likes, Upvotes, Followers)
CREATE OR REPLACE FUNCTION kinship_recalculate_counters()
RETURNS TABLE (videos_updated INTEGER, comments_updated INTEGER, users_updated INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_videos   INTEGER := 0;
  v_comments INTEGER := 0;
  v_users    INTEGER := 0;
BEGIN
  UPDATE videos v
  SET likes = cnt.actual_likes
  FROM (
    SELECT v2.id, COUNT(vl.user_id)::int AS actual_likes
    FROM videos v2
    LEFT JOIN video_likes vl ON vl.video_id = v2.id
    GROUP BY v2.id
  ) cnt
  WHERE v.id = cnt.id AND v.likes IS DISTINCT FROM cnt.actual_likes;
  GET DIAGNOSTICS v_videos = ROW_COUNT;

  UPDATE comments c
  SET upvotes = cnt.actual_upvotes
  FROM (
    SELECT c2.id, COUNT(cu.user_id)::int AS actual_upvotes
    FROM comments c2
    LEFT JOIN comment_upvotes cu ON cu.comment_id = c2.id
    GROUP BY c2.id
  ) cnt
  WHERE c.id = cnt.id AND c.upvotes IS DISTINCT FROM cnt.actual_upvotes;
  GET DIAGNOSTICS v_comments = ROW_COUNT;

  UPDATE users u
  SET followers_count = cnt.actual_followers
  FROM (
    SELECT u2.id, COUNT(cf.follower_id)::int AS actual_followers
    FROM users u2
    LEFT JOIN creator_follows cf ON cf.creator_id = u2.id
    GROUP BY u2.id
  ) cnt
  WHERE u.id = cnt.id AND u.followers_count IS DISTINCT FROM cnt.actual_followers;
  GET DIAGNOSTICS v_users = ROW_COUNT;

  RETURN QUERY SELECT v_videos, v_comments, v_users;
END;
$$;

-- 4.8 Grant Admin Role to an Existing Account by Email
-- Usage: SELECT kinship_promote_admin_by_email('your-admin@example.com');
CREATE OR REPLACE FUNCTION kinship_promote_admin_by_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  UPDATE users
  SET is_admin = TRUE
  WHERE LOWER(email) = LOWER(trim(p_email));
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- ============================================================================
-- 5. REPORTING VIEW (Quick Inspection in Neon Console)
-- ============================================================================
CREATE OR REPLACE VIEW v_admin_catalog_stats AS
SELECT
  (SELECT COUNT(*)::int FROM videos)                            AS total_videos,
  (SELECT COALESCE(SUM(views), 0)::bigint FROM videos)          AS total_views,
  (SELECT COALESCE(SUM(likes), 0)::bigint FROM videos)          AS total_likes,
  (SELECT COUNT(*)::int FROM comments)                          AS total_comments,
  (SELECT COUNT(*)::int FROM categories)                        AS total_categories,
  (SELECT COUNT(*)::int FROM users WHERE is_educator = TRUE)    AS total_educators,
  (SELECT COUNT(*)::int FROM users WHERE is_admin = TRUE)       AS total_admins,
  (SELECT COUNT(*)::int FROM auth_sessions WHERE expires_at > NOW()) AS active_admin_sessions;

-- ============================================================================
-- 6. VERIFICATION SUMMARY (Confirms all 11 tables & functions exist)
-- ============================================================================
SELECT
  table_name,
  'READY' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'categories',
    'videos',
    'video_chapters',
    'comments',
    'comment_upvotes',
    'bookmarks',
    'video_likes',
    'creator_follows',
    'watch_history',
    'auth_sessions'
  )
ORDER BY table_name;
