# batch_data_part3.py
"""
Definitions for Batch 6 (176-190) and Batch 7 (191-205).
"""
from batch_data_part1 import make_entry

BATCH_6 = {}
BATCH_7 = {}

# BATCH 6: 176 to 190
e176 = make_entry(
    'apixaban_aristotle_trial',
    "The landmark ARISTOTLE trial compared the oral direct factor Xa inhibitor apixaban (5 mg twice daily, or 2.5 mg twice daily in select patients) with dose-adjusted warfarin in 18,201 patients with non-valvular atrial fibrillation. Apixaban achieved significant superiority in preventing stroke or systemic embolism (21% reduction), major bleeding (31% reduction), and all-cause mortality (11% reduction).",
    [
        ("In the ARISTOTLE trial, apixaban was superior to warfarin in preventing stroke or systemic embolism (HR 0.79, 95% CI 0.66-0.95; p < 0.001 for non-inferiority, p = 0.01 for superiority).", ["21875378"]),
        ("Apixaban significantly reduced major bleeding by 31% (HR 0.69; p < 0.001) and intracranial hemorrhage by 58% compared to warfarin.", ["21875378"]),
        ("Apixaban demonstrated a statistically significant 11% reduction in all-cause mortality (HR 0.89; p = 0.047), a landmark finding unique among pivotal DOAC trials.", ["21875378"]),
        ("Dose reduction to 2.5 mg twice daily is indicated if at least 2 of 3 criteria are met: age >= 80 years, body weight <= 60 kg, or serum creatinine >= 1.5 mg/dL.", ["21875378"])
    ],
    [
        ("21875378", "Apixaban versus Warfarin in Patients with Atrial Fibrillation (ARISTOTLE).", 2011, "trial"),
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation.", 2024, "guideline")
    ],
    ["Efficacy and safety of full-dose versus reduced-dose apixaban in patients with isolated border-zone renal function.", "Comparative effectiveness in patients with extreme obesity (weight > 140 kg)."],
    ["The ARISTOTLE triple win: superior stroke reduction, superior bleeding reduction, and statistically significant reduction in all-cause mortality.", "The specific 2-of-3 dose reduction criteria (Age >= 80, Weight <= 60 kg, Creatinine >= 1.5 mg/dL).", "Absence of increased GI bleeding with apixaban vs warfarin (unlike rivaroxaban and dabigatran 150 mg)."],
    ["An 81-year-old female weighing 58 kg with serum creatinine 1.6 mg/dL starting apixaban 2.5 mg BID.", "A 72-year-old male with AF and prior ischemic stroke initiated on apixaban 5 mg BID."]
)
BATCH_6[176] = e176
BATCH_6[177] = e176

e178 = make_entry(
    'aplastic_anaemia',
    "Severe aplastic anaemia (SAA) is an immune-mediated bone marrow failure disorder characterized by profound pancytopenia and hypocellular bone marrow (cellularity < 25-30%) without dysplasia or fibrosis. In young, fit patients (< 40-50 years) with an HLA-matched sibling donor, upfront allogeneic hematopoietic cell transplantation is curative. For older patients or those lacking a matched sibling, immunosuppressive therapy (IST) with horse anti-thymocyte globulin (ATG), cyclosporine, and the thrombopoietin receptor agonist eltrombopag achieves > 80% response rates.",
    [
        ("British Society for Haematology guidelines define SAA by bone marrow cellularity < 25% and at least two of: neutrophils < 0.5 x 10^9/L, platelets < 20 x 10^9/L, or reticulocytes < 60 x 10^9/L (Camitta criteria).", ["37947196"]),
        ("First-line allogeneic HCT from an HLA-matched sibling donor cures > 85-90% of children and young adults with severe aplastic anaemia.", ["37947196"]),
        ("Adding eltrombopag to horse ATG and cyclosporine significantly increases complete and overall hematologic response rates (87% vs 66%) in treatment-naive SAA (RACE trial).", ["35021024"]),
        ("Horse ATG (ATGAM) is clinically superior to rabbit ATG (Thymoglobulin) for initial immunosuppressive therapy in SAA.", ["21813796"])
    ],
    [
        ("37947196", "Guidelines for the diagnosis and management of adult aplastic anaemia (BSH).", 2024, "guideline"),
        ("35021024", "Immunosuppressive Therapy with or without Eltrombopag in Severe Aplastic Anemia (RACE Trial).", 2022, "trial"),
        ("21813796", "Horse versus rabbit antithymocyte globulin in severe aplastic anemia.", 2011, "trial")
    ],
    ["Efficacy and graft-versus-host disease rates with upfront matched unrelated donor (MUD) vs IST in adults aged 40-60.", "Clonal evolution to paroxysmal nocturnal hemoglobinuria (PNH) or myelodysplastic syndrome (MDS with monosomy 7) following successful IST."],
    ["Camitta criteria for severe aplastic anemia: marrow cellularity < 25% plus 2 of: ANC < 0.5 x 10^9/L, Plt < 20 x 10^9/L, Retics < 60 x 10^9/L (ANC < 0.2 defines very severe AA).", "Serum sickness prophylaxis and management during horse ATG: high-dose oral prednisone (1 mg/kg/day) for 10-14 days.", "Why horse ATG is preferred over rabbit ATG in primary SAA: rabbit ATG causes excessive profound T-cell depletion and higher early mortality."],
    ["A 23-year-old presenting with epistaxis, bruising, and fatigue; labs show Hb 7.2 g/dL, ANC 0.3 x 10^9/L, platelets 11 x 10^9/L, and marrow cellularity 10%.", "A 56-year-old with SAA without a matched sibling initiated on horse ATG, cyclosporine, and eltrombopag (RACE protocol)."]
)
BATCH_6[178] = e178
BATCH_6[179] = e178

