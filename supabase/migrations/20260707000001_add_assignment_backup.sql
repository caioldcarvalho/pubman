-- Backup/standby assignments: pessoa de prontidão ("plantonista").
-- Fica na escala mas NÃO conta na cota do dia e NÃO entra em pagamento.
-- Só é pago se for realmente chamado -> promovido a titular (is_backup = false).
ALTER TABLE assignments
  ADD COLUMN is_backup boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN assignments.is_backup IS 'Standby/plantão: excluído da cota do dia e de pagamento até ser promovido a titular (is_backup=false)';
