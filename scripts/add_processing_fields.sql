-- Add processing tracking fields to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS task_id VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_step VARCHAR(100);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;
-- Create index on task_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_videos_task_id ON videos(task_id);
