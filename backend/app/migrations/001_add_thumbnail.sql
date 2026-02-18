-- Add thumbnail path for video previews
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(500);

