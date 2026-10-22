# data_batch_0061_0075.py
"""
Definitions for Batch 5 of Topics 1-100 (Topics 61 to 75).
"""
from data_batch_0001_0015 import make_entry

BATCH_5 = {}

# 61: Acute Myocarditis Diagnosis and Management
BATCH_5[61] = make_entry(
    'acute_myocarditis_diagnosis_and_management',
    "Acute myocarditis represents myocardial inflammation precipitated predominantly by viral infections, autoimmune reactions, or immune checkpoint inhibitors (ICIs). Initial evaluation requires high-sensitivity cardiac troponin, 12-lead ECG, echocardiography, and multiparametric cardiac magnetic resonance (CMR; updated Lake Louise Criteria). In hemodynamically stable patients, supportive therapy with guideline-directed medical therapy (GDMT: ACEi/ARB and beta-blockers) and physical rest for 3 to 6 months forms the management foundation. In fulminant myocarditis manifesting as cardiogenic shock, life-threatening ventricular arrhythmias, or advanced heart block, emergency mechanical circulatory support (ECMO, Impella) and endomyocardial biopsy (EMB) to detect giant cell or eosinophilic myocarditis for targeted immunosuppression are life-saving.",
    [
        ("The 2018 Updated Lake Louise CMR Criteria require both myocardial edema (elevated T2 signal or T2 mapping) and myocardial injury/necrosis (increased extracellular volume fraction, elevated native T1, or late gadolinium enhancement) for diagnostic confirmation.", ["30482356"]),
        ("European Society of Cardiology (ESC) guidelines recommend standard guideline-directed heart failure therapy for systolic dysfunction, avoidance of NSAIDs in acute myocardial inflammation due to increased mortality in animal models, and exercise abstinence for 3-6 months.", ["23824828"]),
        ("The AHA scientific statement specifies that patients with fulminant myocarditis refractory to pharmacological inotropes should receive early temporary mechanical circulatory support (VA-ECMO or microaxial ventricular assist devices) as a bridge to recovery or transplant.", ["32646210"]),
        ("In immune checkpoint inhibitor (ICI)-associated myocarditis, early high-dose intravenous methylprednisolone (1,000 mg/day for 3 days) followed by rapid immunosuppressive intensification (abatacept, tofacitinib, or ATG) in refractory cases significantly mitigates the > 25-50% fatality rate.", ["32646210", "23824828"])
    ],
    [
        ("30482356", "Cardiac Magnetic Resonance Targets in Myocarditis: The Updated Lake Louise Criteria.", 2018, "guideline"),
        ("23824828", "Current state of knowledge on etiology, diagnosis, management, and pharmacotherapy of myocarditis: position statement of ESC Working Group.", 2013, "guideline"),
        ("32646210", "Recognition and Initial Management of Fulminant Myocarditis: A Scientific Statement From the American Heart Association.", 2020, "guideline")
    ],
    [
        "Optimal duration of secondary immunosuppressive therapy in biopsy-proven virus-negative autoimmune chronic myocarditis.",
        "Clinical thresholds for safe de-escalation of temporary mechanical circulatory support in post-viral fulminant myocardial stunning."
    ],
    [
        "Diagnostic requirements of the 2018 Updated Lake Louise Criteria on cardiac magnetic resonance.",
        "Contraindication of NSAIDs for chest pain relief during acute active myocardial inflammation.",
        "Emergency immunosuppression strategy for immune checkpoint inhibitor-induced acute myocarditis."
    ],
    [
        "A 29-year-old competitive runner presenting with pleuritic chest pain, ST elevations in lateral leads, and troponin I of 7.2 ng/mL following a viral gastroenteritis.",
        "A 63-year-old male with metastatic melanoma receiving nivolumab/ipilimumab who develops complete heart block, dyspnea, and troponin T of 1,200 ng/L."
    ]
)

# 62: Acute Necrotising Pancreatitis and Step-Up Approach
BATCH_5[62] = make_entry(
    'acute_necrotising_pancreatitis_step_up',
    "Acute necrotizing pancreatitis occurs in approximately 20% of acute pancreatitis episodes and carries significant morbidity and mortality, particularly when secondary bacterial infection develops. The landmark PANTER trial revolutionized surgical dogma by establishing the 'step-up' approach—initiating treatment with percutaneous or endoscopic catheter drainage and reserving minimally invasive retroperitoneal necrosectomy (VARD) only for patients who fail to improve clinically. Compared to open necrosectomy, the step-up strategy slashes new-onset multi-organ failure and systemic complications by two-thirds and eliminates major abdominal wall hernias.",
    [
        ("In the landmark Dutch PANTER randomized trial (88 patients), the minimally invasive step-up approach reduced the composite endpoint of major complications or death by 43% compared with primary open necrosectomy, driven by lower rates of new-onset multi-organ failure (12% vs 40%).", ["20410519"]),
        ("Over one-third of patients (35%) treated in the step-up arm of the PANTER trial were successfully cured by percutaneous catheter drainage alone, avoiding surgical necrosectomy entirely.", ["20410519"]),
        ("The randomized TENSION trial demonstrated that an endoscopic step-up approach (transluminal endoscopic drainage followed by endoscopic necrosectomy) was comparable to the surgical step-up approach in mortality and major morbidity, with fewer pancreaticocutaneous fistulae and shorter hospital stays.", ["29339000"]),
        ("International Association of Pancreatology / American Pancreatic Association (IAP/APA) guidelines recommend delaying invasive drainage or debridement until walled-off necrosis (WON) has matured, typically at least 4 weeks after symptom onset, unless rapid clinical collapse dictates emergency drainage.", ["23809820"])
    ],
    [
        ("20410519", "A step-up approach, or open necrosectomy, for necrotizing pancreatitis (PANTER Trial).", 2010, "trial"),
        ("29339000", "Endoscopic or surgical step-up approach for infected necrotising pancreatitis (TENSION): multicentre randomised controlled trial.", 2018, "trial"),
        ("23809820", "IAP/APA evidence-based guidelines for the management of acute pancreatitis.", 2013, "guideline")
    ],
    [
        "Utility of routine fine-needle aspiration (FNA) for Gram stain/culture versus empiric drainage when infected necrosis is suspected based on gas on CT.",
        "Role of prophylactic systemic antibiotics in extensive sterile necrotizing pancreatitis (> 30% parenchymal necrosis)."
    ],
    [
        "Components and clinical superiority of the minimally invasive step-up approach from the PANTER trial.",
        "Comparative outcomes of endoscopic versus surgical retroperitoneal step-up interventions from the TENSION trial.",
        "Rationale and timing (minimum 4 weeks) for delaying invasive necrosectomy until demarcation of walled-off necrosis."
    ],
    [
        "A 52-year-old male with biliary pancreatitis who at week 3 develops spiking fevers, leukocytosis 22,000/uL, and CT revealing extensive retroperitoneal air bubbles within necrotic tissue.",
        "A 46-year-old female with pancreatic necrosis who improves clinically following ultrasound-guided 14F percutaneous catheter placement, avoiding operative necrosectomy."
    ]
)

