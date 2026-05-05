create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  original_name text not null unique,
  rank text not null,
  department text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

create policy "team_members_public_select" on public.team_members for select using (true);
create policy "team_members_public_insert" on public.team_members for insert with check (true);
create policy "team_members_public_update" on public.team_members for update using (true);
create policy "team_members_public_delete" on public.team_members for delete using (true);

create or replace function public.tm_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger tm_set_updated_at
before update on public.team_members
for each row execute function public.tm_touch_updated_at();