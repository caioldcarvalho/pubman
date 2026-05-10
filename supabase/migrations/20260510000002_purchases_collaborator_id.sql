-- Allow purchases/reimbursements to be tied to a specific collaborator
ALTER TABLE purchases
  ADD COLUMN collaborator_id uuid REFERENCES collaborators(id) ON DELETE SET NULL;

CREATE INDEX idx_purchases_collaborator ON purchases(collaborator_id) WHERE collaborator_id IS NOT NULL;
