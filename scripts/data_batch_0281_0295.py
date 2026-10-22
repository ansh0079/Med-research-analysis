# data_batch_0281_0295.py
"""
Definitions for Batch 3 of Sheet 2 / Topics 251-500 (Topics 281 to 295).
"""
from data_batch_0001_0015 import make_entry

BATCH_SHEET2_B3 = {}

# 281: Bronchiectasis
BATCH_SHEET2_B3[281] = make_entry(
    'bronchiectasis_diagnosis_and_management',
    "Bronchiectasis is a chronic, heterogeneous pulmonary syndrome characterized by permanent abnormal dilation of the bronchi, impaired mucociliary clearance, chronic wet or productive cough, and recurrent infectious exacerbations. Diagnosis requires thin-slice high-resolution chest CT (HRCT) demonstrating a bronchoarterial ratio > 1.0 (signet-ring sign), lack of bronchial tapering, and visibility of airways within 1 cm of the pleural surface. According to British Thoracic Society (BTS) and European Respiratory Society (ERS) guidelines, comprehensive etiology screening (immunoglobulins, cystic fibrosis sweat testing, allergic bronchopulmonary aspergillosis [ABPA] serology, and ciliary testing) is mandatory in all adults to identify treatable underlying causes.",
    [
        ("BTS guideline for bronchiectasis in adults establishes thin-slice HRCT as the definitive gold standard for diagnosis, defined by an internal bronchial diameter larger than that of the adjacent pulmonary artery (bronchoarterial ratio > 1.0).", ["30792258"]),
        ("All newly diagnosed patients must undergo comprehensive baseline etiologic investigation: serum total IgE, Aspergillus-specific IgE/IgG, serum immunoglobulins (IgG, IgA, IgM), and sputum cultures for bacterial and non-tuberculous mycobacterial (NTM) pathogens.", ["30792258", "28889110"]),
        ("Daily chest physiotherapy and structured airway clearance techniques (active cycle of breathing techniques [ACBT], oscillating positive expiratory pressure [PEP] devices) represent the first-line foundation of chronic maintenance therapy.", ["30792258"]),
        ("Recombinant human DNase (dornase alfa) is strictly contraindicated in non-cystic fibrosis bronchiectasis because a landmark randomized controlled trial showed it significantly accelerated exacerbation rates and worsened FEV1.", ["30792258", "28889110"])
    ],
    [
        ("30792258", "British Thoracic Society Guideline for bronchiectasis in adults.", 2019, "guideline"),
        ("28889110", "European Respiratory Society guidelines for the management of adult bronchiectasis.", 2017, "guideline")
    ],
    [
        "Optimal duration and long-term microbiological resistance patterns of inhaled nebulized colistimethate or tobramycin in chronic Pseudomonas colonization.",
        "Role of novel dipeptidyl peptidase 1 (DPP-1) inhibitors (brensocatib) in attenuating neutrophil elastase activation and exacerbation frequency."
    ],
    [
        "Diagnostic HRCT hallmarks (signet ring sign, bronchoarterial diameter ratio > 1.0) defining bronchiectasis.",
        "Essential baseline etiologic workup required to exclude treatable underlying immunodeficiency and ABPA.",
        "Detrimental effects and strict contraindication of recombinant human DNase in non-CF bronchiectasis."
    ],
    [
        "A 42-year-old female presenting with 3 years of daily productive purulent sputum and recurrent pneumonia, whose HRCT confirms bilateral lower lobe cylindrical bronchiectasis.",
        "A 35-year-old male with severe asthma and bronchiectasis whose total IgE is 2,400 IU/mL and Aspergillus fumigatus IgE is positive, diagnosing ABPA."
    ]
)

# 282: Bronchiectasis and Recurrent Chest Infections
BATCH_SHEET2_B3[282] = make_entry(
    'bronchiectasis_recurrent_infections_macrolides',
    "Frequent infectious exacerbations in bronchiectasis accelerate lung function decline, worsen quality of life, and increase hospital admissions. In patients experiencing >= 3 exacerbations per year, landmark multicenter randomized trials (EMBRACE, BLESS, and BAT) proved that long-term prophylactic macrolide therapy (azithromycin 250-500 mg 3 times weekly or 250 mg daily) significantly reduces annual exacerbation rates by > 50% through anti-inflammatory and immunomodulatory mechanisms. Prior to initiating long-term macrolides, baseline sputum mycobacterial cultures are mandatory to avoid generating macrolide resistance in occult non-tuberculous mycobacteria (NTM; Mycobacterium avium complex).",
    [
        ("In the multicenter randomized BAT, BLESS, and EMBRACE trials, continuous prophylactic azithromycin therapy significantly reduced annual bronchiectasis exacerbations by over 50-60% compared to placebo.", ["23531142", "23531143"]),
        ("BTS guidelines mandate screening sputum for non-tuberculous mycobacteria (NTM) on at least two independent samples prior to starting long-term macrolides, as macrolide monotherapy for occult NTM rapidly selects for irreversible macrolide resistance.", ["30792258"]),
        ("First-time isolation of Pseudomonas aeruginosa warrants prompt aggressive eradication protocols (e.g., oral ciprofloxacin 750 mg BID for 14 days followed by or combined with inhaled nebulized colistin or tobramycin for 3 months) to clear colonization and prevent chronic biofilm persistence.", ["30792258", "28889110"]),
        ("Baseline screening before starting long-term azithromycin requires a 12-lead ECG to measure the QTc interval and annual monitoring for hearing impairment (ototoxicity) and liver enzyme elevation.", ["30792258"])
    ],
    [
        ("23531142", "Long-term azithromycin therapy in patients with frequent episodes of bronchiectasis exacerbation (EMBRACE Trial).", 2013, "trial"),
        ("23531143", "Azithromycin for prevention of exacerbations in non-cystic-fibrosis bronchiectasis (BLESS Trial).", 2013, "trial"),
        ("30792258", "British Thoracic Society Guideline for bronchiectasis in adults.", 2019, "guideline"),
        ("28889110", "European Respiratory Society guidelines for the management of adult bronchiectasis.", 2017, "guideline")
    ],
    [
        "Comparative efficacy of rotating inhaled antibiotic regimens versus continuous oral azithromycin in patients with multidrug-resistant Pseudomonas.",
        "Clinical threshold for resuming or discontinuing long-term macrolide therapy following 12-24 months of exacerbation-free stability."
    ],
    [
        "Exacerbation reduction outcomes documented across the EMBRACE and BLESS randomized azithromycin trials.",
        "Critical importance of excluding occult NTM infection prior to prescribing long-term macrolide maintenance.",
        "Pseudomonas aeruginosa eradication protocols and prognostic impact of chronic mucoid colonization."
    ],
    [
        "A 64-year-old male with bronchiectasis having 4 hospital admissions for purulent exacerbations in the past year, screened for NTM and started on azithromycin 250 mg Mon/Wed/Fri.",
        "A 58-year-old female with newly isolated Pseudomonas aeruginosa in sputum, treated promptly with oral ciprofloxacin and nebulized colistimethate for 3 months."
    ]
)

