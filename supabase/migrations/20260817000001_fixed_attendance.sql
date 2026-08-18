-- Ponto de colaboradores fixos: registro de entrada/saída pra acompanhar
-- assiduidade (atraso acumulado no mês). Propositalmente desacoplado de
-- assignments/schedule_dates e de pagamento — colaborador fixo recebe valor
-- combinado à parte, o ponto aqui é só acompanhamento, não desconta nada.
create table fixed_attendance (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null references collaborators(id) on delete cascade,
  date date not null,
  check_in time,
  check_out time,
  created_at timestamptz not null default now(),
  unique(collaborator_id, date)
);

create index idx_fixed_attendance_collaborator on fixed_attendance(collaborator_id);
create index idx_fixed_attendance_date on fixed_attendance(date);

alter table fixed_attendance enable row level security;
create policy "Authenticated full access" on fixed_attendance for all to authenticated using (true) with check (true);
