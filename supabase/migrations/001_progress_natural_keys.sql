-- Migration 001 — key per-user progress off content natural keys (M4).
--
-- Why: the app derives a problem's identity from bundled content as
-- '<topic slug>::<problem name>' (problemId() in src/lib/content.ts). Progress
-- previously referenced problems.id, a serial the client cannot know without a
-- network round-trip — which would have broken recording progress offline on a
-- fresh install. Referencing the natural key removes that dependency entirely.
--
-- Safe to run once against a project already carrying schema.sql + seed.sql.
-- It DROPS problem_progress and topic_progress. That is intentional and safe
-- only while no real user progress exists yet (M4 is the first milestone that
-- writes to them). If you have real rows, back them up first.
--
-- Run this in the SQL editor, then re-run seed.sql to populate problems.key.

begin;

-- ---------- problems.key ----------
alter table problems add column if not exists key text;

update problems p
   set key = t.slug || '::' || p.name
  from topics t
 where t.id = p.topic_id
   and (p.key is null or p.key <> t.slug || '::' || p.name);

alter table problems alter column key set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'problems_key_unique'
  ) then
    alter table problems add constraint problems_key_unique unique (key);
  end if;
end $$;

-- ---------- rebuild progress tables ----------
drop table if exists problem_progress;
drop table if exists topic_progress;

create table problem_progress (
  user_id uuid references auth.users(id) on delete cascade,
  problem_key text not null references problems(key) on update cascade on delete cascade,
  status text not null default 'unsolved',   -- unsolved | solved | revisit
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_key)
);

create table topic_progress (
  user_id uuid references auth.users(id) on delete cascade,
  topic_slug text not null references topics(slug) on update cascade on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_slug)
);

-- ---------- RLS (dropped with the tables, so re-create) ----------
alter table problem_progress enable row level security;
alter table topic_progress   enable row level security;

drop policy if exists "own problems" on problem_progress;
drop policy if exists "own topics"   on topic_progress;

create policy "own problems" on problem_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own topics"   on topic_progress   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lookups are always "my rows", so index the leading user_id.
create index if not exists problem_progress_user_idx on problem_progress(user_id);
create index if not exists topic_progress_user_idx   on topic_progress(user_id);
create index if not exists day_activity_user_idx     on day_activity(user_id);

commit;
