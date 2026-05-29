-- Split a single consumption across N collaborators: one row per collaborator,
-- each charged price/split_count. Null/1 means not split.
ALTER TABLE consumption
  ADD COLUMN split_count int NOT NULL DEFAULT 1 CHECK (split_count >= 1);
