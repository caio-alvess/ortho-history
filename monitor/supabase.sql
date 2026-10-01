-- Rode no Supabase: SQL Editor > New query
create table leituras (
  id bigint generated always as identity primary key,
  unidade text not null,
  coletado_em timestamptz not null default now(),
  dados jsonb not null
);

create index on leituras (unidade, coletado_em desc);
create index on leituras (coletado_em desc);

-- O site (chave anon) só pode LER. Quem escreve é o coletor (chave service_role).
alter table leituras enable row level security;
create policy "leitura publica" on leituras for select to anon using (true);
