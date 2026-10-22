# data_batch_0016_0030.py
"""
Definitions for Batch 2 of Topics 1-100 (Topics 16 to 30).
"""
from data_batch_0001_0015 import make_entry

BATCH_2 = {}

# 16 & 17: Acute Abdomen & Common Surgical Emergencies
e16_17 = make_entry(
    'acute_abdomen_and_surgical_emergencies',
    "The acute abdomen encompasses rapid-onset, severe abdominal pain reflecting life-threatening surgical emergencies (perforated viscus, acute peritonitis, bowel obstruction, acute mesenteric ischemia, ruptured ectopic pregnancy, or ruptured AAA). Diagnostic evaluation prioritizes hemodynamic stability, early resuscitation, and structured clinical evaluation: localized peritoneal signs (involuntary guarding, percussion tenderness, rebound) mandate emergent surgical consultation. Contrast-enhanced computed tomography (CT) of the abdomen and pelvis is the diagnostic gold standard, offering sensitivity and specificity > 95% for identifying surgical pathology. Point-of-care ultrasound (POCUS) rapidly detects hemoperitoneum (FAST), abdominal aortic aneurysm rupture, and acute cholecystitis at the bedside. Analgesia with IV opioids should NOT be withheld as it facilitates physical examination without masking surgical pathology.",
    [
        ("Contrast-enhanced abdominal/pelvic CT is the diagnostic imaging modality of choice, achieving sensitivity > 95% and significantly reducing negative laparotomy rates.", ["31504429"]),
        ("Early administration of intravenous opioid analgesia does NOT obscure abdominal examination or impede diagnostic accuracy, and is standard of care (WSES consensus).", ["28059902"]),
        ("Peritoneal signs (involuntary abdominal rigidity, focal rebound tenderness, percussion pain) warrant emergent surgical evaluation for peritonitis or hollow viscus perforation.", ["28059902"]),
        ("Immediate empiric broad-spectrum parenteral antibiotics covering enteric Gram-negative bacilli and anaerobes must be administered within 1 hour of identifying gastrointestinal perforation or peritonitis.", ["29098596"])
    ],
    [
        ("28059902", "WSES guidelines for management of acute abdomen in the emergency department.", 2017, "guideline"),
        ("31504429", "Diagnostic performance of computed tomography in acute abdominal pain: systematic review.", 2019, "systematic review"),
        ("29098596", "Antimicrobial therapy for intra-abdominal infections: international consensus.", 2018, "guideline")
    ],
    ["Management of acute appendicitis: immediate laparoscopic appendectomy vs antibiotics-first approach in uncomplicated appendicitis (CODA trial).", "Role of diagnostic laparoscopy vs observation in undifferentiated acute lower abdominal pain in reproductive-age females."],
    ["Analgesia myth: withholding opioids prior to surgical consult is outdated and unethical; randomized trials confirm pain relief enhances patient cooperation and palpation accuracy.", "Signs of peritonitis: involuntary muscular guarding and tenderness to gentle bed bumping or percussion are highly specific for parietal peritoneal inflammation.", "Free air on imaging: subdiaphragmatic crescent on upright chest X-ray or pneumoperitoneum on CT confirms hollow viscus perforation, requiring emergency exploratory laparotomy."],
    ["A 44-year-old with sudden excruciating epigastric pain and board-like abdominal rigidity whose upright chest radiograph reveals free air under the right hemidiaphragm.", "A 72-year-old on anticoagulation presenting with severe lower abdominal pain and diffuse guarding without fever, diagnosed with ruptured rectus sheath hematoma."]
)
BATCH_2[16] = e16_17
BATCH_2[17] = e16_17

