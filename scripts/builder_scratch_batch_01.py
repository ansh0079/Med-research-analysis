# -*- coding: utf-8 -*-
"""
Builder script for Batch 1 (Topics 1-25) of the 280 Write-From-Scratch cohort.
Replaces generic placeholder text with textbook-grade clinical evidence,
diagnostic pearls, landmark trials, and high-yield MCQ angles.
"""

BATCH_01_TOPICS = {
    "Rectal Prolapse": {
        "mentor_intro": "Full-thickness rectal prolapse (procidentia) involves circumferential protrusion of all rectal wall layers through the anal sphincter. Management is fundamentally surgical, with operative approaches broadly divided into abdominal rectopexy (preferred in fit individuals due to lower recurrence) and perineal procedures (Delorme or Altemeier, reserved for frail or high-risk patients).",
        "teaching_points": [
            "Full-thickness rectal prolapse (procidentia) must be distinguished clinically from mucosal prolapse and prolapsing hemorrhoids by identifying concentric circular mucosal folds around the protruding mass, rather than radial sulci.",
            "Laparoscopic or robotic ventral mesh rectopexy (VMR) is the preferred abdominal approach in physiologically fit patients, securing the distal rectum to the sacral promontory while preserving lateral ligaments to minimize postoperative denervation constipation.",
            "Perineal approaches—specifically the Delorme procedure (mucosal sleeve stripping and muscular plication) and the Altemeier procedure (perineal rectosigmoidectomy)—carry lower perioperative morbidity but higher recurrence rates (10–30% vs 2–5% for abdominal rectopexy), making them ideal for frail, elderly patients with significant comorbidities.",
            "Comprehensive preoperative evaluation includes colonoscopy to exclude synchronous colorectal neoplasms or lead points, alongside defecography and anorectal manometry to evaluate coexistent pelvic floor dyssynergia and anal sphincter tone.",
            "Postoperative pelvic floor physical therapy and biofeedback are critical adjuncts, addressing persistent fecal incontinence (present in 50–70% of patients preoperatively) or baseline pelvic dysmotility following successful anatomical prolapse reduction."
        ],
        "mcq_angles": [
            "Physical examination differentiation: concentric circular folds signify full-thickness rectal procidentia, whereas radial grooves characterize prolapsing internal hemorrhoids.",
            "Surgical procedure selection: abdominal mesh rectopexy provides lowest recurrence rates (approx. 2-5%) compared to perineal procedures (10-30%).",
            "Indication for perineal rectosigmoidectomy (Altemeier): frail elderly patients with incarcerated or strangulated rectal prolapse unfit for general anesthesia."
        ],
        "case_hooks": [
            "An 78-year-old frail woman residing in a nursing home presenting with an irreducible 7-cm circumferential rectal mass with ulceration and fecal incontinence.",
            "A 42-year-old multiparous woman with chronic constipation presenting with recurrent rectal protrusion on defecation that reduces spontaneously upon recumbency."
        ],
        "uncertainties": [
            "Choice of synthetic versus biological mesh in ventral rectopexy regarding long-term erosion risk and anatomical durability.",
            "Optimal timing and utility of routine lateral pelvic lymph node evaluation in patients presenting with rectal prolapse secondary to a low rectal malignancy."
        ]
    },

    "Rectal cancer: total mesorectal excision, neoadjuvant chemoradiotherapy": {
        "mentor_intro": "The management of locally advanced rectal cancer (cT3-T4 or node-positive) requires precise pelvic MRI staging and multidisciplinary Heart Team/Tumor Board coordination. Total mesorectal excision (TME) with negative circumferential resection margins (CRM) combined with total neoadjuvant therapy (TNT) maximizes pathological complete response and locoregional control.",
        "teaching_points": [
            "Total mesorectal excision (TME)—en bloc resection of the rectum along with intact surrounding mesorectal fat within the visceral fascia of the rectum—is the gold standard surgical principle, drastically reducing local recurrence from >25% to <5–8%.",
            "High-resolution pelvic MRI is the definitive imaging modality to determine relationship to the mesorectal fascia (MRF), tumor height from the anal verge, extramural venous invasion (EMVI), and status of the circumferential resection margin (threatened if tumor <=1 mm from MRF).",
            "Total Neoadjuvant Therapy (TNT)—delivering systemic consolidation or induction chemotherapy (FOLFIRINOX or CAPOX) alongside short-course radiotherapy (5x5 Gy) or long-course chemoradiotherapy (45-50.4 Gy with fluoropyrimidine)—achieves higher pathological complete response rates (~25-30%) and lower distant metastasis rates compared with standard preoperative chemoradiotherapy alone.",
            "In patients achieving a clinical complete response (cCR) following TNT, an organ-preserving 'Watch-and-Wait' non-operative surveillance protocol (frequent digital rectal examination, endoscopy, and pelvic MRI every 3 months for 2 years) offers equivalent oncological survival while avoiding permanent stoma morbidity.",
            "For upper rectal cancers (tumors >10-12 cm from the anal verge), the mesorectal fat tapers, and a partial mesorectal excision (PME) with a 5-cm distal mesorectal margin provides oncological equivalence without necessitating complete pelvic floor dissection."
        ],
        "mcq_angles": [
            "Circumferential resection margin (CRM) threshold: tumor involvement or proximity <=1 mm from the mesorectal fascia on MRI predicts high local recurrence and mandates neoadjuvant downstaging.",
            "Total Neoadjuvant Therapy (TNT) superiority: higher compliance, doubled rates of pathological complete response (pCR), and improved disease-free survival over post-op adjuvant therapy.",
            "Watch-and-Wait protocol criteria: normal digital rectal exam, white scar on endoscopy with no mucosal irregularity, and no residual signal on diffusion-weighted pelvic MRI."
        ],
        "case_hooks": [
            "A 56-year-old man diagnosed with cT3bN1 mid-rectal adenocarcinoma 6 cm from the anal verge, with tumor extending within 0.5 mm of the mesorectal fascia on pelvic MRI.",
            "A 68-year-old woman with low rectal cancer achieving complete mucosal normalization on flexible sigmoidoscopy and normal MRI following completion of total neoadjuvant therapy."
        ],
        "uncertainties": [
            "Optimal sequencing of TNT: induction chemotherapy before chemoradiotherapy versus consolidation chemotherapy after radiotherapy (RAPIDO vs PRODIGE 23 regimens).",
            "Oncological safety and functional outcomes of robotic lateral pelvic lymph node dissection for persistent MRI-enlarged obturator/internal iliac nodes."
        ]
    },

    "Recurrent Clostridioides difficile infection": {
        "mentor_intro": "Recurrent Clostridioides difficile infection (rCDI) represents a significant therapeutic challenge driven by persistent intestinal dysbiosis and spore germination. Current clinical practice guidelines prioritize fidaxomicin and fecal microbiota-based therapeutics over repeated courses of vancomycin to restore colonization resistance and prevent further recurrences.",
        "teaching_points": [
            "Fidaxomicin (200 mg orally twice daily for 10 days, or extended-pulsed regimen) is the guideline-preferred first-line treatment for initial CDI and first recurrence, demonstrating equivalent clinical cure but significantly lower 30-day recurrence rates (approx. 15% vs 25%) compared with oral vancomycin due to narrow-spectrum sparing of normal Bacteroidetes and Firmicutes flora.",
            "For patients with a second or subsequent CDI recurrence (>=2 prior recurrences), fecal microbiota transplantation (FMT) or FDA-approved live biotherapeutic products (fecal microbiota spores, live-brpk or fecal microbiota, live-jslm) achieve >80–90% sustained clinical resolution by reconstituting competitive microbial colonization resistance.",
            "Oral vancomycin taper and pulse regimens (e.g., 125 mg 4 times daily for 10-14 days, twice daily for 7 days, once daily for 7 days, then every 2-3 days for 2-8 weeks) remain an evidence-based alternative when fidaxomicin or microbiota products are unavailable.",
            "Bezlotoxumab—a fully human monoclonal antibody that binds and neutralizes C. difficile toxin B—administered as a single intravenous infusion (10 mg/kg) during antibiotic therapy significantly reduces recurrence in patients at high risk (age >=65, immunocompromised, severe CDI), but carries a cautionary warning in patients with underlying congestive heart failure.",
            "Metronidazole is strictly obsolete as first-line therapy for CDI due to inferior clinical cure rates and higher rates of recurrence and neurotoxicity, retaining utility only as adjunctive IV therapy (500 mg IV q8h) combined with high-dose oral/rectal vancomycin in fulminant CDI."
        ],
        "mcq_angles": [
            "First recurrence treatment selection: fidaxomicin preferred over vancomycin; if vancomycin was used initially, use prolonged vancomycin taper or fidaxomicin.",
            "Indication for fecal microbiota transplantation (FMT): second or subsequent recurrence of CDI despite guideline-directed antibiotic therapy.",
            "Bezlotoxumab mechanism and contraindication: neutralizes toxin B to prevent recurrence; caution in heart failure due to increased heart failure-related events."
        ],
        "case_hooks": [
            "A 72-year-old woman completing a 10-day course of oral vancomycin for CDI who presents 14 days later with profuse watery diarrhea and repeat positive C. difficile PCR and toxin EIA.",
            "An 80-year-old man with stage 3 CKD and severe recurrent CDI (3rd episode) evaluated for oral fecal microbiota live biotherapeutic delivery."
        ],
        "uncertainties": [
            "Efficacy and duration of secondary vancomycin or fidaxomicin prophylaxis during unavoidable systemic antibiotic re-exposure in patients with prior rCDI.",
            "Long-term metabolic and immune effects of standardized oral capsule-based microbiome restoration versus colonoscopic infusion."
        ]
    },

    "Recurrent Disease in the Transplant": {
        "mentor_intro": "Recurrence of primary glomerular and systemic diseases in kidney transplant allografts is the third leading cause of graft loss after rejection and death with a functioning graft. Understanding disease-specific recurrence risks, histological patterns, and early therapeutic interventions is vital for long-term allograft survival.",
        "teaching_points": [
            "Focal segmental glomerulosclerosis (FSGS) has the highest acute recurrence rate (30–40% in first grafts, >80% in second grafts with prior recurrence), classically manifesting with massive nephrotic-range proteinuria within hours to days post-transplantation; emergency therapeutic plasma exchange (PEX) combined with high-dose calcineurin inhibitors can induce remission.",
            "Membranoproliferative glomerulonephritis (MPGN) and C3 glomerulopathy (C3G) carry exceptionally high recurrence rates (up to 70–80%), driven by persistent alternative complement pathway dysregulation; anticomplement therapies (eculizumab, ravulizumab, or novel factor B/D inhibitors) are increasingly utilized.",
            "Immunoglobulin A (IgA) nephropathy has histological recurrence in 40–60% of grafts on protocol biopsies, though clinically significant graft loss occurs in only 10–15% at 10 years, characterized by recurrent microscopic hematuria and mesangial IgA deposition.",
            "Atypical hemolytic uremic syndrome (aHUS) secondary to complement factor H, I, or B mutations carries a >80% recurrence risk without terminal complement blockade; prophylactic initiation of eculizumab at the time of transplantation prevents catastrophic microvascular thrombotic graft loss.",
            "Anti-glomerular basement membrane (anti-GBM) disease requires complete serological clearance of circulating anti-GBM antibodies (undetectable for at least 6 to 12 months) prior to transplantation, which reduces graft recurrence to <5%."
        ],
        "mcq_angles": [
            "Immediate post-transplant nephrotic proteinuria: hallmark of recurrent FSGS, requiring prompt diagnostic biopsy and immediate initiation of plasma exchange.",
            "Prerequisite before transplanting in anti-GBM disease: strict documentation of negative circulating anti-GBM titers for >=6-12 months.",
            "Prophylactic strategy in complement-mediated aHUS: preemptive terminal complement C5 inhibition (eculizumab) prevents catastrophic graft thrombosis."
        ],
        "case_hooks": [
            "A 24-year-old man with end-stage renal disease secondary to idiopathic FSGS who develops 8 g/day of proteinuria and lower limb edema on postoperative day 3 following live-donor kidney transplantation.",
            "A 45-year-old woman with prior graft failure from recurrent C3 glomerulopathy undergoing pre-transplant complement pathway genetic and serological evaluation."
        ],
        "uncertainties": [
            "Targeting the soluble urokinase plasminogen activator receptor (suPAR) or autoantibody panels as reliable pre-transplant biomarkers for FSGS recurrence.",
            "Optimal maintenance duration of complement C5 inhibitors to prevent late C3G and aHUS recurrence without excess encapsulated bacterial infection risks."
        ]
    },

    "Red blood cell transfusion threshold in critical illness": {
        "mentor_intro": "Blood management in critically ill patients balances oxygen delivery against the known infectious, immunomodulatory, and circulatory risks of allogeneic blood transfusion. Multiple landmark randomized trials establish that a restrictive transfusion threshold (hemoglobin <70 g/L / 7 g/dL) is safe and superior or non-inferior to liberal strategies across most ICU cohorts.",
        "teaching_points": [
            "A restrictive red blood cell (RBC) transfusion strategy—transfusing only when hemoglobin drops below 70 g/L (7.0 g/dL) to maintain target 70–90 g/L—is non-inferior or superior to liberal transfusion (threshold <90-100 g/L) in critically ill adults, significantly reducing blood utilization, transfusion reactions, and Transfusion-Associated Circulatory Overload (TACO).",
            "In patients with acute coronary syndromes (acute myocardial infarction), recent multicenter trial evidence (e.g., MINT trial) demonstrates that a more liberal threshold (transfusing for Hb <100 g/L / 10 g/dL) may reduce recurrent myocardial infarction and 30-day mortality compared with restrictive strategies.",
            "In traumatic brain injury (TBI) and acute neurocritical illness, consensus guidelines recommend a target hemoglobin threshold of 80 to 90 g/L (8–9 g/dL) to balance cerebral oxygen delivery (critical in preventing secondary ischemic brain injury) against hyperviscosity and secondary inflammatory damage.",
            "Transfusion should be prescribed as single units of packed RBCs in hemodynamically stable patients, with immediate post-transfusion clinical and laboratory reassessment before considering additional units ('transfuse one unit and re-evaluate').",
            "Allogeneic RBC transfusion carries well-established risks including Transfusion-Related Acute Lung Injury (TRALI, non-cardiogenic pulmonary edema within 6 hours), TACO (cardiogenic hydrostatic pulmonary edema with elevated BNP and positive fluid balance), and transfusion-related immunomodulation (TRIM)."
        ],
        "mcq_angles": [
            "Standard critical care transfusion threshold: Hb <70 g/L (7.0 g/dL) for general ICU and septic shock patients; liberal thresholds provide no survival benefit and increase complications.",
            "Exception to restrictive strategy: acute coronary syndrome / active myocardial ischemia, where maintaining Hb >=100 g/L (10 g/dL) is supported by randomized evidence.",
            "Distinguishing TRALI from TACO: TACO features elevated BNP, response to diuretics, and signs of left atrial hypertension; TRALI features normal wedge pressure and transient neutropenia."
        ],
        "case_hooks": [
            "A 66-year-old mechanically ventilated man with severe septic shock and multi-organ failure whose morning hemoglobin is 74 g/L with stable hemodynamics on low-dose noradrenaline.",
            "A 72-year-old woman admitted with non-ST-elevation myocardial infarction and acute heart failure whose hemoglobin is 82 g/L."
        ],
        "uncertainties": [
            "Optimal personalized transfusion thresholds based on continuous regional tissue oxygenation monitoring (near-infrared spectroscopy NIRS or jugular venous bulb oxygen saturation SjvO2).",
            "Comparative clinical outcomes of fresh versus standard storage-duration RBC units in massive resuscitation and prolonged ICU admission."
        ]
    },

    "Refeeding Syndrome": {
        "mentor_intro": "Refeeding syndrome is a life-threatening metabolic complication that occurs upon reintroducing nutrition to severely malnourished, starved, or metabolically stressed individuals. Carbohydrate reintroduction triggers a sudden surge in insulin release, driving phosphate, potassium, and magnesium into cells and precipitating severe hypophosphatemia, arrhythmias, and cardiac arrest.",
        "teaching_points": [
            "Refeeding syndrome is triggered by rapid carbohydrate reintroduction in a starved individual, precipitating sudden endogenous insulin secretion that drives cellular uptake of phosphate, potassium, and magnesium, while simultaneously inducing renal sodium and water retention.",
            "Severe hypophosphatemia (<0.32 mmol/L or <1.0 mg/dL) is the hallmark biochemical derangement, causing ATP depletion and impaired oxygen unloading (decreased 2,3-DPG), manifesting as acute heart failure, lethal ventricular arrhythmias, diaphragmatic respiratory muscle weakness, rhabdomyolysis, and encephalopathy.",
            "High-risk patient populations include chronic anorexia nervosa, chronic alcohol use disorder, prolonged fasting/hunger strikes, severe malabsorption (short bowel syndrome, bariatric surgery), and critically ill patients unfed for >=5–7 days.",
            "Prevention mandates prophylactic administration of high-dose intravenous thiamine (200–300 mg IV daily) and B-complex vitamins before caloric intake begins, as carbohydrate metabolism rapidly exhausts residual thiamine stores and can precipitate acute Wernicke encephalopathy or cardiovascular beriberi.",
            "Caloric reintroduction must be initiated cautiously at a reduced rate of 10 to 15 kcal/kg/day (or 5–10 kcal/kg/day in extreme high-risk cases), slowly titrated upward over 4 to 7 days alongside proactive electrolyte replacement (phosphate, potassium, magnesium) and strict fluid monitoring."
        ],
        "mcq_angles": [
            "Earliest and most dangerous electrolyte disturbance: severe hypophosphatemia, leading to cellular ATP depletion and acute neuromuscular/cardiac collapse.",
            "Sequence of preventive interventions: IV thiamine administration MUST precede the initiation of any carbohydrate/caloric intake.",
            "Caloric repletion pace: initial caloric prescription must not exceed 10–15 kcal/kg/day in high-risk patients, advancing gradually over 5–7 days."
        ],
        "case_hooks": [
            "A 19-year-old woman with severe anorexia nervosa (BMI 12.5 kg/m2) admitted for inpatient refeeding who develops sudden dyspnea, confusion, and serum phosphate 0.28 mmol/L 48 hours after starting enteral nutrition.",
            "A 54-year-old man with chronic alcohol dependence and severe malnutrition receiving IV dextrose infusions in the ED who acutely develops ophthalmoplegia, nystagmus, and profound ataxia."
        ],
        "uncertainties": [
            "Efficacy and safety of newer 'higher-calorie' refeeding protocols in adolescents with mild-to-moderate anorexia nervosa under intense electrolyte monitoring.",
            "Role of continuous biochemical telemetry versus scheduled interval venous blood draws in non-ICU ward refeeding management."
        ]
    },

    "Refractory ventricular fibrillation: double sequential defibrillation, amiodarone": {
        "mentor_intro": "Refractory ventricular fibrillation (RVF)—ventricular fibrillation or pulseless ventricular tachycardia that persists despite multiple standard shocks, high-quality CPR, and guideline-directed antiarrhythmics—carries dismal survival. Novel rescue strategies, including double sequential external defibrillation (DSED) and vector change (VC) defibrillation, have revolutionized management.",
        "teaching_points": [
            "Refractory ventricular fibrillation (RVF) is defined as persistent VF or pulseless VT following three or more consecutive standard defibrillation attempts, epinephrine administration, and appropriate antiarrhythmic therapy.",
            "The landmark DOSE VF randomized controlled trial demonstrated that Double Sequential External Defibrillation (DSED—rapid sequential delivery of two shocks from two defibrillators with anterior-posterior and anterolateral pads) and Vector Change (VC) defibrillation significantly improved survival to hospital discharge (30.4% with DSED, 21.7% with VC, vs 13.3% with standard defibrillation) in refractory out-of-hospital VF.",
            "Amiodarone (first dose 300 mg IV/IO bolus, second dose 150 mg) or lidocaine (first dose 1.0–1.5 mg/kg IV/IO, second dose 0.5–0.75 mg/kg) are evidence-based first-line antiarrhythmic agents in cardiac arrest, with randomized trials showing equivalent rates of survival to hospital admission.",
            "Correctable reversible causes ('Hs and Ts') must be aggressively investigated and treated concurrently, with particular emphasis on acute myocardial ischemia (mandating emergency mechanical circulatory support / ECMO-facilitated PCI), hyperkalemia, severe hypomagnesemia, and accidental hypothermia.",
            "Extracorporeal cardiopulmonary resuscitation (ECPR)—instituting veno-arterial ECMO in the cardiac catheterization laboratory during active arrest—provides definitive hemodynamic rescue and allows emergency coronary reperfusion in refractory VF arrest."
        ],
        "mcq_angles": [
            "DOSE VF trial primary finding: double sequential external defibrillation (DSED) and vector-change (VC) defibrillation both significantly improve neurologically intact survival to hospital discharge over standard defibrillation in RVF.",
            "Antiarrhythmic equivalence: the ALPS trial confirmed that amiodarone and lidocaine have equivalent efficacy in shock-refractory out-of-hospital cardiac arrest.",
            "Technical execution of DSED: two separate defibrillators with separate pad pairs (anterolateral and anteroposterior), firing in rapid sequential succession (<1 second apart)."
        ],
        "case_hooks": [
            "A 52-year-old man in out-of-hospital cardiac arrest who remains in coarse ventricular fibrillation after 4 standard 200J biphasic shocks, 3 mg epinephrine, and 300 mg amiodarone.",
            "A 60-year-old woman undergoing catheterization for acute STEMI who develops recurrent VF storms despite repeated standard defibrillation."
        ],
        "uncertainties": [
            "Optimal shock interval timing (simultaneous vs 10-100 millisecond delay) during double sequential external defibrillation.",
            "Standardization of patient selection criteria for pre-hospital field initiation of ECPR versus expedited transport for refractory VF."
        ]
    },

    "Rehabilitation after stroke: principles and evidence": {
        "mentor_intro": "Stroke rehabilitation is a coordinated multidisciplinary process aimed at promoting neuroplasticity, optimizing functional independence, and preventing secondary complications. Early, high-intensity, task-specific training in dedicated stroke rehabilitation units forms the evidence-based foundation of recovery.",
        "teaching_points": [
            "Organized stroke unit care provides significant reductions in death, dependency, and the need for institutional care; rehabilitation delivered by a dedicated multidisciplinary team (physiotherapy, occupational therapy, speech and language therapy, clinical neuropsychology) is a Class I recommendation.",
            "Task-specific, repetitive motor training and constraint-induced movement therapy (CIMT)—restraining the unaffected upper limb to force intensive use of the paretic limb—significantly enhance cortical motor reorganization and functional recovery in patients with residual active wrist and finger extension.",
            "Very early high-dose mobilization within 24 hours of acute stroke was shown in the AVERT trial to reduce favorable functional outcomes at 3 months; current guidelines recommend early mobilization only after physiological stability is achieved, avoiding aggressive protocols within the first 24 hours.",
            "Post-stroke spasticity is managed with a tiered algorithm: first-line physical therapy and splinting, followed by focal intramuscular botulinum toxin type A injections combined with physical training for focal spasticity, avoiding systemic sedating antispasmodics (baclofen, tizanidine) where possible.",
            "Comprehensive screening for post-stroke depression (affecting ~30% of stroke survivors) and post-stroke cognitive impairment is mandatory; selective serotonin reuptake inhibitors (SSRIs) effectively treat post-stroke depression, although routine prophylactic SSRI administration to promote motor recovery (AFFINITY, EFFECTS, FOCUS trials) is not supported."
        ],
        "mcq_angles": [
            "Timing of mobilization after acute stroke: AVERT trial showed very early, high-intensity mobilization within 24 hours is harmful; initiate mobilization after 24 hours when stable.",
            "Constraint-induced movement therapy (CIMT) eligibility: requires baseline active extension of at least 10 degrees at the MCP/interphalangeal joints and 20 degrees at the wrist.",
            "Focal spasticity management: intramuscular botulinum toxin type A injections combined with occupational therapy provide targeted tone reduction without systemic sedation."
        ],
        "case_hooks": [
            "A 64-year-old man 2 weeks post-ischemic MCA stroke who exhibits severe left spastic hemiplegia, flexed wrist posturing, and painful biceps spasms interfering with hygiene.",
            "A 58-year-old woman 1 month following lacunar stroke presenting with profound apathy, emotional lability, tearfulness, and poor participation in physical therapy sessions."
        ],
        "uncertainties": [
            "Comparative long-term clinical utility of robotic gait trainers and virtual reality immersion versus therapist-delivered overground locomotor training.",
            "Therapeutic window and patient stratification for non-invasive brain stimulation (repetitive transcranial magnetic stimulation rTMS or tDCS) in aphasia recovery."
        ]
    },

    "Relapsed and Refractory DLBCL": {
        "mentor_intro": "The therapeutic paradigm for relapsed or refractory diffuse large B-cell lymphoma (R/R DLBCL) has been transformed by chimeric antigen receptor (CAR) T-cell therapy and novel targeted bispecific antibodies. Rapid cellular therapy assessment is now standard of care for early relapses following first-line chemoimmunotherapy.",
        "teaching_points": [
            "In patients with DLBCL refractory to first-line therapy or relapsing within 12 months of chemoimmunotherapy (R-CHOP), autologous anti-CD19 CAR T-cell therapy (axicabtagene ciloleucel or lisocabtagene maraleucel) demonstrated superior event-free survival and overall survival compared with platinum-based salvage chemoimmunotherapy and autologous stem cell transplantation (ZUMA-7 and TRANSFORM trials).",
            "High-dose chemotherapy and autologous stem cell transplantation (ASCT) retain clinical utility primarily in chemo-sensitive late relapses occurring greater than 12 months following initial treatment.",
            "Bispecific T-cell engager (BiTE) antibodies targeting CD20 and CD3 (glofitamab and epcoritamab) induce deep and durable complete responses in patients with heavily pretreated DLBCL who have failed CAR T-cell therapy or are ineligible for cellular therapies.",
            "Polatuzumab vedotin (antibody-drug conjugate targeting CD79b conjugated to monomethyl auristatin E) combined with bendamustine and rituximab (Pola-BR), and loncastuximab tesirine (anti-CD19 ADC with pyrrolobenzodiazepine dimer toxin), are approved effective options for transplant-ineligible R/R DLBCL.",
            "Immune effector cell-associated toxicities following CAR T-cell therapy require standardized management: Cytokine Release Syndrome (CRS, manifesting with fever, hypoxia, and hypotension) is treated with the IL-6 receptor antagonist tocilizumab +/- corticosteroids; Immune Effector Cell-Associated Neurotoxicity Syndrome (ICANS) requires high-dose corticosteroids (dexamethasone), as tocilizumab does not cross the blood-brain barrier."
        ],
        "mcq_angles": [
            "Indication for upfront CAR T-cell therapy over ASCT: primary refractory disease or relapse occurring <=12 months following completion of first-line R-CHOP.",
            "Cytokine Release Syndrome (CRS) specific antidote: tocilizumab (anti-IL-6 receptor antagonist); corticosteroids added for grade >=2 CRS.",
            "ICANS management distinction: dexamethasone is first-line; tocilizumab does not cross blood-brain barrier and can paradoxically raise CSF IL-6 levels if used alone."
        ],
        "case_hooks": [
            "A 58-year-old man with DLBCL who demonstrates disease progression on PET-CT within 3 months of completing 6 cycles of R-CHOP chemoimmunotherapy.",
            "A 65-year-old woman on day 5 post-axicabtagene ciloleucel infusion who develops high fever (39.5 C), systolic blood pressure of 82 mmHg, and expressive dysphasia."
        ],
        "uncertainties": [
            "Optimal salvage sequencing between CD20xCD3 bispecific antibodies and allogeneic CAR-T/stem cell transplantation following autologous CAR T-cell failure.",
            "Role of circulating tumor DNA (ctDNA) molecular response monitoring in guiding early CAR T-cell referral during second-line therapy."
        ]
    },

    "Renal Biopsy: Indications and Interpretation": {
        "mentor_intro": "Percutaneous native renal biopsy is the gold-standard diagnostic procedure in nephrology, providing definitive diagnosis, prognostic assessment, and guidance for immunosuppressive therapy. Systematic histological processing combining light microscopy, immunofluorescence, and electron microscopy is mandatory.",
        "teaching_points": [
            "Major clinical indications for native percutaneous renal biopsy include unexplained acute kidney injury, rapidly progressive glomerulonephritis (RPGN), nephrotic-range proteinuria, persistent glomerular hematuria with proteinuria, and systemic autoimmune diseases with suspected renal involvement (e.g., lupus nephritis).",
            "Absolute contraindications include uncorrectable bleeding diathesis, refractory severe hypertension (blood pressure >160/100 mmHg), severe uncooperative patient behavior, and skin infection over the biopsy site; solitary native kidney is a relative contraindication requiring experienced operator ultrasound guidance.",
            "Comprehensive pathological interpretation mandates three complementary modalities: light microscopy (H&E, PAS for basement membranes, Jones silver for spikes/holes, Masson trichrome for interstitial fibrosis), immunofluorescence (detecting IgG, IgA, IgM, C3, C1q, kappa, lambda), and electron microscopy (identifying subepithelial, subendothelial, or mesangial deposit ultrastructure and podocyte foot process effacement).",
            "Adequacy criteria for a native renal biopsy typically require a core containing a minimum of 8 to 10 glomeruli with at least one interlobular artery to assess both glomerular and vascular pathology accurately.",
            "Post-biopsy monitoring mandates 4 to 6 hours of strict bed rest, serial blood pressure/pulse monitoring, and routine post-procedure urine inspection; gross hematuria occurs in 2–5% of patients, while major perinephric hematomas requiring transfusion or angiographic embolization occur in <1%."
        ],
        "mcq_angles": [
            "Mandatory triad of renal biopsy examination: light microscopy, direct immunofluorescence, and transmission electron microscopy are all essential for accurate glomerulopathy classification.",
            "Prerequisite blood pressure threshold: systolic BP must be controlled below 140-160 mmHg and diastolic below 90-100 mmHg before biopsy to prevent life-threatening subcapsular hemorrhage.",
            "Distinguishing minimal change disease from FSGS on electron microscopy: minimal change shows diffuse podocyte foot process effacement with completely negative immunofluorescence and no light microscopic sclerosis."
        ],
        "case_hooks": [
            "A 29-year-old woman with systemic lupus erythematosus who develops new-onset proteinuria of 3.2 g/24h and microscopic hematuria with RBC casts.",
            "A 62-year-old man presenting with acute oliguria, serum creatinine rising from 1.0 to 4.8 mg/dL over 2 weeks, and positive p-ANCA (anti-MPO) serology."
        ],
        "uncertainties": [
            "Diagnostic yield and bleeding risk of transjugular renal biopsy versus ultrasound-guided percutaneous biopsy in patients with high-risk bleeding diatheses.",
            "Integration of spatial transcriptomics and automated machine-learning digital pathology into standard renal biopsy scoring systems."
        ]
    },

    "Renal Cell Carcinoma": {
        "mentor_intro": "Renal cell carcinoma (RCC) comprises a heterogeneous group of malignancies arising from renal tubular epithelium, predominantly clear cell RCC (75–80%). Treatment paradigms for localized disease prioritize nephron-sparing surgery, while metastatic disease management has been revolutionized by combinations of immune checkpoint inhibitors and VEGF receptor tyrosine kinase inhibitors.",
        "teaching_points": [
            "Clear cell renal cell carcinoma (ccRCC) is the most common histological subtype (75-80%), characterized pathologically by loss of chromosome 3p and biallelic inactivation of the von Hippel-Lindau (VHL) tumor suppressor gene, leading to accumulation of hypoxia-inducible factors (HIF-1a/2a) and overexpression of VEGF and PDGF.",
            "For localized T1 renal tumors (<=7 cm), partial nephrectomy (nephron-sparing surgery) is the preferred standard of care over radical nephrectomy, preserving long-term renal function and reducing cardiovascular mortality with oncological equivalence.",
            "Active surveillance is an evidence-based management strategy for small renal masses (<3 cm) in elderly or comorbid patients, given the slow median growth rate (approx. 0.1–0.3 cm/year) and very low metastatic potential during initial monitoring.",
            "For treatment-naive metastatic clear cell RCC, risk-stratified combination therapy based on the IMDC (International Metastatic RCC Database Consortium) criteria is standard: dual immune checkpoint inhibition (nivolumab plus ipilimumab) or ICI-TKI combinations (pembrolizumab plus axitinib, nivolumab plus cabozantinib, or pembrolizumab plus lenvatinib) achieve superior overall survival over sunitinib.",
            "RCC is historically refractory to cytotoxic chemotherapy and conventional radiotherapy; targeted therapies include multi-targeted receptor tyrosine kinase inhibitors (cabozantinib, axitinib), mTOR inhibitors (everolimus), and the first-in-class HIF-2alpha inhibitor belzutifan for VHL-associated RCC."
        ],
        "mcq_angles": [
            "Surgical choice for T1a renal mass: partial nephrectomy is strongly preferred over radical nephrectomy to preserve nephron mass and renal function.",
            "Molecular pathophysiology of clear cell RCC: VHL gene inactivation on chromosome 3p leading to constitutive activation of HIF pathways and hypervascularity.",
            "First-line systemic therapy for poor/intermediate-risk metastatic ccRCC: combination immunotherapy with nivolumab plus ipilimumab or pembrolizumab plus axitinib/lenvatinib."
        ],
        "case_hooks": [
            "A 62-year-old man found to have an incidental 3.2-cm solid, enhancing, exophytic mass in the lower pole of the right kidney on an abdominal ultrasound for gallstones.",
            "A 54-year-old woman presenting with left flank pain, microscopic hematuria, and multiple cannonball pulmonary metastases on chest CT."
        ],
        "uncertainties": [
            "Role of adjuvant pembrolizumab in intermediate-high risk resected ccRCC balancing disease-free survival benefits against immune-related toxicities (KEYNOTE-564).",
            "Optimal second-line sequencing following progression on first-line IO-TKI combinations in metastatic clear cell RCC."
        ]
    },

    "Renal Hypertension: Secondary Causes": {
        "mentor_intro": "Renal disease is the single most common cause of secondary hypertension, divided into renal parenchymal disease and renovascular hypertension. Identifying renovascular stenosis, particularly in young females (fibromuscular dysplasia) or older atherosclerotic patients, allows targeted medical and interventional management.",
        "teaching_points": [
            "Renal parenchymal disease causes hypertension through impaired sodium excretion, intravascular volume expansion, and secondary activation of the renin-angiotensin-aldosterone system (RAAS); blood pressure target is <130/80 mmHg using ACE inhibitors or ARBs as first-line therapy to reduce proteinuria and slow CKD progression.",
            "Renovascular hypertension is caused by renal artery stenosis (RAS), which is divided into atherosclerotic RAS (>90% of cases, typically affecting older males at the ostium/proximal third of the artery) and fibromuscular dysplasia (FMD, ~10%, classically affecting young females aged 15-50 in the mid-to-distal artery with a 'string-of-beads' appearance).",
            "Clinical clues indicating renovascular hypertension include severe or resistant hypertension, acute elevation of serum creatinine >30% following initiation of an ACE inhibitor or ARB, recurrent unprovoked flash pulmonary edema, an abdominal systolic-diastolic bruit, and asymmetric kidney sizes (>1.5 cm length discrepancy).",
            "Catheter-based percutaneous transluminal angioplasty (PTA) without stenting is the curative treatment of choice for fibromuscular dysplasia, achieving high rates of blood pressure normalization; in contrast, routine stenting for atherosclerotic RAS (ASTRAL and CORAL trials) does not improve blood pressure or renal outcomes over medical therapy alone.",
            "Initial non-invasive screening for suspected renal artery stenosis utilizes renal duplex ultrasonography (peak systolic velocity >200 cm/s, renal-to-aortic velocity ratio >3.5), CT angiography (avoided in advanced renal impairment), or contrast-enhanced magnetic resonance angiography (MRA)."
        ],
        "mcq_angles": [
            "FMD versus Atherosclerotic RAS: FMD responds curative to percutaneous balloon angioplasty without stenting, whereas atherosclerotic RAS is primarily managed with optimal medical therapy.",
            "ACE inhibitor hemodynamic effect: acute rise in serum creatinine >30% upon starting ACEi/ARB suggests bilateral renal artery stenosis or stenosis of a solitary functioning kidney.",
            "Preferred non-invasive screening test: Doppler ultrasonography of renal arteries evaluates hemodynamic velocity shifts without exposing patients to iodinated contrast or gadolinium."
        ],
        "case_hooks": [
            "A 28-year-old previously healthy woman with newly diagnosed severe hypertension (BP 185/110 mmHg) and an epigastric bruit on physical examination.",
            "A 72-year-old man with peripheral vascular disease and baseline creatinine 1.4 mg/dL whose creatinine spikes to 2.8 mg/dL 10 days after starting lisinopril 10 mg daily."
        ],
        "uncertainties": [
            "Compelling criteria for revascularization in atherosclerotic RAS (refractory flash pulmonary edema, rapidly progressive ischemic nephropathy).",
            "Screening algorithms and diagnostic criteria for non-atherosclerotic renal artery aneurysms and spontaneous renal artery dissections in patients with FMD."
        ]
    },

    "Renal Imaging in Nephrology": {
        "mentor_intro": "Radiological imaging is integral to the diagnosis, staging, and monitoring of kidney disorders. Selecting the appropriate modality—renal ultrasound, computed tomography (CT), magnetic resonance imaging (MRI), or radionuclide scintigraphy—requires balancing anatomical resolution against potential nephrotoxic and systemic risks.",
        "teaching_points": [
            "Renal ultrasonography is the first-line imaging modality in nephrology, accurately evaluating kidney size, cortical echogenicity, corticomedullary differentiation, and excluding post-renal obstructive uropathy (hydronephrosis) without radiation exposure or nephrotoxicity.",
            "Bilateral small (<9 cm), hyperechoic kidneys with thin cortices and poor corticomedullary differentiation indicate irreversible chronic kidney disease; normal or enlarged kidneys in renal failure suggest diabetic nephropathy, amyloidosis, polycystic kidney disease, HIV-associated nephropathy, or acute glomerulonephritis.",
            "Non-contrast low-dose CT of the kidneys, ureters, and bladder (CT KUB) is the gold standard imaging modality for suspected nephrolithiasis, boasting >95% sensitivity and specificity and detecting all stone types (including radiolucent uric acid stones) except rare indinavir-induced stones.",
            "Contrast-induced nephropathy (CIN) and post-contrast acute kidney injury (PC-AKI) risk with modern low-osmolar or iso-osmolar iodinated contrast is low, but rises in severe CKD (eGFR <30 mL/min/1.73m2); preventive measures center on volume expansion with isotonic crystalloids (saline), while sodium bicarbonate and N-acetylcysteine are no longer routinely recommended.",
            "Gadolinium-based contrast agents carry a risk of Nephrogenic Systemic Fibrosis (NSF) in severe kidney failure (eGFR <15-30 mL/min/1.73m2); modern macrocyclic Class II agents (e.g., gadobutrol, gadoterate) carry negligible risk and can be safely administered when clinically indicated."
        ],
        "mcq_angles": [
            "Kidney size in chronic renal failure: kidneys are typically shrunken (<9 cm), but enlarged/normal sized in diabetic nephropathy, amyloidosis, and myeloma kidney.",
            "Imaging test of choice for acute flank pain and suspected ureteric colic: non-contrast CT KUB, which detects stone location, diameter, and secondary signs of obstruction.",
            "Nephrogenic Systemic Fibrosis risk profile: high-risk linear gadolinium chelates are contraindicated in severe CKD; macrocyclic Class II agents have an exemplary safety profile."
        ],
        "case_hooks": [
            "A 48-year-old man presenting with acute severe left flank pain radiating to the groin with microscopic hematuria, evaluated for optimal diagnostic imaging.",
            "A 65-year-old woman with stage 4 CKD (eGFR 22 mL/min/1.73m2) requiring an urgent contrast-enhanced CT to stage newly diagnosed colon cancer."
        ],
        "uncertainties": [
            "Clinical utility of ultrasound shear-wave elastography in quantifying renal cortical interstitial fibrosis non-invasively.",
            "True incidence of post-contrast acute kidney injury in stable outpatients with eGFR 20-30 mL/min receiving modern iso-osmolar contrast."
        ]
    },

    "Renal Manifestations of Systemic Disease": {
        "mentor_intro": "The kidneys are frequently involved in multi-organ systemic disorders including diabetes mellitus, systemic lupus erythematosus (SLE), systemic vasculitis, amyloidosis, and multiple myeloma. Recognizing distinct clinical and urinalysis signatures enables early diagnosis and targeted therapy to preserve renal function.",
        "teaching_points": [
            "Diabetic kidney disease (DKD) is the leading cause of end-stage renal disease worldwide, characterized histologically by glomerular basement membrane thickening, mesangial expansion, and nodular glomerulosclerosis (Kimmelstiel-Wilson nodules); comprehensive therapy incorporates ACEi/ARB, SGLT2 inhibitors, and non-steroidal mineralocorticoid antagonists (finerenone).",
            "Lupus nephritis affects up to 50% of SLE patients and is classified by ISN/RPS criteria into Classes I through VI; Class III (focal) and Class IV (diffuse proliferative) represent aggressive glomerulonephritides requiring urgent induction immunosuppression with mycophenolate mofetil or low-dose IV cyclophosphamide combined with high-dose corticosteroids.",
            "Renal amyloidosis (AL and AA) typically manifests as heavy, nephrotic-range proteinuria and progressive renal failure with normal or enlarged kidneys on ultrasound; diagnosis is confirmed by Congo red staining demonstrating apple-green birefringence under polarized light.",
            "Myeloma kidney (light chain cast nephropathy) presents with acute or subacute kidney injury caused by excessive monoclonal immunoglobulin free light chains precipitating with Tamm-Horsfall protein in distal tubules; diagnosis requires serum free light chain (sFLC) ratio, and dipstick urinalysis is falsely negative for proteinuria as it only detects albumin.",
            "Systemic sclerosis can cause scleroderma renal crisis (SRC), characterized by abrupt new-onset accelerated hypertension, oliguric acute kidney injury, and microangiopathic hemolytic anemia, which must be treated immediately with titrated ACE inhibitors (captopril)."
        ],
        "mcq_angles": [
            "Urinalysis discrepancy in myeloma kidney: routine urine dipstick detects only albumin and will be negative or trace despite massive Bence-Jones proteinuria, requiring 24-hr protein electrophoresis or serum free light chains.",
            "Scleroderma renal crisis management: emergency ACE inhibitor titration (captopril) is life-saving; corticosteroids are contraindicated as high doses trigger SRC.",
            "Pathognomonic histology in diabetic nephropathy: Kimmelstiel-Wilson nodules (nodular intercapillary glomerulosclerosis) on PAS and silver stains."
        ],
        "case_hooks": [
            "A 68-year-old man presenting with acute kidney injury, normocytic anemia, bone pain, hypercalcemia, and a urine dipstick that is completely negative for protein.",
            "A 36-year-old woman with diffuse systemic sclerosis who presents with new-onset blood pressure 210/120 mmHg, headache, and serum creatinine doubling to 2.4 mg/dL."
        ],
        "uncertainties": [
            "Role of dual targeted B-cell therapies (belimumab plus rituximab) in refractory proliferative lupus nephritis.",
            "Optimal threshold for emergency extracorporeal light chain removal (high-cutoff hemodialysis or plasma exchange) in severe cast nephropathy."
        ]
    },

    "Renal Manifestations of Vasculitis": {
        "mentor_intro": "Systemic vasculitis involving the kidneys typically manifests as rapidly progressive glomerulonephritis (RPGN), demanding urgent recognition and immunosuppression to prevent end-stage renal disease. ANCA-associated vasculitis and anti-GBM disease represent the most common and destructive etiologies.",
        "teaching_points": [
            "ANCA-associated vasculitis (AAV—granulomatosis with polyangiitis GPA, microscopic polyangiitis MPA, and eosinophilic GPA) typically causes a pauci-immune necrotizing and crescentic glomerulonephritis, characterized serologically by antibodies against proteinase 3 (PR3-ANCA / c-ANCA) or myeloperoxidase (MPO-ANCA / p-ANCA).",
            "Urgent induction therapy for organ- or life-threatening AAV combines high-dose intravenous glucocorticoids with either rituximab (375 mg/m2 weekly for 4 weeks or 1,000 mg on days 1 and 15) or intravenous cyclophosphamide; the ADVOCATE trial established that the oral C5a receptor antagonist avacopan can effectively replace high-dose oral prednisone tapers.",
            "The landmark PEXIVAS trial demonstrated that routine therapeutic plasma exchange (PEX) did not reduce the composite endpoint of all-cause mortality or end-stage renal disease in severe AAV, although plasma exchange remains standard of care for concurrent anti-GBM disease or severe pulmonary hemorrhage.",
            "Anti-GBM disease (Goodpasture disease) is characterized by circulating autoantibodies against the alpha-3 chain of type IV collagen, presenting with severe crescentic glomerulonephritis and pulmonary hemorrhage; urgent daily plasma exchange combined with cyclophosphamide and glucocorticoids must be initiated before oliguria develops.",
            "Immunofluorescence examination of the renal biopsy is crucial: AAV demonstrates a 'pauci-immune' pattern (scant or absent immunoglobulin/complement staining), whereas anti-GBM disease displays pathognomonic bright linear IgG staining along glomerular capillary walls."
        ],
        "mcq_angles": [
            "PEXIVAS trial finding: routine plasma exchange does not reduce death or ESKD in ANCA-associated vasculitis, reserving PEX for severe pulmonary hemorrhage or dual ANCA/anti-GBM positivity.",
            "Immunofluorescence differentiation: linear IgG along capillary walls indicates anti-GBM disease; granular capillary/mesangial deposits indicate immune-complex GN (lupus, cryoglobulinemia); pauci-immune indicates AAV.",
            "Avacopan mechanism of action: selective oral C5a receptor antagonist that allows elimination or significant reduction of toxic systemic glucocorticoid exposure in AAV induction."
        ],
        "case_hooks": [
            "A 64-year-old man presenting with malaise, purpuric skin rash, hemoptysis, dark brown urine with red cell casts, and serum creatinine 4.5 mg/dL with positive c-ANCA/PR3 titers.",
            "A 22-year-old male smoker presenting with sudden-onset hemoptysis, anuric acute kidney injury, and linear IgG deposition on emergent renal biopsy."
        ],
        "uncertainties": [
            "Optimal duration of rituximab maintenance therapy (2 years vs extended 4-5 years) in PR3-ANCA patients at high risk of late relapse.",
            "Safety and efficacy of avacopan in patients with severe renal impairment (eGFR <15 mL/min/1.73m2), who were excluded from the pivotal ADVOCATE trial."
        ]
    },

    "Renal Osteodystrophy": {
        "mentor_intro": "Renal osteodystrophy refers to the spectrum of bone morphological alterations occurring in chronic kidney disease-mineral and bone disorder (CKD-MBD). Derangements in calcium, phosphate, FGF23, parathyroid hormone (PTH), and active vitamin D lead to high-turnover bone disease (osteitis fibrosa cystica) or low-turnover states (adynamic bone disease).",
        "teaching_points": [
            "Chronic kidney disease-mineral and bone disorder (CKD-MBD) encompasses biochemical abnormalities (calcium, phosphate, PTH, FGF23, vitamin D), skeletal abnormalities (renal osteodystrophy), and vascular/soft-tissue calcification.",
            "As GFR declines below 60 mL/min/1.73m2, impaired phosphate excretion stimulates osteocytes to secrete Fibroblast Growth Factor 23 (FGF23); FGF23 promotes phosphaturia but downregulates renal 1-alpha-hydroxylase, reducing active 1,25-dihydroxyvitamin D (calcitriol), causing hypocalcemia and driving secondary hyperparathyroidism.",
            "High-turnover bone disease (osteitis fibrosa cystica) is driven by elevated PTH, characterized by accelerated osteoclastic bone resorption, osteoblastic marrow fibrosis, and classic subperiosteal bone resorption on radial phalanges; treatment involves dietary phosphate restriction, non-calcium phosphate binders, and calcimimetics (cinacalcet) or vitamin D sterols.",
            "Adynamic bone disease (ABD) is a low-turnover state characterized by markedly suppressed bone formation and resorption, thin osteoid seams, and cellular hypoplasia, classically provoked by over-suppression of PTH (intact PTH <100 pg/mL) from excessive calcium-containing binders, high-dose active vitamin D, or previous aluminum toxicity.",
            "In dialysis-dependent CKD (G5D), target intact PTH is maintained within 2 to 9 times the upper limit of normal for the specific assay (approx. 130–600 pg/mL), balancing prevention of osteitis fibrosa cystica against adynamic bone disease."
        ],
        "mcq_angles": [
            "Target intact PTH in dialysis (KDIGO guidelines): 2 to 9 times the assay upper limit of normal (~130–600 pg/mL); normal PTH values in dialysis indicate adynamic bone disease.",
            "Pathophysiological cascade in early CKD: FGF23 elevation is the earliest detectable mineral metabolism change, occurring before overt hyperphosphatemia or hypocalcemia.",
            "Radiographic sign of severe secondary hyperparathyroidism: subperiosteal bone resorption along the radial aspect of the middle phalanges and 'rugger-jersey' spine appearance."
        ],
        "case_hooks": [
            "A 54-year-old man on maintenance hemodialysis for 5 years presenting with diffuse bone pain, an intact PTH of 1,250 pg/mL, serum calcium 2.65 mmol/L, and serum phosphate 2.1 mmol/L.",
            "A 68-year-old woman on peritoneal dialysis on high-dose calcitriol and calcium carbonate whose intact PTH drops to 35 pg/mL, experiencing an atraumatic femoral neck fracture."
        ],
        "uncertainties": [
            "Diagnostic accuracy of bone-specific alkaline phosphatase and serum markers compared to gold-standard tetracycline double-labeled bone biopsy in guiding CKD-MBD therapy.",
            "Cardiovascular mortality impact of calcimimetic therapy (cinacalcet/etelcalcetide) versus surgical subtotal parathyroidectomy in severe refractory secondary hyperparathyroidism."
        ]
    },

    "Renal Replacement Therapy Modality Choice": {
        "mentor_intro": "Selecting the optimal renal replacement therapy (RRT) modality for end-stage kidney disease requires collaborative shared decision-making. Hemodialysis, peritoneal dialysis, and kidney transplantation offer distinct lifestyle, clinical, and physiological trade-offs.",
        "teaching_points": [
            "Kidney transplantation (especially preemptive living-donor transplantation) is the definitive gold-standard renal replacement therapy for eligible patients, providing vastly superior long-term survival, reduced cardiovascular morbidity, and improved quality of life compared with chronic dialysis.",
            "In-center hemodialysis (ICHD) and peritoneal dialysis (PD) demonstrate equivalent 1- to 2-year survival; PD offers greater preservation of residual kidney function, flexibility, independence, and needle-free therapy, while ICHD provides scheduled, clinician-delivered dialysis without patient self-care burden.",
            "Peritoneal dialysis is contraindicated in patients with severe peritoneal fibrosis, extensive abdominal adhesions, uncorrectable mechanical abdominal wall or diaphragmatic hernias, or inability to perform sterile exchanges (unless assisted by a caregiver).",
            "Vascular access planning for hemodialysis prioritizes native arteriovenous fistulas (AVF) over prosthetic arteriovenous grafts (AVG) and central venous catheters (CVC); AVFs have superior long-term patency and lower infection and mortality rates, though require 6 to 12 weeks of maturation before cannulation.",
            "Conservative (non-dialytic) kidney management is a structured, palliative care-aligned therapeutic option for frail, elderly patients with significant multimorbidity and severe functional impairment, in whom starting dialysis does not prolong life or improve symptom control compared with comprehensive medical management."
        ],
        "mcq_angles": [
            "Vascular access hierarchy: native arteriovenous fistula (AVF, e.g. radiocephalic or brachiocephalic) is preferred over grafts and catheters due to lowest bacteremia and thrombosis rates.",
            "Preservation of residual renal function: peritoneal dialysis preserves residual GFR and daily urine volume significantly longer than conventional intermittent hemodialysis.",
            "Conservative kidney management candidacy: elderly patients (>75-80 years) with high comorbidity (Charlson comorbidity index >=8) and severe frailty derive minimal survival benefit from dialysis."
        ],
        "case_hooks": [
            "A 32-year-old active accountant with stage 5 CKD seeking a dialysis modality that allows continued full-time employment and travel while awaiting a deceased-donor kidney transplant.",
            "An 82-year-old nursing home resident with severe vascular dementia, heart failure, and eGFR 8 mL/min evaluated for shared decision-making regarding conservative care vs dialysis."
        ],
        "uncertainties": [
            "Survival and technique durability trade-offs of incremental (once- or twice-weekly) hemodialysis in patients with substantial residual kidney function.",
            "Optimal patient selection criteria for urgent-start peritoneal dialysis versus temporary central venous catheter-based hemodialysis in acute presentation of ESKD."
        ]
    },

    "Renal Transplantation: Workup and Donor Selection": {
        "mentor_intro": "Renal transplantation candidate and donor workup requires rigorous multidisciplinary evaluation to confirm immunological compatibility, identify cardiovascular and infectious risks, and ensure donor safety. Living-donor kidney transplantation provides superior graft and patient longevity.",
        "teaching_points": [
            "Pre-transplant evaluation for potential recipients focuses on screening for cardiovascular disease (the leading cause of post-transplant mortality), occult malignancy, active systemic infection (TB, hepatitis B/C, HIV, CMV, EBV), and uncorrectable lower urinary tract abnormalities.",
            "Immunological assessment incorporates ABO blood group typing, HLA typing (HLA-A, -B, -C, -DR, -DQ, -DP), panel reactive antibody (PRA) or calculated PRA (cPRA) to determine sensitization, and donor-specific antibody (DSA) detection via Luminex single-antigen bead assays.",
            "A prospective negative T-cell and B-cell crossmatch (complement-dependent cytotoxicity [CDC] or flow cytometry crossmatch) is mandatory before deceased-donor kidney transplantation to prevent catastrophic hyperacute rejection mediated by preformed anti-HLA antibodies.",
            "Living kidney donor evaluation requires comprehensive assessment to ensure donor safety: confirming normal GFR (>90 mL/min/1.73m2), excluding hypertension, proteinuria (<150 mg/24h), diabetes mellitus, nephrolithiasis, and vascular abnormalities on CT renal angiography; long-term lifetime donor ESRD risk remains exceptionally low (<0.5-1%).",
            "Cardiovascular screening in asymptomatic high-risk recipients (diabetes, age >50, dialysis vintage >2 years) requires non-invasive functional cardiac stress testing (dobutamine stress echocardiography or myocardial perfusion scintigraphy) with coronary angiography indicated for positive tests."
        ],
        "mcq_angles": [
            "Hyperacute rejection mechanism: preformed donor-specific anti-HLA Class I or ABO antibodies causing complement activation, endothelial thrombosis, and graft necrosis within minutes; prevented by prospective crossmatching.",
            "Living donor GFR threshold: living donor candidates must have an age-adjusted measured or estimated GFR >=90 mL/min/1.73m2 and no persistent microalbuminuria or proteinuria.",
            "Leading cause of death with a functioning graft: ischemic heart disease, necessitating rigorous pre-transplant cardiovascular risk stratification."
        ],
        "case_hooks": [
            "A 48-year-old man with polycystic kidney disease whose 45-year-old wife volunteers for living kidney donation, evaluated for ABO compatibility and donor-recipient crossmatching.",
            "A 62-year-old diabetic woman on hemodialysis evaluated for kidney transplant waitlisting who has a history of asymptomatic inferior Q waves on baseline ECG."
        ],
        "uncertainties": [
            "Safety and long-term allograft survival thresholds for accepting expanded-criteria kidneys from donors with acute kidney injury or hepatitis C viremia treated with direct-acting antivirals.",
            "Optimal desensitization protocols (plasmapheresis, IVIG, and rituximab) for highly sensitized patients with positive donor-specific antibodies in living-donor paired exchange programs."
        ]
    },

    "Renal Tubular Acidosis": {
        "mentor_intro": "Renal tubular acidosis (RTA) comprises a group of transport defects in renal tubular acid-base handling, causing normal anion gap (hyperchloremic) metabolic acidosis with preserved glomerular filtration. Diagnosing Type 1 (distal), Type 2 (proximal), and Type 4 (hypoaldosteronism) guides specific targeted repletion.",
        "teaching_points": [
            "All renal tubular acidoses are characterized by a normal anion gap (hyperchloremic) metabolic acidosis (anion gap = Na - [Cl + HCO3] = 8 to 12 mEq/L) in the absence of diarrhea or renal failure.",
            "Type 1 (distal) RTA is caused by impaired alpha-intercalated cell H+-ATPase or H+/K+-ATPase excretion, resulting in an inability to acidify urine below pH 5.3 despite systemic acidemia; it is associated with hypokalemia, nephrocalcinosis, calcium phosphate nephrolithiasis, and Sjogren syndrome.",
            "Type 2 (proximal) RTA is caused by defective proximal tubular bicarbonate reabsorption (isolated or part of Fanconi syndrome with glucosuria, phosphaturia, aminoaciduria, and uricosuria); urine pH is variable (>5.5 during initial wasting, but <5.3 when serum bicarbonate drops below the lowered proximal reabsorptive threshold), accompanied by hypokalemia and osteomalacia.",
            "Type 4 (hyperkalemic) RTA is the most common form, caused by aldosterone deficiency or tubular aldosterone resistance (diabetic nephropathy, interstitial nephritis, NSAIDs, ACEi/ARBs, trimethoprim, spironolactone); impaired distal sodium reabsorption decreases the negative lumen potential, impairing potassium and H+ excretion and resulting in hyperkalemia with acidic urine (pH <5.3).",
            "The urine net charge / urine anion gap (UAG = [Na+ + K+] - Cl-) differentiates gastrointestinal from renal causes of normal anion gap acidosis: a negative UAG (indicating high unmeasured ammonium NH4+ excretion) signifies GI bicarbonate loss (diarrhea), whereas a positive UAG (impaired NH4+ excretion) signifies distal RTA."
        ],
        "mcq_angles": [
            "Urine anion gap interpretation: negative UAG indicates intact renal ammoniagenesis (diarrhea); positive UAG indicates defective distal acidification (Type 1 RTA).",
            "Potassium status across RTA subtypes: Type 1 and Type 2 RTA feature hypokalemia; Type 4 RTA is uniquely characterized by hyperkalemia.",
            "Nephrolithiasis association: Type 1 RTA causes calcium phosphate stones and nephrocalcinosis due to persistent alkaline urine and hypercalciuria; Type 2 RTA does NOT cause nephrolithiasis."
        ],
        "case_hooks": [
            "A 35-year-old woman with Sjogren syndrome presenting with severe muscle weakness, serum potassium 2.3 mmol/L, serum bicarbonate 14 mmol/L, chloride 115 mmol/L, and urine pH 6.8.",
            "A 64-year-old man with diabetic nephropathy presenting with asymptomatic persistent hyperkalemia (K 5.8 mmol/L), serum bicarbonate 18 mmol/L, and mild renal impairment."
        ],
        "uncertainties": [
            "Diagnostic accuracy of the furosemide plus fludrocortisone test versus traditional ammonium chloride loading in confirming subclinical distal RTA.",
            "Long-term therapeutic management of refractory Fanconi syndrome associated with nucleotide reverse transcriptase inhibitors (tenofovir disoproxil)."
        ]
    },

    "Renal Vein Thrombosis": {
        "mentor_intro": "Renal vein thrombosis (RVT) is a venous thromboembolic disorder characteristically associated with nephrotic syndrome (most commonly membranous nephropathy). Clinical presentation ranges from acute flank pain and hematuria to insidious, asymptomatic renal functional decline and pulmonary embolism.",
        "teaching_points": [
            "Renal vein thrombosis (RVT) has a strong association with nephrotic syndrome, occurring in up to 20–30% of adults with membranous nephropathy, driven by urinary loss of natural anticoagulants (antithrombin III, protein C and S) and hepatic hyperfibrinogenemia.",
            "Severe hypoalbuminemia (serum albumin <20–25 g/L / 2.0–2.5 g/dL) is the primary predictor of thromboembolic risk in nephrotic syndrome, serving as an indication for prophylactic anticoagulation in high-risk patients with membranous nephropathy.",
            "Acute RVT presents with acute severe flank pain, gross hematuria, a palpable tender flank mass, and acute decline in kidney function, classically seen in young patients, trauma, or renal allografts; chronic RVT is more common in nephrotic adults and is characteristically asymptomatic until detected on routine screening or post-pulmonary embolism workup.",
            "Diagnostic imaging of choice is contrast-enhanced CT angiography / CT venography of the abdomen or magnetic resonance venography (MRV); Doppler ultrasonography is operator-dependent but valuable as a non-invasive bedside initial test.",
            "Therapeutic anticoagulation (unfractionated heparin or LMWH transitioned to direct oral anticoagulants DOACs or warfarin) is the primary treatment, continued for at least 3 to 6 months or for the duration of severe nephrotic-range proteinuria and hypoalbuminemia."
        ],
        "mcq_angles": [
            "Glomerulopathy most commonly linked with RVT: membranous nephropathy carries the highest risk among all nephrotic syndromes.",
            "Serum albumin threshold for prophylactic anticoagulation: albumin <20-25 g/L in membranous nephropathy warrants primary thromboprophylaxis.",
            "Triad of acute RVT: flank pain, gross hematuria, and an acutely enlarged, congested kidney on imaging."
        ],
        "case_hooks": [
            "A 42-year-old man with biopsy-proven membranous nephropathy and serum albumin 18 g/L who presents with acute left-sided loin pain, microscopic hematuria, and worsening proteinuria.",
            "A 5-day-old dehydrated neonate presenting with gross hematuria, thrombocytopenia, and an enlarged palpable right flank mass."
        ],
        "uncertainties": [
            "Comparative efficacy and safety of direct oral anticoagulants (apixaban, rivaroxaban) versus vitamin K antagonists in severe nephrotic syndrome with extreme hypoalbuminemia.",
            "Indications and clinical benefit of catheter-directed pharmacomechanical thrombectomy in acute bilateral renal vein thrombosis with acute kidney injury."
        ]
    },

    "Renal replacement therapy timing in acute kidney injury": {
        "mentor_intro": "Determining the optimal timing for initiating renal replacement therapy (RRT) in acute kidney injury (AKI) balances preventing life-threatening uremic complications against avoiding unnecessary invasive procedures in patients who might recover spontaneously. Landmark randomized trials have firmly established that conservative, demand-driven strategies are safe.",
        "teaching_points": [
            "Multiple landmark multicenter randomized clinical trials (AKIKI, IDEAL-ICU, STARRT-AKI, and AKIKI-2) consistently demonstrate that an accelerated or early RRT strategy in critically ill patients with AKI does not reduce 60- or 90-day mortality compared with a standard, delayed/demand-driven strategy.",
            "Delayed, demand-driven RRT initiation avoids invasive dialysis catheterization and extracorporeal circulation in approximately 40–50% of AKI patients who recover intrinsic renal function with medical management alone.",
            "Absolute, conventional emergency indications for immediate RRT initiation ('AEIOU') include: Refractory severe hyperkalemia (K >6.5 mmol/L or with ECG changes), Refractory severe metabolic acidosis (pH <7.15-7.20), Refractory fluid overload / pulmonary edema unresponsive to high-dose loop diuretics, and Overt uremic complications (uremic pericarditis, uremic encephalopathy, uremic bleeding).",
            "In the absence of emergency indications, waiting until persistent Stage 3 AKI or progressive physiological deterioration occurs is safe; however, waiting until severe uremia (BUN >112-140 mg/dL / urea >40-50 mmol/L) develops (as observed in AKIKI-2) carries increased complications and should be avoided.",
            "Continuous renal replacement therapy (CRRT) and intermittent hemodialysis (IHD) demonstrate equivalent patient survival; CRRT is guideline-preferred in hemodynamically unstable critically ill patients and patients with acute brain injury / elevated intracranial pressure."
        ],
        "mcq_angles": [
            "Trial evidence on RRT timing: the STARRT-AKI and AKIKI trials confirmed that accelerated/early RRT initiation does NOT improve survival and increases dialysis dependence and adverse events.",
            "Absolute indications for emergent RRT: refractory hyperkalemia, refractory pulmonary edema, severe refractory metabolic acidosis (pH <7.15), and uremic pericarditis/encephalopathy.",
            "Hemodynamic stability and modality choice: CRRT is indicated in septic shock and acute liver failure / cerebral edema to minimize rapid fluid shifts and maintain cerebral perfusion pressure."
        ],
        "case_hooks": [
            "A 62-year-old critically ill man with septic shock on mechanical ventilation who is oliguric for 24 hours with creatinine 3.8 mg/dL, K 4.8 mmol/L, bicarbonate 18 mmol/L, and no pulmonary edema.",
            "A 55-year-old woman with acute tubular necrosis who develops a distinct pericardial friction rub and confusion on day 4 of admission with blood urea nitrogen 120 mg/dL."
        ],
        "uncertainties": [
            "Utility of the Furosemide Stress Test (FST—urine output <200 mL within 2 hours of a 1.0–1.5 mg/kg furosemide bolus) in identifying patients destined to require RRT.",
            "Impact of delayed RRT on long-term development of chronic kidney disease and persistent renal functional recovery at 1 year."
        ]
    },

    "Resistant hypertension renal denervation": {
        "mentor_intro": "Catheter-based renal sympathetic denervation (RDN) has emerged as an evidence-based device therapy for uncontrolled and resistant hypertension. Disrupting renal efferent and afferent sympathetic nerves reduces central sympathetic tone and lowers blood pressure across sham-controlled trials.",
        "teaching_points": [
            "True resistant hypertension is defined as blood pressure that remains uncontrolled (>=140/90 mmHg clinic or >=130/80 mmHg 24-hr ambulatory) despite concurrent use of three antihypertensive drug classes at maximally tolerated doses, one of which must be a diuretic.",
            "Pseudo-resistance—including poor medication adherence, white-coat hypertension, improper cuff sizing, and heavy sodium or alcohol intake—must be rigorously excluded using 24-hour ambulatory blood pressure monitoring (ABPM) and adherence testing before considering device interventions.",
            "Second-generation sham-controlled randomized trials (SPYRAL HTN-OFF MED, SPYRAL HTN-ON MED, and RADIANCE-HTN) utilizing radiofrequency ablation of main and branch renal arteries or endovascular ultrasound demonstrated statistically significant, sustained 24-hour ambulatory blood pressure reductions of 5 to 10 mmHg compared with sham procedures.",
            "Catheter-based RDN lowers blood pressure by ablating both post-ganglionic sympathetic efferent fibers (reducing renin release, renal vascular resistance, and sodium reabsorption) and sensory afferent fibers (reducing central hypothalamic and vasomotor sympathetic outflow).",
            "Pre-procedural imaging (CT or MR angiography) is mandatory to verify suitable renal artery anatomy, excluding hemodynamically significant renal artery stenosis, severe tortuosity, prior stenting, or main renal artery diameter <3 mm."
        ],
        "mcq_angles": [
            "Requirement before RDN consideration: confirmation of true resistance with 24-hour ambulatory blood pressure monitoring (ABPM) and exclusion of non-adherence and secondary causes.",
            "Anatomical ablation target in modern RDN: circumferential ablation in both main renal artery and distal branches/accessory vessels maximizes denervation efficacy.",
            "Clinical magnitude of blood pressure reduction: modern sham-controlled trials show an average 24-hour ambulatory SBP reduction of approx. 5–9 mmHg, translating into ~15-20% cardiovascular risk reduction."
        ],
        "case_hooks": [
            "A 54-year-old man with documented adherence to amlodipine 10 mg, valsartan 320 mg, and chlorthalidone 25 mg whose 24-hour ABPM shows persistent mean BP of 152/94 mmHg.",
            "A 48-year-old woman with severe treatment-resistant hypertension undergoing renal CT angiography to evaluate renal artery caliber and branch anatomy prior to planned radiofrequency RDN."
        ],
        "uncertainties": [
            "Biomarkers predicting individualized blood pressure response magnitude following catheter-based renal denervation.",
            "Long-term structural durability of denervation and whether renal nerve reinnervation occurs after 5 to 10 years."
        ]
    },

    "Resistant hypertension: aldosterone antagonism, renal denervation, workup": {
        "mentor_intro": "Evaluating resistant hypertension demands a systematic approach to unmask pseudo-resistance, screen for secondary etiologies (primarily primary aldosteronism and obstructive sleep apnea), and optimize pharmacotherapy. Spironolactone represents the proven fourth-line pharmacological agent of choice.",
        "teaching_points": [
            "True resistant hypertension requires confirmation with 24-hour ambulatory blood pressure monitoring (ABPM) to rule out white-coat effect, alongside assessment of medication adherence; primary aldosteronism is the most common identifiable secondary etiology, present in 15–22% of resistant hypertension patients.",
            "Initial secondary workup includes plasma aldosterone-to-renin ratio (ARR) for primary aldosteronism, serum creatinine and urinalysis for renal parenchymal disease, renal duplex Doppler for renovascular disease, and screening for obstructive sleep apnea.",
            "In the landmark PATHWAY-2 randomized crossover trial, the mineralocorticoid receptor antagonist (MRA) spironolactone (25–50 mg daily) was substantially superior to bisoprolol, doxazosin, and placebo as fourth-line add-on therapy for resistant hypertension.",
            "Serum potassium and renal function must be monitored closely during spironolactone initiation; spironolactone is generally avoided or used with extreme caution if baseline potassium exceeds 4.5 mmol/L or eGFR is <45 mL/min/1.73m2 due to hyperkalemia risk.",
            "Novel aldosterone synthase inhibitors (ASIs, such as baxdrostat and lorundrostat) selectively block CYP11B2 without inhibiting cortisol synthesis (CYP11B1), showing substantial blood pressure reductions in resistant hypertension with lower sexual side-effect rates than spironolactone."
        ],
        "mcq_angles": [
            "PATHWAY-2 trial gold standard 4th-line drug: spironolactone (25-50 mg daily) provides greatest systolic blood pressure reduction in resistant hypertension.",
            "Primary aldosteronism screening rule: measure plasma aldosterone and renin ratio (ARR); hypokalemia is absent in over 50% of confirmed primary aldosteronism cases.",
            "Ambulatory BP monitoring criteria for resistant hypertension: 24-hour mean BP >=130/80 mmHg or daytime mean >=135/85 mmHg despite three concurrent classes."
        ],
        "case_hooks": [
            "A 52-year-old man taking perindopril 10 mg, indapamide 2.5 mg, and amlodipine 10 mg with clinic BP 162/98 mmHg whose ARR is markedly elevated with suppressed renin.",
            "A 60-year-old woman with true resistant hypertension whose serum potassium is 4.1 mmol/L and eGFR is 62 mL/min, initiated on spironolactone 25 mg daily."
        ],
        "uncertainties": [
            "Head-to-head clinical efficacy and safety of selective aldosterone synthase inhibitors (baxdrostat) versus spironolactone in CKD stage 3b patients.",
            "Optimal timing of catheter-based renal denervation relative to fourth- and fifth-line pharmacological escalation."
        ]
    },

    "Restless legs syndrome treatment": {
        "mentor_intro": "Restless legs syndrome (RLS / Willis-Ekbom disease) is a sensorimotor neurological disorder characterized by an irresistible urge to move the legs, typically accompanied by uncomfortable dysesthesias that worsen at rest and during evenings. Modern management has shifted away from dopamine agonists toward alpha-2-delta ligands and iron optimization to avoid drug-induced augmentation.",
        "teaching_points": [
            "Diagnostic criteria for RLS require four essential clinical features: an urge to move the legs accompanied by unpleasant sensations, symptoms beginning or worsening during rest/inactivity, partial or temporary relief with movement, and worsening exclusively in the evening or night.",
            "Initial diagnostic workup mandates checking morning fasting serum ferritin and transferrin saturation (TSAT); central nervous system iron deficiency in the substantia nigra impairs dopaminergic signaling, and oral iron supplementation (ferrous sulfate with vitamin C) is indicated when ferritin is <=75 ug/L, with intravenous iron (ferric carboxymaltose) indicated if ferritin is <=100 ug/L or oral iron is not tolerated.",
            "Alpha-2-delta ligands (pregabalin 75–300 mg daily or gabapentin 300–1200 mg taken 1–2 hours before bedtime) are now guideline-recommended first-line pharmacotherapy over dopamine agonists, achieving high efficacy without the debilitating risk of clinical augmentation.",
            "Dopamine receptor agonists (pramipexole, ropinirole, rotigotine patch) provide rapid symptomatic relief but carry an alarming 40–70% long-term risk of 'augmentation'—a paradoxical worsening of RLS characterized by earlier symptom onset in the day, faster onset at rest, and spread to upper limbs.",
            "Management of dopamine agonist augmentation requires checking iron stores, gradually tapering the dopamine agonist under close specialist supervision, and transitioning to an alpha-2-delta ligand or low-dose prolonged-release opioids (oxycodone-naloxone) in refractory severe disease."
        ],
        "mcq_angles": [
            "First-line drug class of choice in contemporary RLS: alpha-2-delta ligands (pregabalin, gabapentin), replacing dopamine agonists due to augmentation risk.",
            "Serum ferritin threshold for iron replacement in RLS: initiate iron repletion when ferritin is <=75 ug/L (higher than routine hematological thresholds).",
            "Definition of RLS augmentation: earlier daily onset of symptoms, increased intensity, shorter latency during rest, and anatomical spread to trunk/arms caused by dopaminergic drugs."
        ],
        "case_hooks": [
            "A 44-year-old woman on pramipexole 0.5 mg daily for 3 years who notes that her severe leg restlessness now begins at 1:00 PM and has spread to involve her forearms.",
            "A 32-year-old pregnant woman in her third trimester presenting with severe sleep-disrupting restless legs whose serum ferritin is 22 ug/L."
        ],
        "uncertainties": [
            "Comparative central nervous system repletion kinetics of high-dose intravenous iron formulations in refractory non-anemic RLS.",
            "Safety and efficacy of non-invasive high-frequency spinal cord and peroneal nerve neurostimulation devices."
        ]
    },

    "Retinal detachment: presentation and emergency management": {
        "mentor_intro": "Rhegmatogenous retinal detachment (RRD) is an ophthalmic emergency where neurosensory retina separates from the underlying retinal pigment epithelium due to a full-thickness retinal tear. Prompt diagnosis and emergency vitreo-retinal surgical intervention are essential to preserve visual acuity.",
        "teaching_points": [
            "Rhegmatogenous retinal detachment (RRD) is the most common form, developing when acute posterior vitreous detachment (PVD) produces vitreoretinal traction, causing a full-thickness retinal break that allows liquefied vitreous humor to enter the subretinal space.",
            "Classic clinical presentation features sudden-onset photopsia (flashes of light caused by mechanical vitreoretinal traction), a sudden shower of floaters (often dark specks or 'cobwebs' representing microvascular hemorrhage), followed by a progressive, dark, non-painful visual field curtain or shadow advancing from the periphery.",
            "Immediate funduscopic assessment must determine macular status: 'macula-on' retinal detachment (fovea remains attached with preserved central visual acuity) represents an absolute ocular emergency requiring surgical reattachment within 24 to 72 hours to prevent irreversible visual loss; 'macula-off' detachment carries worse visual prognosis and can be scheduled semi-electively within 7 to 10 days.",
            "Primary surgical interventions include pars plana vitrectomy (PPV, excision of vitreous with internal gas or silicone oil tamponade and endolaser), pneumatic retinopexy (intravitreal gas bubble injection with outpatient positioning for superior single breaks), and scleral buckling (external silicon band indentation to relieve traction in young, phakic eyes).",
            "Urgent management while awaiting emergency surgical transfer includes keeping the patient strictly fasting, maintaining positioning that keeps the retinal tear dependent to prevent gravitational progression toward the macula, and avoiding eye rubbing."
        ],
        "mcq_angles": [
            "Surgical urgency determination: 'macula-on' retinal detachment requires emergency repair within 24–72 hours to preserve central vision; 'macula-off' has lower surgical urgency.",
            "Premonitory symptoms of retinal tear/detachment: photopsia (flashes) and a sudden shower of floaters, followed by a curtain-like peripheral visual field defect.",
            "Surgical modality in young phakic patients: scleral buckling preserves the natural crystalline lens and avoids vitrectomy-induced nuclear sclerotic cataract progression."
        ],
        "case_hooks": [
            "A 58-year-old highly myopic man presenting with 2 days of temporal flashes of light and a dark shadow progressing across his inferior visual field, with visual acuity intact at 20/20.",
            "A 68-year-old pseudophakic woman presenting with sudden loss of central reading vision in the right eye following a week of dense floaters."
        ],
        "uncertainties": [
            "Efficacy of prophylactic laser retinopexy to asymptomatic peripheral lattice degeneration in fellow eyes of patients with giant retinal tears.",
            "Long-term visual outcomes of pneumatic retinopexy versus primary pars plana vitrectomy for uncomplicated superior rhegmatogenous detachments (PIVOT trial data)."
        ]
    }
}

if __name__ == "__main__":
    print(f"Loaded {len(BATCH_01_TOPICS)} topics in Batch 1.")
    for name, data in BATCH_01_TOPICS.items():
        assert len(data["teaching_points"]) >= 4, f"{name}: fewer than 4 TPs"
        assert len(data["mcq_angles"]) >= 3, f"{name}: fewer than 3 MCQs"
        assert len(data["case_hooks"]) >= 2, f"{name}: fewer than 2 Cases"
        assert len(data["uncertainties"]) >= 2, f"{name}: fewer than 2 Uncertainties"
        assert len(data["mentor_intro"]) > 100, f"{name}: intro too short"
    print("All 25 topics pass 100% of structural and depth criteria!")
