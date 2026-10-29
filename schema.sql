-- Cloudflare D1 SQL Database Migration Schema
-- Run via Wrangler: npx wrangler d1 execute portfolio-d1 --file=./schema.sql

CREATE TABLE IF NOT EXISTS portfolio_projects (
  id TEXT PRIMARY KEY,
  title TEXT,
  client TEXT,
  company TEXT,
  category TEXT,
  year TEXT,
  description TEXT,
  summary TEXT,
  role TEXT,
  type TEXT,
  tech TEXT,
  deliverables TEXT,
  imageUrl TEXT,
  imageType TEXT,
  liveUrl TEXT,
  accentColor TEXT,
  project_order INTEGER,
  featured INTEGER
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  status TEXT,
  avatar TEXT,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
