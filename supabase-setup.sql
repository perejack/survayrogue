-- SurveyKe Supabase Database Setup
-- Run this in your Supabase SQL Editor to create all required tables

-- Enable Row Level Security
alter table if exists public.profiles enable row level security;

-- Create profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text not null unique,
  phone text not null,
  balance integer default 0 not null,
  total_earned integer default 0 not null,
  surveys_completed integer default 0 not null,
  is_premium boolean default false not null,
  premium_tier text default null,
  is_active boolean default false not null,
  avatar text default 'U' not null
);

-- Create categories table
create table if not exists public.categories (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text not null,
  reward integer not null,
  unlock_fee integer default null,
  is_free boolean default false not null,
  image_url text default '' not null,
  gradient text default 'from-emerald-400 to-teal-600' not null,
  text_color text default 'text-emerald-600' not null,
  surveys_count integer default 10 not null
);

-- Create surveys table
create table if not exists public.surveys (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  question text not null,
  options text[] not null,
  reward integer not null,
  category text references public.categories(id) not null,
  is_active boolean default true not null,
  order_index integer default 0 not null
);

-- Create user_surveys table (tracks completed surveys)
create table if not exists public.user_surveys (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  survey_id uuid references public.surveys(id) on delete cascade not null,
  category_id text references public.categories(id) not null,
  completed boolean default true not null,
  earned integer default 0 not null,
  unique(user_id, survey_id)
);

-- Create unlocked_categories table
create table if not exists public.unlocked_categories (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id text references public.categories(id) on delete cascade not null,
  unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, category_id)
);

-- Create transactions table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('earned', 'withdrawal', 'unlock', 'upgrade')) not null,
  description text not null,
  amount integer not null,
  status text check (status in ('pending', 'completed', 'failed')) default 'completed' not null,
  mpesa_ref text default null
);

-- Create premium_packages table
create table if not exists public.premium_packages (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  price integer not null,
  features text[] not null,
  daily_surveys integer not null,
  reward_multiplier decimal(3,1) default 1.0 not null,
  color text default 'primary' not null,
  is_popular boolean default false not null
);

-- Create mpesa_payments table
create table if not exists public.mpesa_payments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  phone_number text not null,
  amount integer not null,
  type text check (type in ('activation', 'unlock', 'upgrade', 'withdrawal')) not null,
  reference_id text not null unique,
  status text check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending' not null,
  mpesa_receipt text default null,
  checkout_request_id text default null
);

-- Insert default categories
insert into public.categories (id, name, description, reward, unlock_fee, is_free, gradient, text_color, surveys_count) values
  ('lifestyle', 'Lifestyle & Consumer', 'Everyday consumer choices and lifestyle preferences in Kenya.', 150, null, true, 'from-emerald-400 to-teal-600', 'text-emerald-600', 50),
  ('tech', 'Technology & Digital', 'Mobile, internet, apps and digital habits.', 150, 180, false, 'from-blue-400 to-indigo-600', 'text-blue-600', 50),
  ('health', 'Health & Wellness', 'Healthcare access, mental wellness and fitness.', 200, 200, false, 'from-rose-400 to-pink-600', 'text-rose-600', 50),
  ('finance', 'Finance & Business', 'Personal finance, savings, investment and banking.', 250, 250, false, 'from-amber-400 to-orange-600', 'text-amber-600', 50)
on conflict (id) do nothing;

-- Insert default premium packages
insert into public.premium_packages (id, name, price, features, daily_surveys, reward_multiplier, color, is_popular) values
  ('basic', 'Basic Premium', 350, array['20 Daily Surveys', 'Priority Support', 'Early Access to New Surveys', '1.2x Reward Multiplier'], 20, 1.2, 'primary', false),
  ('standard', 'Standard Premium', 500, array['35 Daily Surveys', 'VIP Support', 'Exclusive Survey Categories', '1.5x Reward Multiplier', 'Weekly Bonus Tasks'], 35, 1.5, 'accent', true),
  ('elite', 'Elite Premium', 650, array['Unlimited Daily Surveys', '24/7 Priority Support', 'All Categories Unlocked', '2x Reward Multiplier', 'Daily Bonus Tasks', 'Referral Bonuses'], 999, 2.0, 'primary', false)
on conflict (id) do nothing;

-- Insert sample surveys for lifestyle category (questions will be generated programmatically)
-- Note: In production, you'd want to insert all 200 questions (50 per category)

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.surveys enable row level security;
alter table public.user_surveys enable row level security;
alter table public.unlocked_categories enable row level security;
alter table public.transactions enable row level security;
alter table public.premium_packages enable row level security;
alter table public.mpesa_payments enable row level security;

-- Create RLS policies
-- Profiles: Users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Categories: Everyone can read
create policy "Anyone can view categories"
  on public.categories for select
  to authenticated, anon
  using ( true );

-- Surveys: Everyone can read active surveys
create policy "Anyone can view active surveys"
  on public.surveys for select
  to authenticated, anon
  using ( is_active = true );

-- User Surveys: Users can only see their own
create policy "Users can view own surveys"
  on public.user_surveys for select
  using ( auth.uid() = user_id );

create policy "Users can insert own surveys"
  on public.user_surveys for insert
  with check ( auth.uid() = user_id );

-- Unlocked Categories: Users can only see their own
create policy "Users can view own unlocked categories"
  on public.unlocked_categories for select
  using ( auth.uid() = user_id );

create policy "Users can insert own unlocked categories"
  on public.unlocked_categories for insert
  with check ( auth.uid() = user_id );

-- Transactions: Users can only see their own
create policy "Users can view own transactions"
  on public.transactions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check ( auth.uid() = user_id );

-- Premium Packages: Everyone can read
create policy "Anyone can view premium packages"
  on public.premium_packages for select
  to authenticated, anon
  using ( true );

-- M-Pesa Payments: Users can only see their own
create policy "Users can view own payments"
  on public.mpesa_payments for select
  using ( auth.uid() = user_id );

create policy "Users can insert own payments"
  on public.mpesa_payments for insert
  with check ( auth.uid() = user_id );

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, phone, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '+254'),
    coalesce(
      upper(substring(split_part(new.email, '@', 1) from 1 for 2)),
      'U'
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