# 63: Acute Otitis Media
BATCH_5[63] = make_entry(
    'acute_otitis_media',
    "Acute otitis media (AOM) is a rapid-onset middle ear infection characterized by erythema, purulent middle ear effusion, and distinct bulging of the tympanic membrane. According to American Academy of Pediatrics (AAP) and NICE guidelines, diagnostic precision is paramount to combat inappropriate antimicrobial overuse. Watchful waiting (observation with analgesia for 48-72 hours) is recommended in children >= 2 years with mild unilateral AOM, while immediate antibiotic treatment (high-dose amoxicillin 80-90 mg/kg/day) is reserved for severe illness, children < 6 months, bilateral disease in children < 2 years, or otorrhea.",
    [
        ("AAP clinical guidelines emphasize that rigorous diagnosis of AOM requires moderate-to-severe bulging of the tympanic membrane or new-onset otorrhea not due to acute otitis externa, distinguishing AOM from uncomplicated otitis media with effusion (OME).", ["23439909"]),
        ("First-line antimicrobial therapy for confirmed bacterial AOM without penicillin allergy is high-dose amoxicillin (80-90 mg/kg/day in 2 divided doses), ensuring adequate middle ear penetration against penicillin-nonsusceptible Streptococcus pneumoniae.", ["23439909", "31825590"]),
        ("Amoxicillin-clavulanate (90 mg/kg/day amoxicillin component with 6.4 mg/kg/day clavulanate) is indicated if the patient has received amoxicillin within the preceding 30 days, has concurrent purulent conjunctivitis (otitis-conjunctivitis syndrome due to nontypeable H. influenzae), or is unresponsive to initial amoxicillin after 48-72 hours.", ["23439909"]),
        ("Routine observation (watchful waiting) with structured pain control for 48 hours without upfront antibiotics is safe in children >= 2 years with mild unilateral symptoms and reliable follow-up, reducing antibiotic exposure without increasing mastoiditis rates.", ["23439909", "31825590"])
    ],
    [
        ("23439909", "The diagnosis and management of acute otitis media (AAP Guideline).", 2013, "guideline"),
        ("31825590", "Otitis media with effusion: summary of NICE guidance.", 2018, "guideline")
    ],
    [
        "Short-course (5-day) versus standard-course (10-day) antimicrobial regimens in children aged 2-5 years with uncomplicated AOM.",
        "Impact of pneumococcal conjugate vaccination (PCV13/PCV15/PCV20) on the shifting microbiological epidemiology of non-typeable Haemophilus influenzae and Moraxella catarrhalis."
    ],
    [
        "Strict otoscopic diagnostic criteria separating acute otitis media from otitis media with effusion.",
        "Indications for amoxicillin-clavulanate over single-agent amoxicillin as initial empiric therapy.",
        "Clinical eligibility criteria for the 48-hour watchful waiting observation strategy in pediatric otitis media."
    ],
    [
        "An 18-month-old boy with fever of 39.1°C, intense otalgia, and marked bulging, opaque erythematous left tympanic membrane with poor mobility on pneumatic otoscopy.",
        "A 3-year-old girl with mild rhinorrhea, afebrile, whose tympanic membrane is translucent with visible air-fluid level and no bulging, representing OME."
    ]
)

# 64: Acute Pancreatitis
BATCH_5[64] = make_entry(
    'acute_pancreatitis',
    "Acute pancreatitis is an acute inflammatory process of the pancreas diagnosed by fulfilling at least two of three criteria: characteristic epigastric abdominal pain radiating to the back, serum lipase or amylase elevated >= 3 times the upper limit of normal, and characteristic cross-sectional abdominal imaging findings. Under the Revised Atlanta Classification, pancreatitis is stratified into mild (no organ failure or local complications), moderately severe (transient organ failure < 48 hours or local complications), and severe (persistent organ failure > 48 hours). Management focuses on etiology identification, goal-directed moderate fluid resuscitation, and early enteral nutrition.",
    [
        ("Diagnosis under the Revised Atlanta Classification requires at least 2 of 3 features: (1) characteristic epigastric pain radiating to the back; (2) serum lipase or amylase > 3x upper limit of normal; (3) contrast CT, MRI, or transabdominal ultrasound demonstrating pancreatitis.", ["23100416"]),
        ("Persistent organ failure (> 48 hours)—defined using the modified Marshall scoring system for cardiovascular (hypotension), renal (elevated creatinine), or respiratory (decreased PaO2/FiO2) systems—is the primary determinant of mortality in severe acute pancreatitis.", ["23100416"]),
        ("The international multicenter WATERFALL trial proved that aggressive fluid resuscitation (20 mL/kg bolus followed by 3 mL/kg/h) resulted in a three-fold higher rate of fluid overload (20.5% vs 6.3%) without improving clinical outcomes compared to moderate fluid resuscitation (10 mL/kg bolus in hypovolemic patients followed by 1.5 mL/kg/h).", ["36103415"]),
        ("IAP/APA guidelines recommend early transabdominal ultrasound in all patients to identify gallstones, and early oral refeeding with low-fat solid or liquid diet as soon as abdominal pain is improving and ileus has resolved.", ["23809820"])
    ],
    [
        ("23100416", "Classification of acute pancreatitis--2012: revision of the Atlanta classification and definitions by international consensus.", 2013, "consensus-guideline"),
        ("36103415", "Early Moderate or Aggressive Fluid Resuscitation for Acute Pancreatitis (WATERFALL Trial).", 2022, "trial"),
        ("23809820", "IAP/APA evidence-based guidelines for the management of acute pancreatitis.", 2013, "guideline")
    ],
    [
        "Optimal timing of cholecystectomy during the index admission for mild biliary pancreatitis versus interval outpatient surgery.",
        "Clinical utility of emergent endoscopic retrograde cholangiopancreatography (ERCP) in acute biliary pancreatitis without concurrent ascending cholangitis."
    ],
    [
        "The three diagnostic criteria of the Revised Atlanta Classification and when cross-sectional imaging is strictly required.",
        "Fluid overload risk and clinical failure of aggressive versus moderate fluid resuscitation demonstrated in the WATERFALL trial.",
        "Definition of severe acute pancreatitis based on persistent organ failure (> 48 hours) versus transient organ failure."
    ],
    [
        "A 44-year-old male presenting with acute severe epigastric pain, vomiting, and serum lipase of 1,840 U/L (ULN 60 U/L) requiring fluid prescription based on WATERFALL.",
        "A 56-year-old female with gallstone pancreatitis exhibiting tachypnea, oliguria, and PaO2/FiO2 ratio 250 requiring ICU admission for persistent organ failure."
    ]
)

