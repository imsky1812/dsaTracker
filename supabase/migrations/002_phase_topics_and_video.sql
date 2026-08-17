-- Migration 002 — phase→topic mapping and optional explanation videos.
--
-- Additive only: two nullable/defaulted columns. Nothing is dropped, so this is
-- safe to run against a project holding real user progress.
--
-- Run this in the SQL editor, then re-run seed.sql to populate both columns.

begin;

-- Which topics belong to each roadmap phase. Drives the progress journey on
-- the Learn screen, which needs per-phase completion rather than a flat list.
alter table roadmap_phases add column if not exists topics jsonb not null default '[]';

-- Optional hand-curated explanation video for a problem. NULL is the normal
-- state: the app falls back to a YouTube search built from the problem name,
-- so every problem has a working "Watch" link without anyone inventing ids.
alter table problems add column if not exists video text;

commit;
