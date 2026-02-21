create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text not null default 'todo', -- todo | in_progress | blocked | done
  priority text not null default 'medium', -- high | medium | low
  waiting_on text,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on tasks (status);
create index on tasks (priority);