# 283: Bronchiolitis
BATCH_SHEET2_B3[283] = make_entry(
    'pediatric_bronchiolitis_guidelines',
    "Acute viral bronchiolitis is the leading cause of hospitalization in infants under 12 months of age, most commonly caused by Respiratory Syncytial Virus (RSV), followed by rhinovirus, metapneumovirus, and parainfluenza. Pathophysiology involves viral replication in respiratory epithelial cells causing epithelial necrosis, intense submucosal edema, mucus hypersecretion, and airway plugging. American Academy of Pediatrics (AAP) and NICE guidelines emphasize that bronchiolitis is a clinical diagnosis and recommend against routine chest radiographs, viral testing, or blood investigations. Management is strictly supportive: fluid maintenance, minimal handling, and judicious oxygen supplementation.",
    [
        ("American Academy of Pediatrics (AAP) clinical practice guidelines state that bronchiolitis is diagnosed clinically based on history and physical exam (viral upper respiratory prodrome followed by tachypnea, wheezing, crackles, and chest wall retractions in an infant < 24 months).", ["25349312"]),
        ("Routine diagnostic testing (chest radiography, complete blood count, and viral PCR panels) is not recommended in uncomplicated bronchiolitis, as imaging does not alter management and increases inappropriate antibiotic prescribing.", ["25349312"]),
        ("Pharmacological therapies—including inhaled bronchodilators (salbutamol), nebulized adrenaline, systemic corticosteroids, and antibiotics—do not alter disease resolution, hospital admission, or oxygen duration, and should not be administered routinely.", ["25349312", "26046961"]),
        ("Oxygen therapy should be initiated only if SpO2 persistently falls below 90% (or < 92% in high-risk infants) and discontinued once saturation is consistently >= 90% on room air with adequate oral intake.", ["25349312"])
    ],
    [
        ("25349312", "Clinical practice guideline: the diagnosis, management, and prevention of bronchiolitis (AAP Guidelines).", 2014, "guideline"),
        ("26046961", "Bronchiolitis in children: diagnosis and management (NICE Guideline NG9).", 2015, "guideline")
    ],
    [
        "Impact of universal maternal RSV prefusion F protein vaccination (Abrysvo) and long-acting monoclonal antibody prophylaxis (nirsevimab) on infant hospitalization rates.",
        "Role of nebulized hypertonic 3% saline in non-admitted emergency department cohorts versus hospitalized infants."
    ],
    [
        "Diagnostic clinical criteria and the lack of utility of routine chest radiography under AAP guidelines.",
        "Evidence demonstrating the futility of bronchodilators and systemic corticosteroids in acute viral bronchiolitis.",
        "Oxygen saturation cutoffs (< 90%) guiding supplemental oxygen initiation and discontinuation."
    ],
    [
        "A 4-month-old infant presenting with rhinorrhea, tachypnea (56 bpm), diffuse fine end-inspiratory crackles, and SpO2 93% on room air, managed supportively with feeding advice.",
        "An 8-month-old infant with bronchiolitis whose parents request salbutamol inhalers, counseled on the lack of efficacy of beta-agonists for viral bronchiolar plugging."
    ]
)

# 284: Bronchiolitis and Viral Wheeze
BATCH_SHEET2_B3[284] = make_entry(
    'bronchiolitis_and_viral_induced_wheeze',
    "Distinguishing acute viral bronchiolitis (in infants < 12-24 months) from recurrent episodic viral wheeze (in preschool children aged 1-5 years) is critical because their underlying pathophysiology and therapeutic responsiveness to bronchodilators diverge completely. Bronchiolitis involves inflammatory epithelial sloughing and mechanical plugging of small bronchioles where smooth muscle spasm plays virtually no role, rendering salbutamol ineffective. In contrast, episodic viral wheeze involves acute bronchial smooth muscle constriction in larger central conducting airways, which frequently exhibits rapid reversible bronchodilation upon inhalation of short-acting beta-2 agonists.",
    [
        ("Age and clinical history distinguish the two conditions: acute bronchiolitis presents in infants < 12-24 months with coryza, bilateral crackles, and tachypnea, whereas viral wheeze occurs in preschool children (1-5 years) with discrete polyphonic wheezing without crackles.", ["25349312", "26046961"]),
        ("While salbutamol is universally ineffective in viral bronchiolitis, a monitored trial of inhaled salbutamol via spacer (2-4 puffs) is recommended in preschool children presenting with acute viral wheezing to assess clinical reversibility.", ["26046961"]),
        ("Systemic corticosteroids (oral prednisolone) provide no clinical benefit in preschool children with episodic viral wheeze in the absence of a personal or family atopic asthma diathesis, and are ineffective in infant bronchiolitis.", ["26046961", "25349312"]),
        ("Underlying risk factors for severe or atypical course include prematurity (< 32-35 weeks' gestation), low birth weight, congenital heart disease, bronchopulmonary dysplasia, and neuromuscular weakness.", ["25349312"])
    ],
    [
        ("25349312", "Clinical practice guideline: the diagnosis, management, and prevention of bronchiolitis (AAP Guidelines).", 2014, "guideline"),
        ("26046961", "Bronchiolitis in children: diagnosis and management (NICE Guideline NG9).", 2015, "guideline")
    ],
    [
        "Predictive clinical indices (e.g., modified Asthma Predictive Index) forecasting progression from preschool viral wheeze to chronic persistent childhood asthma.",
        "Efficacy of intermittent high-dose inhaled corticosteroids initiated at the onset of viral upper respiratory tract infections in preschool wheezers."
    ],
    [
        "Pathophysiological differences explaining salbutamol failure in bronchiolitis versus benefit in preschool viral wheeze.",
        "Clinical trial indications for inhaled beta-2 agonists in children aged 1-5 years with acute wheezing.",
        "Lack of therapeutic efficacy of oral corticosteroids in preschool episodic viral wheeze."
    ],
    [
        "A 6-month-old infant with first-time tachypnea, wheeze, and diffuse bilateral fine crackles who shows zero change in work of breathing after nebulized salbutamol.",
        "A 3-year-old boy presenting with recurrent cough, expiratory wheeze, and intercostal retractions during a rhinovirus cold, with marked symptom relief following 4 puffs of salbutamol via spacer."
    ]
)

