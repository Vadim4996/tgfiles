-- Создание таблицы notes
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    note_id UUID NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL,
    parent_note_id UUID REFERENCES notes(note_id) ON DELETE CASCADE,
    title VARCHAR(512) NOT NULL,
    content TEXT,
    type VARCHAR(64) NOT NULL,
    mime VARCHAR(128),
    is_protected BOOLEAN DEFAULT FALSE,
    is_expanded BOOLEAN DEFAULT TRUE,
    note_position INTEGER DEFAULT 0,
    prefix VARCHAR(64),
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utc_date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utc_date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    delete_id UUID,
    blob_id UUID,
    attributes JSONB DEFAULT '{}',
    CONSTRAINT fk_blob FOREIGN KEY(blob_id) REFERENCES blobs(id) ON DELETE SET NULL
);

-- Создание таблицы attributes
CREATE TABLE IF NOT EXISTS attributes (
    id SERIAL PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES notes(note_id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- label, relation, ...
    name VARCHAR(128) NOT NULL,
    value TEXT,
    position INTEGER DEFAULT 0,
    is_inheritable BOOLEAN DEFAULT FALSE
);

-- Создание таблицы blobs (для вложений)
CREATE TABLE IF NOT EXISTS blobs (
    id UUID PRIMARY KEY,
    data BYTEA,
    mime VARCHAR(128),
    size INTEGER,
    filename VARCHAR(256),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_notes_username ON notes(username);
CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parent_note_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
CREATE INDEX IF NOT EXISTS idx_attributes_note_id ON attributes(note_id);
CREATE INDEX IF NOT EXISTS idx_attributes_type_name ON attributes(type, name); 