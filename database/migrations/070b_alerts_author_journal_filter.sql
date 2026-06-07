-- Add author_filter and journal_filter columns to search_alerts
-- Allows alerts scoped to a specific author name or journal name in addition to the query string
ALTER TABLE search_alerts ADD COLUMN author_filter TEXT DEFAULT NULL;
ALTER TABLE search_alerts ADD COLUMN journal_filter TEXT DEFAULT NULL;
