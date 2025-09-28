-- Add location tracking fields to conversations table
ALTER TABLE conversations
ADD COLUMN location_name TEXT,
ADD COLUMN location_address TEXT,
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_conversations_location ON conversations(location_name);

-- Add artwork metadata fields
ALTER TABLE conversations
ADD COLUMN artwork_title TEXT,
ADD COLUMN artwork_artist TEXT,
ADD COLUMN artwork_period TEXT,
ADD COLUMN artwork_style TEXT;

-- Create indexes for artwork search
CREATE INDEX IF NOT EXISTS idx_conversations_artwork_title ON conversations(artwork_title);
CREATE INDEX IF NOT EXISTS idx_conversations_artwork_artist ON conversations(artwork_artist);