create table if not exists public.bot_state (
  id integer primary key default 1,
  first_buy_done boolean not null default false,
  triggered_levels jsonb not null default '[]'::jsonb,
  last_price numeric,
  last_tx_hash text,
  updated_at timestamptz not null default now()
);

alter table public.grid_config add column if not exists entry_price numeric not null default 0;
alter table public.grid_config add column if not exists initial_order_percent numeric not null default 40;
alter table public.grid_config add column if not exists order_percent numeric not null default 10;
alter table public.grid_config add column if not exists level_tolerance_percent numeric not null default 0.15;

alter table public.grid_orders add column if not exists symbol text;
alter table public.grid_orders add column if not exists tx_hash text;

insert into public.bot_state (id) values (1) on conflict (id) do nothing;
