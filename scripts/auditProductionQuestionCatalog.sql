\pset pager off
\pset null '(null)'

CREATE TEMP TABLE audit_questions AS
SELECT t.object_key, t.object_type, t.curriculum_topic_id::text AS object_curriculum_topic_id,
       (x.ordinality-1)::integer AS question_index, x.mcq,
       NULLIF(BTRIM(x.mcq->>'question'),'') AS question_text,
       NULLIF(BTRIM(x.mcq->>'correctAnswer'),'') AS correct_answer,
       COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(x.mcq->'sourceRefs')='array' THEN x.mcq->'sourceRefs' ELSE '[]'::jsonb END),0) AS inline_ref_count,
       EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(x.mcq->'sourceRefs')='array' THEN x.mcq->'sourceRefs' ELSE '[]'::jsonb END) r(item)
         WHERE NULLIF(BTRIM(r.item->>'excerpt'),'') IS NOT NULL OR NULLIF(BTRIM(r.item->>'sourceUrl'),'') IS NOT NULL OR NULLIF(BTRIM(r.item->>'guidelineId'),'') IS NOT NULL) AS usable_inline_evidence
FROM teaching_objects t
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(t.object_payload::jsonb->'mcqs')='array' THEN t.object_payload::jsonb->'mcqs' ELSE '[]'::jsonb END)
  WITH ORDINALITY x(mcq, ordinality);
CREATE INDEX ON audit_questions(object_key, question_index);

CREATE TEMP TABLE guideline_status AS
SELECT i.object_key, i.question_index, COUNT(*) AS ref_count,
       BOOL_OR(NULLIF(BTRIM(d.full_text),'') IS NOT NULL) AS stored_document,
       BOOL_OR(NULLIF(BTRIM(d.full_text),'') IS NOT NULL AND COALESCE(d.full_text_source,'') IN ('jats','manual','nice_html')) AS stored_fulltext
FROM question_topic_index i
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_guideline_ids,'') ~ '^\s*\[' THEN i.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END) r(id)
LEFT JOIN topic_guidelines g ON g.id::text=r.id
LEFT JOIN guideline_documents d ON d.id=g.document_id
GROUP BY i.object_key,i.question_index;

CREATE TEMP TABLE paper_status AS
SELECT i.object_key, i.question_index, COUNT(*) AS ref_count,
       BOOL_OR(NULLIF(BTRIM(a.abstract),'') IS NOT NULL) AS stored_abstract
FROM question_topic_index i
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_paper_uids,'') ~ '^\s*\[' THEN i.evidence_paper_uids::jsonb ELSE '[]'::jsonb END) r(id)
LEFT JOIN article_cache a ON a.id=r.id
GROUP BY i.object_key,i.question_index;

CREATE TEMP TABLE audit_catalog AS
SELECT q.*, i.category, i.assigned_curriculum_topic_id, i.assigned_cluster_id, i.review_state, i.evidence_support,
       COALESCE(g.ref_count,0) AS guideline_ref_count, COALESCE(p.ref_count,0) AS paper_ref_count,
       COALESCE(g.stored_document,false) AS stored_guideline_document,
       COALESCE(g.stored_fulltext,false) AS stored_guideline_fulltext,
       COALESCE(p.stored_abstract,false) AS stored_paper_abstract,
       a.status AS audit_status, a.human_decision
FROM audit_questions q
LEFT JOIN question_topic_index i ON i.object_key=q.object_key AND i.question_index=q.question_index
LEFT JOIN guideline_status g ON g.object_key=q.object_key AND g.question_index=q.question_index
LEFT JOIN paper_status p ON p.object_key=q.object_key AND p.question_index=q.question_index
LEFT JOIN question_audit a ON a.object_key=q.object_key AND a.question_index=q.question_index;

