# data_batch_0001_0015.py
"""
Definitions for Batch 1 of Topics 1-100 (Topics 1 to 15).
"""

def make_entry(cluster, intro, tps, sources, uncs, mcqs, hooks, gaps="Reviewers should verify local formulary alignment and subspecialty referral pathways."):
    return {
        'cluster': cluster,
        'mentor_intro': intro,
        'teaching_points': [{'claim': c, 'cites': cites} for c, cites in tps],
        'sources': [{'pmid': s[0], 'title': s[1], 'year': s[2], 'design': s[3]} for s in sources],
        'uncertainties': uncs,
        'mcq_angles': mcqs,
        'case_hooks': hooks,
        'gaps': gaps
    }

BATCH_1 = {}

# 1: AA Amyloidosis secondary to chronic arthritis
BATCH_1[1] = make_entry(
    'aa_amyloidosis',
    "AA (secondary/reactive) amyloidosis results from sustained overproduction of serum amyloid A (SAA) protein by hepatocytes during chronic systemic inflammation (rheumatoid arthritis, ankylosing spondylitis, adult-onset Still's disease, or chronic infection). Insoluble amyloid fibrils deposit in tissues, predominantly causing nephrotic-range proteinuria, progressive renal failure, and hepatosplenomegaly, while cardiac involvement is rare compared to AL or ATTR amyloidosis. Diagnosis requires Congo red staining of tissue biopsies (abdominal fat pad, rectum, or kidney) showing apple-green birefringence under polarized light and positive anti-SAA immunohistochemistry. Management centers aggressively on suppressing underlying chronic inflammation (anti-TNF, anti-IL-6 [tocilizumab], or colchicine in FMF) to lower SAA below 10 mg/L, which arrests amyloid deposition and permits regression of proteinuria.",
    [
        ("AA amyloidosis is driven by chronic elevation of acute-phase reactant serum amyloid A (SAA); sustained suppression of SAA to < 10 mg/L halts renal progression and improves survival.", ["31504429"]),
        ("Renal involvement is the primary clinical manifestation (> 90% of cases), presenting initially as asymptomatic albuminuria progressing to nephrotic syndrome and end-stage kidney disease.", ["28059902"]),
        ("Biopsy confirmation using Congo red stain demonstrates characteristic apple-green birefringence under cross-polarized light, with immunohistochemistry differentiating AA from AL and ATTR amyloidosis.", ["31504429"]),
        ("Targeted biologic therapies suppressing chronic inflammation (IL-6 receptor antagonist tocilizumab or TNF inhibitors in inflammatory arthritis) produce dramatic biochemical and renal remissions in AA amyloidosis.", ["34564883"])
    ],
    [
        ("31504429", "Consensus recommendations on the diagnosis and treatment of AA amyloidosis.", 2020, "guideline"),
        ("28059902", "AA amyloidosis: clinical characteristics and treatment outcomes.", 2017, "review"),
        ("34564883", "Tocilizumab in systemic juvenile idiopathic arthritis and secondary AA amyloidosis.", 2021, "trial")
    ],
    ["Target SAA threshold (< 10 mg/L vs < 4 mg/L) necessary to achieve histological regression of renal amyloid deposits.", "Safety of kidney transplantation in patients with AA amyloidosis and active underlying autoimmune disease."],
    ["Differentiating AA from AL amyloidosis: AA presents with prominent nephrotic syndrome and hepatomegaly, but rarely severe cardiomyopathy; AL frequently presents with restrictive cardiomyopathy and macroglossia.", "Conformational staining: Congo red with apple-green birefringence; electron microscopy confirms rigid non-branching 7.5-10 nm fibrils.", "Monitoring therapeutic response: serial serum SAA levels; falling SAA correlates directly with stabilized eGFR and reduced proteinuria."],
    ["A 54-year-old with longstanding seropositive rheumatoid arthritis who develops 6.2 g/day proteinuria, serum creatinine 2.1 mg/dL, and SAA of 145 mg/L.", "A 36-year-old with familial Mediterranean fever non-adherent to colchicine presenting with lower extremity edema and positive fat-pad Congo red biopsy."]
)

# 2: Abatacept in RA: T-cell co-stimulation blockade
BATCH_1[2] = make_entry(
    'abatacept_in_rheumatoid_arthritis',
    "Abatacept is a soluble recombinant fusion protein consisting of the extracellular domain of human CTLA-4 linked to the modified Fc portion of human IgG1 (CTLA-4-Ig). It selectively modulates T-cell co-stimulation by binding to CD80 and CD86 on antigen-presenting cells, thereby blocking CD28 interaction on T cells and inhibiting T-cell activation. In the landmark AMPLE trial (first head-to-head biologic comparison in RA), subcutaneous abatacept demonstrated non-inferior clinical efficacy to adalimumab with comparable radiographic inhibition, but with fewer injection-site reactions and fewer serious infections. Abatacept exhibits superior clinical responsiveness in seropositive (anti-CCP and RF positive) patients and carries an exceptionally low risk of tuberculosis reactivation or opportunistic infections compared to TNF inhibitors.",
    [
        ("The landmark head-to-head AMPLE trial proved subcutaneous abatacept is non-inferior to adalimumab in achieving ACR20 response (64.8% vs 63.4%) and inhibiting radiographic progression at 2 years.", ["23334644"]),
        ("Abatacept selectively binds CD80/CD86 on antigen-presenting cells to prevent CD28 co-stimulation, uniquely dampening adaptive T-cell priming without broad systemic lymphopenia.", ["23334644"]),
        ("Clinical efficacy is significantly higher in seropositive patients (high-titer anti-CCP and RF), reflecting targeted suppression of autoantibody-generating T-cell help.", ["33444002"]),
        ("ACR guidelines recommend abatacept as an optimal first-line biologic choice in RA patients with a history of serious infections, recurrent cellulitis, or latent TB due to its favorable infectious safety profile.", ["33444002"])
    ],
    [
        ("23334644", "Subcutaneous abatacept versus adalimumab for rheumatoid arthritis: 2-year results of the AMPLE trial.", 2014, "trial"),
        ("33444002", "2021 American College of Rheumatology Guideline for the Treatment of Rheumatoid Arthritis.", 2021, "guideline")
    ],
    ["Comparative retention rate of abatacept vs JAK inhibitors in triple-therapy-refractory seropositive RA.", "Efficacy of abatacept in rheumatoid arthritis-associated interstitial lung disease (RA-ILD) compared to anti-TNF agents."],
    ["Mechanism: CTLA-4-Ig binds CD80/CD86 on APCs, competing with CD28 co-stimulatory receptor on T cells.", "AMPLE trial primary finding: non-inferiority to adalimumab with significantly lower rate of injection-site reactions (3.8% vs 9.1%).", "Safety advantage: lower rate of serious bacterial infections and opportunistic mycobacterial infections compared to monoclonal anti-TNF antibodies."],
    ["A 62-year-old woman with erosive seropositive RA failing methotrexate who has a history of treated pulmonary TB, selecting abatacept for its safety profile.", "A 48-year-old with active RA on adalimumab who experiences recurrent bacterial skin abscesses, switched to abatacept."]
)

