# data_batch_0311_0325.py
"""
Definitions for Batch 5 of Sheet 2 / Topics 251-500 (Topics 311 to 325).
"""
from data_batch_0001_0015 import make_entry

BATCH_SHEET2_B5 = {}

# 311: Cardiac Device Malfunctions: Pacemaker Failure & ICD Shocks
BATCH_SHEET2_B5[311] = make_entry(
    'cardiac_device_malfunctions_and_troubleshooting',
    "Cardiac implantable electronic device (CIED) malfunctions encompass pacemaker failures (failure to pace, failure to sense [undersensing/oversensing], failure to capture) and implantable cardioverter-defibrillator (ICD) complications (inappropriate shocks and electrical storm). Inappropriate ICD shocks occur in up to 10-15% of patients, predominantly triggered by supraventricular tachycardias (atrial fibrillation with rapid ventricular response), T-wave oversensing, or lead fractures (conductor coil failure or insulation defect). Application of a clinical doughnut magnet immediately suspends ICD shock delivery without altering pacing therapy, serving as an emergency bedside intervention for recurrent inappropriate shocks while preparing definitive device interrogation.",
    [
        ("Applying a clinical doughnut magnet directly over an ICD immediately suspends tachyarrhythmia detection and shock delivery without affecting underlying pacemaker functionality, providing safe emergency suppression of inappropriate shock storms.", ["26038234", "34455430"]),
        ("Applying a magnet over a pacemaker initiates asynchronous fixed-rate pacing (DOO or VOO mode at the magnet rate, typically 85-100 bpm), protecting pacemaker-dependent patients from electromagnetic interference (EMI) during electrocautery or MRI.", ["34455430"]),
        ("Failure to capture (pacemaker spike not followed by a P wave or QRS complex) is caused by lead dislodgement, myocardial exit block, severe hyperkalemia, antiarrhythmic toxicity, or lead fracture, requiring emergency threshold interrogation and pacing output increase.", ["34455430"]),
        ("T-wave oversensing and conductor lead fractures (characterized by abrupt non-physiological high-frequency signals and lead impedance spikes > 2,000 ohms) are the primary hardware causes of inappropriate shocks, requiring lead revision or replacement.", ["34455430", "26038234"])
    ],
    [
        ("34455430", "2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy.", 2021, "guideline"),
        ("26038234", "HRS/EHRA Expert Consensus Statement on the Management of Cardiovascular Implantable Electronic Devices (CIEDs).", 2011, "guideline")
    ],
    [
        "Discrimination algorithms (wave morphology, onset, stability) programmed in dual-chamber ICDs to differentiate ventricular tachycardia from supraventricular tachycardia.",
        "Management of subcutaneous ICD (S-ICD) sensing vectors during posture shifts and strenuous exercise to eliminate myopotential oversensing."
    ],
    [
        "Different responses of pacemakers (asynchronous pacing) versus ICDs (shock suspension) to magnet placement.",
        "Clinical causes of pacing exit block and failure to capture (hyperkalemia, lead dislodgement).",
        "Lead impedance abnormalities distinguishing insulation defect (< 200 ohms) from conductor fracture (> 2,000 ohms)."
    ],
    [
        "A 66-year-old male with an ICD who receives 5 inappropriate shocks in 30 minutes while in rapid atrial fibrillation, immediately stabilized by taping a donut magnet over the device.",
        "A 72-year-old pacemaker-dependent female presenting with severe hyperkalemia (potassium 7.8 mmol/L) exhibiting wide pacing spikes with failure to capture and severe bradycardia."
    ]
)

# 312: Cardiac Implantable Electronic Device (CIED) Infection
BATCH_SHEET2_B5[312] = make_entry(
    'cied_infection_and_extraction',
    "Infection of cardiac implantable electronic devices (CIEDs: pacemakers, ICDs, CRT devices) represents a life-threatening complication occurring in 1-2% of implants, carrying an in-hospital mortality rate of 8-15%. Infection presents as localized pocket infection (erythema, swelling, erosion, purulent drainage) or systemic bacteremia/endocarditis with transvenous lead vegetations. The landmark international WRAP-IT randomized trial (Tarakji et al., NEJM) proved that an absorbable antibacterial-eluting envelope (rifampin and minocycline) reduced major CIED infections by 40%. AHA and ESC guidelines mandate complete hardware removal (entire generator and all transvenous leads), as antibiotic therapy alone fails in > 80-90% of cases due to mature bacterial biofilms.",
    [
        ("In the landmark WRAP-IT randomized trial of 6,983 patients (Tarakji et al., NEJM), the use of an absorbable antibiotic-eluting envelope during CIED generator replacement or high-risk upgrade significantly reduced major device infections by 40% (HR 0.60, p=0.005).", ["30883056"]),
        ("AHA and ESC guidelines mandate complete removal of all device hardware (pulse generator and all transvenous leads) for both pocket infections and systemic lead-associated endocarditis; conservative treatment with antibiotics alone carries a recurrence rate > 80% and higher mortality.", ["20124129", "34455430"]),
        ("Transvenous lead extraction (TLE) utilizing specialized mechanical or excimer laser cutting sheaths in an operating room with immediate cardiothoracic surgical bailout is the procedure of choice for chronically implanted leads (> 1 year).", ["20124129"]),
        ("Staphylococcus aureus and coagulase-negative staphylococci (Staphylococcus epidermidis) account for > 70-80% of CIED infections; S. aureus bacteremia in any patient with a CIED mandates transesophageal echocardiography (TEE) to exclude lead vegetations.", ["20124129", "30883056"])
    ],
    [
        ("30883056", "Antibacterial Envelope to Prevent Cardiac Implantable Device Infection (WRAP-IT Trial).", 2019, "trial"),
        ("20124129", "Update on cardiovascular implantable electronic device infections and their management: a scientific statement from the American Heart Association.", 2010, "guideline"),
        ("34455430", "2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy.", 2021, "guideline")
    ],
    [
        "Optimal antibiotic duration (2 weeks for isolated pocket infection vs 4-6 weeks for lead endocarditis) and timing of contralateral device reimplantation.",
        "Role of leadless pacemakers (Micra) as a lower-infection alternative during reimplantation in high-risk dialysis patients."
    ],
    [
        "Major infection reduction achieved by the antibacterial envelope in the WRAP-IT trial.",
        "Mandatory requirement for complete hardware removal in CIED infection under AHA/ESC guidelines.",
        "Indications for transesophageal echocardiography in CIED patients presenting with Staphylococcus aureus bacteremia."
    ],
    [
        "A 70-year-old male with an ICD replaced 4 months ago who presents with pocket fluctuance and skin erosion, scheduled for transvenous lead extraction and pocket debridement.",
        "A 64-year-old female with a pacemaker who develops methicillin-sensitive S. aureus bacteremia from an infected peripheral IV, whose TEE confirms a 1.2-cm mobile lead vegetation."
    ]
)

