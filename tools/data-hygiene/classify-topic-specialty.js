'use strict';
/**
 * Assign a specialty to curriculum topics promoted during the topic-identity
 * backfill (090). They were all filed under the General Medicine block with no
 * specialty, which breaks any specialty-scoped view or report of the curriculum.
 *
 * Keyword rules are checked in order; the first match wins. Order matters --
 * more specific terms are listed before general ones (e.g. "renal" before a
 * catch-all) to avoid a term like "acute kidney injury" matching ICU keywords
 * first just because "acute" appears in both lists.
 */
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const DRY = process.env.DRY_RUN === '1';

const RULES = [
  ['Paediatrics', /\b(paediatric|pediatric|neonat|infant|child|kawasaki|croup|bronchiolitis|febrile child)\b/i],
  ['Gynaecology', /\b(pregnan|obstetric|gynaecolog|gynecolog|menstrual|menopause|contracepti|ectopic|eclampsia|miscarriage|cervical cancer|ovarian)\b/i],
  ['Psychiatry', /\b(psychiat|depress|anxiety|schizophreni|bipolar|suicide|self-?harm|eating disorder|substance use|alcohol use disorder|delirium tremens)\b/i],
  ['ENT', /\b(tonsil|epistaxis|otitis|hearing loss|sinusit|laryng|pharyng|vertigo|mastoid)\b/i],
  ['Ophthalmology', /\b(retina|glaucoma|uveitis|conjunctiv|corneal|orbital cellulitis|visual loss|cataract)\b/i],
  ['Dermatology', /\b(dermat|psoriasis|eczema|skin (cancer|infection|ulcer)|urticaria|cellulitis\b(?! bacteraemia)|melanoma|hidradenitis)\b/i],
  ['Orthopaedics', /\b(fracture|hip (replacement|fracture)|osteoarthritis|joint replacement|compartment syndrome|spinal fusion|ligament)\b/i],
  ['MSK', /\b(back pain|carpal tunnel|epicondylitis|tenosynovitis|musculoskeletal|tendinopathy)\b/i],
  ['Anaesthetics', /\b(anaesthe|anesthe|perioperative|intraoperative|regional block|neuraxial|sedation)\b/i],
  ['Surgery', /\b(surger|surgical|laparotomy|laparoscop|appendicitis|bowel obstruction|anastomo|cholecystitis)\b/i],
  ['ICU / Critical Care', /\b(icu|critical care|sepsis|septic shock|mechanical ventilat|vasopressor|ards|multiorgan|extracorporeal|ecmo)\b/i],
  ['Cardiology', /\b(cardiac|cardio|heart (failure|attack)|coronary|arrhythmia|myocard|atrial fibrillation|valve|aortic|pericard|ischaemic heart)\b/i],
  ['Pulmonology', /\b(pulmonary|respirat|copd|asthma|pneumonia|pleural|lung|bronch)\b/i],
  ['Nephrology', /\b(renal|kidney|nephro|dialysis|glomerul|creatinine clearance)\b/i],
  ['Gastroenterology', /\b(hepat|liver|gastro|bowel|colitis|pancreat|biliary|cirrhosis|gi bleed)\b/i],
  ['Endocrinology & Diabetes', /\b(diabet|thyroid|adrenal|pituitary|endocrin|hormone|glucose|insulin)\b/i],
  ['Haematology', /\b(anaemia|anemia|haemophilia|leukaemia|leukemia|lymphoma|myeloma|coagulat|thrombocyt|blood product|transfusion)\b/i],
  ['Oncology', /\b(cancer|carcinoma|oncolog|chemotherap|malignan|tumour|tumor|metasta)\b/i],
  ['Infectious Diseases', /\b(infection|infectious|antibiotic|antimicrobial|antiviral|antifungal|sepsis bundle|tuberculosis|hiv|malaria|encephalitis|meningitis)\b/i],
  ['Rheumatology', /\b(rheumat|vasculitis|lupus|arthritis|spondyloarthrit|sjogren|scleroderm|myositis)\b/i],
  ['Neurology', /\b(stroke|seizure|epileps|neurolog|parkinson|dementia|multiple sclerosis|myasthenia|neuropath|migraine|encephalopathy)\b/i],
  ['Geriatrics', /\b(geriatric|frailty|falls (assessment|prevention)|polypharmacy|elderly)\b/i],
  ['Radiology', /\b(ct (head|scan)|mri\b|radiolog|imaging (finding|characteristic)|chest x-?ray)\b/i],
];

(async () => {
  const rows = (await p.query('SELECT id, display_name FROM curriculum_topics WHERE specialty IS NULL')).rows;
  // idempotent: re-running finds nothing once every topic has a specialty.
  const counts = {};
  let matched = 0, unmatched = 0;
  const samples = {};
  for (const r of rows) {
    let hit = null;
    for (const [spec, re] of RULES) {
      if (re.test(r.display_name)) { hit = spec; break; }
    }
    const spec = hit || 'General Medicine';
    counts[spec] = (counts[spec] || 0) + 1;
    if (hit) matched++; else unmatched++;
    if (!samples[spec]) samples[spec] = [];
    if (samples[spec].length < 3) samples[spec].push(r.display_name);
    if (!DRY) await p.query('UPDATE curriculum_topics SET specialty = $1 WHERE id = $2', [spec, r.id]);
  }
  console.log((DRY ? '[DRY RUN] ' : '') + 'classified: ' + rows.length + '  (keyword match: ' + matched + ', fallback General Medicine: ' + unmatched + ')');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log('  ' + k.padEnd(28) + String(v).padStart(5) + '   e.g. ' + samples[k].join(' | ').slice(0, 70));
  });
  await p.end();
})().catch((e) => { console.error(e.stack); process.exit(1); });
