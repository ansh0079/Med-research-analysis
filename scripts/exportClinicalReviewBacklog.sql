\pset pager off

CREATE TEMP TABLE review_questions AS
WITH questions AS (
  SELECT t.object_key, t.object_type, t.topic AS stored_topic,
         t.curriculum_topic_id::text AS object_curriculum_topic_id,
         (x.ordinality - 1)::integer AS question_index, x.mcq,
         NULLIF(BTRIM(x.mcq->>'question'), '') AS question_text,
         NULLIF(BTRIM(x.mcq->>'correctAnswer'), '') AS correct_answer,
         COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(x.mcq->'sourceRefs')='array' THEN x.mcq->'sourceRefs' ELSE '[]'::jsonb END),0) AS inline_ref_count,
         EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(x.mcq->'sourceRefs')='array' THEN x.mcq->'sourceRefs' ELSE '[]'::jsonb END) r(item)
           WHERE NULLIF(BTRIM(r.item->>'excerpt'),'') IS NOT NULL OR NULLIF(BTRIM(r.item->>'sourceUrl'),'') IS NOT NULL OR NULLIF(BTRIM(r.item->>'guidelineId'),'') IS NOT NULL) AS usable_inline_evidence
  FROM teaching_objects t
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(t.object_payload::jsonb->'mcqs')='array' THEN t.object_payload::jsonb->'mcqs' ELSE '[]'::jsonb END)
    WITH ORDINALITY x(mcq, ordinality)
), guideline_status AS (
  SELECT i.object_key, i.question_index, COUNT(*) AS ref_count,
         BOOL_OR(g.id IS NOT NULL) AS stored_guideline,
         BOOL_OR(NULLIF(BTRIM(d.full_text),'') IS NOT NULL) AS stored_document,
         STRING_AGG(DISTINCT g.id::text, ' | ' ORDER BY g.id::text) FILTER (WHERE g.id IS NOT NULL) AS ids,
         STRING_AGG(DISTINCT CONCAT_WS(' — ', NULLIF(g.source_body,''), NULLIF(g.source_year::text,''), NULLIF(LEFT(g.recommendation_text,500),'')), E'\n' ORDER BY CONCAT_WS(' — ', NULLIF(g.source_body,''), NULLIF(g.source_year::text,''), NULLIF(LEFT(g.recommendation_text,500),''))) FILTER (WHERE g.id IS NOT NULL) AS evidence,
         STRING_AGG(DISTINCT COALESCE(NULLIF(g.source_url,''),NULLIF(d.source_url,'')), ' | ') FILTER (WHERE COALESCE(NULLIF(g.source_url,''),NULLIF(d.source_url,'')) IS NOT NULL) AS urls
  FROM question_topic_index i
  CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_guideline_ids,'') ~ '^\s*\[' THEN i.evidence_guideline_ids::jsonb ELSE '[]'::jsonb END) r(id)
  LEFT JOIN topic_guidelines g ON g.id::text=r.id
  LEFT JOIN guideline_documents d ON d.id=g.document_id
  GROUP BY i.object_key,i.question_index
), paper_status AS (
  SELECT i.object_key, i.question_index, COUNT(*) AS ref_count,
         BOOL_OR(NULLIF(BTRIM(a.abstract),'') IS NOT NULL) AS stored_abstract,
         STRING_AGG(DISTINCT a.id, ' | ' ORDER BY a.id) FILTER (WHERE a.id IS NOT NULL) AS ids,
         STRING_AGG(DISTINCT CONCAT_WS(' — ', NULLIF(a.title,''), NULLIF(a.publication_date::text,''), NULLIF(LEFT(a.abstract,500),'')), E'\n' ORDER BY CONCAT_WS(' — ', NULLIF(a.title,''), NULLIF(a.publication_date::text,''), NULLIF(LEFT(a.abstract,500),''))) FILTER (WHERE a.id IS NOT NULL) AS evidence
  FROM question_topic_index i
  CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN COALESCE(i.evidence_paper_uids,'') ~ '^\s*\[' THEN i.evidence_paper_uids::jsonb ELSE '[]'::jsonb END) r(id)
  LEFT JOIN article_cache a ON a.id=r.id
  GROUP BY i.object_key,i.question_index
), catalog AS (
 SELECT q.*, i.category, i.assigned_curriculum_topic_id, i.assigned_topic_name, i.assigned_cluster_id,
        i.review_state, i.reviewed_by AS index_reviewed_by, i.reviewed_at AS index_reviewed_at,
        i.review_notes, i.evidence_support, i.evidence_guideline_ids, i.evidence_paper_uids,
        i.topic_similarity, i.runner_up_similarity, i.runner_up_curriculum_topic_id, i.reasons,
        a.status AS audit_status, a.human_decision, a.reviewed_by AS audit_reviewed_by,
        a.reviewed_at AS audit_reviewed_at, a.reviewer_notes AS audit_reviewer_notes,
        COALESCE(g.ref_count,0) AS guideline_ref_count, COALESCE(p.ref_count,0) AS paper_ref_count,
        COALESCE(g.stored_guideline,false) AS stored_guideline, COALESCE(g.stored_document,false) AS stored_guideline_document,
        COALESCE(p.stored_abstract,false) AS stored_paper_abstract,
        g.ids AS guideline_ids, g.evidence AS guideline_evidence, g.urls AS guideline_urls,
        p.ids AS paper_ids, p.evidence AS paper_evidence,
        ct.display_name AS object_curriculum_topic, runner.display_name AS runner_up_topic
 FROM questions q
 LEFT JOIN question_topic_index i USING (object_key,question_index)
 LEFT JOIN question_audit a USING (object_key,question_index)
 LEFT JOIN guideline_status g USING (object_key,question_index)
 LEFT JOIN paper_status p USING (object_key,question_index)
 LEFT JOIN curriculum_topics ct ON ct.id::text=q.object_curriculum_topic_id
 LEFT JOIN curriculum_topics runner ON runner.id::text=i.runner_up_curriculum_topic_id
), flags AS (
 SELECT *,
   (question_text IS NOT NULL AND correct_answer IS NOT NULL AND jsonb_typeof(mcq->'options') IN ('array','object')) AS structurally_complete,
   (guideline_ref_count+paper_ref_count+inline_ref_count>0) AS has_evidence_link,
   (stored_guideline OR stored_paper_abstract OR usable_inline_evidence) AS has_retrievable_evidence,
   ((category='aligned' AND assigned_curriculum_topic_id IS NOT NULL AND assigned_cluster_id IS NOT NULL) OR (object_type='curated_topic_mcq' AND object_curriculum_topic_id IS NOT NULL)) AS properly_topic_catalogued,
   COALESCE(audit_status='needs_human' AND human_decision IS NULL,false) AS explicit_audit_hold,
   COALESCE(audit_status='human_approved' AND human_decision='approved',false) AS explicit_human_approval,
   COALESCE(human_decision='approved' OR review_state='approved',false) AS legacy_approval,
   COALESCE(human_decision='retired' OR review_state='retired' OR category='unassignable',false) AS retired_or_unassignable,
   (question_text ~* '(^|[^a-z])(dose|dosage|mg|mcg|microgram|mmol|ml/kg|units?(/| per )|target (range|level)|within [0-9]+|[0-9]+ (minute|hour|day|week))') AS numerical_or_timing,
   (COALESCE(question_text,'') || ' ' || COALESCE(assigned_topic_name,stored_topic,'')) ~* '(anticoag|warfarin|heparin|thrombol|pregnan|obstetric|paediatr|pediatr|neonat|infant|child|sepsis|shock|resuscitat|intubat|ventilat|chemotherap|oncolog|contraindicat|intracranial|traumatic brain|meningitis)' AS high_risk_domain
 FROM catalog
)
SELECT *,
  md5(lower(COALESCE(question_text,''))) AS stem_hash,
  md5(COALESCE(guideline_ids,'') || '||' || COALESCE(paper_ids,'')) AS evidence_group_id,
  CASE WHEN numerical_or_timing AND high_risk_domain THEN 'P0'
       WHEN high_risk_domain OR numerical_or_timing THEN 'P1'
       ELSE 'P2' END AS clinical_priority,
  CONCAT_WS('; ',
    CASE WHEN NOT structurally_complete THEN 'STRUCTURE' END,
    CASE WHEN NOT properly_topic_catalogued THEN 'TOPIC' END,
    CASE WHEN NOT has_evidence_link THEN 'MISSING_EVIDENCE_LINK' END,
    CASE WHEN has_evidence_link AND NOT has_retrievable_evidence THEN 'EVIDENCE_UNRETRIEVABLE' END,
    CASE WHEN explicit_audit_hold THEN 'EXPLICIT_AUDIT_HOLD' END,
    CASE WHEN review_state='approved' AND NOT explicit_human_approval THEN 'APPROVAL_PROVENANCE' END
  ) AS issue_flags,
  CASE WHEN NOT structurally_complete OR NOT has_evidence_link OR NOT has_retrievable_evidence THEN 'REPAIR_FIRST'
       WHEN NOT properly_topic_catalogued OR explicit_audit_hold THEN 'CLINICIAN_DETAILED'
       WHEN numerical_or_timing OR high_risk_domain THEN 'CLINICIAN_DETAILED'
       ELSE 'CLINICIAN_FAST' END AS review_route
