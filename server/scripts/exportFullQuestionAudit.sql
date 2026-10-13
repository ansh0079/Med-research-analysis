COPY (
    SELECT
        a.status AS final_status,
        CASE WHEN a.in_random_sample = 1 THEN 'yes' ELSE 'no' END AS clinician_sample,
        a.topic,
        a.object_type,
        a.object_key,
        a.question_index,
        t.object_payload::jsonb -> 'mcqs' -> a.question_index ->> 'question' AS question,
        (t.object_payload::jsonb -> 'mcqs' -> a.question_index -> 'options')::text AS options,
        COALESCE(
            t.object_payload::jsonb -> 'mcqs' -> a.question_index ->> 'correctAnswer',
            t.object_payload::jsonb -> 'mcqs' -> a.question_index ->> 'correct'
        ) AS keyed_answer,
        t.object_payload::jsonb -> 'mcqs' -> a.question_index ->> 'explanation' AS explanation,
        a.evidence AS evidence_snapshot,
        a.pre_flag_reason AS preflight_finding,
        a.stage1_verdict,
        a.stage1_severity,
        a.stage1_issues AS stage1_findings,
        a.stage1_model,
        a.stage2_verdict,
        a.stage2_severity,
        a.stage2_issues AS stage2_findings,
        a.stage2_model,
        a.human_decision,
        a.human_notes,
        a.reviewed_by,
        a.reviewed_at
    FROM question_audit a
    LEFT JOIN teaching_objects t ON t.object_key = a.object_key
    ORDER BY a.status, a.topic, a.object_key, a.question_index
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE);