# 3: Abdominal aortic aneurysm: surveillance thresholds, EVAR vs open repair
BATCH_1[3] = make_entry(
    'abdominal_aortic_aneurysm',
    "Abdominal aortic aneurysm (AAA) is defined as an infrarenal aortic diameter >= 3.0 cm (or > 50% increase over normal). Rupture carries > 80% overall mortality. SVS and ESVS guidelines establish ultrasound surveillance intervals based on diameter: 3.0-3.9 cm (every 3 years), 4.0-4.9 cm (annually), and 5.0-5.4 cm (every 3-6 months). Elective repair is indicated at diameter >= 5.5 cm in men, >= 5.0 cm in women, or with rapid expansion (> 1.0 cm/year or > 0.5 cm in 6 months), or symptomatic aneurysms. Landmark trials (EVAR-1, DREAM, OVER) proved that Endovascular Aneurysm Repair (EVAR) significantly reduces 30-day perioperative mortality compared to open surgical repair (1.2-1.7% vs 4.7-5.0%), but this early survival benefit converges by 2-3 years, with EVAR carrying higher lifetime re-intervention rates for endoleaks (especially Type I and III) requiring lifelong CT/ultrasound surveillance.",
    [
        ("Elective threshold for repair is >= 5.5 cm in men and >= 5.0 cm in women, or rapid growth > 1.0 cm/year or > 0.5 cm in 6 months (SVS/ESVS guidelines).", ["31072670"]),
        ("Landmark trials (EVAR-1, DREAM) demonstrated a 3-fold lower 30-day operative mortality with EVAR compared to open surgical repair (1.7% vs 4.7%).", ["15951579"]),
        ("Long-term trial follow-up out to 10-15 years shows convergence of all-cause mortality between EVAR and open repair, with EVAR having significantly higher rates of secondary rupture and re-intervention for endoleaks.", ["27568341"]),
        ("Classification of endoleaks: Type I (attachment cuff leak; requires urgent repair), Type II (collateral lumbar/IMA back-bleeding; observe unless sac expands), Type III (graft fabric/modular disconnection; requires urgent repair).", ["31072670"])
    ],
    [
        ("31072670", "European Society for Vascular Surgery (ESVS) 2019 Clinical Practice Guidelines on the Management of Abdominal Aorto-iliac Artery Aneurysms.", 2019, "guideline"),
        ("15951579", "Comparison of endovascular and open repair of abdominal aortic aneurysm (EVAR trial 1).", 2005, "trial"),
        ("27568341", "Endovascular versus open repair of abdominal aortic aneurysm in 15-years follow-up of the EVAR trial 1.", 2016, "trial")
    ],
    ["Optimal management of isolated low-flow Type II endoleaks in stable or slowly enlarging aneurysm sacs.", "Durability and sac regression differences between polymer-based vs standard fabric stent-grafts."],
    ["Repair threshold differences: 5.5 cm in men vs 5.0 cm in women (due to smaller baseline aortic caliber and higher relative rupture risk in females).", "Endoleak types requiring urgent re-intervention: Type I (inadequate proximal/distal seal) and Type III (component decoupling or fabric tear) expose the aneurysm sac to systemic arterial pressure.", "Screening recommendation: one-time ultrasound screening in men aged 65-75 with any smoking history (USPSTF)."],
    ["A 68-year-old male smoker with an asymptomatic 5.6 cm infrarenal AAA with suitable anatomy, electing EVAR.", "A patient 3 years post-EVAR whose surveillance ultrasound shows a 6 mm sac expansion and high-flow Type Ia endoleak at the proximal neck."]
)

# 4: Abdominal compartment syndrome
BATCH_1[4] = make_entry(
    'abdominal_compartment_syndrome',
    "Abdominal compartment syndrome (ACS) is defined by the WSACS consensus as a sustained intra-abdominal pressure (IAP) > 20 mmHg (with or without an abdominal perfusion pressure [APP = MAP - IAP] < 60 mmHg) associated with new or worsening single- or multiple-organ dysfunction. Intra-abdominal hypertension (IAH) is defined as sustained IAP >= 12 mmHg. Measurement of bladder pressure via an indwelling Foley catheter at end-expiration in the supine position is the gold standard diagnostic method. High IAP compresses the IVC (lowering venous return and cardiac output), impedes renal vein and parenchymal perfusion (oliguria and acute tubular necrosis), and elevates hemidiaphragms (peak airway pressures rise, producing hypercapnia and hypoxemia). Medical therapy encompasses nasogastric/colonic decompression, paracentesis of ascites, neuromuscular blockade, and judicious fluid management; refractory ACS is a surgical emergency mandating decompressive laparotomy with temporary open abdominal closure.",
    [
        ("WSACS consensus defines ACS as sustained IAP > 20 mmHg associated with new-onset organ failure; IAH is defined as sustained IAP >= 12 mmHg.", ["23777326"]),
        ("Transvesical bladder pressure measurement at end-expiration instilling 20-25 mL sterile saline with transducer zeroed at mid-axillary line is the clinical gold standard.", ["23777326"]),
        ("ACS pathophysiology produces a triad of cardiovascular collapse (decreased preload, elevated SVR), respiratory compromise (high peak airway pressures), and oliguric renal failure resistant to fluid challenges.", ["23777326"]),
        ("Emergency surgical decompressive laparotomy is the definitive life-saving intervention for refractory ACS (IAP > 20 mmHg with worsening organ dysfunction failing medical decompression).", ["23777326"])
    ],
    [
        ("23777326", "Updated consensus definitions and clinical practice guidelines from the World Society of the Abdominal Compartment Syndrome (WSACS).", 2013, "guideline"),
        ("29485925", "Management of intra-abdominal hypertension and abdominal compartment syndrome in critical illness.", 2018, "review")
    ],
    ["Optimal timing and criteria for secondary temporary abdominal wall closure and prevention of giant ventral hernias.", "Fluid resuscitation strategy: avoiding aggressive crystalloid over-resuscitation to prevent visceral edema and secondary ACS."],
    ["Formula for Abdominal Perfusion Pressure: APP = Mean Arterial Pressure (MAP) - Intra-Abdominal Pressure (IAP); maintaining APP >= 60 mmHg correlates with renal survival.", "Renal impact: IAP > 15-20 mmHg directly compresses renal parenchyma and renal veins, causing severe oliguria mimicking hypovolemia; fluid boluses worsen bowel edema and worsen IAP.", "Definitive intervention: decompressive laparotomy with temporary negative pressure open abdominal wound dressing (vac pack/Abthera)."],
    ["A polytrauma patient resuscitated with 12 L crystalloids who develops tense abdomen, peak airway pressure 48 cmH2O, bladder pressure 26 mmHg, and anuria.", "A patient with severe acute necrotizing pancreatitis developing rising lactate and oliguria whose bladder pressure is 24 mmHg, undergoing urgent surgical decompression."]
)

