-- Jalankan di Supabase: SQL Editor -> New query -> Run
-- Aman dijalankan ulang (idempotent).

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  header text not null,
  description text not null default '',
  body text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table todos enable row level security;

-- Hapus policy lama (kalau ada) agar bisa dibuat ulang dengan benar
drop policy if exists "todos_select" on todos;
drop policy if exists "todos_insert" on todos;
drop policy if exists "todos_update" on todos;
drop policy if exists "todos_delete" on todos;

create policy "todos_select" on todos for select using (true);
create policy "todos_insert" on todos for insert with check (true);
create policy "todos_update" on todos for update using (true) with check (true);
create policy "todos_delete" on todos for delete using (true);

create index if not exists todos_created_at_idx on todos (created_at desc);