# 313: Cardiac Myxoma: Clinical Features, Embolism & Surgical Excision
BATCH_SHEET2_B5[313] = make_entry(
    'cardiac_myxoma_clinical_features_and_surgery',
    "Cardiac myxoma is the most common primary benign cardiac neoplasm in adults, with > 75-80% originating in the left atrium, typically arising from the fossa ovalis border of the interatrial septum. Myxomas present through a classic clinical triad: (1) intracardiac mechanical obstruction (mitral stenosis mimic, dyspnea, syncope, positional pulmonary edema, 'tumor plop' sound in early diastole); (2) embolic phenomena (cerebral transient ischemic attacks, stroke, retinal occlusion, visceral infarcts); and (3) constitutional systemic symptoms (fever, weight loss, arthralgias, elevated ESR/CRP) driven by autonomous tumor production of interleukin-6 (IL-6). Prompt surgical excision is curative and eliminates catastrophic embolic stroke.",
    [
        ("Cardiac myxomas predominantly arise in the left atrium (75-80%), followed by the right atrium (15-20%), and characteristically attach by a fibrovascular stalk to the limbus of the fossa ovalis on the interatrial septum.", ["7477148"]),
        ("Systemic constitutional symptoms (fever, malaise, weight loss, arthralgias, Raynaud phenomenon) occur in 50% of patients, mediated by tumor secretion of interleukin-6 (IL-6), and rapidly resolve following surgical resection.", ["7477148"]),
        ("Systemic embolization occurs in 30-40% of left atrial myxomas, with cerebral embolization (embolic stroke or TIA) being the most devastating presenting manifestation, particularly in tumors with a friable, villous gelatinous surface.", ["7477148", "12224748"]),
        ("Emergency surgical resection with full-thickness resection of the septal attachment cuff is the definitive curative standard of care; familial myxomas (Carney complex, PRKAR1A mutation) carry an elevated recurrence rate (15-20% vs 1-2% for sporadic).", ["12224748", "7477148"])
    ],
    [
        ("7477148", "Cardiac myxomas (Reynen Review).", 1995, "review"),
        ("12224748", "Surgical management of cardiac myxomas: long-term results.", 2002, "trial")
    ],
    [
        "Differentiation of cardiac myxoma from left atrial thrombus on cardiac MRI (delayed hyperenhancement and perfusion dynamics).",
        "Surveillance echocardiography intervals for patients with Carney complex (PRKAR1A mutation) given high lifetime recurrence rates."
    ],
    [
        "The classic clinical triad of cardiac myxoma (intracardiac obstruction, embolic events, constitutional cytokine symptoms).",
        "Auscultatory hallmark of mitral valve obstruction ('tumor plop' early diastolic sound mimicking an opening snap).",
        "Surgical oncologic principles and recurrence risk in sporadic versus syndromic (Carney complex) myxomas."
    ],
    [
        "A 42-year-old female presenting with an acute embolic ischemic stroke, low-grade fevers, ESR 84 mm/h, and a 4.5-cm mobile gelatinous left atrial mass protruding through the mitral orifice on echocardiogram.",
        "A 28-year-old male with pigmented skin lentigines and recurrent bilateral atrial myxomas undergoing genetic evaluation for Carney complex."
    ]
)

# 314: Cardiac Rehabilitation After Myocardial Infarction
BATCH_SHEET2_B5[314] = make_entry(
    'cardiac_rehabilitation_post_mi',
    "Supervised, exercise-based comprehensive cardiac rehabilitation (CR) is a Class I, Level A guideline-directed intervention following acute myocardial infarction, coronary revascularization (PCI or CABG), and heart failure. In a landmark Cochrane systematic review and meta-analysis of 63 randomized controlled trials (Anderson et al., JACC), participation in exercise-based cardiac rehabilitation reduced cardiovascular mortality by 26% and reduced hospital readmissions by 18% over 12 months. Comprehensive CR integrates structured physical exercise training, cardiovascular risk factor modification (blood pressure, lipid management, smoking cessation), dietary education, and psychosocial support.",
    [
        ("A comprehensive Cochrane systematic review and meta-analysis of 63 RCTs (Anderson et al., JACC; 14,486 patients) proved that exercise-based cardiac rehabilitation significantly reduced cardiovascular mortality by 26% (relative risk 0.74) and reduced hospital admissions by 18% following acute coronary syndromes.", ["26764378"]),
        ("Participation in cardiac rehabilitation achieves clinically meaningful improvements in functional exercise capacity (peak VO2), health-related quality of life, and depression scores compared with usual post-infarction care.", ["26764378"]),
        ("2021 ESC guidelines on cardiovascular disease prevention emphasize that comprehensive CR must be offered to all patients following acute myocardial infarction, coronary artery bypass surgery, and chronic stable heart failure.", ["34458905"]),
        ("Cardiac rehabilitation is structured in three phases: Phase I (inpatient early mobilization and education), Phase II (early post-discharge supervised outpatient structured exercise and risk factor reduction, typically 8-12 weeks), and Phase III (long-term community maintenance).", ["34458905", "26764378"])
    ],
    [
        ("26764378", "Exercise-Based Cardiac Rehabilitation for Coronary Heart Disease: Cochrane Systematic Review and Meta-Analysis.", 2016, "meta-analysis"),
        ("34458905", "2021 ESC Guidelines on cardiovascular disease prevention in clinical practice.", 2021, "guideline")
    ],
    [
        "Effectiveness of digital and home-based telerehabilitation models in overcoming rural geographical and socioeconomic barriers to CR participation.",
        "High-intensity interval training (HIIT) versus moderate-intensity continuous training (MICT) on peak VO2 and left ventricular remodeling post-STEMI."
    ],
    [
        "Magnitude of cardiovascular mortality and readmission reduction demonstrated in the Anderson Cochrane meta-analysis.",
        "Core multidimensional components of comprehensive cardiac rehabilitation (exercise, nutrition, psychosocial, pharmacotherapy adherence).",
        "Phases of cardiac rehabilitation and indications across cardiovascular populations under ESC guidelines."
    ],
    [
        "A 54-year-old male 2 weeks post-anterior STEMI and primary PCI enrolled in a 12-week Phase II supervised outpatient cardiac rehabilitation program.",
        "A 68-year-old female post-CABG with severe exercise anxiety who achieves a 2.5 MET increase in functional capacity through gradual exercise titration in CR."
    ]
)