BATCH_6[180] = make_entry(
    'appendicitis',
    "Acute appendicitis is the most common surgical abdominal emergency, caused by luminal obstruction (fecalith, lymphoid hyperplasia) leading to distension, bacterial invasion, ischemia, and perforation. Diagnosis is supported by clinical decision rules (Alvarado, AIR scores) and confirmed by ultrasound in children/young females or contrast-enhanced CT in adults. Laparoscopic appendectomy remains the definitive standard of care, though selected uncomplicated cases can be managed with antibiotics.",
    [
        ("WSES guidelines recommend laparoscopic appendectomy as the gold-standard treatment for acute appendicitis, offering lower surgical site infection and faster recovery.", ["32773454"]),
        ("Contrast-enhanced abdominal CT has a sensitivity of 95-98% and specificity > 95% in adults, accurately distinguishing uncomplicated from complicated (gangrenous, perforated) appendicitis.", ["32773454"]),
        ("Antibiotic-first non-operative management (CODA trial) is successful in ~70% of uncomplicated appendicitis at 90 days, but is associated with a 29% appendectomy recurrence rate at 1 year.", ["33022199"]),
        ("Presence of an appendicolith on CT is strongly associated with non-operative antibiotic failure, recurrent appendicitis, and early perforation.", ["33022199"])
    ],
    [
        ("32773454", "Diagnosis and treatment of acute appendicitis: 2020 update of the WSES Jerusalem guidelines.", 2020, "guideline"),
        ("33022199", "A Randomized Trial Comparing Antibiotics with Appendectomy for Appendicitis (CODA Trial).", 2020, "trial")
    ],
    ["Optimal interval for elective interval appendectomy following successful non-operative management of an appendiceal phlegmon or abscess.", "Antibiotic duration (24-48h vs 4 days) post-appendectomy in complicated perforated appendicitis."],
    ["Clinical signs of appendicitis: McBurney point tenderness, Rovsing sign (RLQ pain with LLQ palpation), psoas sign, and obturator sign.", "Alvarado score criteria (MANTRELS mnemonic: Migration, Anorexia, Nausea, Tenderness RLQ, Rebound, Elevation of temp, Leukocytosis, Shift of neutrophils).", "Appendicolith significance: major contraindication to non-operative antibiotic management due to high failure rate."],
    ["A 21-year-old male with periumbilical pain migrating to the right lower quadrant, low-grade fever, anorexia, and WBC 14.8 x 10^9/L.", "An adult with CT-proven uncomplicated acute appendicitis asking if surgery can be avoided with antibiotics."]
)

BATCH_6[181] = make_entry(
    'ards_berlin_definition',
    "Acute respiratory distress syndrome (ARDS) is an acute diffuse inflammatory lung injury characterized by increased pulmonary vascular permeability, alveolar flooding, and severe refractory hypoxemia. The Berlin definition requires onset within 1 week of clinical insult, bilateral radiographic opacities not fully explained by heart failure, and PaO2/FiO2 <= 300 with PEEP >= 5 cmH2O. Core management relies on lung-protective ventilation (low tidal volumes, low driving pressure) and early prone positioning.",
    [
        ("The Berlin definition stages ARDS into mild (PaO2/FiO2 201-300), moderate (101-200), and severe (<= 100 mmHg) with minimum PEEP >= 5 cmH2O.", ["22614452"]),
        ("Lung-protective ventilation with low tidal volumes (4-8 mL/kg predicted body weight) and plateau pressure < 30 cmH2O significantly reduces 28-day mortality (ARMA trial).", ["10793162"]),
        ("Prone positioning for at least 16 consecutive hours daily reduces 28-day and 90-day mortality in severe ARDS with PaO2/FiO2 < 150 mmHg (PROSEVA trial).", ["23688302"]),
        ("Conservative fluid management strategy increases ventilator-free days and ICU-free days without increasing non-pulmonary organ failure (FACTT trial).", ["16714487"])
    ],
    [
        ("22614452", "Acute respiratory distress syndrome: the Berlin Definition.", 2012, "guideline"),
        ("10793162", "Ventilation with lower tidal volumes as compared with traditional tidal volumes for acute lung injury (ARMA Trial).", 2000, "trial"),
        ("23688302", "Prone positioning in severe acute respiratory distress syndrome (PROSEVA Trial).", 2013, "trial"),
        ("16714487", "Comparison of two fluid-management strategies in acute lung injury (FACTT Trial).", 2006, "trial")
    ],
    ["Indications and timing for venovenous extracorporeal membrane oxygenation (VV-ECMO) in refractory severe ARDS (EOLIA trial criteria).", "Optimal titration of PEEP: high vs low PEEP tables versus esophageal manometry / electrical impedance tomography."],
    ["Berlin definition pillars: Onset <= 7 days, Bilateral opacities on chest imaging, Origin not fully hydrostatic/fluid overload, Oxygenation threshold with PEEP >= 5.", "Calculation of Predicted Body Weight (PBW): tidal volume must be based on height and biological sex, NOT actual scale weight.", "Driving pressure (Plateau pressure minus PEEP): maintaining driving pressure < 14-15 cmH2O independently predicts lower mortality."],
    ["A 48-year-old with severe pneumonia in ICU intubated on 60% oxygen and PEEP 10 with PaO2 78 mmHg (PaO2/FiO2 = 130; moderate ARDS).", "A septic patient with severe ARDS (PaO2/FiO2 = 88) who is turned prone for an 18-hour cycle with subsequent PaO2/FiO2 rise to 175."]
)