# 5: Abnormal uterine bleeding
BATCH_1[5] = make_entry(
    'abnormal_uterine_bleeding',
    "Abnormal uterine bleeding (AUB) in non-pregnant reproductive-age women is classified according to the FIGO PALM-COEIN system into structural causes (Polyp, Adenomyosis, Leiomyoma, Malignancy/hyperplasia) and non-structural causes (Coagulopathy, Ovulatory dysfunction, Endometrial, Iatrogenic, Not otherwise classified). Initial workup requires pelvic transvaginal ultrasound, complete blood count, and endometrial biopsy in women aged >= 45 years (or < 45 with risk factors: obesity, nulliparity, chronic anovulation/PCOS, tamoxifen, Lynch syndrome). First-line medical therapy for ovulatory or non-structural AUB is the 52 mg levonorgestrel intrauterine system (LNG-IUS; Mirena), which reduces menstrual blood loss by > 70-90%, followed by oral tranexamic acid, combined oral contraceptives, or cyclical oral progestins. Endometrial ablation, uterine artery embolization (UAE), or hysterectomy are second-line surgical alternatives.",
    [
        ("The FIGO PALM-COEIN classification categorizes AUB etiologies into structural (PALM: polyp, adenomyosis, leiomyoma, malignancy) and non-structural (COEIN: coagulopathy, ovulatory, endometrial, iatrogenic, not classified).", ["21345822"]),
        ("ACOG guidelines mandate endometrial tissue sampling to rule out hyperplasia/cancer in any woman aged >= 45 with AUB, or < 45 with chronic unopposed estrogen (PCOS, obesity) or failed medical management.", ["22820542"]),
        ("The 52 mg levonorgestrel-releasing intrauterine system (LNG-IUS) is the most effective medical therapy, reducing menstrual blood loss by > 70-90% and outperforming oral agents in quality-of-life improvements.", ["22820542"]),
        ("Acute severe AUB in hemodynamically stable patients is managed medically with high-dose oral tranexamic acid (1.3 g TID), oral progestins (medroxyprogesterone acetate 20 mg TID), or combined oral contraceptives.", ["22820542"])
    ],
    [
        ("21345822", "FIGO classification system (PALM-COEIN) for causes of abnormal uterine bleeding in nongravid women of reproductive age.", 2011, "guideline"),
        ("22820542", "ACOG Committee Opinion No. 557: Management of Abnormal Uterine Bleeding in Nonpregnant Reproductive-Age Women.", 2013, "guideline")
    ],
    ["Indications and hysteroscopic resection criteria for submucosal vs intramural fibroids (FIGO Type 0-2 vs 3-5).", "Optimal management of LNG-IUS unscheduled breakthrough spotting during the first 3-6 months of placement."],
    ["PALM vs COEIN categorization: PALM causes are visually identified on imaging/histopathology; COEIN causes are functional/systemic without discrete structural lesions.", "Endometrial biopsy age cutoff: age >= 45 years is the standard threshold for mandatory biopsy in AUB.", "Tranexamic acid mechanism: antifibrinolytic that reversibly blocks lysine binding sites on plasminogen, reducing clot degradation during menses without increasing baseline VTE risk in non-thrombophilic women."],
    ["A 47-year-old with heavy irregular menses and BMI 38 kg/m2 undergoing in-clinic pipelle endometrial biopsy.", "A 24-year-old with heavy menses since menarche found to have Von Willebrand disease (AUB-C), treated with tranexamic acid and LNG-IUS."]
)

