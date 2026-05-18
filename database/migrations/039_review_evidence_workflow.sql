-- Systematic-review-style workflow fields on review_articles.
ALTER TABLE review_articles ADD COLUMN screening_phase TEXT DEFAULT 'title_abstract';
ALTER TABLE review_articles ADD COLUMN fulltext_screening_status TEXT;
ALTER TABLE review_articles ADD COLUMN duplicate_of_article_id TEXT;
ALTER TABLE review_articles ADD COLUMN exclusion_reason_code TEXT;
ALTER TABLE review_articles ADD COLUMN risk_of_bias_tool TEXT;
ALTER TABLE review_articles ADD COLUMN risk_of_bias_json TEXT;
ALTER TABLE review_articles ADD COLUMN grade_summary_of_findings_json TEXT;