# 315: Cardiac Resynchronisation Therapy: Patient Selection & QRS Criteria
BATCH_SHEET2_B5[315] = make_entry(
    'cardiac_resynchronisation_therapy_selection',
    "Cardiac Resynchronization Therapy (CRT via biventricular pacing) restores synchronous mechanical contraction between the interventricular septum and left ventricular lateral wall in patients with heart failure with reduced ejection fraction (HFrEF) and ventricular dyssynchrony. According to 2021 ESC guidelines, patient selection depends on four primary criteria: (1) symptomatic heart failure (NYHA Class II-IV ambulatory) despite >= 3 months of optimal medical therapy; (2) left ventricular ejection fraction (LVEF) <= 35%; (3) sinus rhythm; and (4) QRS morphology and duration. The greatest clinical benefit (Class I indication) occurs in patients with true Left Bundle Branch Block (LBBB) morphology and QRS duration >= 150 ms.",
    [
        ("2021 ESC Pacing and CRT guidelines recommend CRT as a Class I (Level A) indication for symptomatic heart failure patients in sinus rhythm with LVEF <= 35%, LBBB morphology, and QRS duration >= 150 ms despite optimal medical therapy.", ["34455430"]),
        ("Patients with LBBB morphology derive substantially greater mortality reduction, reverse ventricular remodeling, and symptomatic improvement from CRT compared with non-LBBB conduction patterns (right bundle branch block or non-specific IVCD).", ["34455430", "15755769"]),
        ("For patients with non-LBBB morphology, CRT is considered only if QRS duration is >= 150 ms (Class IIa), whereas CRT is not indicated if QRS duration is < 130 ms due to lack of benefit and potential harm.", ["34455430"]),
        ("Predictors of 'super-response' to CRT (LVEF improvement > 15% or normalization) include female sex, non-ischemic cardiomyopathy etiology, wide LBBB (QRS > 150 ms), smaller baseline left atrial size, and posterolateral left ventricular lead placement.", ["34455430", "15152059"])
    ],
    [
        ("34455430", "2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy.", 2021, "guideline"),
        ("15755769", "The effect of cardiac resynchronization on morbidity and mortality in heart failure (CARE-HF Trial).", 2005, "trial"),
        ("15152059", "Cardiac-resynchronization therapy with or without an implantable defibrillator in advanced chronic heart failure (COMPANION Trial).", 2004, "trial")
    ],
    [
        "Conduction system pacing (His bundle pacing or left bundle branch area pacing [LBBAP]) versus conventional biventricular coronary sinus CRT.",
        "Role of CRT in patients with permanent atrial fibrillation undergoing atrioventricular junction ablation (ablate-and-pace strategy)."
    ],
    [
        "Class I indication criteria for CRT under 2021 ESC guidelines (LVEF, NYHA class, QRS width, and LBBB morphology).",
        "Clinical outcomes and responder rates comparing LBBB versus non-LBBB QRS morphology.",
        "Clinical and anatomical factors predicting an exceptional 'super-responder' trajectory."
    ],
    [
        "A 59-year-old female with non-ischemic dilated cardiomyopathy, LVEF 25%, NYHA Class III, and LBBB with QRS duration 165 ms, referred for CRT-D.",
        "A 70-year-old male with ischemic cardiomyopathy, LVEF 30%, and narrow QRS (105 ms) where CRT is contraindicated due to lack of electromechanical dyssynchrony."
    ]
)

# 316: Cardiac Resynchronization Therapy: COMPANION Trial
BATCH_SHEET2_B5[316] = make_entry(
    'crt_companion_trial',
    "The landmark COMPANION trial (Comparison of Medical Therapy, Pacing, and Defibrillation in Heart Failure; Bristow et al., NEJM) was a pivotal multicenter randomized controlled trial evaluating 1,520 patients with advanced heart failure (NYHA Class III or IV), LVEF <= 35%, and QRS duration >= 120 ms. COMPANION compared optimal pharmacologic medical therapy alone against CRT with a pacemaker (CRT-P) or CRT with a defibrillator (CRT-D). Both CRT-P and CRT-D significantly reduced the primary composite endpoint of death or hospitalization from any cause by 19-20%. Crucially, CRT-D achieved a statistically significant 36% reduction in all-cause mortality (hazard ratio 0.64, p=0.003), establishing CRT-D as the gold standard for high-risk dyssynchronous heart failure.",
    [
        ("In the landmark COMPANION trial (1,520 patients, Bristow et al., NEJM), cardiac resynchronization therapy with a defibrillator (CRT-D) significantly reduced all-cause mortality by 36% (hazard ratio 0.64, p=0.003) compared with optimal medical therapy alone.", ["15152059"]),
        ("Both CRT-P and CRT-D significantly reduced the primary composite outcome of death from any cause or hospitalization from any cause by 19% (HR 0.81, p=0.014 for CRT-P; HR 0.80, p=0.01 for CRT-D).", ["15152059"]),
        ("CRT significantly improved 6-minute walk distance (+35 to +40 meters), NYHA functional class, and quality-of-life scores while reducing hospitalizations for worsening heart failure by 34-40%.", ["15152059"]),
        ("COMPANION established that in patients with electromechanical dyssynchrony and severe systolic dysfunction, biventricular pacing provides hemodynamic and antiarrhythmic synergy when combined with an implantable defibrillator.", ["15152059", "34455430"])
    ],
    [
        ("15152059", "Cardiac-resynchronization therapy with or without an implantable defibrillator in advanced chronic heart failure (COMPANION Trial).", 2004, "trial"),
        ("34455430", "2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy.", 2021, "guideline")
    ],
    [
        "Decision analysis in elderly frail patients: selecting CRT-P (pacemaker only) versus CRT-D (with defibrillator) to avoid terminal shock discharges.",
        "Impact of concurrent sacubitril-valsartan and SGLT2 inhibitors on the baseline mortality benefits observed in historic CRT trials."
    ],
    [
        "Primary composite endpoint and all-cause mortality reduction figures from the COMPANION trial.",
        "Clinical differences in outcomes between CRT-P and CRT-D demonstrated in COMPANION.",
        "Inclusion criteria of COMPANION (NYHA III/IV, EF <= 35%, QRS >= 120 ms with PR prolongation)."
    ],
    [
        "A 64-year-old male with ischemic cardiomyopathy, LVEF 28%, NYHA Class III, and LBBB (QRS 155 ms) who receives a CRT-D based on COMPANION trial evidence.",
        "An 82-year-old female with severe non-ischemic cardiomyopathy and multiple comorbidities receiving CRT-P to improve functional walk distance without defibrillator risks."
    ]
)