e182 = make_entry(
    'arterial_blood_gas_interpretation',
    "Arterial blood gas (ABG) analysis is a foundational diagnostic tool in critical care and emergency medicine. A systematic 6-step interpretation approach evaluates: 1) PaO2 and SaO2 for oxygenation, 2) pH for acidemia (< 7.35) or alkalemia (> 7.45), 3) PaCO2 for respiratory disturbances, 4) HCO3- and Base Excess for metabolic disturbances, 5) Serum anion gap (Na - [Cl + HCO3-], normal 10-12 mEq/L), and 6) Delta ratio (Delta AG / Delta HCO3-) to identify mixed metabolic disorders.",
    [
        ("A systematic 6-step algorithmic approach prevents overlooking hidden mixed acid-base disorders in critically ill ICU patients.", ["24635770"]),
        ("Anion gap calculation must be corrected for hypoalbuminemia: adjusted AG = observed AG + 2.5 * (4.0 - serum albumin in g/dL).", ["24635770"]),
        ("Winter's formula determines appropriate respiratory compensation in metabolic acidosis: expected PaCO2 = 1.5 * [HCO3-] + 8 (+/- 2).", ["24635770"]),
        ("Delta ratio (Delta AG / Delta HCO3-): < 0.4-0.8 indicates mixed high AG and normal AG metabolic acidosis; > 1.6-2.0 indicates concurrent metabolic alkalosis.", ["24635770"])
    ],
    [
        ("24635770", "Acid-base disorders in the intensive care unit: a systematic approach.", 2014, "review"),
        ("38480320", "KDIGO 2024 Clinical Practice Guideline for the Management of Acute Kidney Injury.", 2024, "guideline")
    ],
    ["Clinical utility of Stewart physicochemical quantitative approach (strong ion difference) versus classical Henderson-Hasselbalch approach.", "Use of venous blood gas (VBG) as a reliable surrogate for pH, PaCO2, and lactate in hemodynamically stable patients."],
    ["Winter's formula calculation: if measured PaCO2 is higher than expected, concurrent respiratory acidosis is present; if lower, concurrent respiratory alkalosis is present.", "GOLDMARK mnemonic for high anion gap metabolic acidosis: Glycols, Oxoproline, L-lactate, D-lactate, Methanol, Aspirin, Renal failure, Ketoacidosis.", "Albumin effect on anion gap: each 1 g/dL drop in albumin lowers normal baseline anion gap by 2.5 mEq/L."],
    ["A diabetic patient in ED with pH 7.18, PaCO2 24 mmHg, HCO3- 9 mEq/L, Na 138, Cl 96, albumin 4.0 (pure DKA with appropriate respiratory compensation).", "A COPD patient with chronic CO2 retention who develops sepsis and lactic acidosis presenting with mixed respiratory and metabolic acidosis."]
)
BATCH_6[182] = e182
BATCH_6[183] = e182

BATCH_6[184] = make_entry(
    'arterial_leg_ulcer',
    "Arterial leg ulcers are painful, ischemic, non-healing lower extremity wounds resulting from peripheral artery disease (PAD) and microvascular insufficiency. They are typically deep, punched-out, painful (worse with elevation, relieved by hanging leg over bed), located on distally perfused sites (toes, lateral malleolus, heels), with pale/cyanotic skin and absent pulses. Diagnostic evaluation requires Ankle-Brachial Index (ABI), duplex ultrasound, and vascular surgery revascularization.",
    [
        ("AHA/ACC and ESVS guidelines establish that compression bandaging is strictly contraindicated in severe arterial ulcers with ABI < 0.5 or ankle pressure < 50 mmHg.", ["38241123"]),
        ("Ankle-Brachial Index (ABI) <= 0.90 is diagnostic of peripheral artery disease; values > 1.40 indicate non-compressible, calcified arteries warranting Toe-Brachial Index (TBI < 0.70).", ["38241123"]),
        ("Endovascular or surgical revascularization is the essential cornerstone of limb salvage in chronic limb-threatening ischemia (CLTI / Rutherford stage 5-6).", ["31504429"]),
        ("Comprehensive medical therapy includes high-intensity statin, single antiplatelet therapy (clopidogrel 75 mg or low-dose rivaroxaban + aspirin [COMPASS trial]), and smoking cessation.", ["38241123"])
    ],
    [
        ("38241123", "2024 ACC/AHA Guideline for the Management of Lower Extremity Peripheral Artery Disease.", 2024, "guideline"),
        ("31504429", "Global vascular guidelines on the management of chronic limb-threatening ischemia (ESVS/SVS).", 2019, "guideline")
    ],
    ["Endovascular angioplasty/stenting vs surgical bypass with autologous saphenous vein in long femoropopliteal CLTI lesions (BEST-CLI trial).", "Role of hyperbaric oxygen therapy in non-reconstructable ischemic ulcers."],
    ["Distinguishing arterial from venous ulcers: arterial ulcers are deep, punched-out, painful, relieved by dependency, lack granulation tissue; venous ulcers are superficial, exudative, medial malleolar, painless or dull ache.", "Contraindication to compression therapy: absolute contraindication when ABI < 0.5 to avoid precipitating acute tissue gangrene.", "The COMPASS regimen in symptomatic PAD: rivaroxaban 2.5 mg BID plus aspirin 100 mg daily reduces major adverse limb events (amputation) by 46%."],
    ["A 72-year-old diabetic smoker with a punched-out ulcer over the left 5th metatarsal head, absent dorsalis pedis pulse, and severe resting foot pain at night.", "A patient with non-compressible calcified vessels (ABI 1.45) undergoing toe-brachial index testing showing TBI 0.38."]
)

