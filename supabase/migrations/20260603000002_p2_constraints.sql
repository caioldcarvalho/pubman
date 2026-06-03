-- P2: integridade de domínio + proteção de histórico financeiro.

-- Tipo: custom_price padroniza em numeric(10,2) como o resto do dinheiro.
alter table consumption alter column custom_price type numeric(10,2);

-- CHECKs de domínio (dados de produção verificados: nenhuma linha viola).
alter table consumption add constraint consumption_quantity_pos check (quantity > 0);
alter table consumption add constraint consumption_custom_price_nonneg
  check (custom_price is null or custom_price >= 0);
alter table purchases add constraint purchases_amount_nonneg check (amount >= 0);
alter table products  add constraint products_price_nonneg   check (price >= 0);

alter table collaborators add constraint collaborators_roles_valid
  check (roles <@ array['instrutor','garcom','bar','cozinha','ambos']::text[]);

alter table schedule_dates add constraint sd_dow_range check (day_of_week between 0 and 6);
alter table schedule_dates add constraint sd_required_nonneg check (required_count >= 0);
alter table schedule_periods add constraint sp_date_order check (end_date >= start_date);
alter table assignments add constraint assignments_check_order
  check (check_in is null or check_out is null or check_out > check_in);
alter table events add constraint events_attendees_nonneg
  check (expected_attendees is null or expected_attendees >= 0);

-- Proteção de histórico financeiro: deletar produto/colaborador NÃO deve apagar o
-- consumo associado (o app usa soft-delete via active; não há hard-delete no código).
alter table consumption drop constraint consumption_product_id_fkey;
alter table consumption add constraint consumption_product_id_fkey
  foreign key (product_id) references products(id) on delete restrict;
alter table consumption drop constraint consumption_collaborator_id_fkey;
alter table consumption add constraint consumption_collaborator_id_fkey
  foreign key (collaborator_id) references collaborators(id) on delete restrict;
