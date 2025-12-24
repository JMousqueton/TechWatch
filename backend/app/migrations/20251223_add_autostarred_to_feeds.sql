-- Add autostarred column to feeds table
ALTER TABLE feeds ADD COLUMN autostarred BOOLEAN DEFAULT 0;