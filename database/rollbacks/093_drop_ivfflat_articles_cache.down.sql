-- Reverses 093_drop_ivfflat_articles_cache.sql by literally recreating the
-- index it dropped.
--
-- WARNING: read 093's own migration comment before ever running this. That
-- index was benchmarked and found to silently corrupt recall at this corpus
-- size -- ivfflat's default probes=1 searched ~2% of the index and returned
-- recall 0.225 (vs 1.000 for the exact scan this migration switched to), while
-- still returning plausible-looking papers with plausible scores. There is no
-- query-time fix; recovering full recall from ivfflat here means raising
-- probes until the cost exceeds the exact scan it would replace.
--
-- This file exists to satisfy the rollback-coverage gate (`npm run
-- beta:safety`), not because reverting is advisable. If a genuine rollback is
-- ever needed, prefer dropping this index again immediately after.

CREATE INDEX IF NOT EXISTS idx_articles_cache_embedding ON articles_cache
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
