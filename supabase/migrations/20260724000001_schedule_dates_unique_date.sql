-- Backstop de banco contra o bug de dias de escala duplicados.
--
-- A unicidade original era `unique(period_id, date)`, que permitia o MESMO dia de
-- calendário existir em dois períodos diferentes (períodos sobrepostos). Foi a raiz
-- da duplicação de dias na escala (incidente 2026-07-24: períodos A/B sobrepostos,
-- pessoas diferentes escaladas no mesmo dia real, pagamento virou zona).
--
-- O app já impede sobreposição via findOverlappingPeriod() em addPeriod/updatePeriod,
-- mas esta constraint garante no nível do banco que um dia só existe UMA vez, não
-- importa a origem. Dados já saneados (merge dos períodos duplicados em 24/07).
alter table schedule_dates
  add constraint schedule_dates_date_unique unique (date);
