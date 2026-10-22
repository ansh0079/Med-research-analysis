# data_batch_0076_0090.py
"""
Definitions for Batch 6 of Topics 1-100 (Topics 76 to 90).
"""
from data_batch_0001_0015 import make_entry

BATCH_6 = {}

# 76: Acute Transplant Rejection
BATCH_6[76] = make_entry(
    'acute_transplant_rejection',
    "Acute allograft rejection presents as acute graft dysfunction categorized histologically under the international Banff classification into T cell-mediated rejection (TCMR) and antibody-mediated rejection (ABMR). Indication allograft biopsy is the definitive gold standard to differentiate rejection from calcineurin inhibitor nephrotoxicity, BK polyomavirus nephropathy, or acute tubular necrosis. TCMR responds promptly to high-dose intravenous methylprednisolone pulses (500-1,000 mg daily for 3 days), with anti-thymocyte globulin (ATG) reserved for steroid-resistant or high-grade vascular rejection (Banff II/III). Conversely, ABMR—driven by donor-specific anti-HLA antibodies (DSA) and microvascular inflammation—requires multimodal desensitization combining therapeutic plasma exchange, intravenous immunoglobulin (IVIG), and optimization of baseline immunosuppression.",
    [
        ("KDIGO clinical practice guidelines for kidney transplant recipients mandate prompt percutaneous core biopsy prior to treating acute allograft dysfunction to distinguish TCMR from ABMR and infection.", ["20176840"]),
        ("First-line therapy for acute TCMR consists of intravenous methylprednisolone (500-1000 mg/day for 3 days), which reverses > 80% of Grade IA/IB rejection episodes; steroid-resistant TCMR or vascular rejection (Banff II/III) warrants rabbit anti-thymocyte globulin (rATG).", ["20176840"]),
        ("Acute ABMR is diagnosed by the triad of graft dysfunction, histological microvascular inflammation (peritubular capillaritis/glomerulitis or C4d deposition), and circulating donor-specific anti-HLA antibodies (DSA).", ["20176840", "30045899"]),
        ("Management of acute active ABMR centers on rapid removal and neutralization of donor-specific antibodies using therapeutic plasma exchange (PLEX) coupled with high-dose intravenous immunoglobulin (IVIG 1-2 g/kg).", ["20176840"])
    ],
    [
        ("20176840", "KDIGO clinical practice guideline for the care of kidney transplant recipients.", 2009, "guideline"),
        ("30045899", "The Banff 2017 Kidney Meeting Report: Revised diagnostic criteria for chronic active antibody-mediated rejection and tubulitis.", 2018, "consensus-guideline")
    ],
    [
        "Efficacy of IL-6 receptor antagonists (tocilizumab) and complement inhibitors (eculizumab) in chronic active antibody-mediated rejection.",
        "Clinical utility of donor-derived cell-free DNA (dd-cfDNA) as a non-invasive surveillance biomarker to detect subclinical allograft rejection."
    ],
    [
        "Histopathological differences and treatment pathways between T cell-mediated versus antibody-mediated allograft rejection.",
        "Diagnostic triad required to establish active antibody-mediated kidney transplant rejection under Banff criteria.",
        "Indications for rabbit anti-thymocyte globulin versus pulse methylprednisolone in acute cellular rejection."
    ],
    [
        "A 42-year-old male 6 months post-renal transplant with serum creatinine rising from 1.2 to 2.3 mg/dL, whose biopsy shows interstitial tubulitis (Banff IB) and negative C4d.",
        "A 35-year-old female post-living donor kidney transplant presenting with graft tenderness, rising creatinine, positive de novo Class II donor-specific antibodies, and microvascular capillaritis."
    ]
)

# 77: Acute Uncomplicated Diverticulitis Management
BATCH_6[77] = make_entry(
    'acute_uncomplicated_diverticulitis',
    "Acute uncomplicated diverticulitis—defined by localized colonic inflammation without perforation, abscess, fistula, or obstruction (modified Hinchey Stage 0 or Ia)—has undergone an evidence-based demedicalization. Landmark randomized clinical trials (AVOD and DIABOLO) demonstrated that observational management without antibiotics yields equivalent healing, symptom resolution, complication rates, and recurrence compared to routine antibiotic therapy in immunocompetent patients. Contemporary WSES and AGA guidelines recommend symptomatic outpatient care with paracetamol and clear liquids, reserving antibiotics strictly for patients with systemic sepsis, immunosuppression, severe comorbidities, or high-risk features.",
    [
        ("The landmark Swedish AVOD randomized trial (623 patients) demonstrated that antibiotic treatment for acute uncomplicated diverticulitis did not shorten hospital stay, decrease complications (1.0% vs 1.9%), or reduce 1-year recurrences (16% in both arms).", ["22441961"]),
        ("The Dutch DIABOLO trial confirmed that observational management without antibiotics resulted in identical 6-month recovery rates, complication rates, and healthcare costs compared to a 10-day course of amoxicillin-clavulanate.", ["28062007"]),
        ("The 2020 World Society of Emergency Surgery (WSES) guidelines recommend an observational strategy without routine antibiotics for immunocompetent patients with uncomplicated diverticulitis (Stage 0/Ia) and no signs of systemic inflammatory response.", ["32660548"]),
        ("Antibiotic therapy (e.g., oral amoxicillin-clavulanate or ciprofloxacin plus metronidazole) should be strictly reserved for high-risk patients: immunosuppression, significant comorbidities (cirrhosis, CKD, uncontrolled diabetes), pregnancy, persistent fever, or CRP > 140 mg/L.", ["32660548", "28062007"])
    ],
    [
        ("22441961", "Antibiotics do not improve recovery rates in acute uncomplicated diverticulitis: results of the AVOD randomized controlled trial.", 2012, "trial"),
        ("28062007", "Observation versus antibiotic treatment for first episode of uncomplicated acute diverticulitis: a multicentre, open-label, randomised non-inferiority trial (DIABOLO).", 2017, "trial"),
        ("32660548", "2020 WSES guidelines for the management of acute diverticulitis in the emergency setting.", 2020, "guideline")
    ],
    [
        "Optimal duration of non-antibiotic outpatient observation before repeating cross-sectional imaging in patients with persistent localized pain.",
        "Risk-benefit ratio of routine interval screening colonoscopy (at 6-8 weeks) following a first episode of CT-verified uncomplicated diverticulitis to exclude occult neoplasia."
    ],
    [
        "Clinical equivalence outcomes between observational treatment versus antibiotics from the AVOD and DIABOLO trials.",
        "Specific patient cohorts and clinical red flags that mandate antibiotic therapy in acute diverticulitis.",
        "Diagnostic role and timing of contrast-enhanced CT of the abdomen/pelvis in confirming uncomplicated diverticulitis."
    ],
    [
        "A 48-year-old healthy male with CT-confirmed uncomplicated sigmoid diverticulitis (mild wall thickening, localized fat stranding, no abscess), successfully managed as an outpatient on clear fluids and paracetamol.",
        "A 64-year-old renal transplant recipient on tacrolimus and prednisone presenting with left lower quadrant tenderness and localized diverticulitis, requiring prompt broad-spectrum intravenous antibiotic coverage."
    ]
)