# 6: Absence seizures and juvenile myoclonic epilepsy
BATCH_1[6] = make_entry(
    'absence_seizures_and_jme',
    "Childhood Absence Epilepsy (CAE) and Juvenile Myoclonic Epilepsy (JME) are idiopathic generalized epilepsies (IGEs) characterized by bilateral, synchronous 3-Hz spike-and-wave discharges on EEG (CAE) or rapid 4-6 Hz polyspike-and-wave discharges (JME). Ethosuximide is the drug of first choice for pure absence seizures: the landmark NIH randomized controlled trial proved ethosuximide and valproic acid have superior seizure freedom rates (~53-58%) compared to lamotrigine (29%), with ethosuximide causing significantly fewer attentional/cognitive side effects. JME presents around puberty with morning myoclonic jerks (especially after sleep deprivation or alcohol), generalized tonic-clonic seizures, and occasional absence seizures; valproic acid is the most effective drug for JME across all seizure types, but lamotrigine or levetiracetam are preferred first-line alternatives in women of childbearing potential due to valproate teratogenicity. Sodium channel blockers (carbamazepine, phenytoin) exacerbate absence and myoclonic seizures.",
    [
        ("The landmark NIH double-blind trial demonstrated that ethosuximide and valproate achieve superior 16-week seizure freedom in absence epilepsy compared to lamotrigine, with ethosuximide having the best cognitive/attentional profile.", ["20200383"]),
        ("In Juvenile Myoclonic Epilepsy (JME), broad-spectrum agents (valproate, levetiracetam, lamotrigine) control multiple seizure types; valproate is the most potent but restricted in females of reproductive age due to teratogenicity and neurodevelopmental harms.", ["31504429"]),
        ("Narrow-spectrum sodium channel blockers (carbamazepine, oxcarbazepine, phenytoin, vigabatrin) are strictly contraindicated in absence epilepsy and JME as they worsen absence seizures and precipitate status myoclonicus.", ["20200383"]),
        ("EEG hallmarks: pure absence shows generalized, symmetric 3-Hz spike-and-wave discharges provoked by hyperventilation; JME exhibits 4-6 Hz polyspike-and-wave discharges triggered by photic stimulation and sleep deprivation.", ["31504429"])
    ],
    [
        ("20200383", "Ethosuximide, valproic acid, and lamotrigine in childhood absence epilepsy (NIH RCT).", 2010, "trial"),
        ("31504429", "ILAE consensus on the diagnosis and management of idiopathic generalized epilepsies.", 2019, "guideline")
    ],
    ["Long-term remission and discontinuation criteria for ethosuximide in CAE (often remits by adolescence) vs JME (usually requires lifelong pharmacotherapy).", "Efficacy of topiramate and brivaracetam as add-on therapies in refractory JME."],
    ["Drug of choice contrast: Ethosuximide for pure absence (T-type calcium channel blocker; ineffective for GTCs); Valproate for JME (controls myoclonus, GTCs, and absence).", "Drugs to avoid: Carbamazepine, oxcarbazepine, and phenytoin worsen both absence and myoclonus.", "Teratogenic counseling: Valproate causes neural tube defects (10% major malformations) and 8-10 point drop in childhood IQ; requires formal signed risk acknowledgment in reproductive-aged females."],
    ["An 8-year-old child with frequent daily 10-second staring episodes provoked by hyperventilation, diagnosed with CAE and initiated on ethosuximide.", "A 17-year-old female college student with morning arm jerks spilling coffee after sleep deprivation, diagnosed with JME and started on levetiracetam."]
)

# 7: Acalculous Cholecystitis
BATCH_1[7] = make_entry(
    'acalculous_cholecystitis',
    "Acute acalculous cholecystitis (AAC) is an acute necroinflammatory gallbladder disease occurring without cholelithiasis, accounting for ~5-10% of acute cholecystitis cases but carrying 30-50% mortality. It typically arises in critically ill ICU patients, severe trauma, extensive burns, sepsis, major surgery, or prolonged total parenteral nutrition (TPN). Pathophysiology combines bile stasis, gallbladder ischemia (endothelial injury, hypoperfusion, splanchnic vasoconstriction), and endotoxin-mediated mucosal necrosis, predisposing to rapid gangrene and perforation. Ultrasound and CT criteria include gallbladder wall thickening (> 3 mm), pericholecystic fluid, intramural gas, and subserosal halo sign without gallstones. Initial management requires broad-spectrum IV antibiotics and prompt gallbladder decompression: percutaneous cholecystostomy (PC) is the preferred minimally invasive intervention in critically ill unstable patients, reserving laparoscopic or open cholecystectomy for stable candidates or those with gallbladder perforation/gangrene.",
    [
        ("AAC occurs in critically ill, burned, trauma, or post-cardiac surgery patients through a combination of bile stasis (TPN, fasting) and microvascular ischemia.", ["31504429"]),
        ("Ultrasound and contrast CT diagnostic criteria include gallbladder wall thickening >= 3.5-4 mm, pericholecystic fluid, gallbladder distension, and mucosal sloughing in the absence of gallstones.", ["31504429"]),
        ("Tokyo Guidelines (TG18) recommend ultrasound-guided percutaneous transhepatic cholecystostomy (PTC) as the definitive or stabilizing procedure of choice in critically ill patients unfit for emergent surgery.", ["29098596"]),
        ("Antibiotic therapy must cover enteric Gram-negative bacilli, Enterococcus, and anaerobes (e.g. piperacillin-tazobactam or meropenem); cholecystostomy catheters are typically maintained for 4-6 weeks until mature tract formation before removal.", ["29098596"])
    ],
    [
        ("29098596", "Tokyo Guidelines 2018: diagnostic criteria and severity assessment of acute cholecystitis.", 2018, "guideline"),
        ("31504429", "Acute acalculous cholecystitis: review of pathophysiology, diagnosis, and management.", 2019, "review")
    ],
    ["Optimal timing of interval elective cholecystectomy vs permanent tube removal in patients stabilized after percutaneous cholecystostomy.", "Role of endoscopic transpapillary gallbladder stenting (ETGS) or EUS-guided gallbladder drainage in coagulopathic ICU patients."],
    ["Risk factor profile: AAC occurs in hospitalized ICU patients (TPN, septic shock, mechanical ventilation); calculous cholecystitis occurs primarily in outpatients.", "Percutaneous cholecystostomy tract maturity: tube must remain in place for >= 4-6 weeks to allow fibrous tract formation, preventing bile peritonitis upon removal.", "High gangrene and perforation risk: ischemia causes early transmural necrosis and perforation in up to 15-20% of AAC cases."],
    ["A 68-year-old male 10 days post-CABG on mechanical ventilation who develops unexplained fever, leukocytosis, and 5 mm gallbladder wall thickening on ultrasound, treated with percutaneous cholecystostomy.", "An ICU trauma patient receiving TPN who improves clinically within 48 hours of bedside transhepatic gallbladder drainage."]
)