FROM flags;

\echo === COHORT RECONCILIATION ===
SELECT COUNT(*) AS total,
 COUNT(*) FILTER (WHERE legacy_approval) AS legacy_approved,
 COUNT(*) FILTER (WHERE explicit_human_approval) AS explicit_human_approved,
 COUNT(*) FILTER (WHERE legacy_approval AND NOT explicit_human_approval) AS approval_provenance_exceptions,
 COUNT(*) FILTER (WHERE retired_or_unassignable) AS retired_or_unassignable,
 COUNT(*) FILTER (WHERE NOT retired_or_unassignable AND NOT legacy_approval) AS active_legacy_unapproved,
 COUNT(*) FILTER (WHERE NOT retired_or_unassignable AND NOT explicit_human_approval) AS strict_clinical_review_backlog
FROM review_questions;

COPY (
 SELECT clinical_priority, review_route, issue_flags, explicit_audit_hold,
   CASE WHEN explicit_human_approval THEN 'verified_human' WHEN legacy_approval THEN 'legacy_or_workflow' ELSE 'unapproved' END AS approval_provenance,
   object_key, question_index, object_type, stem_hash, evidence_group_id,
   COALESCE(assigned_topic_name,object_curriculum_topic,stored_topic) AS assigned_topic,
   runner_up_topic, topic_similarity, runner_up_similarity, category, review_state, audit_status,
   question_text AS question, mcq->'options' AS options, correct_answer, mcq->>'explanation' AS explanation,
   guideline_ids, guideline_evidence, guideline_urls, paper_ids, paper_evidence, mcq->'sourceRefs' AS inline_source_refs,
   evidence_support, reasons, index_reviewed_by, index_reviewed_at, audit_reviewed_by, audit_reviewed_at,
   NULL::text AS reviewer_decision, NULL::text AS corrected_answer, NULL::text AS corrected_question,
   NULL::text AS reviewer_name, NULL::text AS reviewer_notes
 FROM review_questions
 WHERE NOT retired_or_unassignable AND NOT legacy_approval
 ORDER BY CASE clinical_priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END,
          CASE review_route WHEN 'REPAIR_FIRST' THEN 0 WHEN 'CLINICIAN_DETAILED' THEN 1 ELSE 2 END,
          evidence_group_id, assigned_topic, object_key, question_index
) TO '/tmp/signal-md-clinical-review-master.csv' WITH CSV HEADER;