# 317: Cardiac Resynchronization Therapy in Heart Failure: CARE-HF Trial
BATCH_SHEET2_B5[317] = make_entry(
    'crt_care_hf_trial_and_remodeling',
    "The landmark CARE-HF trial (Cardiac Resynchronization in Heart Failure; Cleland et al., NEJM) investigated whether cardiac resynchronization therapy alone (CRT-P, without an implantable defibrillator) could reduce mortality and improve left ventricular remodeling in patients with moderate-to-severe heart failure (NYHA Class III-IV, LVEF <= 35%, and QRS duration >= 120 ms). CARE-HF proved that CRT-P significantly reduced all-cause mortality by 36% (hazard ratio 0.64, p<0.001) and reduced the composite endpoint of death or unplanned hospitalization for major cardiovascular events by 37%. CARE-HF established that resynchronization itself—independent of an ICD shock function—directly reverses adverse cardiac remodeling and prevents sudden cardiac death.",
    [
        ("In the landmark CARE-HF randomized trial of 813 patients (Cleland et al., NEJM), cardiac resynchronization therapy alone (CRT-P) significantly reduced all-cause mortality by 36% (hazard ratio 0.64, p<0.001) compared with medical therapy alone.", ["15755769"]),
        ("CARE-HF demonstrated profound reverse left ventricular remodeling with CRT: significant reductions in end-systolic volume index (-26 mL/m2), reductions in mitral regurgitation, and substantial increases in left ventricular ejection fraction (+6.9%).", ["15755769"]),
        ("The trial proved that CRT-P directly reduced the risk of sudden cardiac death by 46% (HR 0.54), demonstrating that improving mechanical synchrony and reducing ventricular wall stress attenuates malignant ventricular arrhythmogenesis.", ["15755769"]),
        ("Long-term extension data from CARE-HF showed that the survival advantage of CRT-P persisted beyond 3 years, with an absolute mortality reduction of 9.5% at median follow-up.", ["15755769", "34455430"])
    ],
    [
        ("15755769", "The effect of cardiac resynchronization on morbidity and mortality in heart failure (CARE-HF Trial).", 2005, "trial"),
        ("34455430", "2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy.", 2021, "guideline")
    ],
    [
        "Optimization of interventricular (V-V) and atrioventricular (A-V) pacing delays using echocardiography versus automated device algorithms.",
        "Management of CRT non-responders: troubleshooting lead position, loss of biventricular pacing percentage (< 98%), and scar burden on cardiac MRI."
    ],
    [
        "All-cause mortality and cardiovascular event reduction documented in the CARE-HF trial.",
        "Echocardiographic reverse remodeling metrics (ESVI reduction, LVEF increase) achieved with biventricular pacing.",
        "Mechanism explaining sudden cardiac death reduction with pacing-only CRT (CRT-P)."
    ],
    [
        "A 67-year-old male with dilated cardiomyopathy and LVEF 22% who exhibits a dramatic increase in LVEF to 42% and complete resolution of mitral regurgitation 1 year after CRT implantation (super-responder).",
        "A patient evaluated for CRT where biventricular pacing capture is verified at 99.2% on routine device telemetry."
    ]
)

# 318: Cardiac Tamponade: Beck's Triad, Pericardiocentesis & Drainage
BATCH_SHEET2_B5[318] = make_entry(
    'cardiac_tamponade_emergency_management',
    "Cardiac tamponade is an acute, life-threatening hemodynamic emergency caused by accumulation of pericardial fluid under elevated pressure, compressing the cardiac chambers, impairing diastolic filling, and leading to low-output circulatory collapse. Classic presentation comprises Beck's triad (hypotension, jugular venous distension, and muffled/distant heart sounds) and pulsus paradoxus (an abnormally large decrease in systolic blood pressure > 10 mmHg during inspiration). Transthoracic echocardiography is the diagnostic imaging modality of choice, revealing early diastolic collapse of the right ventricle, late diastolic collapse of the right atrium, and a dilated, non-collapsible inferior vena cava. Emergency ultrasound-guided pericardiocentesis is life-saving.",
    [
        ("Classic clinical examination reveals Beck's triad (hypotension, raised jugular venous pressure with absent y-descent, and muffled heart sounds) and pulsus paradoxus (inspiratory systolic blood pressure drop > 10-12 mmHg).", ["26320112"]),
        ("Key echocardiographic diagnostic hallmarks of cardiac tamponade include: (1) early diastolic collapse of the right ventricular free wall; (2) late diastolic collapse of the right atrium; (3) a plethora of the inferior vena cava (IVC dilated > 2.1 cm with < 50% inspiratory collapse); and (4) exaggerated respiratory variation in transvalvular Doppler flows (> 25% across the mitral valve).", ["26320112"]),
        ("Emergency ultrasound-guided pericardiocentesis (subxiphoid or apical approach) with placement of an indwelling pigtail catheter is the treatment of choice for unstable tamponade, producing immediate hemodynamic restoration.", ["26320112"]),
        ("Surgical pericardial window or open thoracotomy drainage is indicated for purulent pericarditis, hemopericardium secondary to aortic dissection (type A) or cardiac trauma, loculated posterior effusions, or recurrent malignant effusions.", ["26320112"])
    ],
    [
        ("26320112", "2015 ESC Guidelines for the diagnosis and management of pericardial diseases.", 2015, "guideline")
    ],
    [
        "Low-pressure (occult) cardiac tamponade: diagnosis and hemodynamic recognition in severely dehydrated or hypovolemic patients.",
        "Role of emergency pericardiocentesis versus immediate operative repair in Type A aortic dissection presenting with acute hemopericardium."
    ],
    [
        "Components and pathophysiology of Beck's triad and pulsus paradoxus.",
        "Specific echocardiographic signs distinguishing uncomplicated pericardial effusion from true tamponade physiology.",
        "Indications for percutaneous catheter pericardiocentesis versus open surgical pericardial window."
    ],
    [
        "A 58-year-old female with metastatic lung adenocarcinoma presenting with tachycardia (124 bpm), BP 82/50 mmHg, elevated JVP, and 18 mmHg pulsus paradoxus, undergoing emergent ultrasound-guided pericardiocentesis.",
        "A 70-year-old male presenting with tearing chest pain, hypotension, and hemopericardium on bedside echo, where acute Type A aortic dissection is diagnosed and taken directly to the operating room."
    ]
)