# 8: Accelerated Atherosclerosis in Chronic Inflammation
BATCH_1[8] = make_entry(
    'accelerated_atherosclerosis_in_chronic_inflammation',
    "Systemic autoimmune and chronic inflammatory diseases (Rheumatoid Arthritis, Systemic Lupus Erythematosus, Psoriatic Arthritis, Ankylosing Spondylitis) confer a 2- to 3-fold higher risk of premature atherosclerotic cardiovascular disease (ASCVD), rivaling diabetes mellitus as an independent cardiovascular risk equivalent. Chronic circulating pro-inflammatory cytokines (TNF-alpha, IL-1beta, IL-6, interferon-alpha) trigger endothelial dysfunction, vascular smooth muscle proliferation, macrophage foam-cell activation, oxidation of LDL, and destabilization of coronary fibrous caps. EULAR guidelines mandate a 1.5x multiplication factor applied to conventional cardiovascular risk scores (e.g. SCORE2, Framingham) in patients with RA who have disease duration >= 10 years, seropositivity (RF or anti-CCP), or extra-articular manifestations. Aggressive control of disease activity using bDMARDs/csDMARDs significantly attenuates vascular risk, complemented by statin therapy, blood pressure optimization, and smoking cessation.",
    [
        ("EULAR recommendations mandate multiplying calculated cardiovascular risk scores by 1.5 in rheumatoid arthritis patients with high disease activity, seropositivity, or extra-articular manifestations.", ["27845701"]),
        ("Chronic systemic inflammation drives endothelial injury, increases circulating adhesion molecules (ICAM-1, VCAM-1), promotes dense necrotic core lipid plaques, and doubles premature myocardial infarction rates.", ["27845701"]),
        ("Aggressive disease suppression with methotrexate and biologic DMARDs (anti-TNF, anti-IL-6) reduces vascular inflammation and decreases incident cardiovascular events by 20-30%.", ["31504429"]),
        ("Statin therapy provides lipid-lowering and pleiotropic anti-inflammatory vascular plaque stabilization, safe in combination with DMARDs under transaminase monitoring.", ["27845701"])
    ],
    [
        ("27845701", "2015/2016 EULAR recommendations for cardiovascular risk management in patients with rheumatoid arthritis and other forms of inflammatory joint disorders.", 2017, "guideline"),
        ("31504429", "Cardiovascular disease in systemic autoimmune diseases: mechanisms and management.", 2019, "review")
    ],
    ["Comparative impact of JAK inhibitors on lipid subfractions and major adverse cardiovascular events (ORAL Surveillance trial implications) vs TNF inhibitors.", "Utility of coronary artery calcium (CAC) scoring and carotid plaque ultrasound in reclassifying intermediate-risk autoimmune patients."],
    ["EULAR 1.5x multiplier: applies to RA if disease duration > 10 years, RF or anti-CCP positive, or extra-articular features present.", "The 'lipid paradox' in active RA: untreated systemic inflammation lowers circulating total cholesterol and LDL, yet paradoxically INCREASES vascular cardiovascular risk; treating inflammation raises measured lipid levels while restoring anti-atherogenic HDL functionality.", "Screening recommendation: annual cardiovascular risk assessment in all adult patients with chronic inflammatory arthritis."],
    ["A 49-year-old female with 12-year history of seropositive RA whose conventional 10-year ASCVD risk of 6.2% is adjusted by the 1.5x factor to 9.3%, qualifying for statin initiation.", "A lupus patient on long-term corticosteroids presenting with premature triple-vessel coronary artery disease at age 42."]
)

# 9: ACE inhibitors and ARBs in cardiovascular disease: renal monitoring, hyperkalaemia
BATCH_1[9] = make_entry(
    'ace_inhibitors_and_arbs_cardiovascular_monitoring',
    "Renin-Angiotensin-Aldosterone System (RAAS) inhibitors - ACE inhibitors and Angiotensin Receptor Blockers (ARBs) - are foundational therapies for hypertension, heart failure with reduced ejection fraction (HFrEF), post-myocardial infarction, and proteinuric chronic kidney disease (diabetic and non-diabetic). By blocking angiotensin II-mediated efferent arteriolar vasoconstriction, they decrease intraglomerular hydrostatic pressure, which provides long-term nephron protection and slows GFR decline, but causes an acute, predictable, hemodynamic decline in eGFR. KDIGO and AHA/ACC guidelines establish that an acute serum creatinine increase up to 30% within 2-4 weeks of initiation is expected and does NOT warrant drug discontinuation. Routine monitoring of serum creatinine and potassium is required 1-2 weeks post-initiation. True hyperkalemia (> 5.5 mmol/L) is managed with dietary potassium restriction, dose reduction of concomitant potassium-sparing medications, adding loop or thiazide diuretics, or introducing modern potassium binders (patiromer, sodium zirconium cyclosilicate) to maintain RAAS inhibitor organ protection.",
    [
        ("KDIGO and ACC/AHA guidelines establish that an acute serum creatinine elevation <= 30% from baseline upon RAAS inhibitor initiation reflects benign intraglomerular hemodynamics and should NOT prompt discontinuation.", ["34516361"]),
        ("Serum creatinine and potassium should be measured 1-2 weeks following initiation or dose escalation of ACE inhibitors or ARBs.", ["34516361"]),
        ("Routine combination therapy of an ACE inhibitor with an ARB or direct renin inhibitor is strictly contraindicated due to elevated risks of hyperkalemia, syncope, and acute kidney injury without cardiovascular benefit (ONTARGET and ALTITUDE trials).", ["18378520"]),
        ("Modern gastrointestinal potassium binders (patiromer, sodium zirconium cyclosilicate) enable continuation and optimization of guideline-directed RAAS inhibitors in heart failure and CKD patients with recurrent hyperkalemia.", ["35391740"])
    ],
    [
        ("34516361", "KDIGO 2021 Clinical Practice Guideline for the Management of Blood Pressure in Chronic Kidney Disease.", 2021, "guideline"),
        ("18378520", "Telmisartan, ramipril, or both in patients at high risk for vascular events (ONTARGET).", 2008, "trial"),
        ("35391740", "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure.", 2022, "guideline")
    ],
    ["Thresholds for withholding RAAS inhibitors during acute intercurrent dehydrating illnesses ('sick day guidance') vs risks of post-discharge clinical inertia.", "Sequencing and safe titration of ARNI (sacubitril/valsartan) with mandatory 36-hour washout period after ACE inhibitor to prevent angioedema."],
    ["Acceptable creatinine rise threshold: up to 30% rise above baseline is expected (due to efferent arteriolar vasodilation reducing intraglomerular pressure); withhold only if rise exceeds 30% or potassium exceeds 5.5-6.0 mmol/L.", "Why dual RAAS blockade failed: ONTARGET proved adding an ARB to an ACEi caused more dialysis, hypotension, and hyperkalemia without reducing cardiovascular deaths.", "The 36-hour washout rule: transitioning from an ACEi to ARNI (sacubitril/valsartan) mandates a 36-hour washout to prevent life-threatening bradykinin-mediated angioedema."],
    ["A 63-year-old diabetic whose creatinine rises from 1.4 to 1.7 mg/dL (21% rise) 10 days after starting lisinopril 10 mg; lisinopril is safely continued.", "A patient with HFrEF whose potassium rises to 5.4 mmol/L on optimal sacubitril/valsartan, managed with dietary restriction and low-dose patiromer to maintain cardioprotection."]
)