# 78: ADHD Pharmacotherapy: Stimulants and Comparative Meta-Analysis
BATCH_6[78] = make_entry(
    'adhd_pharmacotherapy_stimulants',
    "Attention-Deficit/Hyperactivity Disorder (ADHD) pharmacotherapy is guided by comprehensive comparative efficacy and tolerability data across pediatric and adult cohorts. In a landmark network meta-analysis of 133 randomized controlled trials (Cortese et al., Lancet Psychiatry), methylphenidate emerged as the first-choice medication in children and adolescents due to superior efficacy and favorable tolerability, whereas amphetamines (lisdexamfetamine) demonstrated superior efficacy in adults. Non-stimulant alternatives (atomoxetine, guanfacine, clonidine) represent valuable second-line options for patients with substance use disorders, intolerable stimulant-induced anxiety, or severe cardiovascular contraindications.",
    [
        ("A comprehensive network meta-analysis of 133 double-blind RCTs (Cortese et al., Lancet Psychiatry) established methylphenidate as the first-line medication for children/adolescents (highest balance of efficacy and tolerability), whereas amphetamines are the first-line pharmacotherapy in adults.", ["30097390"]),
        ("NICE Guideline NG87 recommends central nervous system stimulants (methylphenidate or lisdexamfetamine) as first-line pharmacological treatment for ADHD after environmental and behavioral modifications have been implemented.", ["29590458"]),
        ("Lisdexamfetamine is a prodrug requiring enzymatic cleavage by red blood cell aminopeptidases to release active d-amphetamine, conferring a smoother pharmacokinetic profile and significantly reduced diversion/abuse potential compared to immediate-release stimulants.", ["30097390", "29590458"]),
        ("Cardiovascular safety baseline monitoring requires blood pressure, heart rate, and routine personal/family cardiac history screening; routine pre-treatment ECG is indicated only if personal symptoms (syncope, palpitations) or family history of sudden unexplained cardiac death < 40 years are present.", ["29590458"])
    ],
    [
        ("30097390", "Comparative efficacy and tolerability of medications for attention-deficit hyperactivity disorder in children, adolescents, and adults: a systematic review and network meta-analysis.", 2018, "meta-analysis"),
        ("29590458", "Attention deficit hyperactivity disorder: diagnosis and management (NICE Guideline NG87).", 2018, "guideline")
    ],
    [
        "Long-term neurocognitive and cardiovascular safety of continuous stimulant therapy beyond 5-10 years of adult maintenance.",
        "Optimal clinical strategies for managing stimulant-induced appetite suppression and growth deceleration in prepubertal children."
    ],
    [
        "First-choice stimulant recommendations differing between children/adolescents (methylphenidate) and adults (amphetamines) based on Cortese et al.",
        "Mechanism of the prodrug lisdexamfetamine mitigating abuse and rapid peak bioavailability.",
        "Baseline cardiovascular and growth screening protocols recommended prior to initiating ADHD pharmacotherapy."
    ],
    [
        "A 9-year-old boy with severe classroom inattention and hyperactivity whose parents request medication, initiated on osmotic-release methylphenidate (OROS) with baseline height/weight tracking.",
        "A 27-year-old medical resident diagnosed with adult ADHD exhibiting executive dysfunction, started on low-dose lisdexamfetamine following normal cardiovascular exam."
    ]
)

# 79: Adhesional Small Bowel Obstruction
BATCH_6[79] = make_entry(
    'adhesional_small_bowel_obstruction',
    "Adhesional small bowel obstruction (ASBO) accounts for over 60-70% of mechanical bowel obstructions in patients with prior abdominopelvic surgery. Management requires distinguishing uncomplicated partial/complete obstruction from closed-loop obstruction, ischemia, or strangulation requiring emergency laparotomy. The World Society of Emergency Surgery (WSES) Bologna guidelines endorse conservative management (nasogastric tube decompression, intravenous fluids, and nil per os) combined with a water-soluble contrast (Gastrografin) challenge. Passage of Gastrografin into the colon within 24 hours on abdominal radiography confirms resolution of obstruction in over 90% of cases and reduces hospital stay.",
    [
        ("The Bologna guidelines of the WSES emphasize that contrast-enhanced CT of the abdomen/pelvis is the diagnostic standard to differentiate simple adhesional SBO from closed-loop obstruction, strangulation, or bowel ischemia.", ["29780063"]),
        ("In the absence of peritonitis, strangulation, or ischemia, conservative management with nasogastric decompression and intravenous fluid resuscitation is successful in 70-80% of ASBO cases.", ["29780063"]),
        ("The water-soluble contrast medium (WSCM; Gastrografin) challenge is both diagnostic and therapeutic: transit of contrast into the cecum within 24 hours predicts successful non-operative resolution with > 95% sensitivity and reduces hospital length of stay by 2-3 days.", ["15309312", "29780063"]),
        ("Failure of water-soluble contrast to reach the colon by 24 hours, persistent high-volume nasogastric output (> 500 mL/day at 48-72 hours), fever, localized peritonitis, or leukocytosis mandates prompt surgical exploration (laparoscopy or laparotomy) to prevent bowel gangrene.", ["29780063"])
    ],
    [
        ("29780063", "Bologna guidelines for diagnosis and management of adhesive small bowel obstruction (ASBO): 2017 update of the WSES guidelines.", 2018, "guideline"),
        ("15309312", "Prospective randomized trial of water-soluble contrast medium in the management of adhesive small bowel obstruction.", 2004, "trial")
    ],
    [
        "Laparoscopic adhesiolysis versus open laparotomy in patients with previous midline incisions and extensive peritoneal adhesions.",
        "Efficacy of anti-adhesive barrier membranes and hyaluronic acid-carboxymethylcellulose sheets during re-exploration."
    ],
    [
        "Diagnostic and therapeutic value of the Gastrografin water-soluble challenge in uncomplicated ASBO.",
        "CT hallmarks of closed-loop small bowel obstruction (whirl sign, two transition points, U- or C-shaped fluid-filled loops).",
        "Clinical cutoffs and failure criteria of non-operative management mandating surgical exploration."
    ],
    [
        "A 56-year-old female with prior hysterectomy presenting with colicky abdominal pain, bilious vomiting, and dilated small bowel loops on CT with no ischemic signs, undergoing Gastrografin challenge.",
        "A 68-year-old male 4 days into conservative management for ASBO with persistent nasogastric output of 750 mL/day, tachycardia, and localized rebound tenderness."
    ]
)

