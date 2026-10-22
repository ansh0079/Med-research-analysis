# -*- coding: utf-8 -*-
"""
Builder script for Batch 3 (Topics 51-75) of the 280 Write-From-Scratch cohort.
Replaces generic placeholder text with textbook-grade clinical evidence,
diagnostic pearls, landmark trials, and high-yield MCQ angles.
"""

BATCH_03_TOPICS = {
    "Sepsis and septic shock: Sepsis-3 definitions, qSOFA, SOFA score, 1-hour bundle": {
        "mentor_intro": "The Sepsis-3 consensus redefines sepsis as life-threatening organ dysfunction caused by a dysregulated host response to infection. Identifying organ dysfunction via the Sequential Organ Failure Assessment (SOFA) score and rapid delivery of the Surviving Sepsis Campaign 1-hour resuscitation bundle are fundamental to improving survival.",
        "teaching_points": [
            "Under Sepsis-3, sepsis is defined as an acute increase in the total Sequential Organ Failure Assessment (SOFA) score of >=2 points reflecting acute infection-induced multi-organ dysfunction (respiratory PaO2/FiO2, coagulation platelets, liver bilirubin, cardiovascular MAP/vasopressors, CNS Glasgow Coma Scale, and renal creatinine/urine output).",
            "Quick SOFA (qSOFA—incorporating respiratory rate >=22 breaths/min, altered mentation with GCS <15, and systolic blood pressure <=100 mmHg; 1 point each) is a bedside screening tool to identify patients outside the ICU at high risk of deterioration, but is NOT a diagnostic tool for sepsis.",
            "Septic shock represents a subset of sepsis characterized by cellular and metabolic abnormalities, defined clinically by persistent hypotension requiring vasopressors to maintain MAP >=65 mmHg AND serum lactate >2.0 mmol/L despite adequate fluid resuscitation, carrying mortality >40%.",
            "The Surviving Sepsis Campaign (SSC) 1-hour resuscitation bundle mandates five core actions initiated immediately: measure lactate, obtain blood cultures before antibiotics, administer empiric broad-spectrum IV antimicrobials, administer 30 mL/kg of IV balanced crystalloid for hypotension or lactate >=4 mmol/L, and start vasopressors if MAP remains <65 mmHg.",
            "Lactate clearance (targeting a >=10–20% decrease every 2 hours during the first 6–8 hours of resuscitation) serves as an objective surrogate marker of successful cellular reperfusion and resuscitation efficacy."
        ],
        "mcq_angles": [
            "qSOFA components and utility: RR >=22, altered mentation, SBP <=100; validated as a prognostic risk-stratification tool, not a diagnostic criterion for sepsis.",
            "Septic shock diagnostic criteria: concurrent requirement for vasopressor therapy to achieve MAP >=65 mmHg AND elevated serum lactate >2.0 mmol/L despite fluid repletion.",
            "Resuscitation fluid volume: standard recommended crystalloid bolus is 30 mL/kg administered within the first 3 hours of presentation."
        ],
        "case_hooks": [
            "A 72-year-old nursing home resident presenting with fever, respiratory rate 26, BP 88/50 mmHg, and acute confusion, evaluated using qSOFA and full SOFA scoring.",
            "A 58-year-old man with community-acquired pneumonia who has persistent MAP 55 mmHg and lactate 3.4 mmol/L after receiving 2.5 L of intravenous Plasmalyte."
        ],
        "uncertainties": [
            "Diagnostic superiority of early procalcitonin-guided antibiotic de-escalation protocols versus standardized clinical reassessment.",
            "Personalized fluid resuscitation endpoints utilizing passive leg raise stroke volume variation versus fixed 30 mL/kg volume administration."
        ]
    },

    "Septic Arthritis": {
        "mentor_intro": "Acute native joint septic arthritis is an orthopedic emergency caused by bacterial colonization of the synovial space, predominantly via hematogenous seeding. Prompt diagnostic arthrocentesis and urgent joint decompression are imperative to prevent irreversible chondral degradation and joint destruction.",
        "teaching_points": [
            "Acute monoarthritis with joint warmth, swelling, erythema, and severe restriction of both active and passive range of motion must be considered septic arthritis until proven otherwise; the knee is the most commonly affected joint (>50% of cases), followed by the hip, shoulder, and ankle.",
            "Staphylococcus aureus (including Methicillin-resistant S. aureus [MRSA]) is the single most common causative organism overall; Streptococcus pneumoniae and Group A Streptococcus are common in older adults, while Neisseria gonorrhoeae classically affects young, sexually active adults (disseminated gonococcal infection with tenosynovitis and vesiculopustular skin lesions).",
            "Emergency synovial fluid aspiration (arthrocentesis) is mandatory prior to antibiotic administration: synovial fluid analysis typically reveals cloudy or purulent fluid, white blood cell count >50,000/uL with >90% polymorphonuclear neutrophils (PMNs), very low synovial glucose (<50% of blood glucose), and markedly elevated lactate.",
            "Urgent joint decompression via arthroscopic lavage or open arthrotomy is the definitive standard of care for native joints to clear bacterial toxins, inflammatory cytokines, and purulence; needle aspiration alone is acceptable only for easily accessible joints (e.g., knee) in patients responding rapidly to medical therapy.",
            "Empirical intravenous antimicrobial therapy must cover Staphylococcus and Streptococcus (vancomycin 15-20 mg/kg IV q8-12h or flucloxacillin/cefazolin for MSSA, plus a third-generation cephalosporin like ceftriaxone if gram-negative rods or gonococcal infection is suspected), tailored to culture results and continued for 3 to 4 weeks."
        ],
        "mcq_angles": [
            "Synovial fluid analysis threshold: WBC count >50,000/uL with >90% neutrophils strongly supports septic arthritis; however, crystal arthropathies (gout/pseudogout) can also exceed this threshold.",
            "Disseminated gonococcal infection triad: migratory polyarthralgias, tenosynovitis, and painless pustular/vesicular skin lesions, often with sterile synovial cultures.",
            "Mandatory surgical principle: complete joint decompression via arthroscopic washout or open arthrotomy must not be delayed to prevent chondral enzymatic necrosis."
        ],
        "case_hooks": [
            "A 64-year-old diabetic man presenting with acute right knee pain, inability to bear weight, temperature 38.8 C, and an effusion yielding synovial WBC of 85,000/uL with 95% neutrophils.",
            "A 24-year-old woman presenting with wrist tenosynovitis, fever, scattered painless pustules on her extremities, and acute monoarthritis of the left ankle."
        ],
        "uncertainties": [
            "Duration of intravenous versus early oral step-down antibiotic therapy in uncomplicated native joint septic arthritis following complete arthroscopic washout.",
            "Diagnostic accuracy and threshold of synovial fluid alpha-defensin and leukocyte esterase testing in distinguishing culture-negative septic arthritis from severe crystalline arthritis."
        ]
    },

    "Septic arthritis: Staphylococcus, Gonococcal, joint washout, antibiotic selection": {
        "mentor_intro": "Management of septic arthritis hinges on differentiating non-gonococcal (predominantly Staphylococcal) arthritis from disseminated gonococcal infection (DGI). Each entity features distinct microbiological profiles, surgical requirements, and antimicrobial regimens.",
        "teaching_points": [
            "Staphylococcus aureus septic arthritis characteristically presents as an acute, destructive monoarthritis in patients with underlying joint disease (rheumatoid arthritis, osteoarthritis), diabetes, or prosthetic hardware; synovial fluid cultures are positive in >90% of cases, and cartilage destruction occurs within 48 to 72 hours due to bacterial chondrocytes.",
            "Disseminated gonococcal infection (DGI) typically manifests in young adults as either: (1) the arthritis-dermatitis syndrome (migratory tenosynovitis, dermatitis, polyarthralgias with negative synovial cultures) or (2) true purulent gonococcal monoarthritis without skin lesions (synovial culture positive in <50%); NAAT testing of urogenital, pharyngeal, and rectal sites is essential for diagnosis.",
            "Joint decompression: purulent Staphylococcal septic arthritis mandates urgent operative joint washout (arthroscopic debridement or arthrotomy) to evacuate purulence and proteolytic enzymes; in contrast, gonococcal arthritis rarely requires open surgery and typically resolves with serial closed needle aspirations and targeted IV ceftriaxone.",
            "Antimicrobial selection for suspected Staphylococcal infection requires empiric vancomycin (or daptomycin) until susceptibilities confirm MSSA, whereupon de-escalation to high-dose antistaphylococcal beta-lactams (flucloxacillin 2 g IV q6h or cefazolin 2 g IV q8h) provides superior bactericidal clearance.",
            "First-line treatment for gonococcal arthritis is intravenous ceftriaxone (1 to 2 g daily) continued for 7 to 14 days, with empiric doxycycline (100 mg orally BID for 7 days) co-administered to treat potential concurrent Chlamydia trachomatis infection."
        ],
        "mcq_angles": [
            "Beta-lactam superiority in MSSA: once methicillin susceptibility is confirmed, switching from vancomycin to flucloxacillin or cefazolin significantly accelerates bacterial clearance and reduces treatment failure.",
            "Diagnostic yield in gonococcal arthritis: synovial fluid Gram stain and culture are frequently negative (<30-50%); mucosal NAAT (urogenital, pharyngeal, rectal) provides the highest diagnostic yield.",
            "Joint washout necessity: non-gonococcal septic arthritis demands formal surgical/arthroscopic washout; gonococcal arthritis generally responds to needle drainage and antibiotics."
        ],
        "case_hooks": [
            "A 55-year-old woman with rheumatoid arthritis on methotrexate presenting with an acutely swollen, hot prosthetic right knee yielding MSSA on Gram stain.",
            "A 22-year-old sexually active man presenting with fever, multiple small necrotic papules on his palms, right wrist tenosynovitis, and left knee effusion."
        ],
        "uncertainties": [
            "Optimal oral step-down beta-lactam agent and dosing (e.g., high-dose cephalexin vs cloxacillin) in convalescent MSSA septic arthritis.",
            "Emergence of multidrug-resistant and cephalosporin-intermediate Neisseria gonorrhoeae strains complicating DGI management."
        ]
    },

    "Septic arthritis: diagnosis, Gram stain, joint aspiration, empirical antibiotics, surgical drainage": {
        "mentor_intro": "A systematic, protocolized approach to acute monoarthritis ensures prompt diagnosis of septic arthritis before irreversible cartilage damage occurs. Timely synovial fluid analysis, early empiric broad-spectrum antibiotic coverage, and surgical source control form the foundation of management.",
        "teaching_points": [
            "Arthrocentesis must be performed urgently before initiating antimicrobial therapy unless systemic septic shock mandates immediate antibiotic administration; synovial fluid must be sent for cell count with differential, Gram stain, polarized microscopy for crystals, bacterial culture, and antimicrobial sensitivities.",
            "Synovial fluid Gram stain provides immediate diagnostic utility but has only moderate sensitivity (approx. 50–60% for Staphylococcal infection, <25% for gonococcal infection, and 40% for gram-negative bacilli); a negative Gram stain NEVER excludes septic arthritis.",
            "Presence of calcium pyrophosphate (CPPD) or monosodium urate (MSU) crystals on polarizing light microscopy does NOT rule out concurrent septic arthritis, as crystal-induced flares and bacterial infection coexist in up to 5% of cases.",
            "Empirical antimicrobial selection is guided by age, host risk factors, and Gram stain: vancomycin covers MRSA; add ceftriaxone (or cefepime/piperacillin-tazobactam in elderly, immunocompromised, or IV drug users) to cover gram-negative bacilli and Pseudomonas.",
            "Surgical drainage options include repeated closed needle aspiration (only for uncomplicated knee infections with thin synovial fluid that clears easily), arthroscopic irrigation and debridement (preferred for knees and shoulders), and open arthrotomy (mandatory for hips, small joints, loculated effusions, or failed arthroscopic clearance)."
        ],
        "mcq_angles": [
            "Coexistence of crystals and infection: identification of gout or pseudogout crystals does not rule out septic arthritis; synovial culture remains mandatory.",
            "Limitations of Gram stain: false-negative rate is 40–50%; empiric antibiotics should never be withheld solely because of a negative Gram stain if clinical suspicion is high.",
            "Hip septic arthritis drainage rule: septic arthritis of the native hip represents an absolute indication for emergency surgical arthrotomy/arthroscopy due to high intracapsular pressure risking femoral head avascular necrosis."
        ],
        "case_hooks": [
            "A 70-year-old man with known gout presenting with acute monoarthritis of the right knee whose synovial fluid shows intracellular needle-shaped negatively birefringent crystals and a WBC count of 95,000/uL.",
            "A 4-year-old child who refuses to bear weight on the left leg, holding the left hip flexed, abducted, and externally rotated, with fever and elevated ESR/CRP (Kocher criteria)."
        ],
        "uncertainties": [
            "Clinical utility of point-of-care synovial fluid calprotectin or lactate strips in ruling out septic arthritis in emergency department settings.",
            "Comparative re-operation rates between initial arthroscopic debridement versus primary open arthrotomy in native shoulder septic arthritis."
        ]
    },

    "Septic shock: vasopressor selection and targets": {
        "mentor_intro": "Vasopressor therapy in septic shock aims to restore organ perfusion pressure without inducing excessive vasoconstriction or myocardial ischemia. Guidelines establish noradrenaline as the foundational first-line agent, with stepwise introduction of vasopressin, inotropes, or corticosteroids for refractory hypotension.",
        "teaching_points": [
            "Noradrenaline (norepinephrine) is the evidence-based first-line vasopressor of choice (Class I, Level A recommendation), acting via potent alpha-1 adrenergic vasoconstriction with modest beta-1 inotropic and chronotropic support to rapidly elevate mean arterial pressure (MAP).",
            "Target mean arterial pressure (MAP) is initially 65 mmHg; targeting higher MAP levels (75–85 mmHg, tested in the SEPSISPAM trial) does not reduce mortality or organ failure overall and increases cardiac arrhythmias, although patients with chronic hypertension may show reduced need for renal replacement therapy at higher MAP targets.",
            "Vasopressin (arginine vasopressin) is the recommended second-line agent, initiated as a fixed-dose infusion of 0.03 units/min (without titration) when noradrenaline dosage reaches 0.25 to 0.5 ug/kg/min; vasopressin restores tone in states of relative vasopressin deficiency and exhibits a substantial 'noradrenaline-sparing' effect (VASST trial).",
            "Dopamine is associated with significantly higher rates of tachyarrhythmias and increased mortality compared with noradrenaline (SOAP II trial) and is now restricted to highly selected patients with bradycardia and very low risk of tachyarrhythmias.",
            "In patients with persistent hypoperfusion and myocardial dysfunction (elevated filling pressures and low cardiac output) despite adequate volume and MAP, dobutamine (titrated 2.5–20 ug/kg/min) or switching to adrenaline (epinephrine) is recommended to improve cardiac inotropy."
        ],
        "mcq_angles": [
            "First-line vasopressor: noradrenaline is superior to dopamine in septic shock due to lower mortality and dramatically lower incidence of tachyarrhythmias (SOAP II trial).",
            "Target MAP threshold: 65 mmHg is the standard target; higher MAP goals increase atrial fibrillation without improving overall survival.",
            "Vasopressin dosing rule: fixed continuous infusion at 0.03 units/min (not titrated) added to noradrenaline; higher doses cause coronary and mesenteric vasoconstriction."
        ],
        "case_hooks": [
            "A 65-year-old woman with uroseptic shock whose MAP remains 52 mmHg after 30 mL/kg crystalloid, requiring immediate initiation of central venous noradrenaline.",
            "A 70-year-old man in septic shock on noradrenaline 0.4 ug/kg/min with persistent tachycardia (HR 135 bpm) whose blood pressure improves following addition of vasopressin 0.03 units/min."
        ],
        "uncertainties": [
            "Role of synthetic human angiotensin II (ATHOS-3 trial) as a rescue vasopressor in refractory high-output distributive shock with acute renal failure.",
            "Optimal blood pressure targets in elderly frail patients with cerebral small vessel disease versus standard 65 mmHg MAP targets."
        ]
    },

    "Seronegative Rheumatoid Arthritis": {
        "mentor_intro": "Seronegative rheumatoid arthritis (SNRA) is defined by the absence of both rheumatoid factor (RF) and anti-citrullinated protein antibodies (anti-CCP / ACPA) in a patient with inflammatory symmetric polyarthritis. It constitutes a heterogeneous clinical subset requiring rigorous differential diagnosis to exclude spondyloarthropathies and crystalline diseases.",
        "teaching_points": [
            "Seronegative RA represents approximately 20–30% of all rheumatoid arthritis cases, defined by the strict absence of serum IgM-RF and IgG-anti-CCP; although previously considered milder, patients with seronegative RA experience significant disease activity, functional disability, and radiographic joint damage.",
            "The 2010 ACR/EULAR classification criteria assign 0 points for negative serology, requiring higher cumulative scores in joint involvement (4–5 points for >10 joints involved), acute-phase reactants (1 point for elevated CRP/ESR), and symptom duration >=6 weeks (1 point) to establish classification.",
            "Differential diagnosis of seronegative polyarthritis is extensive and includes: psoriatic arthritis (look for hidden scalp/umbilical psoriasis, nail pitting, onycholysis, dactylitis), peripheral spondyloarthritis, polymyalgia rheumatica, calcium pyrophosphate deposition disease (CPPD / pseudogout), and viral polyarthritides (parvovirus B19, hepatitis C).",
            "Synovial histology in seronegative RA exhibits distinct immunopathological phenotypes, frequently displaying a 'fibroblast-rich' or 'pauci-immune' synovial pathotype with lower B-cell and plasma cell infiltration compared to seropositive disease.",
            "First-line therapeutic management remains identical to seropositive RA, commencing immediately with methotrexate plus short-term glucocorticoid bridging; however, when escalating to biologics, seronegative RA demonstrates significantly lower response rates to B-cell depletion (rituximab), making TNF inhibitors, IL-6 inhibitors, or abatacept preferred second-line agents."
        ],
        "mcq_angles": [
            "Biologic efficacy discrepancy in seronegative RA: rituximab (anti-CD20) is significantly less effective in seronegative RA than in seropositive disease; TNF or IL-6 inhibitors are preferred.",
            "Differential diagnosis clues: nail pitting, onycholysis, and dactylitis ('sausage digit') point to psoriatic arthritis rather than seronegative RA.",
            "Erosive potential: seronegative RA can cause progressive erosive joint damage and disability, warranting aggressive conventional synthetic DMARD therapy."
        ],
        "case_hooks": [
            "A 50-year-old woman presenting with 4 months of symmetric swelling and morning stiffness in bilateral wrists, MCPs, and PIPs with negative RF and anti-CCP, but CRP 45 mg/L.",
            "A 60-year-old man diagnosed with seronegative RA who fails methotrexate and is evaluated for biologic selection, avoiding rituximab."
        ],
        "uncertainties": [
            "Utility of novel autoantibody testing (anti-CarP, anti-PAD4, 14-3-3eta) in reclassifying true seronegative RA into seropositive subsets.",
            "Long-term comparative radiographic progression rates between seronegative RA and seronegative peripheral spondyloarthritis."
        ]
    },

    "Severe acute pancreatitis ICU management": {
        "mentor_intro": "Severe acute pancreatitis (SAP) is characterized by persistent organ failure (>48 hours) involving the cardiovascular, respiratory, or renal systems. ICU management prioritizes goal-directed fluid resuscitation, early enteral nutrition, and a minimally invasive 'step-up' approach for infected necrotizing pancreatitis.",
        "teaching_points": [
            "The Revised Atlanta Classification defines severe acute pancreatitis (SAP) by the presence of persistent multi-organ failure (>48 hours) defined by the modified Marshall scoring system (respiratory PaO2/FiO2 <=300, renal creatinine >=1.9 mg/dL, cardiovascular SBP <90 mmHg unresponsive to fluids); mortality in SAP exceeds 20–30%.",
            "Goal-directed intravenous fluid resuscitation with Ringer's lactate (approx. 5–10 mL/kg/h initially, or 200–250 mL/h) is recommended during the first 24 hours; the WATERFALL randomized trial demonstrated that aggressive fluid overload (>20 mL/kg bolus followed by 3 mL/kg/h) significantly increases fluid overload and heart failure without improving clinical outcomes.",
            "Early enteral nutrition (commenced within 24 to 72 hours via nasogastric or nasojejunal tube) is strongly superior to total parenteral nutrition (TPN), significantly reducing infectious complications, multiorgan failure, and mortality by preserving gut mucosal barrier integrity and preventing bacterial translocation.",
            "Routine prophylactic intravenous antibiotics in acute pancreatitis (even in severe sterile necrosis) are NOT recommended by international guidelines (IAP/APA, AGA), as they do not reduce mortality or infected necrosis and promote multidrug-resistant fungal and bacterial superinfections.",
            "Infected pancreatic necrosis (suspected by clinical deterioration, fever, gas bubbles on CT, or fine-needle aspiration) is managed using the 'step-up approach' (PANTER trial): conservative medical optimization -> percutaneous catheter drainage -> minimally invasive retroperitoneal necrosectomy (VARD) -> open surgical necrosectomy only if catheter drainage fails; intervention should be delayed >=4 weeks to allow necrotic collections to wall off."
        ],
        "mcq_angles": [
            "WATERFALL trial finding: aggressive hydration in acute pancreatitis increases fluid overload and heart failure without improving clinical resolution.",
            "Enteral versus parenteral nutrition: early enteral nutrition (nasogastric or nasojejunal) is superior to TPN in preventing infected pancreatic necrosis and death.",
            "The Step-Up Approach in infected necrosis: percutaneous catheter drainage is the initial intervention of choice, avoiding upfront open necrosectomy and resolving ~35-50% of cases without surgery."
        ],
        "case_hooks": [
            "A 48-year-old man with severe gallstone pancreatitis admitted to the ICU on mechanical ventilation with oliguria and worsening abdominal distension/elevated bladder pressure (abdominal compartment syndrome).",
            "A 54-year-old man who develops spiking fevers and leukocytosis on day 21 of severe necrotizing pancreatitis, with contrast CT demonstrating retroperitoneal gas within a pancreatic collection."
        ],
        "uncertainties": [
            "Optimal timing for cholecystectomy in patients recovering from severe biliary pancreatitis with residual collections.",
            "Comparative clinical efficacy of endoscopic ultrasound-guided transmural step-up drainage versus percutaneous retroperitoneal drainage in centrally located necrotizing pancreatitis."
        ]
    },

    "Severe malaria artesunate therapy": {
        "mentor_intro": "Severe Plasmodium falciparum malaria is a medical emergency with high mortality from cerebral malaria, severe metabolic acidosis, acute kidney injury, and severe anemia. Intravenous artesunate is the definitive, life-saving first-line therapeutic agent, vastly superior to quinine.",
        "teaching_points": [
            "Intravenous artesunate (2.4 mg/kg IV administered at 0, 12, and 24 hours, then once daily until oral therapy can be tolerated) is the mandatory first-line treatment for severe malaria in all patients (including pregnant women in all trimesters and infants), having completely superseded IV quinine.",
            "Landmark multicenter randomized clinical trials—the SEAQUAMAT trial in Asian adults (34.7% relative mortality reduction) and the AQUAMAT trial in African children (22.5% relative mortality reduction)—firmly established that parenteral artesunate significantly reduces all-cause mortality compared with parenteral quinine.",
            "Artesunate acts rapidly across all asexual erythrocytic stages of the parasite (including circulating ring forms and mature trophozoites/schizonts), arresting parasite maturation and rapidly reducing parasite biomass, while preventing cytoadherence and microvascular sequestration in cerebral capillaries.",
            "Severe malaria clinical criteria (WHO) include: impaired consciousness/coma (Glasgow Coma Scale <11), respiratory distress / pulmonary edema, severe metabolic acidosis (base deficit >8 mEq/L or plasma lactate >5 mmol/L), severe normocytic anemia (hemoglobin <70 g/L / 7 g/dL), acute kidney injury, jaundice, and hyperparasitemia (>10% parasitized RBCs).",
            "Delayed post-artesunate hemolytic anemia (PAHA) occurs in 10–25% of patients 1 to 3 weeks after treatment, caused by spleen-mediated clearance of 'pitted' erythrocytes that previously harbored killed parasites; routine monitoring of hemoglobin, reticulocytes, and LDH at 14 and 28 days post-treatment is mandatory."
        ],
        "mcq_angles": [
            "Mortality reduction evidence: AQUAMAT and SEAQUAMAT trials proved IV artesunate reduces mortality significantly compared to IV quinine.",
            "Pregnancy safety: IV artesunate is the drug of choice for severe malaria in all trimesters of pregnancy; risks of untreated severe malaria far outweigh potential teratogenic risks.",
            "Delayed hemolysis complication: post-artesunate hemolytic anemia (PAHA) occurs 1 to 3 weeks post-treatment due to splenic destruction of once-infected pitted red cells."
        ],
        "case_hooks": [
            "A 32-year-old traveler returning from West Africa presenting with high fever, delirium, jaundice, hematuria ('blackwater fever'), and 14% Plasmodium falciparum parasitemia on thin blood film.",
            "A 28-year-old pregnant woman in her second trimester presenting with cerebral malaria requiring immediate intravenous artesunate calculation."
        ],
        "uncertainties": [
            "Emergence of kelch13 (K13) propeller domain mutations conferring artemisinin partial resistance in East Africa and Southeast Asia.",
            "Optimal threshold for adjunctive exchange transfusion in severe hyperparasitemia (>20-30%) receiving IV artesunate."
        ]
    },

    "Severe traumatic brain injury: ICP monitoring, cerebral perfusion pressure targets": {
        "mentor_intro": "The primary goal in the intensive care management of severe traumatic brain injury (TBI, Glasgow Coma Scale <=8) is the prevention of secondary ischemic brain injury. Invasive intracranial pressure (ICP) monitoring guides tiered interventions to maintain adequate cerebral perfusion pressure (CPP).",
        "teaching_points": [
            "Invasive intracranial pressure (ICP) monitoring is recommended (Brain Trauma Foundation guidelines) in salvageable patients with severe TBI (GCS 3–8 post-resuscitation) and an abnormal admission CT scan (hematomas, contusions, swelling, compressed basal cisterns), or normal CT with two or more risk factors (age >40, unilateral/bilateral motor posturing, or SBP <90 mmHg).",
            "An external ventricular drain (EVD / ventriculostomy) coupled to a strain-gauge transducer is the gold standard for ICP monitoring, allowing simultaneous diagnostic pressure measurement and therapeutic therapeutic drainage of cerebrospinal fluid (CSF).",
            "Target therapeutic thresholds: Intracranial Pressure (ICP) must be treated when exceeding 22 mmHg, as sustained ICP >22 mmHg is strongly associated with elevated mortality; Cerebral Perfusion Pressure (CPP = MAP - ICP) must be maintained between 60 and 70 mmHg.",
            "Aggressive CPP augmentation (>70 mmHg) using excessive vasopressors and fluids must be avoided due to a five-fold increased risk of acute respiratory distress syndrome (ARDS), while CPP <60 mmHg precipitates cerebral ischemia.",
            "Tiered management of intracranial hypertension follows a standardized hierarchy: Tier 1 (head elevation 30 degrees, midline neck alignment, analgesia/sedation, EVD CSF drainage, normothermia, mild hypocapnia PaCO2 35-38 mmHg); Tier 2 (hyperosmolar therapy with hypertonic saline 3% or mannitol, neuromuscular blockade, CPP optimization); Tier 3 (surgical decompressive craniectomy, deep barbiturate coma, or therapeutic hypothermia)."
        ],
        "mcq_angles": [
            "Cerebral perfusion pressure calculation and target: CPP = Mean Arterial Pressure (MAP) - Intracranial Pressure (ICP); target range is 60–70 mmHg.",
            "ICP treatment threshold: initiate tiered interventions when ICP exceeds 22 mmHg (updated from legacy 20 mmHg threshold).",
            "Hyperosmolar therapy distinction: 3% hypertonic saline maintains intravascular volume and MAP, whereas mannitol induces osmotic diuresis and can precipitate systemic hypotension."
        ],
        "case_hooks": [
            "A 22-year-old motor vehicle collision victim with severe TBI (GCS 6) whose ventriculostomy reveals an ICP of 28 mmHg with arterial BP 110/65 mmHg (MAP 80 mmHg, calculated CPP 52 mmHg).",
            "A 35-year-old woman with diffuse cerebral contusions on CT who develops refractory ICP >30 mmHg despite hypertonic saline and deep propofol sedation."
        ],
        "uncertainties": [
            "Utility of advanced multimodality neuromonitoring (brain tissue oxygen tension PbtO2 and cerebral microdialysis) versus ICP/CPP monitoring alone (BOOST-3 trial evaluation).",
            "Long-term neurofunctional outcomes of early primary versus secondary decompressive craniectomy for refractory intracranial hypertension (RESCUE-ICP)."
        ]
    },

    "Sexually transmitted infections: gonorrhoea, chlamydia, syphilis: diagnostic tests and treatment": {
        "mentor_intro": "Sexually transmitted infections (STIs) represent a major global disease burden with escalating rates of bacterial antimicrobial resistance. Precise nucleic acid amplification testing (NAAT) and serological screening enable targeted, evidence-based antimicrobial treatment and partner notification.",
        "teaching_points": [
            "First-pass urine (initial 10–20 mL without prior voiding for 1 hour) in men and self-collected or clinician-collected vulvovaginal swabs in women are the preferred diagnostic specimens for Nucleic Acid Amplification Testing (NAAT) for Chlamydia trachomatis and Neisseria gonorrhoeae.",
            "Extragenital NAAT testing (pharyngeal and rectal swabs) is essential in men who have sex with men (MSM) and individuals reporting oral/anal sexual exposure, as up to 70–85% of extragenital gonococcal and chlamydial infections are completely asymptomatic and missed by urogenital screening alone.",
            "Treatment of uncomplicated urogenital, anorectal, or pharyngeal gonorrhea requires a single intramuscular dose of ceftriaxone 500 mg (or 1 g if weight >=150 kg); monotherapy with ceftriaxone is now standard in CDC guidelines, with oral azithromycin co-treatment removed to curb macrolide resistance.",
            "Uncomplicated Chlamydia trachomatis infection is treated with oral doxycycline (100 mg twice daily for 7 days) as the preferred first-line regimen, which demonstrates significantly superior microbiological cure rates in rectal and pharyngeal chlamydia compared with single-dose azithromycin (1 g).",
            "Diagnostic algorithms for syphilis incorporate non-treponemal tests (RPR or VDRL) to monitor disease activity and treatment response, and treponemal tests (FTA-ABS, TPPA, CIA) which remain reactive lifelong; early syphilis (primary, secondary, early latent) is treated with a single dose of intramuscular benzathine penicillin G 2.4 million units."
        ],
        "mcq_angles": [
            "Preferred treatment for uncomplicated chlamydia: doxycycline 100 mg BID for 7 days is superior to single-dose azithromycin, especially for rectal infections.",
            "Updated gonorrhea regimen: single-dose intramuscular ceftriaxone 500 mg monotherapy (replacing dual therapy with azithromycin).",
            "Serological evaluation of syphilis cure: successful treatment is confirmed by a four-fold (two-dilution) decrease in non-treponemal titers (e.g. from 1:32 to 1:8) at 6 to 12 months."
        ],
        "case_hooks": [
            "A 26-year-old man presenting with acute purulent urethral discharge and dysuria whose urogenital NAAT confirms Neisseria gonorrhoeae.",
            "A 30-year-old asymptomatic woman presenting for sexual health screening whose syphilis antibody is positive, RPR titer is 1:64, with normal physical exam."
        ],
        "uncertainties": [
            "Effectiveness of post-exposure prophylaxis with doxycycline (Doxy-PEP: 200 mg within 72 hours of unprotected sex) on STI transmission vs community antimicrobial resistance.",
            "Management protocols for persistent mycoplasma genitalium infections harboring macrolide and fluoroquinolone dual resistance mutations."
        ]
    },

    "Shared decision making and patient reported outcomes in rheumatology: HAQ, PROMIS, PROs": {
        "mentor_intro": "Shared decision-making (SDM) and the integration of Patient-Reported Outcome Measures (PROMs) are fundamental to modern patient-centered rheumatology. Utilizing validated instruments like the Health Assessment Questionnaire (HAQ) and PROMIS aligns therapeutic choices with patient preferences and functional goals.",
        "teaching_points": [
            "Shared decision-making (SDM) is an evidence-based clinical process where clinicians and patients collaborate to make healthcare choices based on scientific clinical evidence, balanced discussion of risks and benefits, and the patient's individual values, priorities, and lifestyle goals.",
            "The Health Assessment Questionnaire-Disability Index (HAQ-DI) is the historical gold-standard PROM in rheumatoid arthritis, evaluating functional ability across 8 categories (dressing, arising, eating, walking, hygiene, reach, grip, and activities); scores range from 0 (no disability) to 3 (completely disabled), with a minimal clinically important difference (MCID) of 0.22.",
            "Patient-Reported Outcomes Measurement Information System (PROMIS) utilizes item-response theory and computerized adaptive testing (CAT) to assess physical function, pain interference, fatigue, sleep disturbance, and depression with greater precision and lower question burden than legacy fixed-length instruments.",
            "Discrepancies between clinician-assessed disease activity (swollen joint counts, CRP/ESR) and patient-reported measures (patient global assessment, fatigue, chronic pain) are common, often reflecting fibromyalgia, central sensitization, osteoarthritis, or psychological distress rather than active synovitis.",
            "Integrating routine electronic PROMs (ePROMs) into outpatient clinic encounters improves patient-physician communication, enhances treatment adherence to DMARDs, and facilitates timely detection of adverse effects and disease flares."
        ],
        "mcq_angles": [
            "HAQ-DI scoring and interpretation: scores range from 0 to 3; a change of 0.22 represents the established minimal clinically important difference (MCID).",
            "PROMIS methodology advantage: item-response theory and computerized adaptive testing allow precise measurement with fewer questions and lower floor/ceiling effects.",
            "Discordance in Treat-to-Target: elevated Patient Global Assessment in the presence of zero swollen joints and normal CRP often indicates central sensitization (fibromyalgia)."
        ],
        "case_hooks": [
            "A 46-year-old woman with rheumatoid arthritis in clinical remission (0 swollen joints, normal CRP) whose HAQ-DI remains high at 1.8 due to chronic widespread fatigue and fibromyalgia.",
            "A 58-year-old man with active psoriatic arthritis utilizing an interactive decision aid to weigh the benefits and infection risks of biologic DMARDs."
        ],
        "uncertainties": [
            "Optimal weighting of Patient Global Assessment within composite remission criteria (Boolean ACR/EULAR 2.0 vs DAS28) to prevent overtreatment.",
            "Long-term impact of remote asynchronous ePROM monitoring on biologic switching frequency and health economic costs."
        ]
    },

    "Short Bowel Syndrome": {
        "mentor_intro": "Short bowel syndrome (SBS) is a malabsorptive condition resulting from extensive surgical resection of the small intestine, leading to fluid, electrolyte, and nutrient dependence. Management progresses from initial total parenteral nutrition to gut adaptation and targeted trophic therapies like GLP-2 analogues.",
        "teaching_points": [
            "Short bowel syndrome (SBS) is clinically defined by physical or functional loss of small intestine resulting in intestinal failure, typically occurring when remnant functional small bowel length is less than 150 to 200 cm in the absence of a colon, or less than 100 cm with an intact colon in continuity.",
            "The anatomical configuration dictates clinical prognosis: Type 1 (end-jejunostomy with no colon; highest fluid and sodium losses), Type 2 (jejunocolic anastomosis; jejunum joined to colon, sparing ileum), and Type 3 (jejunoileal anastomosis with intact ileocecal valve and colon; best prognosis for weaning off parenteral support).",
            "The terminal ileum is uniquely responsible for the active absorption of vitamin B12 (intrinsic factor-B12 complex) and conjugated bile acids; ileal resection >100 cm depletes the circulating bile acid pool, producing severe fat malabsorption, steatorrhea, deficiency of fat-soluble vitamins (A, D, E, K), and hyperoxaluria with recurrent calcium oxalate kidney stones.",
            "Teduglutide—a recombinant human glucagon-like peptide-2 (GLP-2) analogue administered subcutaneously daily—stimulates intestinal mucosal hyperplasia, expands crypt depth and villus height, and enhances fluid and nutrient absorption, significantly reducing intravenous parenteral nutrition/fluid requirements.",
            "Patients with an intact colon are vulnerable to enteric hyperoxaluria: unabsorbed fatty acids in the colon bind calcium, leaving dietary oxalate free to be absorbed hyper-efficiently by the colonic mucosa, which precipitates in the renal tubules and causes calcium oxalate nephrolithiasis and oxalate nephropathy."
        ],
        "mcq_angles": [
            "Mechanism of enteric hyperoxaluria in SBS: unabsorbed fatty acids saponify calcium in the bowel lumen, leaving free oxalate to be hyper-absorbed in the intact colon.",
            "Terminal ileum resection consequences: resection >100 cm impairs bile salt reabsorption, causing bile acid pool depletion, fat-soluble vitamin malabsorption, and vitamin B12 deficiency.",
            "Teduglutide mechanism of action: GLP-2 analogue that promotes enterocyte mucosal hyperplasia and intestinal adaptation, decreasing parenteral nutrition dependence."
        ],
        "case_hooks": [
            "A 38-year-old woman following massive bowel resection for superior mesenteric artery thrombosis with 70 cm of residual jejunum anastomosed directly to the transverse colon.",
            "A 45-year-old Crohn's disease patient with multiple previous resections on chronic total parenteral nutrition presenting with recurrent calcium oxalate nephrolithiasis."
        ],
        "uncertainties": [
            "Long-term neoplastic surveillance protocols of the gastrointestinal tract during prolonged trophic therapy with GLP-2 analogues.",
            "Candidate selection criteria for non-transplant autologous gastrointestinal reconstruction (STEP and Bianchi procedures) versus small bowel transplantation."
        ]
    },

    "Sickle Cell Disease": {
        "mentor_intro": "Sickle cell disease (SCD) is a monogenic hemoglobinopathy caused by a point mutation in the beta-globin gene, producing abnormal hemoglobin S (HbS). Chronic hemolytic anemia, recurrent vaso-occlusive crises, and progressive multi-organ vasculopathy define the clinical course, requiring comprehensive preventive care.",
        "teaching_points": [
            "Sickle cell disease results from an autosomal recessive point mutation in the beta-globin gene (HBB) substituting valine for glutamic acid at codon 6 (E6V), forming hemoglobin S (HbS); deoxygenation induces hydrophobic HbS polymerization, erythrocyte sickling, membrane damage, and microvascular vaso-occlusion.",
            "Acute vaso-occlusive crisis (VOC / painful crisis) is the most frequent acute complication, triggered by cold exposure, dehydration, hypoxia, acidosis, infection, or stress; management requires rapid, aggressive parenteral opioid analgesia (within 30–60 minutes of arrival), hydration with hypotonic fluids, and avoidance of excessive sedation.",
            "Acute chest syndrome (ACS)—defined by a new pulmonary infiltrate on chest radiograph accompanied by fever, chest pain, tachypnea, or hypoxemia—is the leading cause of death in SCD; treatment requires empiric broad-spectrum antibiotics (covering atypical pathogens), oxygen, analgesia, and urgent simple or automated exchange blood transfusion.",
            "Functional asplenia develops early in childhood (typically by age 3 to 5) due to recurrent splenic micro-infarctions (autosplenectomy), predisposing patients to life-threatening sepsis from encapsulated organisms (Streptococcus pneumoniae, Haemophilus influenzae, Neisseria meningitidis); daily oral penicillin prophylaxis and comprehensive vaccination schedules are life-saving.",
            "Annual transcranial Doppler (TCD) ultrasonography screening in children aged 2 to 16 years identifies elevated middle cerebral artery flow velocities (>=200 cm/s), which predict high ischemic stroke risk; prophylactic chronic monthly blood transfusion programs reduce stroke incidence by >90%."
        ],
        "mcq_angles": [
            "Primary cause of death in sickle cell adults: Acute Chest Syndrome (ACS), requiring rapid recognition and emergent exchange transfusion.",
            "Infection vulnerability in children with SCD: functional asplenia from splenic auto-infarction mandates daily prophylactic penicillin until age 5 and pneumococcal vaccination.",
            "TCD screening indication and cutoff: annual TCD screening in children aged 2–16; time-averaged mean maximum velocity >=200 cm/s mandates chronic transfusion to prevent stroke."
        ],
        "case_hooks": [
            "A 19-year-old man with HbSS presenting to the emergency department with severe, agonizing bilateral femur and low back pain, tachycardia, and normal baseline chest radiograph.",
            "A 24-year-old woman with SCD admitted with mild back pain who on day 2 develops acute fever, tachypnea, SpO2 88% on room air, and new left lower lobe consolidation on CXR."
        ],
        "uncertainties": [
            "Optimal comparative positioning of novel disease-modifying agents (crizanlizumab P-selectin inhibitor and voxelotor HbS polymerization inhibitor) alongside hydroxyurea.",
            "Long-term management and screening protocols for sickle cell nephropathy and progressive chronic kidney disease."
        ]
    },

    "Sickle cell disease gene editing": {
        "mentor_intro": "Cell-based gene therapies and CRISPR-Cas9 gene editing have inaugurated a curative era for patients with severe sickle cell disease. By modifying autologous hematopoietic stem and progenitor cells, these therapies eliminate the need for an allogeneic donor and abolish painful vaso-occlusive crises.",
        "teaching_points": [
            "Exagamglogene autotemcel (exa-cel) is a groundbreaking, first-in-class autologous cell-based gene therapy utilizing CRISPR-Cas9 genome editing to disrupt the erythroid-specific enhancer region of the BCL11A gene in CD34+ hematopoietic stem cells.",
            "Disruption of BCL11A relieves transcriptional repression of the gamma-globin genes (HBG1 and HBG2), reactivating robust endogenous synthesis of fetal hemoglobin (HbF); elevated HbF tetramers (alpha-2-gamma-2) do not sickle and physically inhibit the polymerization of deoxy-hemoglobin S.",
            "In pivotal clinical trials (CLIMB-121), a single infusion of exa-cel resulted in sustained fetal hemoglobin levels exceeding 40% of total hemoglobin, completely eliminating severe vaso-occlusive crises in >95% of treated patients and eliminating hospitalizations.",
            "Lovotibeglogene autotemcel (lovo-cel) is an alternative lentiviral vector-based gene therapy that delivers an engineered beta-globin gene encoding HbAT87Q, an anti-sickling hemoglobin variant with strong oxygen affinity and reduced polymerization tendency.",
            "Both exa-cel and lovo-cel require high-dose myeloablative conditioning with intravenous busulfan prior to infusion to eradicate native bone marrow stem cells, which carries short-term risks of prolonged pancytopenia, mucositis, secondary infections, and long-term risks of infertility and secondary myelodysplasia/leukemia."
        ],
        "mcq_angles": [
            "Exa-cel molecular target: CRISPR-Cas9 targeted disruption of the erythroid-specific BCL11A enhancer, reactivating gamma-globin and fetal hemoglobin (HbF) production.",
            "Mechanism of HbF anti-sickling effect: fetal hemoglobin tetramers cannot incorporate into HbS polymer fibers and directly inhibit the nucleation of sickle hemoglobin.",
            "Conditioning requirement: autologous gene editing requires high-dose myeloablative busulfan conditioning, necessitating extensive fertility preservation counseling."
        ],
        "case_hooks": [
            "A 24-year-old woman with severe HbSS experiencing 6 hospitalizations per year for debilitating vaso-occlusive crises who undergoes autologous stem cell harvest for exa-cel therapy.",
            "A 19-year-old man undergoing myeloablative busulfan conditioning prior to lovo-cel gene therapy, monitored for absolute neutrophil recovery."
        ],
        "uncertainties": [
            "Long-term theoretical off-target genomic cleavage and insertional oncogenesis risk over decades following ex-vivo CRISPR-Cas9 editing.",
            "Global healthcare access, manufacturing scalability, and prohibitive commercial cost ($2–3 million per treatment) limiting dissemination to high-prevalence developing nations."
        ]
    },

    "Sickle cell disease: hydroxyurea therapy and crisis prevention": {
        "mentor_intro": "Hydroxyurea (hydroxycarbamide) is the foundational, disease-modifying pharmacotherapy for sickle cell disease. By inducing fetal hemoglobin (HbF) production and suppressing vascular inflammation, hydroxyurea significantly diminishes painful vaso-occlusive crises, acute chest syndrome, and mortality.",
        "teaching_points": [
            "Hydroxyurea is a ribonucleotide reductase inhibitor whose primary therapeutic mechanism is the pharmacological reactivation of fetal hemoglobin (HbF) synthesis in erythroid precursors; increased HbF dilutes intracellular HbS, markedly delaying deoxy-HbS polymerization.",
            "Beyond HbF induction, hydroxyurea exerts multiple non-HbF cytoprotective actions: lowering circulating neutrophil and platelet counts (attenuating microvascular cellular adhesion and inflammation), decreasing reticulocyte count, increasing erythrocyte mean corpuscular volume (MCV), and stimulating endothelial nitric oxide release.",
            "Landmark randomized controlled trials (MSH trial in adults and BABY HUG trial in infants) established that hydroxyurea reduces the frequency of painful vaso-occlusive crises by ~50%, cuts rates of acute chest syndrome by half, reduces blood transfusion requirements, and extends overall survival.",
            "Clinical guidelines recommend offering hydroxyurea to all children with HbSS/HbS-beta0 thalassemia starting at age 9 months regardless of symptoms, and to all adults with >=3 moderate-to-severe pain crises in a 12-month period, history of acute chest syndrome, or chronic anemia interfering with daily activities.",
            "Therapy is initiated at 15 to 20 mg/kg/day and titrated upward by 5 mg/kg every 8 to 12 weeks to the maximum tolerated dose (MTD, up to 35 mg/kg/day) based on laboratory monitoring: targeting an increased MCV and HbF while maintaining absolute neutrophil count (ANC) >=1,500/uL (1.5 x 10^9/L) and platelet count >=80,000/uL."
        ],
        "mcq_angles": [
            "BABY HUG trial principle: hydroxyurea is recommended starting at 9 months of age in all children with HbSS to prevent vaso-occlusive complications, regardless of prior pain crises.",
            "Laboratory surrogate for hydroxyurea adherence and efficacy: an elevation in erythrocyte Mean Corpuscular Volume (MCV) and rising percentage of HbF.",
            "Dose-limiting toxicity: myelosuppression; therapy should be held if ANC drops below 1,000-1,500/uL or platelets drop below 80,000/uL, resuming at a lower dose after recovery."
        ],
        "case_hooks": [
            "A 28-year-old man with HbSS who suffered two episodes of acute chest syndrome in the past 18 months, initiated on hydroxyurea 15 mg/kg daily.",
            "A 14-month-old asymptomatic infant with homozygous sickle cell disease presenting for routine wellness clinic review, evaluated for hydroxyurea initiation."
        ],
        "uncertainties": [
            "Comparative long-term preservation of renal and splenic function with early infant hydroxyurea therapy into adulthood.",
            "Spermatogenesis impairment and male fertility recovery following long-term hydroxyurea administration."
        ]
    },

    "Silicosis": {
        "mentor_intro": "Silicosis is an occupational fibrotic pneumoconiosis caused by the inhalation of respirable crystalline silica (silicon dioxide, SiO2) dust. Ranging from chronic simple silicosis to acute silicoproteinosis, silicosis produces progressive pulmonary fibrosis, severe impairment of respiratory function, and marked susceptibility to tuberculosis.",
        "teaching_points": [
            "Silicosis is caused by the chronic inhalation of respirable crystalline silica dust (<5 um diameter) in high-risk occupations including artificial stone (engineered quartz) countertop fabrication, sandblasting, mining, quarrying, foundry work, and tunneling.",
            "Pathophysiology involves alveolar macrophages phagocytosing crystalline silica particles; the rigid crystals destabilize lysosomal membranes, triggering NLRP3 inflammasome activation, release of IL-1 beta and TNF-alpha, fibroblast proliferation, and formation of concentric whorled hyalinized fibrotic 'silicotic nodules'.",
            "Chest radiography classically demonstrates multiple small, rounded opacities (1–10 mm) predominantly distributed in the upper lung zones; peripheral 'eggshell' calcification of hilar and mediastinal lymph nodes is a characteristic radiographic sign highly suggestive of silicosis.",
            "Clinical variants include: Chronic simple silicosis (develops after >10-20 years of low-level exposure; often asymptomatic initially), Accelerated silicosis (develops within 5-10 years of heavy exposure, common in artificial stone workers), and Acute silicoproteinosis (develops within months of massive exposure, featuring alveolar filling with lipoproteinaceous material mimicking pulmonary alveolar proteinosis).",
            "Silicosis confers an enormous (up to 30-fold) increased lifetime risk of developing pulmonary tuberculosis (silicotuberculosis) due to silica-induced impairment of alveolar macrophage antimicrobial defenses; all patients with silicosis must undergo screening for latent tuberculosis with annual testing."
        ],
        "mcq_angles": [
            "Infectious vulnerability in silicosis: silica disrupts alveolar macrophage function, conferring a dramatically elevated risk of active Tuberculosis (silicotuberculosis).",
            "Pathognomonic imaging sign: 'eggshell' calcification of hilar and mediastinal lymph nodes combined with upper-lobe predominant small rounded nodules.",
            "Modern occupational surge: artificial engineered stone countertop cutters and polishers develop rapidly progressive accelerated silicosis within years of exposure."
        ],
        "case_hooks": [
            "A 34-year-old kitchen countertop fabricator working with engineered quartz stone presenting with 6 months of rapidly progressive exertional dyspnea and bilateral upper-lobe coalescent masses.",
            "A 62-year-old retired hard-rock miner with chronic silicosis presenting with fever, night sweats, weight loss, and a new cavitary lesion inside an upper-lobe conglomerate mass."
        ],
        "uncertainties": [
            "Efficacy of whole lung lavage in clearing alveolar particulate burden in rapidly progressive acute and accelerated artificial stone silicosis.",
            "Role of antifibrotic medications (nintedanib or pirfenidone) in slowing lung functional decline in progressive massive fibrosis (PMF)."
        ]
    },

    "Sinusoidal Obstruction Syndrome": {
        "mentor_intro": "Sinusoidal obstruction syndrome (SOS), formerly known as hepatic veno-occlusive disease (VOD), is a life-threatening endothelial complication predominantly occurring following myeloablative hematopoietic stem cell transplantation (HSCT). Toxic injury to sinusoidal endothelial cells produces post-sinusoidal portal hypertension and rapid multi-organ failure.",
        "teaching_points": [
            "Sinusoidal obstruction syndrome (SOS/VOD) is initiated by toxic conditioning chemotherapy (high-dose cyclophosphamide, busulfan, or total body irradiation) damaging hepatic sinusoidal endothelial cells and hepatocytes in zone 3 of the liver acinus, leading to sinusoidal microthrombosis, subendothelial edema, and post-sinusoidal portal hypertension.",
            "The classic clinical triad—typically developing within 21 to 30 days post-HSCT—features painful tender hepatomegaly, rapid unexplained weight gain secondary to fluid retention/ascites, and hyperbilirubinemia (jaundice).",
            "Diagnostic criteria (European Society for Blood and Marrow Transplantation [EBMT] or modified Seattle criteria) establish clinical diagnosis without requiring invasive liver biopsy; Doppler ultrasound assists diagnosis by revealing portal venous flow reversal (hepatofugal flow), elevated hepatic arterial resistive index (>0.75), and gallbladder wall edema.",
            "Defibrotide—a polydisperse oligonucleotide with protective endothelial, antithrombotic, and profibrinolytic properties without systemic anticoagulant bleeding risks—is the only approved, life-saving therapy for severe SOS/VOD, significantly improving survival and complete response rates when initiated early.",
            "Risk factors include myeloablative conditioning regimens, preexisting liver disease or cirrhosis, prior gemtuzumab ozogamicin or inotuzumab ozogamicin exposure, HLA-mismatched or unrelated allogeneic donors, and active viral hepatitis."
        ],
        "mcq_angles": [
            "Clinical triad of hepatic SOS/VOD: painful hepatomegaly, fluid retention/rapid weight gain with ascites, and hyperbilirubinemia occurring post-HSCT.",
            "Specific pharmacological treatment of choice: defibrotide possesses endothelial-protective and local profibrinolytic actions, reducing mortality in severe SOS.",
            "Doppler ultrasound hemodynamic feature: reversal of portal venous flow (hepatofugal flow) confirms severe post-sinusoidal portal hypertension."
        ],
        "case_hooks": [
            "A 42-year-old woman on day 16 following allogeneic stem cell transplantation for AML who gains 4 kg in 48 hours, develops right upper quadrant pain, ascites, and total bilirubin 5.4 mg/dL.",
            "A 28-year-old male with severe acute hepatic SOS post-busulfan conditioning initiated on intravenous defibrotide 6.25 mg/kg every 6 hours."
        ],
        "uncertainties": [
            "Optimal threshold for defibrotide prophylaxis in pediatric and adult patients receiving high-risk conditioning regimens.",
            "Transjugular hepatic venous pressure gradient (HVPG >=10 mmHg) utility versus clinical diagnostic scoring in equivocal early presentation."
        ]
    },

    "Six-Minute Walk Test": {
        "mentor_intro": "The Six-Minute Walk Test (6MWT) is a standardized, self-paced, submaximal exercise test evaluating integrated functional exercise capacity in cardiopulmonary diseases. Widely utilized in pulmonary arterial hypertension, COPD, and heart failure, the 6MWT serves as a key clinical trial endpoint and prognostic biomarker.",
        "teaching_points": [
            "The 6MWT measures the total distance (in meters) that a patient can walk quickly on a flat, hard, straight, enclosed corridor (ideally 30 meters in length) over a period of 6 minutes, reflecting global integrated cardiopulmonary, neuromuscular, and metabolic functional capacity.",
            "Standardized testing methodology (American Thoracic Society / European Respiratory Society technical guidelines) requires uniform pre-test rest (10 minutes), standardized neutral encouragement phrases spoken at exact 1-minute intervals, continuous pulse oximetry monitoring, and pre- and post-test Borg Dyspnea and Fatigue Scale ratings.",
            "The Minimal Clinically Important Difference (MCID) in 6-minute walk distance (6MWD) is approximately 30 to 33 meters across chronic respiratory and pulmonary vascular conditions (COPD, interstitial lung disease, and pulmonary arterial hypertension).",
            "In pulmonary arterial hypertension (PAH), 6MWD is a core variable in comprehensive multi-parametric risk stratification tools (REVEAL 2.0 and ESC/ERS risk scores): a walk distance >440 meters signifies low 1-year mortality (<5%), whereas <165 to 320 meters signifies high risk (>20% mortality).",
            "Exertional oxygen desaturation during the 6MWT—defined as an SpO2 drop >=4% or nadir SpO2 <88%—is an independent predictor of mortality and acute exacerbation in COPD and fibrotic interstitial lung disease, and guides prescription of ambulatory supplemental oxygen."
        ],
        "mcq_angles": [
            "Minimal Clinically Important Difference (MCID): an improvement or decline of ~30–33 meters reflects a clinically meaningful change in functional exercise capacity.",
            "Prognostic cutoff in pulmonary arterial hypertension: 6MWD >440 meters is classified as a low-risk green-zone target predicting low 1-year mortality.",
            "Standardized test protocol adherence: standardized neutral phrases (e.g., 'You are doing well, you have 4 minutes left') must be used to avoid bias from uneven encouragement."
        ],
        "case_hooks": [
            "A 52-year-old woman with idiopathic pulmonary fibrosis whose 6MWD drops from 420 meters to 360 meters over 6 months with an exertional desaturation nadir of 84%.",
            "A 40-year-old woman with systemic sclerosis-associated PAH whose 6MWD improves by 55 meters following 12 weeks of dual oral endothelin receptor antagonist and PDE-5 inhibitor therapy."
        ],
        "uncertainties": [
            "Equivalence and reproducibility of automated wearable smartwatch/accelerometer step counts compared to clinic-based 30-meter hallway 6MWT.",
            "Prognostic significance of the desaturation distance ratio (DDR) versus absolute walking distance in idiopathic pulmonary fibrosis."
        ]
    },

    "Sjogren syndrome systemic and topical therapy": {
        "mentor_intro": "Primary Sjogren syndrome is a systemic autoimmune disease characterized by lymphocytic infiltration of exocrine glands producing sicca manifestations (xerophthalmia and xerostomia), alongside extraglandular systemic involvement. Therapy combines topical tear/saliva substitutes and secretagogues with targeted systemic immunosuppression for extraglandular disease.",
        "teaching_points": [
            "Diagnosis of primary Sjogren syndrome requires objective demonstration of ocular or oral dryness (Schirmer test <=5 mm/5 min, ocular surface lissamine green staining) combined with positive anti-SSA/Ro autoantibodies (present in 70–80%) or focal lymphocytic sialadenitis on minor labial salivary gland biopsy (focus score >=1 per 4 mm2).",
            "Topical symptomatic management of sicca symptoms includes preservative-free artificial tears, topical ophthalmic cyclosporine 0.05% drops (suppresses conjunctival lymphocyte activation and improves tear production), and artificial saliva sprays/gels.",
            "Muscarinic receptor agonists—oral pilocarpine (5 mg three to four times daily) or cevimeline (30 mg three times daily)—stimulate residual functional salivary and lacrimal tissue via M3 receptors, significantly improving oral and ocular dryness; side effects include diaphoresis, flushing, nausea, and urinary frequency.",
            "Systemic extraglandular manifestations (affecting 30–50% of patients) involve systemic vasculitis, interstitial lung disease, tubulointerstitial nephritis, peripheral neuropathy, and autoimmune cytopenias, requiring systemic immunosuppression with corticosteroids, hydroxychloroquine (for arthralgias/fatigue), mycophenolate mofetil, or B-cell depletion with rituximab.",
            "Patients with Sjogren syndrome carry a 15- to 20-fold increased lifetime risk of developing B-cell non-Hodgkin lymphoma (predominantly marginal zone MALT lymphoma of the parotid gland or diffuse large B-cell lymphoma); clinical warning signs include persistent salivary gland enlargement, palpable purpura, cryoglobulinemia, and low serum complement C4."
        ],
        "mcq_angles": [
            "Malignancy complication risk: Sjogren syndrome has the highest relative risk of lymphoma (~15-20 fold) among all autoimmune diseases, primarily MALT and DLBCL.",
            "Oral secretagogue mechanism: pilocarpine and cevimeline are M3 muscarinic receptor agonists that enhance salivation and lacrimation.",
            "Ophthalmic topical therapy: topical cyclosporine 0.05% eye drops reduce local ocular surface inflammation and increase tear volume."
        ],
        "case_hooks": [
            "A 48-year-old woman with dry gritty eyes, severe dry mouth requiring water to swallow dry crackers, and positive anti-Ro/SSA antibodies, started on oral pilocarpine 5 mg TID.",
            "A 56-year-old woman with longstanding Sjogren syndrome who develops firm, painless, persistent unilateral swelling of the left parotid gland and palpable lower-extremity purpura."
        ],
        "uncertainties": [
            "Efficacy of novel targeted B-cell therapies (anti-CD40, BAFF/APRIL inhibitors like ianalumab) in halting progressive exocrine gland destruction in early disease.",
            "Prognostic biomarkers predicting transition from benign lymphoepithelial sialadenitis to malignant marginal zone B-cell lymphoma."
        ]
    },

    "Skin and soft tissue infection antibiotic strategy": {
        "mentor_intro": "Skin and soft tissue infections (SSTIs) range from superficial non-purulent cellulitis to life-threatening necrotizing fasciitis. Antimicrobial strategy is guided by distinguishing purulent from non-purulent infections, identifying systemic signs of toxicity, and recognizing necrotizing emergency features.",
        "teaching_points": [
            "Infectious Diseases Society of America (IDSA) guidelines classify SSTIs fundamentally into non-purulent infections (cellulitis, erysipelas) and purulent infections (furuncles, carbuncles, abscesses), subdivided into mild, moderate, and severe based on systemic inflammatory signs.",
            "Non-purulent cellulitis and erysipelas are overwhelmingly caused by beta-hemolytic streptococci (predominantly Streptococcus pyogenes [Group A Strep]); empirical therapy targets Streptococcus with beta-lactams (oral flucloxacillin, cefalexin, or IV cefazolin); coverage for MRSA is NOT routinely required in typical non-purulent cellulitis unless systemic toxicity, penetrating trauma, or prior MRSA carriage is present.",
            "Purulent SSTIs (subcutaneous abscesses) are primarily caused by Staphylococcus aureus (including MRSA); primary treatment for mild simple abscesses is incision and drainage alone without routine antibiotics; adjunctive oral antibiotics (TMP-SMX or doxycycline for CA-MRSA) are added for systemic symptoms, multiple abscesses, severe surrounding cellulitis, or immunocompromised hosts.",
            "Severe SSTI with systemic toxicity (fever, hypotension, leukocytosis) or rapid spread mandates hospitalization and broad-spectrum intravenous coverage: vancomycin or daptomycin (for MRSA) plus piperacillin-tazobactam or cefepime (for gram-negative bacilli).",
            "Necrotizing soft tissue infections (necrotizing fasciitis) are surgical emergencies requiring immediate emergent operative debridement; clinical red flags include pain out of proportion to physical findings, rapid progression across demarcated borders, skin bullae/necrosis, palpable subcutaneous gas (crepitus), and sensory anesthesia.",
            "In suspected necrotizing fasciitis, empiric antimicrobial therapy must include clindamycin (600–900 mg IV q8h) combined with broad-spectrum agents (vancomycin plus meropenem/piperacillin-tazobactam); clindamycin functions as a protein synthesis inhibitor that suppresses the production of Staphylococcal and Streptococcal superantigen toxins (Eagle effect)."
        ],
        "mcq_angles": [
            "Empirical therapy for typical non-purulent cellulitis: beta-lactams targeting Group A Streptococcus (flucloxacillin, cefalexin, or cefazolin); routine MRSA coverage is NOT necessary.",
            "Management of simple cutaneous abscess: incision and drainage alone is curative; antibiotics provide no benefit in uncomplicated single abscesses without systemic signs.",
            "Toxin suppression in necrotizing fasciitis: clindamycin is added to shut down bacterial ribosome translation and halt Streptococcal toxic shock syndrome exotoxin production."
        ],
        "case_hooks": [
            "A 54-year-old woman presenting with a rapidly spreading, warm, tender, well-demarcated erythematous plaque over the right lower leg with tinea pedis, without purulence or systemic signs.",
            "A 42-year-old diabetic man presenting with severe agonizing right thigh pain out of proportion to a patch of erythema, with tachycardia, fever, and skin crepitus on palpation."
        ],
        "uncertainties": [
            "Safety and efficacy of single-dose long-acting lipoglycopeptides (dalbavancin, oritavancin) in outpatient management of moderate-to-severe SSTIs.",
            "Optimal duration of antimicrobial therapy (5 days vs 10 days) for uncomplicated cellulitis achieving early clinical stability."
        ]
    },

    "Slowing CKD Progression": {
        "mentor_intro": "Arresting the progression of chronic kidney disease (CKD) toward end-stage renal disease requires a multi-mechanistic, organ-protective strategy. Modern clinical guidelines integrate renin-angiotensin-aldosterone system (RAAS) blockade, SGLT2 inhibitors, non-steroidal mineralocorticoid receptor antagonists, and strict blood pressure control.",
        "teaching_points": [
            "Blood pressure control with a standardized systolic target <120 mmHg (when tolerated, based on SPRINT trial evidence and KDIGO 2024 guidelines) significantly slows CKD progression and reduces cardiovascular events in patients with and without diabetes.",
            "First-line pharmacological renoprotection for albuminuric CKD (UACR >=300 mg/g or >=30 mg/mmol) begins with maximally tolerated doses of an ACE inhibitor or ARB; RAAS blockade reduces intraglomerular hydraulic pressure via selective efferent arteriolar vasodilation and lowers proteinuria.",
            "SGLT2 inhibitors (dapagliflozin, empagliflozin) are recommended by KDIGO guidelines for all eligible patients with CKD and eGFR >=20 mL/min/1.73m2 (both diabetic and non-diabetic), providing powerful additive 30–40% relative risk reductions in renal progression and cardiovascular death.",
            "Finerenone—a novel, non-steroidal selective mineralocorticoid receptor antagonist (nsMRA)—demonstrated in the FIDELIO-DKD and FIGARO-DKD trials that it significantly reduces CKD progression and cardiovascular events in patients with type 2 diabetes and persistent albuminuria on background ACEi/ARB therapy.",
            "Dietary interventions are foundational: restricting dietary sodium intake to <2.0 g/day (<5 g/day NaCl) lowers blood pressure and amplifies the antiproteinuric efficacy of RAAS inhibitors; moderate protein restriction (0.8 g/kg/day) is advised, avoiding high-protein diets (>1.3 g/kg/day) that promote glomerular hyperfiltration."
        ],
        "mcq_angles": [
            "KDIGO 4-pillar pharmacological renoprotection in diabetic CKD: ACEi/ARB, SGLT2 inhibitor, non-steroidal MRA (finerenone), and a statin.",
            "Mechanism of RAASi versus SGLT2i on glomerular hemodynamics: ACEi/ARBs induce efferent arteriolar dilation; SGLT2 inhibitors induce afferent arteriolar constriction; both reduce damaging intraglomerular hypertension.",
            "Blood pressure target in CKD: KDIGO guidelines recommend a systolic blood pressure target of <120 mmHg using standardized automated office BP measurement."
        ],
        "case_hooks": [
            "A 58-year-old man with T2DM, eGFR 44 mL/min/1.73m2, and persistent UACR 450 mg/g on maximal losartan, evaluated for SGLT2i and finerenone combination therapy.",
            "A 45-year-old non-diabetic woman with hypertensive nephrosclerosis and persistent proteinuria of 1.2 g/day on ramipril 10 mg with blood pressure 138/86 mmHg."
        ],
        "uncertainties": [
            "Efficacy of non-steroidal MRAs (finerenone) in slowing progression of non-diabetic glomerular diseases (such as IgA nephropathy).",
            "Optimal threshold for maintaining dual RAASi and SGLT2i therapy when eGFR falls below 15 mL/min/1.73m2 in stage 5 CKD."
        ]
    },

    "Small Bowel Bacterial Overgrowth": {
        "mentor_intro": "Small intestinal bacterial overgrowth (SIBO) occurs when normal colonic bacteria colonize the small intestine in abnormal quantities, resulting in malabsorption, chronic diarrhea, bloating, and abdominal pain. Identifying underlying anatomical or motility risk factors and targeted antibiotic decontamination form the diagnostic and treatment core.",
        "teaching_points": [
            "Small intestinal bacterial overgrowth (SIBO) is defined by excessive bacterial density in the small bowel (>10^3 colony-forming units [CFU]/mL on jejunal aspirate culture); it results from failure of normal protective clearance mechanisms: gastric acid barrier, migrating motor complex (MMC) phase III motility, ileocecal valve competence, and mucosal immunoglobulins.",
            "Common predisposing etiologies include structural abnormalities (surgical blind loops, strictures, bariatric Roux-en-Y anatomy, diverticula) and systemic motility disorders (diabetic autonomic enteropathy, systemic sclerosis, chronic opiate use, Parkinson disease).",
            "Non-invasive diagnostic testing utilizes standardized carbohydrate breath testing (glucose or lactulose breath tests); an increase in breath hydrogen of >=20 ppm within 90 minutes confirms hydrogen-predominant SIBO; an elevation in breath methane of >=10 ppm at any point confirms Intestinal Methanogen Overgrowth (IMO, predominantly Methanobrevibacter smithii), which is characteristically associated with constipation.",
            "Rifaximin (550 mg orally three times daily for 14 days) is the evidence-based first-line antibiotic of choice for hydrogen-predominant SIBO; it is a minimally absorbed, gut-selective rifamycin that achieves high luminal antimicrobial concentrations with negligible systemic side effects or resistance.",
            "For methane-predominant overgrowth (IMO with constipation), dual combination therapy with rifaximin (550 mg TID) plus oral neomycin (500 mg BID) or metronidazole (250 mg TID) for 14 days achieves significantly higher clinical and microbiological eradication than rifaximin monotherapy."
        ],
        "mcq_angles": [
            "Diagnostic breath test criteria: hydrogen rise >=20 ppm within 90 minutes indicates hydrogen SIBO; methane level >=10 ppm indicates Intestinal Methanogen Overgrowth (IMO).",
            "Clinical correlation of gas types: hydrogen-predominant SIBO is associated with watery diarrhea and malabsorption; methane-predominant overgrowth (IMO) is strongly linked to chronic constipation.",
            "Antibiotic of choice: oral rifaximin (550 mg TID for 14 days) provides non-absorbable targeted luminal decontamination."
        ],
        "case_hooks": [
            "A 48-year-old woman with systemic sclerosis presenting with chronic severe abdominal distension, postprandial bloating, watery diarrhea, and a 5-kg weight loss.",
            "A 55-year-old man with chronic severe constipation whose lactulose breath test reveals a baseline breath methane level of 24 ppm."
        ],
        "uncertainties": [
            "Efficacy and long-term safety of prokinetic agents (low-dose erythromycin, prucalopride) in preventing recurrent SIBO following antibiotic eradication.",
            "Clinical diagnostic agreement between quantitative small bowel aspirate culture and lactulose versus glucose hydrogen breath tests."
        ]
    },

    "Small Cell Lung Cancer": {
        "mentor_intro": "Small cell lung cancer (SCLC) is an exceptionally aggressive, high-grade neuroendocrine carcinoma strongly linked to tobacco exposure, characterized by rapid doubling time and early widespread metastatic dissemination. Systemic chemoimmunotherapy has modernized frontline management in extensive-stage disease.",
        "teaching_points": [
            "Small cell lung cancer (SCLC) represents approximately 15% of all lung cancers, characterized pathologically by small, round-to-oval cells with scant cytoplasm, ill-defined cell borders, granular nuclear chromatin ('salt-and-pepper'), absent nucleoli, frequent crushing artifact, and a Ki-67 proliferation index approaching 100%.",
            "Staging follows the Veterans Administration Lung Group (VALG) classification: Limited-Stage (LS-SCLC, confined to one hemithorax and regional lymph nodes that can be encompassed within a tolerable radiation port; ~30% of patients) and Extensive-Stage (ES-SCLC, disease beyond limited-stage boundaries, including distant metastases, malignant pleural effusion, or bilateral contralateral nodes; ~70%).",
            "For limited-stage SCLC, concurrent chemoradiotherapy (platinum agent [cisplatin preferred] plus etoposide combined with early, concurrent thoracic radiation therapy 45 Gy in 30 twice-daily fractions) is curative-intent standard of care, achieving median survival of 25 to 30 months.",
            "For extensive-stage SCLC, frontline chemoimmunotherapy—platinum and etoposide combined with an immune checkpoint inhibitor (atezolizumab [IMpower133 trial] or durvalumab [CASPIAN trial])—significantly improves progression-free and overall survival compared with platinum-etoposide chemotherapy alone.",
            "Prophylactic Cranial Irradiation (PCI) reduces the incidence of symptomatic brain metastases and improves survival in LS-SCLC patients achieving a complete or good partial response to chemoradiotherapy; in ES-SCLC, routine brain MRI surveillance every 3 months is increasingly preferred over PCI to avoid neurocognitive decline."
        ],
        "mcq_angles": [
            "Standard frontline regimen for extensive-stage SCLC: platinum (carboplatin or cisplatin) + etoposide + anti-PD-L1 antibody (atezolizumab or durvalumab).",
            "Chemoradiotherapy timing in limited-stage disease: thoracic radiation should be initiated early, concurrently with cycle 1 or 2 of platinum-etoposide.",
            "Prophylactic Cranial Irradiation (PCI) role: indicated in limited-stage SCLC responders to prevent central nervous system recurrence; balanced against neurocognitive toxicity."
        ],
        "case_hooks": [
            "A 62-year-old heavy smoker presenting with superior vena cava syndrome, weight loss, and a large central right hilar mass with mediastinal adenopathy on chest CT.",
            "A 68-year-old woman with newly diagnosed extensive-stage SCLC and liver metastases initiating first-line carboplatin, etoposide, and atezolizumab."
        ],
        "uncertainties": [
            "Role of consolidation thoracic radiotherapy in extensive-stage SCLC patients demonstrating good distant response to chemoimmunotherapy.",
            "Biomarkers (such as SCLC molecular subtypes SCLC-A, SCLC-N, SCLC-P, and SCLC-I) in predicting individualized immunotherapy benefit."
        ]
    },

    "Small fibre neuropathy: skin biopsy quantification, autonomic function testing": {
        "mentor_intro": "Small fiber neuropathy (SFN) selectively affects unmyelinated C-fibers and thinly myelinated A-delta nerve fibers responsible for thermal sensation, nociception, and autonomic function. Because conventional nerve conduction studies are normal, diagnosis relies on skin biopsy quantification of intraepidermal nerve fiber density and specialized autonomic testing.",
        "teaching_points": [
            "Small fiber neuropathy presents clinically with burning neuropathic pain, allodynia, hyperalgesia, paresthesias, and dysautonomia (orthostatic intolerance, gastroparesis, secretomotor changes, bowel/bladder dysfunction); large fiber modalities (vibration sense, proprioception, deep tendon reflexes, and muscle strength) are completely preserved.",
            "Routine electromyography (EMG) and nerve conduction studies (NCS) assess only large myelinated A-alpha and A-beta sensory and motor fibers, and are therefore entirely normal in isolated small fiber neuropathy, frequently leading to misdiagnosis.",
            "Punch skin biopsy (typically 3-mm punch taken 10 cm above the lateral malleolus) with immunohistochemical staining for Protein Gene Product 9.5 (PGP 9.5) is the diagnostic gold standard, objectively demonstrating reduced Intraepidermal Nerve Fiber Density (IENFD) below the 5th percentile of age- and sex-adjusted normative values.",
            "Autonomic function testing provides objective confirmation of small fiber involvement: Quantitative Sudomotor Axon Reflex Testing (QSART), thermoregulatory sweat testing (TST), and heart rate variability with deep breathing assess autonomic post-ganglionic sympathetic and parasympathetic small fiber function.",
            "Common identifiable secondary etiologies include impaired glucose tolerance/type 2 diabetes (most common), systemic autoimmune conditions (Sjogren syndrome, sarcoidosis, lupus), monoclonal gammopathies, celiac disease, vitamin B12 deficiency, Fabry disease (alpha-galactosidase A deficiency), and amyloidosis."
        ],
        "mcq_angles": [
            "Gold-standard diagnostic test for SFN: skin biopsy with PGP 9.5 quantification showing reduced intraepidermal nerve fiber density (IENFD).",
            "Why nerve conduction studies are normal in SFN: NCS measures only large myelinated A-beta fibers; unmyelinated C and thinly myelinated A-delta fibers cannot be evaluated by routine NCS.",
            "Underlying metabolic cause: impaired glucose tolerance and early prediabetes are the most common identifiable triggers of painful small fiber neuropathy."
        ],
        "case_hooks": [
            "A 52-year-old woman with normal fasting glucose but impaired glucose tolerance on OGTT presenting with 12 months of severe burning feet pain and allodynia with normal EMG/NCS.",
            "A 40-year-old man with Sjogren syndrome presenting with orthostatic dizziness, dry skin, and distal paresthesias whose distal leg skin biopsy confirms reduced IENFD at 1.8 fibers/mm."
        ],
        "uncertainties": [
            "Role of intravenous immunoglobulin (IVIG) therapy in autoimmune-mediated or immune-complex small fiber neuropathy.",
            "Diagnostic accuracy of corneal confocal microscopy (measuring corneal sub-basal nerve plexus density) as a non-invasive surrogate for skin biopsy."
        ]
    },

    "Smoking cessation pharmacotherapy": {
        "mentor_intro": "Tobacco use disorder is a chronic, relapsing condition driven by physical nicotine addiction and behavioral conditioning. Combining first-line evidence-based pharmacotherapy—specifically varenicline or combination nicotine replacement therapy (NRT)—with behavioral counseling triples long-term smoking cessation rates.",
        "teaching_points": [
            "Combining evidence-based pharmacotherapy with structured behavioral counseling (cognitive behavioral strategies, motivational interviewing) is significantly more effective than either modality alone, achieving long-term quit rates 2 to 3 times higher than unassisted quit attempts.",
            "First-line pharmacological options comprise: varenicline (nicotine acetylcholine receptor partial agonist), combination nicotine replacement therapy (NRT: long-acting transdermal patch plus a rapid-acting oral formulation such as gum, lozenge, inhalator, or spray), and bupropion sustained-release (atypical antidepressant and dopamine/norepinephrine reuptake inhibitor).",
            "In high-quality network meta-analyses and randomized trials (e.g., EAGLES trial), varenicline and combination NRT demonstrate equivalent superior efficacy, both achieving significantly higher 6-month abstinence rates (approx. 25–30%) compared with bupropion monotherapy (15–20%) or single-agent NRT.",
            "Varenicline binds with high affinity to alpha-4-beta-2 neuronal nicotinic acetylcholine receptors as a partial agonist: stimulating moderate dopamine release in the mesolimbic reward system to alleviate nicotine craving and withdrawal symptoms, while competitively blocking nicotine from binding to blunt the rewarding effects of smoking.",
            "The landmark EAGLES randomized trial (over 8,000 smokers with and without psychiatric disorders) firmly refuted historical neuropsychiatric warnings, demonstrating that varenicline and bupropion do NOT increase the incidence of serious neuropsychiatric adverse events (depression, suicidal ideation) compared with placebo or NRT.",
            "Contraindications and safety pearls: bupropion is strictly contraindicated in patients with a history of seizure disorder, eating disorders (anorexia/bulimia), or abrupt alcohol/benzodiazepine withdrawal due to a lowered seizure threshold; varenicline common side effects include nausea (minimized by taking with food and water) and vivid dreams."
        ],
        "mcq_angles": [
            "EAGLES trial landmark finding: varenicline does not increase serious neuropsychiatric adverse events or suicidality in smokers with or without psychiatric history.",
            "Most effective pharmacotherapy options: varenicline monotherapy and combination NRT (patch + rapid-acting oral NRT) are equally superior to single-agent NRT or bupropion.",
            "Bupropion contraindication: seizure disorder, active eating disorders, and abrupt withdrawal from alcohol or sedatives due to heightened seizure risk."
        ],
        "case_hooks": [
            "A 45-year-old heavy smoker (20 cigarettes/day for 25 years) with stable depression on sertraline seeking the most effective pharmacotherapy to quit smoking permanently.",
            "A 38-year-old man with a history of idiopathic generalized epilepsy inquiring whether bupropion is safe to use for tobacco cessation."
        ],
        "uncertainties": [
            "Long-term cardiovascular and pulmonary safety profiles of electronic nicotine delivery systems (e-cigarettes/vaping) utilized as smoking cessation tools.",
            "Optimal treatment duration of maintenance varenicline (extended 24 weeks vs standard 12 weeks) in heavy relapsing smokers."
        ]
    }
}

if __name__ == "__main__":
    print(f"Loaded {len(BATCH_03_TOPICS)} topics in Batch 3.")
    for name, data in BATCH_03_TOPICS.items():
        assert len(data["teaching_points"]) >= 4, f"{name}: fewer than 4 TPs"
        assert len(data["mcq_angles"]) >= 3, f"{name}: fewer than 3 MCQs"
        assert len(data["case_hooks"]) >= 2, f"{name}: fewer than 2 Cases"
        assert len(data["uncertainties"]) >= 2, f"{name}: fewer than 2 Uncertainties"
        assert len(data["mentor_intro"]) > 100, f"{name}: intro too short"
    print("All 25 topics in Batch 3 pass 100% of structural and depth criteria!")
