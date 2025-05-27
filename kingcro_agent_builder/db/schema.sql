
create table if not exists public.projects (
  id serial primary key,
  project_name text not null,
  raw_request jsonb,
  created_at timestamptz default now()
);
