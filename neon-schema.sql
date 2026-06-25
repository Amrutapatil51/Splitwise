-- =============================================
-- Splitwisely - Neon Postgres Schema
-- Run these in your Neon SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS groups (
  id          VARCHAR(255) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  avatar      VARCHAR(10)  DEFAULT '🏠',
  members     JSONB        NOT NULL DEFAULT '[]',
  upi_ids     JSONB        NOT NULL DEFAULT '{}',
  user_id     VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id           VARCHAR(255) PRIMARY KEY,
  group_id     VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description  TEXT         NOT NULL,
  amount       NUMERIC(10, 2) NOT NULL,
  paid_by      VARCHAR(255) NOT NULL,
  split_type   VARCHAR(20)  NOT NULL DEFAULT 'equal',
  splits       JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMP    DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_groups_user_id   ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);

CREATE TABLE IF NOT EXISTS invitations (
  id          VARCHAR(255) PRIMARY KEY,
  group_id    VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  status      VARCHAR(50)  NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
