# -*- coding: utf-8 -*-
"""
Builder script for Batch 4 (Topics 76-100) of the 280 Write-From-Scratch cohort.
Replaces generic placeholder text with textbook-grade clinical evidence,
diagnostic pearls, landmark trials, and high-yield MCQ angles.
"""

BATCH_04_TOPICS = {
    "Smouldering Multiple Myeloma": {
        "mentor_intro": "Smouldering multiple myeloma (SMM) is an asymptomatic clonal plasma cell proliferative disorder positioned between MGUS and active multiple myeloma. Diagnosing SMM requires confirming bone marrow plasmacytosis >=10% or high serum M-protein in the absence of myeloma-defining events (CRAB criteria and SLiM biomarkers), with risk stratification identifying high-risk individuals who benefit from early therapeutic intervention.",
        "teaching_points": [
            "Diagnostic criteria for SMM require serum monoclonal protein (IgG or IgA) >=30 g/L (>=3.0 g/dL) or urinary monoclonal protein >=500 mg/24h, and/or clonal bone marrow plasma cells 10% to 59%, in the strict absence of end-organ damage (CRAB: Hypercalcemia, Renal insufficiency, Anemia, Bone lytic lesions) or amyloidosis.",
            "The International Myeloma Working Group (IMWG) established 'SLiM' biomarkers of malignancy—Sixty percent bone marrow plasmacytosis (>=60%), Light chain ratio (involved/uninvolved serum free light chain ratio >=100), and MRI focal lesions (>1 focal lesion >=5 mm)—which define active, treatment-requiring myeloma regardless of CRAB symptoms due to an ~80% risk of progression within 2 years.",
            "The updated IMWG '20/2/20' risk stratification model identifies high-risk SMM based on three risk factors: bone marrow plasma cells >20%, serum M-protein >2 g/dL, and involved-to-uninvolved free light chain ratio >20; patients with >=2 risk factors have a ~50% risk of progression to active myeloma at 2 years.",
            "In patients with high-risk SMM, landmark randomized clinical trials (QuiRedex trial and ECOG E3A06 trial) established that early intervention with lenalidomide (alone or with dexamethasone) significantly delays progression to symptomatic myeloma and extends overall survival compared with observation alone.",
            "Low- and intermediate-risk SMM patients should be managed with close active surveillance (clinical, biochemical, and whole-body low-dose CT or whole-body MRI every 3 to 6 months) without upfront cytotoxic or immunomodulatory therapy."
        ],
        "mcq_angles": [
            "SLiM criteria defining active myeloma (not SMM): bone marrow plasma cells >=60%, involved:uninvolved FLC ratio >=100, or >1 focal marrow lesion on MRI.",
            "IMWG '20/2/20' high-risk SMM score: marrow plasma cells >20%, M-protein >2 g/dL, and FLC ratio >20 predict ~50% 2-year progression risk.",
            "Evidence for early intervention in high-risk SMM: lenalidomide-based therapy prolongs progression-free and overall survival over watchful waiting."
        ],
        "case_hooks": [
            "A 58-year-old asymptomatic executive found to have an IgG kappa paraprotein of 34 g/L, bone marrow biopsy showing 25% clonal plasma cells, normal calcium, normal renal function, and normal skeletal MRI.",
            "A 64-year-old woman with known SMM whose involved-to-uninvolved serum free light chain ratio rises from 45 to 115, evaluated for classification as active multiple myeloma."
        ],
        "uncertainties": [
            "Curative potential and long-term immunological impact of intensive quadruplet chemoimmunotherapy (daratumumab-KRd) followed by ASCT in high-risk SMM.",
            "Utility of circulating tumor plasma cells (CTCs) and liquid biopsy NGS panels in refining early progression prediction models."
        ]
    },

    "Soft Tissue Sarcomas": {
        "mentor_intro": "Soft tissue sarcomas (STS) are rare, heterogeneous mesenchymal malignancies arising predominantly in extremity and trunk soft tissues. Core needle biopsy, high-resolution MRI, and limb-sparing wide local excision with adjuvant radiotherapy by a specialized multidisciplinary sarcoma team constitute the standard of care.",
        "teaching_points": [
            "Any soft tissue mass that is deep to the deep fascia, painful, enlarging, or greater than 5 cm in diameter ('golf ball size') must be considered malignant until proven otherwise; initial imaging is contrast-enhanced MRI of the affected compartment.",
            "Percutaneous image-guided core needle biopsy along the longitudinal axis of the anticipated surgical incision is mandatory before any surgical manipulation; excisional biopsy ('whoops surgery') of an unstaged sarcoma violates anatomical tissue planes, dramatically increases local recurrence, and often requires extensive re-resection.",
            "Histological grading (using the FNCLCC three-tier system based on tumor differentiation, mitotic count, and tumor necrosis) is the single most important histological predictor of distant metastatic recurrence and overall survival.",
            "Limb-sparing surgery with wide local excision (aiming for microscopically clear 1-cm soft tissue or fascial margins) combined with preoperative or postoperative external beam radiotherapy provides local control rates exceeding 85–90% with survival equivalent to radical amputation.",
            "First-line systemic chemotherapy for advanced or metastatic soft tissue sarcoma remains anthracycline-based regimens (doxorubicin monotherapy or doxorubicin plus ifosfamide), with histology-specific therapies utilized in distinct subtypes (e.g., imatinib for GIST, trabectedin for liposarcoma/leiomyosarcoma, eribulin for liposarcoma)."
        ],
        "mcq_angles": [
            "Biopsy orientation rule: core needle biopsy must be oriented longitudinally along the planned surgical incision so the entire biopsy tract can be excised en bloc during definitive surgery.",
            "FNCLCC grading criteria: three parameters dictate grade: tumor differentiation (1-3), mitotic count per 10 HPFs (1-3), and percentage of necrosis (0-2).",
            "Extremity sarcoma surgical gold standard: limb-sparing wide excision combined with radiation achieves local control and survival identical to amputation."
        ],
        "case_hooks": [
            "A 46-year-old man presenting with a painless, firm 8-cm mass deep within the right vastus lateralis muscle that has enlarged over 4 months.",
            "A 60-year-old woman undergoing planned wide local resection and adjuvant radiotherapy for an FNCLCC Grade 3 undifferentiated pleomorphic sarcoma of the thigh."
        ],
        "uncertainties": [
            "Optimal timing of radiotherapy: preoperative radiotherapy (lower total dose, higher wound complications) versus postoperative radiotherapy (higher total dose, higher late fibrosis and lymphedema).",
            "Role of immune checkpoint inhibitors in biomarker-selected soft tissue sarcoma subtypes (e.g., alveolar soft part sarcoma, undifferentiated pleomorphic sarcoma)."
        ]
    },

    "Solitary Pulmonary Nodule": {
        "mentor_intro": "A solitary pulmonary nodule (SPN) is a single, well-circumscribed, round or oval parenchymal opacity <=30 mm in diameter surrounded entirely by aerated lung tissue. Risk stratification balancing radiological features, patient smoking history, and nodule diameter guides observation, PET-CT, or biopsy/resection.",
        "teaching_points": [
            "A pulmonary nodule is defined as <=30 mm in diameter (lesions >30 mm are classified as 'masses' and carry >80% malignancy risk); risk of malignancy correlates directly with size: nodules <5 mm carry <1% risk, 5-10 mm carry 6-28% risk, and >20 mm carry >60-80% risk.",
            "High-risk morphological CT features include: spiculation or corona radiata (highest likelihood ratio for adenocarcinoma), lobulated margins, thick-walled cavitation (>15 mm wall thickness), upper-lobe location, and subsolid or part-solid ground-glass composition with a solid component >6 mm.",
            "Benign radiological features include: documented stability on prior imaging for >=2 years, specific benign calcification patterns (central, diffuse homogeneous, laminated, or 'popcorn' calcification characteristic of pulmonary hamartoma), and presence of macroscopic intranodular fat.",
            "According to the Fleischner Society guidelines for incidental solid nodules: nodules <6 mm in low-risk individuals require no routine follow-up; intermediate nodules (6–8 mm) require repeat thin-section non-contrast CT at 6 to 12 months; nodules >8 mm warrant 18F-FDG PET-CT, tissue biopsy (bronchoscopy/CT-guided), or surgical excision.",
            "18F-FDG PET-CT has high sensitivity (~95%) for detecting malignancy in nodules >8-10 mm; false-negative results occur in low-metabolic tumors (adenocarcinoma in situ, carcinoid tumors), while false-positive results occur in active granulomatous infections (tuberculosis, histoplasmosis) and sarcoidosis."
        ],
        "mcq_angles": [
            "Popcorn calcification significance: classic pathognomonic feature of a benign pulmonary hamartoma.",
            "Fleischner criteria threshold for follow-up: solid incidental nodules <6 mm in patients without high-risk features require no routine CT surveillance.",
            "Definition of nodule vs mass: <=30 mm diameter defines a nodule; >30 mm defines a mass and mandates staging for primary lung cancer."
        ],
        "case_hooks": [
            "A 62-year-old 40-pack-year smoker whose abdominal CT for diverticulitis incidentally reveals a 12-mm solitary spicular nodule in the right upper lobe.",
            "A 35-year-old non-smoker whose routine chest radiograph detects a 14-mm smooth coin lesion in the left lower lobe with classic internal popcorn calcification."
        ],
        "uncertainties": [
            "Diagnostic accuracy and cost-effectiveness of plasma circulating tumor DNA (ctDNA) and autoantibody biomarker panels in intermediate-risk 6-10 mm nodules.",
            "Surveillance interval and total follow-up duration (2 years vs 5 years) for pure ground-glass subsolid nodules exhibiting indolent growth."
        ]
    },

    "Source control in sepsis: timing and surgical indications": {
        "mentor_intro": "Source control—the physical removal, drainage, or debridement of an active infectious focus—is an emergency cornerstone of sepsis management coequal with antimicrobial therapy. Incomplete or delayed source control guarantees persistent bacteremia, multiorgan failure, and death.",
        "teaching_points": [
            "Source control encompasses four distinct physical interventions: drainage of purulent collections (abscesses, empyema), debridement of necrotic or infected tissue (necrotizing fasciitis, Fournier gangrene), removal of infected colonized devices (central lines, prosthetic hardware), and definitive restoration of anatomy/barrier integrity (perforated viscus repair).",
            "Surviving Sepsis Campaign (SSC) guidelines mandate that anatomical source control must be identified and successfully implemented as rapidly as clinically possible, ideally within 6 to 12 hours of sepsis presentation.",
            "Percutaneous ultrasound- or CT-guided drainage is the preferred first-line modality for well-localized intra-abdominal and retroperitoneal abscesses, achieving source control with lower physiological insult than open laparotomy in critically ill patients.",
            "Emergent surgical indications (<6 hours) include: necrotizing soft-tissue infections (mandatory emergent operative debridement), gastrointestinal perforation with free intraperitoneal air and peritonitis, acute mesenteric ischemia, infected obstructed urinary tract (requiring emergent retrograde stent or percutaneous nephrostomy), and acute ascending cholangitis (requiring urgent ERCP biliary decompression).",
            "In patients with suspected catheter-related bloodstream infections (CRBSI) presenting with septic shock, immediate removal of the intravascular catheter is mandatory, accompanied by paired peripheral and catheter blood cultures for differential time to positivity (DTTP)."
        ],
        "mcq_angles": [
            "Timing window for source control in sepsis: guidelines mandate achieving source control within 6 to 12 hours of diagnosis.",
            "Emergency intervention for septic obstructed pyelonephritis: emergency decompression via percutaneous nephrostomy or retrograde ureteral stenting; antibiotics alone fail in closed obstruction.",
            "Minimally invasive drainage preference: percutaneous catheter drainage is preferred over open surgery for well-demarcated intra-abdominal fluid collections."
        ],
        "case_hooks": [
            "A 58-year-old woman presenting in septic shock with a 6-mm obstructing left distal ureteral stone, hydronephrosis, and purulent urine on catheterization.",
            "A 66-year-old diabetic man presenting with severe septic shock, confusion, and extensive dusky purpuric skin changes with crepitus over the perineum and scrotum."
        ],
        "uncertainties": [
            "Optimal timing of delayed interval cholecystectomy following percutaneous cholecystostomy tube placement in critically ill calculous cholecystitis.",
            "Utility of damage control laparotomy with open abdomen (temporary abdominal closure) versus primary fascial closure in severe secondary peritonitis."
        ]
    },

    "Spinal Muscular Atrophy (SMA): SMN1/SMN2 copy numbers, nusinersen therapeutics": {
        "mentor_intro": "Spinal muscular atrophy (SMA) is an autosomal recessive neuromuscular disorder caused by homozygous deletion or mutation of the SMN1 gene, leading to progressive degeneration of lower motor neurons in the spinal cord. Modern disease-modifying therapies—antisense oligonucleotides, small molecule splicing modifiers, and gene replacement—have transformed SMA from a fatal infant disease into a treatable condition.",
        "teaching_points": [
            "Spinal muscular atrophy (SMA) is caused by homozygous loss-of-function mutations or deletions (approx. 95% exon 7/8 deletions) in the Survival Motor Neuron 1 (SMN1) gene located on chromosome 5q13, producing deficiency of SMN protein, which is essential for spliceosome assembly and alpha-motor neuron survival in the anterior horn of the spinal cord.",
            "SMN2 is a nearly identical centromeric duplicate gene that differs from SMN1 by a single critical C-to-T transition in exon 7, resulting in alternative splicing that excludes exon 7 (SMN-delta7) in 85–90% of transcripts, producing an unstable, truncated protein; SMN2 copy number (ranging from 1 to 5+) is the primary genetic modifier of disease severity, with higher copy numbers producing more functional protein and milder phenotypes.",
            "Nusinersen is an intrathecally administered 2'-O-methoxyethyl antisense oligonucleotide (ASO) that binds directly to the intronic splicing silencer N1 (ISS-N1) in SMN2 pre-mRNA, displacing negative splicing factors, promoting exon 7 inclusion, and restoring full-length functional SMN protein production in the central nervous system.",
            "In landmark randomized trials (ENDEAVOR and CHERISH), nusinersen demonstrated profound improvements in event-free survival, motor milestone achievement (head control, sitting, standing), and deceleration of respiratory decline in both infantile-onset (SMA Type 1) and later-onset (SMA Type 2/3) patients.",
            "Other approved targeted therapies include: Onasemnogene abeparvovec (an adeno-associated virus serotype 9 [AAV9] gene replacement therapy delivering a functional copy of the human SMN1 cDNA as a single IV infusion in children <2 years) and Risdiplam (an orally bioavailable small-molecule SMN2 splicing modifier)."
        ],
        "mcq_angles": [
            "Nusinersen molecular mechanism of action: antisense oligonucleotide targeting SMN2 pre-mRNA to promote exon 7 inclusion and restore full-length SMN protein.",
            "Primary genetic modifier of SMA severity: SMN2 gene copy number; higher copy numbers correlate with milder clinical phenotypes (Type 3/4 vs Type 1).",
            "Onasemnogene abeparvovec delivery vector: single-dose adeno-associated virus 9 (AAV9) vector delivering human SMN1 cDNA across the blood-brain barrier."
        ],
        "case_hooks": [
            "A 3-month-old infant presenting with profound generalized hypotonia ('floppy infant'), tongue fasciculations, bell-shaped chest, absent deep tendon reflexes, and homozygous SMN1 deletion with 2 copies of SMN2.",
            "An 8-year-old child with SMA Type 2 who lost the ability to sit independently, initiated on loading doses of intrathecal nusinersen."
        ],
        "uncertainties": [
            "Efficacy and neurodevelopmental superiority of combination therapy (gene replacement plus maintenance ASO or risdiplam) in symptomatic infants.",
            "Technical challenges and long-term delivery protocols for intrathecal nusinersen in patients with severe progressive scoliosis and prior spinal fusion."
        ]
    },

    "Spondylolysis and Spondylolisthesis": {
        "mentor_intro": "Spondylolysis represents a defect or stress fracture of the pars interarticularis, most commonly affecting the L5 vertebra in young athletes. Spondylolisthesis occurs when anterior displacement of the vertebral body ensues, producing mechanical axial back pain or radiculopathy.",
        "teaching_points": [
            "Spondylolysis is a fatigue stress fracture of the pars interarticularis (the bony bridge connecting superior and inferior articular processes), predominantly occurring at L5 (85–90%) and L4 (10–15%), provoked by repetitive hyperextension and rotation in young athletes (gymnasts, football linemen, cricket fast bowlers).",
            "Oblique lumbar radiographs classically demonstrate the 'Scotty dog' appearance, where a lucent defect in the pars resembles a 'collar' on the neck of the Scotty dog; however, thin-slice lumbar CT is the gold standard for defining bony union and fracture morphology, while MRI detects early pre-fracture bone marrow edema (stress reaction).",
            "Spondylolisthesis is the forward slippage of a superior vertebra on an inferior vertebra, graded by the Meyerding classification based on percentage of displacement: Grade I (<25%), Grade II (25-50%), Grade III (50-75%), Grade IV (75-100%), and Spondyloptosis (>100%).",
            "The two most common clinical subtypes are Isthmic spondylolisthesis (secondary to bilateral pars lysis in adolescents/young adults, classically L5-S1) and Degenerative spondylolisthesis (secondary to facet joint and intervertebral disc degeneration in older adults, classically L4-L5 with intact pars).",
            "First-line management for acute spondylolysis and low-grade isthmic spondylolisthesis (Grade I-II) is conservative: temporary cessation of sports, thoracolumbosacral orthosis (TLSO) bracing, and physical therapy focused on core stabilization and hamstring stretching; surgical fusion (lumbar interbody fusion) is reserved for progressive slippage, persistent neurological deficit, or intractable pain failing 6 months of rehabilitation."
        ],
        "mcq_angles": [
            "Classic radiological sign: collar on the 'Scotty dog' neck on oblique lumbar radiograph signifies a pars interarticularis defect (spondylolysis).",
            "Anatomical predilection: isthmic spondylolisthesis most commonly involves L5-S1; degenerative spondylolisthesis most commonly involves L4-L5.",
            "Meyerding classification: Grade I = <25% slippage; Grade II = 25-50%; Grade III = 50-75%; Grade IV = 75-100%; >100% = spondyloptosis."
        ],
        "case_hooks": [
            "A 15-year-old competitive gymnast presenting with 3 months of progressive low back pain exacerbated by spinal hyperextension and lumbar rotation.",
            "A 68-year-old woman presenting with neurogenic claudication (bilateral leg pain relieved by leaning forward) whose lumbar MRI reveals Grade I degenerative spondylolisthesis at L4-L5."
        ],
        "uncertainties": [
            "Clinical utility and healing rates of rigid versus non-rigid lumbar bracing in acute athletic pars stress reactions.",
            "Long-term adjacent segment pathology following minimally invasive transforaminal lumbar interbody fusion (MIS-TLIF) for isthmic spondylolisthesis."
        ]
    },

    "Spontaneous Pneumothorax": {
        "mentor_intro": "Spontaneous pneumothorax occurs without preceding trauma, divided into Primary Spontaneous Pneumothorax (PSP, in patients without overt underlying lung disease) and Secondary Spontaneous Pneumothorax (SSP, complicating preexisting lung pathology like COPD). Contemporary guidelines emphasize ambulatory, conservative management for stable PSP.",
        "teaching_points": [
            "Primary Spontaneous Pneumothorax (PSP) classically occurs in tall, thin young men (aged 15–35) and active cigarette smokers, caused by rupture of subpleural apical blebs or bullae; Secondary Spontaneous Pneumothorax (SSP) occurs in older patients with underlying lung disease (COPD/emphysema, cystic fibrosis, PCP pneumonia, lymphangioleiomyomatosis, Birt-Hogg-Dube syndrome) and carries significantly higher mortality.",
            "A landmark randomized trial (Brown et al., NEJM) demonstrated that a conservative observational approach (analgesia, room-air observation without pleural drainage) in selected stable, non-hypoxemic patients with moderate-to-large PSP resulted in 85% successful lung re-expansion and significantly lower hospital stay and complication rates than interventional chest tube drainage.",
            "For symptomatic or large PSP requiring intervention, small-bore pigtail catheter insertion (<=14 French) or needle aspiration is guideline-preferred over large-bore surgical chest tubes, causing substantially less pain with equivalent therapeutic efficacy.",
            "In secondary spontaneous pneumothorax (SSP), conservative observation is contraindicated due to compromised pulmonary reserve; all patients with symptomatic or moderate-to-large SSP require small-bore chest tube drainage and hospital admission.",
            "Indications for definitive thoracic surgical intervention (Video-Assisted Thoracoscopic Surgery [VATS] with mechanical pleurodesis / pleurectomy and blebectomy) include: second ipsilateral pneumothorax, first contralateral pneumothorax, bilateral spontaneous pneumothorax, persistent air leak (>3–5 days), or high-risk professions (pilots, commercial drivers, deep-sea divers)."
        ],
        "mcq_angles": [
            "Conservative management trial finding in PSP: stable patients with large PSP can be managed conservatively with analgesia and observation, reducing hospital days without increasing adverse events.",
            "Drainage catheter size recommendation: small-bore pigtail catheters (<=14 Fr) are non-inferior to large-bore chest tubes and cause significantly less pain.",
            "High-risk occupational absolute indications for surgical pleurodesis after first episode: airline pilots, military aviators, and scuba divers."
        ],
        "case_hooks": [
            "A 21-year-old tall, slender male smoker presenting with sudden right-sided pleuritic chest pain and 40% apical pneumothorax, remaining clinically stable with normal oxygen saturation.",
            "A 68-year-old man with severe GOLD stage IV COPD presenting with acute breathlessness, cyanosis, and a 2-cm right-sided secondary pneumothorax."
        ],
        "uncertainties": [
            "Comparative long-term recurrence rates of talc poudrage via medical thoracoscopy versus surgical VATS pleurectomy in recurrent PSP.",
            "Screening algorithms and genetic testing indications for Birt-Hogg-Dube syndrome (FLCN gene) in young patients with recurrent bilateral pneumothoraces."
        ]
    },

    "Spontaneous bacterial peritonitis vs secondary surgical peritonitis": {
        "mentor_intro": "Differentiating spontaneous bacterial peritonitis (SBP) from secondary surgical peritonitis in a cirrhotic patient with infected ascites is a critical clinical challenge. Misdiagnosing a surgically correctable perforated viscus as medical SBP carries fatal consequences.",
        "teaching_points": [
            "Spontaneous bacterial peritonitis (SBP) is an infection of preexisting ascitic fluid without an intra-abdominal surgically treatable source, caused by bacterial translocation of normal gut flora (typically single organism, monomicrobial: E. coli, Klebsiella pneumoniae, or Streptococci).",
            "Secondary peritonitis occurs when a direct anatomical breach of the gastrointestinal tract (perforated ulcer, perforated diverticulum, appendicitis, bowel ischemia) contaminates the peritoneal cavity in a patient with ascites, carrying mortality approaching 80–100% without emergent surgical intervention.",
            "Diagnostic paracentesis is the definitive first step: SBP is diagnosed when ascitic fluid absolute polymorphonuclear neutrophil (PMN) count is >=250/uL (>=0.25 x 10^9/L) in the absence of a surgically treatable source.",
            "Runyon's criteria differentiate secondary peritonitis from SBP: secondary peritonitis is strongly indicated when ascitic fluid meets at least two of the following three criteria: (1) Total protein >10 g/L (1.0 g/dL), (2) Glucose <2.8 mmol/L (<50 mg/dL), and (3) Lactate dehydrogenase (LDH) greater than the upper limit of normal for serum.",
            "Microbiological clues: recovery of multiple bacterial organisms (polymicrobial infection with anaerobes, enterococci, and mixed coliforms) or persistent/rising PMN count on repeat paracentesis 48 hours after starting antibiotics strongly indicates secondary surgical peritonitis, requiring emergent CT imaging and urgent surgical consultation."
        ],
        "mcq_angles": [
            "Runyon criteria for secondary peritonitis: ascitic fluid total protein >10 g/L, glucose <2.8 mmol/L, and LDH > serum ULN indicates perforated viscus rather than SBP.",
            "Microbiological pattern: monomicrobial flora (E. coli) characterizes SBP; polymicrobial growth with anaerobes indicates secondary surgical contamination.",
            "Paracentesis diagnostic threshold: PMN count >=250/uL mandates immediate empiric antibiotic therapy for SBP while awaiting culture."
        ],
        "case_hooks": [
            "A 54-year-old cirrhotic man presenting with fever, diffuse abdominal pain, and ascitic fluid PMN 1,200/uL, total protein 24 g/L, glucose 1.1 mmol/L, and LDH 450 U/L.",
            "A 60-year-old woman with decompensated cirrhosis whose ascitic fluid culture from paracentesis grows Bacteroides fragilis, Enterococcus faecalis, and Klebsiella."
        ],
        "uncertainties": [
            "Accuracy of point-of-care leukocyte esterase dipstick strips versus automated cell count in rapid rule-out of SBP in emergency settings.",
            "Safety and survival outcomes of diagnostic laparoscopy versus exploratory laparotomy in cirrhotic patients with suspected secondary peritonitis and high MELD scores."
        ]
    },

    "Spontaneous bacterial peritonitis: diagnosis, prophylaxis, treatment": {
        "mentor_intro": "Spontaneous bacterial peritonitis (SBP) is a common and severe complication of decompensated cirrhosis with ascites. Rapid diagnostic paracentesis, prompt empiric third-generation cephalosporin administration, intravenous albumin co-infusion, and secondary antibiotic prophylaxis form the evidence-based management bundle.",
        "teaching_points": [
            "Diagnostic paracentesis is mandatory in all cirrhotic patients hospitalized with ascites, and in outpatients with ascites who present with fever, abdominal pain, altered mental status (hepatic encephalopathy), gastrointestinal bleeding, or unexplained leukocytosis.",
            "Diagnostic confirmation requires an ascitic fluid polymorphonuclear neutrophil (PMN) count >=250 cells/uL (calculated as total ascitic WBC x % neutrophils); empirical antimicrobial therapy must be initiated immediately upon confirming PMN >=250/uL without waiting for culture results.",
            "Intravenous third-generation cephalosporins (cefotaxime 2 g IV every 8 hours or ceftriaxone 2 g IV every 24 hours) represent the standard empirical treatment of choice, achieving high peritoneal fluid penetration and resolution in >80–90% of community-acquired cases.",
            "Intravenous albumin infusion (1.5 g/kg body weight within 6 hours of diagnosis, followed by 1.0 g/kg on day 3) combined with antibiotics significantly reduces the incidence of hepatorenal syndrome (from 33% to 10%) and reduces hospital mortality (from 29% to 10%) compared to antibiotics alone (Sort et al., NEJM).",
            "Secondary antibiotic prophylaxis with long-term oral fluoroquinolones (ciprofloxacin 500 mg daily or norfloxacin 400 mg daily) or trimethoprim-sulfamethoxazole is mandatory for all patients who survive an episode of SBP, reducing 1-year recurrence from >70% to <20%; primary prophylaxis is indicated in acute variceal bleeding (ceftriaxone 1 g/day for 7 days) and in high-risk ascitic cirrhosis (ascitic protein <15 g/L with renal/hepatic impairment)."
        ],
        "mcq_angles": [
            "Sort trial landmark finding: IV albumin (1.5 g/kg day 1, 1.0 g/kg day 3) reduces hepatorenal syndrome and improves survival in SBP.",
            "Diagnostic PMN threshold: ascitic PMN >=250/uL confirms SBP and mandates immediate antibiotic therapy.",
            "Primary prophylaxis in acute variceal bleeding: 7-day course of IV ceftriaxone reduces bacteremia, SBP, rebleeding, and mortality."
        ],
        "case_hooks": [
            "A 52-year-old cirrhotic man admitted with mild lethargy and low-grade fever whose diagnostic tap shows straw-colored ascites with 450 WBC/uL and 70% PMNs (PMN 315/uL).",
            "A 48-year-old woman recovering from treated SBP evaluated for discharge orders regarding secondary antibiotic prophylaxis and liver transplant waitlisting."
        ],
        "uncertainties": [
            "Empiric antibiotic regimens for nosocomial SBP in regions with high prevalence of extended-spectrum beta-lactamase (ESBL) and carbapenemase-producing Enterobacteriaceae.",
            "Duration of secondary antibiotic prophylaxis and safety of cycling antibiotic classes to prevent antimicrobial resistance."
        ]
    },

    "Spontaneous coronary artery dissection": {
        "mentor_intro": "Spontaneous coronary artery dissection (SCAD) is an increasingly recognized non-atherosclerotic cause of acute myocardial infarction, predominantly affecting young to middle-aged women without traditional cardiovascular risk factors. Management diverges sharply from atherosclerotic ACS, prioritizing conservative medical therapy over percutaneous revascularization.",
        "teaching_points": [
            "SCAD is defined as non-traumatic, non-iatrogenic, and non-atherosclerotic separation of the coronary arterial wall layers, creating a false lumen that compresses the true lumen and precipitates acute myocardial ischemia; it accounts for up to 25–35% of acute coronary syndromes in women aged <50 and is the most common cause of pregnancy-associated myocardial infarction.",
            "Pathophysiology involves either an intimal tear leading to false lumen dissection or spontaneous disruption of the vasa vasorum producing an intramural hematoma within the tunica media; strong associations exist with fibromuscular dysplasia (FMD, found in >50% of screened patients), multiparity, emotional/physical stressors, and connective tissue disorders.",
            "Coronary angiography characteristically reveals three angiographic patterns (Yip-Saw classification): Type 1 (classic pathognomonic multiple radiolucent lumens with contrast wall staining), Type 2 (most common, smooth diffuse long narrowing >20 mm, often overlooked as normal/spasm), and Type 3 (focal stenosis mimicking atherosclerotic plaque, requiring intravascular imaging [OCT or IVUS] for confirmation).",
            "Conservative medical management is the primary recommended strategy in hemodynamically stable patients with preserved TIMI 2/3 coronary flow, as >90% of dissected vessels spontaneously heal and thrombose over 30 to 90 days; PCI in SCAD carries high technical failure rates (>50%) and risks extending the intramural hematoma proximally and distally.",
            "Percutaneous coronary intervention (PCI) or emergency CABG is reserved strictly for high-risk presentations: ongoing active myocardial ischemia, hemodynamic instability/cardiogenic shock, sustained ventricular arrhythmias, or left main coronary artery dissection."
        ],
        "mcq_angles": [
            "First-line treatment strategy for stable SCAD: conservative medical therapy with observation; routine PCI is avoided due to high risk of propagating the dissection.",
            "Screening requirement: comprehensive vascular screening from brain to pelvis (CT or MR angiography) is recommended to identify extracoronary vascular abnormalities, predominantly Fibromuscular Dysplasia (FMD).",
            "Demographic hallmark: predominantly affects young to middle-aged females without conventional cardiovascular risk factors; leading cause of pregnancy-associated acute MI."
        ],
        "case_hooks": [
            "A 38-year-old previously healthy woman 6 weeks postpartum presenting with crushing retrosternal chest pain, ST-elevation in V2-V5, and diffuse mid-to-distal LAD narrowing (Type 2 SCAD) on emergent angiography.",
            "A 44-year-old woman recovering from a conservative course of SCAD who undergoes screening CT angiography of the renal and carotid arteries."
        ],
        "uncertainties": [
            "Optimal antithrombotic strategy: benefit versus bleeding risk of single antiplatelet therapy (aspirin) versus short-term dual antiplatelet therapy in medically managed SCAD.",
            "Recurrence risk stratification and safety of subsequent pregnancies in women who have experienced pregnancy-associated SCAD."
        ]
    },

    "Squamous Cell Carcinoma of Head and Neck": {
        "mentor_intro": "Head and neck squamous cell carcinoma (HNSCC) encompasses epithelial malignancies of the oral cavity, pharynx, and larynx. The epidemiological landscape has bifurcated into traditional tobacco/alcohol-induced disease and human papillomavirus (HPV)-associated oropharyngeal carcinoma, which carries a vastly superior oncological prognosis.",
        "teaching_points": [
            "HNSCC arises from the mucosal lining of the upper aerodigestive tract; risk factors are divided into traditional toxic exposures (heavy tobacco smoking, alcohol abuse, betel nut chewing) and high-risk oncogenic Human Papillomavirus infection (predominantly HPV type 16), which accounts for the dramatic surge in oropharyngeal (tonsil and base of tongue) carcinomas in younger non-smokers.",
            "HPV-associated oropharyngeal cancer is established using p16 immunohistochemistry as a surrogate marker (p16 overexpression secondary to functional inactivation of the Rb protein by viral oncoprotein E7); the AJCC 8th edition staging manual classifies HPV-positive (p16+) oropharyngeal cancer into a distinct staging system reflecting its vastly superior overall survival.",
            "Diagnostic evaluation requires flexible fiberoptic nasoendoscopy with photo-documentation, comprehensive contrast-enhanced neck CT or MRI, PET-CT to exclude distant metastases (lungs, liver, bone) in advanced nodal disease, and ultrasound-guided fine-needle aspiration (FNA) of suspicious cervical lymph nodes.",
            "For early-stage disease (Stage I-II), single-modality therapy (transoral robotic surgery [TORS] / transoral laser microsurgery or definitive radiotherapy) achieves high cure rates with equivalent survival; locally advanced disease (Stage III-IV) requires multimodality therapy: concurrent chemoradiotherapy (definitive high-dose cisplatin 100 mg/m2 every 3 weeks with intensity-modulated radiation therapy [IMRT]) or primary surgery followed by risk-adapted adjuvant chemoradiotherapy (in the presence of positive surgical margins or extranodal extension [ENE]).",
            "In recurrent or metastatic HNSCC, the landmark KEYNOTE-048 trial established frontline immunotherapy with the anti-PD-1 antibody pembrolizumab (alone in tumors with PD-L1 Combined Positive Score [CPS] >=1, or combined with platinum and 5-FU chemotherapy regardless of CPS) as superior to the historical standard EXTREME regimen."
        ],
        "mcq_angles": [
            "Surrogate biomarker for oncogenic HPV in oropharyngeal cancer: p16 overexpression by immunohistochemistry, correlating with marked radiosensitivity and favorable prognosis.",
            "Indication for adjuvant concurrent chemoradiation: presence of extracapsular/extranodal extension (ENE) in cervical lymph nodes or microscopically positive surgical margins.",
            "Frontline systemic therapy for recurrent/metastatic HNSCC: pembrolizumab (monotherapy for CPS >=1, or with chemotherapy) based on the KEYNOTE-048 trial."
        ],
        "case_hooks": [
            "A 52-year-old non-smoking man presenting with a painless, firm 3-cm cystic mass in level II of the right neck, with biopsy confirming p16-positive squamous cell carcinoma.",
            "A 68-year-old heavy smoker and drinker presenting with progressive hoarseness, dysphagia, and an ulcerated exophytic mass on the true vocal cord."
        ],
        "uncertainties": [
            "Oncological safety of de-escalation / de-intensification strategies (reduced radiation doses, omitting chemotherapy, or TORS alone) in low-risk HPV-positive oropharyngeal cancer.",
            "Optimal management of the clinically node-negative (cN0) neck in early oral tongue carcinoma: elective neck dissection versus watchful ultrasound surveillance."
        ]
    },

    "Stable angina medical therapy versus PCI": {
        "mentor_intro": "In chronic coronary disease (stable ischemic heart disease), the primary goal of revascularization is symptom relief and quality of life enhancement. Landmark randomized trials have firmly established that percutaneous coronary intervention (PCI) does not reduce myocardial infarction or all-cause mortality compared with optimal medical therapy alone in patients without high-risk anatomy.",
        "teaching_points": [
            "The landmark COURAGE trial (2,287 patients) and the definitive ISCHEMIA trial (5,179 patients with stable coronary disease and moderate-to-severe ischemia on functional stress testing) demonstrated that an initial invasive strategy (coronary angiography and PCI/CABG) added to guideline-directed medical therapy did NOT reduce all-cause mortality, cardiovascular death, or myocardial infarction compared with an initial conservative medical strategy.",
            "In the blinded, sham-controlled ORBITA and ORBITA-2 randomized trials, PCI provided a statistically significant improvement in angina-free days and exercise time compared with a sham procedure, but confirmed that the primary clinical benefit of PCI in stable angina is antianginal symptom relief rather than prognostic survival extension.",
            "Prognostic indications for coronary revascularization (where revascularization improves survival over medical therapy) are restricted to high-risk anatomical disease: significant unprotected left main coronary artery stenosis (>=50%), severe three-vessel disease (especially with diabetes or proximal LAD involvement), and multivessel disease with severe left ventricular systolic dysfunction (LVEF <=35%).",
            "Optimal Medical Therapy (OMT) incorporates two parallel therapeutic goals: (1) Prognostic cardiovascular risk reduction (high-intensity statin, aspirin, ACEi/ARB for hypertension/diabetes/LV dysfunction), and (2) Antianginal anti-ischemic symptom control (first-line beta-blockers and/or calcium channel blockers; second-line long-acting nitrates, nicorandil, ranolazine, or ivabradine).",
            "An invasive strategy with PCI is guideline-recommended for patients whose angina symptoms persist and limit quality of life despite adherence to optimal medical therapy with at least two antianginal drug classes."
        ],
        "mcq_angles": [
            "ISCHEMIA trial primary outcome: an initial invasive strategy (routine angiography and PCI) did NOT reduce major adverse cardiac events or death over conservative medical therapy in stable coronary disease.",
            "ORBITA-2 trial clinical takeaway: PCI improves exercise capacity and reduces angina burden compared to sham, establishing symptom control as the primary indication for PCI.",
            "Anatomical exception where revascularization confers a survival advantage: unprotected left main stenosis (>=50%) and complex multivessel disease with impaired LV function."
        ],
        "case_hooks": [
            "A 64-year-old man with CCS Class II stable angina on bisoprolol 5 mg and aspirin with an exercise stress test showing 1.5 mm horizontal ST-depression, inquiring whether a coronary stent will prevent a heart attack.",
            "A 70-year-old woman with persistent exertional angina despite maximal doses of metoprolol succinate and amlodipine, referred for elective fractional flow reserve (FFR)-guided PCI."
        ],
        "uncertainties": [
            "Prognostic impact of complete versus incomplete revascularization in patients with multivessel stable coronary disease undergoing elective PCI.",
            "Long-term cognitive and microvascular outcomes in elderly patients maintained on multi-drug antianginal regimens versus early elective percutaneous revascularization."
        ]
    },

    "Stable coronary disease invasive strategy": {
        "mentor_intro": "Selecting an invasive catheterization strategy in chronic coronary disease requires precise risk stratification using non-invasive imaging, physiology, and anatomical scores. Invasive management is directed at high-risk coronary anatomy, left ventricular impairment, and refractory angina.",
        "teaching_points": [
            "Non-invasive functional imaging (dobutamine stress echocardiography, myocardial perfusion scintigraphy, stress cardiac MRI) or anatomical evaluation with coronary CT angiography (CCTA) provides primary initial risk stratification to exclude high-risk features before considering invasive catheterization.",
            "Invasive physiological lesion assessment using Fractional Flow Reserve (FFR <=0.80) or non-hyperemic resting pressure ratios (Instantaneous Wave-Free Ratio [iFR <=0.89]) is recommended (Class I) during coronary angiography to guide PCI, demonstrating that deferring revascularization of hemodynamically non-significant lesions is safe and reduces unnecessary stent placement (FAME trials).",
            "In patients with severe multivessel coronary disease, multidisciplinary Heart Team consultation is recommended to calculate the SYNTAX score: low complexity (SYNTAX <=22) shows equivalent long-term outcomes with PCI or CABG; high complexity (SYNTAX >=33) or concurrent diabetes mellitus strongly favors Coronary Artery Bypass Grafting (CABG) for superior long-term survival and lower repeat revascularization.",
            "The STICH and STICHES trials demonstrated that in patients with ischemic cardiomyopathy (LVEF <=35%) and multivessel coronary disease, surgical revascularization (CABG) combined with medical therapy significantly reduced 10-year all-cause mortality compared with medical therapy alone.",
            "Coronary artery bypass grafting (CABG) is guideline-preferred over PCI in complex multivessel disease with high atherosclerotic burden, diffuse chronic total occlusions, left main bifurcation lesions, and in diabetic patients requiring insulin."
        ],
        "mcq_angles": [
            "Physiological revascularization thresholds: FFR <=0.80 or iFR <=0.89 confirms hemodynamically significant ischemia warranting revascularization; lesions above these cutoffs should be managed medically.",
            "STICH trial landmark finding: surgical revascularization (CABG) improves 10-year survival in patients with severe ischemic cardiomyopathy (LVEF <=35%) over medical therapy.",
            "SYNTAX score utility: stratifies anatomical coronary complexity; high SYNTAX scores (>=33) dictate CABG over PCI to achieve durable survival benefits."
        ],
        "case_hooks": [
            "A 60-year-old diabetic man whose coronary angiogram demonstrates 70% ostial LAD, 80% circumflex, and 90% RCA disease with a calculated SYNTAX score of 36.",
            "A 66-year-old woman undergoing angiography for exertional angina whose intermediate 60% mid-LAD stenosis has an invasive FFR of 0.86, prompting deferral of stent placement."
        ],
        "uncertainties": [
            "Clinical equivalence of quantitative flow ratio (QFR) and CT-derived FFR (FFR-CT) compared to standard wire-based invasive physiological pressure wire measurements.",
            "Optimal revascularization strategy (CABG vs PCI with contemporary drug-eluting stents) in end-stage renal disease patients on chronic maintenance hemodialysis."
        ]
    },

    "Staphylococcus aureus bacteraemia: MRSA vs MSSA, vancomycin, daptomycin, duration of therapy": {
        "mentor_intro": "Staphylococcus aureus bacteremia (SAB) carries a formidable 30-day mortality approaching 20–25%. Management requires routine evaluation for deep metastatic seeding, differentiating Methicillin-Susceptible (MSSA) from Methicillin-Resistant (MRSA) strains, mandatory echocardiography, and adherence to minimum treatment durations.",
        "teaching_points": [
            "Staphylococcus aureus bacteremia (SAB) is never considered a contaminant on blood cultures; identification of a single bottle growing S. aureus mandates immediate diagnostic investigation for deep metastatic seeding (infective endocarditis, vertebral osteomyelitis, psoas abscess, septic thrombophlebitis).",
            "For Methicillin-Susceptible S. aureus (MSSA), antistaphylococcal beta-lactams (flucloxacillin 2 g IV q4h, oxacillin/nafcillin 2 g IV q4h, or cefazolin 2 g IV q8h) are vastly superior to vancomycin, demonstrating significantly lower treatment failure and all-cause mortality; vancomycin is inferior for MSSA and must be discontinued once methicillin susceptibility is established.",
            "For Methicillin-Resistant S. aureus (MRSA), intravenous vancomycin (dosed to target an AUC24/MIC of 400–600 mg*h/L) or daptomycin (high-dose: 8–10 mg/kg IV once daily) are evidence-based first-line options; daptomycin is inactivated by pulmonary surfactant and is contraindicated in MRSA pneumonia, but is preferred in bacteremia with high vancomycin MIC (>1.5 ug/mL) or renal dysfunction.",
            "Echocardiography is mandatory in all adults with SAB: transesophageal echocardiography (TEE) is strongly recommended due to its superior sensitivity (>90–95% vs ~50-70% for TTE) in detecting vegetation, perivalvular abscesses, and leaflet perforation, especially in persistent bacteremia or prosthetic valves.",
            "Duration of antimicrobial therapy is stratified into: Uncomplicated SAB (requires negative follow-up blood cultures at 48-72h, defervescence within 72h, no prosthetic hardware, normal TEE, and removable focus; treated for a minimum of 14 days IV) versus Complicated SAB (metastatic seeding, endocarditis, persistent bacteremia >72h; treated for a minimum of 4 to 6 weeks IV)."
        ],
        "mcq_angles": [
            "Beta-lactam superiority in MSSA: switching from vancomycin to flucloxacillin or cefazolin significantly reduces 30-day mortality in confirmed MSSA bacteremia.",
            "Daptomycin contraindication: daptomycin is inactivated by pulmonary surfactant and must NEVER be used for MRSA pneumonia.",
            "Minimum duration for uncomplicated SAB: exactly 14 days of intravenous therapy; shorter durations (<14 days) lead to unacceptable rates of late relapse and endocarditis."
        ],
        "case_hooks": [
            "A 56-year-old hemodialysis patient with a tunnelled line presenting with chills and positive blood cultures growing MSSA, whose vancomycin is discontinued in favor of IV cefazolin.",
            "A 42-year-old IV drug user with persistent MRSA bacteremia on day 4 of vancomycin with vancomycin MIC 2.0 ug/mL, switched to high-dose daptomycin (10 mg/kg)."
        ],
        "uncertainties": [
            "Safety and non-inferiority of early oral antibiotic step-down therapy (SABATO trial) in strictly defined low-risk uncomplicated SAB patients.",
            "Efficacy of synergistic combination therapy (e.g., daptomycin plus ceftaroline or beta-lactam) in refractory, persistent MRSA bacteremia."
        ]
    },

    "Staphylococcus aureus bacteremia diagnostic workup and duration": {
        "mentor_intro": "A protocolized diagnostic and therapeutic workup is mandatory for every case of Staphylococcus aureus bacteremia. Standardized infectious disease consultation, daily follow-up blood cultures, structured echocardiography, and focus eradication directly decrease patient mortality.",
        "teaching_points": [
            "Formal Infectious Diseases (ID) clinical consultation in S. aureus bacteremia is an evidence-based quality indicator that significantly reduces 30-day and 90-day patient mortality, promotes guideline-adherent echocardiography, and ensures appropriate duration of targeted intravenous therapy.",
            "Repeat blood cultures must be drawn every 24 to 48 hours until bacterial clearance is documented; the duration of bacteremia is calculated from the first negative culture, and persistent bacteremia >=72 hours is a major predictor of infective endocarditis and metastatic complications.",
            "Diagnostic workup must identify the primary entry portal and metastatic foci: daily physical examination for splinter hemorrhages, Janeway lesions, Osler nodes, and new heart murmurs; urgent spine MRI if focal back pain or tenderness is present to exclude vertebral osteomyelitis and epidural abscess.",
            "Infective endocarditis occurs in 10–25% of patients with SAB; a high-sensitivity risk-stratification algorithm (e.g., POSITIVE or VIRSTA score) guides timing between initial transthoracic echocardiography (TTE) and definitive transesophageal echocardiography (TEE).",
            "Immediate eradication of infected foreign hardware: removable potential sources (peripheral IV lines, central venous catheters, infected arteriovenous grafts) must be removed promptly within 24 to 48 hours; failure to remove infected catheters results in persistent bacteremia and high relapse rates."
        ],
        "mcq_angles": [
            "Monitoring for bacterial clearance: daily or alternate-day repeat blood cultures must be drawn until microbiological clearance is documented; defines start of treatment duration.",
            "Infectious Diseases consultation benefit: routine ID consultation significantly reduces mortality in all cases of Staphylococcus aureus bacteremia.",
            "Diagnostic red flag: any localized back pain or spinal tenderness in a patient with SAB mandates urgent MRI of the whole spine to rule out epidural abscess."
        ],
        "case_hooks": [
            "A 68-year-old man with a temporary femoral catheter who develops MSSA bacteremia, undergoing daily follow-up cultures and catheter removal.",
            "A 50-year-old woman with SAB and severe low back pain with normal neurological exam, undergoing urgent contrast-enhanced spine MRI."
        ],
        "uncertainties": [
            "Criteria for omitting TEE in low-risk community-acquired SAB with negative TTE and rapid clearance (<48 hours) without prosthetic material.",
            "Role of routine total-body 18F-FDG PET-CT in detecting occult metastatic infectious seeding in prolonged bacteremia."
        ]
    },

    "Statin-induced necrotising autoimmune myopathy: HMGCR antibody management": {
        "mentor_intro": "Statin-induced necrotizing autoimmune myopathy (NAM / IMNM) is a rare, severe autoimmune myopathy characterized by persistent proximal muscle weakness and markedly elevated creatine kinase that progresses despite statin discontinuation. Detection of anti-HMGCR autoantibodies and aggressive multi-agent immunosuppression are required.",
        "teaching_points": [
            "Statin-induced necrotizing autoimmune myopathy is distinct from self-limiting toxic statin myopathy: clinical muscle weakness and severe rhabdomyolysis persist and paradoxically worsen even after the offending statin has been completely discontinued.",
            "The immunological hallmark is the presence of circulating autoantibodies directed against 3-hydroxy-3-methylglutaryl-coenzyme A reductase (anti-HMGCR antibodies), which can be triggered by prior statin exposure (up to 90% of cases) or uncommonly arise spontaneously in statin-naive patients.",
            "Serum creatine kinase (CK) levels are characteristically markedly elevated, typically ranging between 5,000 and 20,000+ U/L (often >10–50 times the upper limit of normal), accompanied by severe symmetric proximal muscle weakness (difficulty climbing stairs, rising from chairs, or lifting arms).",
            "Muscle biopsy confirms necrotizing myopathy without significant lymphocytic inflammation, displaying prominent myofiber necrosis, macrophage-mediated phagocytosis, and prominent myocyte regeneration with sarcolemmal upregulation of MHC Class I.",
            "Management mandates immediate, permanent cessation of all statins and urgent aggressive combination immunosuppression: high-dose oral corticosteroids (prednisone 1 mg/kg/day or IV methylprednisolone pulses) combined with methotrexate, azathioprine, or intravenous immunoglobulin (IVIG); refractory cases respond favorably to B-cell depletion with rituximab."
        ],
        "mcq_angles": [
            "Key diagnostic antibody: anti-HMGCR (anti-3-hydroxy-3-methylglutaryl-coenzyme A reductase) autoantibody confirms the diagnosis of statin-associated autoimmune necrotizing myopathy.",
            "Distinction from benign toxic myopathy: toxic statin myopathy resolves within weeks of stopping statins; necrotizing autoimmune myopathy persists and worsens, requiring immunosuppressive therapy.",
            "Histological hallmark on muscle biopsy: extensive myofiber necrosis and phagocytosis with pauci-immune/minimal lymphocytic inflammatory infiltrates."
        ],
        "case_hooks": [
            "A 66-year-old man who took atorvastatin 40 mg for 5 years presenting with progressive inability to walk, serum CK 12,500 U/L, and positive anti-HMGCR antibodies that worsen 2 months after stopping the statin.",
            "A 58-year-old woman with biopsy-proven anti-HMGCR necrotizing myopathy initiated on intravenous immunoglobulin (IVIG) and oral prednisone."
        ],
        "uncertainties": [
            "Long-term cardiovascular lipid-lowering alternatives (PCSK9 inhibitors, bempedoic acid, ezetimibe) safety and tolerability in patients with resolved anti-HMGCR NAM.",
            "Prognostic significance of serial anti-HMGCR antibody titers in guiding immunosuppressive tapering and detecting disease flares."
        ]
    },

    "Status epilepticus emergency treatment": {
        "mentor_intro": "Status epilepticus is a major neurological emergency defined by failure of seizure termination mechanisms, leading to abnormally prolonged continuous seizures (>5 minutes) or recurrent seizures without recovery of consciousness. Rapid, protocolized pharmacological escalation is critical to prevent permanent excitotoxic neuronal injury.",
        "teaching_points": [
            "The International League Against Epilepsy (ILAE) defines status epilepticus using two operational time points: Time 1 (t1 = 5 minutes for convulsive status epilepticus), when treatment must be initiated to prevent prolonged seizures, and Time 2 (t2 = 30 minutes), beyond which irreversible excitotoxic neuronal death, systemic complications, and pharmacoresistance develop.",
            "First-line emergency pharmacotherapy (Phase 1, 0–5 minutes) is a full-dose parenteral benzodiazepine: intravenous lorazepam (0.1 mg/kg, typically 4 mg IV bolus) or intramuscular midazolam (10 mg IM for adults >40 kg, preferred when IV access is not yet established); alternative is rectal diazepam (10–20 mg).",
            "Under-dosing of first-line benzodiazepines is the most common clinical error in status epilepticus management and directly increases the risk of progression to refractory status epilepticus; if seizures persist at 5 to 10 minutes, a second dose of benzodiazepine should be administered.",
            "Second-line emergency pharmacotherapy (Phase 2, 10–20 minutes) must be initiated immediately if seizures persist despite adequate benzodiazepines: IV levetiracetam (60 mg/kg, max 4,500 mg), IV fosphenytoin (20 mg PE/kg, max 1,500 mg PE), or IV sodium valproate (40 mg/kg, max 3,000 mg); the landmark ESETT trial demonstrated equivalent ~50% seizure cessation efficacy and safety across all three second-line agents.",
            "Concurrent physiological stabilization mandates airway protection, supplemental oxygen, capillary blood glucose testing (administer IV dextrose 50% with thiamine if hypoglycemic), vital signs monitoring, and establishing continuous EEG."
        ],
        "mcq_angles": [
            "ESETT trial landmark finding: levetiracetam, fosphenytoin, and sodium valproate have equivalent ~50% efficacy in terminating benzodiazepine-refractory status epilepticus.",
            "Intramuscular route of choice when IV access is absent: intramuscular midazolam (10 mg IM) is superior to intravenous lorazepam due to faster administration time (RAMPART trial).",
            "Operational time definition (t1 and t2): convulsive status epilepticus requires active emergency treatment starting at 5 minutes (t1) to prevent neuronal injury occurring at 30 minutes (t2)."
        ],
        "case_hooks": [
            "A 32-year-old woman with known epilepsy brought by paramedics with generalized tonic-clonic convulsions persisting for 8 minutes, with no peripheral IV access established.",
            "A 45-year-old man who continues to seize 10 minutes after receiving 8 mg total of IV lorazepam, requiring rapid second-line non-sedating antiepileptic infusion."
        ],
        "uncertainties": [
            "Efficacy and cardiac safety of intravenous brivaracetam or lacosamide as second-line alternatives to levetiracetam in elderly patients.",
            "Therapeutic utility and optimal timing of early continuous video-EEG monitoring in identifying non-convulsive status epilepticus following motor seizure cessation."
        ]
    },

    "Status epilepticus management in the ICU: refractory and super-refractory": {
        "mentor_intro": "Refractory status epilepticus (RSE) occurs when seizures persist despite first-line benzodiazepines and second-line antiepileptic drugs. Management requires intensive care admission, endotracheal intubation, continuous anesthetic infusions, and continuous electroencephalography (cEEG) to titrate burst suppression.",
        "teaching_points": [
            "Refractory status epilepticus (RSE) is defined as persistent convulsive or non-convulsive seizures despite the administration of adequate doses of a first-line benzodiazepine and at least one second-line intravenous non-sedating antiepileptic drug (levetiracetam, fosphenytoin, or valproate).",
            "Super-refractory status epilepticus (SRSE) is defined as status epilepticus that continues or recurs for 24 hours or more after the initiation of general anesthetic infusions, including cases where seizures relapse upon anesthetic reduction or weaning.",
            "Management of RSE mandates immediate endotracheal intubation, mechanical ventilation, invasive arterial pressure monitoring, and continuous intravenous general anesthetic infusions: continuous propofol (2–10 mg/kg/h), midazolam (0.2–2.0 mg/kg/h), or ketamine (1–5 mg/kg/h); anesthetic dosing is titrated to electrographic seizure cessation or electroencephalographic burst suppression (10–15 seconds of flatline between bursts).",
            "Ketamine—an NMDA receptor antagonist—is increasingly utilized in prolonged status epilepticus because chronic prolonged seizure activity downregulates synaptic inhibitory GABA-A receptors and upregulates excitatory NMDA receptors, rendering traditional GABA-ergic anesthetics ineffective.",
            "New-Onset Refractory Status Epilepticus (NORSE) and Febrile Infection-Related Epilepsy Syndrome (FIRES) represent catastrophic clinical presentations often secondary to autoimmune or paraneoplastic encephalitis; early initiation of high-dose corticosteroids, IVIG, or plasma exchange is indicated even before autoantibody results return."
        ],
        "mcq_angles": [
            "Receptor trafficking in prolonged status epilepticus: synaptic GABA-A receptors are internalized and degraded while NMDA receptors migrate to the synapse, explaining why GABA-ergic drugs lose efficacy and NMDA antagonists (ketamine) are effective.",
            "EEG endpoint for anesthetic titration: titrate continuous IV anesthetics to complete electrographic seizure suppression or an established burst-suppression pattern on continuous EEG.",
            "Definition of Super-Refractory Status Epilepticus: status epilepticus persisting >=24 hours after commencing therapeutic general anesthesia."
        ],
        "case_hooks": [
            "A 28-year-old previously healthy woman who develops continuous generalized seizures refractory to lorazepam, levetiracetam, and fosphenytoin, admitted to the ICU for intubation and propofol infusion.",
            "A 22-year-old man with cryptogenic NORSE who experiences recurrent electrographic status epilepticus every time midazolam infusion is weaned below 0.5 mg/kg/h, initiated on IV ketamine."
        ],
        "uncertainties": [
            "Optimal duration of burst suppression (24 hours vs 48 hours) prior to attempting the first anesthetic weaning trial.",
            "Therapeutic efficacy of targeted anti-IL-1 (anakinra) or anti-IL-6 (tocilizumab) cytokine blockade in pediatric and adult FIRES/NORSE."
        ]
    },

    "Status epilepticus pharmacotherapy": {
        "mentor_intro": "The pharmacological escalation ladder in status epilepticus follows a strict time-sensitive three-phase hierarchy. Rapid progression from benzodiazepines to non-sedating antiepileptic infusions and general anesthetics prevents neuronal loss and reduces status-associated mortality.",
        "teaching_points": [
            "Phase 1 (Initial Emergent Therapy, 0–5 minutes): Full-dose benzodiazepines. Intravenous lorazepam (4 mg IV slow bolus) is first-line when IV access is present; intramuscular midazolam (10 mg IM) is preferred when IV access is delayed; rectal diazepam (10–20 mg) or buccal midazolam are alternatives outside medical facilities.",
            "Phase 2 (Urgent Control Therapy, 10–20 minutes): Second-line non-sedating intravenous antiepileptic drugs administered as rapid IV infusions over 10 to 15 minutes: Levetiracetam (60 mg/kg, max 4,500 mg), Fosphenytoin (20 mg PE/kg, max 1,500 mg PE), or Sodium Valproate (40 mg/kg, max 3,000 mg); ESETT trial confirmed equal 47% efficacy across all three.",
            "Fosphenytoin is a water-soluble prodrug of phenytoin that can be infused rapidly (up to 150 mg PE/min) without the risk of solvent-induced propylene glycol cardiac toxicity, severe hypotension, arrhythmias, or 'purple glove syndrome' associated with traditional intravenous phenytoin.",
            "Sodium valproate is particularly advantageous in patients with generalized genetic or myoclonic epilepsies, but is contraindicated in suspected mitochondrial cytopathies (POLG gene mutations, where it triggers fatal hepatic failure) and pregnancy.",
            "Phase 3 (Refractory Status Therapy, 20–60+ minutes): Continuous general anesthetic infusions requiring mechanical ventilation: propofol, midazolam, or ketamine; second-line antiepileptic agents must be maintained at therapeutic maintenance doses concurrently to provide baseline anti-seizure coverage while anesthetics are weaned."
        ],
        "mcq_angles": [
            "Fosphenytoin advantage over phenytoin: water-soluble prodrug dissolved in aqueous solution without propylene glycol, eliminating purple glove syndrome and allowing faster infusion rates.",
            "Valproate contraindication: absolute contraindication in patients with POLG mutations or urea cycle disorders due to acute fulminant hepatic necrosis and hyperammonemic coma.",
            "Maintenance antiepileptic coverage: background maintenance antiepileptics must be continued during continuous IV general anesthesia to prevent immediate rebound seizures upon weaning."
        ],
        "case_hooks": [
            "A 30-year-old man presenting in active status epilepticus who receives 10 mg IM midazolam in the field, arriving in the ED with ongoing seizures, receiving IV levetiracetam 60 mg/kg.",
            "A 24-year-old woman with a history of myoclonic epilepsy in status epilepticus receiving IV sodium valproate 40 mg/kg infusion."
        ],
        "uncertainties": [
            "Role of intravenous lacosamide (400 mg bolus) as an alternative second-line agent in patients with cardiovascular or hepatic comorbidities.",
            "Optimal timing for introducing inhaled volatile anesthetics (isoflurane) in super-refractory status epilepticus unresponsive to intravenous anesthetics."
        ]
    },

    "Steroids in community acquired pneumonia": {
        "mentor_intro": "The role of adjunctive corticosteroids in community-acquired pneumonia (CAP) has been clarified by landmark multicenter randomized clinical trials. Routine use is not recommended for mild-to-moderate CAP, but adjunctive hydrocortisone provides significant mortality and clinical benefits in severe CAP admitted to the ICU.",
        "teaching_points": [
            "The landmark CAPE COD randomized controlled trial (795 ICU patients with severe CAP) demonstrated that early administration of intravenous hydrocortisone (200 mg daily, continuous infusion or 50 mg every 6 hours for 4 to 8 days) significantly reduced 28-day all-cause mortality (6.2% vs 11.9%; absolute reduction 5.7%, P=0.006) compared with placebo.",
            "In the CAPE COD trial, adjunctive hydrocortisone also significantly reduced the need for subsequent invasive mechanical ventilation and endotracheal intubation in patients receiving high-flow nasal oxygen, and reduced the need for vasopressor initiation for septic shock.",
            "Clinical practice guidelines (ATS/IDSA) recommend against routine corticosteroid therapy in outpatients or hospitalized ward patients with non-severe CAP, as multiple trials show no mortality benefit and increased risks of hyperglycemia and secondary hospital readmissions.",
            "Adjunctive corticosteroids are contraindicated or associated with increased mortality in patients with confirmed or suspected viral influenza pneumonia, where systemic steroids increase secondary bacterial superinfections, prolonged viral shedding, and death.",
            "In patients presenting with severe CAP who meet clinical criteria for septic shock requiring vasopressors, low-dose hydrocortisone is strongly recommended based on Surviving Sepsis Campaign guidelines."
        ],
        "mcq_angles": [
            "CAPE COD trial landmark finding: IV hydrocortisone significantly reduces 28-day mortality in severe community-acquired pneumonia requiring ICU admission.",
            "Contraindication in viral respiratory infection: corticosteroids must be avoided in acute influenza pneumonia due to increased viral replication, secondary fungal/bacterial infections, and mortality.",
            "Adverse effect profile: the most frequent adverse effect of short-course corticosteroid therapy in severe CAP is transient hyperglycemia requiring insulin management."
        ],
        "case_hooks": [
            "A 64-year-old man admitted to the ICU with severe pneumococcal pneumonia (P/F ratio 160 on high-flow nasal cannula) evaluated for adjunctive hydrocortisone therapy under CAPE COD criteria.",
            "A 52-year-old woman admitted to the general medical ward with moderate CAP and baseline T2DM whose glucose spikes to 320 mg/dL following empiric oral prednisone prescription."
        ],
        "uncertainties": [
            "Comparative clinical efficacy of hydrocortisone continuous infusion versus intermittent boluses in minimizing glycemic variability in ICU pneumonia.",
            "Biomarkers (such as baseline CRP >150 mg/L) that identify hospitalized non-ICU patients who might derive mortality benefits from short-course corticosteroids."
        ]
    },

    "Steroids in pneumonia": {
        "mentor_intro": "Systemic corticosteroids in pneumonia act as potent anti-inflammatory agents that dampen excessive alveolar and systemic cytokine cascades. Therapeutic efficacy varies dramatically across pneumonia etiologies: proven beneficial in severe bacterial CAP and Pneumocystis jirovecii pneumonia, but detrimental in viral influenza.",
        "teaching_points": [
            "In severe community-acquired bacterial pneumonia (severe CAP in ICU), adjunctive corticosteroids (hydrocortisone 200 mg/day for 4–8 days) reduce all-cause mortality, accelerate clinical stability, and shorten duration of mechanical ventilation.",
            "In Pneumocystis jirovecii pneumonia (PJP) in patients with HIV/AIDS, adjunctive oral or intravenous corticosteroids (prednisone 40 mg twice daily tapered over 21 days) are mandatory for moderate-to-severe disease (defined by room air PaO2 <70 mmHg or alveolar-arterial oxygen gradient A-a gradient >=35 mmHg), halving mortality by preventing inflammatory lung injury caused by antibiotic-induced microbial lysis.",
            "In Hospital-Acquired Pneumonia (HAP) and Ventilator-Associated Pneumonia (VAP), routine adjunctive corticosteroid therapy is NOT recommended by IDSA/ATS guidelines due to insufficient evidence of survival benefit and heightened risks of multidrug-resistant secondary superinfections.",
            "In acute viral influenza pneumonia, systematic reviews and observational studies consistently demonstrate that systemic corticosteroids do not improve outcomes and are associated with increased intensive care mortality, prolonged ICU stay, and higher rates of invasive aspergillosis (influenza-associated pulmonary aspergillosis [IAPA]).",
            "In tuberculous pleurisy and tuberculous meningitis, adjunctive corticosteroids significantly reduce pleural thickening and neurological disability/mortality, respectively, when combined with full antituberculous therapy."
        ],
        "mcq_angles": [
            "Indication for steroids in PJP: room-air PaO2 <70 mmHg or A-a gradient >=35 mmHg mandates immediate initiation of corticosteroids before or concurrently with TMP-SMX.",
            "Hazard in influenza pneumonia: corticosteroids increase mortality and risk of invasive pulmonary aspergillosis in acute severe influenza.",
            "HAP/VAP guideline consensus: routine corticosteroids are not recommended in hospital-acquired or ventilator-associated pneumonia."
        ],
        "case_hooks": [
            "A 36-year-old HIV-positive patient presenting with subacute dyspnea, dry cough, bilateral perihilar ground-glass opacities, and arterial blood gas on room air showing PaO2 62 mmHg.",
            "A 70-year-old woman admitted with severe acute respiratory failure and positive PCR for Influenza A H1N1, where corticosteroids should be withheld."
        ],
        "uncertainties": [
            "Corticosteroid dosing protocols in non-HIV immunocompromised patients presenting with severe Pneumocystis jirovecii pneumonia.",
            "Long-term post-sepsis neuromuscular weakness risks attributable to short-course corticosteroids administered during severe pneumonia."
        ]
    },

    "Stevens-Johnson syndrome": {
        "mentor_intro": "Stevens-Johnson syndrome (SJS) and Toxic Epidermal Necrolysis (TEN) represent severe, life-threatening delayed-type hypersensitivity mucocutaneous reactions, most commonly triggered by medications. Characterized by extensive epidermal detachment and mucosal erosions, management demands immediate drug withdrawal and specialized burn unit care.",
        "teaching_points": [
            "SJS and TEN represent a severity spectrum of the same disease, classified by percentage of detached or detachable body surface area (BSA): SJS (<10% BSA detachment), SJS/TEN overlap (10–30% BSA detachment), and TEN (>30% BSA detachment); mortality increases with BSA involvement, exceeding 30–50% in TEN.",
            "Pathophysiology involves a drug-specific CD8+ cytotoxic T-cell and natural killer (NK) cell-mediated immune response; granulysin—a cytotoxic protein secreted by T cells and NK cells—is the primary key mediator driving widespread, disseminated keratinocyte apoptosis.",
            "High-risk causative medications include: allopurinol, aromatic antiepileptic drugs (carbamazepine, phenytoin, phenobarbital, lamotrigine), antibacterial sulfonamides (TMP-SMX), oxicam NSAIDs (meloxicam, piroxicam), and nevirapine; reactions typically emerge 1 to 4 weeks after drug initiation.",
            "The SCORTEN prognostic score evaluates 7 independent clinical variables within the first 24 hours: Age >=40, Malignancy, Heart rate >=120 bpm, Initial epidermal detachment >10% BSA, Serum urea >10 mmol/L (>28 mg/dL), Serum glucose >14 mmol/L (>252 mg/dL), and Serum bicarbonate <20 mmol/L; each variable scores 1 point, predicting mortality from 3% (score 0-1) to >90% (score >=5).",
            "Management priorities include: immediate withdrawal of all suspected culprit medications, immediate transfer to a specialized burn center or intensive care unit, aggressive supportive care (fluid/electrolyte resuscitation, temperature control, barrier nursing, sterile non-adherent dressings), and urgent ophthalmological consultation (amniotic membrane transplantation to prevent cicatricial blindness).",
            "Targeted immunomodulatory options include intravenous immunoglobulin (IVIG, which blocks Fas-FasL mediated apoptosis), high-dose systemic corticosteroids (early pulse therapy), cyclosporine (calcineurin inhibitor that blocks granulysin release), or the TNF-alpha inhibitor etanercept."
        ],
        "mcq_angles": [
            "Body surface area classification: SJS = <10% BSA detachment; SJS/TEN overlap = 10-30% BSA; Toxic Epidermal Necrolysis = >30% BSA detachment.",
            "Primary cytotoxic mediator of keratinocyte death: granulysin secreted by CD8+ T-cells and NK cells is the principal mediator of epidermal necrolysis.",
            "SCORTEN prognostic variables: 7 parameters assessed at 24 hours (age >=40, heart rate >=120, malignancy, BSA >10%, urea >10, glucose >14, bicarbonate <20)."
        ],
        "case_hooks": [
            "A 42-year-old man who started allopurinol 3 weeks ago presenting with painful erosive oral stomatitis, bilateral purulent conjunctivitis, and a dusky purpuric rash with flaccid bullae covering 25% of his body surface area (positive Nikolsky sign).",
            "A 28-year-old woman with bipolar disorder starting lamotrigine who develops a sore throat, high fever, and facial mucosal sloughing."
        ],
        "uncertainties": [
            "Comparative therapeutic superiority of cyclosporine versus etanercept versus IVIG in reducing SCORTEN-predicted mortality in severe TEN.",
            "Optimal long-term prevention protocols for chronic ocular cicatricial disease, severe dry eye, and symblepharon formation following acute SJS/TEN."
        ]
    },

    "Stimulant use disorder contingency management": {
        "mentor_intro": "Stimulant use disorder (involving cocaine, amphetamines, and methamphetamine) is a chronic substance use disorder associated with substantial morbidity and absence of approved pharmacotherapies. Contingency Management (CM)—an operant conditioning behavioral intervention—is the single most effective evidence-based treatment for achieving sustained abstinence.",
        "teaching_points": [
            "Unlike opioid and alcohol use disorders, there are currently NO FDA- or EMA-approved pharmacotherapies for cocaine, methamphetamine, or prescription stimulant use disorders; behavioral and psychosocial interventions represent the primary evidence-based standard of care.",
            "Contingency Management (CM) is an operant behavioral therapy based on reinforcement principles: patients receive tangible, immediate positive rewards (vouchers with monetary value, goods, or prize draw chances) contingent upon objective, biochemically verified drug-negative urine toxicology tests.",
            "High-quality systematic reviews and meta-analyses consistently confirm that Contingency Management achieves significantly higher rates of in-treatment stimulant abstinence, longer periods of continuous abstinence, and higher program retention than cognitive behavioral therapy (CBT), motivational interviewing, or standard outpatient addiction counseling.",
            "The 'fishbowl' prize-drawing CM method combines fixed and intermittent variable-ratio reinforcement schedules: patients with negative drug screens draw from a bowl containing chips with varying reward values (small, medium, jumbo prizes, and non-monetary praise chips), which provides strong behavioral reinforcement at lower financial cost.",
            "Emerging investigational pharmacotherapies with modest clinical trial support include: prescription psychostimulant agonist replacement (d-amphetamine or lisdexamfetamine for severe methamphetamine disorder), bupropion combined with extended-release naltrexone (ADAPT-2 trial for methamphetamine), and mirtazapine; however, effect sizes remain modest compared to CM."
        ],
        "mcq_angles": [
            "Single most effective treatment for stimulant use disorder: Contingency Management (CM) has the strongest evidence base for promoting abstinence and treatment retention in cocaine/methamphetamine addiction.",
            "Core operational mechanism of CM: immediate tangible reward reinforcement contingent upon objectively verified negative biological drug screening.",
            "Current pharmacotherapy status: no FDA-approved medications exist for cocaine or methamphetamine use disorder; behavioral therapies are first-line."
        ],
        "case_hooks": [
            "A 34-year-old man with severe methamphetamine use disorder who has relapsed after multiple residential rehab stays, enrolled in an outpatient clinic offering voucher-based Contingency Management.",
            "A 40-year-old woman with chronic cocaine dependence seeking medication to stop cravings, evaluated for behavioral and psychosocial interventions."
        ],
        "uncertainties": [
            "Post-intervention durability of stimulant abstinence once tangible contingency management financial incentives are discontinued.",
            "Policy and regulatory barriers (federal anti-kickback statutes and Medicaid reward caps) restricting widespread implementation of contingency management in public health systems."
        ]
    },

    "Streptococcal infections: Group A Strep, scarlet fever, rheumatic fever, toxic shock syndrome": {
        "mentor_intro": "Streptococcus pyogenes (Group A Streptococcus [GAS]) causes a diverse spectrum of human diseases ranging from superficial pharyngitis and scarlet fever to life-threatening invasive infections and post-streptococcal autoimmune sequelae. Timely antimicrobial therapy eradicates acute infection and prevents acute rheumatic fever.",
        "teaching_points": [
            "Streptococcus pyogenes is a beta-hemolytic, catalase-negative gram-positive coccus in chains belonging to Lancefield Group A, producing major virulence factors including M protein (antiphagocytic), streptococcal pyrogenic exotoxins (SPE-A, SPE-B, SPE-C acting as superantigens), streptolysin O, and streptokinase.",
            "Scarlet fever results from infection with an erythrogenic/pyrogenic exotoxin-producing GAS strain; classic clinical features include acute pharyngitis, fever, a diffuse blanching punctate erythematous 'sandpaper' rash (prominent in skin creases as Pastia's lines), perioral pallor, and a 'strawberry tongue' (initial white coating followed by desquamation showing red, swollen papillae).",
            "Acute Rheumatic Fever (ARF) is a delayed autoimmune sequela developing 2 to 3 weeks after untreated GAS pharyngitis, diagnosed via the revised Jones Criteria (major criteria: carditis, migratory polyarthritis, Sydenham chorea, erythema marginatum, subcutaneous nodules); prompt antibiotic treatment of primary GAS pharyngitis within 9 days of onset almost completely prevents ARF.",
            "Streptococcal Toxic Shock Syndrome (STSS) is a catastrophic invasive GAS infection characterized by sudden shock and rapid multi-organ failure; pyrogenic exotoxins act as superantigens that non-specifically cross-link the T-cell receptor V-beta region and MHC Class II molecules, triggering massive polyclonal T-cell activation and cytokine storm.",
            "Therapy for invasive GAS and STSS requires emergency combination therapy: high-dose intravenous penicillin G (bactericidal cell wall agent) PLUS clindamycin (900 mg IV q8h, a ribosomal protein synthesis inhibitor that suppresses M protein and bacterial superantigen toxin synthesis, overcoming the inoculum-dependent 'Eagle effect'), alongside emergent surgical source control for necrotizing fasciitis."
        ],
        "mcq_angles": [
            "Eagle effect and clindamycin rationale: high bacterial concentrations make penicillin less effective due to down-regulated penicillin-binding proteins; clindamycin halts bacterial protein synthesis and toxin production independent of bacterial growth phase.",
            "Revised Jones criteria major manifestations: Carditis, Polyarthritis, Chorea, Erythema marginatum, Subcutaneous nodules (JONES mnemonic).",
            "First-line antibiotic of choice for GAS pharyngitis: oral penicillin V (10 days) or single IM benzathine penicillin G; GAS remains 100% susceptible to penicillin with zero documented resistance."
        ],
        "case_hooks": [
            "A 6-year-old child presenting with sore throat, fever, perioral pallor, a red strawberry tongue, and a fine sandpapery erythematous rash that blanches under pressure.",
            "A 32-year-old previously healthy woman who develops sudden high fever, hypotension (BP 72/40 mmHg), diffuse erythematous macular erythroderma, and rapidly spreading calf redness and swelling."
        ],
        "uncertainties": [
            "Role and clinical benefit of intravenous immunoglobulin (IVIG) as adjunctive antitoxin neutralizing therapy in severe streptococcal toxic shock syndrome.",
            "Mechanisms driving the post-pandemic global resurgence and molecular epidemiology of hypervirulent emm1 and emm12 GAS sublineages."
        ]
    },

    "Stress echocardiography: protocols, ischaemia detection, viability assessment": {
        "mentor_intro": "Stress echocardiography is an established, non-invasive imaging modality that assesses regional myocardial wall motion abnormalities (WMAs) under physical exercise or pharmacological stress. It provides diagnostic accuracy for obstructive coronary artery disease and prognostic information regarding myocardial viability.",
        "teaching_points": [
            "The diagnostic principle of stress echocardiography relies on the ischemic cascade: under stress, hypoperfusion induces subendocardial ischemia, which manifests sequentially as metabolic abnormalities -> regional diastolic dysfunction -> new or worsening regional systolic wall motion abnormalities (WMAs) -> ECG ST-segment shifts -> angina pectoris.",
            "Exercise stress (treadmill or supine bicycle) is the preferred physiological modality, assessing functional exercise capacity, symptoms, blood pressure response, and wall motion; post-treadmill imaging must be acquired rapidly within 60 to 90 seconds of peak exercise before wall motion abnormalities resolve.",
            "Dobutamine stress echocardiography (DSE) is indicated for patients unable to exercise: dobutamine is infused in graded 3-minute stages (5, 10, 20, 30, up to 40 ug/kg/min) combined with intravenous atropine (up to 1–2 mg) if needed to achieve target heart rate (>=85% of age-predicted maximum: [220 - age] x 0.85).",
            "Ischemia is defined by new or worsening regional wall motion abnormalities (hypokinesia, akinesia, or dyskinesia) in >=2 contiguous myocardial segments; failure of left ventricular ejection fraction to augment or global LV dilation under peak stress suggests severe multivessel or left main coronary disease.",
            "Myocardial viability assessment in chronic ischemic cardiomyopathy utilizes low-dose dobutamine (5 to 10 ug/kg/min): a 'biphasic response' (initial improvement in contractile thickening at low doses reflecting viable/hibernating myocardium, followed by worsening dysfunction at high doses reflecting ischemia) is the most specific predictor of functional LV recovery following coronary revascularization."
        ],
        "mcq_angles": [
            "Ischemic cascade sequence: regional wall motion abnormalities occur significantly earlier than electrocardiographic ST-changes or clinical angina.",
            "Biphasic response significance: low-dose contractile improvement followed by high-dose worsening is the most accurate echocardiographic predictor of myocardial viability and post-revascularization recovery.",
            "Target heart rate endpoint in DSE: achieving >=85% of age-predicted maximum heart rate [(220 - age) x 0.85]; atropine is added if target is not reached on dobutamine alone."
        ],
        "case_hooks": [
            "A 62-year-old man with severe osteoarthritis and exertional chest pressure undergoing dobutamine stress echocardiography, reaching a heart rate of 142 bpm (88% predicted) with new akinesia of the mid and apical anterior wall.",
            "A 58-year-old man with ischemic cardiomyopathy (LVEF 28%) evaluated for CABG whose low-dose dobutamine echo demonstrates marked contractile recruitment in the anterior and apical segments."
        ],
        "uncertainties": [
            "Diagnostic accuracy of contrast-enhanced ultrasound myocardial perfusion imaging versus wall motion assessment during stress echocardiography.",
            "Incremental prognostic value of strain-rate speckle-tracking imaging in detecting subtle subendocardial ischemia during pharmacological stress."
        ]
    }
}

if __name__ == "__main__":
    print(f"Loaded {len(BATCH_04_TOPICS)} topics in Batch 4.")
    for name, data in BATCH_04_TOPICS.items():
        assert len(data["teaching_points"]) >= 4, f"{name}: fewer than 4 TPs"
        assert len(data["mcq_angles"]) >= 3, f"{name}: fewer than 3 MCQs"
        assert len(data["case_hooks"]) >= 2, f"{name}: fewer than 2 Cases"
        assert len(data["uncertainties"]) >= 2, f"{name}: fewer than 2 Uncertainties"
        assert len(data["mentor_intro"]) > 100, f"{name}: intro too short"
    print("All 25 topics in Batch 4 pass 100% of structural and depth criteria!")
