-- Water Leakage Detector — Supabase schema
-- Run this in the Supabase SQL editor (Project: bkaelehexhgiggiorxme)

create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  device_id text not null default 'atmega328p-01',
  sensor1_flow numeric not null,      -- L/min, flow sensor 1
  sensor2_flow numeric not null,      -- L/min, flow sensor 2
  status text not null check (status in ('NORMAL', 'ABNORMAL')),
  leak_detected boolean not null default false
);

create index if not exists sensor_readings_created_at_idx
  on public.sensor_readings (created_at desc);

alter table public.sensor_readings enable row level security;

-- The GSM device and the dashboard both authenticate with the anon key,
-- so anon needs insert (device pushing readings) and select (dashboard reading).
create policy "anon can insert readings"
  on public.sensor_readings
  for insert
  to anon
  with check (true);

create policy "anon can read readings"
  on public.sensor_readings
  for select
  to anon
  using (true);

-- Enable Realtime so the dashboard gets live updates on insert
alter publication supabase_realtime add table public.sensor_readings;