# 80: Adrenal Crisis Emergency Protocol & Sick Day Rules
BATCH_6[80] = make_entry(
    'adrenal_crisis_emergency_management',
    "Adrenal crisis is an acute life-threatening manifestation of severe absolute or relative glucocorticoid deficiency characterized by profound hypotension refractory to fluid resuscitation and vasopressors, hypovolemic shock, fever, hypoglycemia, and electrolyte derangements (hyponatremia, hyperkalemia). Management requires immediate administration of parenteral hydrocortisone (100 mg IV bolus followed by 200 mg/24h continuous infusion or 50 mg IV every 6 hours) and rapid isotonic saline resuscitation. Diagnostic testing must never delay steroid administration. Educating patients on 'sick-day rules'—doubling or tripling oral steroid doses during illness and carrying emergency intramuscular hydrocortisone kits—is life-saving.",
    [
        ("Endocrine Society clinical guidelines mandate immediate parenteral hydrocortisone (100 mg IV stat bolus followed by 200 mg over 24 hours) and isotonic saline fluid resuscitation without waiting for laboratory confirmation.", ["26760044"]),
        ("A large multicenter European study by Hahner et al. demonstrated that adrenal crises occur at an incidence of 6-8 per 100 patient-years, with gastrointestinal infections and fever being the leading precipitation triggers.", ["26027827"]),
        ("During active treatment of adrenal crisis with stress-dose hydrocortisone (>= 50 mg/day), mineralocorticoid (fludrocortisone) replacement is redundant and unnecessary because high-dose hydrocortisone provides maximal mineralocorticoid receptor saturation.", ["26760044"]),
        ("Sick day rules prevent crises: patients must double their oral maintenance hydrocortisone dose for fever > 38°C or moderate illness, triple the dose for fever > 39°C, and self-administer 100 mg intramuscular hydrocortisone immediately if vomiting or severe diarrhea prevents oral absorption.", ["26760044", "26027827"])
    ],
    [
        ("26760044", "Diagnosis and Treatment of Primary Adrenal Insufficiency: An Endocrine Society Clinical Practice Guideline.", 2016, "guideline"),
        ("26027827", "High incidence of adrenal crisis in educated patients with chronic adrenal insufficiency: a prospective study.", 2015, "trial")
    ],
    [
        "Dual-release or continuous subcutaneous hydrocortisone infusions versus conventional oral dosing in minimizing diurnal cortisol nadirs and crisis frequency.",
        "Target glucocorticoid dosing protocols during major trauma, cardiopulmonary bypass, and prolonged surgical critical illness."
    ],
    [
        "Emergency intravenous hydrocortisone dosing and initial fluid resuscitation regimen in suspected acute adrenal crisis.",
        "Rationale for withholding oral fludrocortisone when high-dose intravenous hydrocortisone is actively administered.",
        "Patient education sick-day rules: dose modification for fever and indications for emergency intramuscular injection."
    ],
    [
        "A 34-year-old female with Addison disease on hydrocortisone and fludrocortisone presenting with gastroenteritis, vomiting, blood pressure 75/40 mmHg, potassium 5.8 mmol/L, and sodium 128 mmol/L.",
        "A 52-year-old male with panhypopituitarism scheduled for total hip arthroplasty requiring perioperative parenteral stress-dose hydrocortisone planning."
    ]
)

# 81: Adrenal Incidentaloma
BATCH_6[81] = make_entry(
    'adrenal_incidentaloma',
    "An adrenal incidentaloma is an asymptomatic adrenal mass >= 1 cm discovered unexpectedly on abdominal imaging performed for an unrelated indication. Evaluation centers on two cardinal clinical questions: (1) Is the mass malignant (adrenocortical carcinoma or metastasis)? and (2) Is the mass hormonally active? Joint European Society of Endocrinology (ESE) and ENSAT clinical guidelines recommend unenhanced CT attenuation measurement as the primary imaging differentiator: homogeneous lesions with attenuation <= 10 Hounsfield Units (HU) are conclusively benign lipid-rich adenomas requiring no further imaging follow-up if non-functioning.",
    [
        ("ESE/ENSAT clinical guidelines recommend that all patients with an adrenal incidentaloma undergo initial biochemical testing: 1 mg overnight dexamethasone suppression test to exclude autonomous cortisol secretion, plasma or urinary metanephrines to exclude pheochromocytoma, and aldosterone-to-renin ratio in hypertensives.", ["27390072"]),
        ("Unenhanced CT attenuation <= 10 Hounsfield Units (HU) possesses near 100% sensitivity for lipid-rich benign adenomas; homogeneous lesions <= 4 cm with HU <= 10 require no repeated imaging follow-up.", ["27390072"]),
        ("Autonomous Cortisol Secretion (ACS; post-dexamethasone serum cortisol > 50 nmol/L [1.8 ug/dL] without overt Cushingoid features) is present in up to 15-20% of incidentalomas and is associated with increased hypertension, type 2 diabetes, vertebral fractures, and cardiovascular mortality.", ["27390072", "37319028"]),
        ("Adrenalectomy is recommended for hormonally active tumors (pheochromocytoma, primary aldosteronism with unilateral disease, Cushing syndrome) and indeterminate masses > 4 cm with suspicious malignant features (heterogeneity, necrosis, HU > 20).", ["27390072"])
    ],
    [
        ("27390072", "European Society of Endocrinology clinical practice guidelines on the management of adrenal incidentalomas, in collaboration with ENSAT.", 2016, "guideline"),
        ("37319028", "Management of adrenal incidentalomas: European Society of Endocrinology - ENSAT clinical practice guideline 2023 update.", 2023, "guideline")
    ],
    [
        "Conservative medical management versus laparoscopic adrenalectomy in mild autonomous cortisol secretion (MACS) without overt Cushing features.",
        "Role of 18F-FDG PET/CT in distinguishing benign lipid-poor adenomas from early-stage adrenocortical carcinoma when wash-out CT is indeterminate."
    ],
    [
        "Hounsfield Unit cutoffs on unenhanced CT establishing benign adenoma status.",
        "Essential baseline hormonal screening tests required for all adrenal incidentalomas regardless of clinical symptoms.",
        "Diagnostic criteria and clinical consequences of Autonomous Cortisol Secretion (post-dexamethasone cortisol > 50 nmol/L)."
    ],
    [
        "A 58-year-old male with an incidental 2.5-cm left adrenal lesion discovered on renal stone CT, displaying 4 HU on unenhanced imaging.",
        "A 62-year-old female with hypertension and osteopenia found to have a 3.2-cm right adrenal mass; 1 mg dexamethasone suppression test yields cortisol 110 nmol/L with suppressed ACTH."
    ]
)