# 65: Acute Pancreatitis Fluid and Nutrition Strategy
BATCH_5[65] = make_entry(
    'acute_pancreatitis_fluid_and_nutrition',
    "Fluid stewardship and nutritional support have undergone a paradigm shift in acute pancreatitis management. The historic practice of aggressive volume resuscitation ('forced hydration') was conclusively refuted by the landmark WATERFALL trial, establishing goal-directed moderate fluid resuscitation with balanced crystalloids (Ringer's lactate) as the modern standard. Similarly, the historic dogma of 'putting the pancreas to rest' via prolonged fasting has been replaced by early enteral nutrition: starting oral feeding immediately in mild pancreatitis and initiating enteral tube feeding (nasogastric or nasojejunal) within 24-72 hours in severe disease, preserving gut mucosal integrity and preventing infected pancreatic necrosis.",
    [
        ("The WATERFALL randomized trial showed that aggressive hydration doubled the incidence of fluid overload without accelerating clinical resolution; guidelines now advise moderate Ringer's lactate resuscitation (1.5 mL/kg/h maintenance after 10 mL/kg bolus only if hypovolemic).", ["36103415"]),
        ("In mild acute pancreatitis, immediate oral refeeding with a low-fat solid or soft diet is safe, reduces length of hospital stay by 1.5 to 2 days, and does not increase pain relapse compared to gradual step-up liquid regimens.", ["23809820"]),
        ("The multicenter Dutch PYTHON randomized trial demonstrated that very early nasoenteric tube feeding (within 24 hours) did not reduce infected necrosis or death compared to an on-demand strategy allowing oral diet at 72 hours in predicted severe pancreatitis, with 69% of patients tolerating oral food without needing a feeding tube.", ["25409371"]),
        ("Enteral nutrition is vastly superior to total parenteral nutrition (TPN), significantly reducing infectious complications, systemic inflammatory response syndrome (SIRS), multi-organ failure, and overall mortality by preserving intestinal barrier function.", ["23809820", "25409371"])
    ],
    [
        ("36103415", "Early Moderate or Aggressive Fluid Resuscitation for Acute Pancreatitis (WATERFALL Trial).", 2022, "trial"),
        ("25409371", "Early, on-demand nasoenteric tube feeding versus oral diet in predicted severe acute pancreatitis (PYTHON Trial).", 2014, "trial"),
        ("23809820", "IAP/APA evidence-based guidelines for the management of acute pancreatitis.", 2013, "guideline")
    ],
    [
        "Nasogastric versus nasojejunal tube feeding tolerability and aspiration risk in patients with severe pancreatitis-induced gastric ileus.",
        "Role of immunonutrition (glutamine, omega-3 fatty acids) in reducing systemic inflammatory cascades during severe necrotizing pancreatitis."
    ],
    [
        "Fluid administration rates and targets validated in the WATERFALL trial (1.5 mL/kg/h versus aggressive 3.0 mL/kg/h).",
        "Findings of the PYTHON trial regarding early routine nasoenteric feeding versus oral diet challenge at 72 hours.",
        "Immunological and infectious hazards of total parenteral nutrition compared to enteral nutrition in acute pancreatitis."
    ],
    [
        "A 38-year-old male with mild alcohol-induced pancreatitis whose abdominal pain and nausea resolve at 18 hours, ready for immediate low-fat solid oral intake.",
        "A 50-year-old female with predicted severe pancreatitis in the ICU requiring enteral tube feeding due to inability to tolerate oral diet by day 3."
    ]
)

# 66: Acute Pancreatitis in the ICU: Scoring & Organ Support
BATCH_5[66] = make_entry(
    'acute_pancreatitis_icu_organ_support',
    "Critically ill patients with severe acute pancreatitis in the ICU suffer high mortality (20-30%) driven by a biphasic clinical trajectory: early multi-organ failure from massive systemic inflammatory response syndrome (SIRS), followed by late sepsis from infected pancreatic necrosis. Early bedside risk stratification utilizing the Bedside Index for Severity in Acute Pancreatitis (BISAP) or APACHE-II score identifies patients at risk of rapid deterioration. Management centers on lung-protective ventilation, restrictive fluid therapy after initial stabilization, avoiding prophylactic antibiotics or routine probiotics (disproven in PROPATRIA), and multidisciplinary coordination.",
    [
        ("The BISAP score (BUN > 25 mg/dL, Impaired mental status, SIRS >= 2 criteria, Age > 60, Pleural effusion) provides simple, accurate prognostic stratification within 24 hours, with scores >= 3 correlating with a > 7-to-12-fold increase in mortality.", ["18725544"]),
        ("Routine administration of prophylactic systemic antibiotics for sterile necrotizing pancreatitis is not recommended by IAP/APA guidelines, as randomized trials demonstrate no reduction in infected necrosis or mortality, but an increased risk of multi-drug resistant fungal superinfections.", ["23809820"]),
        ("The PROPATRIA multicenter randomized trial revealed that prophylactic probiotic administration in predicted severe acute pancreatitis significantly increased bowel ischemia and nearly doubled all-cause mortality (16% vs 6%), leading to a strict black-box contraindication against prophylactic probiotics.", ["18279948"]),
        ("Intra-abdominal hypertension (IAH, intra-abdominal pressure >= 12 mmHg) and abdominal compartment syndrome (ACS, IAP > 20 mmHg with new organ failure) are frequent in severe pancreatitis; protocolized decompression (nasogastric drainage, sedation, paracentesis, neuromuscular blockade) is critical to preserve renal and splanchnic perfusion.", ["23809820"])
    ],
    [
        ("18725544", "A prospective evaluation of the bedside index for severity in acute pancreatitis (BISAP) score in assessing mortality and intermediate markers of severity.", 2008, "trial"),
        ("23809820", "IAP/APA evidence-based guidelines for the management of acute pancreatitis.", 2013, "guideline"),
        ("18279948", "Probiotic prophylaxis in predicted severe acute pancreatitis: a randomised, double-blind, placebo-controlled trial (PROPATRIA).", 2008, "trial")
    ],
    [
        "Comparative accuracy of BISAP versus APACHE-II and Ranson scores in predicting prolonged ICU stay and organ failure duration.",
        "Surgical versus percutaneous decompressive strategies in refractory abdominal compartment syndrome complicating pancreatitis."
    ],
    [
        "Five components of the BISAP score and their predictive value for severe acute pancreatitis mortality.",
        "Clinical findings and lethal bowel ischemia risks of probiotic administration identified in the PROPATRIA trial.",
        "Indications and futility of routine prophylactic antibiotic administration in sterile pancreatic necrosis."
    ],
    [
        "A 67-year-old male with pancreatitis, BUN 34 mg/dL, heart rate 108 bpm, respiratory rate 24 bpm, confusion, and right pleural effusion (BISAP 5) admitted to the ICU.",
        "A 54-year-old female in the ICU on mechanical ventilation whose bladder pressure rises to 23 mmHg with concurrent oliguria and rising airway pressures."
    ]
)

