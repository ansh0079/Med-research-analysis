\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE queue_questions AS
SELECT t.object_key,t.object_type,t.topic AS object_topic,t.curriculum_topic_id::text AS object_topic_id,
 (x.ordinality-1)::integer AS question_index,x.mcq,
 COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(x.mcq->'sourceRefs')='array' THEN x.mcq->'sourceRefs' ELSE '[]'::jsonb END),0) inline_refs,
 EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(x.mcq->'sourceRefs')='array' THEN x.mcq->'sourceRefs' ELSE '[]'::jsonb END) r(item)
   WHERE NULLIF(BTRIM(r.item->>'excerpt'),'') IS NOT NULL OR NULLIF(BTRIM(r.item->>'sourceUrl'),'') IS NOT NULL) usable_inline
FROM teaching_objects t
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(t.object_payload::jsonb->'mcqs')='array' THEN t.object_payload::jsonb->'mcqs' ELSE '[]'::jsonb END)
 WITH ORDINALITY x(mcq,ordinality);

CREATE TEMP TABLE queue_guidelines AS
SELECT i.object_key,i.question_index,COUNT(*) refs,BOOL_OR(g.id IS NOT NULL) resolved
FROM question_topic_index i
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_guideline_ids,'') ~ '^\s*\[' THEN i.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END) r(id)
LEFT JOIN topic_guidelines g ON g.id::text=r.id GROUP BY i.object_key,i.question_index;

CREATE TEMP TABLE queue_papers AS
SELECT i.object_key,i.question_index,COUNT(*) refs,BOOL_OR(NULLIF(BTRIM(a.abstract),'') IS NOT NULL) resolved
FROM question_topic_index i
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_paper_uids,'') ~ '^\s*\[' THEN i.evidence_paper_uids::jsonb ELSE '[]'::jsonb END) r(id)
LEFT JOIN article_cache a ON a.id=r.id GROUP BY i.object_key,i.question_index;

CREATE TEMP TABLE queue_candidates AS
SELECT q.*,i.category,i.assigned_curriculum_topic_id,i.assigned_cluster_id,i.assigned_topic_name,i.review_state,i.evidence_support,
 COALESCE(g.refs,0) guideline_refs,COALESCE(p.refs,0) paper_refs,COALESCE(g.resolved,false) guideline_resolved,
 COALESCE(p.resolved,false) paper_resolved,a.status audit_status,a.human_decision
FROM queue_questions q
LEFT JOIN question_topic_index i ON i.object_key=q.object_key AND i.question_index=q.question_index
LEFT JOIN queue_guidelines g ON g.object_key=q.object_key AND g.question_index=q.question_index
LEFT JOIN queue_papers p ON p.object_key=q.object_key AND p.question_index=q.question_index
LEFT JOIN question_audit a ON a.object_key=q.object_key AND a.question_index=q.question_index;

INSERT INTO question_work_queue (object_key,question_index,cohort,status,topic,evidence_kind,reason,created_at,updated_at)
SELECT object_key,question_index,'factual_review','queued',COALESCE(assigned_topic_name,object_topic),
 CASE WHEN guideline_refs>0 AND paper_refs>0 THEN 'both' WHEN guideline_refs>0 THEN 'guideline' WHEN paper_refs>0 THEN 'paper' ELSE 'inline' END,
 'Technically complete, canonically assigned, and linked to stored evidence; requires factual review',NOW()::text,NOW()::text
FROM queue_candidates
WHERE NULLIF(BTRIM(mcq->>'question'),'') IS NOT NULL AND NULLIF(BTRIM(mcq->>'correctAnswer'),'') IS NOT NULL
 AND jsonb_typeof(mcq->'options') IN ('array','object')
 AND ((category='aligned' AND assigned_curriculum_topic_id IS NOT NULL AND assigned_cluster_id IS NOT NULL) OR (object_type='curated_topic_mcq' AND object_topic_id IS NOT NULL))
 AND guideline_refs+paper_refs+inline_refs>0 AND (guideline_resolved OR paper_resolved OR usable_inline)
 AND NOT COALESCE(audit_status='needs_human' AND human_decision IS NULL,false)
 AND NOT (COALESCE(human_decision='retired',false) OR COALESCE(review_state='retired',false) OR COALESCE(category='unassignable',false))
ON CONFLICT (object_key,question_index,cohort) DO UPDATE SET topic=EXCLUDED.topic,evidence_kind=EXCLUDED.evidence_kind,reason=EXCLUDED.reason,updated_at=EXCLUDED.updated_at;

INSERT INTO question_work_queue (object_key,question_index,cohort,status,topic,evidence_kind,reason,created_at,updated_at)
SELECT object_key,question_index,'topic_repair','queued',COALESCE(assigned_topic_name,object_topic),evidence_support,
 'Evidence-supported question with unclear canonical topic assignment',NOW()::text,NOW()::text
FROM queue_candidates WHERE category='unclear' AND evidence_support IN ('guideline','paper','both') AND review_state='unreviewed'
ON CONFLICT (object_key,question_index,cohort) DO UPDATE SET topic=EXCLUDED.topic,evidence_kind=EXCLUDED.evidence_kind,reason=EXCLUDED.reason,updated_at=EXCLUDED.updated_at;

COMMIT;
SELECT cohort,status,COUNT(*) AS questions FROM question_work_queue GROUP BY 1,2 ORDER BY 1,2;