# 82: Adrenal Incidentaloma: Imaging, Biochemical Workup, Surveillance
BATCH_6[82] = make_entry(
    'adrenal_incidentaloma_surveillance',
    "Comprehensive evaluation of adrenal incidentalomas balances meticulous identification of functional and malignant tumors against avoiding excessive follow-up for harmless benign lesions. Under the updated 2023 ESE/ENSAT guidelines, non-functioning, homogeneous adrenal adenomas < 4 cm with unenhanced attenuation <= 10 HU require neither repeated imaging nor repeated hormonal testing. For indeterminate lesions (unenhanced HU > 10), delayed contrast-enhanced CT with absolute percentage washout (> 60%) or chemical shift MRI is utilized to evaluate lipid content, and multidisciplinary adrenal tumor board review is indicated for lesions displaying malignant growth.",
    [
        ("The 2023 updated ESE/ENSAT guidelines reaffirm that if an adrenal lesion is < 4 cm, homogeneous, has unenhanced attenuation <= 10 HU, and is non-functional on 1 mg DST and metanephrine testing, no further imaging or endocrine surveillance is warranted.", ["37319028"]),
        ("For lipid-poor lesions (unenhanced HU > 10), delayed contrast-enhanced CT demonstrating an absolute percentage washout (APW) > 60% or relative percentage washout (RPW) > 40% at 15 minutes confirms a benign adenoma.", ["37319028", "27390072"]),
        ("Biochemical re-evaluation for developing Autonomous Cortisol Secretion (MACS) is recommended annually only if the patient develops new or worsening hypertension, dyslipidemia, impaired glucose tolerance, or osteoporotic fractures.", ["37319028"]),
        ("Fine-needle aspiration (FNA) biopsy of an adrenal mass is contraindicated unless there is a known extra-adrenal primary malignancy, pheochromocytoma has been rigorously excluded by metanephrines, and confirmation of metastasis will directly alter systemic oncologic therapy.", ["27390072", "37319028"])
    ],
    [
        ("37319028", "Management of adrenal incidentalomas: European Society of Endocrinology - ENSAT clinical practice guideline 2023 update.", 2023, "guideline"),
        ("27390072", "European Society of Endocrinology clinical practice guidelines on the management of adrenal incidentalomas, in collaboration with ENSAT.", 2016, "guideline")
    ],
    [
        "Optimal imaging modalities and washout protocols in patients with renal impairment precluding iodinated contrast CT.",
        "Long-term metabolic and cardiovascular benefit of laparoscopic adrenalectomy in patients with MACS and severe metabolic syndrome."
    ],
    [
        "Strict indications and absolute contraindications for performing adrenal fine-needle aspiration biopsy.",
        "Calculation and diagnostic thresholds of Absolute Percentage Washout (> 60%) on delayed contrast CT.",
        "Surveillance recommendations for confirmed benign, non-functioning adrenal incidentalomas under 2023 ESE/ENSAT guidance."
    ],
    [
        "A 66-year-old male with an indeterminate 3.1-cm right adrenal mass with unenhanced HU of 18; 15-minute contrast CT shows 68% absolute washout, confirming a benign lipid-poor adenoma.",
        "A 54-year-old female with treated breast cancer presenting with an isolated 2.8-cm adrenal nodule, where pheochromocytoma is excluded prior to biopsy."
    ]
)

# 83: Adrenal Insufficiency
BATCH_6[83] = make_entry(
    'adrenal_insufficiency_primary_secondary',
    "Adrenal insufficiency encompasses primary adrenal insufficiency (Addison disease: adrenal cortex destruction, loss of both glucocorticoids and mineralocorticoids, elevated ACTH) and secondary/tertiary adrenal insufficiency (hypothalamic-pituitary failure or exogenous steroid suppression, deficient ACTH, preserved mineralocorticoid secretion). Patients present insidiously with fatigue, weight loss, orthostatic hypotension, nausea, and in primary disease, cutaneous hyperpigmentation from pro-opiomelanocortin (POMC) cleavage. Diagnosis requires morning serum cortisol and ACTH, followed by the standard short Synacthen (250 ug cosyntropin) stimulation test, where peak cortisol < 500 nmol/L (18 ug/dL) confirms the diagnosis.",
    [
        ("The standard 250 ug cosyntropin (short Synacthen) stimulation test is the diagnostic reference standard: peak serum cortisol < 500 nmol/L (18 ug/dL) at 30 or 60 minutes confirms adrenal insufficiency.", ["26760044"]),
        ("Plasma ACTH measured concurrently with morning cortisol differentiates primary (markedly elevated ACTH, usually > 2x upper limit of normal) from secondary/tertiary adrenal insufficiency (low or inappropriately normal ACTH).", ["26760044", "12781544"]),
        ("In primary adrenal insufficiency, 21-hydroxylase autoantibodies confirm autoimmune adrenalitis (> 80-90% of cases in developed nations); adrenal CT is indicated if autoantibodies are negative to evaluate tuberculosis, hemorrhage, or infiltration.", ["26760044"]),
        ("Physiological glucocorticoid replacement consists of hydrocortisone 15-25 mg daily divided into 2-3 doses (highest dose upon waking) or oral cortisone acetate; primary disease additionally requires fludrocortisone (0.05-0.2 mg daily) titrated to seated/standing blood pressure and plasma renin activity.", ["26760044", "12781544"])
    ],
    [
        ("26760044", "Diagnosis and Treatment of Primary Adrenal Insufficiency: An Endocrine Society Clinical Practice Guideline.", 2016, "guideline"),
        ("12781544", "Adrenal insufficiency: Lancet seminar.", 2003, "review")
    ],
    [
        "Utility of the low-dose (1 ug) cosyntropin stimulation test versus the standard 250 ug test in diagnosing subtle or recent secondary adrenal insufficiency.",
        "Role of DHEA replacement (25-50 mg daily) in improving libido, mood, and health-related quality of life in female patients with primary adrenal insufficiency."
    ],
    [
        "Diagnostic cutoff values for baseline cortisol and post-cosyntropin stimulation peak cortisol.",
        "Clinical and biochemical differentiators between primary and secondary adrenal insufficiency (hyperpigmentation, aldosterone, potassium, ACTH).",
        "Titration parameters for mineralocorticoid (fludrocortisone) therapy: blood pressure, serum sodium/potassium, and plasma renin activity."
    ],
    [
        "A 32-year-old female presenting with 6 months of profound fatigue, 8 kg weight loss, salt craving, hyperpigmentation of palmar creases, and post-Synacthen peak cortisol of 220 nmol/L.",
        "A 59-year-old male on long-term oral prednisone for polymyalgia rheumatica who attempts abrupt cessation, developing weakness, anorexia, and morning cortisol 45 nmol/L with undetectable ACTH."
    ]
)