# 18: Acute and chronic pain assessment and opioid safety
BATCH_2[18] = make_entry(
    'pain_assessment_and_opioid_safety',
    "Pain assessment requires validated multidimensional scales and careful clinical differentiation between nociceptive, neuropathic, and nociplastic mechanisms. In acute pain, multimodal analgesia combining acetaminophen, NSAIDs (unless contraindicated by CKD, peptic ulcer, or cardiovascular disease), regional/neuraxial anesthesia, and non-pharmacologic interventions maximizes pain control while minimizing opioid requirements ('opioid-sparing strategy'). For chronic non-cancer pain, CDC guidelines emphasize non-opioid pharmacotherapies (gabapentinoids, SNRIs, tricyclics, topical agents) and non-pharmacologic modalities (CBT, physical therapy). When opioids are necessary, clinicians should prescribe immediate-release formulations at the lowest effective dose for <= 3-7 days in acute pain; for chronic therapy, clinicians should assess opioid risk tools (ORT), check prescription drug monitoring programs (PDMP), avoid concurrent benzodiazepines (which quadruple fatal overdose risk), and co-prescribe take-home naloxone when daily morphine milligram equivalents (MME) exceed 50.",
    [
        ("CDC and APS guidelines emphasize multimodal analgesia combining non-opioid medications (acetaminophen, NSAIDs) and regional blocks as first-line strategy to minimize opioid exposure.", ["36327391"]),
        ("Concurrent prescription of opioids and benzodiazepines quadruples the risk of fatal respiratory depression and is strongly discouraged unless strictly clinically necessary.", ["36327391"]),
        ("For acute pain requiring opioids, immediate-release formulations at the lowest effective dose should be prescribed for <= 3 to 7 days to prevent long-term physical dependence.", ["36327391"]),
        ("Take-home naloxone should be co-prescribed whenever opioid dosages equal or exceed 50 Morphine Milligram Equivalents (MME)/day, or in patients with sleep apnea, renal/hepatic dysfunction, or substance use history.", ["36327391"])
    ],
    [
        ("36327391", "CDC Clinical Practice Guideline for Prescribing Opioids for Pain - United States, 2022.", 2022, "guideline"),
        ("26840801", "Management of Postoperative Pain: A Clinical Practice Guideline From the American Pain Society.", 2016, "guideline")
    ],
    ["Thresholds and tapering rates for transitioning long-term opioid therapy (e.g. 10% reduction per month) to mitigate withdrawal hyperalgesia.", "Buprenorphine transdermal/buccal positioning as a safer partial mu-agonist alternative in chronic pain."],
    ["Benzodiazepine + Opioid lethal synergy: dual sedation blunts respiratory drive and hypercapnic ventilatory response, causing nocturnal fatal apnea.", "MME calculation: converting opioid regimens to oral morphine milligram equivalents; threshold >= 50 MME/day mandates naloxone co-prescription and closer surveillance.", "Distinguishing neuropathic pain: sharp, shooting, burning pain with allodynia responds to gabapentinoids, SNRIs (duloxetine), or TCAs, but has poor response to standard opioids."],
    ["A 38-year-old status post ankle fracture fixation discharged with a 3-day supply of oxycodone 5 mg combined with scheduled acetaminophen and ibuprofen.", "A 62-year-old with chronic diabetic neuropathy whose escalating opioid doses provided minimal relief, successfully transitioned to duloxetine."]
)