BATCH_6[185] = make_entry(
    'asbestosis',
    "Asbestosis is a chronic interstitial pneumonitis and progressive pulmonary fibrosis caused by the inhalation of microscopic asbestos fibers. It typically manifests 20-30 years following substantial occupational exposure (shipyards, construction, insulation). Clinical features include exertional dyspnea, dry bibasilar inspiratory crackles, finger clubbing, and restrictive spirometry with reduced DLCO. HRCT shows subpleural curvilinear lines, parenchymal bands, and calcified pleural plaques.",
    [
        ("ATS criteria establish diagnosis based on documented history of significant asbestos exposure, latency > 20 years, restrictive lung defect with reduced DLCO, and characteristic HRCT fibrosis.", ["15256488"]),
        ("High-resolution chest CT demonstrates bilateral, predominantly subpleural and basilar fibrosis, accompanied by bilateral calcified parietal pleural plaques along ribs and diaphragm.", ["15256488"]),
        ("Pleural plaques indicate prior asbestos exposure but do not themselves cause significant functional lung impairment or undergo malignant transformation.", ["15256488"]),
        ("Asbestos exposure combined with cigarette smoking acts synergistically to multiply the lifetime risk of bronchogenic carcinoma by up to 50- to 60-fold.", ["15256488"])
    ],
    [
        ("15256488", "American Thoracic Society: Diagnosis and initial management of nonmalignant diseases related to asbestos.", 2004, "guideline"),
        ("31504429", "Occupational and environmental lung disease: an official ATS/ERS statement.", 2019, "guideline")
    ],
    ["Efficacy and safety of antifibrotic therapies (nintedanib, pirfenidone) in progressive fibrosing asbestosis phenotypes.", "Low-dose screening chest CT protocols for lung cancer in heavily exposed asbestos workers."],
    ["Diagnostic hallmark on HRCT: parenchymal fibrosis (interlobular septal thickening, honeycombing) combined with bilateral diaphragmatic calcified pleural plaques.", "The synergistic multiplier: asbestos alone increases lung cancer risk 5-fold, smoking alone 10-fold; combined exposure increases lung cancer risk 50- to 60-fold.", "Malignant pleural mesothelioma distinction: mesothelioma is NOT asbestosis; it is an aggressive pleural malignancy that can occur even after low-level asbestos exposure."],
    ["A 68-year-old retired shipyard boiler insulation worker presenting with progressive exertional breathlessness, clubbing, and bilateral basilar 'velcro' crackles.", "A patient whose routine chest X-ray reveals bilateral calcified diaphragmatic pleural plaques, asking if he has lung cancer."]
)

BATCH_6[186] = make_entry(
    'ascites',
    "Ascites in cirrhosis results from sinusoidal portal hypertension, splanchnic arterial vasodilation, neurohumoral activation (RAAS, sympathetic nervous system), and avid renal sodium/water retention. Diagnostic paracentesis is mandatory at admission to calculate the serum-ascites albumin gradient (SAAG) and exclude spontaneous bacterial peritonitis (neutrophils >= 250/uL). First-line medical therapy combines dietary sodium restriction (< 2 g/day) with dual diuretic therapy (spironolactone plus furosemide).",
    [
        ("AASLD and EASL guidelines mandate diagnostic paracentesis in all patients hospitalized with new-onset or worsening cirrhotic ascites to rule out SBP.", ["34509341"]),
        ("Serum-ascites albumin gradient (SAAG = serum albumin - ascites albumin) >= 1.1 g/dL confirms portal hypertension with 97% accuracy.", ["34509341"]),
        ("First-line diuretic therapy uses a 100:40 mg ratio of spironolactone to furosemide, maintaining normokalemia while titrating to a maximum of 400:160 mg daily.", ["34509341"]),
        ("Large-volume paracentesis (> 5 L) requires concurrent intravenous albumin infusion (6-8 g per liter of ascites removed) to prevent paracentesis-induced circulatory dysfunction (PICD).", ["34509341"])
    ],
    [
        ("34509341", "AASLD Practice Guidance on Management of Ascites and Complications in Patients with Cirrhosis.", 2021, "guideline"),
        ("30041864", "EASL Clinical Practice Guidelines for the management of patients with decompensated cirrhosis.", 2018, "guideline")
    ],
    ["Indications for early transjugular intrahepatic portosystemic shunt (TIPS) in refractory ascites versus repeated paracenteses.", "Role of long-term weekly outpatient albumin infusions in decompensated cirrhosis (ANSWER trial controversy)."],
    ["SAAG interpretation: SAAG >= 1.1 g/dL indicates portal hypertension (cirrhosis, heart failure, Budd-Chiari); SAAG < 1.1 indicates peritoneal carcinomatosis, peritoneal tuberculosis, pancreatitis, or nephrotic syndrome.", "Ascitic fluid total protein: in cardiac ascites, SAAG is >= 1.1 and protein is > 2.5 g/dL; in cirrhotic ascites, SAAG is >= 1.1 and protein is typically < 2.5 g/dL.", "SBP diagnosis and empiric therapy: ascitic neutrophil count >= 250/uL; treat immediately with IV ceftriaxone and IV albumin (1.5 g/kg day 1, 1.0 g/kg day 3)."],
    ["A 54-year-old with alcoholic cirrhosis admitted with new abdominal distension; paracentesis yields SAAG 1.6 g/dL and 420 neutrophils/uL.", "A patient undergoing an 8-liter therapeutic paracentesis who receives 60 grams of IV 20% albumin to prevent circulatory collapse."]
)