# 67: Acute Pericarditis: Colchicine, NSAIDs, Recurrence Prevention
BATCH_5[67] = make_entry(
    'acute_pericarditis',
    "Acute pericarditis is diagnosed by fulfilling at least two of four cardinal criteria: pleuritic chest pain, pericardial friction rub, new widespread PR-segment depression or ST-segment elevation, and new or worsening pericardial effusion. High-dose NSAIDs (e.g., ibuprofen 600-800 mg TID or indomethacin 50 mg TID) combined with weight-adjusted colchicine (0.5 mg BID, or 0.5 mg daily if weight < 70 kg) for 3 months represent the first-line evidence-based regimen. The landmark ICAP and COPE trials proved that adding colchicine halves recurrence rates and accelerates symptom remission, whereas systemic corticosteroids should be avoided as first-line therapy due to increased recurrence risk.",
    [
        ("In the landmark ICAP randomized trial (240 patients), adding colchicine (0.5 mg daily or BID for 3 months) to standard anti-inflammatory therapy halved the rate of recurrent pericarditis from 37.5% to 16.7% (relative risk reduction 56%) and significantly reduced symptom persistence at 72 hours.", ["23992556"]),
        ("The COPE trial confirmed in first-episode acute pericarditis that colchicine plus aspirin significantly reduced 18-month recurrence rates compared to aspirin alone (10.7% vs 32.3%) and shortened time to clinical remission.", ["16183436"]),
        ("The 2015 ESC Pericardial Diseases Guidelines recommend high-dose NSAIDs (ibuprofen 600-800 mg TID or aspirin 750-1000 mg TID) with gastroprotection plus colchicine for 3 months as first-line therapy, with tapering guided by symptom resolution and C-reactive protein (CRP) normalization.", ["26320112"]),
        ("Systemic corticosteroids are classified as second-line therapy for patients with contraindications or intolerance to NSAIDs/colchicine, or specific autoimmune etiologies; upfront steroid use independently predicts disease chronicity and multiple relapses.", ["26320112", "23992556"])
    ],
    [
        ("23992556", "A Randomized Trial of Colchicine for Acute Pericarditis (ICAP Trial).", 2013, "trial"),
        ("16183436", "Colchicine as first-choice therapy for recurrent pericarditis: results of the CORE randomized trial.", 2005, "trial"),
        ("26320112", "2015 ESC Guidelines for the diagnosis and management of pericardial diseases.", 2015, "guideline")
    ],
    [
        "Optimal duration and tapering velocity of interleukin-1 receptor antagonists (anakinra, rilonacept) in refractory corticosteroid-dependent recurrent pericarditis.",
        "Role of exercise restriction duration: whether resting until CRP normalizes is superior to arbitrary 3-month exercise bans in non-athletes."
    ],
    [
        "Four cardinal diagnostic criteria for acute pericarditis under ESC guidelines.",
        "Magnitude of recurrence reduction achieved by adding colchicine in the ICAP and COPE trials.",
        "Detrimental effects of early systemic corticosteroid administration on pericarditis recurrence and chronicity."
    ],
    [
        "A 31-year-old male presenting with sharp chest pain worse lying flat and relieved leaning forward, widespread PR depressions, and CRP 42 mg/L.",
        "A 45-year-old female with recurrent pericardial chest pain who was inappropriately treated with a 5-day course of high-dose prednisone without colchicine."
    ]
)

# 68: Acute Phosphate Nephropathy
BATCH_5[68] = make_entry(
    'acute_phosphate_nephropathy',
    "Acute phosphate nephropathy is a form of kidney injury caused by the deposition of calcium phosphate crystals within the renal tubules and interstitium, typically following the ingestion of oral sodium phosphate (OSP) bowel purgatives for colonoscopy. Patients present with either acute kidney injury shortly after exposure or insidious, irreversible chronic kidney disease diagnosed weeks to months later. Advanced age, pre-existing chronic kidney disease (CKD), volume depletion, and concurrent therapy with renin-angiotensin-aldosterone system (RAAS) inhibitors, NSAIDs, or diuretics are major risk factors; PEG-based bowel preparations are the safer standard of care.",
    [
        ("Markowitz et al. established that acute phosphate nephropathy is characterized histopathologically by abundant calcium phosphate tubular deposition, tubular epithelial atrophy, and interstitial fibrosis in the absence of significant glomerular disease.", ["16299385"]),
        ("The clinical course is frequently biphasic: an early acute asymptomatic rise in creatinine followed by progressive irreversible renal dysfunction, with fewer than 20% of affected patients recovering back to their baseline serum creatinine.", ["16299385", "18285573"]),
        ("Major clinical risk factors include baseline CKD (eGFR < 60 mL/min/1.73m2), volume contraction, hypertension, advanced age (> 65 years), and concurrent medications that compromise renal hemodynamics: ACE inhibitors, ARBs, diuretics, and NSAIDs.", ["18285573", "22890468"]),
        ("KDIGO and FDA guidelines strongly discourage the use of oral sodium phosphate formulations for colonoscopy bowel cleansing in patients with CKD, congestive heart failure, liver cirrhosis, or electrolyte disturbances, mandating safer isosmotic polyethylene glycol (PEG) solutions.", ["22890468"])
    ],
    [
        ("16299385", "Acute phosphate nephropathy: An unrecognized cause of acute and chronic kidney injury after oral sodium phosphate bowel purgatives.", 2005, "trial"),
        ("18285573", "Acute phosphate nephropathy: a review.", 2008, "review"),
        ("22890468", "KDIGO Clinical Practice Guideline for Acute Kidney Injury.", 2012, "guideline")
    ],
    [
        "Whether temporary cessation of ACEi/ARBs 48 hours prior to colonoscopy preparation completely prevents crystalline phosphate tubular precipitation.",
        "Role of urinary calcium phosphate supersaturation indices in identifying patients susceptible to subclinical tubulointerstitial damage."
    ],
    [
        "Characteristic biopsy findings of acute phosphate nephropathy (calcium phosphate tubular casts with Von Kossa positivity).",
        "Medications and clinical comorbid conditions conferring the highest risk of developing phosphate nephropathy after sodium phosphate purgatives.",
        "Rationale for utilizing isosmotic polyethylene glycol (PEG) solutions over oral sodium phosphate in high-risk patients."
    ],
    [
        "A 68-year-old female on lisinopril and hydrochlorothiazide for hypertension who undergoes screening colonoscopy with OSP prep and presents 6 weeks later with creatinine 2.8 mg/dL (baseline 0.9 mg/dL).",
        "A 72-year-old male with stage 3 CKD requiring colonoscopy preparation, where PEG-electrolyte solution is prescribed to avoid hyperphosphatemia and nephrocalcinosis."
    ]
)

