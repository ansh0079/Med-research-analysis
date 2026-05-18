# Flagship Topic QA

Flagship topics are topics where the app should feel prepared, not merely searchable. A topic only earns the user-facing `Flagship Topic - Evidence Mentor Ready` signal when the search response has stored mentor knowledge, a usable evidence bouquet, and stored guideline memory.

## Required Checks

Use this checklist before marking a topic ready for demo or commercial onboarding.

1. Search workflow
   - Search returns at least 5 relevant evidence rows.
   - `/api/search` returns `topicIntelligence`.
   - `topicIntelligence.evidenceBouquet.topPapers` has at least 3 usable papers.
   - The Evidence Bouquet shows top papers, guideline count, and the flagship badge.

2. Topic memory
   - `/api/knowledge/:topic` returns `found: true`.
   - Mentor message is clinically useful and non-prescriptive.
   - At least 3 seminal papers are stored with source indices.
   - At least 3 teaching points are stored with source indices and confidence.
   - Status is accurate: draft content must remain `ai_generated` or `human_edited`, not `human_reviewed`.

3. Guideline memory
   - `/api/guidelines?topic=:topic` returns at least 1 trusted guideline entry.
   - Source body, year, URL, population, intervention, and cautions are populated where possible.
   - Any guideline not directly topic-specific states its limitation in `cautions`.

4. Learning actions
   - `Synthesize Top 5` can use the topic's evidence bouquet.
   - `Generate MCQs` receives the same top evidence seed and topic knowledge.
   - `Generate Case` receives the top evidence seed and topic case hooks.
   - Export brief contains the topic, top papers, and synthesis summary when available.

5. Clinical quality spot checks
   - Every major clinical claim can be traced to a source index or guideline entry.
   - MCQs are case-vignette style, not simple recall only.
   - Case mode includes patient presentation, key decision point, reasoning, evidence application, and 3-5 MCQs.
   - Output includes research/education-only safety framing.

## ARDS-Specific QA Targets

ARDS should cover:

- Berlin definition and severity classification.
- Predicted-body-weight low tidal volume ventilation.
- Plateau pressure / ventilator-induced lung injury.
- Prone positioning in moderate-severe ARDS.
- Conservative fluid strategy after initial shock resuscitation.
- Selective rather than routine continuous neuromuscular blockade.
- ECMO as rescue referral in selected refractory severe ARDS.
- ECCO2R caution, including NICE research-only / do-not-use framing where applicable.

## Current ARDS Baseline

Seed command:

```bash
npm run seed:ards
```

Expected API checks:

```bash
GET /api/knowledge/ARDS
GET /api/guidelines?topic=ARDS
GET /api/search?q=ARDS&limit=5&sources=pubmed
```

Expected minimum result:

- ARDS topic knowledge exists.
- 5 seminal papers are present.
- At least 5 teaching points are exposed in `agentGuidance`.
- At least 5 guideline entries are available in `topicIntelligence.guidelineSnapshot`.
- `topicIntelligence.evidenceBouquet.count` is at least 5 when the search source returns enough results.
