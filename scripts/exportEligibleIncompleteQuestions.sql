\pset pager off

CREATE TEMP TABLE eligible_incomplete AS
WITH questions AS (
  SELECT t.object_key, t.object_type, t.topic AS stored_topic,
         t.curriculum_topic_id::text AS object_curriculum_topic_id,
         (x.ordinality - 1)::integer AS question_index, x.mcq,
         NULLIF(BTRIM(x.mcq->>'question'), '') AS question_text,
         NULLIF(BTRIM(x.mcq->>'correctAnswer'), '') AS correct_answer,
         COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(x.mcq->'sourceRefs')='array' THEN x.mcq->'sourceRefs' ELSE '[]'::jsonb END),0) AS inline_ref_count,
         EXISTS (
           SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(x.mcq->'sourceRefs')='array' THEN x.mcq->'sourceRefs' ELSE '[]'::jsonb END) r(item)
           WHERE NULLIF(BTRIM(r.item->>'excerpt'),'') IS NOT NULL
              OR NULLIF(BTRIM(r.item->>'sourceUrl'),'') IS NOT NULL
              OR NULLIF(BTRIM(r.item->>'guidelineId'),'') IS NOT NULL
         ) AS usable_inline_evidence
  FROM teaching_objects t
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(t.object_payload::jsonb->'mcqs')='array' THEN t.object_payload::jsonb->'mcqs' ELSE '[]'::jsonb END
  ) WITH ORDINALITY x(mcq, ordinality)
), guideline_status AS (
  SELECT i.object_key, i.question_index, COUNT(*) AS ref_count,
         BOOL_OR(g.id IS NOT NULL) AS stored_guideline,
         BOOL_OR(NULLIF(BTRIM(d.full_text),'') IS NOT NULL AND COALESCE(d.full_text_source,'') IN ('jats','manual','nice_html')) AS stored_fulltext
  FROM question_topic_index i
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN COALESCE(i.evidence_guideline_ids,'') ~ '^\s*\[' THEN i.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END
  ) r(id)
  LEFT JOIN topic_guidelines g ON g.id::text=r.id
  LEFT JOIN guideline_documents d ON d.id=g.document_id
  GROUP BY i.object_key,i.question_index
), paper_status AS (
  SELECT i.object_key, i.question_index, COUNT(*) AS ref_count,
         BOOL_OR(NULLIF(BTRIM(a.abstract),'') IS NOT NULL) AS stored_abstract
  FROM question_topic_index i
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN COALESCE(i.evidence_paper_uids,'') ~ '^\s*\[' THEN i.evidence_paper_uids::jsonb ELSE '[]'::jsonb END
  ) r(id)
  LEFT JOIN article_cache a ON a.id=r.id
  GROUP BY i.object_key,i.question_index
), catalog AS (
  SELECT q.*, i.category, i.assigned_curriculum_topic_id, i.assigned_topic_name,
         i.assigned_cluster_id, i.review_state, i.evidence_support,
         i.evidence_guideline_ids, i.evidence_paper_uids,
         COALESCE(g.ref_count,0) AS guideline_ref_count,
         COALESCE(p.ref_count,0) AS paper_ref_count,
         COALESCE(g.stored_guideline,false) AS stored_guideline,
         COALESCE(g.stored_fulltext,false) AS stored_guideline_fulltext,
         COALESCE(p.stored_abstract,false) AS stored_paper_abstract,
         a.status AS audit_status, a.human_decision,
         ct.display_name AS object_curriculum_topic
  FROM questions q
  LEFT JOIN question_topic_index i USING (object_key, question_index)
  LEFT JOIN guideline_status g USING (object_key, question_index)
  LEFT JOIN paper_status p USING (object_key, question_index)
  LEFT JOIN question_audit a USING (object_key, question_index)
  LEFT JOIN curriculum_topics ct ON ct.id::text=q.object_curriculum_topic_id
), flags AS (
  SELECT *,
    (question_text IS NOT NULL AND correct_answer IS NOT NULL AND jsonb_typeof(mcq->'options') IN ('array','object')) AS structurally_complete,
    (guideline_ref_count+paper_ref_count+inline_ref_count>0) AS has_evidence_link,
    (stored_guideline OR stored_paper_abstract OR usable_inline_evidence) AS has_retrievable_evidence,
    COALESCE(audit_status='needs_human' AND human_decision IS NULL,false) AS on_audit_hold,
    (COALESCE(human_decision='retired',false) OR COALESCE(review_state='retired',false) OR COALESCE(category='unassignable',false)) AS retired_or_unassignable,
    ((category='aligned' AND assigned_curriculum_topic_id IS NOT NULL AND assigned_cluster_id IS NOT NULL)
      OR (object_type='curated_topic_mcq' AND object_curriculum_topic_id IS NOT NULL)) AS properly_topic_catalogued
  FROM catalog
)
SELECT * FROM flags
WHERE structurally_complete
  AND NOT on_audit_hold
  AND NOT retired_or_unassignable
  AND NOT (properly_topic_catalogued AND has_evidence_link AND has_retrievable_evidence);