# 69: Acute Promyelocytic Leukaemia
BATCH_5[69] = make_entry(
    'acute_promyelocytic_leukaemia',
    "Acute promyelocytic leukemia (APL) is a medical emergency driven by the t(15;17)(q24.1;q21.2) chromosomal translocation encoding the PML::RARA fusion oncoprotein, leading to severe consumptive coagulopathy (disseminated intravascular coagulation and hyperfibrinolysis) and catastrophic hemorrhage. Immediate initiation of all-trans retinoic acid (ATRA) upon morphological suspicion—before cytogenetic confirmation—is mandatory. In standard- and intermediate-risk APL (WBC <= 10,000/uL), chemotherapy-free dual differentiation therapy with ATRA and arsenic trioxide (ATO) is the curative standard of care, achieving 95-98% complete remission and event-free survival rates superior to chemotherapy.",
    [
        ("In the landmark Italian-German APL0406 randomized phase 3 trial (Lo-Coco et al.), ATRA plus arsenic trioxide (ATO) proved non-inferior and statistically superior to ATRA plus idarubicin chemotherapy in low-to-intermediate risk APL, achieving 97% vs 80% 2-year event-free survival and zero secondary myelodysplasia.", ["23841729"]),
        ("The UK NCRI AML17 randomized trial confirmed that ATRA plus ATO significantly reduced relapse rates and improved 4-year event-free survival compared to standard chemotherapy across all risk groups, with lower treatment-related mortality.", ["26162804"]),
        ("European LeukemiaNet (ELN) guidelines emphasize that ATRA must be started immediately at the earliest clinical suspicion of APL without waiting for molecular confirmation, alongside aggressive platelet and cryoprecipitate transfusions to maintain fibrinogen > 150 mg/dL and platelets > 50,000/uL.", ["30737248"]),
        ("Differentiation syndrome (fever, dyspnea, pulmonary infiltrates, pleural effusions, peripheral edema) occurs in up to 25% of patients during ATRA/ATO therapy; immediate prompt initiation of intravenous dexamethasone (10 mg BID) halts progression without necessitating ATRA/ATO discontinuation unless severe multi-organ failure ensues.", ["30737248", "23841729"])
    ],
    [
        ("23841729", "Retinoic acid and arsenic trioxide for acute promyelocytic leukemia (APL0406 Trial).", 2013, "trial"),
        ("26162804", "Arsenic trioxide and all-trans retinoic acid versus chemotherapy for acute promyelocytic leukaemia (AML17): open-label randomised phase 3 trial.", 2015, "trial"),
        ("30737248", "European LeukemiaNet recommendations for the diagnosis and management of acute promyelocytic leukemia.", 2019, "guideline")
    ],
    [
        "Optimal consolidation and maintenance regimens using oral arsenic trioxide formulations to reduce hospitalizations and intravenous infusion requirements.",
        "Role of upfront prophylactic cytoreductive gemtuzumab ozogamicin or anthracyclines in high-risk APL (WBC > 10,000/uL) combined with ATRA/ATO."
    ],
    [
        "Landmark efficacy results of chemotherapy-free ATRA plus arsenic trioxide from the APL0406 trial.",
        "Transfusion targets (platelets > 50,000/uL and fibrinogen > 150 mg/dL) to prevent fatal intracranial hemorrhage in acute APL presentation.",
        "Diagnostic recognition and emergency management of APL differentiation syndrome with dexamethasone."
    ],
    [
        "A 32-year-old female presenting with epistaxis, gum bleeding, extensive ecchymoses, WBC 2.4, platelets 18,000/uL, INR 1.9, and fibrinogen 80 mg/dL with promyelocytes on peripheral smear.",
        "A 40-year-old male with APL on day 5 of ATRA/ATO who develops fevers to 38.8°C, bilateral pulmonary infiltrates, and weight gain of 4 kg."
    ]
)

# 70: Acute Psychosis: Assessment and Antipsychotic Therapy
BATCH_5[70] = make_entry(
    'acute_psychosis_assessment_and_therapy',
    "Acute psychosis is characterized by hallucinations, delusions, thought disorganization, and loss of reality testing, precipitated by primary psychiatric disorders (schizophrenia, bipolar mania), substance intoxication/withdrawal, or underlying medical illness (encephalitis, endocrine disorders, systemic lupus). Initial management prioritizes safety, medical clearance, and calm, structured non-coercive verbal de-escalation. Pharmacotherapy with oral second-generation antipsychotics (e.g., olanzapine, risperidone, aripiprazole) represents the first-line evidence-based standard, while rapid tranquilization protocols are reserved for severe aggression threatening imminent injury.",
    [
        ("NICE clinical guideline CG178 recommends oral second-generation antipsychotics as first-line therapy for acute psychosis, advising individualized choice based on side-effect profiles (metabolic vs extrapyramidal vs hyperprolactinemia) in collaborative discussion with the patient.", ["31825618"]),
        ("A comprehensive Cochrane network meta-analysis of 402 randomized trials (Leucht et al., Lancet) established that all antipsychotics significantly reduce psychotic symptoms compared to placebo, with small differences in efficacy favoring clozapine, amisulpride, and olanzapine, but marked differences in weight gain, sedation, and extrapyramidal side effects.", ["31295368"]),
        ("The TREC randomized trials on rapid tranquilization in acute violent psychotic agitation demonstrated that intramuscular olanzapine or haloperidol combined with promethazine achieved rapid, safe tranquilization within 15-30 minutes with significantly fewer respiratory depressions than intramuscular benzodiazepines alone.", ["16905298"]),
        ("Physical restraints should be an absolute intervention of last resort, with continuous 1-to-1 nursing observation and regular vital sign/airway monitoring every 15 minutes to prevent restraint-related asphyxia and positional death.", ["31825618"])
    ],
    [
        ("31825618", "Psychosis and schizophrenia in adults: prevention and management (NICE Guideline CG178).", 2014, "guideline"),
        ("31295368", "Comparative efficacy and tolerability of 32 oral antipsychotics for the acute treatment of adults with multi-episode schizophrenia: a systematic review and network meta-analysis.", 2019, "meta-analysis"),
        ("16905298", "Rapid tranquilisation in psychiatric emergencies: Cochrane systematic review and meta-analysis of the TREC trials.", 2006, "trial")
    ],
    [
        "Biomarkers differentiating first-episode primary psychiatric psychosis from autoantibody-mediated autoimmune encephalitis (anti-NMDAR encephalitis).",
        "Optimal duration of maintenance antipsychotic therapy following complete remission of a first-episode psychosis."
    ],
    [
        "Comparative efficacy and side effect stratification across second-generation antipsychotics established in the Leucht et al. network meta-analysis.",
        "Pharmacological agents and safety monitoring in rapid tranquilization of severe combative agitation based on the TREC trials.",
        "Medical 'clearance' investigations required prior to attributing acute psychosis to primary psychiatric etiology."
    ],
    [
        "A 21-year-old college student with 3 weeks of persecutory delusions, auditory hallucinations, and social withdrawal without prior psychiatric history.",
        "A 35-year-old acutely agitated male in the emergency department combative with staff, stabilized using verbal de-escalation followed by oral disintegrating olanzapine."
    ]
)