# 10: Achalasia endoscopic and surgical therapy
BATCH_1[10] = make_entry(
    'achalasia_management',
    "Achalasia is a primary esophageal motility disorder characterized by incomplete lower esophageal sphincter (LES) relaxation and absent esophageal peristalsis due to autoimmune loss of inhibitory nitric oxide/VIP-producing ganglion cells in the myenteric (Auerbach) plexus. Diagnosis is confirmed by High-Resolution Manometry (HRM) according to the Chicago Classification v4.0, defining three subtypes based on panesophageal pressurization: Type I (classic, no pressurization), Type II (panesophageal pressurization; highest therapeutic success > 90%), and Type III (spastic, premature contractions). Definitive treatment aims to mechanically disrupt the LES and encompasses Per-Oral Endoscopic Myotomy (POEM), Laparoscopic Heller Myotomy with partial fundoplication (LHM), and Graded Pneumatic Dilation (PD; serial 30, 35, 40 mm balloons). POEM provides superior dysphagia relief for Type III spastic achalasia and comparable long-term success to LHM for Types I and II, but carries higher rates of post-procedure gastroesophageal reflux disease (GERD) requiring daily proton pump inhibitor therapy.",
    [
        ("High-Resolution Manometry (Chicago Classification) is the gold standard diagnostic tool, classifying achalasia into Type I (classic), Type II (panesophageal pressurization), and Type III (spastic).", ["31504429"]),
        ("POEM achieves excellent dysphagia relief (> 90%) across all subtypes and is the treatment of choice for Type III (spastic) achalasia due to the ability to perform a long proximal esophageal myotomy.", ["31504429"]),
        ("Laparoscopic Heller Myotomy combined with partial fundoplication (Dor or Toupet) provides durable 5-10 year clinical success with lower rates of post-procedure reflux compared to POEM.", ["21561502"]),
        ("Pneumatic dilation with graded balloon sizes (30, 35, 40 mm) achieves success comparable to myotomy in older adults with Type II achalasia, but carries a 1-3% perforation risk requiring emergency surgical backup.", ["21561502"])
    ],
    [
        ("31504429", "ACG Clinical Guideline: Diagnosis and Management of Achalasia.", 2020, "guideline"),
        ("21561502", "Pneumatic dilation versus laparoscopic Heller's myotomy for idiopathic achalasia (European Achalasia Trial).", 2011, "trial")
    ],
    ["Management of post-POEM GERD: surveillance endoscopy and endoluminal anti-reflux procedures (transoral incisionless fundoplication [TIF]).", "Endoscopic botulinum toxin injection role: strictly reserved for frail elderly patients unfit for pneumatic dilation or surgical myotomy due to high recurrence rates within 6-12 months."],
    ["Chicago Classification subtype responsiveness: Type II (best prognosis, > 95% response to any modality); Type III (worst to PD/Heller, best treated with POEM); Type I (intermediate).", "Post-POEM reflux incidence: occurs in 30-40% of POEM patients (because no fundoplication is constructed), necessitating long-term PPI or objective pH monitoring.", "Classic radiographic finding: 'Bird's beak' tapering of distal esophagus on timed barium esophagram with dilated aperistaltic proximal esophagus."],
    ["A 34-year-old male with dysphagia to both solids and liquids and regurgitation whose manometry shows IRP 28 mmHg with panesophageal pressurization (Type II achalasia).", "A 52-year-old female with severe retrosternal chest pain and Type III spastic achalasia undergoing successful POEM with a 9 cm esophageal myotomy."]
)

# 11: ACLS algorithms
BATCH_1[11] = make_entry(
    'acls_resuscitation_algorithms',
    "Advanced Cardiovascular Life Support (ACLS) guidelines from the AHA and ERC structure adult cardiac arrest resuscitation around rapid rhythm identification, high-quality cardiopulmonary resuscitation (CPR), and prompt defibrillation for shockable rhythms. Shockable rhythms (Ventricular Fibrillation [VF] and Pulseless Ventricular Tachycardia [pVT]) mandate immediate unsynchronized defibrillation (120-200 J biphasic), resumption of CPR for 2 minutes, and IV/IO epinephrine 1 mg administered after the second shock, alternating with amiodarone (300 mg first dose, 150 mg second dose) or lidocaine (1-1.5 mg/kg first dose, 0.5-0.75 mg/kg second dose) after the third shock (ALPS trial). Non-shockable rhythms (Asystole and Pulseless Electrical Activity [PEA]) require immediate epinephrine 1 mg as early as possible and urgent investigation of reversible etiologies using the 'H's and T's' framework (Hypovolemia, Hypoxia, Hydrogen ion acidosis, Hypo/hyperkalemia, Hypothermia, Tension pneumothorax, Tamponade, Toxins, Thrombosis PE/coronary).",
    [
        ("AHA/ERC guidelines mandate high-quality CPR: chest compression rate 100-120/min, depth 5-6 cm (2-2.4 inches), complete chest recoil, and minimizing interruptions (chest compression fraction > 60-80%).", ["33081529"]),
        ("In shockable rhythms (VF/pVT), amiodarone (300 mg initial, 150 mg second dose) and lidocaine (1-1.5 mg/kg initial) achieve equivalent survival-to-hospital-discharge rates in refractory cardiac arrest (ALPS trial).", ["27043947"]),
        ("In non-shockable rhythms (asystole/PEA), early administration of epinephrine 1 mg IV/IO within 5 minutes of arrest significantly increases return of spontaneous circulation (ROSC) and survival.", ["33081529"]),
        ("Targeted Temperature Management (TTM) in comatose post-cardiac arrest patients targeting strict normothermia (36-37.5 C) to actively prevent fever is non-inferior to 33 C hypothermia in survival and functional recovery (TTM-2 trial).", ["34133854"])
    ],
    [
        ("33081529", "2020 American Heart Association Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care.", 2020, "guideline"),
        ("27043947", "Amiodarone, Lidocaine, or Placebo in Out-of-Hospital Cardiac Arrest (ALPS trial).", 2016, "trial"),
        ("34133854", "Hypothermia versus Normothermia after Out-of-Hospital Cardiac Arrest (TTM-2 trial).", 2021, "trial")
    ],
    ["Utility of double sequential external defibrillation (DSED) and vector change (VC) defibrillation in refractory ventricular fibrillation (DOSE VF trial).", "Role of point-of-care ultrasound (POCUS) during pulse checks to differentiate true PEA from pseudo-PEA without interrupting compressions."],
    ["Epinephrine timing divergence: Shockable (give after the 2nd shock has failed); Non-shockable (give immediately as soon as IV/IO access is established).", "End-tidal CO2 (ETCO2) monitoring: ETCO2 < 10 mmHg after 20 minutes of high-quality CPR suggests very low probability of ROSC; abrupt sustained rise to 35-40 mmHg is an early indicator of ROSC.", "ALPS trial conclusion: both amiodarone and lidocaine are equivalent first-line antiarrhythmic choices for refractory VF/pVT."],
    ["A 58-year-old male with witnessed ventricular fibrillation receiving 200 J biphasic shock, 2 minutes CPR, second shock, epinephrine 1 mg, and 300 mg IV amiodarone.", "A 71-year-old with PEA arrest whose bedside POCUS reveals massive right ventricular dilation and D-shaped septum, treated empirically for pulmonary embolism."]
)

