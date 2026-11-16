-- =====================================================================
-- Автоняня Челны — схема базы данных Supabase (PostgreSQL)
-- Выполнить целиком в Supabase → SQL Editor → New query → Run.
-- =====================================================================

-- ---------- Профили (общие для родителей, автонянь и модераторов) ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('nanny', 'parent', 'admin')),
  full_name     text not null,
  phone         text not null default '',
  city          text not null default 'Набережные Челны',
  districts     text[] not null default '{}',
  pd_consent_at timestamptz not null,          -- согласие на обработку ПДн (152-ФЗ)
  created_at    timestamptz not null default now()
);

-- ---------- Анкета автоняни (паспорт — только владелец и модератор) ----------
create table if not exists public.nanny_profiles (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  birth_date          date not null,
  about               text,
  experience_years    int not null default 0,
  price_from          int,
  car_model           text not null,
  car_color           text,
  car_plate           text not null,
  has_child_seat      boolean not null default true,
  passport_series     text not null check (passport_series ~ '^\d{4}$'),
  passport_number     text not null check (passport_number ~ '^\d{6}$'),
  passport_photo_path text not null,
  selfie_path         text not null,
  verification_status text not null default 'pending'
                      check (verification_status in ('pending', 'approved', 'rejected')),
  rejection_reason    text,
  verified_at         timestamptz,
  verified_by         uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  unique (passport_series, passport_number)    -- один паспорт = одна анкета
);

-- ---------- Профили детей ----------
create table if not exists public.children (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  birth_date    date not null,
  school        text,
  grade         text,
  from_district text,
  to_district   text,
  schedule      text,
  notes         text,                           -- здоровье/аллергии: видит только родитель
  created_at    timestamptz not null default now()
);
create index if not exists children_parent_idx on public.children(parent_id);

-- ---------- Вспомогательные функции ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Защита профиля: телефон берём из auth (подтверждён СМС), роль admin нельзя выдать себе.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' and new.role = 'admin' then
      raise exception 'Нельзя назначить себя модератором';
    end if;
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'Роль менять нельзя';
    end if;
  end if;
  select coalesce('+' || nullif(ltrim(phone, '+'), ''), '') into new.phone
    from auth.users where id = new.id;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- Защита анкеты: автоняня не может сама себя одобрить;
-- при смене паспорта/фото анкета снова уходит на проверку.
create or replace function public.nanny_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.rejection_reason := null; new.verified_at := null; new.verified_by := null;
  else
    new.verified_at := old.verified_at; new.verified_by := old.verified_by;
    if new.passport_series   is distinct from old.passport_series
    or new.passport_number   is distinct from old.passport_number
    or new.passport_photo_path is distinct from old.passport_photo_path
    or new.selfie_path       is distinct from old.selfie_path
    or new.birth_date        is distinct from old.birth_date
    or old.verification_status = 'rejected' then
      new.verification_status := 'pending';
      new.rejection_reason := null; new.verified_at := null;
    else
      new.verification_status := old.verification_status;
      new.rejection_reason := old.rejection_reason;
    end if;
  end if;
  if (select role from profiles where id = new.user_id) <> 'nanny' then
    raise exception 'Анкета автоняни доступна только для роли автоняни';
  end if;
  return new;
end $$;
drop trigger if exists nanny_guard on public.nanny_profiles;
create trigger nanny_guard before insert or update on public.nanny_profiles
  for each row execute function public.nanny_guard();

-- ---------- Row Level Security ----------
alter table public.profiles       enable row level security;
alter table public.nanny_profiles enable row level security;
alter table public.children       enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "own nanny profile" on public.nanny_profiles;
create policy "own nanny profile" on public.nanny_profiles for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "own children" on public.children;
create policy "own children" on public.children for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid()
              and exists (select 1 from profiles where id = auth.uid() and role = 'parent'));

-- ---------- Поиск: родитель видит проверенных автонянь в своих районах ----------
create or replace function public.nannies_in_my_districts()
returns table (
  user_id uuid, full_name text, phone text, districts text[], about text,
  experience_years int, car_model text, car_color text, has_child_seat boolean,
  price_from int, age int
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.phone, p.districts, n.about,
         n.experience_years, n.car_model, n.car_color, n.has_child_seat,
         n.price_from, extract(year from age(n.birth_date))::int
  from nanny_profiles n
  join profiles p on p.id = n.user_id
  join profiles me on me.id = auth.uid()
  where n.verification_status = 'approved'
    and me.role in ('parent', 'admin')
    and p.districts && me.districts
  order by n.experience_years desc;
$$;

-- ---------- Запросы: проверенная автоняня видит детей в своих районах ----------
-- (без адресов и медицинских заметок)
create or replace function public.requests_in_my_districts()
returns table (
  child_id uuid, child_name text, child_age int, school text, grade text,
  from_district text, to_district text, schedule text,
  parent_name text, parent_phone text, parent_districts text[]
)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, extract(year from age(c.birth_date))::int, c.school, c.grade,
         c.from_district, c.to_district, c.schedule,
         p.full_name, p.phone, p.districts
  from children c
  join profiles p on p.id = c.parent_id
  join profiles me on me.id = auth.uid()
  where (exists (select 1 from nanny_profiles n
                 where n.user_id = me.id and n.verification_status = 'approved')
         or me.role = 'admin')
    and (c.from_district = any(me.districts) or c.to_district = any(me.districts))
  order by c.created_at desc;
$$;

-- ---------- Модерация ----------
create or replace function public.moderate_nanny(nanny_id uuid, approve boolean, reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Только для модератора'; end if;
  update nanny_profiles set
    verification_status = case when approve then 'approved' else 'rejected' end,
    rejection_reason    = case when approve then null else reason end,
    verified_at         = now(),
    verified_by         = auth.uid()
  where user_id = nanny_id;
end $$;

-- ---------- Удаление аккаунта (требование App Store и Google Play) ----------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();   -- каскадом удалит профиль, анкету, детей
end $$;

revoke all on function public.moderate_nanny(uuid, boolean, text) from anon;
revoke all on function public.delete_my_account() from anon;
revoke all on function public.nannies_in_my_districts() from anon;
revoke all on function public.requests_in_my_districts() from anon;

-- ---------- Хранилище фото паспортов (приватное) ----------
insert into storage.buckets (id, name, public)
values ('passports', 'passports', false)
on conflict (id) do nothing;

drop policy if exists "passports own upload" on storage.objects;
create policy "passports own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'passports' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "passports own or admin read" on storage.objects;
create policy "passports own or admin read" on storage.objects for select to authenticated
  using (bucket_id = 'passports'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "passports own update" on storage.objects;
create policy "passports own update" on storage.objects for update to authenticated
  using (bucket_id = 'passports' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "passports own or admin delete" on storage.objects;
create policy "passports own or admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'passports'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- Как назначить модератора ----------
-- 1) Зарегистрируйтесь в приложении как родитель со своим номером.
-- 2) Выполните (подставив свой номер):
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where phone = '79001234567');