# 71: Acute Pulmonary Oedema
BATCH_5[71] = make_entry(
    'acute_pulmonary_oedema',
    "Acute pulmonary edema secondary to decompensated heart failure represents an extreme emergency characterized by alveolar flooding, severe dyspnea, tachypnea, hypoxemia, and diaphoresis. Management requires immediate upright positioning, non-invasive positive pressure ventilation (NIV: CPAP or BiPAP), and aggressive peripheral vasodilatation with intravenous nitrates (nitroglycerin or isosorbide dinitrate) in hypertensive presentations. Historic routine administration of intravenous morphine is now strongly discouraged due to increased ICU admission, intubation, and mortality rates. Intravenous loop diuretics should be dosed dynamically, with ultrafiltration reserved for refractory diuretic resistance.",
    [
        ("The randomized multicenter 3CPO trial (1,069 patients) showed that non-invasive ventilation (either CPAP or BiPAP) induced rapid physiological improvements in dyspnea, acidosis, and hypercapnia compared to standard oxygen therapy, with CPAP being the simplest and most cost-effective initial modality.", ["18614781"]),
        ("A large-scale analysis from the ADHERE registry (147,362 patients) demonstrated that intravenous morphine administration in acute cardiogenic pulmonary edema was independently associated with a near-doubling of in-hospital mortality (OR 1.8), higher intubation rates, and prolonged ICU stay.", ["18037380"]),
        ("The UNLOAD trial showed that early venous ultrafiltration in hypervolemic heart failure produced greater weight loss and fluid removal with significantly lower 90-day heart failure rehospitalizations compared to continuous intravenous diuretics.", ["17299094"]),
        ("The 2021 ESC Heart Failure Guidelines emphasize high-dose intravenous vasodilators (nitrates) as first-line therapy in acute hypertensive pulmonary edema (systolic BP > 110 mmHg) to rapidly reduce cardiac preload and afterload, while restricting opioids to palliative end-of-life care.", ["34447992"])
    ],
    [
        ("18614781", "Noninvasive ventilation in acute cardiogenic pulmonary edema (3CPO Trial).", 2008, "trial"),
        ("18037380", "Association of intravenous morphine use and outcomes in acute decompensated heart failure: a report from the ADHERE registry.", 2008, "trial"),
        ("17299094", "Ultrafiltration versus intravenous diuretics for patients hospitalized for acute decompensated heart failure (UNLOAD Trial).", 2007, "trial"),
        ("34447992", "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure.", 2021, "guideline")
    ],
    [
        "Whether CPAP or bilevel NIV provides superior alveolar recruitment and physiological relief in patients with concurrent COPD and cardiogenic edema.",
        "Optimal protocol for rapid high-dose intravenous nitroglycerin boluses (e.g., 2 mg IV pushes) in flash pulmonary edema versus continuous infusion."
    ],
    [
        "Physiological benefits and clinical outcomes of non-invasive ventilation from the 3CPO trial.",
        "Evidence from the ADHERE registry regarding harmful outcomes associated with routine morphine in acute pulmonary edema.",
        "Role of high-dose intravenous nitrates versus loop diuretics as the primary initial therapy in hypertensive flash pulmonary edema."
    ],
    [
        "A 72-year-old female presenting with severe orthopnea, bilateral crackles to apices, BP 210/110 mmHg, and oxygen saturation 82% on room air, initiated on CPAP 10 cmH2O and IV nitroglycerin.",
        "A 65-year-old male with ischemic cardiomyopathy and refractory severe hypervolemia exhibiting diuretic resistance despite IV bumetanide infusions, evaluated for ultrafiltration."
    ]
)