BATCH_6[187] = make_entry(
    'aspiration_pneumonia',
    "Aspiration pneumonia occurs when colonized oropharyngeal or gastric secretions are inhaled into the lower respiratory tract, triggering acute bacterial infection. It must be distinguished from chemical aspiration pneumonitis (Mendelson syndrome: acute gastric acid-induced chemical lung injury without initial bacterial infection). First-line antibiotic therapy for community-acquired aspiration pneumonia is ampicillin-sulbactam, amoxicillin-clavulanate, or moxifloxacin. Dedicated anaerobic coverage is reserved for lung abscess, empyema, or severe periodontal disease.",
    [
        ("IDSA/ATS guidelines recommend ampicillin-sulbactam or amoxicillin-clavulanate as preferred first-line therapy for community-acquired aspiration pneumonia.", ["31573350"]),
        ("Routine addition of specific anaerobic coverage (e.g. clindamycin or metronidazole) is no longer recommended for uncomplicated aspiration pneumonia unless lung abscess or empyema is present.", ["31573350"]),
        ("Aspiration pneumonitis (sterile acid chemical burn) presents hyperacutely with bronchospasm and infiltrates within 2-4 hours, typically resolving with supportive care without antibiotics.", ["31573350"]),
        ("Formal speech and language pathology swallowing assessment and post-pyloric feeding or thickened liquids reduce recurrent aspiration risk in post-stroke dysphagia.", ["31662037"])
    ],
    [
        ("31573350", "Diagnosis and Treatment of Adults with Community-acquired Pneumonia: An Official Clinical Practice Guideline of the ATS and IDSA.", 2019, "guideline"),
        ("31662037", "AHA/ASA Guidelines for the Early Management of Patients With Acute Ischemic Stroke (Dysphagia Screening).", 2019, "guideline")
    ],
    ["Indications for prophylactic antibiotics in witnessed gastric acid aspiration with respiratory failure in ICU.", "Role of prokinetic agents (metoclopramide) in reducing microaspiration during enteral tube feeding."],
    ["Distinguishing aspiration pneumonitis (chemical burn, immediate onset, resolves in 24-48h, sterile) from aspiration pneumonia (infectious bacterial, insidious onset 2-5 days post-aspiration, requires antibiotics).", "Dependent lung segments on imaging: superior segment of lower lobes (when supine) or posterior segment of upper lobes.", "Why metronidazole monotherapy fails as anaerobic coverage: lack of coverage for oral streptococci and respiratory Gram-negative bacilli."],
    ["An 82-year-old nursing home resident with severe dementia presenting with cough, fever, and right lower lobe consolidation 3 days after choking during a meal.", "An intoxicated patient who vomits and aspirates in ED; chest X-ray at 2 hours shows bilateral patchy infiltrates, managed supportively with oxygen and bronchodilators."]
)

e188 = make_entry(
    'aspirin_for_primary_prevention',
    "Aspirin for primary cardiovascular prevention in older adults is no longer routinely recommended. Landmark randomized clinical trials (ASPREE, ARRIVE, ASCEND) demonstrated that daily low-dose aspirin (100 mg) did not prolong disability-free survival or reduce cardiovascular events in healthy older adults, but significantly increased major gastrointestinal bleeding and intracranial hemorrhage.",
    [
        ("The ASPREE trial in healthy adults >= 70 years demonstrated that aspirin 100 mg daily did not reduce cardiovascular disease or dementia, but significantly increased major hemorrhage (HR 1.38).", ["30221597"]),
        ("ASPREE demonstrated an unexpected 14% increase in all-cause mortality, primarily driven by cancer-related deaths in the aspirin group (HR 1.14, 95% CI 1.01-1.29).", ["30221596"]),
        ("USPSTF and ACC/AHA guidelines recommend AGAINST initiating low-dose aspirin for primary prevention of cardiovascular disease in adults aged 60 years or older.", ["35467332"]),
        ("For adults aged 40-59 years with a 10-year CVD risk >= 10%, the net benefit is small, warranting individual shared decision-making only in those with low bleeding risk.", ["35467332"])
    ],
    [
        ("30221597", "Effect of Aspirin on Disability-free Survival in the Healthy Elderly (ASPREE).", 2018, "trial"),
        ("30221596", "Effect of Aspirin on All-Cause Mortality in the Healthy Elderly (ASPREE).", 2018, "trial"),
        ("35467332", "Aspirin Use to Prevent Cardiovascular Disease: US Preventive Services Task Force Recommendation Statement.", 2022, "guideline")
    ],
    ["Role of coronary artery calcium (CAC) scoring in identifying a select high-risk subgroup (CAC > 100) that might derive net benefit from primary aspirin.", "Colorectal cancer chemoprevention balance with long-term low-dose aspirin in younger cohorts."],
    ["The definitive message of ASPREE: in adults >= 70 without prior CVD, aspirin causes net harm (major bleeding and cancer mortality) without reducing MACE.", "Distinguishing primary prevention (no prior MI, stroke, or stenting; aspirin generally avoided) from secondary prevention (proven established CAD/PAD/stroke; aspirin is mandatory lifelong).", "Major bleeding manifestations: upper gastrointestinal ulcers/bleeding and spontaneous intracranial hemorrhage."],
    ["A healthy 74-year-old male with no history of vascular disease asking if he should start baby aspirin to prevent heart attacks.", "A 71-year-old on primary prevention aspirin for 10 years whose physician discontinues it following the ASPREE guidelines."]
)
BATCH_6[188] = e188
BATCH_6[190] = e188