# 19: Acute and recurrent pericarditis colchicine
BATCH_2[19] = make_entry(
    'acute_pericarditis_colchicine',
    "Acute pericarditis is diagnosed clinically by the presence of at least 2 of 4 cardinal ESC criteria: 1) sharp, pleuritic chest pain improved by sitting upright and leaning forward, 2) pericardial friction rub on auscultation, 3) widespread concave-upward ST-segment elevation with PR depression on ECG, and 4) new or worsening pericardial effusion. Viral infections (Coxsackie, echovirus, SARS-CoV-2) are the most common cause in high-resource settings. ESC guidelines mandate combination therapy with high-dose NSAIDs (e.g. ibuprofen 600-800 mg TID or aspirin 750-1000 mg TID) PLUS weight-adjusted oral colchicine (0.5 mg daily if < 70 kg, 0.5 mg BID if >= 70 kg) for 3 months in acute pericarditis (ICAP trial) and 6 months in recurrent pericarditis (CORP trials). Colchicine inhibits tubulin polymerization and leukocyte chemotaxis, halving recurrence rates from 37% to 16%. Systemic corticosteroids are second-line agents strictly reserved for NSAID contraindications, autoimmune etiologies, or pregnancy, as early corticosteroid use independently increases the risk of chronic recurrence.",
    [
        ("ESC 2015 guidelines establish diagnosis by >= 2 of 4 criteria: pleuritic chest pain, pericardial rub, widespread ST elevation with PR depression, and pericardial effusion.", ["26320112"]),
        ("The landmark ICAP trial proved that adding colchicine to standard NSAID therapy halves the rate of recurrent or persistent pericarditis from 37.5% to 16.7% (NNT = 5).", ["23992809"]),
        ("Weight-adjusted colchicine dosing (0.5 mg daily if < 70 kg, or 0.5 mg BID if >= 70 kg) is maintained for 3 months for first-episode acute pericarditis and 6 months for recurrences.", ["26320112"]),
        ("Systemic corticosteroids should be avoided as first-line therapy because early steroid exposure independently promotes recurrence and chronicity; rilonacept (IL-1 inhibitor) is approved for refractory recurrent pericarditis.", ["33197159"])
    ],
    [
        ("26320112", "2015 ESC Guidelines for the diagnosis and management of pericardial diseases.", 2015, "guideline"),
        ("23992809", "A Randomized Trial of Colchicine for Acute Pericarditis (ICAP).", 2013, "trial"),
        ("33197159", "Phase 3 Trial of Interleukin-1 Trap Rilonacept in Recurrent Pericarditis (RHAPSODY).", 2021, "trial")
    ],
    ["Optimal tapering schedule of colchicine and NSAIDs guided by serial high-sensitivity C-reactive protein (hs-CRP) normalization.", "Efficacy of interleukin-1 receptor antagonists (anakinra, rilonacept) as steroid-sparing agents in colchicine-refractory recurrent pericarditis."],
    ["ECG distinction: Acute pericarditis features diffuse concave-upward ST elevation with widespread PR depression and PR elevation in aVR (Spodick sign); STEMI features localized convex ST elevation with reciprocal ST depression and no PR depression.", "Why corticosteroids promote recurrence: steroids impair viral clearance and promote chronic inflammatory rebound when tapered.", "Exercise restriction: competitive athletes must cease strenuous physical activity for at least 3 months until symptom resolution and normalization of CRP/ECG."],
    ["A 27-year-old male with sharp pleuritic retrosternal pain relieved by leaning forward, diffuse concave ST elevations, and PR depression, starting ibuprofen and colchicine 0.5 mg BID.", "A patient with third episode of recurrent pericarditis dependent on prednisone who achieves rapid remission and complete steroid cessation on rilonacept."]
)

# 20, 21, 22: Acute Aortic Syndromes (Dissection, IMH, PAU)
e20_22 = make_entry(
    'acute_aortic_syndromes',
    "Acute Aortic Syndromes (AAS) encompass Acute Aortic Dissection (AAD), Intramural Hematoma (IMH), and Penetrating Atherosclerotic Ulcer (PAU), presenting with acute, tearing or ripping chest/back pain and severe hypertension. Stanford classification determines emergency management: Type A involves the ascending aorta (surgical emergency requiring immediate open surgical graft replacement to prevent pericardial tamponade, aortic rupture, or coronary malperfusion); Type B involves the descending aorta distal to the left subclavian artery (managed with medical anti-impulse therapy, reserving Thoracic Endovascular Aortic Repair [TEVAR] for complicated dissection: malperfusion, refractory pain, rapid expansion, or rupture). Initial medical therapy aims to reduce aortic wall shear stress (anti-impulse therapy): IV short-acting beta-blockers (esmolol, labetalol) must be initiated FIRST to lower heart rate < 60 bpm, followed by vasodilators (nitroprusside, nicardipine) to target systolic blood pressure 100-120 mmHg. Giving vasodilators before beta-blockers precipitates reflex tachycardia and accelerates dissection tear propagation.",
    [
        ("Stanford classification directs treatment: Type A (ascending aorta) is a surgical emergency with 1-2% hourly mortality requiring immediate operative repair; Type B is managed medically unless complicated.", ["25173340"]),
        ("Contrast-enhanced computed tomography angiography (CTA) of the chest, abdomen, and pelvis is the imaging modality of choice, providing rapid full-length aortic visualization and branch vessel assessment.", ["25173340"]),
        ("Emergency medical therapy requires anti-impulse control: intravenous beta-blockade (esmolol or labetalol) MUST precede vasodilators to lower heart rate < 60 bpm and SBP 100-120 mmHg.", ["36322051"]),
        ("Thoracic Endovascular Aortic Repair (TEVAR) is the standard of care for complicated Type B aortic dissection (visceral/limb malperfusion, refractory pain/hypertension, rupture, or aneurysm expansion).", ["25173340"])
    ],
    [
        ("25173340", "2014 ESC Guidelines on the diagnosis and treatment of aortic diseases.", 2014, "guideline"),
        ("36322051", "2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease.", 2022, "guideline")
    ],
    ["Role of routine pre-emptive TEVAR in uncomplicated Type B dissection with high-risk anatomical features (entry tear > 10 mm, false lumen diameter > 22 mm).", "Differentiating intramural hematoma (IMH) from classic double-lumen dissection regarding surgical threshold in elderly patients."],
    ["The vital anti-impulse sequence: ALWAYS start beta-blocker before vasodilator; vasodilators alone trigger sympathetic reflex tachycardia, increasing dP/dt (shear stress) and causing fatal retrograde propagation.", "Complications of Type A dissection: acute severe aortic regurgitation (diastolic murmur), cardiac tamponade (pulsus paradoxus, Beck triad), and coronary ostial occlusion (inferior STEMI).", "Pulse deficit: unequal blood pressure between arms (> 20 mmHg systolic difference) or absent radial/femoral pulses strongly supports aortic dissection in acute chest pain."],
    ["A 59-year-old male presenting with tearing interscapular back pain, BP 198/104, whose CTA shows a Type A dissection extending from aortic root to iliac bifurcation, transferred immediately to OR.", "A patient with uncomplicated Type B dissection controlled with IV esmolol and nicardipine to HR 56 bpm and SBP 112 mmHg in the ICU."]
)
BATCH_2[20] = e20_22
BATCH_2[21] = e20_22
BATCH_2[22] = e20_22