# 72: Acute Red Eye Differential Diagnosis
BATCH_5[72] = make_entry(
    'acute_red_eye_differential_diagnosis',
    "Acute red eye is one of the most frequent ophthalmic presentations in primary care and emergency departments. Accurate differential diagnosis hinges on distinguishing benign, self-limiting superficial conditions (viral/bacterial conjunctivitis, episcleritis, subconjunctival hemorrhage) from sight-threatening emergencies requiring immediate ophthalmologic consultation: acute angle-closure glaucoma, acute anterior uveitis, bacterial/fungal keratitis, and endophthalmitis. The presence of 'red flag' symptoms—severe ocular pain, decreased visual acuity, photophobia, ciliary flush (perilimbal injection), corneal opacity, or a fixed mid-dilated pupil—mandates urgent specialist evaluation.",
    [
        ("American Academy of Ophthalmology (AAO) Preferred Practice Patterns emphasize identifying red flags: deep boring pain, photophobia, reduced visual acuity, ciliary flush, and corneal abnormalities, which rule out benign conjunctivitis and require immediate specialist care.", ["30580948"]),
        ("Acute angle-closure glaucoma presents with severe unilateral ocular pain, headache, nausea, steamy/hazy cornea, and a fixed mid-dilated pupil, requiring emergency medical lowering of intraocular pressure (timolol, apraclonidine, IV acetazolamide, and topical pilocarpine) followed by bilateral laser peripheral iridotomy.", ["30580948"]),
        ("Corneal fluorescein staining under cobalt blue light is essential in contact lens wearers presenting with acute red eye to detect Pseudomonas or Acanthamoeba keratitis; topical corticosteroids must never be prescribed empirically without slit-lamp examination due to catastrophic corneal melting or herpes simplex worsening.", ["30580948"]),
        ("Viral conjunctivitis (adenovirus) is characterized by watery discharge, preauricular lymphadenopathy, and follicular conjunctival response; it is self-limiting and requires strict hand hygiene rather than topical antibiotic therapy.", ["30580948"])
    ],
    [
        ("30580948", "Conjunctivitis Preferred Practice Pattern (American Academy of Ophthalmology).", 2018, "guideline")
    ],
    [
        "Utility of point-of-care rapid adenovirus antigen testing in reducing inappropriate topical antibiotic prescriptions in acute conjunctivitis.",
        "Comparative efficacy of topical NSAIDs versus low-potency topical steroids in non-necrotizing anterior episcleritis."
    ],
    [
        "Cardinal red flag features distinguishing sight-threatening ocular pathology from uncomplicated superficial conjunctivitis.",
        "Emergency pharmacological cocktail and definitive surgical procedure (laser peripheral iridotomy) for acute angle-closure glaucoma.",
        "Contraindication of topical corticosteroid eyedrops in undifferentiated acute red eye in primary care settings."
    ],
    [
        "A 64-year-old hyperopic female presenting with sudden severe left eye pain, nausea, halos around lights, visual acuity 20/200, cloudy cornea, and IOP of 55 mmHg.",
        "A 22-year-old extended-wear soft contact lens user presenting with a red eye, foreign body sensation, and a 2-mm white focal stromal infiltrate on the central cornea."
    ]
)

# 73: Acute Respiratory Failure
BATCH_5[73] = make_entry(
    'acute_respiratory_failure',
    "Acute respiratory failure is categorized into Type 1 (hypoxemic: PaO2 < 60 mmHg [8 kPa] with normal or low PaCO2) and Type 2 (hypercapnic: PaCO2 > 45-50 mmHg [6-6.5 kPa] with respiratory acidemia). Type 1 failure results from ventilation-perfusion mismatch, intrapulmonary shunt, or diffusion impairment (e.g., ARDS, pneumonia, pulmonary edema), while Type 2 failure reflects ventilatory pump failure, central hypoventilation, or neuromuscular weakness (e.g., severe COPD, myasthenia gravis, drug overdose). Conservative oxygenation targeting SpO2 92-96% (or 88-92% in patients at hypercapnic risk) avoids oxygen toxicity, while High-Flow Nasal Cannula (HFNC) and non-invasive ventilation provide first-line advanced support.",
    [
        ("In the landmark FLORALI trial (Frat et al., NEJM), high-flow nasal cannula (HFNC) oxygen therapy significantly reduced 90-day mortality (hazard ratio 0.42) and ventilator days compared to standard oxygen or non-invasive ventilation in patients with acute hypoxemic respiratory failure (PaO2/FiO2 <= 300).", ["25981908"]),
        ("Multicenter randomized trials (LOCO2 and HOT-ICU) demonstrated that liberal oxygenation strategies targeting supranormal PaO2 levels do not improve survival and can increase mesenteric and myocardial ischemia, establishing a conservative oxygenation target (PaO2 55-80 mmHg or SpO2 92-96%).", ["32163690", "33535973"]),
        ("British Thoracic Society (BTS) emergency oxygen guidelines recommend target SpO2 ranges of 94-98% for most acutely ill patients, but a restricted target of 88-92% for patients at risk of hypercapnic respiratory failure (COPD, neuromuscular disease, morbid obesity hypoventilation).", ["28515286"]),
        ("For acute hypercapnic respiratory failure secondary to COPD exacerbation (pH < 7.35 and PaCO2 > 45 mmHg), non-invasive positive pressure ventilation (NIV/BiPAP) reduces the need for intubation by > 60% and reduces hospital mortality by half.", ["28515286", "25981908"])
    ],
    [
        ("25981908", "High-flow oxygen through nasal cannula in acute hypoxemic respiratory failure (FLORALI Trial).", 2015, "trial"),
        ("32163690", "Conservative versus Liberal Oxygen Therapy in Adults with Acute Respiratory Distress Syndrome (LOCO2 Trial).", 2020, "trial"),
        ("33535973", "Lower versus Higher Oxygenation Target in Adults with Acute Hypoxaemic Respiratory Failure (HOT-ICU Trial).", 2021, "trial"),
        ("28515286", "British Thoracic Society Guideline for oxygen use in adults in healthcare and emergency settings.", 2017, "guideline")
    ],
    [
        "ROX index thresholds (SpO2/FiO2 divided by respiratory rate) predicting successful HFNC weaning versus need for timely endotracheal intubation.",
        "Role of awake prone positioning combined with HFNC in non-intubated hypoxemic respiratory failure outside COVID-19 ARDS."
    ],
    [
        "Differences in mortality outcomes between HFNC, NIV, and standard oxygen in the FLORALI trial.",
        "Target oxygen saturation ranges for hypoxemic versus hypercapnia-prone respiratory failure according to BTS guidelines.",
        "Evidence-based indications and physiological mechanisms of non-invasive ventilation in acute hypercapnic respiratory failure."
    ],
    [
        "A 58-year-old male with severe bilateral viral pneumonia, respiratory rate 32 bpm, PaO2/FiO2 ratio 160 on non-rebreather mask, started on HFNC 60 L/min and FiO2 0.60.",
        "A 68-year-old female with severe COPD admitted with acute somnolence, arterial blood gas showing pH 7.26, PaCO2 68 mmHg, and PaO2 54 mmHg on 4 L nasal cannula, initiated on emergency BiPAP."
    ]
)