# 319: Cardiogenic Shock: Etiology, Diagnosis & Mechanical Circulatory Support
BATCH_SHEET2_B5[319] = make_entry(
    'cardiogenic_shock_etiology_and_mcs',
    "Cardiogenic shock is a state of critical end-organ hypoperfusion caused by primary cardiac pump failure, characterized by persistent hypotension (systolic BP < 90 mmHg for > 30 minutes or requiring vasopressors), elevated cardiac filling pressures (pulmonary capillary wedge pressure > 15 mmHg), and severely depressed cardiac index (< 2.2 L/min/m2) with evidence of tissue hypoperfusion (elevated blood lactate, cool extremities, oliguria, altered mental status). Acute myocardial infarction with left ventricular failure accounts for > 60-70% of cases. In the landmark DanGer Shock trial (Moller et al., NEJM), microaxial flow pump mechanical circulatory support (Impella CP) significantly reduced 180-day mortality in STEMI-related cardiogenic shock compared to standard care.",
    [
        ("In the landmark DanGer Shock randomized trial of 355 patients with STEMI-related cardiogenic shock (Moller et al., NEJM), routine treatment with a microaxial flow pump (Impella CP) significantly reduced 180-day all-cause mortality compared with standard care (45.8% vs 58.5%; hazard ratio 0.74, p=0.04).", ["38587232"]),
        ("Microaxial mechanical circulatory support in the DanGer Shock trial was associated with a higher incidence of adverse events, including severe bleeding, limb ischemia, and renal replacement therapy, mandating strict patient selection.", ["38587232"]),
        ("Norepinephrine is the first-line vasopressor of choice to restore coronary and systemic perfusion pressure, carrying lower arrhythmic risk and lower mortality compared to dopamine (SOAP II trial).", ["34447992", "38587232"]),
        ("Inodilators (dobutamine or milrinone) are added to augment myocardial contractility and stroke volume, with dobutamine titrated to reverse tissue hypoperfusion while monitoring for tachyarrhythmias.", ["34447992"])
    ],
    [
        ("38587232", "Microaxial Flow Pump or Standard Care in Infarct-Related Cardiogenic Shock (DanGer Shock Trial).", 2024, "trial"),
        ("34447992", "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure.", 2021, "guideline")
    ],
    [
        "Optimal timing of mechanical circulatory support insertion: whether pre-PCI Impella implantation is superior to post-PCI deployment.",
        "Role of temporary venoarterial extracorporeal membrane oxygenation (VA-ECMO) combined with left ventricular venting (ECPELLA) in refractory biventricular shock."
    ],
    [
        "Primary 180-day mortality findings from the DanGer Shock trial evaluating microaxial flow pumps in STEMI cardiogenic shock.",
        "Hemodynamic criteria defining cardiogenic shock (cardiac index < 2.2 L/min/m2, PCWP > 15 mmHg, SBP < 90 mmHg).",
        "First-line vasoactive agent selection (norepinephrine over dopamine) established in SOAP II."
    ],
    [
        "A 56-year-old male with acute anterior STEMI presenting in cardiogenic shock (BP 76/48 mmHg, lactate 4.8 mmol/L, CI 1.6 L/min/m2) treated with emergency PCI and Impella CP support.",
        "A 68-year-old female with decompensated ischemic cardiomyopathy in low-output shock initiated on peripheral norepinephrine and low-dose dobutamine."
    ]
)

# 320: Cardiogenic Shock: SCAI Classification & Early MCS
BATCH_SHEET2_B5[320] = make_entry(
    'cardiogenic_shock_scai_classification',
    "The Society for Cardiovascular Angiography and Interventions (SCAI) clinical shock staging system provides a standardized, universally adopted framework categorizing cardiogenic shock severity into five distinct progressive stages: Stage A (At risk: large MI or acute HF without shock signs), Stage B (Beginning: hemodynamic instability/tachycardia without hypoperfusion), Stage C (Classic: hypoperfusion requiring inotrope/vasopressor or mechanical support), Stage D (Deteriorating: failure to stabilize despite initial therapy), and Stage E (Extremis: actual or impending cardiac arrest, refractory collapse). Multi-center registry studies confirm a stepwise increase in inpatient mortality from Stage A (< 3%) to Stage E (> 50-70%).",
    [
        ("The SCAI shock staging schema stratifies shock into five distinct severity tiers: Stage A ('At risk'), Stage B ('Beginning'), Stage C ('Classic'), Stage D ('Deteriorating'), and Stage E ('Extremis'), which strongly correlates with stepwise escalating mortality across multiple validated cohorts.", ["31106516"]),
        ("Stage C ('Classic' cardiogenic shock) is clinically defined by relative hypoperfusion (cool extremities, oliguria < 30 mL/h, serum lactate >= 2 mmol/L) requiring inotropic or mechanical support to restore organ perfusion.", ["31106516"]),
        ("Stage D ('Deteriorating') indicates failure to respond to initial inotropes or device therapy within 1-2 hours, signaling the need for immediate escalation of mechanical circulatory support (Impella, VA-ECMO) or pulmonary artery catheterization.", ["31106516", "38587232"]),
        ("Early invasive hemodynamic monitoring with a pulmonary artery catheter (PAC) is strongly recommended in SCAI Stages C, D, and E to guide granular titration of inotropes, vasopressors, and mechanical unloading.", ["31106516", "34447992"])
    ],
    [
        ("31106516", "SCAI clinical expert consensus statement on the classification of cardiogenic shock.", 2019, "consensus-guideline"),
        ("38587232", "Microaxial Flow Pump or Standard Care in Infarct-Related Cardiogenic Shock (DanGer Shock Trial).", 2024, "trial"),
        ("34447992", "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure.", 2021, "guideline")
    ],
    [
        "Validation of automated machine-learning clinical decision support systems in predicting transitions between SCAI stages in real-time ICU telemetry.",
        "Cardiac Power Output (CPO = [mean arterial pressure x cardiac output] / 451) and Pulmonary Artery Pulsatility Index (PAPi) thresholds guiding right ventricular MCS."
    ],
    [
        "The five distinct stages of the SCAI cardiogenic shock classification (A through E).",
        "Clinical and biochemical markers separating Stage B (normolactatemic) from Stage C (hypoperfusion/elevated lactate).",
        "Role of the pulmonary artery catheter in managing advanced deteriorating shock (SCAI Stages D and E)."
    ],
    [
        "A 62-year-old male with massive anterior STEMI presenting with heart rate 112 bpm, BP 94/62 mmHg, normal lactate (1.2 mmol/L), classified as SCAI Stage B shock.",
        "A 58-year-old female with cardiogenic shock requiring escalating norepinephrine (0.35 ug/kg/min) and epinephrine with rising lactate (5.6 mmol/L), classified as SCAI Stage D and escalated to mechanical support."
    ]
)