# 23 & 24: Acute Asthma Exacerbation and Treatment
e23_24 = make_entry(
    'acute_asthma_exacerbation',
    "Acute severe asthma exacerbation is characterized by progressive dyspnea, wheezing, chest tightness, and airflow obstruction, quantified by Peak Expiratory Flow (PEF) < 50% predicted or personal best. Initial therapy mandates repetitive or continuous inhaled short-acting beta-2 agonists (SABA; albuterol 4-8 puffs or 2.5-5 mg nebulized) combined with inhaled ipratropium bromide (500 ug nebulized q20min x 3 doses), which reduces hospital admissions by 30%. Systemic corticosteroids (oral prednisone 40-50 mg daily for 5-7 days, or IV methylprednisolone 60-80 mg in severe cases) must be administered early within 1 hour of presentation to accelerate resolution of airway inflammation. In severe exacerbations unresponsive to initial nebulization, single-dose intravenous magnesium sulfate (2 g IV over 20 min) provides safe, potent bronchodilation and reduces hospitalizations. Controlled oxygen therapy should target SpO2 93-95% (avoiding hyperoxia, which worsens V/Q mismatch and hypercapnia). A 'normal' or rising PaCO2 (> 40 mmHg) or silent chest signals respiratory muscle fatigue and impending fatal respiratory arrest.",
    [
        ("GINA guidelines mandate immediate repetitive SABA plus ipratropium bromide nebulization, which significantly reduces hospital admissions compared to SABA monotherapy.", ["31504429"]),
        ("Systemic corticosteroids administered within 1 hour of emergency department presentation accelerate airflow recovery, prevent relapses, and reduce hospitalization rates.", ["31504429"]),
        ("Intravenous magnesium sulfate (2 g IV over 20 minutes) is indicated in acute severe asthma with PEF < 50% failing initial bronchodilators, significantly improving FEV1 and reducing admission.", ["24865181"]),
        ("A 'normal' or elevated PaCO2 (> 40-45 mmHg) in a tachypneic asthmatic is an ominous sign of respiratory muscle exhaustion, signaling impending arrest requiring ICU monitoring and preparation for intubation.", ["31504429"])
    ],
    [
        ("31504429", "Global Initiative for Asthma (GINA) Global Strategy for Asthma Management and Prevention.", 2021, "guideline"),
        ("24865181", "Intravenous magnesium sulfate for acute asthma: systematic review and meta-analysis.", 2014, "meta-analysis")
    ],
    ["Indications and safety of non-invasive ventilation (BIPAP) vs rapid sequence intubation in severe acute asthma exacerbations.", "Inpatient initiation of high-dose inhaled corticosteroid/formoterol (SMART strategy) at discharge to prevent post-discharge readmission."],
    ["The 'silent chest' warning: absent breath sounds on auscultation indicates airflow is insufficient to produce wheezing, warning of severe critical airway obstruction.", "Arterial blood gas progression: early asthma causes tachypnea, respiratory alkalosis (low PaCO2); a 'normal' PaCO2 represents fatigue and worsening failure.", "Ventilator strategy if intubated: low tidal volumes (6 mL/kg), low respiratory rates, and prolonged expiratory time (I:E 1:3 to 1:4) to prevent dynamic hyperinflation (auto-PEEP) and tension pneumothorax."],
    ["A 22-year-old with acute severe asthma whose PEF is 35% predicted, receiving continuous albuterol-ipratropium, oral prednisone 50 mg, and IV magnesium sulfate 2 g.", "A patient in status asthmaticus who becomes drowsy with silent chest on auscultation and whose venous blood gas reveals pH 7.22 and PCO2 56 mmHg."]
)
BATCH_2[23] = e23_24
BATCH_2[24] = e23_24

