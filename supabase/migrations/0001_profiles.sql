-- =========================================================================
-- WLM DEALER HUB - CONFERÊNCIA INTELIGENTE DE OC x NF-e
-- Migration: 0001_profiles.sql (Estrutura Mínima e RLS)
-- =========================================================================

create extension if not exists pgcrypto;

-- 1. Enum de papéis operacionais
create type public.app_role as enum (
  'buyer',
  'receiving',
  'admin'
);

-- 2. Tabela de perfis vinculada ao auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'receiving',
  can_finalize boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- 3. Habilita RLS
alter table public.profiles enable row level security;

-- Cada usuário autenticado pode consultar apenas o próprio perfil
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

-- Restringe inserção e atualização direta pelo cliente
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;

-- 4. Trigger automático para criar perfil padrão ao cadastrar novo usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role, can_finalize, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'receiving',
    false,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