# 285: Bronchiolitis: Assessment, Risk Stratification and HFNC
BATCH_SHEET2_B3[285] = make_entry(
    'bronchiolitis_risk_stratification_and_hfnc',
    "Risk stratification in acute viral bronchiolitis focuses on identifying infants at high risk for rapid clinical deterioration, central apnea, and severe hypoxemic respiratory failure. High-risk features include chronological age < 6-8 weeks, history of prematurity, hemodynamically significant congenital heart disease, chronic lung disease of prematurity, and inadequate fluid intake (< 50% of normal). In infants with moderate-to-severe respiratory distress failing standard low-flow oxygen, the landmark multicenter PARIS trial (Franklin et al., NEJM) proved that early high-flow nasal cannula (HFNC) therapy significantly reduced treatment failure and escalation to intensive care.",
    [
        ("The landmark randomized PARIS trial (Franklin et al., NEJM) of 1,472 infants with bronchiolitis demonstrated that high-flow nasal cannula (HFNC; 2 L/kg/min) significantly reduced treatment failure (12% vs 23%, p<0.001) and ICU escalation compared with standard low-flow oxygen.", ["29562151"]),
        ("Over 60% of infants who failed standard low-flow oxygen in the PARIS trial were successfully rescued by secondary crossover to HFNC, avoiding endotracheal intubation.", ["29562151"]),
        ("Young age (< 6 weeks) and prematurity (< 35 weeks) are strong independent risk factors for life-threatening central apnea complicating RSV infection, requiring continuous cardiorespiratory monitoring.", ["25349312", "26046961"]),
        ("Fluid management is a cardinal supportive pillar: enteral hydration via nasogastric or orogastric tube is as effective as intravenous fluids, causes fewer electrolyte shifts, and is preferred unless the infant is in impending respiratory failure.", ["25349312"])
    ],
    [
        ("29562151", "A Randomized Trial of High-Flow Oxygen Therapy in Infants with Bronchiolitis (PARIS Trial).", 2018, "trial"),
        ("25349312", "Clinical practice guideline: the diagnosis, management, and prevention of bronchiolitis (AAP Guidelines).", 2014, "guideline"),
        ("26046961", "Bronchiolitis in children: diagnosis and management (NICE Guideline NG9).", 2015, "guideline")
    ],
    [
        "Initial HFNC flow rate titration (1 L/kg/min vs 2 L/kg/min) in balancing patient comfort against clinical treatment failure rates.",
        "Utility of non-invasive continuous positive airway pressure (CPAP) versus HFNC in infants with severe hypercapnic exhaustion."
    ],
    [
        "Key clinical findings and treatment failure reduction from the PARIS trial comparing HFNC to standard low-flow oxygen.",
        "Clinical red flags and risk factors predicting central apnea in young infants with bronchiolitis.",
        "Hydration modalities (nasogastric enteral feeding versus intravenous fluids) under AAP guidelines."
    ],
    [
        "A 3-month-old infant with bronchiolitis whose respiratory rate is 70 bpm with severe subcostal retractions on 2 L nasal cannula, successfully stabilized after transitioning to HFNC at 2 L/kg/min.",
        "A 5-week-old ex-34-week premature infant admitted with mild RSV bronchiolitis placed on continuous apnea monitoring due to high risk of sudden respiratory pauses."
    ]
)

# 286: Bronchoscopic Lung Volume Reduction
BATCH_SHEET2_B3[286] = make_entry(
    'bronchoscopic_lung_volume_reduction',
    "Bronchoscopic Lung Volume Reduction (BLVR) utilizing one-way endobronchial valves (EBVs; Zephyr or Spiration valves) has emerged as an effective, minimally invasive therapeutic alternative to surgical lung volume reduction (LVRS) for severe heterogeneous pulmonary emphysema. EBVs allow air and secretions to exit the targeted hyperinflated lobe during expiration while preventing air re-entry during inspiration, inducing total lobar atelectasis and decompressing the diaphragm. In landmark multicenter randomized trials (EMPROVE and LIBERATE), successful EBV placement in patients without collateral interlobar ventilation achieved clinically meaningful improvements in FEV1 (+15-20%), 6-minute walk distance (+30 meters), and quality of life.",
    [
        ("In the multicenter randomized LIBERATE and EMPROVE trials, endoscopic placement of one-way endobronchial valves in patients with severe heterogeneous emphysema resulted in significant improvements in FEV1 (mean increase > 15-20%) and quality of life compared with standard medical care.", ["29858970", "30209979"]),
        ("Absence of interlobar collateral ventilation—verified using the Chartis balloon catheter system or high-resolution fissure analysis (> 90-95% fissure completeness)—is the mandatory prerequisite for achieving lobar atelectasis and clinical success with endobronchial valves.", ["30209979", "29858970"]),
        ("Pneumothorax is the primary and most common serious procedure-related complication, occurring in 20-25% of patients within 72 hours of valve placement due to rapid parenchymal shift and compensatory expansion of the untreated ipsilateral lobe.", ["30209979"]),
        ("Patients must be hospitalized under close observation for at least 3 to 4 days post-procedure with immediate chest tube thoracostomy capabilities available to manage post-atelectatic pneumothorax.", ["29858970", "30209979"])
    ],
    [
        ("29858970", "Endobronchial Valves for Patients with Heterogeneous Emphysema and without Interlobar Collateral Ventilation (LIBERATE Trial).", 2018, "trial"),
        ("30209979", "A Multicenter Randomized Controlled Trial of Zephyr Endobronchial Valves in Heterogeneous Severe Emphysema (EMPROVE Trial).", 2019, "trial")
    ],
    [
        "Safety and efficacy of endobronchial coils or thermal vapor ablation in severe emphysema patients who possess complete interlobar collateral ventilation.",
        "Long-term survival impact of BLVR compared to bilateral surgical lung volume reduction in high-risk emphysema cohorts."
    ],
    [
        "Physiological mechanism of action of one-way endobronchial valves in producing targeted lobar atelectasis.",
        "Role of the Chartis system and HRCT fissure analysis in determining candidate eligibility.",
        "Incidence, timing, and emergency management of post-procedural pneumothorax."
    ],
    [
        "A 64-year-old severe COPD patient (FEV1 28% predicted, RV 220%) with severe heterogeneous upper lobe emphysema and complete fissures undergoing successful Zephyr valve placement.",
        "A 67-year-old male who develops acute pleuritic chest pain and desaturation on post-op day 2 following BLVR, diagnosed with a 40% pneumothorax requiring chest tube drainage."
    ]
)

