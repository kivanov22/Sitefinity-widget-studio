-- Sitefinity Widget Studio — Supabase Schema
-- Run this in the Supabase SQL Editor (https://app.supabase.com → your project → SQL Editor)

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Main widgets table
create table if not exists widgets (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Identity
  name         text not null,                          -- e.g. "HeroWidget"
  source_type  text not null default 'viewmodel'       -- 'viewmodel' | 'cshtml' | 'both'
                check (source_type in ('viewmodel', 'cshtml', 'both')),

  -- Raw source stored for re-conversion
  raw_source   text not null,

  -- Parsed + generated output (JSONB for querying)
  schema       jsonb not null,
  generated    jsonb not null,

  -- Marketplace fields (used in v1.0)
  tags         text[] not null default '{}',
  is_public    boolean not null default false,
  version      integer not null default 1
);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger widgets_updated_at
  before update on widgets
  for each row execute function update_updated_at();

-- Indexes
create index if not exists widgets_name_idx on widgets (name);
create index if not exists widgets_created_at_idx on widgets (created_at desc);
create index if not exists widgets_source_type_idx on widgets (source_type);
create index if not exists widgets_tags_idx on widgets using gin (tags);
create index if not exists widgets_schema_idx on widgets using gin (schema);

-- Full-text search on name
create index if not exists widgets_fts_idx
  on widgets using gin (to_tsvector('english', name));

-- RLS (Row Level Security) — open for now, lock down in v1.0 with auth
alter table widgets enable row level security;

create policy "Public read" on widgets
  for select using (true);

create policy "Public insert" on widgets
  for insert with check (true);

create policy "Public update" on widgets
  for update using (true);

create policy "Public delete" on widgets
  for delete using (true);

-- Sample data to verify setup
insert into widgets (name, source_type, raw_source, schema, generated, tags)
values (
  'SetupTest',
  'viewmodel',
  '// setup test',
  '{"className":"SetupTest","widgetName":"SetupTest","properties":[],"rawSource":"","sourceType":"viewmodel"}'::jsonb,
  '{"typesFile":{"filename":"SetupTest.types.ts","content":"// test"},"metadataFile":{"filename":"SetupTest.metadata.ts","content":"// test"},"componentFile":{"filename":"SetupTest.tsx","content":"// test"}}'::jsonb,
  array['test']
);

-- Verify
select id, name, created_at from widgets where name = 'SetupTest';