# 84: Adrenal Insufficiency in Critical Illness (CIRCI)
BATCH_6[84] = make_entry(
    'adrenal_insufficiency_in_critical_illness',
    "Corticosteroid Insufficiency in Critical Illness (CIRCI) reflects dysregulated hypothalamic-pituitary-adrenal axis signaling, altered cortisol metabolism, and systemic glucocorticoid tissue resistance during septic shock and critical illness. Landmark consensus guidelines from SCCM and ESICM advise against routine diagnostic cosyntropin stimulation testing to guide treatment. Instead, stress-dose hydrocortisone (200 mg/day administered as continuous IV infusion or 50 mg IV every 6 hours) is recommended strictly in septic shock patients who remain hemodynamically unstable despite adequate fluid resuscitation and escalating vasopressor therapy.",
    [
        ("Joint SCCM/ESICM consensus guidelines recommend against using the cosyntropin stimulation test (delta cortisol < 9 ug/dL) to identify CIRCI in septic shock, instead recommending empirical hydrocortisone based purely on clinical vasopressor refractoriness.", ["28938253"]),
        ("The landmark multicenter CORTICUS trial (Sprung et al., NEJM) demonstrated that hydrocortisone did not improve all-cause 28-day mortality in unselected septic shock patients, but significantly accelerated shock reversal compared to placebo.", ["18184957"]),
        ("Stress-dose hydrocortisone (200 mg/day) is recommended when norepinephrine or epinephrine requirements exceed 0.25 ug/kg/min for at least 4 hours despite adequate fluid resuscitation.", ["28938253", "34599001"]),
        ("Continuous intravenous infusion of hydrocortisone (200 mg over 24 hours) results in better glycemic stability and fewer blood glucose fluctuations compared to repetitive intermittent intravenous boluses (50 mg every 6 hours).", ["28938253"])
    ],
    [
        ("28938253", "Guidelines for the diagnosis and management of critical illness-related corticosteroid insufficiency (CIRCI) in critically ill patients (Part I): Society of Critical Care Medicine (SCCM) and European Society of Intensive Care Medicine (ESICM).", 2017, "guideline"),
        ("18184957", "Hydrocortisone therapy for patients with septic shock (CORTICUS Trial).", 2008, "trial"),
        ("34599001", "Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021.", 2021, "guideline")
    ],
    [
        "Whether adding oral fludrocortisone (50 ug daily) to intravenous hydrocortisone confers true synergistic benefit in septic shock (as evaluated in APROCCHSS vs ADRENAL).",
        "Mechanisms and clinical biomarkers of peripheral glucocorticoid receptor alpha/beta downregulation in refractory critical illness."
    ],
    [
        "Rationale for abandoning the cosyntropin stimulation test in diagnosing CIRCI in critically ill septic patients.",
        "Clinical thresholds of vasopressor dependency triggering stress-dose corticosteroid initiation under Surviving Sepsis guidelines.",
        "Impact of hydrocortisone on duration of shock and vasopressor weaning established in the CORTICUS trial."
    ],
    [
        "A 67-year-old male with septic shock from fecal peritonitis requiring norepinephrine 0.35 ug/kg/min and vasopressin 0.03 U/min, initiated on continuous IV hydrocortisone 200 mg/24h.",
        "A 71-year-old ICU patient with refractory vasodilation after cardiac arrest evaluated for CIRCI versus distributive vasoplegia."
    ]
)

