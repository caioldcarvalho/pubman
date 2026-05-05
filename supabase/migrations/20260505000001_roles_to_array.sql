-- Convert role (single text) to roles (text array/tags)
ALTER TABLE collaborators ADD COLUMN roles text[] NOT NULL DEFAULT '{}';

-- Migrate existing data
UPDATE collaborators SET roles = ARRAY['instrutor', 'garcom'] WHERE role = 'ambos';
UPDATE collaborators SET roles = ARRAY[role] WHERE role != 'ambos';

-- Drop old column and constraint
ALTER TABLE collaborators DROP CONSTRAINT collaborators_role_check;
ALTER TABLE collaborators DROP COLUMN role;
