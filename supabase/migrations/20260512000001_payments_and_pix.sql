-- PIX key on collaborators
ALTER TABLE collaborators
  ADD COLUMN pix_key text;

-- Payments: one row per settlement to a collaborator (or null for general reimbursements)
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid REFERENCES collaborators(id) ON DELETE SET NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  total_earned numeric(10, 2) NOT NULL DEFAULT 0,
  total_consumed numeric(10, 2) NOT NULL DEFAULT 0,
  total_reimbursed numeric(10, 2) NOT NULL DEFAULT 0,
  net_amount numeric(10, 2) NOT NULL DEFAULT 0,
  pix_key_used text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_collaborator ON payments(collaborator_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Link each settled record to its payment (keeps history instead of deleting on settle)
ALTER TABLE assignments
  ADD COLUMN payment_id uuid REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE consumption
  ADD COLUMN payment_id uuid REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE purchases
  ADD COLUMN payment_id uuid REFERENCES payments(id) ON DELETE SET NULL;

CREATE INDEX idx_assignments_payment ON assignments(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_consumption_payment ON consumption(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_purchases_payment ON purchases(payment_id) WHERE payment_id IS NOT NULL;