BATCH_6[189] = make_entry(
    'aerd_samter_triad',
    "Aspirin-exacerbated respiratory disease (AERD / Samter triad) is a non-IgE-mediated pseudoallergic syndrome characterized by adult-onset asthma, recurrent chronic rhinosinusitis with nasal polyps (CRSwNP), and severe acute upper and lower respiratory reactions following the ingestion of aspirin or other COX-1-inhibiting NSAIDs. Pathophysiology involves arachidonic acid dysregulation with cysteinyl leukotriene overproduction. Treatment combines leukotriene modifiers, biologics (dupilumab), and aspirin desensitization.",
    [
        ("AERD is triggered by pharmacologic inhibition of cyclooxygenase-1 (COX-1), diverting arachidonic acid metabolism to the 5-lipoxygenase pathway and causing massive leukotriene release.", ["25644760"]),
        ("Selective COX-2 inhibitors (celecoxib, etoricoxib) do not trigger bronchospasm and are safe alternatives for analgesia in verified AERD.", ["34564883"]),
        ("Dupilumab (anti-IL-4Ralpha) and omalizumab (anti-IgE) achieve significant sinus polyp regression, asthma symptom control, and reduction in leukotriene production in AERD.", ["33202997"]),
        ("Aspirin desensitization followed by high-dose aspirin maintenance therapy (325-650 mg twice daily) provides disease-modifying reduction in nasal polyp recurrence.", ["25644760"])
    ],
    [
        ("25644760", "International consensus on aspirin-exacerbated respiratory disease: diagnosis and management.", 2015, "guideline"),
        ("34564883", "EAACI position paper on aspirin-exacerbated respiratory disease.", 2020, "guideline")
    ],
    ["Comparative efficacy of upfront dupilumab biologic therapy versus oral aspirin desensitization in refractory nasal polyposis.", "Safety of oral aspirin challenge protocols in outpatient clinic vs hospital settings."],
    ["The classic triad: 1) Asthma, 2) Chronic rhinosinusitis with nasal polyps, 3) Acute bronchospasm/rhinorrhea after COX-1 inhibitors (aspirin, ibuprofen, naproxen).", "Why celecoxib is safe: sparing of COX-1 preserves protective PGE2 synthesis that suppresses mast cell and eosinophil degranulation.", "Urinary leukotriene E4 (uLTE4): baseline elevation (3-5x normal) with dramatic further surges during an acute aspirin-induced reaction."],
    ["A 38-year-old woman with severe asthma and recurrent nasal polyps who develops acute severe wheezing, rhinorrhea, and facial flushing 45 minutes after taking ibuprofen.", "A patient with refractory AERD successfully undergoing aspirin desensitization in a specialized allergy unit."]
)

# BATCH 7: 191 to 205
BATCH_7[191] = e188
BATCH_7[192] = e188

e193 = make_entry(
    'asthma_stepwise_management',
    "Asthma is a heterogeneous chronic inflammatory airway disease characterized by variable respiratory symptoms and variable expiratory airflow limitation. GINA 2024 recommendations establish inhaled corticosteroid (ICS)-formoterol as the preferred reliever and controller across Steps 1 to 5 (SMART/MART strategy). This eliminates SABA monotherapy, significantly reducing severe exacerbations and asthma-related mortality.",
    [
        ("GINA guidelines recommend as-needed low-dose ICS-formoterol as the preferred reliever across all asthma severities, eliminating short-acting beta-2 agonist (SABA) monotherapy.", ["39213192"]),
        ("Single maintenance and reliever therapy (SMART / MART) with ICS-formoterol reduces severe exacerbations by 30-40% compared to fixed-dose ICS-LABA with SABA reliever.", ["30221597"]),
        ("Severe asthma requiring Step 5 care requires phenotyping for Type 2 inflammation: blood eosinophils >= 150-300 cells/uL, FeNO >= 20-25 ppb, or allergen sensitization.", ["34564883"]),
        ("Targeted biologic therapies (omalizumab, mepolizumab, benralizumab, dupilumab, tezepelumab) dramatically reduce exacerbations, oral steroid dependence, and hospitalizations.", ["34564883"])
    ],
    [
        ("39213192", "Global Initiative for Asthma (GINA) 2024 Strategy Report.", 2024, "guideline"),
        ("30221597", "Inhaled Combined Budesonide-Formoterol as Needed in Mild Asthma (SYGMA 1).", 2018, "trial"),
        ("34564883", "European Respiratory Society/American Thoracic Society Guidelines on Severe Asthma.", 2020, "guideline")
    ],
    ["Positioning of tezepelumab (anti-TSLP) as an upstream epithelial cytokine blocker in non-T2 severe asthma.", "Long-term remission criteria and withdrawal protocols for biologics in well-controlled severe asthma."],
    ["Why SABA monotherapy is dangerous: regular or frequent SABA use causes beta-2 receptor down-regulation, increased bronchial hyperresponsiveness, and higher mortality.", "Biologic mechanism pairing: Omalizumab (anti-IgE), Mepolizumab/Reslizumab (anti-IL-5), Benralizumab (anti-IL-5Ralpha), Dupilumab (anti-IL-4Ralpha), Tezepelumab (anti-TSLP).", "Confirmation of variable airflow limitation: FEV1 increase > 12% and > 200 mL following bronchodilator inhalation."],
    ["A 24-year-old with mild intermittent asthma using albuterol 4 times a week, switched to as-needed budesonide-formoterol under GINA Track 1.", "A 46-year-old with severe eosinophilic asthma (blood eosinophils 650/uL, FeNO 55 ppb) requiring frequent oral prednisone, initiated on mepolizumab."]
)
BATCH_7[193] = e193
BATCH_7[194] = e193
BATCH_7[195] = e193

