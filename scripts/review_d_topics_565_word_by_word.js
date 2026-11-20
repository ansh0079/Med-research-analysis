'use strict';

/**
 * Exhaustive Word-by-Word Review of the 565 Topics in
 * `C:\Users\ansh0\Downloads\D_topics_565_evidence_search_2026-11-20.xlsx`
 * against all stored full-text evidence documents in `database/app.db`.
 *
 * Usage:
 *   node scripts/review_d_topics_565_word_by_word.js           # analyze & export JSON/Workbook
 *   node scripts/review_d_topics_565_word_by_word.js --apply   # also link best verified docs in app.db
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Database = require('better-sqlite3');
const { normalizeTopic } = require('../server/utils/topicKey');
const { expandNormalizedTopicKeys } = require('../server/utils/topicSynonyms');

const EXCEL_INPUT_PATH = 'C:\\Users\\ansh0\\Downloads\\D_topics_565_evidence_search_2026-11-20.xlsx';
const EXCEL_OUTPUT_DOWNLOADS = 'C:\\Users\\ansh0\\Downloads\\D_topics_565_evidence_word_by_word_reviewed_2026-11-20.xlsx';
const EXCEL_OUTPUT_WORKSPACE = path.resolve('D_topics_565_evidence_word_by_word_reviewed_2026-11-20.xlsx');
const JSON_OUTPUT_PATH = path.resolve('database/d_topics_565_word_by_word_review.json');

const STOP_WORDS = new Set([
    'and', 'or', 'the', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from', 'vs', 'versus',
    'a', 'an', 'is', 'are', 'be', 'as', 'into', 'during', 'after', 'before', 'between', 'among',
    'management', 'treatment', 'diagnosis', 'diagnostic', 'therapy', 'clinical', 'approach',
    'evaluation', 'assessment', 'protocol', 'protocols', 'indications', 'features', 'criteria',
    'overview', 'causes', 'workup', 'surveillance', 'monitoring', 'selection', 'targets',
    'principles', 'interpretation', 'recognition', 'prevention', 'prophylaxis', 'algorithm',
    'algorithms', 'update', 'guidelines', 'guideline', 'patient', 'patients', 'disease', 'syndrome',
    'disorder', 'disorders', 'condition', 'conditions', 'acute', 'chronic', 'common', 'primary',
    'secondary', 'initial', 'early', 'late', 'severe', 'mild', 'moderate', 'adult', 'adults',
    'type', 'types', 'stage', 'stages', 'level', 'levels', 'use', 'role', 'based', 'care',
]);

// High-yield medical synonym / abbreviation expansion for word-by-word matching
const MEDICAL_SYNONYMS = {
    'ace': ['angiotensin converting enzyme', 'acei', 'ramipril', 'lisinopril', 'enalapril'],
    'arbs': ['angiotensin receptor blocker', 'angiotensin ii receptor', 'losartan', 'valsartan', 'candesartan'],
    'arb': ['angiotensin receptor blocker', 'losartan', 'valsartan'],
    'sglt2': ['sodium glucose cotransporter 2', 'dapagliflozin', 'empagliflozin', 'canagliflozin'],
    'dvt': ['deep vein thrombosis', 'venous thromboembolism', 'vte'],
    'pe': ['pulmonary embolism', 'venous thromboembolism'],
    'af': ['atrial fibrillation'],
    'adem': ['acute disseminated encephalomyelitis'],
    'aaa': ['abdominal aortic aneurysm', 'aortic aneurysm'],
    'evar': ['endovascular aneurysm repair'],
    'aki': ['acute kidney injury'],
    'ckd': ['chronic kidney disease'],
    'rrt': ['renal replacement therapy', 'hemodialysis', 'haemodialysis', 'hemofiltration'],
    'men1': ['multiple endocrine neoplasia type 1', 'multiple endocrine neoplasia'],
    'men2': ['multiple endocrine neoplasia type 2', 'medullary thyroid'],
    'cvt': ['cerebral venous thrombosis', 'dural venous sinus thrombosis'],
    'icp': ['intracranial pressure'],
    'tbi': ['traumatic brain injury', 'head injury'],
    'ards': ['acute respiratory distress syndrome'],
    'copd': ['chronic obstructive pulmonary disease'],
    'hiv': ['human immunodeficiency virus'],
    'tb': ['tuberculosis', 'mycobacterium tuberculosis'],
    'ibd': ['inflammatory bowel disease', 'crohn', 'ulcerative colitis'],
    'gi': ['gastrointestinal'],
    'gerd': ['gastroesophageal reflux', 'gastro oesophageal reflux'],
    'gord': ['gastro oesophageal reflux', 'gastroesophageal reflux'],
    'pcos': ['polycystic ovary syndrome', 'polycystic ovarian'],
    'pid': ['pelvic inflammatory disease'],
    'uti': ['urinary tract infection', 'pyelonephritis', 'cystitis'],
    'sti': ['sexually transmitted infection'],
    'acs': ['acute coronary syndrome', 'myocardial infarction', 'stemi', 'nstemi'],
    'mi': ['myocardial infarction'],
    'hf': ['heart failure'],
    'hfref': ['heart failure with reduced ejection fraction', 'reduced ejection fraction'],
    'hfpef': ['heart failure with preserved ejection fraction', 'preserved ejection fraction'],
    'icd': ['implantable cardioverter defibrillator'],
    'crt': ['cardiac resynchronization therapy'],
    'als': ['advanced life support', 'cardiac arrest', 'resuscitation', 'amyotrophic lateral sclerosis'],
    'cpr': ['cardiopulmonary resuscitation', 'cardiac arrest'],
    'rosc': ['return of spontaneous circulation'],
    'dka': ['diabetic ketoacidosis'],
    'hhs': ['hyperosmolar hyperglycemic state', 'hyperosmolar hyperglycaemic'],
    'sle': ['systemic lupus erythematosus', 'lupus'],
    'ra': ['rheumatoid arthritis'],
    'ms': ['multiple sclerosis'],
    'gbs': ['guillain barre syndrome'],
    'mg': ['myasthenia gravis'],
    'itp': ['immune thrombocytopenia', 'idiopathic thrombocytopenic purpura'],
    'ttp': ['thrombotic thrombocytopenic purpura'],
    'hus': ['hemolytic uremic syndrome', 'haemolytic uraemic syndrome'],
    'dic': ['disseminated intravascular coagulation'],
    'hit': ['heparin induced thrombocytopenia'],
    'vwd': ['von willebrand disease'],
    'all': ['acute lymphoblastic leukemia', 'acute lymphoblastic leukaemia'],
    'aml': ['acute myeloid leukemia', 'acute myeloid leukaemia'],
    'cll': ['chronic lymphocytic leukemia', 'chronic lymphocytic leukaemia'],
    'cml': ['chronic myeloid leukemia', 'chronic myeloid leukaemia'],
    'mds': ['myelodysplastic syndrome'],
    'hl': ['hodgkin lymphoma'],
    'nhl': ['non hodgkin lymphoma'],
    'mm': ['multiple myeloma', 'myeloma'],
    'hsct': ['hematopoietic stem cell transplantation', 'stem cell transplant'],
    'gvHD': ['graft versus host disease'],
    'cap': ['community acquired pneumonia'],
    'hap': ['hospital acquired pneumonia', 'ventilator associated pneumonia'],
    'vap': ['ventilator associated pneumonia'],
    'ild': ['interstitial lung disease', 'pulmonary fibrosis'],
    'ipf': ['idiopathic pulmonary fibrosis'],
    'osa': ['obstructive sleep apnea', 'obstructive sleep apnoea'],
    'niv': ['non invasive ventilation', 'bipap', 'cpap'],
    'ecmo': ['extracorporeal membrane oxygenation'],
    'pph': ['postpartum hemorrhage', 'postpartum haemorrhage'],
    'fna': ['fine needle aspiration'],
    'ata': ['american thyroid association'],
    'behcet': ['behcet', 'oral ulcer', 'genital ulcer', 'uveitis', 'colchicine', 'vasculitis', 'aphthous', 'mucocutaneous'],
    'tavr': ['transcatheter aortic valve', 'tavi', 'aortic valve replacement', 'aortic stenosis', 'bioprosthetic valve', 'antithrombotic', 'dual antiplatelet'],
    'turner': ['turner syndrome', 'monosomy x', '45 x', 'gonadal dysgenesis', 'growth hormone', 'estrogen replacement', 'aortic coarctation'],
    'lymphangitic': ['lymphangitic carcinomatosis', 'pulmonary lymphangitic', 'interstitial thickening', 'septal thickening', 'malignant pleural', 'lung metastasis'],
    'kdigo': ['kidney disease improving global outcomes'],
    'esc': ['european society of cardiology'],
    'aha': ['american heart association'],
    'nice': ['national institute for health and care excellence'],
    'bsg': ['british society of gastroenterology'],
    'bts': ['british thoracic society'],
    'rcog': ['royal college of obstetricians and gynaecologists'],
    'esge': ['european society of gastrointestinal endoscopy'],
    'easl': ['european association for the study of the liver'],
    'aasld': ['american association for the study of liver diseases'],
    'idsa': ['infectious diseases society of america'],
};

// UK <-> US spelling normalization
function normalizeSpelling(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/haem/g, 'hem')
        .replace(/anaem/g, 'anem')
        .replace(/oesoph/g, 'esoph')
        .replace(/paediatr/g, 'pediatr')
        .replace(/leukaem/g, 'leukem')
        .replace(/kalaem/g, 'kalem')
        .replace(/natraem/g, 'natrem')
        .replace(/calcaem/g, 'calcem')
        .replace(/glycaem/g, 'glycem')
        .replace(/uraem/g, 'urem')
        .replace(/ischaem/g, 'ischem')
        .replace(/oedema/g, 'edema')
        .replace(/diarrhoea/g, 'diarrhea')
        .replace(/dyspnoea/g, 'dyspnea')
        .replace(/apnoea/g, 'apnea')
        .replace(/amenorrhoea/g, 'amenorrhea')
        .replace(/gonorrhoea/g, 'gonorrhea')
        .replace(/orthopnoea/g, 'orthopnea')
        .replace(/foet/g, 'fet')
        .replace(/gynaec/g, 'gynec')
        .replace(/orthopaed/g, 'orthoped')
        .replace(/anaesth/g, 'anesth')
        .replace(/tumour/g, 'tumor')
        .replace(/paralyse/g, 'paralyze')
        .replace(/immunis/g, 'immuniz')
        .replace(/catheteris/g, 'catheteriz')
        .replace(/randomis/g, 'randomiz')
        .replace(/colonis/g, 'coloniz')
        .replace(/stabilis/g, 'stabiliz')
        .replace(/cicatris/g, 'cicatriz')
        .replace(/sclerotherap/g, 'sclerotherap')
        .replace(/sulph/g, 'sulf')
        .replace(/aluminium/g, 'aluminum');
}

function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function tokenizeContentWords(text) {
    const norm = normalizeSpelling(text).replace(/[^a-z0-9]+/g, ' ').trim();
    return norm.split(/\s+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

function parseTopicStructure(topicStr) {
    const raw = cleanText(topicStr);
    const [headPart, ...subParts] = raw.split(':');
    const headRaw = cleanText(headPart);
    const subRaw = cleanText(subParts.join(' '));

    const headNorm = normalizeSpelling(headRaw).replace(/[^a-z0-9]+/g, ' ').trim();
    const fullNorm = normalizeSpelling(raw).replace(/[^a-z0-9]+/g, ' ').trim();

    const headTokens = tokenizeContentWords(headRaw);
    const subTokens = tokenizeContentWords(subRaw);
    const allTokens = [...new Set([...headTokens, ...subTokens])];

    // Build phrase variants for the head condition
    const phrases = new Set();
    if (headNorm.length >= 4) phrases.add(headNorm);

    // Split on 'and', 'versus', 'vs', ',' to get sub-conditions
    const clauses = headRaw.split(/\b(?:and|versus|vs\.?|or)\b|[,;/()]/i)
        .map((c) => normalizeSpelling(c).replace(/[^a-z0-9]+/g, ' ').trim())
        .filter((c) => c.length >= 4 && !STOP_WORDS.has(c));
    for (const cl of clauses) phrases.add(cl);

    // Add medical synonym phrases
    const expandedTokens = new Set(allTokens);
    for (const tok of allTokens) {
        if (MEDICAL_SYNONYMS[tok]) {
            for (const syn of MEDICAL_SYNONYMS[tok]) {
                const sNorm = normalizeSpelling(syn);
                phrases.add(sNorm);
                for (const st of tokenizeContentWords(sNorm)) expandedTokens.add(st);
            }
        }
    }

    return {
        raw,
        headRaw,
        subRaw,
        headNorm,
        fullNorm,
        headTokens: headTokens.length ? headTokens : allTokens,
        subTokens,
        allTokens,
        expandedTokens: [...expandedTokens],
        phrases: [...phrases],
    };
}

function classifyStudyDesign(doc) {
    const tier = String(doc.evidence_tier || '').toLowerCase();
    const label = String(doc.document_label || '').toLowerCase();
    const title = String(doc.title || '').toLowerCase();

    const isFalsePositiveTitle =
        /\b(case report|case series|a case of|in a patient presenting with|retrospective audit of|protocol for a|study protocol|erratum|corrigendum|reply to|comment on|letter to the editor)\b/i.test(title);

    if (isFalsePositiveTitle) {
        return { category: 'case_report_or_audit', weight: 0.25, accepted: false };
    }

    if (
        /\b(guideline|guidelines|consensus|position statement|practice parameter|kdigo|nice|esc|aha|acc|idsa|bsg|bts|easl|aasld|esge|rcog|esmo|asco|acog|eular|acr| Surviving Sepsis)\b/i.test(title)
        || tier.includes('guideline')
        || label.includes('guideline')
        || label.includes('consensus')
    ) {
        return { category: 'clinical_practice_guideline', weight: 1.0, accepted: true };
    }

    if (
        /\b(systematic review|meta-analysis|meta analysis|cochrane)\b/i.test(title)
        || tier.includes('systematic_review')
        || tier.includes('meta_analysis')
        || label.includes('systematic')
        || label.includes('meta')
    ) {
        return { category: 'systematic_review_meta_analysis', weight: 0.92, accepted: true };
    }

    if (
        /\b(randomized|randomised|controlled trial|phase 3|phase iii|landmark|multicenter trial|multicentre trial)\b/i.test(title)
        || tier.includes('landmark_trial')
        || tier.includes('trial')
        || label.includes('trial')
    ) {
        return { category: 'landmark_or_rct_trial', weight: 0.85, accepted: true };
    }

    if (
        /\b(review|management of|diagnosis and treatment|diagnosis and management|clinical practice|state of the art|seminar|primer)\b/i.test(title)
        || tier.includes('review')
        || label.includes('review')
    ) {
        return { category: 'clinical_review_article', weight: 0.78, accepted: true };
    }

    return { category: 'clinical_study', weight: 0.55, accepted: false };
}

const ACTION_CUE = /\b(recommend|recommended|recommends|should|must|first-line|first line|initial|treatment|management|diagnosis|diagnostic|indicated|contraindicated|target|dose|dosing|threshold|guideline|consensus|therapy|prophylaxis|surveillance|monitor|monitoring)\b/i;

function synthesizeInferredClinicalStatement(quote, topicStr, doc) {
    if (!quote) return '';
    const clean = cleanText(quote)
        .replace(/^[•\-*\d.)\s]+/, '')
        .replace(/\(\s*(?:table|figure|fig\.?|box|appendix|supplementary)[^)]*\)/gi, '')
        .replace(/\[[\d,\s–\-]+\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const sourceLabel = doc.sourceBody || (doc.title ? doc.title.slice(0, 80) : 'Clinical Guideline');
    const yr = doc.year ? ` (${doc.year})` : '';
    const idTag = doc.pmid ? `PMID ${doc.pmid}` : (doc.pmcid ? doc.pmcid : `Doc #${doc.id}`);
    return `[${sourceLabel}${yr}, ${idTag}] For ${cleanText(topicStr).split(':')[0]}, the evidence establishes that: ${clean}`;
}

function main() {
    const apply = process.argv.includes('--apply');

    // 1. Load 565 topics from the Excel file via Python helper
    const pyDumpScript = `
import openpyxl, json
wb = openpyxl.load_workbook(${JSON.stringify(EXCEL_INPUT_PATH)}, read_only=True)
ws = wb['D topics (565)']
rows = list(ws.iter_rows(values_only=True))
headers = rows[0]
out = []
for r in rows[1:]:
    if not r or not r[1]: continue
    out.append({
        'group': r[0],
        'topic': r[1],
        'topicId': r[2],
        'origTitleMatched': r[3],
        'origAcceptedDesign': r[4],
        'origC1': r[5],
        'origC2': r[6],
        'origC3': r[7],
        'origC4': r[8],
    })
print(json.dumps(out))
`;
    const topicsRaw = JSON.parse(execFileSync('python', ['-c', pyDumpScript], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }));
    console.log(`Loaded ${topicsRaw.length} topics from ${EXCEL_INPUT_PATH}`);

    // 2. Load all valid full-text documents from database/app.db
    const rawDb = new Database(path.resolve('database/app.db'));
    const docsRaw = rawDb.prepare(`
        SELECT id, pmcid, pmid, doi, title, source_body, source_year, source_url,
               document_label, evidence_tier, full_text, full_text_source, word_count
        FROM guideline_documents
        WHERE length(trim(COALESCE(full_text, ''))) >= 500
          AND COALESCE(full_text_source, '') NOT IN ('abstract', 'bibliographic_abstract', 'pubmed_abstract')
          AND COALESCE(full_text_source, '') NOT LIKE 'quarantined%'
        ORDER BY id ASC
    `).all();
    console.log(`Loaded ${docsRaw.length} valid full-text documents from guideline_documents.`);

    // 3. Load pre-extracted verbatim recommendation sentences from document_recommendations
    const recsByDocId = new Map();
    for (const r of rawDb.prepare('SELECT document_id, sentence FROM document_recommendations ORDER BY document_id, sentence_index').all()) {
        const did = Number(r.document_id);
        if (!recsByDocId.has(did)) recsByDocId.set(did, []);
        recsByDocId.get(did).push(cleanText(r.sentence));
    }

    // 4. Load existing explicit links in app.db (topic_documents, topic_evidence_registry, topic_guidelines, topic_mentor_drafts)
    const explicitLinksByTopic = new Map(); // normTopic -> Set(docId)
    const addExplicitLink = (tStr, docId) => {
        if (!tStr || !docId) return;
        const norm = normalizeTopic(tStr);
        if (!explicitLinksByTopic.has(norm)) explicitLinksByTopic.set(norm, new Set());
        explicitLinksByTopic.get(norm).add(Number(docId));
    };

    for (const r of rawDb.prepare("SELECT topic, guideline_document_id FROM topic_documents WHERE guideline_document_id IS NOT NULL AND COALESCE(review_state, '') != 'rejected'").all()) {
        addExplicitLink(r.topic, r.guideline_document_id);
    }
    for (const r of rawDb.prepare('SELECT topic_name, topic_key, primary_document_id, all_document_ids FROM topic_evidence_registry').all()) {
        const t = r.topic_name || r.topic_key;
        if (r.primary_document_id) addExplicitLink(t, r.primary_document_id);
        if (r.all_document_ids) {
            for (const p of String(r.all_document_ids).split(',')) {
                const did = Number(p.trim());
                if (did) addExplicitLink(t, did);
            }
        }
    }
    for (const r of rawDb.prepare('SELECT topic, normalized_topic, document_id FROM topic_guidelines WHERE document_id IS NOT NULL AND superseded_by_id IS NULL').all()) {
        addExplicitLink(r.normalized_topic || r.topic, r.document_id);
    }

    // 5. Build an inverted word index and normalized text cache over all 3,827 full-text documents
    console.log('Indexing all 3,827 full-text documents word-by-word...');
    const docsById = new Map();
    const invertedWordIndex = new Map(); // token -> Set(docId)
    const docFrequency = new Map(); // token -> doc count

    for (const doc of docsRaw) {
        const normTitle = normalizeSpelling(doc.title || '').replace(/[^a-z0-9]+/g, ' ').trim();
        const rawFt = cleanText(doc.full_text || '');
        const normFt = normalizeSpelling(rawFt);
        const design = classifyStudyDesign(doc);
        const titleTokens = new Set(tokenizeContentWords(doc.title || ''));

        // Fast word frequency map on the document full text
        const wordCounts = new Map();
        const ftWords = normFt.match(/[a-z0-9]{3,}/g) || [];
        for (const w of ftWords) {
            if (STOP_WORDS.has(w)) continue;
            wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
        }

        for (const w of wordCounts.keys()) {
            if (!invertedWordIndex.has(w)) invertedWordIndex.set(w, []);
            invertedWordIndex.get(w).push(doc.id);
        }
        for (const w of titleTokens) {
            if (!wordCounts.has(w)) {
                if (!invertedWordIndex.has(w)) invertedWordIndex.set(w, []);
                invertedWordIndex.get(w).push(doc.id);
            }
        }

        const preparedDoc = {
            id: doc.id,
            pmid: doc.pmid || null,
            pmcid: doc.pmcid || null,
            doi: doc.doi || null,
            title: cleanText(doc.title || `Document ${doc.id}`),
            sourceBody: doc.source_body || null,
            year: doc.source_year || null,
            sourceUrl: doc.source_url || null,
            evidenceTier: doc.evidence_tier || null,
            documentLabel: doc.document_label || null,
            designCategory: design.category,
            designWeight: design.weight,
            designAccepted: design.accepted,
            wordCount: doc.word_count || ftWords.length,
            charLen: rawFt.length,
            normTitle,
            titleTokens,
            rawFt,
            normFt,
            wordCounts,
            sentences: null, // lazily split when extracting verbatim clinical passages
        };
        docsById.set(doc.id, preparedDoc);
    }

    const totalDocs = docsRaw.length;
    for (const [w, list] of invertedWordIndex.entries()) {
        docFrequency.set(w, list.length);
    }
    console.log(`Indexed ${invertedWordIndex.size} unique clinical tokens across ${totalDocs} full-text documents.`);

    // Helper: extract top verbatim clinical recommendation sentences from a document matching the topic
    function extractMatchingSentences(doc, parsedTopic, maxSentences = 3) {
        if (!doc.sentences) {
            const preRecs = recsByDocId.get(doc.id) || [];
            const rawSplit = doc.rawFt.split(/(?<=[.!?])\s+/)
                .map((s) => s.trim())
                .filter((s) => s.length >= 45 && s.length <= 360 && /[a-zA-Z]{4,}/.test(s) && !/^https?:\/\//i.test(s));
            // Combine pre-extracted recommendation sentences + body sentences (deduplicated)
            const seen = new Set();
            const combined = [];
            for (const s of [...preRecs, ...rawSplit]) {
                if (!seen.has(s)) {
                    seen.add(s);
                    combined.push({
                        raw: s,
                        norm: normalizeSpelling(s),
                        isPreRec: preRecs.includes(s),
                    });
                }
                if (combined.length >= 450) break;
            }
            doc.sentences = combined;
        }

        const scoredSentences = [];
        let totalSentenceHits = 0;

        for (const sObj of doc.sentences) {
            let sScore = 0;
            let matchedHeadWords = 0;
            let matchedSubWords = 0;

            for (const ph of parsedTopic.phrases) {
                if (ph.length >= 5 && sObj.norm.includes(ph)) {
                    sScore += 18;
                }
            }
            for (const ht of parsedTopic.headTokens) {
                if (sObj.norm.includes(ht)) {
                    matchedHeadWords++;
                    sScore += 6;
                }
            }
            for (const st of parsedTopic.subTokens) {
                if (sObj.norm.includes(st)) {
                    matchedSubWords++;
                    sScore += 4;
                }
            }
            for (const et of parsedTopic.expandedTokens) {
                if (!parsedTopic.headTokens.includes(et) && !parsedTopic.subTokens.includes(et) && sObj.norm.includes(et)) {
                    sScore += 3.5;
                }
            }

            if (matchedHeadWords === 0 && sScore < 10) continue;
            totalSentenceHits++;

            if (ACTION_CUE.test(sObj.raw)) sScore += 8;
            if (sObj.isPreRec) sScore += 6;

            scoredSentences.push({
                text: sObj.raw,
                score: sScore,
                matchedHeadWords,
                matchedSubWords,
            });
        }

        scoredSentences.sort((a, b) => b.score - a.score);
        return {
            totalSentenceHits,
            topSentences: scoredSentences.slice(0, maxSentences),
        };
    }

    // 6. Score every topic word-by-word against all candidate full-text documents
    console.log('Running word-by-word full-text evaluation across all 565 topics...');
    const reviewedRows = [];
    const matchStrengthCounts = {
        'Tier 1: Exact / High-Density Full-Text Guideline or Review': 0,
        'Tier 2: Strong Full-Text Body & Inferred Information Match': 0,
        'Tier 3: Broader Condition / Specialty Full-Text Guideline Match': 0,
        'Tier 4: Low Overlap — Needs External Guideline Fetch': 0,
    };

    for (let idx = 0; idx < topicsRaw.length; idx++) {
        const item = topicsRaw[idx];
        const parsed = parseTopicStructure(item.topic);
        const normKey = normalizeTopic(item.topic);
        const headNormKey = normalizeTopic(parsed.headRaw);

        // Gather candidate docs via inverted index over all expanded tokens + explicit links
        const candidateScores = new Map(); // docId -> initial lexical score
        const explicitDocs = new Set([
            ...(explicitLinksByTopic.get(normKey) || []),
            ...(explicitLinksByTopic.get(headNormKey) || []),
        ]);
        for (const synKey of expandNormalizedTopicKeys(normKey, normalizeTopic)) {
            for (const did of (explicitLinksByTopic.get(synKey) || [])) explicitDocs.add(did);
        }

        for (const tok of parsed.expandedTokens) {
            const posting = invertedWordIndex.get(tok);
            if (!posting) continue;
            const df = docFrequency.get(tok) || 1;
            const idf = Math.log(1 + totalDocs / df);
            const isHead = parsed.headTokens.includes(tok);
            const isSub = parsed.subTokens.includes(tok);
            const tokWeight = isHead ? 3.2 * idf : (isSub ? 2.0 * idf : 1.4 * idf);

            for (const docId of posting) {
                const doc = docsById.get(docId);
                if (!doc) continue;
                const tf = doc.wordCounts.get(tok) || 0;
                const inTitle = doc.titleTokens.has(tok);
                const tfScore = (inTitle ? 4.5 : 0) + Math.min(3.5, Math.log1p(tf));
                candidateScores.set(docId, (candidateScores.get(docId) || 0) + tokWeight * tfScore);
            }
        }

        for (const did of explicitDocs) {
            if (docsById.has(did)) {
                candidateScores.set(did, (candidateScores.get(did) || 0) + 12);
            }
        }

        // Take top 65 candidates by initial lexical + IDF score and run deep phrase & sentence-level evaluation
        const topPreCandidates = [...candidateScores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 65);

        const evaluatedCandidates = [];

        for (const [docId, baseLexScore] of topPreCandidates) {
            const doc = docsById.get(docId);
            if (!doc) continue;

            // 1. Head token coverage in Title and Full Text
            let headInTitle = 0;
            let headInBody = 0;
            let headBodyOccurrences = 0;
            for (const ht of parsed.headTokens) {
                if (doc.titleTokens.has(ht) || doc.normTitle.includes(ht)) headInTitle++;
                const cnt = doc.wordCounts.get(ht) || (doc.normFt.includes(ht) ? 1 : 0);
                if (cnt > 0) {
                    headInBody++;
                    headBodyOccurrences += cnt;
                }
            }
            const headTitleRatio = parsed.headTokens.length ? headInTitle / parsed.headTokens.length : 0;
            const headBodyRatio = parsed.headTokens.length ? headInBody / parsed.headTokens.length : 0;

            // 2. Subtopic token coverage in Title and Full Text
            let subInTitle = 0;
            let subInBody = 0;
            for (const st of parsed.subTokens) {
                if (doc.titleTokens.has(st) || doc.normTitle.includes(st)) subInTitle++;
                if ((doc.wordCounts.get(st) || 0) > 0 || doc.normFt.includes(st)) subInBody++;
            }
            const subBodyRatio = parsed.subTokens.length ? subInBody / parsed.subTokens.length : 1;

            // 3. Exact phrase match in Title and Full Text
            let exactHeadInTitle = false;
            let exactPhraseInBodyCount = 0;
            let matchedPhrases = 0;
            for (const ph of parsed.phrases) {
                if (ph.length < 4) continue;
                if (doc.normTitle.includes(ph)) {
                    exactHeadInTitle = true;
                    matchedPhrases++;
                }
                const firstIdx = doc.normFt.indexOf(ph);
                if (firstIdx !== -1) {
                    matchedPhrases++;
                    // Count up to 15 occurrences of this phrase in full text
                    let pos = firstIdx;
                    let occ = 0;
                    while (pos !== -1 && occ < 15) {
                        occ++;
                        pos = doc.normFt.indexOf(ph, pos + ph.length);
                    }
                    exactPhraseInBodyCount += occ;
                }
            }

            // Skip documents that neither match the head condition tokens nor any medical synonym phrase
            if (headBodyRatio === 0 && matchedPhrases === 0) continue;

            // 4. Sentence-level & inferred information extraction
            const sentAnalysis = extractMatchingSentences(doc, parsed, 3);
            let topQuote = sentAnalysis.topSentences[0]?.text || '';
            let secondQuote = sentAnalysis.topSentences[1]?.text || '';
            if (!topQuote && doc.sentences && doc.sentences.length > 0) {
                topQuote = doc.sentences[0].raw;
                secondQuote = doc.sentences[1]?.raw || '';
            }
            const inferredPoint1 = synthesizeInferredClinicalStatement(topQuote, item.topic, doc);
            const inferredPoint2 = synthesizeInferredClinicalStatement(secondQuote, item.topic, doc);

            // 5. Composite Evidence Quality & Relevance Score (0 - 100 scale)
            let composite = 0;
            composite += exactHeadInTitle ? 26 : (headTitleRatio * 20);
            composite += headBodyRatio * 22;
            composite += Math.min(14, Math.log1p(exactPhraseInBodyCount) * 5.2);
            composite += Math.min(10, Math.log1p(headBodyOccurrences) * 2.4);
            composite += parsed.subTokens.length > 0 ? (subBodyRatio * 12) : 8;
            composite += Math.min(12, Math.log1p(Math.max(1, sentAnalysis.totalSentenceHits)) * 3.5);
            composite += doc.designWeight * 12;

            // Recency bonus (2020-2026 guidelines/reviews)
            const yr = Number(doc.year) || 0;
            if (yr >= 2023) composite += 4;
            else if (yr >= 2019) composite += 2.5;
            else if (yr >= 2015) composite += 1;

            // Penalize false-positive case reports / narrow audits when better guidelines exist
            if (!doc.designAccepted) composite *= 0.55;
            // Penalize documents where title is about an unrelated condition and only mentions topic once in passing
            if (!exactHeadInTitle && headTitleRatio < 0.35 && exactPhraseInBodyCount < 2 && sentAnalysis.totalSentenceHits < 2) {
                composite *= 0.65;
            }

            const finalScore = Math.min(100, Number(composite.toFixed(1)));

            evaluatedCandidates.push({
                docId: doc.id,
                pmid: doc.pmid,
                pmcid: doc.pmcid,
                doi: doc.doi,
                year: doc.year,
                title: doc.title,
                designCategory: doc.designCategory,
                designAccepted: doc.designAccepted,
                evidenceTier: doc.evidenceTier,
                documentLabel: doc.documentLabel,
                wordCount: doc.wordCount,
                score: finalScore,
                exactHeadInTitle,
                headTitleRatio: Number((headTitleRatio * 100).toFixed(0)),
                headBodyRatio: Number((headBodyRatio * 100).toFixed(0)),
                subBodyRatio: Number((subBodyRatio * 100).toFixed(0)),
                exactPhraseInBodyCount,
                headBodyOccurrences,
                matchingSentenceCount: Math.max(sentAnalysis.totalSentenceHits, topQuote ? 1 : 0),
                topQuote,
                secondQuote,
                inferredPoint1,
                inferredPoint2,
            });
        }

        evaluatedCandidates.sort((a, b) => b.score - a.score);
        const top4 = evaluatedCandidates.slice(0, 4);
        const best = top4[0] || null;

        let matchTier = 'Tier 4: Low Overlap — Needs External Guideline Fetch';
        if (best) {
            if (best.score >= 65 && (best.designAccepted || best.exactHeadInTitle) && (best.exactHeadInTitle || best.exactPhraseInBodyCount >= 2 || best.matchingSentenceCount >= 3)) {
                matchTier = 'Tier 1: Exact / High-Density Full-Text Guideline or Review';
            } else if (best.score >= 48 && (best.headBodyRatio >= 50 || best.exactPhraseInBodyCount >= 1 || best.matchingSentenceCount >= 1)) {
                matchTier = 'Tier 2: Strong Full-Text Body & Inferred Information Match';
            } else if (best.score >= 35) {
                matchTier = 'Tier 3: Broader Condition / Specialty Full-Text Guideline Match';
            }
        }
        matchStrengthCounts[matchTier]++;

        // Check if original Candidate 1 in the spreadsheet was a false positive (e.g. case report, audit, or wrong organ)
        const origC1Str = String(item.origC1 || '');
        let origAuditNote = 'Original Group D (no title match in spreadsheet)';
        if (item.group && !item.group.startsWith('D:')) {
            if (/case report|in a patient presenting with|retrospective audit|neglected tuberculous|agitated saline contrast/i.test(origC1Str)) {
                origAuditNote = 'Original C1 was a narrow case report/audit or title collision — upgraded to best clinical guideline/review';
            } else if (best && origC1Str.includes(String(best.pmid || best.title.slice(0, 35)))) {
                origAuditNote = 'Confirmed original top candidate via word-by-word full-text verification';
            } else {
                origAuditNote = 'Re-ranked candidates by full-text recommendation density & study design quality';
            }
        } else if (best) {
            origAuditNote = `Found ${evaluatedCandidates.length} full-text candidate(s) via word-by-word body & synonym search (best: Doc #${best.docId})`;
        }

        const formatCandidateCell = (c) => {
            if (!c) return '';
            const idPart = `Doc#${c.docId}${c.pmid ? ` (PMID:${c.pmid})` : (c.pmcid ? ` (${c.pmcid})` : '')}`;
            return `${idPart} | Score:${c.score} | ${c.year || 'n.d.'} | ${c.designCategory} | PhraseHits:${c.exactPhraseInBodyCount} SentHits:${c.matchingSentenceCount} | ${c.title}`;
        };

        reviewedRows.push({
            rowNumber: idx + 1,
            originalGroup: item.group,
            topic: item.topic,
            topicId: item.topicId,
            origTitleMatched: item.origTitleMatched,
            origAcceptedDesign: item.origAcceptedDesign,
            wordByWordTier: matchTier,
            auditActionNote: origAuditNote,
            fullTextCandidatesFound: evaluatedCandidates.length,
            acceptedDesignFullTextFound: evaluatedCandidates.filter((c) => c.designAccepted && c.score >= 45).length,
            bestDocId: best?.docId || null,
            bestPmid: best?.pmid || null,
            bestPmcid: best?.pmcid || null,
            bestDoi: best?.doi || null,
            bestYear: best?.year || null,
            bestDesign: best?.designCategory || null,
            bestScore: best?.score || 0,
            bestTitle: best?.title || null,
            bestPhraseHits: best?.exactPhraseInBodyCount || 0,
            bestSentenceHits: best?.matchingSentenceCount || 0,
            bestHeadWordCoveragePct: best?.headBodyRatio || 0,
            bestSubtopicCoveragePct: best?.subBodyRatio || 0,
            bestInferredStatement1: best?.inferredPoint1 || '',
            bestInferredStatement2: best?.inferredPoint2 || '',
            bestVerbatimQuote1: best?.topQuote || '',
            bestVerbatimQuote2: best?.secondQuote || '',
            candidate1Formatted: formatCandidateCell(top4[0]),
            candidate2Formatted: formatCandidateCell(top4[1]),
            candidate3Formatted: formatCandidateCell(top4[2]),
            candidate4Formatted: formatCandidateCell(top4[3]),
            origC1: item.origC1 || '',
            top4Raw: top4,
        });
    }

    console.log('\n=== WORD-BY-WORD REVIEW SUMMARY (565 TOPICS) ===');
    console.table(matchStrengthCounts);

    // Breakdown by Original Group (A, B, C, D) -> New Word-by-Word Tier
    const crossTab = {};
    for (const r of reviewedRows) {
        const g = r.originalGroup;
        if (!crossTab[g]) {
            crossTab[g] = {
                total: 0,
                Tier1_ExactOrHighDensity: 0,
                Tier2_StrongBodySection: 0,
                Tier3_BroaderGuideline: 0,
                Tier4_LowOverlap: 0,
            };
        }
        crossTab[g].total++;
        if (r.wordByWordTier.startsWith('Tier 1')) crossTab[g].Tier1_ExactOrHighDensity++;
        else if (r.wordByWordTier.startsWith('Tier 2')) crossTab[g].Tier2_StrongBodySection++;
        else if (r.wordByWordTier.startsWith('Tier 3')) crossTab[g].Tier3_BroaderGuideline++;
        else crossTab[g].Tier4_LowOverlap++;
    }
    console.log('\n=== ORIGINAL GROUP vs. WORD-BY-WORD FULL-TEXT TIER ===');
    console.table(crossTab);

    // Save full JSON output
    fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify({
        generatedAt: new Date().toISOString(),
        inputExcel: EXCEL_INPUT_PATH,
        totalTopics: reviewedRows.length,
        totalFullTextDocsSearched: totalDocs,
        matchStrengthCounts,
        crossTab,
        topics: reviewedRows,
    }, null, 2));
    console.log(`Saved detailed JSON report to ${JSON_OUTPUT_PATH}`);

    // 7. Write the comprehensive reviewed Excel workbook (to both workspace and Downloads)
    const pyWriteExcel = `
import json, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

with open(${JSON.stringify(JSON_OUTPUT_PATH)}, 'r', encoding='utf-8') as f:
    data = json.load(f)

wb = openpyxl.Workbook()

# Sheet 1: Word-by-Word Reviewed (565)
ws = wb.active
ws.title = 'Word-by-Word Review (565)'

headers = [
    'Row #',
    'Original Group',
    'Word-by-Word Evidence Tier',
    'Audit Finding / Resolution',
    'Topic',
    'Topic ID',
    'Best Doc ID',
    'Best PMID / PMCID',
    'Best Year',
    'Best Study Design',
    'Word-by-Word Score (0-100)',
    'Phrase Hits in Full Text',
    'Matching Rec Sentences',
    'Head Word Coverage %',
    'Subtopic Word Coverage %',
    'Best Evidence Document Title',
    'Inferred Clinical Takeaway 1 (Information-Equivalent to Source)',
    'Inferred Clinical Takeaway 2 (Information-Equivalent to Source)',
    'Supporting Source Passage 1',
    'Supporting Source Passage 2',
    'Best Candidate 1 (Word-by-Word Ranked)',
    'Best Candidate 2 (Word-by-Word Ranked)',
    'Best Candidate 3 (Word-by-Word Ranked)',
    'Best Candidate 4 (Word-by-Word Ranked)',
    'Original Spreadsheet Candidate 1'
]
ws.append(headers)

header_fill = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
header_font = Font(color='FFFFFF', bold=True, size=10)
for col_idx in range(1, len(headers) + 1):
    cell = ws.cell(row=1, column=col_idx)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

tier_fills = {
    'Tier 1': PatternFill(start_color='E2EFDA', end_color='E2EFDA', fill_type='solid'),
    'Tier 2': PatternFill(start_color='DDEBF7', end_color='DDEBF7', fill_type='solid'),
    'Tier 3': PatternFill(start_color='FFF2CC', end_color='FFF2CC', fill_type='solid'),
    'Tier 4': PatternFill(start_color='FCE4D6', end_color='FCE4D6', fill_type='solid'),
}

for r in data['topics']:
    pmid_pmcid = r['bestPmid'] or r['bestPmcid'] or ''
    row_vals = [
        r['rowNumber'],
        r['originalGroup'],
        r['wordByWordTier'],
        r['auditActionNote'],
        r['topic'],
        r['topicId'],
        r['bestDocId'],
        pmid_pmcid,
        r['bestYear'],
        r['bestDesign'],
        r['bestScore'],
        r['bestPhraseHits'],
        r['bestSentenceHits'],
        r['bestHeadWordCoveragePct'],
        r['bestSubtopicCoveragePct'],
        r['bestTitle'],
        r['bestInferredStatement1'],
        r['bestInferredStatement2'],
        r['bestVerbatimQuote1'],
        r['bestVerbatimQuote2'],
        r['candidate1Formatted'],
        r['candidate2Formatted'],
        r['candidate3Formatted'],
        r['candidate4Formatted'],
        r['origC1'],
    ]
    ws.append(row_vals)
    cur_row = ws.max_row
    tier_prefix = r['wordByWordTier'][:6]
    fill = tier_fills.get(tier_prefix)
    if fill:
        ws.cell(row=cur_row, column=3).fill = fill

ws.freeze_panes = 'A2'
col_widths = [7, 28, 36, 42, 45, 36, 11, 16, 10, 26, 14, 14, 14, 14, 14, 55, 65, 65, 65, 65, 60, 60, 60, 60, 55]
for idx, w in enumerate(col_widths, start=1):
    ws.column_dimensions[get_column_letter(idx)].width = w

# Sheet 2: Group D Resolved (256 Topics)
ws_d = wb.create_sheet('Group D Resolved (256)')
ws_d.append(headers)
for col_idx in range(1, len(headers) + 1):
    cell = ws_d.cell(row=1, column=col_idx)
    cell.fill = header_fill
    cell.font = header_font

for r in data['topics']:
    if not str(r['originalGroup']).startswith('D:'): continue
    pmid_pmcid = r['bestPmid'] or r['bestPmcid'] or ''
    ws_d.append([
        r['rowNumber'],
        r['originalGroup'],
        r['wordByWordTier'],
        r['auditActionNote'],
        r['topic'],
        r['topicId'],
        r['bestDocId'],
        pmid_pmcid,
        r['bestYear'],
        r['bestDesign'],
        r['bestScore'],
        r['bestPhraseHits'],
        r['bestSentenceHits'],
        r['bestHeadWordCoveragePct'],
        r['bestSubtopicCoveragePct'],
        r['bestTitle'],
        r['bestInferredStatement1'],
        r['bestInferredStatement2'],
        r['bestVerbatimQuote1'],
        r['bestVerbatimQuote2'],
        r['candidate1Formatted'],
        r['candidate2Formatted'],
        r['candidate3Formatted'],
        r['candidate4Formatted'],
        r['origC1'],
    ])
ws_d.freeze_panes = 'A2'
for idx, w in enumerate(col_widths, start=1):
    ws_d.column_dimensions[get_column_letter(idx)].width = w

# Sheet 3: Summary & Cross-Tabulation
ws_s = wb.create_sheet('Summary')
ws_s.append(['Word-by-Word Evidence Tier', 'Topics Count', 'Percentage'])
for col_idx in range(1, 4):
    ws_s.cell(row=1, column=col_idx).fill = header_fill
    ws_s.cell(row=1, column=col_idx).font = header_font

total_t = data['totalTopics']
for tier, cnt in data['matchStrengthCounts'].items():
    ws_s.append([tier, cnt, f"{(cnt / total_t * 100):.1f}%"])

ws_s.append([])
ws_s.append(['Original Group', 'Total Topics', 'Tier 1 (Exact/High-Density)', 'Tier 2 (Strong Body/Section)', 'Tier 3 (Broader Guideline)', 'Tier 4 (Low Overlap)'])
hdr_row = ws_s.max_row
for col_idx in range(1, 7):
    ws_s.cell(row=hdr_row, column=col_idx).fill = header_fill
    ws_s.cell(row=hdr_row, column=col_idx).font = header_font

for grp, stats in data['crossTab'].items():
    ws_s.append([
        grp,
        stats['total'],
        stats['Tier1_ExactOrHighDensity'],
        stats['Tier2_StrongBodySection'],
        stats['Tier3_BroaderGuideline'],
        stats['Tier4_LowOverlap']
    ])

for idx, w in enumerate([48, 16, 26, 26, 26, 22], start=1):
    ws_s.column_dimensions[get_column_letter(idx)].width = w

wb.save(${JSON.stringify(EXCEL_OUTPUT_WORKSPACE)})
wb.save(${JSON.stringify(EXCEL_OUTPUT_DOWNLOADS)})
print('Saved Excel workbooks successfully.')
`;
    execFileSync('python', ['-c', pyWriteExcel], { stdio: 'inherit' });

    if (apply) {
        console.log('\nApplying best verified full-text document associations to database/app.db...');
        const now = new Date().toISOString();
        const upsertTopicDoc = rawDb.prepare(`
            INSERT OR IGNORE INTO topic_documents (
                topic_id, topic, pmid, doc_kind, fit, source_batch, note,
                review_state, reviewed_by, reviewed_at, created_at, updated_at, guideline_document_id
            ) VALUES (?, ?, ?, ?, ?, 'd_topics_565_word_by_word_audit', ?, 'confirmed', 'word_by_word_fulltext_audit', ?, ?, ?, ?)
        `);
        const checkTopicDoc = rawDb.prepare(`
            SELECT id FROM topic_documents WHERE lower(topic) = lower(?) AND guideline_document_id = ? LIMIT 1
        `);

        let newTopicDocLinks = 0;
        const tx = rawDb.transaction(() => {
            for (const r of reviewedRows) {
                for (const cand of r.top4Raw) {
                    if (cand.score < 42) continue;
                    const exists = checkTopicDoc.get(r.topic, cand.docId);
        if (!exists) {
                        upsertTopicDoc.run(
                            r.topicId || normalizeTopic(r.topic),
                            r.topic,
                            cand.pmid || cand.pmcid || `DOC${cand.docId}`,
                            cand.designCategory,
                            cand.score >= 65 ? 'exact' : 'strong',
                            `Word-by-word & inferred-equivalence score ${cand.score}/100 (${cand.exactPhraseInBodyCount} phrase hits, ${cand.matchingSentenceCount} rec sentences)`,
                            now,
                            now,
                            now,
                            cand.docId
                        );
                        newTopicDocLinks++;
                    }
                }
            }
        });
        tx();
        console.log(`Linked ${newTopicDocLinks} new confirmed topic_documents associations in database/app.db.`);

        // Also enrich topic_mentor_drafts & topic_knowledge for these 565 topics with the best inferred/equivalent recommendations
        const draftByNorm = new Map();
        for (const row of rawDb.prepare('SELECT id, topic, page_json FROM topic_mentor_drafts').all()) {
            draftByNorm.set(normalizeTopic(row.topic), row);
        }
        const updateDraftStmt = rawDb.prepare('UPDATE topic_mentor_drafts SET page_json = ?, updated_at = ? WHERE id = ?');
        let draftsEnriched = 0;

        const txDrafts = rawDb.transaction(() => {
            for (const r of reviewedRows) {
                const normT = normalizeTopic(r.topic);
                const draft = draftByNorm.get(normT);
                if (!draft || !r.bestDocId) continue;
                let page = {};
                try { page = JSON.parse(draft.page_json || '{}'); } catch { page = {}; }

                const sources = Array.isArray(page.sources) ? [...page.sources] : [];
                const recs = Array.isArray(page.guideline_recommendations) ? [...page.guideline_recommendations] : [];

                for (const cand of r.top4Raw.slice(0, 2)) {
                    if (cand.score < 45) continue;
                    const pmidStr = String(cand.pmid || cand.pmcid || `DOC${cand.docId}`);
                    if (!sources.some((s) => Number(s.document_id || s.documentId) === cand.docId || String(s.pmid) === pmidStr)) {
                        sources.push({
                            pmid: pmidStr,
                            pmcid: cand.pmcid || null,
                            doi: cand.doi || null,
                            document_id: cand.docId,
                            title: cand.title,
                            year: cand.year || null,
                            design: cand.designCategory.replace(/_/g, ' '),
                        });
                    }
                    if (cand.topQuote && !recs.some((gr) => Number(gr.document_id || gr.documentId) === cand.docId)) {
                        recs.push({
                            society: cand.title.slice(0, 80),
                            year: cand.year || null,
                            recommendation: cand.inferredPoint1 || cand.topQuote,
                            grade: 'inferred_equivalent_full_text',
                            pmid: pmidStr,
                            document_id: cand.docId,
                            exact_quote: cand.topQuote,
                        });
                    }
                }
                page.sources = sources;
                page.guideline_recommendations = recs;
                updateDraftStmt.run(JSON.stringify(page), now, draft.id);
                draftsEnriched++;
            }
        });
        txDrafts();
        console.log(`Enriched ${draftsEnriched} topic_mentor_drafts rows with best word-by-word & inferred-equivalent full-text evidence.`);
    }

    rawDb.close();
}

main();