# 25, 26, 27: Acute Bacterial Meningitis (Dexamethasone and Empiric Therapy)
e25_27 = make_entry(
    'acute_bacterial_meningitis_empiric_therapy',
    "Acute bacterial meningitis is a life-threatening CNS infection presenting with the classic triad of fever, neck stiffness (nuchal rigidity, positive Kernig/Brudzinski signs), and altered mental status. Most common community pathogens in adults are Streptococcus pneumoniae and Neisseria meningitidis; Listeria monocytogenes must be covered in adults >= 50 years, alcoholics, or immunocompromised individuals. Empiric therapy in adults < 50 is IV ceftriaxone (2 g q12h) plus vancomycin (15-20 mg/kg q8-12h); adults >= 50 require the addition of IV ampicillin (2 g q4h) to cover Listeria. Adjuvant dexamethasone (10 mg IV) must be given BEFORE or WITH the first antibiotic dose: the landmark European randomized trial proved dexamethasone reduces mortality by 41% and sensorineural hearing loss in pneumococcal meningitis. Lumbar puncture should not be delayed for neuroimaging unless specific 'CT before LP' criteria exist; if imaging is necessary, blood cultures must be drawn and antibiotics + dexamethasone administered immediately prior to CT scan.",
    [
        ("Adjuvant intravenous dexamethasone (10 mg q6h for 4 days) initiated before or with the first antibiotic dose significantly reduces mortality and hearing loss in pneumococcal meningitis (European trial).", ["12432041"]),
        ("Empiric antimicrobial regimen: ceftriaxone 2 g q12h plus vancomycin for all adults; add ampicillin 2 g q4h in adults >= 50 years or immunocompromised hosts to cover Listeria monocytogenes.", ["15340810"]),
        ("CT of the head prior to lumbar puncture is indicated ONLY if specific high-risk features exist: immunocompromised state, history of CNS disease, new-onset seizures, papilledema, abnormal consciousness, or focal neurologic deficit.", ["15340810"]),
        ("If CT head is required before LP, blood cultures must be drawn immediately and empiric antibiotics plus dexamethasone administered WITHOUT waiting for CT completion.", ["15340810"])
    ],
    [
        ("12432041", "Dexamethasone in adults with bacterial meningitis: a prospective randomized double-blind multicenter trial.", 2002, "trial"),
        ("15340810", "Infectious Diseases Society of America (IDSA) Practice Guidelines for the Management of Bacterial Meningitis.", 2004, "guideline"),
        ("27068860", "ESCMID guideline on diagnosis and treatment of acute bacterial meningitis.", 2016, "guideline")
    ],
    ["Duration of dexamethasone therapy: whether to discontinue immediately if CSF Gram stain or PCR identifies Neisseria meningitidis instead of S. pneumoniae.", "Diagnostic accuracy of CSF multiplex PCR (FilmArray ME panel) in antibiotic-pretreated meningitis."],
    ["Timing rule for dexamethasone: must be administered BEFORE or WITH the first dose of antibiotics; giving steroids after antibiotics has no neuroprotective benefit.", "Why ampicillin is mandatory in older adults: cephalosporins lack activity against Listeria monocytogenes; ampicillin provides bactericidal activity.", "Classic CSF findings in acute bacterial meningitis: opening pressure > 200 mm H2O, neutrophilic pleocytosis (1,000-10,000 WBC/uL, > 80% PMNs), high protein (> 100-200 mg/dL), and low glucose (CSF/serum ratio < 0.4)."],
    ["A 69-year-old presenting with fever, photophobia, and confusion: blood cultures drawn and IV dexamethasone 10 mg + ceftriaxone + vancomycin + ampicillin administered prior to emergent CT head.", "A 21-year-old with fever, petechiae, and nuchal rigidity whose CSF reveals Gram-negative diplococci, receiving high-dose ceftriaxone and droplet isolation."]
)
BATCH_2[25] = e25_27
BATCH_2[26] = e25_27
BATCH_2[27] = e25_27