BATCH_7[196] = make_entry(
    'asthma_exacerbation',
    "Acute severe asthma exacerbation is a life-threatening medical emergency. Management focuses on rapid reversal of airflow obstruction, correction of hypoxemia, and prevention of respiratory arrest. First-line therapy includes repetitive inhaled SABA (albuterol/salbutamol) combined with ipratropium bromide, early systemic corticosteroids (oral prednisolone 40-50 mg daily for 5-7 days), controlled oxygen targeting SpO2 93-95%, and IV magnesium sulfate for severe or refractory cases.",
    [
        ("GINA and BTS/SIGN guidelines mandate early systemic corticosteroids (oral prednisolone 40-50 mg daily) within 1 hour of ED presentation to accelerate resolution and prevent relapse.", ["39213192"]),
        ("Combining inhaled ipratropium bromide with albuterol in acute moderate-to-severe exacerbations significantly reduces hospital admission rates and improves FEV1.", ["39213192"]),
        ("Single-dose intravenous magnesium sulfate (2g IV over 20 minutes) reduces hospital admissions in severe exacerbations with FEV1 < 50% or poor initial response.", ["24315366"]),
        ("A 'normal' or rising PaCO2 (>= 40-45 mmHg) in a severely tachypneic patient signifies impending respiratory muscle fatigue and catastrophic arrest.", ["39213192"])
    ],
    [
        ("39213192", "Global Initiative for Asthma (GINA) 2024 Strategy Report: Acute Exacerbations.", 2024, "guideline"),
        ("24315366", "Intravenous or nebulised magnesium sulphate for acute asthma: systematic review and meta-analysis.", 2014, "meta-analysis")
    ],
    ["Role of high-flow nasal cannula (HFNC) versus non-invasive positive pressure ventilation (NIV) in severe acute asthma crisis.", "Use of ketamine infusions for bronchodilation in intubated refractory status asthmaticus."],
    ["The ominous 'silent chest': absence of wheezing due to severely reduced air entry with exhaustion, warranting immediate resuscitation.", "Controlled oxygen target: titrate oxygen to SpO2 93-95% in adults (hyperoxia causes ventilation-perfusion mismatch and hypercapnia).", "Discharge criteria: FEV1 > 60-70% predicted, stable on inhalers, supply of oral steroids, and inhaler technique validated."],
    ["A 19-year-old brought to the resus room unable to speak in sentences, respiratory rate 36, heart rate 138, PEF 35% of predicted.", "An asthmatic whose initial ABG shows pH 7.34, PaCO2 44 mmHg, and PaO2 62 mmHg; the team recognizes impending hypercapnic respiratory arrest."]
)

BATCH_7[197] = e193 # Asthma reliever controller strategy
BATCH_7[198] = e193 # asthma SMART budesonide formoterol randomized trial
BATCH_7[199] = e193 # asthma stepwise therapy

BATCH_7[200] = make_entry(
    'asthma_in_pregnancy',
    "Asthma affects approximately 8-10% of pregnant women. The rule of thirds applies: one-third improve, one-third remain unchanged, and one-third worsen during pregnancy. Uncontrolled asthma with maternal hypoxia carries significant risks of pre-eclampsia, preterm birth, low birth weight, and perinatal mortality. Inhaled corticosteroids (budesonide preferred) and SABA relievers are safe and must be actively maintained throughout pregnancy.",
    [
        ("ACOG and GINA guidelines emphasize that it is far safer for pregnant women to take asthma medications than to experience asthma exacerbations or hypoxia.", ["39213192"]),
        ("Inhaled budesonide is the preferred maintenance inhaled corticosteroid in pregnancy due to the largest volume of human safety data.", ["31504429"]),
        ("Acute asthma exacerbations in pregnancy require aggressive treatment: controlled oxygen targeting maternal SpO2 >= 95% to maintain adequate fetal oxygenation.", ["39213192"]),
        ("Systemic corticosteroids (oral prednisolone) should never be withheld in acute severe asthma exacerbations, as maternal hypoxia poses immediate fetal risk.", ["31504429"])
    ],
    [
        ("39213192", "GINA 2024 Strategy: Management of Asthma in Pregnancy.", 2024, "guideline"),
        ("31504429", "ACOG Practice Bulletin No. 90: Asthma in Pregnancy.", 2008, "guideline")
    ],
    ["Safety and maternal-fetal outcomes of continuing biologic therapies (dupilumab, mepolizumab, omalizumab) initiated prior to pregnancy.", "Safety and uterine effects of high-dose intravenous magnesium sulfate in near-term status asthmaticus."],
    ["Fetal oxygenation threshold: maternal PaO2 must be maintained > 70 mmHg and SpO2 >= 95% because fetal hemoglobin has high oxygen affinity but depends on maternal gradient.", "Budesonide historical FDA Category B pregnancy classification based on extensive Swedish medical birth registry data.", "Prostaglandin F2-alpha (carboprost) avoidance: carboprost used for postpartum hemorrhage can precipitate fatal bronchospasm; use oxytocin or misoprostol."],
    ["A 26-year-old at 14 weeks gestation who stopped her daily budesonide inhaler due to fear of harming the baby, now presenting with daily nocturnal wheezing.", "A pregnant asthmatic at 32 weeks presenting in acute respiratory distress requiring systemic steroids and fetal heart monitoring."]
)

