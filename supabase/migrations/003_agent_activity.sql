create table agent_activity (
  id uuid default gen_random_uuid() primary key,
  summary text not null,
  detail text,
  category text default 'general', -- general | research | build | monitoring | comms
  created_at timestamptz default now()
);
create index on agent_activity (created_at desc);
