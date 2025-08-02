
-- Enhanced schema for voice transcription and book generation
create table if not exists public.projects (
  id serial primary key,
  project_name text not null,
  raw_request jsonb,
  created_at timestamptz default now()
);

-- Table for storing voice transcripts
create table if not exists public.transcripts (
  id serial primary key,
  project_id integer references projects(id) on delete cascade,
  audio_file_path text,
  transcript_text text not null,
  confidence_score float,
  speaker_id text,
  timestamp_start float,
  timestamp_end float,
  processed_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- Table for storing book chapters/sections
create table if not exists public.book_sections (
  id serial primary key,
  project_id integer references projects(id) on delete cascade,
  section_title text not null,
  section_order integer not null,
  original_content text not null,
  processed_content text,
  copywriting_notes jsonb default '{}'::jsonb,
  editing_status text default 'draft' check (editing_status in ('draft', 'reviewed', 'final')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table for copywriting suggestions and edits
create table if not exists public.copywriting_edits (
  id serial primary key,
  section_id integer references book_sections(id) on delete cascade,
  edit_type text not null check (edit_type in ('grammar', 'style', 'structure', 'clarity', 'tone')),
  original_text text not null,
  suggested_text text not null,
  reasoning text,
  confidence_score float,
  applied boolean default false,
  created_at timestamptz default now()
);

-- Indexes for better performance
create index if not exists idx_transcripts_project_id on transcripts(project_id);
create index if not exists idx_transcripts_timestamp on transcripts(timestamp_start, timestamp_end);
create index if not exists idx_book_sections_project_id on book_sections(project_id);
create index if not exists idx_book_sections_order on book_sections(project_id, section_order);
create index if not exists idx_copywriting_edits_section_id on copywriting_edits(section_id);