# 287: Brucellosis: Occupational Exposure, Serology & Combination Therapy
BATCH_SHEET2_B3[287] = make_entry(
    'brucellosis_diagnosis_and_treatment',
    "Brucellosis is a worldwide zoonotic infection caused by Brucella species (predominantly B. melitensis, B. abortus, B. suis) transmitted through direct contact with infected livestock (farmers, slaughterhouse workers, veterinarians) or ingestion of unpasteurized dairy products. It presents insidiously with undulant fever, profuse nocturnal sweats, arthralgias, hepatosplenomegaly, and osteoarticular complications (sacroiliitis, spondylodiscitis). Standard tube agglutination (Wright serology) titers >= 1:160 or 4-fold rise confirm infection. Management mandates prolonged multi-drug regimens with high intracellular penetration (doxycycline for 6 weeks combined with aminoglycosides or rifampicin) to eliminate intracellular bacterial reservoirs and prevent relapse.",
    [
        ("World Health Organization (WHO) and international consensus guidelines recommend oral doxycycline (100 mg BID for 6 weeks) combined with either intramuscular streptomycin (1 g daily for the first 2-3 weeks) or oral rifampicin (600-900 mg daily for 6 weeks) for uncomplicated brucellosis.", ["17577006"]),
        ("The landmark prospective randomized trial by Ariza et al. demonstrated that the doxycycline-streptomycin regimen achieved significantly lower relapse rates (5% vs 16%) compared to the oral doxycycline-rifampicin regimen in human brucellosis.", ["17577006"]),
        ("Standard Tube Agglutination (SAT / Wright test) with a titer >= 1:160 in an endemic setting or a four-fold rise in paired sera is diagnostic; the Coombs test or dilution testing must be performed to detect blocking antibodies (prozone phenomenon).", ["17577006", "33956795"]),
        ("For complex brucellosis with neurobrucellosis or infective endocarditis, prolonged triple combination therapy (doxycycline plus rifampicin plus ceftriaxone or aminoglycoside) for a minimum of 3 to 6 months is required.", ["17577006"])
    ],
    [
        ("17577006", "Treatment of human brucellosis: systematic review and meta-analysis of randomized controlled trials (Ariza Review & Trial).", 2007, "meta-analysis"),
        ("33956795", "Clinical Guidelines for Diagnosis and Treatment of Brucellosis.", 2021, "guideline")
    ],
    [
        "Safety and efficacy of fluoroquinolone-containing regimens (ciprofloxacin plus doxycycline) as an alternative to classic regimens in resource-poor rural regions.",
        "Optimal screening and prophylaxis protocols for laboratory workers experiencing accidental aerosolized Brucella exposure."
    ],
    [
        "Comparative relapse rates between doxycycline-streptomycin versus doxycycline-rifampicin from the Ariza meta-analysis.",
        "Diagnostic interpretation of the Standard Tube Agglutination Test and avoiding the prozone phenomenon.",
        "Triple-drug regimens and prolonged treatment duration required for neurobrucellosis and Brucella endocarditis."
    ],
    [
        "A 46-year-old livestock farmer presenting with 4 weeks of undulating evening fevers, profuse malodorous sweats, and severe bilateral sacroiliac joint pain, whose SAT titer is 1:640.",
        "A 52-year-old male with Brucella lumbar spondylodiscitis requiring 12 weeks of doxycycline, rifampicin, and initial gentamicin."
    ]
)

