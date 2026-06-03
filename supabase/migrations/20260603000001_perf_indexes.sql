-- Índices de performance: FKs de tabelas de alto crescimento + colunas de order/range.
-- availability e assignments crescem por (colaborador x data); o ON DELETE CASCADE
-- ao remover um colaborador fazia seq scan completo sem estes índices.
CREATE INDEX IF NOT EXISTS idx_availability_collaborator ON availability(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_assignments_collaborator  ON assignments(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_consumption_collab_pending ON consumption(collaborator_id) WHERE payment_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_consumption_created_at     ON consumption(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_date            ON purchases(date DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_periods_start_date ON schedule_periods(start_date DESC);