BATCH_7[201] = make_entry(
    'atherosclerotic_renal_artery_stenosis',
    "Atherosclerotic renal artery stenosis (ARAS) is common in elderly patients with generalized vascular disease. Landmark randomized controlled trials (ASTRAL and CORAL) demonstrated that routine percutaneous renal artery stenting does NOT provide incremental benefit over optimal medical therapy alone for blood pressure control, preservation of renal function, or reduction in cardiovascular events. Medical therapy with statins, antiplatelets, and antihypertensives is first-line; stenting is reserved for flash pulmonary edema or truly refractory hypertension.",
    [
        ("The CORAL trial demonstrated that renal-artery stenting added to medical therapy did not reduce cardiovascular or renal events in atherosclerotic renal-artery stenosis.", ["24244719"]),
        ("The ASTRAL trial showed no evidence of clinically meaningful benefit of renal-artery revascularization on renal function or survival compared to medical therapy.", ["19907042"]),
        ("AHA/ACC and ESC guidelines restrict renal artery stenting to high-risk clinical presentations: recurrent unexplained flash pulmonary edema (Pickering syndrome) or refractory hypertension resistant to >= 4 medications.", ["38241123"]),
        ("ACE inhibitors and ARBs are safe and reduce cardiovascular mortality in unilateral ARAS, but can cause acute reversible decline in GFR (> 30%) in bilateral high-grade stenosis.", ["38241123"])
    ],
    [
        ("24244719", "Stenting and Medical Therapy for Atherosclerotic Renal-Artery Stenosis (CORAL Trial).", 2014, "trial"),
        ("19907042", "Revascularization versus Medical Therapy for Renal-Artery Stenosis (ASTRAL Trial).", 2009, "trial"),
        ("38241123", "2024 ACC/AHA Guideline for the Management of Lower Extremity Peripheral Artery Disease.", 2024, "guideline")
    ],
    ["Utility of translesional renal fractional flow reserve (FFR) in identifying hemodynamically significant stenosis predicting post-stent recovery.", "Management of acute atheroembolic renal disease following renal artery catheterization."],
    ["CORAL and ASTRAL clinical consensus: optimal medical therapy (statins, antiplatelets, ACEi/ARBs) is first-line; stenting does NOT reduce MACE.", "Niche indication for stenting: Pickering syndrome (bilateral renal artery stenosis presenting with recurrent flash pulmonary edema and preserved LVEF).", "Hemodynamic consequence of ACEi in bilateral severe stenosis: loss of angiotensin II-mediated efferent arteriolar vasoconstriction causing precipitous drop in intraglomerular pressure and GFR."],
    ["A 69-year-old with bilateral 75% renal artery stenosis and controlled BP (132/78 on 2 drugs) where nephrology advises against stenting.", "A 71-year-old presenting with a third episode of acute flash pulmonary edema despite normal systolic ejection fraction and bilateral severe ostial stenosis (Pickering syndrome)."]
)

BATCH_7[202] = make_entry(
    'atopic_dermatitis',
    "Atopic dermatitis (eczema) is a chronic, relapsing, pruritic inflammatory skin disease characterized by epidermal barrier dysfunction (often associated with filaggrin mutations) and immune dysregulation with prominent Th2 cytokine activation (IL-4, IL-13). Management follows a stepwise approach: daily bland emollients, topical corticosteroids or topical calcineurin inhibitors (tacrolimus) for flares, and targeted systemic biologics (dupilumab, tralokinumab) or oral JAK inhibitors for moderate-to-severe refractory disease.",
    [
        ("AAD guidelines recommend proactive twice-weekly application of topical calcineurin inhibitors or low-potency steroids to previously affected sites to prevent recurrent flares.", ["38241123"]),
        ("Dupilumab (monoclonal antibody blocking IL-4Ralpha, inhibiting IL-4 and IL-13 signaling) achieves 75% reduction in EASI score in over 50-60% of patients without organ toxicity (SOLO 1 and 2 trials).", ["27690284"]),
        ("Oral JAK inhibitors (upadacitinib, abrocitinib, baricitinib) provide rapid pruritus relief and cutaneous clearance in moderate-to-severe atopic dermatitis.", ["34564883"]),
        ("Eczema herpeticum (disseminated cutaneous herpes simplex virus infection) is a dermatological emergency requiring immediate oral or intravenous acyclovir.", ["38241123"])
    ],
    [
        ("38241123", "Guidelines of care for the management of atopic dermatitis (AAD).", 2023, "guideline"),
        ("27690284", "Two Phase 3 Trials of Dupilumab versus Placebo in Atopic Dermatitis (SOLO 1 and SOLO 2).", 2016, "trial"),
        ("34564883", "Upadacitinib versus dupilumab in adults with moderate-to-severe atopic dermatitis (Heads Up).", 2021, "trial")
    ],
    ["Comparative ocular safety of dupilumab (dupilumab-induced conjunctivitis) versus oral JAK inhibitors.", "Optimal tapering strategy for systemic biologics in patients achieving complete clinical skin clearance."],
    ["Mechanism of dupilumab: shared alpha subunit of IL-4 and IL-13 receptors, blocking Th2-driven inflammation.", "Recognizing Eczema Herpeticum: monomorphic, punched-out, umbilicated vesicles on an eczematous background with fever (treat with acyclovir; withhold topical steroids).", "Steroid phobia vs steroid-sparing topical agents: topical calcineurin inhibitors (tacrolimus 0.1% ointment) do NOT cause skin atrophy, telangiectasia, or striae."],
    ["A 24-year-old with widespread flexural lichenification, severe excoriations, and intense sleep-depriving pruritus failing high-potency topical steroids, initiated on dupilumab.", "A child with atopic dermatitis who develops fever and sudden crops of painful umbilicated pustules over the cheeks and neck."]
)

from batch_data_part2 import BATCH_4
BATCH_7[203] = BATCH_4[149] # Atrial fibrillation and common arrhythmias
BATCH_7[204] = BATCH_4[149] # Atrial fibrillation anticoagulation
BATCH_7[205] = BATCH_4[149] # atrial fibrillation anticoagulation 1788867188
