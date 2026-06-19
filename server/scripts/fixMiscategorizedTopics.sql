-- Fix 4 GI/surgical topics that were incorrectly seeded under the Neurology block.
-- Run against production Postgres:
--   psql $DATABASE_URL -f server/scripts/fixMiscategorizedTopics.sql
--
-- Safe to re-run: the WHERE clause targets only rows in a Neurology block,
-- so it is a no-op once already applied.

BEGIN;

-- Identify the correct target block (Gastroenterology).
-- Adjust the LIKE pattern if your block name differs.
DO $$
DECLARE
    gi_block_id  UUID;
    neuro_block_id UUID;
BEGIN
    SELECT id INTO gi_block_id
    FROM curriculum_blocks
    WHERE name ILIKE '%gastro%' OR name ILIKE '%gastrointestinal%'
    ORDER BY sort_order ASC
    LIMIT 1;

    IF gi_block_id IS NULL THEN
        RAISE EXCEPTION 'Gastroenterology block not found — check curriculum_blocks.name values';
    END IF;

    SELECT id INTO neuro_block_id
    FROM curriculum_blocks
    WHERE name ILIKE '%neurol%'
    ORDER BY sort_order ASC
    LIMIT 1;

    IF neuro_block_id IS NULL THEN
        RAISE EXCEPTION 'Neurology block not found — check curriculum_blocks.name values';
    END IF;

    UPDATE curriculum_topics
    SET block_id = gi_block_id
    WHERE block_id = neuro_block_id
      AND display_name ILIKE ANY (ARRAY[
          '%pancreatitis%',
          '%rectal cancer%',
          '%small bowel obstruction%',
          'SBO',
          '%spontaneous bacterial peritonitis%',
          'SBP'
      ]);

    RAISE NOTICE 'Moved % topic(s) from Neurology to Gastroenterology', FOUND;
END $$;

COMMIT;