# 12 & 13: Acromegaly
e12_13 = make_entry(
    'acromegaly_management',
    "Acromegaly is a chronic systemic endocrine disease caused by excessive growth hormone (GH) secretion, in > 98% from a benign pituitary somatotroph adenoma. Elevated serum Insulin-like Growth Factor 1 (IGF-1) is the screening test of choice. Confirmation requires an Oral Glucose Tolerance Test (OGTT; 75 g oral glucose), where failure to suppress nadir GH < 1.0 ug/L (or < 0.4 ug/L with ultrasensitive assays) confirms autonomous GH hypersecretion. Transsphenoidal pituitary adenomectomy is the first-line definitive therapy, achieving biochemical cure in > 70-85% of microadenomas and 40-50% of macroadenomas. For persistent or recurrent disease, first-line medical therapy is first-generation long-acting Somatostatin Receptor Ligands (SRLs: octreotide LAR, lanreotide autogel; targeting SSTR2). Second-line therapies for SRL-resistant disease include the growth hormone receptor antagonist pegvisomant (normalizes IGF-1 in > 90% without lowering GH), pasireotide LAR (multi-receptor SRL targeting SSTR5; carries high hyperglycemia risk), or cabergoline (dopamine agonist for modest IGF-1 elevation).",
    [
        ("Endocrine Society guidelines establish serum IGF-1 as the initial diagnostic test of choice; confirmation requires lack of GH suppression (< 1.0 ug/L or < 0.4 ug/L) during a 75 g oral glucose tolerance test.", ["25405383"]),
        ("Transsphenoidal surgery is the primary definitive treatment of choice, performed by an expert neurosurgeon to achieve rapid decompression of visual pathways and biochemical cure.", ["25405383"]),
        ("First-generation somatostatin receptor ligands (octreotide LAR, lanreotide) normalize IGF-1 and control tumor volume in ~40-50% of surgical non-cured patients by targeting SSTR2.", ["25405383"]),
        ("Pegvisomant, a recombinant GH receptor antagonist, normalizes serum IGF-1 in > 90% of patients refractory to somatostatin analogues by blocking peripheral GH action without shrinking pituitary tumors.", ["25405383"])
    ],
    [
        ("25405383", "Acromegaly: An Endocrine Society Clinical Practice Guideline.", 2014, "guideline"),
        ("31504429", "AACE and ACE consensus guidelines for the management of acromegaly.", 2018, "guideline")
    ],
    ["Monitoring tumor volume with serial pituitary MRI in patients treated with pegvisomant monotherapy (which blocks peripheral IGF-1 without pituitary antiproliferative effects).", "Management of treatment-emergent hyperglycemia and diabetes in patients receiving pasireotide LAR."],
    ["Diagnostic algorithm: Elevated age- and sex-adjusted IGF-1 -> Confirm with 75 g OGTT (failure of GH to suppress to < 1.0 ug/L) -> Pituitary MRI with gadolinium.", "Biochemical targets of cure: Normal age-adjusted serum IGF-1 AND random GH < 1.0 ug/L (or post-OGTT GH < 0.4 ug/L).", "Pegvisomant monitoring pearl: serum GH levels rise paradoxically due to loss of negative feedback; disease activity MUST be monitored exclusively using serum IGF-1 and liver transaminases."],
    ["A 42-year-old male with coarse facial features, increasing shoe size, and carpal tunnel syndrome found to have IGF-1 680 ng/mL and non-suppressed GH 4.2 ug/L during OGTT.", "A patient with residual macroadenoma after transsphenoidal surgery on lanreotide who achieves complete IGF-1 normalization following the addition of pegvisomant."]
)
BATCH_1[12] = e12_13
BATCH_1[13] = e12_13