\echo === ELIGIBLE INCOMPLETE SUMMARY ===
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE NOT properly_topic_catalogued) AS topic_incomplete,
       COUNT(*) FILTER (WHERE NOT has_evidence_link) AS missing_evidence_link,
       COUNT(*) FILTER (WHERE has_evidence_link AND NOT has_retrievable_evidence) AS linked_evidence_unretrievable
FROM eligible_incomplete;

COPY (
  SELECT e.object_key, e.question_index, e.object_type,
         CONCAT_WS('; ',
           CASE WHEN NOT e.properly_topic_catalogued THEN 'TOPIC_CATALOGUE' END,
           CASE WHEN NOT e.has_evidence_link THEN 'MISSING_EVIDENCE_LINK' END,
           CASE WHEN e.has_evidence_link AND NOT e.has_retrievable_evidence THEN 'EVIDENCE_UNRETRIEVABLE' END
         ) AS repair_requirements,
         e.category, e.review_state, e.stored_topic, e.assigned_topic_name, e.object_curriculum_topic,
         e.assigned_curriculum_topic_id, e.assigned_cluster_id, e.evidence_support,
         e.question_text AS question, e.mcq->'options' AS options, e.correct_answer,
         e.mcq->>'explanation' AS explanation, e.mcq->'sourceRefs' AS inline_source_refs,
         e.evidence_guideline_ids, e.evidence_paper_uids,
         COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'id',g.id,'source_body',g.source_body,'source_year',g.source_year,'source_url',g.source_url,
           'recommendation',g.recommendation_text,'status',g.status,'document_title',d.title,
           'document_url',d.source_url,'full_text_source',d.full_text_source))
           FROM jsonb_array_elements_text(CASE WHEN COALESCE(e.evidence_guideline_ids,'') ~ '^\s*\[' THEN e.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END) ids(id)
           LEFT JOIN topic_guidelines g ON g.id::text=ids.id
           LEFT JOIN guideline_documents d ON d.id=g.document_id),'[]'::jsonb) AS guidelines,
         COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'id',a.id,'title',a.title,'publication_date',a.publication_date,'journal',a.journal,
           'abstract',LEFT(COALESCE(a.abstract,''),12000),'is_retracted',a.is_retracted))
           FROM jsonb_array_elements_text(CASE WHEN COALESCE(e.evidence_paper_uids,'') ~ '^\s*\[' THEN e.evidence_paper_uids::jsonb ELSE '[]'::jsonb END) ids(id)
           LEFT JOIN article_cache a ON a.id=ids.id),'[]'::jsonb) AS papers
  FROM eligible_incomplete e
  ORDER BY repair_requirements, object_type, object_key, question_index
) TO '/tmp/signal-md-eligible-incomplete-questions.csv' WITH CSV HEADER;