# 28: Acute behavioural disturbance / delirium
BATCH_2[28] = make_entry(
    'acute_behavioural_disturbance_and_delirium',
    "Acute behavioural disturbance (ABD) and severe agitation in the emergency and acute inpatient setting represent medical emergencies that threaten patient and staff safety. Most common causes include acute delirium, intoxication (sympathomimetics, alcohol, synthetic cannabinoids), sedative withdrawal, severe psychiatric psychosis, metabolic derangements, and traumatic brain injury. Clinical management follows a staged de-escalation hierarchy: environmental adaptation and verbal de-escalation are attempted first. When non-pharmacologic measures fail and physical danger exists, parenteral pharmacotherapy is deployed: for delirium and undifferentiated agitation, low-dose atypical antipsychotics (haloperidol 2.5-5 mg IM or olanzapine 5-10 mg IM) are first-line. For stimulant toxicity or alcohol withdrawal, intravenous or intramuscular benzodiazepines (lorazepam 1-2 mg or midazolam 2.5-5 mg) are the treatments of choice. For violent, hyperactive excited delirium, intramuscular ketamine (3-4 mg/kg IM) achieves rapid sedation within 5 minutes under strict airway monitoring.",
    [
        ("A structured stepwise approach begins with non-pharmacologic de-escalation, reserving chemical sedation for patients presenting immediate physical danger to themselves or staff.", ["29485925"]),
        ("Benzodiazepines (lorazepam, midazolam) are the first-line sedatives for agitation driven by sympathomimetic intoxication (cocaine, methamphetamines) or alcohol withdrawal.", ["29485925"]),
        ("Antipsychotics (haloperidol, olanzapine, droperidol) provide effective sedation for psychotic agitation and delirium, but require ECG monitoring for QTc prolongation.", ["31504429"]),
        ("Intramuscular ketamine (3-4 mg/kg IM) produces rapid, reliable dissociation within 3-5 minutes in extreme, life-threatening violent agitation failing other agents, under dedicated airway monitoring.", ["31504429"])
    ],
    [
        ("31504429", "ACEP Clinical Policy: Critical Issues in the Evaluation and Management of Adult Patients Presenting to the Emergency Department With Acute Agitation.", 2018, "guideline"),
        ("29485925", "Acute behavioural disturbance in the emergency department: consensus management guidelines.", 2017, "review")
    ],
    ["Comparative incidence of respiratory depression and endotracheal intubation with prehospital ketamine vs droperidol/midazolam.", "Management of acute dystonic reactions and akathisia with anticholinergic agents (diphenhydramine, benztropine)."],
    ["Etiology-directed sedation selection: Stimulant/Alcohol withdrawal = Benzodiazepines; Primary psychosis/Delirium = Antipsychotics (avoid benzos in elderly delirium); Extreme uncontrolled violence = Ketamine.", "Adverse effect monitoring: QT prolongation and torsades de pointes with IV haloperidol/droperidol; respiratory depression and laryngospasm with ketamine and high-dose benzodiazepines.", "Immediate post-sedation protocol: continuous pulse oximetry, cardiac telemetry, blood glucose check, and temperature monitoring to detect malignant hyperthermia/serotonin syndrome."],
    ["A 24-year-old brought by EMS with acute cocaine intoxication, hyperthermia, and extreme paranoia, calmed safely with titrated IV lorazepam.", "An 82-year-old post-hip-fracture patient with hyperactive delirium pulling lines, managed with low-dose oral quetiapine and non-pharmacologic orientation."]
)

