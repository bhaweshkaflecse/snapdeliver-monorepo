-- search_wedding_photos: Find photos by face similarity using cosine distance
-- Uses the <=> operator from pgvector for cosine similarity search
CREATE OR REPLACE FUNCTION search_wedding_photos(
    query_embedding vector(512),
    match_threshold float DEFAULT 0.8,
    match_count int DEFAULT 10,
    target_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    photo_id UUID,
    event_id UUID,
    original_key TEXT,
    social_key TEXT,
    thumbnail_key TEXT,
    metadata_json JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fe.id,
        fe.photo_id,
        p.event_id,
        p.original_key,
        p.social_key,
        p.thumbnail_key,
        p.metadata_json,
        1 - (fe.embedding <=> query_embedding) AS similarity
    FROM face_embeddings fe
    INNER JOIN photos p ON p.id = fe.photo_id
    WHERE 1 - (fe.embedding <=> query_embedding) > match_threshold
        AND (target_event_id IS NULL OR p.event_id = target_event_id)
    ORDER BY fe.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;
