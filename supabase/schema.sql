-- DSA Mastery — Supabase schema (M2)
-- Shared authored content (read-only to users) + private per-user progress.
-- Run this in the Supabase SQL editor, then run seed.sql.

-- ---------- shared content ----------
create table if not exists roadmap_phases (
  id serial primary key,
  "order" int not null unique,
  title text not null,
  summary text not null,
  est_weeks text,
  checkpoint text,
  learn jsonb not null default '[]'
);

create table if not exists languages (
  id serial primary key,
  code text unique not null,
  name text not null
);

create table if not exists topics (
  id serial primary key,
  "order" int not null,
  slug text unique not null,
  title text not null,
  explainer_md text,
  patterns_md text,
  complexity_md text
);

create table if not exists code_snippets (
  id serial primary key,
  topic_id int references topics(id) on delete cascade,
  language_id int references languages(id) on delete cascade,
  label text,
  code text not null,
  unique (topic_id, language_id, label)
);

create table if not exists lang_primer (
  id serial primary key,
  language_id int references languages(id) on delete cascade,
  "order" int not null,
  section_title text not null,
  body_md text,
  code text,
  unique (language_id, "order")
);

create table if not exists problems (
  id serial primary key,
  topic_id int references topics(id) on delete cascade,
  -- Stable natural key, '<topic slug>::<problem name>', matching problemId()
  -- in src/lib/content.ts. Per-user progress references THIS, not the serial
  -- id: the client can derive it from bundled content with no network, so a
  -- fresh install can record progress offline and sync it later.
  key text not null unique,
  name text not null,
  url text not null,
  platform text not null,
  difficulty text not null,
  tier text not null,
  -- the same problem is taught under several topics (Two Sum: arrays, stl,
  -- hashing), so identity is (topic, name) — not name alone.
  unique (topic_id, name)
);

create table if not exists companies (
  id serial primary key,
  name text unique not null
);

create table if not exists problem_companies (
  problem_id int references problems(id) on delete cascade,
  company_id int references companies(id) on delete cascade,
  primary key (problem_id, company_id)
);

-- ---------- per-user (RLS) ----------
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  github_handle text,
  language_id int references languages(id),
  reminder_time text,
  created_at timestamptz default now()
);

-- Progress tables key off the content's natural keys (problems.key,
-- topics.slug) rather than serial ids, so the client can write a row using only
-- bundled content — no lookup round-trip, and offline writes queue cleanly.
-- `updated_at` is set by the client and drives last-write-wins reconciliation.
create table if not exists problem_progress (
  user_id uuid references auth.users(id) on delete cascade,
  problem_key text not null references problems(key) on update cascade on delete cascade,
  status text not null default 'unsolved',   -- unsolved | solved | revisit
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_key)
);

create table if not exists topic_progress (
  user_id uuid references auth.users(id) on delete cascade,
  topic_slug text not null references topics(slug) on update cascade on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_slug)
);

create table if not exists day_activity (
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  solved_count int not null default 0,
  primary key (user_id, date)
);

create table if not exists streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  last_active_date date
);

-- ---------- enable RLS + policies ----------
alter table profiles         enable row level security;
alter table problem_progress enable row level security;
alter table topic_progress   enable row level security;
alter table day_activity     enable row level security;
alter table streaks          enable row level security;

-- each user sees and writes only their own rows.
-- (Postgres has no "create policy if not exists", so drop first — this keeps
-- the whole file safe to re-run after an edit.)
drop policy if exists "own profile"  on profiles;
drop policy if exists "own problems" on problem_progress;
drop policy if exists "own topics"   on topic_progress;
drop policy if exists "own activity" on day_activity;
drop policy if exists "own streaks"  on streaks;

create policy "own profile"  on profiles         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own problems" on problem_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own topics"   on topic_progress   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own activity" on day_activity     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own streaks"  on streaks          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- shared content is world-readable
alter table roadmap_phases    enable row level security;
alter table languages         enable row level security;
alter table topics            enable row level security;
alter table code_snippets     enable row level security;
alter table lang_primer       enable row level security;
alter table problems          enable row level security;
alter table companies         enable row level security;
alter table problem_companies enable row level security;

drop policy if exists "read content 1" on roadmap_phases;
drop policy if exists "read content 2" on languages;
drop policy if exists "read content 3" on topics;
drop policy if exists "read content 4" on code_snippets;
drop policy if exists "read content 5" on lang_primer;
drop policy if exists "read content 6" on problems;
drop policy if exists "read content 7" on companies;
drop policy if exists "read content 8" on problem_companies;

create policy "read content 1" on roadmap_phases    for select using (true);
create policy "read content 2" on languages         for select using (true);
create policy "read content 3" on topics            for select using (true);
create policy "read content 4" on code_snippets     for select using (true);
create policy "read content 5" on lang_primer       for select using (true);
create policy "read content 6" on problems          for select using (true);
create policy "read content 7" on companies         for select using (true);
create policy "read content 8" on problem_companies for select using (true);

-- auto-create a profile row on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.streaks (user_id) values (new.id);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