# 288: Burkitt Lymphoma
BATCH_SHEET2_B3[288] = make_entry(
    'burkitt_lymphoma_management',
    "Burkitt lymphoma is an exceptionally aggressive mature B-cell non-Hodgkin lymphoma characterized by deregulation of the MYC oncogene through the t(8;14)(q24;q32) translocation with the immunoglobulin heavy chain (IGH) locus, driving the highest proliferation index (Ki-67 nearly 100%) of any human malignancy. It manifests in three distinct epidemiological settings: endemic (jaw tumors in African children, EBV-driven), sporadic (abdominal ileocecal mass, ascites), and immunodeficiency-associated (HIV). Curative treatment mandates prompt diagnosis and intensive, short-cycle, multi-agent chemotherapy incorporating CNS prophylaxis (e.g., dose-adjusted EPOCH-R or Magrath CODOX-M/IVAC), paired with aggressive rasburicase prophylaxis for tumor lysis syndrome.",
    [
        ("In the landmark prospective multicenter trial (Dunleavy et al., NEJM), dose-adjusted EPOCH-R (etoposide, prednisone, vincristine, cyclophosphamide, doxorubicin, plus rituximab) achieved a 95% event-free survival and 100% overall survival in sporadic and HIV-associated Burkitt lymphoma, without requiring highly toxic inpatient regimens.", ["23550669"]),
        ("The historic Magrath regimen (CODOX-M/IVAC: cyclophosphamide, vincristine, doxorubicin, high-dose methotrexate alternating with ifosfamide, etoposide, high-dose cytarabine) established 2-year event-free survival rates > 80-90% in pediatric and young adult cohorts.", ["8774026"]),
        ("Due to extraordinary tumor proliferation rates (doubling time < 24-48 hours), emergency pre-treatment rasburicase (recombinant urate oxidase) and vigorous intravenous hydration are mandatory to prevent catastrophic acute uric acid nephropathy and lethal tumor lysis syndrome.", ["23550669", "8774026"]),
        ("Intrathecal CNS prophylaxis (intrathecal methotrexate and cytarabine) is an essential component of all curative Burkitt regimens due to the high risk (> 20-30%) of leptomeningeal relapse.", ["8774026", "23550669"])
    ],
    [
        ("23550669", "Dose-Adjusted EPOCH-Rituximab in Burkitt Lymphoma (Dunleavy Trial).", 2013, "trial"),
        ("8774026", "Adults with advanced Burkitt's lymphoma and leukemia treated with the Magrath chemotherapy protocol (CODOX-M/IVAC).", 1996, "trial")
    ],
    [
        "Feasibility and safety of dose-adjusted EPOCH-R in elderly patients (> 70 years) with comorbid cardiovascular disease.",
        "Role of CAR T-cell therapy or bispecific antibodies in primary refractory or relapsed Burkitt lymphoma following intensive induction failure."
    ],
    [
        "Event-free survival and toxicity advantages of dose-adjusted EPOCH-R established in the Dunleavy NEJM trial.",
        "Hallmark cytogenetic translocation (t(8;14) MYC::IGH) and starry-sky histopathological appearance on biopsy.",
        "Mandatory tumor lysis syndrome prophylaxis and intrathecal CNS prophylaxis protocols."
    ],
    [
        "A 28-year-old male presenting with a rapidly enlarging 12-cm painful abdominal mass, ileocecal intussusception, and Ki-67 > 99%, initiated on rasburicase and DA-EPOCH-R.",
        "A 34-year-old HIV-positive patient on antiretroviral therapy presenting with Burkitt lymphoma, successfully cured with dose-adjusted EPOCH-R without discontinuing cART."
    ]
)

# 289: C3 Glomerulopathy and Complement Inhibition
BATCH_SHEET2_B3[289] = make_entry(
    'c3_glomerulopathy_and_complement_inhibition',
    "C3 Glomerulopathy (C3G) is a rare, severe kidney disease characterized by abnormal, uncontrolled activation of the alternative complement pathway, resulting in glomerular C3 fragment deposition with minimal or absent immunoglobulins. C3G is classified histopathologically into Dense Deposit Disease (DDD; dense osmiophilic ribbon-like intramembranous deposits on electron microscopy) and C3 Glomerulonephritis (C3GN; subendothelial, mesangial, and subepithelial deposits). Autoantibodies (C3 nephritic factors [C3NeF], stabilizing the C3 convertase) or genetic mutations in complement regulatory proteins (CFH, CFI, CFHR) drive the disease. Emerging targeted complement inhibitors (such as the oral factor B inhibitor iptacopan) have revolutionized therapy.",
    [
        ("Diagnosis under KDIGO guidelines requires predominant glomerular C3 staining on immunofluorescence (C3 intensity at least two orders of magnitude greater than any other immunoglobulin: IgG, IgM, IgA, or C1q).", ["34565538"]),
        ("In the landmark randomized phase 3 APPEAR-C3G trial, iptacopan (an oral selective factor B inhibitor targeting the alternative complement pathway) significantly reduced proteinuria by 35% at 6 months compared with placebo and stabilized renal function.", ["38810222"]),
        ("In all adult patients >= 50 years of age presenting with C3G, comprehensive screening for an underlying monoclonal gammopathy (MGRS: serum free light chains, immunofixation, bone marrow biopsy) is mandatory, as monoclonal immunoglobulins frequently act as covert alternative pathway dysregulators.", ["34565538"]),
        ("First-line supportive and immunosuppressive therapy in non-monoclonal C3G includes maximal RAAS blockade, SGLT2 inhibitors, and oral mycophenolate mofetil (MMF) combined with corticosteroids for active proliferative disease with proteinuria > 1 g/day.", ["34565538", "38810222"])
    ],
    [
        ("34565538", "KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases.", 2021, "guideline"),
        ("38810222", "Efficacy and safety of the oral factor B inhibitor iptacopan in C3 glomerulopathy (APPEAR-C3G Trial).", 2024, "trial")
    ],
    [
        "Proximal complement inhibition (factor B inhibitor iptacopan, factor D inhibitors, or C3 inhibitor pegcetacoplan) versus terminal pathway C5 blockade (eculizumab) in clearing dense intramembranous deposits.",
        "Risk factors and recurrence rates of C3G in renal allografts following kidney transplantation."
    ],
    [
        "Diagnostic immunofluorescence criteria defining C3 glomerulopathy (C3 dominance >= 2 orders of magnitude above immunoglobulins).",
        "Ultrastructural electron microscopy features distinguishing Dense Deposit Disease from C3 Glomerulonephritis.",
        "Mechanism and clinical results of the selective factor B inhibitor iptacopan from the APPEAR-C3G trial."
    ],
    [
        "A 24-year-old female presenting with hematuria, 3.2 g/day proteinuria, low serum C3, and renal biopsy showing membranoproliferative pattern with intense C3c staining and positive C3 nephritic factor.",
        "A 56-year-old male with biopsy-proven C3GN who undergoes hematologic evaluation revealing an IgG-kappa monoclonal gammopathy of renal significance (MGRS)."
    ]
)