# 74: Acute Severe Asthma
BATCH_5[74] = make_entry(
    'acute_severe_asthma',
    "Acute severe asthma is a life-threatening exacerbation defined clinically by peak expiratory flow (PEF) 33-50% of predicted/best, inability to complete sentences in one breath, respiratory rate >= 25 bpm, or heart rate >= 110 bpm. Life-threatening features ('silent chest', cyanosis, exhaustion, altered consciousness, PEF < 33%, or normal/elevated PaCO2) require immediate ICU escalation. First-line pharmacotherapy consists of high-dose inhaled short-acting beta-2 agonists (salbutamol) combined with ipratropium bromide via oxygen-driven nebulization, early systemic corticosteroids (oral prednisolone 40-50 mg or IV hydrocortisone), and intravenous magnesium sulfate.",
    [
        ("The multicenter 3Mg randomized trial demonstrated that a single infusion of intravenous magnesium sulfate (1.2 to 2 g over 20 minutes) produces rapid, clinically meaningful bronchodilation and reduces hospital admission in patients with acute severe asthma refractory to initial nebulized therapies.", ["24707886"]),
        ("British Thoracic Society (BTS/SIGN) and GINA guidelines classify asthma exacerbations into Moderate, Severe (PEF 33-50%, RR >= 25, HR >= 110, unable to complete sentences), and Life-threatening (PEF < 33%, SpO2 < 92%, silent chest, cyanosis, exhaustion, confusion, or normal/elevated PaCO2).", ["30580795"]),
        ("Early administration of systemic corticosteroids within 1 hour of emergency presentation significantly reduces hospital admission rates and prevents relapse; oral prednisolone (40-50 mg daily for 5 days) is as effective as intravenous corticosteroids unless the patient is unable to swallow or vomiting.", ["30580795"]),
        ("A 'normal' or rising PaCO2 (> 40-42 mmHg [5.3 kPa]) in an acutely tachypneic asthma patient indicates severe respiratory muscle exhaustion and imminent arrest, requiring immediate senior anesthesia consultation for endotracheal intubation.", ["30580795", "24707886"])
    ],
    [
        ("24707886", "Intravenous or nebulised magnesium sulphate versus standard therapy for severe acute asthma (3Mg Trial).", 2014, "trial"),
        ("30580795", "British guideline on the management of asthma (BTS/SIGN Guideline 158).", 2019, "guideline")
    ],
    [
        "Efficacy of intravenous ketamine or aminophylline infusions as second-line rescue bronchodilators in refractory near-fatal asthma.",
        "Optimal mechanical ventilation strategies (permissive hypercapnia, low tidal volumes, prolonged expiratory time) to prevent dynamic hyperinflation and tension pneumothorax during status asthmaticus."
    ],
    [
        "Clinical and physiological criteria defining Life-Threatening Asthma versus Severe Asthma under BTS/SIGN guidelines.",
        "Clinical significance of an apparently 'normal' PaCO2 on arterial blood gas during an acute severe asthma attack.",
        "Evidence and indications for intravenous magnesium sulfate established in the 3Mg trial."
    ],
    [
        "A 24-year-old male with asthma presenting with speech limited to single words, respiratory rate 34 bpm, pulse 128 bpm, and PEF 180 L/min (38% predicted) receiving back-to-back salbutamol/ipratropium and IV magnesium.",
        "A 19-year-old female with acute severe asthma who becomes drowsy; arterial blood gas reveals pH 7.31 and PaCO2 44 mmHg, signaling impending respiratory arrest."
    ]
)

# 75: Acute Thrombolysis: Stroke, Pulmonary Embolism, STEMI
BATCH_5[75] = make_entry(
    'acute_thrombolysis_indications',
    "Acute thrombolytic therapy with recombinant tissue plasminogen activators (alteplase, tenecteplase) offers rapid reperfusion in life-threatening thrombotic emergencies, but carries catastrophic intracranial hemorrhage risks requiring strict patient selection. In acute ischemic stroke, IV alteplase or tenecteplase within 4.5 hours of symptom onset preserves neurological functional independence (NINDS, ECASS-3). In massive pulmonary embolism with hemodynamic instability, systemic thrombolysis reduces all-cause mortality, whereas in intermediate-high risk PE (PEITHO trial), rescue thrombolysis is restricted to hemodynamic decompensation. In STEMI, thrombolysis is indicated within 12 hours when primary PCI cannot be achieved within 120 minutes (STREAM trial).",
    [
        ("The landmark NINDS rt-PA Stroke Study proved that intravenous alteplase administered within 3 hours of ischemic stroke onset resulted in a 30% absolute increase in patients achieving minimal or no disability at 3 months (OR 1.7) despite a 6.4% symptomatic intracranial hemorrhage rate.", ["7477192"]),
        ("The multinational PEITHO randomized trial (1,006 patients with intermediate-high-risk PE) showed that tenecteplase significantly prevented hemodynamic collapse (2.6% vs 5.6%) but tripled major extracranial bleeding and ten-folded hemorrhagic stroke (2.0% vs 0.2%), establishing that routine thrombolysis should be withheld in normotensive intermediate-risk PE until overt shock develops.", ["24716681"]),
        ("The STREAM randomized trial established that in STEMI patients presenting within 3 hours who cannot undergo primary PCI within 60-90 minutes, pre-hospital fibrinolysis with half-dose tenecteplase (in patients >= 75 years) followed by timely catheterization yielded equivalent clinical efficacy to primary PCI.", ["23477786"]),
        ("Absolute contraindications to systemic thrombolysis include prior intracranial hemorrhage, known structural cerebral vascular lesion or neoplasm, ischemic stroke within 3 months, active internal bleeding, and recent severe head/facial trauma within 3 months.", ["7477192", "24716681", "23477786"])
    ],
    [
        ("7477192", "Tissue plasminogen activator for acute ischemic stroke (The National Institute of Neurological Disorders and Stroke rt-PA Stroke Study).", 1995, "trial"),
        ("24716681", "Fibrinolysis for patients with intermediate-risk pulmonary embolism (PEITHO Trial).", 2014, "trial"),
        ("23477786", "Fibrinolysis or primary PCI in ST-segment elevation myocardial infarction (STREAM Trial).", 2013, "trial")
    ],
    [
        "Tenecteplase non-inferiority and practical advantages over alteplase in acute ischemic stroke and large-vessel occlusion prior to thrombectomy.",
        "Safety and efficacy of catheter-directed low-dose ultrasound-accelerated thrombolysis (EKOS) versus systemic thrombolysis in submassive pulmonary embolism."
    ],
    [
        "Time window and disability outcomes from the NINDS rt-PA trial for acute ischemic stroke.",
        "Clinical findings of the PEITHO trial regarding major hemorrhage and mortality in intermediate-risk submassive pulmonary embolism.",
        "Pharmacoinvasive strategy parameters and timing from the STREAM trial for STEMI when PCI is delayed."
    ],
    [
        "A 63-year-old male presenting 2 hours after acute onset right hemiparesis and aphasia (NIHSS 14) with non-contrast CT head showing no hemorrhage or early infarction.",
        "A 55-year-old female on day 3 post-knee arthroplasty who develops acute dyspnea, systolic blood pressure 75 mmHg refractory to fluids, and RV strain on echocardiography."
    ]
)
