\pset pager off
\pset null '(null)'

\echo === QUESTION CATALOG SUMMARY ===
WITH questions AS (
    SELECT t.object_key,
           t.object_type,
           t.topic,
           t.curriculum_topic_id::text AS object_curriculum_topic_id,
           (x.ordinality - 1)::integer AS question_index,
           x.mcq,
           NULLIF(BTRIM(x.mcq->>'question'), '') AS question_text,
           NULLIF(BTRIM(x.mcq->>'correctAnswer'), '') AS correct_answer
    FROM teaching_objects t
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(t.object_payload::jsonb->'mcqs') = 'array'
                THEN t.object_payload::jsonb->'mcqs'
            ELSE '[]'::jsonb
        END
    ) WITH ORDINALITY AS x(mcq, ordinality)
), catalog AS (
    SELECT q.*,
           i.category,
           i.assigned_curriculum_topic_id,
           i.assigned_cluster_id,
           i.review_state,
           i.evidence_support,
           COALESCE(jsonb_array_length(CASE WHEN COALESCE(i.evidence_guideline_ids, '') ~ '^\s*\[' THEN i.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END), 0) AS guideline_ref_count,
           COALESCE(jsonb_array_length(CASE WHEN COALESCE(i.evidence_paper_uids, '') ~ '^\s*\[' THEN i.evidence_paper_uids::jsonb ELSE '[]'::jsonb END), 0) AS paper_ref_count,
           COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(q.mcq->'sourceRefs') = 'array' THEN q.mcq->'sourceRefs' ELSE '[]'::jsonb END), 0) AS inline_ref_count,
           EXISTS (
               SELECT 1
               FROM jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_guideline_ids, '') ~ '^\s*\[' THEN i.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END) ref(id)
               JOIN topic_guidelines g ON g.id::text = ref.id
           ) AS stored_guideline,
           EXISTS (
               SELECT 1
               FROM jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_guideline_ids, '') ~ '^\s*\[' THEN i.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END) ref(id)
               JOIN topic_guidelines g ON g.id::text = ref.id
               JOIN guideline_documents d ON d.id = g.document_id
               WHERE NULLIF(BTRIM(d.full_text), '') IS NOT NULL
           ) AS stored_guideline_document,
           EXISTS (
               SELECT 1
               FROM jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_guideline_ids, '') ~ '^\s*\[' THEN i.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END) ref(id)
               JOIN topic_guidelines g ON g.id::text = ref.id
               JOIN guideline_documents d ON d.id = g.document_id
               WHERE NULLIF(BTRIM(d.full_text), '') IS NOT NULL
                 AND COALESCE(d.full_text_source, '') IN ('jats', 'manual', 'nice_html')
           ) AS stored_guideline_fulltext,
           EXISTS (
               SELECT 1
               FROM jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_paper_uids, '') ~ '^\s*\[' THEN i.evidence_paper_uids::jsonb ELSE '[]'::jsonb END) ref(id)
               JOIN article_cache a ON a.id = ref.id
               WHERE NULLIF(BTRIM(a.abstract), '') IS NOT NULL
           ) AS stored_paper_abstract,
           EXISTS (
               SELECT 1
               FROM jsonb_array_elements(CASE WHEN jsonb_typeof(q.mcq->'sourceRefs') = 'array' THEN q.mcq->'sourceRefs' ELSE '[]'::jsonb END) ref(item)
               WHERE NULLIF(BTRIM(ref.item->>'excerpt'), '') IS NOT NULL
                  OR NULLIF(BTRIM(ref.item->>'sourceUrl'), '') IS NOT NULL
                  OR NULLIF(BTRIM(ref.item->>'guidelineId'), '') IS NOT NULL
           ) AS usable_inline_evidence,
           a.status AS audit_status,
           a.human_decision
    FROM questions q
    LEFT JOIN question_topic_index i
      ON i.object_key = q.object_key AND i.question_index = q.question_index
    LEFT JOIN question_audit a
      ON a.object_key = q.object_key AND a.question_index = q.question_index
), flags AS (
    SELECT *,
           (question_text IS NOT NULL
             AND correct_answer IS NOT NULL
             AND jsonb_typeof(mcq->'options') IN ('array', 'object')) AS structurally_complete,
           (guideline_ref_count + paper_ref_count + inline_ref_count > 0) AS has_evidence_link,
           (stored_guideline_document OR stored_paper_abstract OR usable_inline_evidence) AS has_retrievable_evidence,
           (audit_status = 'needs_human' AND human_decision IS NULL) AS on_audit_hold,
           (human_decision = 'retired' OR review_state = 'retired' OR category = 'unassignable') AS retired_or_unassignable,
           ((category = 'aligned' AND assigned_curriculum_topic_id IS NOT NULL AND assigned_cluster_id IS NOT NULL)
             OR (object_type = 'curated_topic_mcq' AND object_curriculum_topic_id IS NOT NULL)) AS properly_topic_catalogued
    FROM catalog
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
       COUNT(*) FILTER (WHERE human_decision = 'approved' OR review_state = 'approved') AS human_approved,
       COUNT(*) FILTER (WHERE retired_or_unassignable) AS retired_or_unassignable,
       COUNT(*) FILTER (WHERE structurally_complete AND properly_topic_catalogued AND has_evidence_link AND has_retrievable_evidence AND NOT on_audit_hold AND NOT retired_or_unassignable) AS fully_catalogued_and_eligible,
       COUNT(*) FILTER (WHERE structurally_complete AND NOT on_audit_hold AND NOT retired_or_unassignable) AS learner_eligible
FROM flags;

\echo === BREAKDOWN BY QUESTION TYPE ===
WITH questions AS (
    SELECT t.object_key, t.object_type, t.curriculum_topic_id::text AS object_curriculum_topic_id,
           (x.ordinality - 1)::integer AS question_index, x.mcq
    FROM teaching_objects t
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(t.object_payload::jsonb->'mcqs') = 'array' THEN t.object_payload::jsonb->'mcqs' ELSE '[]'::jsonb END)
      WITH ORDINALITY AS x(mcq, ordinality)
), rows AS (
    SELECT q.*,
           i.category, i.assigned_curriculum_topic_id, i.assigned_cluster_id, i.review_state,
           a.status AS audit_status, a.human_decision,
           COALESCE(jsonb_array_length(CASE WHEN COALESCE(i.evidence_guideline_ids, '') ~ '^\s*\[' THEN i.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END), 0)
             + COALESCE(jsonb_array_length(CASE WHEN COALESCE(i.evidence_paper_uids, '') ~ '^\s*\[' THEN i.evidence_paper_uids::jsonb ELSE '[]'::jsonb END), 0)
             + COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(q.mcq->'sourceRefs') = 'array' THEN q.mcq->'sourceRefs' ELSE '[]'::jsonb END), 0) AS evidence_refs
    FROM questions q
    LEFT JOIN question_topic_index i ON i.object_key=q.object_key AND i.question_index=q.question_index
    LEFT JOIN question_audit a ON a.object_key=q.object_key AND a.question_index=q.question_index
)
SELECT object_type,
       COUNT(*) AS questions,
       COUNT(*) FILTER (WHERE category IS NOT NULL) AS indexed,
       COUNT(*) FILTER (WHERE (category='aligned' AND assigned_curriculum_topic_id IS NOT NULL AND assigned_cluster_id IS NOT NULL)
                              OR (object_type='curated_topic_mcq' AND object_curriculum_topic_id IS NOT NULL)) AS topic_catalogued,
       COUNT(*) FILTER (WHERE evidence_refs > 0) AS evidence_linked,
       COUNT(*) FILTER (WHERE audit_status='needs_human' AND human_decision IS NULL) AS audit_hold,
       COUNT(*) FILTER (WHERE human_decision='retired' OR review_state='retired' OR category='unassignable') AS retired_or_unassignable
FROM rows GROUP BY object_type ORDER BY questions DESC;

\echo === INDEX CLASSIFICATION AND REVIEW ===
SELECT COALESCE(category, '(null)') AS category,
       COALESCE(review_state, '(null)') AS review_state,
       COALESCE(evidence_support, '(null)') AS evidence_support,
       COUNT(*) AS questions
FROM question_topic_index
GROUP BY 1,2,3 ORDER BY 1,2,3;

\echo === AUDIT STATUS ===
SELECT status, COALESCE(human_decision, '(none)') AS human_decision, COUNT(*) AS questions
FROM question_audit GROUP BY 1,2 ORDER BY 1,2;

\echo === GUIDELINE DOCUMENT COVERAGE ===
SELECT COALESCE(full_text_source, '(none)') AS full_text_source,
       COUNT(*) AS documents,
       COUNT(*) FILTER (WHERE NULLIF(BTRIM(full_text), '') IS NOT NULL) AS with_text,
       SUM(COALESCE(word_count, 0)) AS stored_words
FROM guideline_documents GROUP BY 1 ORDER BY 1;