# 321: Cardiogenic Shock: Intra-Aortic Balloon Pump (IABP-SHOCK II)
BATCH_SHEET2_B5[321] = make_entry(
    'iabp_shock_ii_trial_and_revascularization',
    "The routine use of the Intra-Aortic Balloon Pump (IABP) in acute myocardial infarction complicated by cardiogenic shock was fundamentally demoted by the landmark IABP-SHOCK II randomized trial. In 600 patients with infarct-related cardiogenic shock undergoing early revascularization, adding counterpulsation with an IABP did not reduce 30-day all-cause mortality (39.7% vs 41.3%, p=0.69). Long-term 6-year follow-up (Thiele et al., Lancet) confirmed that IABP conferred zero survival benefit, no improvement in quality of life, and no reduction in recurrent infarction. Consequently, international guidelines downgraded routine IABP use from Class I to a Class III (not recommended) intervention.",
    [
        ("In the landmark IABP-SHOCK II randomized trial of 600 patients (Thiele et al., NEJM), intra-aortic balloon counterpulsation did not reduce 30-day all-cause mortality compared with medical control (39.7% vs 41.3%; relative risk 0.96, p=0.69) in infarct-related cardiogenic shock.", ["22920912"]),
        ("The definitive 6-year long-term follow-up of IABP-SHOCK II (Thiele et al., Lancet) confirmed no survival benefit of IABP over standard care (mortality 66.3% vs 67.0%, p=0.98) and no reduction in recurrent myocardial infarction or revascularization.", ["30580970"]),
        ("European Society of Cardiology (ESC) guidelines issue a Class III (not recommended) recommendation against the routine use of IABP in patients with cardiogenic shock secondary to acute myocardial infarction undergoing revascularization.", ["34447992", "22920912"]),
        ("IABP retains an evidence-based Class IIa recommendation for mechanical complications of myocardial infarction: acute severe mitral regurgitation from papillary muscle rupture or ventricular septal rupture (VSR) as a bridge to emergency surgery.", ["34447992", "22920912"])
    ],
    [
        ("22920912", "Intra-aortic balloon support for myocardial infarction with cardiogenic shock (IABP-SHOCK II Trial).", 2012, "trial"),
        ("30580970", "Six-year outcomes of the randomized IABP-SHOCK II trial (Lancet).", 2018, "trial"),
        ("34447992", "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure.", 2021, "guideline")
    ],
    [
        "Whether specific subgroups (e.g., late presenters, microvascular obstruction without active flow) derive mechanical unloading benefit from IABP counterpulsation.",
        "Role of IABP as an adjunctive venting strategy to decompress the left ventricle in patients supported on peripheral VA-ECMO."
    ],
    [
        "Primary 30-day and 6-year mortality findings from the IABP-SHOCK II trial.",
        "Class III guideline status for routine IABP in acute myocardial infarction with cardiogenic shock.",
        "Specific clinical indications where IABP remains strongly recommended (acute mechanical complications: VSR and papillary muscle rupture)."
    ],
    [
        "A 65-year-old male with acute inferior STEMI and cardiogenic shock undergoing successful culprit-vessel stenting, where routine IABP placement is omitted per IABP-SHOCK II guidance.",
        "A 71-year-old female on day 4 post-MI who develops acute pulmonary edema, a harsh pansystolic murmur, and ventricular septal rupture, stabilized with emergency IABP insertion as a bridge to surgical repair."
    ]
)