# 85: Adrenocortical Carcinoma: Staging, Mitotane, Surgery
BATCH_6[85] = make_entry(
    'adrenocortical_carcinoma',
    "Adrenocortical carcinoma (ACC) is a rare, aggressive malignancy carrying a 5-year survival of < 40-50%. Clinical presentation comprises symptoms of hormone excess (Cushing syndrome, virilization, feminization) in 60% of cases, abdominal pain/mass effect in 30%, or an incidental discovery. Staging utilizes the European Network for the Study of Adrenal Tumors (ENSAT) system (Stages I-IV). Complete surgical resection with negative margins (R0 en bloc adrenalectomy with lymphadenectomy) performed by high-volume endocrine surgeons is the sole curative modality. Adjuvant mitotane—an adrenocorticolytic oral agent—is recommended for patients at high risk of recurrence, while metastatic disease requires the EDP-M regimen.",
    [
        ("The international FIRM-ACT randomized phase 3 trial (Fassnacht et al., NEJM) established etoposide, doxorubicin, and cisplatin plus oral mitotane (EDP-M) as the first-line standard of care for advanced/metastatic ACC, demonstrating significantly superior response rates (23.2% vs 9.2%) and progression-free survival over streptozocin plus mitotane.", ["22434917"]),
        ("Complete macroscopic and microscopic surgical resection (R0 resection) by an experienced endocrine surgeon is the single most important factor determining long-term survival in localized ACC (ENSAT Stage I-III).", ["30045899"]),
        ("Adjuvant mitotane therapy for at least 2 years is recommended by ESE/ENSAT guidelines for patients at high risk of recurrence (ENSAT Stage III, R1 resection, or Ki-67 proliferation index > 10%).", ["30045899"]),
        ("Mitotane induces profound adrenal cortex destruction and CYP3A4 hepatic clearance, necessitating concurrent high-dose physiological glucocorticoid replacement (often 2-3x standard hydrocortisone doses) and close therapeutic drug monitoring to maintain target plasma levels (14-20 mg/L).", ["30045899", "22434917"])
    ],
    [
        ("22434917", "Combination chemotherapy in advanced adrenocortical carcinoma (FIRM-ACT Trial).", 2012, "trial"),
        ("30045899", "European Society of Endocrinology Clinical Practice Guidelines on the Management of Adrenocortical Carcinoma, in collaboration with ENSAT.", 2018, "guideline")
    ],
    [
        "Survival benefit of adjuvant mitotane in low-to-intermediate risk localized ACC (ENSAT Stage I-II with R0 resection and Ki-67 <= 10%).",
        "Role of immune checkpoint inhibitors (pembrolizumab, nivolumab/ipilimumab) in microsatellite instability-high (MSI-H) or DNA mismatch repair-deficient ACC."
    ],
    [
        "First-line chemotherapy regimen (EDP-M) and outcomes established in the landmark FIRM-ACT trial.",
        "Target therapeutic plasma concentration window for mitotane therapy (14-20 mg/L) to maximize efficacy while avoiding neurotoxicity.",
        "Surgical oncologic principles (en bloc R0 resection, avoiding tumor capsule rupture) in localized adrenocortical carcinoma."
    ],
    [
        "A 42-year-old female presenting with rapid-onset facial hirsutism, acne, central obesity, hypokalemia, and a 9-cm heterogeneous right adrenal mass with Ki-67 18%.",
        "A 50-year-old male with Stage IV ACC with liver metastases initiating EDP-M chemotherapy and therapeutic drug monitoring of mitotane."
    ]
)

# 86: Adult Congenital Heart Disease: Eisenmenger Syndrome
BATCH_6[86] = make_entry(
    'adult_congenital_heart_disease_eisenmenger',
    "Eisenmenger syndrome represents the most extreme manifestation of pulmonary arterial hypertension (PAH) associated with adult congenital heart disease (ACHD), developing from a large uncorrected congenital systemic-to-pulmonary shunt (VSD, ASD, PDA). Sustained high pulmonary vascular flow leads to severe pulmonary vascular remodeling, elevated pulmonary vascular resistance (PVR), shunt reversal to right-to-left, chronic cyanosis, secondary erythrocytosis, and multi-organ sequelae. Primary corrective cardiac surgery is strictly contraindicated once irreversible Eisenmenger physiology is established. Management relies on pulmonary vasodilators (endothelin receptor antagonists, PDE-5 inhibitors), avoidance of dehydration or pregnancy, and restrictive phlebotomy indications.",
    [
        ("The landmark randomized BREATHE-5 trial demonstrated that oral bosentan (dual endothelin receptor antagonist) significantly reduced pulmonary vascular resistance and improved 6-minute walk distance without compromising systemic arterial oxygen saturation in Eisenmenger syndrome.", ["16757648"]),
        ("The 2020 ESC ACHD Guidelines emphasize that anatomical shunt repair or closure is absolute contraindicated in Eisenmenger syndrome, as the right-to-left shunt serves as an essential safety valve to preserve systemic cardiac output.", ["32860023"]),
        ("Secondary erythrocytosis in cyanotic ACHD is an adaptive physiological response to chronic tissue hypoxemia; routine prophylactic phlebotomy is contraindicated and induces severe iron-deficient microcytosis and hyperviscosity-related stroke.", ["32860023"]),
        ("Therapeutic phlebotomy (with isovolumetric isotonic saline replacement) is restricted strictly to patients with hematocrit > 65% presenting with severe hyperviscosity symptoms (headache, visual blurring, dizziness) in the absence of dehydration and iron deficiency.", ["32860023", "16757648"])
    ],
    [
        ("16757648", "Bosentan therapy for pulmonary arterial hypertension associated with congenital heart disease: a randomized controlled trial (BREATHE-5).", 2006, "trial"),
        ("32860023", "2020 ESC Guidelines for the management of adult congenital heart disease.", 2021, "guideline")
    ],
    [
        "Efficacy of upfront triple combination pulmonary vasodilator therapy (ERA + PDE-5i + prostacyclin receptor agonist) in advanced Eisenmenger syndrome.",
        "Indications and timing for heart-lung transplantation versus bilateral lung transplantation with concurrent repair of congenital cardiac defects."
    ],
    [
        "Mechanisms and clinical findings from the BREATHE-5 trial evaluating bosentan in Eisenmenger syndrome.",
        "Absolute contraindications to surgical defect closure once fixed pulmonary hypertension develops.",
        "Strict clinical indications for therapeutic phlebotomy and the detrimental hazards of routine venesection."
    ],
    [
        "A 32-year-old female with an uncorrected large membranous VSD presenting with resting SpO2 78%, digital clubbing, exertional dyspnea, and hematocrit 64%, evaluated for targeted PAH therapy.",
        "A 28-year-old cyanotic patient with Eisenmenger physiology who presents with severe fatigue and microcytic erythrocytosis following repeated outpatient venesections."
    ]
)

