create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null,
  language text not null,
  overall_score integer not null check (overall_score >= 0 and overall_score <= 100),
  issues_count integer not null default 0 check (issues_count >= 0),
  tool_results jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.best_practices (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  rule_text text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create index if not exists reviews_code_hash_idx on public.reviews (code_hash);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);
create index if not exists reviews_language_idx on public.reviews (language);
create index if not exists best_practices_category_idx on public.best_practices (category);
create index if not exists best_practices_embedding_idx
  on public.best_practices
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_best_practices(
  query_embedding vector(768),
  match_count integer default 5
)
returns table (
  id uuid,
  category text,
  rule_text text,
  similarity double precision
)
language sql
stable
as $$
  select
    best_practices.id,
    best_practices.category,
    best_practices.rule_text,
    1 - (best_practices.embedding <=> query_embedding) as similarity
  from public.best_practices
  order by best_practices.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.reviews enable row level security;
alter table public.best_practices enable row level security;

drop policy if exists "reviews are insertable by service role" on public.reviews;
drop policy if exists "reviews are readable by anon and service role" on public.reviews;
drop policy if exists "best practices readable by anon and service role" on public.best_practices;
drop policy if exists "best practices writable by service role" on public.best_practices;

create policy "reviews are insertable by service role"
  on public.reviews
  for insert
  with check (auth.role() = 'service_role');

create policy "reviews are readable by anon and service role"
  on public.reviews
  for select
  using (auth.role() in ('anon', 'authenticated', 'service_role'));

create policy "best practices readable by anon and service role"
  on public.best_practices
  for select
  using (auth.role() in ('anon', 'authenticated', 'service_role'));

create policy "best practices writable by service role"
  on public.best_practices
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
