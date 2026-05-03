-- Collaborators
create table collaborators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'ambos' check (role in ('instrutor', 'garcom', 'ambos')),
  base_rate numeric(10,2) not null default 150,
  stars int not null default 3 check (stars >= 0 and stars <= 5),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Products (menu)
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  category text not null default 'Outros',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Schedule periods
create table schedule_periods (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

-- Schedule dates (individual days within a period)
create table schedule_dates (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references schedule_periods(id) on delete cascade,
  date date not null,
  day_of_week int not null,
  required_count int not null default 3,
  unique(period_id, date)
);

-- Availability (collaborator says yes/no for a date)
create table availability (
  id uuid primary key default gen_random_uuid(),
  date_id uuid not null references schedule_dates(id) on delete cascade,
  collaborator_id uuid not null references collaborators(id) on delete cascade,
  available boolean not null default false,
  unique(date_id, collaborator_id)
);

-- Assignments (who is actually scheduled)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  date_id uuid not null references schedule_dates(id) on delete cascade,
  collaborator_id uuid not null references collaborators(id) on delete cascade,
  rate_override numeric(10,2),
  notes text not null default '',
  unique(date_id, collaborator_id)
);

-- Consumption entries
create table consumption (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null references collaborators(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null default 1,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Purchases (reimbursements)
create table purchases (
  id uuid primary key default gen_random_uuid(),
  amount numeric(10,2) not null,
  date date not null default current_date,
  notes text not null default '',
  reimbursed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_schedule_dates_period on schedule_dates(period_id);
create index idx_availability_date on availability(date_id);
create index idx_assignments_date on assignments(date_id);
create index idx_consumption_collaborator on consumption(collaborator_id);
create index idx_consumption_date on consumption(date);

-- RLS: allow all for authenticated users (single manager app)
alter table collaborators enable row level security;
alter table products enable row level security;
alter table schedule_periods enable row level security;
alter table schedule_dates enable row level security;
alter table availability enable row level security;
alter table assignments enable row level security;
alter table consumption enable row level security;
alter table purchases enable row level security;

create policy "Authenticated full access" on collaborators for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on products for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on schedule_periods for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on schedule_dates for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on availability for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on assignments for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on consumption for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on purchases for all to authenticated using (true) with check (true);