# 322: Cardiogenic Shock: CULPRIT-SHOCK Trial & Revascularization
BATCH_SHEET2_B5[322] = make_entry(
    'culprit_shock_trial_and_multivessel_pci',
    "Multivessel coronary artery disease occurs in 70-80% of patients presenting with acute myocardial infarction complicated by cardiogenic shock. The practice of immediate, complete multivessel PCI during the index catheterization was definitively disproven by the landmark CULPRIT-SHOCK randomized trial (706 patients). In CULPRIT-SHOCK (Thiele et al., NEJM), immediate PCI of only the culprit lesion significantly reduced 30-day all-cause mortality or severe renal failure requiring dialysis by 17% compared with immediate multivessel PCI (45.9% vs 55.4%, p=0.01). Immediate non-culprit PCI in unstable cardiogenic shock prolongs procedure time, increases iodinated contrast toxicity, and exacerbates myocardial stunning.",
    [
        ("In the landmark multicenter CULPRIT-SHOCK randomized trial (Thiele et al., NEJM), immediate PCI of the culprit lesion only significantly reduced 30-day all-cause mortality or severe renal failure (45.9% vs 55.4%; relative risk 0.83, p=0.01) compared with immediate multivessel PCI.", ["29072179"]),
        ("The primary driver was a significant absolute 8.2% reduction in 30-day mortality in the culprit-lesion-only group (43.3% vs 51.5%; relative risk 0.84, p=0.03).", ["29072179"]),
        ("One-year follow-up of CULPRIT-SHOCK confirmed sustained mortality benefits and showed that staged, elective revascularization of non-culprit lesions in clinically stable patients was safe and required in only 17% of survivors.", ["29072179"]),
        ("2021 ACC/AHA and ESC guidelines recommend immediate PCI restricted to the culprit artery only during the index procedure in cardiogenic shock, advising that non-culprit lesions should be addressed in a staged manner only after clinical stabilization.", ["34893443", "29072179"])
    ],
    [
        ("29072179", "PCI Strategies in Patients with Acute Myocardial Infarction and Cardiogenic Shock (CULPRIT-SHOCK Trial).", 2017, "trial"),
        ("34893443", "2021 ACC/AHA/SCAI Guideline for Coronary Artery Revascularization.", 2022, "guideline")
    ],
    [
        "Criteria triggering urgent immediate non-culprit PCI (e.g., multiple angiographically unstable culprit lesions or persistent severe ischemia with unidentifiable culprit).",
        "Optimal timing and physiological evaluation (FFR/iFR) for staged non-culprit revascularization after discharge from the intensive care unit."
    ],
    [
        "Primary composite endpoint reduction and 30-day mortality findings from the CULPRIT-SHOCK trial.",
        "Pathophysiological mechanisms explaining why immediate multivessel PCI worsens shock outcomes (contrast volume, procedural time, microvascular injury).",
        "Guideline recommendations for culprit-only initial PCI versus staged non-culprit revascularization."
    ],
    [
        "A 61-year-old male with acute anterior STEMI and cardiogenic shock whose angiogram shows a thrombotic LAD occlusion and chronic 80% RCA stenosis, where stenting is restricted to the LAD per CULPRIT-SHOCK.",
        "A 69-year-old female in cardiogenic shock undergoing successful culprit-only circumflex PCI who achieves hemodynamic stability and returns 4 weeks later for staged elective RCA stenting."
    ]
)

# 323: Cardio-Oncology: Chemotherapy Cardiotoxicity & ICI Myocarditis
BATCH_SHEET2_B5[323] = make_entry(
    'cardio_oncology_surveillance_and_ici_myocarditis',
    "Cardio-oncology focuses on the prevention, early detection, and management of cardiovascular toxicities secondary to antineoplastic therapies. Major categories include: (1) type I irreversible cardiotoxicity from anthracyclines (doxorubicin; cumulative dose-dependent myocardial necrosis and fibrosis); (2) type II reversible cardiotoxicity from HER2-targeted agents (trastuzumab; LVEF decline without myocyte death); and (3) immune checkpoint inhibitor (ICI)-associated myocarditis (nivolumab, pembrolizumab, ipilimumab). According to 2022 ESC Cardio-Oncology Guidelines, baseline echocardiography with global longitudinal strain (GLS; > 15% relative reduction signals subclinical cardiotoxicity) and high-sensitivity troponin monitoring guide cardioprotective therapy.",
    [
        ("2022 ESC Cardio-Oncology Guidelines define cancer therapy-related cardiac dysfunction (CTRCD) by a new LVEF drop >= 10 percentage points to < 50%, or a relative reduction in global longitudinal strain (GLS) by > 15% from baseline.", ["36017568"]),
        ("Cumulative lifetime doxorubicin dose should not exceed 400-450 mg/m2 to limit heart failure risk; the iron-chelating cardioprotective agent dexrazoxane is indicated in patients receiving high cumulative anthracycline doses.", ["36017568"]),
        ("Trastuzumab (anti-HER2) cardiotoxicity is characterized by a reversible, non-dose-dependent decline in LVEF; guidelines advise continuing trastuzumab with GDMT (ACEi/beta-blocker) if LVEF remains >= 40-49% and the patient is asymptomatic, interrupting treatment only if LVEF drops < 40%.", ["36017568"]),
        ("Immune checkpoint inhibitor (ICI) myocarditis is a fulminant medical emergency carrying a > 30-50% mortality rate; immediate permanent discontinuation of ICIs and urgent initiation of high-dose intravenous methylprednisolone (1,000 mg daily for 3 days) followed by abatacept or ATG in refractory cases is life-saving.", ["36017568"])
    ],
    [
        ("36017568", "2022 ESC Guidelines on cardio-oncology developed in collaboration with the European Hematology Association (EHA), the European Society for Therapeutic Radiology and Oncology (ESTRO) and the International Cardio-Oncology Society (IC-OS).", 2022, "guideline")
    ],
    [
        "Primary cardioprotective efficacy of initiating prophylactic SGLT2 inhibitors and beta-blockers prior to anthracycline-based chemotherapy in high-risk patients.",
        "Role of serial high-sensitivity cardiac troponin I in detecting subclinical myocardial injury during checkpoint inhibitor immunotherapy."
    ],
    [
        "Diagnostic definition of CTRCD based on left ventricular ejection fraction and global longitudinal strain (GLS > 15% decline).",
        "Differentiating anthracycline-induced Type I cardiotoxicity from trastuzumab-induced Type II cardiotoxicity.",
        "Emergency clinical recognition and high-dose corticosteroid management of immune checkpoint inhibitor myocarditis."
    ],
    [
        "A 52-year-old female receiving adjuvant doxorubicin whose echocardiogram shows stable LVEF (58%) but a 19% relative worsening of GLS, initiated on lisinopril and carvedilol for subclinical cardiotoxicity.",
        "A 64-year-old male with metastatic melanoma on nivolumab/ipilimumab who develops new-onset complete heart block, fatigue, and troponin I of 4,200 ng/L, immediately treated with IV methylprednisolone 1 g/day."
    ]
)