COPY (
 SELECT * FROM (
   SELECT clinical_priority, review_route, issue_flags, explicit_audit_hold, object_key, question_index,
     COALESCE(assigned_topic_name,object_curriculum_topic,stored_topic) AS assigned_topic,
     evidence_group_id, question_text AS question, mcq->'options' AS options, correct_answer,
     mcq->>'explanation' AS explanation, guideline_evidence, guideline_urls, paper_evidence,
     NULL::text AS reviewer_decision, NULL::text AS corrected_answer, NULL::text AS reviewer_name, NULL::text AS reviewer_notes
   FROM review_questions
   WHERE NOT retired_or_unassignable AND NOT legacy_approval
   ORDER BY CASE clinical_priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END,
            CASE review_route WHEN 'REPAIR_FIRST' THEN 0 WHEN 'CLINICIAN_DETAILED' THEN 1 ELSE 2 END,
            evidence_group_id, assigned_topic
   LIMIT 250
 ) batch
) TO '/tmp/signal-md-clinical-review-batch-001.csv' WITH CSV HEADER;

COPY (
 SELECT evidence_group_id, guideline_ids, paper_ids,
   COUNT(*) AS questions,
   COUNT(*) FILTER (WHERE clinical_priority='P0') AS p0,
   COUNT(*) FILTER (WHERE clinical_priority='P1') AS p1,
   STRING_AGG(DISTINCT COALESCE(assigned_topic_name,object_curriculum_topic,stored_topic), ' | ') AS topics,
   MAX(guideline_evidence) AS guideline_evidence, MAX(guideline_urls) AS guideline_urls, MAX(paper_evidence) AS paper_evidence
 FROM review_questions
 WHERE NOT retired_or_unassignable AND NOT legacy_approval
 GROUP BY evidence_group_id,guideline_ids,paper_ids
 ORDER BY p0 DESC,p1 DESC,questions DESC,evidence_group_id
) TO '/tmp/signal-md-clinical-review-evidence-groups.csv' WITH CSV HEADER;

COPY (
 SELECT clinical_priority, review_route, issue_flags, object_key, question_index,
   COALESCE(assigned_topic_name,object_curriculum_topic,stored_topic) AS assigned_topic,
   question_text AS question, correct_answer, guideline_evidence, guideline_urls, paper_evidence,
   review_state, index_reviewed_by, index_reviewed_at, audit_status, audit_reviewed_by, audit_reviewed_at
 FROM review_questions
 WHERE NOT retired_or_unassignable AND legacy_approval AND NOT explicit_human_approval
 ORDER BY CASE clinical_priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END,assigned_topic
) TO '/tmp/signal-md-approval-provenance-exceptions.csv' WITH CSV HEADER;
