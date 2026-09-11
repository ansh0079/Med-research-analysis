'use strict';

const fs = require('fs');
const path = require('path');
const { rankGuidelinesForTopic } = require('../../server/utils/guidelineRelevance');
const { isTrustedSource } = require('../../server/services/guidelineQualityService');
const {
    classifyFinding,
    splitLinkField,
    splitReferenceField,
    expandPackRow,
    groundGuidelineForTopic,
    parseLiteratureJson,
    parseLiteratureFile,
    parseGapCsv,
    importTopicLiterature,
    importLiteraturePack,
} = require('../../server/services/topicLiteratureImportService');

function makeDb() {
    const guidelines = [];
    const knowledge = new Map();
    const runs = [];
    return {
        runs,
        guidelines,
        knowledge,
        normalizeTopic: (topic) => String(topic || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim(),
        run: jest.fn(async (sql, params) => {
            runs.push({ sql, params });
            return { changes: 1 };
        }),
        recordBouquetSignals: jest.fn(async () => ({})),
        getGuidelinesByTopic: jest.fn(async (topic) => (
            guidelines.filter((g) => g.topic.toLowerCase() === String(topic).toLowerCase())
        )),
        createGuideline: jest.fn(async (payload) => {
            const row = { id: guidelines.length + 1, ...payload };
            guidelines.push(row);
            return row;
        }),
        getTopicKnowledge: jest.fn(async (topic) => knowledge.get(String(topic).toLowerCase()) || null),
        upsertTopicKnowledge: jest.fn(async (topic, payload, sourceArticles, status) => {
            const row = { topic, knowledge: payload, sourceArticles, status };
            knowledge.set(String(topic).toLowerCase(), row);
            return row;
        }),
    };
}

const ALF_ROW = {
    topic: 'acute liver failure transplant referral',
    findings: '• Clinical Guidelines: The European Association for the Study of the Liver (EASL) details emergency transplant referral protocols for fulminant liver failure (Wendon et al., 2017).',
    links: 'https://doi.org/10.1016/j.jhep.2016.12.003',
    references: 'Wendon, J., et al. (2017). EASL Clinical Practical Guidelines on the management of acute (fulminant) liver failure. Journal of Hepatology, 66, 1047-1081.',
};

const TAVR_ROW = {
    topic: 'antithrombotic therapy after tavr',
    findings: '• Clinical Guideline: The ACC/AHA Valvular Heart Disease guidelines suggest aspirin alone for patients post-TAVR lacking other indications for oral anticoagulation (Otto et al., 2021).',
    links: 'https://doi.org/10.1161/CIR.0000000000000923',
    references: 'Otto, C. M., et al. (2021). 2020 ACC/AHA Guideline for the Management of Patients With Valvular Heart Disease. Circulation, 143, e72-e227.',
};

const ACHALASIA_ROW = {
    topic: 'Achalasia endoscopic and surgical therapy',
    findings: '• Meta-Analysis: Laparoscopic myotomy with fundoplication is highly effective compared to endoscopic balloon dilation (Campos et al., 2009).\n• Network Meta-Analysis: POEM and LHM are preferred primary treatments for idiopathic achalasia (Mundre et al., 2021).',
    links: 'https://doi.org/10.1097/sla.0b013e31818e43ab\nhttps://doi.org/10.1016/s2468-1253(20)30296-x',
    references: 'Campos, G. M., et al. (2009). Endoscopic and Surgical Treatments for Achalasia. Annals of Surgery, 249(1), 45-57.\nMundre, P., et al. (2021). Efficacy of surgical or endoscopic treatment of idiopathic achalasia. The Lancet Gastroenterology & Hepatology, 6, 30-38.',
};

describe('topicLiteratureImportService', () => {
    test('classifies guideline vs paper findings', () => {
        expect(classifyFinding('Clinical Guideline: KDIGO recommends rituximab').kind).toBe('guideline');
        expect(classifyFinding('Meta-Analysis: dexamethasone does not reduce death').kind).toBe('paper');
        expect(classifyFinding('Appropriate Use Recommendations for lecanemab').kind).toBe('guideline');
        expect(classifyFinding('Systematic Review/Guideline: First-line treatment for catatonia is lorazepam').kind).toBe('guideline');
        expect(classifyFinding('WHO Guideline: monoclonal antibodies for Ebola').kind).toBe('guideline');
        expect(classifyFinding('Meta-Analysis/Guideline: CROSS trial established neoadjuvant CRT').kind).toBe('guideline');
        expect(classifyFinding('Meta-Analysis / Guideline: CROSS trial established neoadjuvant CRT').kind).toBe('guideline');
        expect(classifyFinding('Practice Parameter: AAAAI evaluation of perioperative anaphylaxis').kind).toBe('guideline');
        expect(classifyFinding('AAAAI practice parameters advise latex avoidance').kind).toBe('guideline');
        expect(classifyFinding('Landmark Trial/Guideline: UKPDS follow-up demonstrated a legacy effect').kind).toBe('guideline');
        expect(classifyFinding('Scientific Statement: AHA notes that SCAD primarily affects younger women').kind).toBe('guideline');
        expect(classifyFinding('Clinical Review / Consensus: First-line management for catatonia is lorazepam').kind).toBe('guideline');
        expect(classifyFinding('Consensus Guidelines: ASTCT endorses CAR T-cell therapy').kind).toBe('guideline');
        expect(classifyFinding('Landmark Trial: The landmark CONSENSUS and SOLVD trials established ACE inhibitors').kind).toBe('paper');
    });

    test('expands a pack row into paired papers and guidelines', () => {
        const items = expandPackRow(ACHALASIA_ROW);
        expect(items).toHaveLength(2);
        expect(items.every((item) => item.kind === 'paper')).toBe(true);
        expect(items[0].doi).toMatch(/^10\./);
        expect(items[1].title).toMatch(/achalasia/i);
    });

    test('grounds a TAVR guideline so it is servable for the topic', () => {
        const ungrounded = {
            sourceBody: 'AHA/ACC',
            recommendationText: 'Aspirin alone is suggested after valve replacement when anticoagulation is not otherwise indicated.',
        };
        expect(rankGuidelinesForTopic('antithrombotic therapy after tavr', [ungrounded])).toHaveLength(0);

        const grounded = groundGuidelineForTopic('antithrombotic therapy after tavr', ungrounded);
        expect(rankGuidelinesForTopic('antithrombotic therapy after tavr', [grounded]).length).toBeGreaterThan(0);
    });

    test('splits jammed DOI links and mashed references from Word tables', () => {
        expect(splitLinkField('https://doi.org/10.1056/NEJMoa1208410https://doi.org/10.1093/eurheartj/ehx393')).toEqual([
            'https://doi.org/10.1056/NEJMoa1208410',
            'https://doi.org/10.1093/eurheartj/ehx393',
        ]);
        const refs = splitReferenceField('Thiele, H., et al. (2012). Intraaortic Balloon Support. NEJM, 367, 1287-1296.Ibanez, B., et al. (2018). 2017 ESC Guidelines. European Heart Journal, 39(2), 119-177.');
        expect(refs).toHaveLength(2);
        expect(refs[1]).toMatch(/Ibanez/);
    });

    test('loads the checked-in batch-2 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-2.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(10);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'bk polyomavirus nephropathy in kidney transplant',
            'cardiorenal syndrome ultrafiltration',
        ]));
        const shock = rows.find((row) => /cardiogenic shock/i.test(row.topic));
        const items = expandPackRow(shock);
        expect(items.length).toBeGreaterThanOrEqual(2);
        expect(items.some((item) => item.kind === 'guideline')).toBe(true);
        expect(items.some((item) => /10\.1056\/NEJMoa1208410/i.test(item.doi || item.url))).toBe(true);
        expect(items.some((item) => /10\.1093\/eurheartj\/ehx393/i.test(item.doi || item.url))).toBe(true);
    });

    test('imports AST BK nephropathy guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-2.json');
        const row = parseLiteratureFile(packPath).find((item) => /bk polyomavirus/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'AST',
        }));
    });

    test('loads the checked-in batch-14 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-14.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'nivolumab ipilimumab advanced melanoma overall survival',
            'Pelvic inflammatory disease: diagnosis and treatment',
            'Perinatal depression screening and treatment',
        ]));
    });

    test('imports USPSTF perinatal depression guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-14.json');
        const row = parseLiteratureFile(packPath).find((item) => /perinatal depression/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'USPSTF',
        }));
    });

    test('loads the checked-in batch-13 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-13.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'management of HF with Reduced ejection fraction',
            'Neuromuscular blockade in early ARDS',
            'metylene blue in vasoplegic shock',
        ]));
    });

    test('imports ACOG miscarriage guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-13.json');
        const row = parseLiteratureFile(packPath).find((item) => /miscarriage/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'ACOG',
        }));
    });

    test('loads the checked-in batch-12 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-12.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'Infective endocarditis antibiotic duration and surgery',
            'management of HF eith Reduced ejection fraction',
        ]));
    });

    test('imports AABB transfusion guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-12.json');
        const row = parseLiteratureFile(packPath).find((item) => /irradiated/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'AABB',
        }));
    });

    test('loads the checked-in batch-11 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-11.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'Helicobacter pylori eradication peptic ulcer bleeding recurrence',
            'Infectious diarrhea and travelers diarrhea management',
        ]));
        const diarrhea = rows.find((row) => /infectious diarrhea/i.test(row.topic));
        expect(diarrhea.references).toMatch(/Shane/);
    });

    test('imports ASH HIT guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-11.json');
        const row = parseLiteratureFile(packPath).find((item) => /heparin-induced thrombocytopenia alternatives/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'ASH',
        }));
    });

    test('loads the checked-in batch-10 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-10.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'Eosinophilia Differential Diagnosis',
            'Heavy menstrual bleeding: assessment and management',
        ]));
    });

    test('imports AAO-HNSF epistaxis guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-10.json');
        const row = parseLiteratureFile(packPath).find((item) => /epistaxis/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'AAO-HNSF',
        }));
    });

    test('loads the checked-in batch-9 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-9.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'Depression: diagnosis, pharmacotherapy and monitoring',
            'endovascular thrombectomy time to treatment ischemic stroke meta-analysis',
        ]));
    });

    test('imports DAS difficult-airway guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-9.json');
        const row = parseLiteratureFile(packPath).find((item) => /difficult airway/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'DAS',
        }));
    });

    test('fetchLinks stores the publisher abstract instead of only the curated bullet', async () => {
        const db = makeDb();
        const fetchImpl = jest.fn(async (url) => {
            const body = /europepmc/.test(url)
                ? {
                    resultList: {
                        result: [{
                            title: 'Difficult Airway Society 2015 guidelines',
                            abstractText: 'These guidelines describe a strategy for unanticipated difficult intubation including videolaryngoscopy and front-of-neck access.',
                            pmid: '26324720',
                            journalTitle: 'Anaesthesia',
                            pubYear: '2015',
                            isOpenAccess: 'Y',
                        }],
                    },
                }
                : { is_oa: true, best_oa_location: { url_for_pdf: 'https://example.org/das.pdf' }, message: { title: ['DAS'] } };
            return {
                ok: true,
                headers: { get: () => 'application/json' },
                json: async () => body,
                text: async () => JSON.stringify(body),
            };
        });
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-9.json');
        const row = parseLiteratureFile(packPath).find((item) => /difficult airway/i.test(item.topic));
        const result = await importTopicLiterature(db, row, {
            fetchLinks: true,
            fetchImpl,
            serverConfig: { keys: { ncbiEmail: 'test@example.com' } },
        });
        expect(result.fetchedAbstractCount).toBe(1);
        const cacheWrite = db.runs.find((entry) => /INSERT INTO article_cache/i.test(entry.sql));
        expect(String(cacheWrite.params[5])).toMatch(/videolaryngoscopy/i);
        expect(String(cacheWrite.params[5])).not.toMatch(/^• Clinical Guideline/);
    });

    test('loads the checked-in batch-8 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-8.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'Borderline personality disorder dialectical behavior therapy',
            'Collapse, syncope, and cardiac arrest algorithms',
        ]));
    });

    test('imports ERS bronchiectasis guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-8.json');
        const row = parseLiteratureFile(packPath).find((item) => /bronchiectasis/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'ERS',
        }));
    });

    test('loads the checked-in batch-7 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-7.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'takayasu arteritis biologic therapy',
            'AML Transformed from MPN',
        ]));
        const tia = rows.find((row) => /transient ischemic/i.test(row.topic));
        expect(tia.links).toMatch(/0000000000000375$/);
        expect(tia.references).toMatch(/Kleindorfer/);
    });

    test('imports ISTH TTP guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-7.json');
        const row = parseLiteratureFile(packPath).find((item) => /thrombotic thrombocytopenic/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'ISTH',
        }));
    });

    test('loads the checked-in batch-6 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-6.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'noninfectious uveitis biologic therapy',
            'surgical site infection prevention',
        ]));
    });

    test('imports ASAM opioid use disorder guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-6.json');
        const row = parseLiteratureFile(packPath).find((item) => /opioid use disorder/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'ASAM',
        }));
    });

    test('loads the checked-in batch-5 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-5.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(25);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'hemodialysis adequacy and frequency',
            'neuropathic pain pharmacotherapy',
        ]));
    });

    test('imports KDOQI hemodialysis adequacy guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-5.json');
        const row = parseLiteratureFile(packPath).find((item) => /hemodialysis adequacy/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'KDOQI',
        }));
    });

    test('loads the checked-in batch-4 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-4.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(20);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'complement deficiency infection susceptibility',
            'heart failure remote hemodynamic monitoring',
        ]));
    });

    test('imports ADA continuous glucose monitoring guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-4.json');
        const row = parseLiteratureFile(packPath).find((item) => /continuous glucose/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'ADA',
        }));
    });

    test('loads the checked-in batch-3 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-3.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(10);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'catatonia benzodiazepines and ect',
            'community acquired pneumonia',
        ]));
    });

    test('imports ESO cerebral venous thrombosis guideline as trusted and servable', async () => {
        const db = makeDb();
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-3.json');
        const row = parseLiteratureFile(packPath).find((item) => /cerebral venous/i.test(item.topic));
        const result = await importTopicLiterature(db, row);
        expect(result.guidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'ESO',
        }));
    });

    test('loads the checked-in batch-1 literature pack', () => {
        const packPath = path.join(__dirname, '../../server/data/literature-packs/clinical-topics-batch-1.json');
        expect(fs.existsSync(packPath)).toBe(true);
        const rows = parseLiteratureFile(packPath);
        expect(rows).toHaveLength(15);
        expect(rows.map((row) => row.topic)).toEqual(expect.arrayContaining([
            'Achalasia endoscopic and surgical therapy',
            'Acute liver failure transplant referral',
            'biologic therapy pre treatment infection screening',
        ]));
    });

    test('parses gap CSV and literature JSON', () => {
        const gaps = parseGapCsv('topic,normalized_topic\n"Acute liver failure transplant referral","acute liver failure transplant referral"\n');
        expect(gaps).toEqual([{
            topic: 'Acute liver failure transplant referral',
            normalizedTopic: 'acute liver failure transplant referral',
        }]);
        const rows = parseLiteratureJson(JSON.stringify({ topics: [ALF_ROW] }));
        expect(rows[0].topic).toMatch(/liver failure/i);
    });

    test('imports EASL guideline as trusted + servable and stores papers', async () => {
        const db = makeDb();
        const result = await importTopicLiterature(db, ALF_ROW);

        expect(result.guidelineCount).toBe(1);
        expect(result.articleCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(isTrustedSource('EASL')).toBe(true);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({
            sourceBody: 'EASL',
            sourceUrl: expect.stringContaining('10.1016/j.jhep'),
        }));
        expect(db.upsertTopicKnowledge).toHaveBeenCalledWith(
            'acute liver failure transplant referral',
            expect.objectContaining({ seededFrom: 'topicLiteratureImport' }),
            expect.arrayContaining([expect.objectContaining({ doi: expect.stringContaining('10.1016') })]),
            'ai_generated',
            expect.any(Number)
        );
        const cacheWrites = db.runs.filter((r) => /INSERT INTO article_cache/i.test(r.sql));
        expect(cacheWrites.length).toBeGreaterThan(0);
    });

    test('recognises ACC/AHA as the trusted AHA/ACC source', async () => {
        const db = makeDb();
        const result = await importTopicLiterature(db, TAVR_ROW);
        expect(result.trustedGuidelineCount).toBe(1);
        expect(result.servableGuidelineCount).toBe(1);
        expect(db.createGuideline.mock.calls[0][0].sourceBody).toBe('AHA/ACC');
    });

    test('skips duplicate guidelines unless force is set', async () => {
        const db = makeDb();
        await importTopicLiterature(db, ALF_ROW);
        const second = await importTopicLiterature(db, ALF_ROW);
        expect(second.guidelineCount).toBe(0);
        expect(second.skippedGuidelineCount).toBe(1);

        const forced = await importTopicLiterature(db, ALF_ROW, { force: true });
        expect(forced.guidelineCount).toBe(1);
    });

    test('dry-run does not write guidelines or knowledge', async () => {
        const db = makeDb();
        const result = await importTopicLiterature(db, ALF_ROW, { dryRun: true });
        expect(result.guidelineCount).toBe(1);
        expect(db.createGuideline).not.toHaveBeenCalled();
        expect(db.upsertTopicKnowledge).not.toHaveBeenCalled();
    });

    test('imports a pack of paper-only topics without inventing guidelines', async () => {
        const db = makeDb();
        const pack = await importLiteraturePack(db, [ACHALASIA_ROW]);
        expect(pack.articleCount).toBe(2);
        expect(pack.guidelineCount).toBe(0);
        expect(db.createGuideline).not.toHaveBeenCalled();
        expect(db.upsertTopicKnowledge).toHaveBeenCalled();
    });
});