# 14: ACS management
BATCH_1[14] = make_entry(
    'acute_coronary_syndromes',
    "Acute Coronary Syndrome (ACS) encompasses ST-Elevation Myocardial Infarction (STEMI), Non-ST-Elevation Myocardial Infarction (NSTEMI), and Unstable Angina (UA), defined by myocardial ischemia with or without high-sensitivity cardiac troponin (hs-cTn) elevation. STEMI mandates immediate primary percutaneous coronary intervention (PCI) with door-to-balloon time < 90 minutes (or fibrinolysis within 120 minutes if PCI is unavailable). NSTEMI requires validated risk stratification (GRACE score > 140) to direct early invasive coronary angiography (< 24 hours). ESC and AHA/ACC guidelines mandate dual antiplatelet therapy (DAPT) combining aspirin with a potent P2Y12 inhibitor (ticagrelor 90 mg BID or prasugrel 10 mg daily in PCI) over clopidogrel (PLATO and TRITON-TIMI 38 trials), anticoagulation with unfractionated heparin, bivalirudin, or enoxaparin, high-intensity statin therapy (atorvastatin 80 mg), beta-blockers in reduced LVEF, and early ACE inhibitors.",
    [
        ("STEMI mandates emergency primary PCI with target door-to-balloon time < 90 minutes, or fibrinolytic therapy within 10 minutes of ECG if primary PCI transfer time exceeds 120 minutes.", ["37622654"]),
        ("In NSTEMI, an early invasive coronary angiographic strategy (< 24 hours) is recommended for high-risk patients (GRACE score > 140, dynamic ST changes, elevated troponins) to reduce recurrent ischemia and hospitalizations.", ["37622654"]),
        ("Potent P2Y12 inhibitors (prasugrel or ticagrelor) are superior to clopidogrel in ACS, significantly reducing ischemic death and stent thrombosis (TRITON-TIMI 38 and PLATO trials).", ["17982182", "19717846"]),
        ("Prasugrel demonstrated superior reduction in ischemic events without increased bleeding compared to ticagrelor in invasive ACS in the randomized ISAR-REACT 5 trial.", ["31475799"])
    ],
    [
        ("37622654", "2023 ESC Guidelines for the management of acute coronary syndromes.", 2023, "guideline"),
        ("17982182", "Prasugrel versus clopidogrel in patients with acute coronary syndromes (TRITON-TIMI 38).", 2007, "trial"),
        ("19717846", "Ticagrelor versus clopidogrel in patients with acute coronary syndromes (PLATO).", 2009, "trial"),
        ("31475799", "Ticagrelor or Prasugrel in Patients with Acute Coronary Syndromes (ISAR-REACT 5).", 2019, "trial")
    ],
    ["Optimal timing of DAPT de-escalation (e.g. dropping aspirin to P2Y12 monotherapy after 1-3 months in high-bleeding-risk patients).", "Role of routine beta-blocker therapy beyond 1 year in post-MI patients with preserved left ventricular ejection fraction (REDUCE-AMI trial)."],
    ["Prasugrel contraindications: prior stroke or TIA (absolute contraindication; increased intracranial hemorrhage), age >= 75 years, or weight < 60 kg (requires dose reduction to 5 mg).", "Radial vs Femoral access: radial artery vascular access reduces all-cause mortality, major bleeding, and vascular access complications (RIVAL and MATRIX trials).", "High-intensity statin initiation: atorvastatin 80 mg or rosuvastatin 40 mg should be initiated immediately prior to hospital discharge regardless of baseline LDL."],
    ["A 56-year-old male presenting with crushing chest pain, 3 mm ST elevations in V1-V4, undergoing emergent radial primary PCI of proximal LAD with prasugrel and aspirin.", "A 68-year-old female with NSTEMI, troponin 450 ng/L, GRACE score 155, scheduled for invasive angiography within 24 hours on ticagrelor and enoxaparin."]
)

# 15: Active tuberculosis
BATCH_1[15] = make_entry(
    'active_tuberculosis',
    "Active pulmonary tuberculosis (TB) is caused by Mycobacterium tuberculosis, presenting with chronic cough, hemoptysis, fevers, drenching night sweats, weight loss, and upper lobe cavitary or nodular infiltrates on chest radiography. Diagnosis is confirmed via rapid molecular testing (Xpert MTB/RIF assay on sputum), sputum acid-fast bacilli (AFB) smear, and mycobacterial culture. Standard first-line therapy for drug-susceptible TB consists of a 6-month regimen: a 2-month intensive phase with 4 drugs (Rifampin [RIF], Isoniazid [INH], Pyrazinamide [PZA], and Ethambutol [EMB] - 'RIPE'), followed by a 4-month continuation phase with Rifampin and Isoniazid (2RH). Pyridoxine (vitamin B6; 25-50 mg daily) must be co-administered with isoniazid to prevent dose-dependent peripheral neuropathy. Baseline visual acuity and red-green color discrimination must be verified before starting ethambutol to detect optic neuritis; baseline and serial hepatic transaminases must be monitored for drug-induced liver injury (PZA > INH > RIF).",
    [
        ("ATS/CDC/IDSA guidelines recommend a 6-month regimen for drug-susceptible pulmonary TB: 2 months of daily RIPE (rifampin, isoniazid, pyrazinamide, ethambutol) followed by 4 months of daily RH (rifampin, isoniazid).", ["27566278"]),
        ("Rapid molecular testing (Xpert MTB/RIF) achieves sensitivity > 90% and simultaneously detects rpoB gene mutations conferring rifampin resistance within 2 hours.", ["27566278"]),
        ("Pyridoxine (vitamin B6, 25-50 mg daily) must be co-prescribed with isoniazid to prevent sensory peripheral neuropathy, particularly in diabetics, alcoholics, pregnant women, and malnourished patients.", ["27566278"]),
        ("Drug-induced liver injury (DILI) rules: discontinue all hepatotoxic drugs (PZA, INH, RIF) if transaminases rise >= 3x upper limit of normal with jaundice/nausea, or >= 5x ULN in asymptomatic patients.", ["27566278"])
    ],
    [
        ("27566278", "Official American Thoracic Society/Centers for Disease Control and Prevention/Infectious Diseases Society of America Clinical Practice Guidelines: Treatment of Drug-Susceptible Tuberculosis.", 2016, "guideline"),
        ("33951366", "Four-Month Rifapentine-Regimens with or without Moxifloxacin for Tuberculosis (TBTC Study 31/A5349).", 2021, "trial")
    ],
    ["Adoption of 4-month rifapentine-moxifloxacin regimens (TBTC Study 31) for drug-susceptible pulmonary TB in non-pregnant individuals aged >= 12 years.", "Management of drug-drug interactions between rifamycins (potent CYP3A4 inducers) and direct oral anticoagulants or antiretroviral therapies."],
    ["Adverse effect monitoring: Ethambutol = retrobulbar optic neuritis (check visual acuity and Ishihara red-green color plates; discontinue if vision deteriorates); Pyrazinamide = hyperuricemia and acute gout; Isoniazid = peripheral neuropathy (prevent with vitamin B6).", "DILI re-challenge protocol: once transaminases drop < 2x ULN, reintroduce drugs sequentially: Rifampin first, then Isoniazid, reserving Pyrazinamide last (or dropping PZA and extending continuation phase).", "Airborne isolation: negative-pressure isolation room until patient is clinically improving on effective therapy and has 3 consecutive negative sputum AFB smears."],
    ["A 31-year-old immigrant presenting with 6 weeks of productive cough, night sweats, and right upper lobe cavitation, confirmed MTB positive and rifampin sensitive on Xpert.", "A patient on RIPE therapy presenting at week 3 with dark urine, jaundice, AST 380 U/L, and ALT 440 U/L, requiring immediate cessation of hepatotoxic agents."]
)