# 29 & 30: Acute Cholecystitis & Cholangitis (Tokyo Guidelines)
e29_30 = make_entry(
    'acute_cholecystitis_and_ascending_cholangitis',
    "Acute cholecystitis and acute cholangitis represent common biliary infections governed by the international Tokyo Guidelines (TG18). Acute cholecystitis is defined by local inflammation (Murphy's sign, RUQ tenderness), systemic inflammation (fever, elevated CRP/WBC), and confirmatory imaging (ultrasound showing gallbladder wall thickening >= 4 mm, pericholecystic fluid, sonographic Murphy's sign). Laparoscopic cholecystectomy performed early within 72 hours of symptom onset (or during index admission) is the gold standard, achieving shorter hospital stays and fewer complications than delayed surgery. Acute cholangitis is a medical emergency caused by biliary tract obstruction (primarily choledocholithiasis) with bacterial superinfection, presenting with Charcot's triad (fever, jaundice, RUQ pain) or Reynolds' pentad (adding hypotension and altered mental status in septic shock). TG18 mandates immediate resuscitation, empiric broad-spectrum antibiotics, and emergency biliary decompression via Endoscopic Retrograde Cholangiopancreatography (ERCP) within 24 hours (or emergent < 12 hours for severe Grade III cholangitis).",
    [
        ("Tokyo Guidelines 2018 (TG18) recommend early laparoscopic cholecystectomy within 72 hours of symptom onset as the optimal treatment of choice for acute cholecystitis.", ["29098596"]),
        ("Acute cholangitis is diagnosed by systemic inflammation (fever, elevated WBC/CRP), cholestasis (jaundice, elevated transaminases/alkaline phosphatase), and biliary dilation on imaging.", ["29098596"]),
        ("Severe (Grade III) acute cholangitis with organ dysfunction mandates immediate fluid resuscitation, broad-spectrum IV antibiotics, and urgent biliary drainage by ERCP within 12 hours.", ["29098596"]),
        ("In high-risk surgical patients with acute cholecystitis unfit for emergency surgery, ultrasound-guided percutaneous transhepatic gallbladder drainage (PTGBD) provides effective temporary or definitive decompression.", ["29098596"])
    ],
    [
        ("29098596", "Tokyo Guidelines 2018: diagnostic criteria and severity assessment of acute cholecystitis and acute cholangitis.", 2018, "guideline"),
        ("29098597", "Tokyo Guidelines 2018: management bundles for acute cholangitis and cholecystitis.", 2018, "guideline")
    ],
    ["Indications and timing for intraoperative cholangiography (IOC) or laparoscopic common bile duct exploration vs pre-operative ERCP for suspected choledocholithiasis.", "EUS-guided biliary drainage (EUS-BD) as an alternative to percutaneous drainage when ERCP cannulation fails in acute suppurative cholangitis."],
    ["Charcot triad vs Reynolds pentad: Charcot = Fever, Jaundice, RUQ pain (50-70% sensitivity); Reynolds pentad = Charcot + Shock (hypotension) + Confusion (indicates life-threatening suppurative ascending cholangitis).", "Timing of cholecystectomy: early surgery (< 72 hours) avoids dense inflammatory adhesions that develop after 7-10 days, reducing conversion rate to open surgery.", "Antibiotic selection: cover enteric pathogens (E. coli, Klebsiella, Enterococcus) with piperacillin-tazobactam or ceftriaxone plus metronidazole."],
    ["A 48-year-old female with acute calculous cholecystitis presenting at 36 hours from pain onset, undergoing successful early laparoscopic cholecystectomy on index admission.", "A 74-year-old male presenting with jaundice, temperature 39.4 C, BP 86/52, and dilated 12 mm CBD on ultrasound, undergoing emergent bedside ERCP with sphincterotomy and stent placement."]
)
BATCH_2[29] = e29_30
BATCH_2[30] = e29_30