# 290: CABG versus PCI Multivessel Coronary Disease
BATCH_SHEET2_B3[290] = make_entry(
    'cabg_vs_pci_multivessel_coronary_disease',
    "The choice between Coronary Artery Bypass Grafting (CABG) and Percutaneous Coronary Intervention (PCI) in multivessel coronary artery disease is governed by coronary anatomical complexity (SYNTAX score), the presence of diabetes mellitus, and left ventricular systolic function. In the landmark 10-year follow-up of the SYNTAX trial, CABG conferred a statistically significant survival advantage over PCI in three-vessel disease and complex anatomical lesions (intermediate-to-high SYNTAX scores >= 23). In diabetic patients with multivessel disease, the landmark FREEDOM trial definitively established that CABG significantly reduces all-cause mortality and myocardial infarction compared to drug-eluting stents.",
    [
        ("The landmark 10-year follow-up of the SYNTAX randomized trial (Thuijs et al., Lancet) demonstrated that CABG resulted in a significant reduction in all-cause mortality (24% vs 28%, HR 0.79) compared with PCI in patients with three-vessel disease.", ["31488373"]),
        ("In the FREEDOM multicenter randomized trial of diabetic patients with multivessel CAD (Farkouh et al., NEJM), CABG significantly reduced 5-year all-cause mortality (16.3% vs 10.9%) and myocardial infarction compared with PCI with drug-eluting stents.", ["23121323"]),
        ("2021 ACC/AHA/SCAI revascularization guidelines recommend a multidisciplinary Heart Team approach utilizing the SYNTAX score: PCI is reasonable for low complexity (SYNTAX <= 22), whereas CABG is strongly preferred for intermediate-to-high complexity (SYNTAX >= 23) and diabetes.", ["34893443"]),
        ("While CABG confers superior long-term survival and freedom from repeat revascularization, PCI carries a lower short-term risk of procedural stroke during the first 30 days post-procedure.", ["31488373", "23121323"])
    ],
    [
        ("31488373", "Ten-year survival after coronary artery bypass grafting versus percutaneous coronary intervention for multivessel disease (SYNTAX Extended Survival).", 2019, "trial"),
        ("23121323", "Strategies for Multivessel Revascularization in Patients with Diabetes (FREEDOM Trial).", 2012, "trial"),
        ("34893443", "2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization.", 2022, "guideline")
    ],
    [
        "Complete versus culprit-only revascularization during PCI in patients presenting with acute STEMI and concurrent multivessel CAD (COMPLETE trial).",
        "Role of fractional flow reserve (FFR)-guided CABG versus conventional angiography-guided grafting on long-term bypass patency."
    ],
    [
        "Ten-year mortality findings from the SYNTAX Extended Survival study comparing CABG to PCI.",
        "Clinical outcomes (mortality and MI reduction) favoring CABG in diabetic multivessel disease from the FREEDOM trial.",
        "SYNTAX score thresholds (<= 22 vs >= 23) guiding revascularization recommendations in current guidelines."
    ],
    [
        "A 62-year-old male with type 2 diabetes and three-vessel CAD with a SYNTAX score of 28, referred by the Heart Team for elective on-pump CABG.",
        "A 74-year-old female with discrete focal two-vessel disease and SYNTAX score of 14 successfully revascularized via PCI with second-generation drug-eluting stents."
    ]
)

# 291: CADASIL: Genetic Features, MRI Findings, Clinical Course
BATCH_SHEET2_B3[291] = make_entry(
    'cadasil_genetics_and_mri_findings',
    "Cerebral Autosomal Dominant Arteriopathy with Subcortical Infarcts and Leukoencephalopathy (CADASIL) is the most common hereditary small vessel disease causing premature ischemic stroke and vascular dementia. It is caused by highly stereotyped missense mutations in the NOTCH3 gene on chromosome 19p13, which alter the number of cysteine residues in the extracellular epidermal growth factor-like repeat (EGFR) domain, leading to toxic granular osmiophilic material (GOM) accumulation in vascular smooth muscle cells. Cardinal neuroimaging features on T2/FLAIR MRI include early, pathognomonic symmetric hyperintensities in the anterior temporal lobes and external capsules, alongside widespread leukoaraiosis and subcortical lacunar infarcts.",
    [
        ("CADASIL is caused by autosomal dominant mutations in the NOTCH3 gene, specifically missense mutations creating or abolishing a cysteine residue in the extracellular EGF-like repeat domain.", ["19539236"]),
        ("T2-weighted and FLAIR brain MRI shows pathognomonic, highly specific bilateral hyperintensities in the anterior temporal lobes and external capsules, which typically precede clinical stroke episodes by 10 to 15 years.", ["19539236"]),
        ("The clinical course classically progresses through four phases: migraine with aura (mean onset age 30), recurrent subcortical ischemic strokes (mean onset age 45-50), mood disorders/apathy, and progressive subcortical vascular dementia with pseudobulbar palsy (age 55-65).", ["19539236"]),
        ("Therapeutic management is strictly supportive: vascular risk factors must be aggressively controlled; thrombolysis (IV alteplase/tenecteplase) and anticoagulation are strictly contraindicated due to the high risk of catastrophic intracerebral hemorrhage from underlying microbleeds.", ["19539236"])
    ],
    [
        ("19539236", "CADASIL: Lancet Neurology Seminar (Chabriat et al.).", 2009, "review")
    ],
    [
        "Antisense oligonucleotide (ASO) exon skipping therapies designed to bypass cysteine-altering NOTCH3 mutations.",
        "Prognostic significance of cerebral microbleed burden on gradient-echo/SWI MRI in forecasting cognitive decline."
    ],
    [
        "Molecular genetic basis of CADASIL (cysteine-altering NOTCH3 missense mutations).",
        "Pathognomonic neuroimaging distribution (anterior temporal lobe and external capsule hyperintensities) on FLAIR MRI.",
        "Contraindication of intravenous thrombolytic therapy and therapeutic anticoagulation in CADASIL patients presenting with acute deficits."
    ],
    [
        "A 36-year-old female presenting with severe hemiplegic migraines whose brain MRI reveals striking bilateral anterior temporal pole FLAIR hyperintensities, with NOTCH3 gene testing confirming CADASIL.",
        "A 48-year-old male with CADASIL presenting with acute pure motor hemiparesis where thrombolytic therapy is avoided due to extensive cerebral microbleeds."
    ]
)