# 324: Cardiopulmonary Exercise Testing (CPET)
BATCH_SHEET2_B5[324] = make_entry(
    'cardiopulmonary_exercise_testing_cpet',
    "Cardiopulmonary Exercise Testing (CPET) is the gold-standard, non-invasive assessment of integrated cardiovascular, respiratory, and metabolic physiological reserves during progressive incremental physical exertion. By measuring breath-by-breath gas exchange (oxygen uptake [VO2], carbon dioxide output [VCO2], and minute ventilation [VE]), CPET objectively evaluates unexplained dyspnea, stratifies surgical risk prior to major cavitary operations, and determines prognosis and transplant listing in heart failure. Cardinal physiological metrics include peak oxygen consumption (peak VO2), the anaerobic threshold (AT), and the ventilatory equivalent for carbon dioxide (VE/VCO2 slope).",
    [
        ("Peak oxygen consumption (peak VO2) is the most robust prognostic marker in heart failure: peak VO2 <= 12-14 mL/kg/min (or <= 50% of predicted) is an established Class I criterion for listing for orthotopic heart transplantation or mechanical circulatory support.", ["22534344"]),
        ("The VE/VCO2 slope reflects ventilatory efficiency: elevated values (> 34-36) demonstrate increased pulmonary dead space, early metabolic lactic acidemia, and excessive chemoreceptor reflex drive, independently predicting mortality in HFrEF.", ["22534344"]),
        ("The anaerobic threshold (AT)—identified via the V-slope method where VCO2 begins to rise faster than VO2—occurs at 50-60% of peak VO2; an AT < 11 mL/kg/min predicts high perioperative cardiopulmonary complications after major abdominal surgery.", ["22534344"]),
        ("CPET accurately differentiates cardiac limitation (reduced peak VO2, normal breathing reserve > 30%, normal pulse oximetry) from pulmonary ventilatory limitation (exhausted breathing reserve < 15-20%, exertional desaturation, abnormal oxygen pulse).", ["22534344"])
    ],
    [
        ("22534344", "Cardiopulmonary exercise testing in secondary and tertiary care: a joint scientific statement of the American Heart Association and EACPR.", 2012, "guideline")
    ],
    [
        "Clinical utility of non-invasive CPET-derived exercise oscillatory ventilation (EOV) in forecasting sudden arrhythmic death in heart failure.",
        "CPET evaluation of unexplained persistent exertional dyspnea in patients with post-acute sequelae of COVID-19 (PASC / Long COVID)."
    ],
    [
        "Prognostic peak VO2 cutoffs (< 12-14 mL/kg/min) guiding cardiac transplantation eligibility.",
        "Clinical significance and prognostic cutoff of the VE/VCO2 slope in heart failure.",
        "Gas exchange parameters distinguishing cardiovascular versus pulmonary mechanical causes of exercise limitation."
    ],
    [
        "A 58-year-old male with ischemic cardiomyopathy evaluated for heart transplantation whose CPET reveals a peak VO2 of 10.8 mL/kg/min and VE/VCO2 slope of 42, supporting urgent listing.",
        "A 68-year-old male with severe COPD and prior CAD undergoing pre-operative CPET before major lung resection, where an exhausted breathing reserve of 8% confirms primary ventilatory limitation."
    ]
)

# 325: Cardiopulmonary Resuscitation in the ICU & Post-Arrest Care
BATCH_SHEET2_B5[325] = make_entry(
    'cpr_in_icu_and_post_arrest_care',
    "In-hospital cardiac arrest (IHCA) occurring within an intensive care unit (ICU) presents distinct clinical features compared to out-of-hospital arrest, as patients are monitored, frequently intubated, and suffer from advanced multi-organ failure. Advanced post-resuscitation care focuses on the prevention of secondary hypoxic-ischemic brain injury and myocardial stunning. Grounded in the landmark TTM2 trial (Dankiewicz et al., NEJM) and ERC/ESICM guidelines, post-cardiac arrest management requires: (1) strict normothermia (target core temperature <= 37.5°C, actively avoiding fever) for at least 72 hours; (2) hemodynamic optimization targeting mean arterial pressure >= 65-75 mmHg; (3) lung-protective normocapnia (PaCO2 35-45 mmHg); and (4) delayed, multimodal neuroprognostication.",
    [
        ("In the definitive TTM2 trial (Dankiewicz et al., NEJM; 1,900 comatose post-arrest patients), targeted hypothermia at 33°C did not reduce 6-month mortality (50% vs 48%) or functional disability compared with targeted normothermia (treating fever > 37.7°C), establishing fever prevention as the standard of care.", ["34133853"]),
        ("ERC/ESICM post-resuscitation care guidelines mandate avoiding hyperoxia (titrating FiO2 to maintain SpO2 94-98% or PaO2 75-100 mmHg) and avoiding hypocapnia (maintaining normocapnia, PaCO2 35-45 mmHg) to prevent cerebral vasoconstriction.", ["33773824"]),
        ("Early emergent coronary angiography is indicated in post-arrest patients presenting with ST-elevation myocardial infarction (STEMI) or high suspicion of acute coronary occlusion, even if comatose.", ["33773824"]),
        ("Multimodal neuroprognostication must be delayed until at least 72 hours post-ROSC (and after rewarming/sedation clearance), integrating clinical examination (bilateral absence of pupillary and corneal reflexes), somatosensory evoked potentials (bilateral absent N20 waves), EEG (suppression-burst or status epilepticus), and brain CT/MRI.", ["33773824", "34133853"])
    ],
    [
        ("34133853", "Hypothermia versus Normothermia after Out-of-Hospital Cardiac Arrest (TTM2 Trial).", 2021, "trial"),
        ("33773824", "European Resuscitation Council and European Society of Intensive Care Medicine guidelines 2021: post-resuscitation care.", 2021, "guideline")
    ],
    [
        "Target mean arterial pressure goals (MAP 65-75 mmHg vs MAP 80-85 mmHg; BOX trial) in minimizing brain hypoperfusion post-resuscitation.",
        "Role of serum neuron-specific enolase (NSE) and neurofilament light chain (NfL) cutoffs at 48-72 hours in objective neuroprognostication."
    ],
    [
        "Evidence from the TTM2 trial supporting targeted normothermia (avoiding fever) over deep hypothermia.",
        "Arterial oxygenation and carbon dioxide ventilation targets to prevent secondary brain injury.",
        "The multimodal neuroprognostication framework and mandatory 72-hour delay prior to predicting poor neurological outcome."
    ],
    [
        "A 60-year-old male resuscitated from VF arrest managed in the ICU on a closed-loop surface cooling device maintaining temperature 36.5°C to 37.2°C for 72 hours, avoiding hyperthermia.",
        "A 65-year-old post-arrest patient comatose at 72 hours whose neurological assessment demonstrates bilaterally absent N20 somatosensory evoked potentials, indicating severe irreversible hypoxic encephalopathy."
    ]
)
