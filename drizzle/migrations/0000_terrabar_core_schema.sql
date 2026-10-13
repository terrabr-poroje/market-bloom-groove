
-- نقش‌ها
create type public.app_role as enum ('admin', 'supplier', 'seller', 'buyer');

-- پروفایل کاربران
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  city text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

-- نقش‌های کاربران (جدول جداگانه برای امنیت)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- درخواست‌های عضویت (تأمین‌کننده / بارفروش / خریدار)
create table public.member_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  requested_role app_role not null,
  full_name text not null,
  phone text not null,
  city text,
  description text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert on public.member_requests to authenticated;
grant all on public.member_requests to service_role;
alter table public.member_requests enable row level security;
create policy "Users create own request" on public.member_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "Users read own requests" on public.member_requests for select to authenticated using (auth.uid() = user_id);
create policy "Admins read all requests" on public.member_requests for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update requests" on public.member_requests for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- بارها
create table public.loads (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete set null,
  product_name text not null,
  variety text,
  quality text not null default 'standard' check (quality in ('premium','standard','economy','negotiated')),
  city text not null,
  province text,
  package_weight_kg numeric not null,
  stock_packages integer not null default 0,
  min_order_packages integer not null default 1,
  price_per_kg numeric not null,
  description text,
  image_url text,
  ready_at text,
  expires_at timestamptz,
  status text not null default 'pending' check (status in ('pending','published','rejected','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.loads to anon;
grant select, insert, update on public.loads to authenticated;
grant all on public.loads to service_role;
alter table public.loads enable row level security;
create policy "Anyone reads published loads" on public.loads for select to anon, authenticated using (status = 'published');
create policy "Sellers read own loads" on public.loads for select to authenticated using (auth.uid() = seller_id);
create policy "Approved sellers create loads" on public.loads for insert to authenticated
  with check (auth.uid() = seller_id and (public.has_role(auth.uid(), 'supplier') or public.has_role(auth.uid(), 'seller')));
create policy "Sellers update own loads" on public.loads for update to authenticated using (auth.uid() = seller_id);
create policy "Admins manage all loads" on public.loads for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- سفارش‌ها
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  load_id uuid references public.loads(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  packages integer not null,
  total_weight_kg numeric not null,
  total_price numeric not null,
  delivery_city text,
  delivery_address text,
  notes text,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','delivered')),
  created_at timestamptz not null default now()
);
grant select, insert on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Buyers create own orders" on public.orders for insert to authenticated with check (auth.uid() = buyer_id);
create policy "Buyers read own orders" on public.orders for select to authenticated using (auth.uid() = buyer_id);
create policy "Sellers read orders on their loads" on public.orders for select to authenticated
  using (exists (select 1 from public.loads l where l.id = load_id and l.seller_id = auth.uid()));
create policy "Admins manage orders" on public.orders for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ساخت خودکار پروفایل هنگام ثبت‌نام
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- داده‌های نمونه بارهای منتشرشده
insert into public.loads (product_name, variety, quality, city, province, package_weight_kg, stock_packages, min_order_packages, price_per_kg, description, ready_at, status) values
('سیب', 'سرخ مراغه', 'premium', 'مراغه', 'آذربایجان شرقی', 10, 500, 20, 48000, 'سیب سرخ درجه یک مراغه، سورت‌شده و بسته‌بندی‌شده', 'آماده تحویل', 'published'),
('پرتقال', 'تامسون', 'standard', 'بابل', 'مازندران', 8, 800, 50, 32000, 'پرتقال تامسون تازه باغ، مناسب آب‌گیری و مصرف', 'آماده تحویل', 'published'),
('گوجه فرنگی', 'بوته‌ای ۸۳۲۰', 'economy', 'جیرفت', 'کرمان', 15, 300, 10, 21000, 'گوجه بوته‌ای رسیده، مناسب رب و مصرف تازه', '۲ روز دیگر آماده می‌شود', 'published'),
('پیاز', 'زرد', 'standard', 'اشترینان', 'البرز', 20, 1000, 50, 18000, 'پیاز زرد انباری، ماندگاری بالا', 'آماده تحویل', 'published');
