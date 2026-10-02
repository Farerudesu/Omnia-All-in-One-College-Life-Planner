alter table public.user_settings
  add column if not exists currency text not null default 'IDR'
  check (currency ~ '^[A-Z]{3}$');alter table public.user_settings
  add column if not exists currency text not null default 'IDR'
  check (currency ~ '^[A-Z]{3}$');