-- Offline CRM prototype schema
-- Apply this file to Supabase only after reviewing it.
-- The embedding contract for this prototype is 768 dimensions.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.people (
  id bigint generated always as identity primary key,
  source_record_id text not null unique,

  name text not null check (btrim(name) <> ''),
  email text,
  email_normalized text,
  company text,
  role_title text,
  bio_notes text,
  source text not null default 'unknown' check (btrim(source) <> ''),
  source_payload jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,

  -- Structured fields produced by deterministic cleaning and/or Gemini.
  clean_summary text,
  skills text[] not null default '{}'::text[],
  needs text[] not null default '{}'::text[],
  interests text[] not null default '{}'::text[],
  company_stage text,
  location text,
  role_type text,
  sector_tags text[] not null default '{}'::text[],
  seniority text,
  community_fit_tags text[] not null default '{}'::text[],

  -- AI provenance is kept separate from source evidence.
  ai_classification jsonb not null default '{}'::jsonb,
  ai_enrichment_status text not null default 'pending'
    check (ai_enrichment_status in ('pending', 'completed', 'skipped', 'failed')),
  ai_model text,
  ai_generated_at timestamptz,

  -- Quality and applicant-fit outputs.
  fit_score numeric(5,2) check (fit_score between 0 and 100),
  fit_score_reasoning text,
  is_duplicate_of bigint references public.people(id) on delete set null,
  duplicate_confidence numeric(5,4)
    check (duplicate_confidence between 0 and 1),
  is_incomplete boolean not null default false,
  missing_fields text[] not null default '{}'::text[],
  review_status text not null default 'new'
    check (review_status in ('new', 'reviewed', 'needs_review', 'rejected')),

  -- Gemini embedding used for introduction candidate retrieval.
  embedding vector(768),
  embedding_model text,
  embedding_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.introductions (
  id bigint generated always as identity primary key,
  person_a_id bigint not null references public.people(id) on delete cascade,
  person_b_id bigint not null references public.people(id) on delete cascade,

  -- Similarity is stored as the raw model score used for ranking.
  match_score numeric(6,5),
  match_band text,
  shared_context text,
  suggested_intro text,
  reasoning text not null check (btrim(reasoning) <> ''),
  evidence_snapshot jsonb not null default '{}'::jsonb,

  suggested_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'dismissed')),
  reviewer_note text,
  reviewed_at timestamptz,

  generated_by text,
  embedding_model text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint introductions_distinct_people check (person_a_id <> person_b_id)
);

-- Foreign-key indexes support joins, review filters, and cascade operations.
create index if not exists people_source_idx
  on public.people (source);

create index if not exists people_email_normalized_idx
  on public.people (email_normalized)
  where email_normalized is not null;

create index if not exists people_incomplete_idx
  on public.people (is_incomplete)
  where is_incomplete = true;

create index if not exists people_review_status_idx
  on public.people (review_status);

create index if not exists people_fit_score_idx
  on public.people (fit_score desc)
  where fit_score is not null;

create index if not exists people_duplicate_idx
  on public.people (is_duplicate_of)
  where is_duplicate_of is not null;

create index if not exists introductions_person_a_idx
  on public.introductions (person_a_id);

create index if not exists introductions_person_b_idx
  on public.introductions (person_b_id);

create index if not exists introductions_status_idx
  on public.introductions (status);

create index if not exists introductions_suggested_at_idx
  on public.introductions (suggested_at desc);

-- Prevent the same unordered pair from being suggested twice.
create unique index if not exists introductions_unordered_pair_idx
  on public.introductions (
    least(person_a_id, person_b_id),
    greatest(person_a_id, person_b_id)
  );

-- Keep audit timestamps current when rows are updated.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists people_set_updated_at on public.people;
create trigger people_set_updated_at
before update on public.people
for each row execute function public.set_updated_at();

drop trigger if exists introductions_set_updated_at on public.introductions;
create trigger introductions_set_updated_at
before update on public.introductions
for each row execute function public.set_updated_at();

-- The CRM is private. No anon/authenticated policies are created until the
-- application authentication and reviewer authorization model is defined.
alter table public.people enable row level security;
alter table public.introductions enable row level security;
revoke all on table public.people from anon, authenticated;
revoke all on table public.introductions from anon, authenticated;