\echo === QUESTION CATALOG SUMMARY ===
WITH flags AS (
 SELECT *,
   (question_text IS NOT NULL AND correct_answer IS NOT NULL AND jsonb_typeof(mcq->'options') IN ('array','object')) AS structurally_complete,
   (guideline_ref_count+paper_ref_count+inline_ref_count>0) AS has_evidence_link,
   (stored_guideline_document OR stored_paper_abstract OR usable_inline_evidence) AS has_retrievable_evidence,
   (audit_status='needs_human' AND human_decision IS NULL) AS on_audit_hold,
   (human_decision='retired' OR review_state='retired' OR category='unassignable') AS retired_or_unassignable,
   ((category='aligned' AND assigned_curriculum_topic_id IS NOT NULL AND assigned_cluster_id IS NOT NULL)
     OR (object_type='curated_topic_mcq' AND object_curriculum_topic_id IS NOT NULL)) AS properly_topic_catalogued
 FROM audit_catalog
)
SELECT COUNT(*) AS total_questions,
 COUNT(DISTINCT md5(lower(question_text))) FILTER (WHERE question_text IS NOT NULL) AS unique_question_stems,
 COUNT(*) FILTER (WHERE structurally_complete) AS structurally_complete,
 COUNT(*) FILTER (WHERE category IS NOT NULL) AS in_question_topic_index,
 COUNT(*) FILTER (WHERE properly_topic_catalogued) AS properly_topic_catalogued,
 COUNT(*) FILTER (WHERE has_evidence_link) AS with_evidence_link,
 COUNT(*) FILTER (WHERE has_retrievable_evidence) AS with_retrievable_stored_evidence,
 COUNT(*) FILTER (WHERE stored_guideline_fulltext) AS with_guideline_fulltext,
 COUNT(*) FILTER (WHERE stored_paper_abstract) AS with_paper_abstract,
 COUNT(*) FILTER (WHERE usable_inline_evidence) AS with_inline_evidence,
 COUNT(*) FILTER (WHERE on_audit_hold) AS on_audit_hold,
 COUNT(*) FILTER (WHERE human_decision='approved' OR review_state='approved') AS human_approved,
 COUNT(*) FILTER (WHERE retired_or_unassignable) AS retired_or_unassignable,
 COUNT(*) FILTER (WHERE structurally_complete AND properly_topic_catalogued AND has_evidence_link AND has_retrievable_evidence AND NOT on_audit_hold AND NOT retired_or_unassignable) AS fully_catalogued_and_eligible,
 COUNT(*) FILTER (WHERE structurally_complete AND NOT on_audit_hold AND NOT retired_or_unassignable) AS learner_eligible
FROM flags;

\echo === BREAKDOWN BY QUESTION TYPE ===
SELECT object_type, COUNT(*) AS questions,
 COUNT(*) FILTER (WHERE category IS NOT NULL) AS indexed,
 COUNT(*) FILTER (WHERE (category='aligned' AND assigned_curriculum_topic_id IS NOT NULL AND assigned_cluster_id IS NOT NULL) OR (object_type='curated_topic_mcq' AND object_curriculum_topic_id IS NOT NULL)) AS topic_catalogued,
 COUNT(*) FILTER (WHERE guideline_ref_count+paper_ref_count+inline_ref_count>0) AS evidence_linked,
 COUNT(*) FILTER (WHERE audit_status='needs_human' AND human_decision IS NULL) AS audit_hold,
 COUNT(*) FILTER (WHERE human_decision='retired' OR review_state='retired' OR category='unassignable') AS retired_or_unassignable
FROM audit_catalog GROUP BY object_type ORDER BY questions DESC;

\echo === INDEX CLASSIFICATION AND REVIEW ===
SELECT COALESCE(category,'(null)') AS category, COALESCE(review_state,'(null)') AS review_state,
 COALESCE(evidence_support,'(null)') AS evidence_support, COUNT(*) AS questions
FROM question_topic_index GROUP BY 1,2,3 ORDER BY 1,2,3;

\echo === AUDIT STATUS ===
SELECT status, COALESCE(human_decision,'(none)') AS human_decision, COUNT(*) AS questions
FROM question_audit GROUP BY 1,2 ORDER BY 1,2;

\echo === GUIDELINE DOCUMENT COVERAGE ===
SELECT COALESCE(full_text_source,'(none)') AS full_text_source, COUNT(*) AS documents,
 COUNT(*) FILTER (WHERE NULLIF(BTRIM(full_text),'') IS NOT NULL) AS with_text, SUM(COALESCE(word_count,0)) AS stored_words
FROM guideline_documents GROUP BY 1 ORDER BY 1;