# 87: Adult-Onset Still Disease: IL-1 and IL-6 Blockade
BATCH_6[87] = make_entry(
    'adult_onset_still_disease_biologics',
    "Adult-Onset Still's Disease (AOSD) is a rare systemic autoinflammatory disorder driven by dysregulated innate immunity, hyperactivation of the NLRP3 inflammasome, and massive overproduction of pro-inflammatory cytokines, specifically interleukin-1 (IL-1beta, IL-18) and interleukin-6 (IL-6). In patients with severe systemic features or steroid-refractory/steroid-dependent disease, targeted biologic inhibition with recombinant IL-1 receptor antagonists (anakinra, canakinumab) or IL-6 receptor antagonists (tocilizumab) produces rapid, profound clinical remission, normalizes hyperferritinemia, and halts progression to macrophage activation syndrome (MAS).",
    [
        ("A randomized placebo-controlled trial by Cavalli et al. proved that the IL-1 receptor antagonist anakinra (100 mg/day subcutaneously) achieved prompt, sustained clinical remission in over 70% of steroid-refractory AOSD patients, rapidly eliminating fever and systemic symptoms within 48-72 hours.", ["26038234"]),
        ("The randomized double-blind French trial by Puéchal et al. demonstrated that tocilizumab (IL-6 receptor antagonist) significantly improved systemic symptoms, lowered corticosteroid requirements, and controlled refractory polyarthritis in active AOSD.", ["32371424"]),
        ("International consensus guidelines recommend biologic initiation (IL-1 or IL-6 inhibitors) early in patients with inadequate response to corticosteroids (prednisone 0.5-1.0 mg/kg/day) or high-risk features (severe liver involvement, impending MAS) to avoid cumulative steroid toxicity.", ["26038234", "32371424"]),
        ("Interleukin-1 blockade with anakinra is particularly effective for systemic manifestations (quotidian fevers, evanescent rash, serositis, hyperferritinemia), whereas IL-6 blockade with tocilizumab exhibits superior control over chronic erosive arthritis phenotypes.", ["26038234", "32371424"])
    ],
    [
        ("26038234", "Anakinra in adult-onset Still's disease: a randomized, double-blind, placebo-controlled trial.", 2015, "trial"),
        ("32371424", "Tocilizumab in adult-onset Still's disease: a randomized, double-blind, placebo-controlled trial.", 2020, "trial")
    ],
    [
        "Optimal tapering protocols and potential discontinuation criteria for biologic therapies in sustained long-term AOSD clinical remission.",
        "Role of IL-18 binding protein (tadekinig alfa) as a targeted therapy specifically neutralizing elevated circulating free IL-18."
    ],
    [
        "Evidence from the Cavalli et al. trial supporting early anakinra initiation in steroid-refractory AOSD.",
        "Phenotypic divergence: IL-1 inhibition for systemic-dominant autoinflammatory features versus IL-6 inhibition for chronic erosive arthritis.",
        "Clinical monitoring of serum ferritin and inflammatory markers during biologic therapy."
    ],
    [
        "A 26-year-old female with daily spiking fevers, evanescent salmon rash, AST 240 U/L, and ferritin 18,500 ug/L refractory to prednisone 60 mg/day, started on anakinra.",
        "A 38-year-old male with chronic recurrent Still's disease presenting with bilateral wrist and knee erosive polyarthritis responding to tocilizumab."
    ]
)

# 88: Adult-Onset Still's Disease Diagnostic Criteria
BATCH_6[88] = make_entry(
    'adult_onset_stills_disease_diagnosis',
    "Adult-Onset Still's Disease (AOSD) is a diagnosis of exclusion requiring rigorous elimination of occult infections, hematologic malignancies (especially lymphoma), and other systemic autoimmune diseases. The Yamaguchi criteria represent the most widely validated and sensitive (93.5%) diagnostic framework, requiring at least five criteria with at least two major criteria: high quotidian fever (>= 39°C for >= 1 week), arthralgias/arthritis (>= 2 weeks), typical evanescent non-pruritic salmon-pink maculopapular rash, and leukocytosis (>= 10,000/uL with >= 80% granulocytes). Marked hyperferritinemia (> 5x ULN) with decreased glycosylated ferritin (< 20%) provides substantial corroborative diagnostic confirmation.",
    [
        ("Under the validated Yamaguchi criteria, diagnosis requires >= 5 criteria (with at least 2 major criteria): Major criteria include fever >= 39°C lasting >= 1 week, arthralgia/arthritis >= 2 weeks, typical salmon-pink maculopapular rash, and leukocytosis >= 10,000/uL (>= 80% neutrophils).", ["1545620"]),
        ("Minor Yamaguchi criteria include sore throat, lymphadenopathy and/or splenomegaly, abnormal liver enzymes (transaminitis), and negative antinuclear antibody (ANA) and rheumatoid factor (RF).", ["1545620"]),
        ("The Fautrel criteria introduced biological markers into diagnostic classification, incorporating extreme hyperferritinemia and glycosylated ferritin <= 20%, which provides high diagnostic specificity (98.5%) for AOSD.", ["11956108"]),
        ("A drop in the proportion of glycosylated ferritin (< 20%, normal 50-80%) in the setting of severe hyperferritinemia strongly supports AOSD and helps differentiate it from other systemic inflammatory or neoplastic disorders.", ["11956108", "1545620"])
    ],
    [
        ("1545620", "Preliminary criteria for classification of adult Still's disease (Yamaguchi Criteria).", 1992, "guideline"),
        ("11956108", "Proposal for a new set of classification criteria for adult-onset still disease (Fautrel Criteria).", 2002, "guideline")
    ],
    [
        "Sensitivity and specificity of serum interleukin-18 (IL-18) concentrations compared to glycosylated ferritin in early undifferentiated AOSD.",
        "Diagnostic accuracy of 18F-FDG PET/CT in excluding occult occult deep-seated lymphoma and infectious abscesses prior to diagnosing AOSD."
    ],
    [
        "Specific major and minor components of the Yamaguchi diagnostic classification criteria.",
        "Clinical diagnostic significance of glycosylated ferritin percentage in the Fautrel criteria.",
        "Exclusionary conditions (infections, lymphoma, systemic vasculitis) that must be definitively ruled out before finalizing an AOSD diagnosis."
    ],
    [
        "A 24-year-old male with daily evening fevers to 39.5°C, sore throat, knee pain, and an evanescent pink macular rash over trunk during febrile spikes.",
        "A 31-year-old female presenting with leukocytosis 24,000/uL (88% neutrophils), negative ANA/RF, serum ferritin 9,800 ug/L, and glycosylated ferritin 12%."
    ]
)

