alter table tasks enable row level security;
create policy "Allow all operations" on tasks for all using (true) with check (true);

alter table agent_activity enable row level security;
create policy "Allow all operations" on agent_activity for all using (true) with check (true);

alter table scheduled_tasks enable row level security;
create policy "Allow all operations" on scheduled_tasks for all using (true) with check (true);

alter table documents enable row level security;
create policy "Allow all operations" on documents for all using (true) with check (true);

alter table stock_recommendations enable row level security;
create policy "Allow all operations" on stock_recommendations for all using (true) with check (true);
