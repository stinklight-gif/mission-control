CREATE TABLE stock_recommendations (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  tickers text[] not null,
  heat_map jsonb not null,
  new_picks jsonb not null,
  summary text not null,
  raw_data jsonb,
  created_at timestamptz default now()
);

CREATE INDEX ON stock_recommendations (date desc);