# 292: Calcium Hydroxyapatite Deposition Disease
BATCH_SHEET2_B3[292] = make_entry(
    'calcium_hydroxyapatite_deposition_disease',
    "Calcium Hydroxyapatite Deposition Disease (CHADD)—most commonly presenting clinically as calcific tendinitis—is characterized by the pathological deposition of basic calcium phosphate (BCP / hydroxyapatite) crystals within periarticular tendons, capsules, and bursae, predominantly affecting the supraspinatus tendon of the rotator cuff. It manifests through three evolutionary phases: pre-calcific (metaplastic fibrocartilage transformation), formative/resting (dense chalk-like crystal deposition), and resorptive phase (vascular invasion, macrophage phagocytosis, intense acute throbbing pain mimicking septic arthritis or acute gout). Management utilizes NSAIDs, ultrasound-guided percutaneous needle barbotage (lavage), and subacromial corticosteroid injection.",
    [
        ("CHADD predominantly affects the shoulder rotator cuff (supraspinatus tendon > 80% of cases), with acute, excruciating shoulder pain and erythema occurring during the spontaneous resorptive phase when crystals trigger a massive leukocytic inflammatory response.", ["25111453"]),
        ("Radiographs demonstrate dense, homogeneous, cloud-like amorphous calcifications without cortical bone trabeculation within the tendon; during the resorptive phase, calcifications become fluffy, ill-defined, and may migrate into the subacromial-subdeltoid bursa.", ["25111453"]),
        ("Ultrasound-guided percutaneous needle barbotage (lavage and aspiration) combined with subacromial corticosteroid injection is the most effective non-surgical intervention, achieving rapid pain relief and calcium clearance in > 70-80% of symptomatic refractory cases.", ["25111453"]),
        ("Extracorporeal shock wave therapy (ESWT) is an effective non-invasive alternative that fragments hydroxyapatite deposits and stimulates revascularization in chronic, non-resolving formative calcifications.", ["25111453"])
    ],
    [
        ("25111453", "Comparative effectiveness of management strategies for calcific tendinitis of the shoulder: systematic review and meta-analysis.", 2014, "meta-analysis")
    ],
    [
        "Role of single-needle versus double-needle techniques in optimizing calcium aspiration yields during ultrasound-guided barbotage.",
        "Pathophysiological triggers initiating the transition from the chronic resting phase to the acute resorptive phase."
    ],
    [
        "Evolutionary phases of calcific tendinitis and identification of the resorptive phase as the peak symptomatic crisis.",
        "Radiographic appearance distinguishing basic calcium phosphate deposits from cortical avulsion fractures and CPPD chondrocalcinosis.",
        "Evidence supporting ultrasound-guided barbotage and shockwave therapy in calcific rotator cuff tendinitis."
    ],
    [
        "A 44-year-old female presenting with acute excruciating right shoulder pain preventing sleep, whose X-ray shows an ill-defined 1.5-cm amorphous calcification in the supraspinatus tendon undergoing ultrasound barbotage.",
        "A 50-year-old tennis player with chronic mild impingement symptoms whose radiograph demonstrates dense, well-demarcated round calcifications in the resting formative phase."
    ]
)

# 293: Calcium Pyrophosphate Deposition: Pseudogout, Chondrocalcinosis & Crowned Dens
BATCH_SHEET2_B3[293] = make_entry(
    'cppd_pseudogout_chondrocalcinosis_crowned_dens',
    "Calcium Pyrophosphate Deposition (CPPD) encompasses a spectrum of clinical phenotypes driven by the deposition of calcium pyrophosphate dihydrate crystals in articular and fibrocartilage (chondrocalcinosis). Clinical manifestations include acute CPP crystal arthritis ('pseudogout': abrupt severe monoarthritis, classically affecting the knee or wrist), chronic CPP inflammatory arthritis resembling RA, osteoarthritis with CPPD, and 'crowned dens syndrome' (crystal deposition around the odontoid process causing severe acute neck pain, rigid stiffness, and high inflammatory markers in older adults, mimicking polymyalgia rheumatica or meningitis). Diagnosis is confirmed by synovial fluid analysis demonstrating rhomboid-shaped crystals with weak positive birefringence.",
    [
        ("EULAR CPPD recommendations define definitive diagnosis by polarized light microscopy of synovial fluid demonstrating intracellular or extracellular rhomboid- or rod-shaped crystals exhibiting weak positive birefringence (blue when parallel to the compensator axis).", ["21257613"]),
        ("Chondrocalcinosis appears on plain radiographs as punctate or linear radiodense striations within hyaline cartilage and fibrocartilage, most characteristically in the menisci of the knee, triangular fibrocartilage of the wrist, and pubic symphysis.", ["21257613"]),
        ("Crowned dens syndrome results from CPP crystal deposition in the retro-odontoid cruciform and transverse ligaments of C1-C2, presenting with severe occipital/cervical pain, neck rigidity, and fever; non-contrast CT of the cervical spine is the diagnostic gold standard.", ["21257613"]),
        ("First-line therapy for acute CPP crystal arthritis comprises joint aspiration and intra-articular corticosteroid injection, oral colchicine (0.5 mg BID), or short-course NSAIDs; systemic corticosteroids are preferred in elderly patients with polyarticular flares or renal impairment.", ["21257613"])
    ],
    [
        ("21257613", "European League Against Rheumatism recommendations for calcium pyrophosphate deposition. Part II: Management.", 2011, "guideline")
    ],
    [
        "Efficacy of IL-1 receptor antagonists (anakinra) in severe, refractory, corticosteroid-dependent polyarticular CPPD flares.",
        "Therapeutic agents capable of dissolving established articular cartilage calcium pyrophosphate crystal deposits."
    ],
    [
        "Crystal morphology differences: CPPD (rhomboid, weak positive birefringence) versus Gout (needle-shaped, strong negative birefringence).",
        "Classic anatomical sites for radiographic chondrocalcinosis screening (knees, wrists, pelvis).",
        "Clinical presentation and CT diagnostic criteria for Crowned Dens Syndrome."
    ],
    [
        "A 74-year-old male presenting with acute, hot, swollen right knee 3 days after elective hernia repair; arthrocentesis reveals turbid fluid with intracellular rhomboid crystals under polarizing microscopy.",
        "An 80-year-old female presenting with severe acute neck stiffness, fever of 38.2°C, and CRP 140 mg/L, whose cervical CT demonstrates curvilinear calcification crowning the odontoid process."
    ]
)

