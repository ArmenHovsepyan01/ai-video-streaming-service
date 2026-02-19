-- Add processing tracking fields to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS task_id VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_step VARCHAR(100);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;