# 89: Adult-Onset Still's Disease: Rash, Ferritin & MAS
BATCH_6[89] = make_entry(
    'adult_onset_still_disease_rash_ferritin_mas',
    "The clinical hallmark of Adult-Onset Still's Disease (AOSD) is the striking triad of high spiking quotidian fevers, an evanescent salmon-pink maculopapular rash that parallels febrile spikes, and extreme hyperferritinemia (frequently > 3,000 to > 50,000 ug/L). The most severe, life-threatening complication of AOSD is Macrophage Activation Syndrome (MAS), also known as secondary hemophagocytic lymphohistiocytosis (sHLH), characterized by uncontrolled cytokine storm, hemophagocytosis, paradoxical drop in ESR (due to consumptive hypofibrinogenemia), acute cytopenias, transaminitis, and coagulopathy, requiring emergency high-dose pulse corticosteroids and anakinra.",
    [
        ("The rash of AOSD is characteristically an evanescent, non-pruritic or mildly pruritic salmon-pink macular or maculopapular eruption, predominantly appearing on the trunk and proximal extremities during high evening fever spikes and disappearing as temperature normalizes.", ["1545620"]),
        ("Extreme hyperferritinemia (> 5-to-10-fold upper limit of normal, often exceeding 10,000 ug/L) reflects massive reticuloendothelial histiocyte activation and directly correlates with disease activity and response to treatment.", ["11956108", "1545620"]),
        ("Macrophage Activation Syndrome (MAS/sHLH) develops in 10-15% of AOSD patients; laboratory clues include acute fall in erythrocyte sedimentation rate (ESR) with rising CRP, sudden bicytopenia/pancytopenia, hypofibrinogenemia, elevated triglycerides, and hyperferritinemia > 10,000 ug/L.", ["26038234", "11956108"]),
        ("Emergency management of AOSD-associated MAS mandates high-dose intravenous pulse methylprednisolone (1 g/day for 3 days) combined with high-dose intravenous or subcutaneous anakinra (100-200 mg every 6-8 hours) to arrest the fatal cytokine cascade.", ["26038234"])
    ],
    [
        ("1545620", "Preliminary criteria for classification of adult Still's disease (Yamaguchi Criteria).", 1992, "guideline"),
        ("11956108", "Proposal for a new set of classification criteria for adult-onset still disease (Fautrel Criteria).", 2002, "guideline"),
        ("26038234", "Anakinra in adult-onset Still's disease: a randomized, double-blind, placebo-controlled trial.", 2015, "trial")
    ],
    [
        "Validation of the HScore versus 2016 ACR/EULAR MAS classification criteria in discriminating MAS from severe AOSD disease flares.",
        "Role of the JAK1/2 inhibitor ruxolitinib in refractory MAS failing high-dose anakinra and corticosteroids."
    ],
    [
        "Pathophysiological mechanism explaining paradoxical decline in ESR during the onset of Macrophage Activation Syndrome (fibrinogen consumption).",
        "Clinical morphology and transient temporal kinetics of the classic Still's salmon-pink cutaneous eruption.",
        "Emergency therapeutic protocol for Macrophage Activation Syndrome complicating AOSD."
    ],
    [
        "A 28-year-old female with AOSD whose ESR paradoxically drops from 88 to 18 mm/h while ferritin spikes to 32,000 ug/L, with platelet count plummeting to 48,000/uL, diagnosing acute MAS.",
        "A 34-year-old male exhibiting transient salmon-colored macules across his chest each evening when his temperature reaches 39.8°C, with complete clearing by morning."
    ]
)

# 90: Adult Septic Shock Corticosteroids Randomized Trials
BATCH_6[90] = make_entry(
    'adult_septic_shock_corticosteroids_trials',
    "The role of adjunctive corticosteroid therapy in adult septic shock was clarified by two landmark randomized controlled trials published simultaneously in 2018: the ADRENAL trial (3,800 patients) and the APROCCHSS trial (1,241 patients). While ADRENAL evaluated continuous intravenous hydrocortisone (200 mg/day) monotherapy and demonstrated faster shock resolution and shorter mechanical ventilation without 90-day mortality benefit, APROCCHSS evaluated hydrocortisone (50 mg IV q6h) plus oral fludrocortisone (50 ug daily) in severe shock and demonstrated a statistically significant 90-day all-cause mortality reduction (43.0% vs 49.1%). The 2021 Surviving Sepsis Campaign guidelines recommend low-dose corticosteroids in patients with persistent vasopressor dependency.",
    [
        ("The landmark ADRENAL trial (3,800 patients, Venkatesh et al., NEJM) showed that continuous hydrocortisone (200 mg/day for 7 days) significantly accelerated shock resolution (median 3 vs 4 days), shortened time to ICU discharge, and reduced blood transfusion requirements, though 90-day mortality was not significantly different (27.9% vs 28.8%).", ["29347874"]),
        ("The French APROCCHSS trial (1,241 patients with severe septic shock, Annane et al., NEJM) demonstrated that combined hydrocortisone (50 mg IV q6h) plus oral fludrocortisone (50 ug daily) significantly reduced 90-day all-cause mortality from 49.1% to 43.0% (hazard ratio 0.88, p=0.03).", ["29490185"]),
        ("The 2021 Surviving Sepsis Campaign guidelines issue a weak recommendation for low-dose corticosteroid therapy (IV hydrocortisone 200 mg/day) in adult septic shock patients who have an ongoing requirement for vasopressor therapy (norepinephrine or epinephrine >= 0.25 ug/kg/min) for at least 4 hours.", ["34599001"]),
        ("Neither trial reported an increase in secondary hospital-acquired infections or gastrointestinal bleeding with low-dose corticosteroids, although hydrocortisone was associated with higher rates of manageable hyperglycemia.", ["29347874", "29490185", "34599001"])
    ],
    [
        ("29347874", "Adjunctive Glucocorticoid Therapy in Patients with Septic Shock (ADRENAL Trial).", 2018, "trial"),
        ("29490185", "Hydrocortisone plus Fludrocortisone for Adults with Septic Shock (APROCCHSS Trial).", 2018, "trial"),
        ("34599001", "Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021.", 2021, "guideline")
    ],
    [
        "Whether the mortality benefit in APROCCHSS was driven by the specific addition of fludrocortisone or by the higher baseline mortality and severity of the patient cohort compared to ADRENAL.",
        "Clinical impact of rapid abrupt cessation versus gradual tapering of hydrocortisone once vasopressors are successfully discontinued."
    ],
    [
        "Comparative design and mortality results of the ADRENAL trial versus the APROCCHSS trial in septic shock.",
        "Specific vasopressor dose threshold (>= 0.25 ug/kg/min for >= 4h) triggering corticosteroid initiation under Surviving Sepsis Campaign 2021 guidance.",
        "Secondary clinical benefits of hydrocortisone confirmed across both trials (accelerated shock reversal, reduced ICU stay)."
    ],
    [
        "A 65-year-old male with septic shock from Escherichia coli bacteremia requiring norepinephrine 0.32 ug/kg/min and vasopressin after 4 liters of balanced crystalloid resuscitation, initiated on IV hydrocortisone.",
        "A 72-year-old female in the ICU being weaned off norepinephrine after 48 hours of hydrocortisone, monitored for rebound hypotension during steroid tapering."
    ]
)
