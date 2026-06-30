-- 강남역 점심 룰렛 · Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하세요.
-- (이 파일은 테이블/정책 정의만. 식당 데이터는 supabase/seed.sql 로 넣습니다.)

-- 1) 카테고리 테이블 (라벨/색/이모지)
create table if not exists public.lunch_categories (
  key   text primary key,           -- han, guk, don, ram, chi, viet, kim, burg, salad
  label text not null,
  hex   text not null,
  em    text not null,
  sort  int  not null default 0
);

-- 2) 식당 테이블
create table if not exists public.lunch_restaurants (
  id         bigint generated always as identity primary key,
  name       text    not null,
  category   text    not null references public.lunch_categories(key),
  menu       text    not null,
  price      int     not null check (price >= 0),
  rating     numeric(2,1),
  walk       text,
  exit       text,                  -- 가까운 강남역 출구: '6', '4', '5' ...
  note       text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lunch_restaurants_category on public.lunch_restaurants(category);
create index if not exists idx_lunch_restaurants_active   on public.lunch_restaurants(active);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_lunch_restaurants_touch on public.lunch_restaurants;
create trigger trg_lunch_restaurants_touch
  before update on public.lunch_restaurants
  for each row execute function public.touch_updated_at();

-- 3) RLS: 누구나 읽기 가능 (anon key 로 select). 쓰기는 service_role 만.
alter table public.lunch_categories   enable row level security;
alter table public.lunch_restaurants  enable row level security;

drop policy if exists "categories public read"  on public.lunch_categories;
drop policy if exists "restaurants public read" on public.lunch_restaurants;

create policy "categories public read"
  on public.lunch_categories for select
  to anon, authenticated using (true);

create policy "restaurants public read"
  on public.lunch_restaurants for select
  to anon, authenticated using (true);

-- (쓰기 정책은 의도적으로 만들지 않음 → anon 으로는 insert/update/delete 불가)


-- =====================================================================
-- 팀 공유 기능: 즐겨찾기 + "오늘 먹은 곳" 기록
-- (닉네임 기반. 팀 내부용으로 anon 키에 읽기/쓰기를 허용합니다.)
-- =====================================================================

-- 4) 즐겨찾기: 팀원이 식당을 ⭐ 표시
create table if not exists public.lunch_favorites (
  id            bigint generated always as identity primary key,
  restaurant_id bigint not null references public.lunch_restaurants(id) on delete cascade,
  member        text   not null check (char_length(member) between 1 and 20),
  created_at    timestamptz not null default now(),
  unique (restaurant_id, member)
);
create index if not exists idx_lunch_favorites_restaurant on public.lunch_favorites(restaurant_id);

-- 5) 점심 기록: 누가 / 언제 / 어디서 / 어떻게(룰렛·지정) 먹었는지
create table if not exists public.lunch_log (
  id            bigint generated always as identity primary key,
  restaurant_id bigint not null references public.lunch_restaurants(id) on delete cascade,
  member        text   not null check (char_length(member) between 1 and 20),
  ate_on        date   not null default current_date,
  source        text   not null default 'roulette' check (source in ('roulette','pick')),
  created_at    timestamptz not null default now(),
  unique (restaurant_id, member, ate_on)
);
create index if not exists idx_lunch_log_ate_on on public.lunch_log(ate_on desc);

-- RLS
alter table public.lunch_favorites enable row level security;
alter table public.lunch_log       enable row level security;

drop policy if exists "fav read"   on public.lunch_favorites;
drop policy if exists "fav insert" on public.lunch_favorites;
drop policy if exists "fav delete" on public.lunch_favorites;
drop policy if exists "log read"   on public.lunch_log;
drop policy if exists "log insert" on public.lunch_log;
drop policy if exists "log delete" on public.lunch_log;

-- 읽기: 누구나 (팀 통계 표시용)
create policy "fav read" on public.lunch_favorites for select to anon, authenticated using (true);
create policy "log read" on public.lunch_log       for select to anon, authenticated using (true);

-- 쓰기: 누구나 insert (닉네임 길이 검증). 팀 내부용.
create policy "fav insert" on public.lunch_favorites for insert to anon, authenticated
  with check (char_length(member) between 1 and 20);
create policy "log insert" on public.lunch_log       for insert to anon, authenticated
  with check (char_length(member) between 1 and 20);

-- 삭제: 즐겨찾기 해제 / 기록 취소 허용
create policy "fav delete" on public.lunch_favorites for delete to anon, authenticated using (true);
create policy "log delete" on public.lunch_log       for delete to anon, authenticated using (true);

-- 6) (선택) 식당별 집계 뷰 — 클라이언트가 직접 집계하므로 필수는 아님
create or replace view public.lunch_restaurant_stats as
select
  r.id,
  r.name,
  count(distinct f.member)                                            as fav_count,
  count(l.id) filter (where l.ate_on > current_date - interval '14 day') as ate_recent
from public.lunch_restaurants r
left join public.lunch_favorites f on f.restaurant_id = r.id
left join public.lunch_log       l on l.restaurant_id = r.id
group by r.id, r.name;


-- =====================================================================
-- 사용자(팀원) 식당 추가 지원
--   기존 시드 식당(added_by IS NULL)은 보호하고,
--   사용자가 추가한 식당(added_by 존재)만 insert/delete 허용.
-- =====================================================================
alter table public.lunch_restaurants add column if not exists address  text;
alter table public.lunch_restaurants add column if not exists added_by text;

drop policy if exists "restaurants user insert" on public.lunch_restaurants;
drop policy if exists "restaurants user delete" on public.lunch_restaurants;

create policy "restaurants user insert" on public.lunch_restaurants for insert to anon, authenticated
  with check (
    added_by is not null
    and char_length(name) between 1 and 40
    and char_length(added_by) between 1 and 20
    and price between 0 and 100000
  );

create policy "restaurants user delete" on public.lunch_restaurants for delete to anon, authenticated
  using (added_by is not null);