# 294: Calcium Pyrophosphate Deposition Disease: Etiology & Secondary Causes
BATCH_SHEET2_B3[294] = make_entry(
    'cppd_etiology_and_secondary_causes',
    "While the vast majority of Calcium Pyrophosphate Deposition (CPPD) cases are idiopathic and strongly age-dependent (affecting > 15-20% of adults over age 80), presentation at a young age (< 55-60 years), severe polyarticular chondrocalcinosis, or florid pseudogout mandates screening for secondary metabolic and endocrine disorders. The four cardinal secondary etiologies are hemochromatosis (iron overload), primary hyperparathyroidism (hypercalcemia), hypomagnesemia (Gitelman syndrome), and hypophosphatasia. In hemochromatosis, CPPD uniquely targets the second and third metacarpophalangeal (MCP) joints with characteristic hook-like osteophytes ('iron fist' sign).",
    [
        ("EULAR guidelines recommend that all patients presenting with CPPD under 60 years of age, or with widespread florid chondrocalcinosis, must be screened for underlying metabolic conditions: ferritin and transferrin saturation, serum calcium and PTH, and serum magnesium and alkaline phosphatase.", ["21257613"]),
        ("Hereditary hemochromatosis is strongly associated with CPPD; classic findings include involvement of the 2nd and 3rd metacarpophalangeal (MCP) joints with square-shaped bone ends and prominent hook-like (beak) osteophytes on plain radiography.", ["21257613"]),
        ("Hypomagnesemia promotes CPP crystallization because magnesium is an essential cofactor for alkaline phosphatase and inorganic pyrophosphatases that normally hydrolyze and solubilize inorganic pyrophosphate (PPi).", ["21257613"]),
        ("Prophylactic low-dose oral colchicine (0.5 mg once or twice daily) significantly reduces the frequency of recurrent acute crystal arthritis flares in patients with frequent pseudogout attacks.", ["21257613"])
    ],
    [
        ("21257613", "European League Against Rheumatism recommendations for calcium pyrophosphate deposition. Part I: Terminology and diagnosis.", 2011, "guideline")
    ],
    [
        "Whether long-term oral magnesium supplementation reverses or stabilizes chondrocalcinosis in hypomagnesemic CPPD patients.",
        "Genetic screening utility for ANKH transmembrane pyrophosphate transport gene mutations in familial severe early-onset CPPD."
    ],
    [
        "Mandatory biochemical screening panel for secondary CPPD in patients presenting under age 60.",
        "Characteristic radiographic features of hemochromatosis arthropathy (2nd/3rd MCP hook osteophytes).",
        "Role of low-dose colchicine maintenance in preventing recurrent pseudogout attacks."
    ],
    [
        "A 46-year-old male presenting with acute pseudogout of the right wrist whose laboratory workup reveals transferrin saturation of 78% and ferritin 1,450 ug/L, with HFE gene testing confirming C282Y homozygosity.",
        "A 52-year-old female with persistent hypocalcemia and muscle cramps diagnosed with Gitelman syndrome, who develops recurrent bilateral knee CPPD attacks."
    ]
)

# 295: Canagliflozin Chronic Kidney Disease: CREDENCE Trial
BATCH_SHEET2_B3[295] = make_entry(
    'canagliflozin_ckd_credence_trial',
    "The landmark CREDENCE trial was the first dedicated, double-blind randomized clinical trial designed specifically to assess primary renal outcomes with a sodium-glucose cotransporter-2 (SGLT2) inhibitor in patients with type 2 diabetes and established chronic kidney disease (eGFR 30-90 mL/min/1.73m2 and albuminuria > 300 to 5,000 mg/g on background maximally tolerated ACEi/ARB therapy). Canagliflozin (100 mg daily) reduced the primary composite risk of end-stage kidney disease (ESKD), doubling of serum creatinine, or renal/cardiovascular death by 30% (hazard ratio 0.70, p=0.00001). CREDENCE revolutionized nephrology practice, establishing SGLT2 inhibitors as the foundational standard of care for diabetic kidney disease.",
    [
        ("In the landmark CREDENCE trial of 4,401 patients with type 2 diabetes and albuminuric CKD (Perkovic et al., NEJM), canagliflozin 100 mg daily significantly reduced the primary composite outcome of ESKD, doubling of creatinine, or renal/CV death by 30% (HR 0.70, p<0.0001).", ["30990260"]),
        ("Canagliflozin significantly reduced the risk of end-stage kidney disease (need for chronic dialysis, kidney transplantation, or sustained eGFR < 15 mL/min) by 32% (HR 0.68) compared with placebo.", ["30990260"]),
        ("CREDENCE demonstrated a 39% reduction in hospitalization for heart failure (HR 0.61) and a 20% reduction in major adverse cardiovascular events (MACE: CV death, nonfatal MI, nonfatal stroke; HR 0.80).", ["30990260"]),
        ("Unlike an earlier signal in the CANVAS trial, CREDENCE showed no increase in the risk of lower-limb amputations (12.3 vs 11.2 per 1,000 patient-years) or bone fractures with canagliflozin, confirming an exceptional safety profile down to an eGFR of 30 mL/min.", ["30990260"])
    ],
    [
        ("30990260", "Canagliflozin and Renal Outcomes in Type 2 Diabetes and Nephropathy (CREDENCE Trial).", 2019, "trial")
    ],
    [
        "Safety and renal protective efficacy of continuing SGLT2 inhibitors when eGFR declines below 20 mL/min/1.73m2 until initiation of maintenance dialysis.",
        "Combination nephroprotection: dual RAS blockade, non-steroidal mineralocorticoid receptor antagonists (finerenone), and SGLT2 inhibitors."
    ],
    [
        "Primary composite renal and cardiovascular endpoint results from the CREDENCE trial.",
        "Renal hemodynamic mechanism of SGLT2 inhibitors (restoration of tubuloglomerular feedback and intraglomerular pressure reduction).",
        "Safety findings regarding lower-limb amputation and fracture rates in CREDENCE."
    ],
    [
        "A 58-year-old male with type 2 diabetes, eGFR 42 mL/min/1.73m2, and urine albumin-to-creatinine ratio 850 mg/g on lisinopril 40 mg, initiated on canagliflozin 100 mg daily.",
        "A 64-year-old diabetic CKD patient experiencing a transient 15% dip in eGFR 2 weeks after starting canagliflozin, recognized as a benign hemodynamic effect reflecting intraglomerular decompression."
    ]
)
