-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Main table for storing code embeddings
CREATE TABLE IF NOT EXISTS codebase_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  file_path text NOT NULL,
  chunk_index integer NOT NULL,
  chunk_type text CHECK (chunk_type IN ('function', 'class', 'module', 'interface', 'type', 'comment', 'import', 'general')),
  chunk_name text, -- Function/class/interface name for easy reference
  chunk_content text NOT NULL,
  chunk_hash text NOT NULL, -- SHA256 hash of content for deduplication
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  token_count integer,
  language text, -- File language (typescript, javascript, python, etc.)
  metadata jsonb DEFAULT '{}', -- Additional metadata (imports, exports, dependencies)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_embeddings_project ON codebase_embeddings(project_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_file ON codebase_embeddings(project_id, file_path);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON codebase_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_unique ON codebase_embeddings(project_id, file_path, chunk_hash);
CREATE INDEX IF NOT EXISTS idx_embeddings_type ON codebase_embeddings(chunk_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_updated ON codebase_embeddings(updated_at DESC);

-- Table for tracking indexing progress
CREATE TABLE IF NOT EXISTS indexing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL UNIQUE,
  total_files integer DEFAULT 0,
  indexed_files integer DEFAULT 0,
  total_chunks integer DEFAULT 0,
  status text CHECK (status IN ('idle', 'indexing', 'completed', 'failed')),
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Function to search for similar code chunks
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  target_project_id text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  file_path text,
  chunk_type text,
  chunk_name text,
  chunk_content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.file_path,
    ce.chunk_type,
    ce.chunk_name,
    ce.chunk_content,
    ce.metadata,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM codebase_embeddings ce
  WHERE 
    ce.project_id = target_project_id
    AND ce.embedding IS NOT NULL
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get project statistics
CREATE OR REPLACE FUNCTION get_project_stats(target_project_id text)
RETURNS TABLE (
  total_files bigint,
  total_chunks bigint,
  avg_chunks_per_file numeric,
  languages jsonb,
  chunk_types jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT file_path) as total_files,
    COUNT(*) as total_chunks,
    ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT file_path), 0), 2) as avg_chunks_per_file,
    jsonb_object_agg(DISTINCT language, language_count) as languages,
    jsonb_object_agg(DISTINCT chunk_type, type_count) as chunk_types
  FROM (
    SELECT 
      file_path,
      language,
      chunk_type,
      COUNT(*) OVER (PARTITION BY language) as language_count,
      COUNT(*) OVER (PARTITION BY chunk_type) as type_count
    FROM codebase_embeddings
    WHERE project_id = target_project_id
  ) stats;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_codebase_embeddings_updated_at BEFORE UPDATE
  ON codebase_embeddings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indexing_status_updated_at BEFORE UPDATE
  ON indexing_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();