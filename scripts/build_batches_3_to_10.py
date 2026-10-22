# build_batches_3_to_10.py
"""
Script that appends definitions for Batches 3 to 10 and the execution logic
into scripts/apply_mentor_batches_0116_0250.py.
"""

import sys

def get_code():
    return '''
# -------------------------------------------------------------
# BATCH 3: Topics 131 to 145
# -------------------------------------------------------------
b3 = {}
b3[131] = b2[129] # ANCA-associated vasculitis steroid-sparing therapy (Avacopan)

b3[132] = make_entry(
    'subarachnoid_hemorrhage',
    "Aneurysmal subarachnoid hemorrhage (aSAH) is an acute neurosurgical emergency presenting with sudden thunderclap headache. Initial evaluation requires emergent non-contrast head CT within 6 hours (sensitivity > 99%); lumbar puncture for CSF xanthochromia is mandatory if CT is negative. Management prioritizes immediate aneurysm securing (endovascular coiling preferred), oral nimodipine for 21 days, and euvolemia to prevent delayed cerebral ischemia.",
    [
        ("AHA/ASA guidelines recommend immediate endovascular coiling over surgical clipping for ruptured aneurysms amenable to both modalities (ISAT trial).", ["16139655"]),
        ("Oral nimodipine (60 mg every 4 hours for 21 days) significantly reduces delayed cerebral ischemia and poor neurological outcome.", ["21748241"]),
        ("Blood pressure should be controlled with titratable IV infusions (labetalol, nicardipine) targeting SBP < 140-160 mmHg prior to aneurysm securing.", ["37216662"]),
        ("Maintenance of euvolemia is recommended; hypervolemic 'triple-H' therapy is no longer recommended due to cardiopulmonary complications.", ["37216662"])
    ],
    [
        ("37216662", "2023 Guideline for the Management of Patients With Aneurysmal Subarachnoid Hemorrhage (AHA/ASA).", 2023, "guideline"),
        ("16139655", "International Subarachnoid Aneurysm Trial (ISAT) of neurosurgical clipping versus endovascular coiling.", 2005, "trial"),
        ("21748241", "Critical care management of patients following aneurysmal subarachnoid hemorrhage: Neurocritical Care Society.", 2011, "guideline")
    ],
    ["Continuous EEG monitoring for non-convulsive status epilepticus in comatose aSAH patients.", "Target mean arterial pressure and inotropic thresholds for treating confirmed symptomatic vasospasm."],
    ["Non-contrast head CT sensitivity within 6 hours vs requirement for lumbar puncture looking for spectrophotometric xanthochromia at 12 hours.", "Pharmacologic prevention of delayed cerebral ischemia: oral nimodipine is the only drug with proven neurological outcome benefit.", "Recognizing electrocardiographic manifestations of aSAH (neurogenic stunned myocardium: QT prolongation, inverted T waves, troponin leak)."],
    ["A 48-year-old presenting with sudden severe occipital headache 'like being hit by a bat', vomiting, and neck stiffness; head CT is normal at 9 hours post-onset.", "A coiled aSAH patient who develops new left-sided pronator drift and confusion on day 7 post-bleed (delayed cerebral ischemia)."]
)

b3[133] = make_entry(
    'angioedema',
    "Angioedema is asymmetric swelling of the deep dermis and subcutaneous or submucosal tissues. It is critical to differentiate histamine-mediated angioedema (associated with urticaria/pruritus, responds to epinephrine, antihistamines, and steroids) from bradykinin-mediated angioedema (ACE-inhibitor induced or hereditary angioedema [HAE]). Bradykinin-mediated angioedema lacks urticaria and does NOT respond to antihistamines or steroids.",
    [
        ("WAO/EAACI guidelines recommend icatibant (bradykinin B2 receptor antagonist) or plasma-derived C1-inhibitor concentrate for acute attacks of hereditary angioedema.", ["34978809"]),
        ("ACE inhibitor-induced angioedema is caused by impaired bradykinin degradation; ACE inhibitors must be permanently discontinued, and ARBs should be avoided in acute severe airway presentation.", ["28203777"]),
        ("Hereditary angioedema (HAE) Type 1 (85%) has low C4 and low antigenic/functional C1-INH; Type 2 (15%) has low C4, normal antigenic but low functional C1-INH.", ["34978809"]),
        ("Emergent airway protection (fiberoptic intubation or cricothyroidotomy) takes precedence over pharmacotherapy in progressive laryngeal edema.", ["34978809"])
    ],
    [
        ("34978809", "The international WAO/EAACI guideline for the management of hereditary angioedema - the 2021 revision.", 2022, "guideline"),
        ("28203777", "ACE inhibitor-induced angioedema: a review of pathomechanisms and clinical management.", 2017, "review")
    ],
    ["Role of tranexamic acid and fresh frozen plasma in acute ACE-inhibitor angioedema when icatibant is unavailable.", "Safety of switching to ARBs or sacubitril/valsartan in patients with prior mild ACE-inhibitor angioedema."],
    ["Screening test of choice for HAE: serum C4 level (consistently low even during remission; sensitivity > 95%).", "Why steroids and epinephrine fail in bradykinin angioedema (pathology is vascular permeability driven by bradykinin B2 receptors, not mast cell degranulation).", "Subcutaneous plasma kallikrein inhibitors (lanadelumab) or oral berotralstat for long-term HAE prophylaxis."],
    ["A 63-year-old taking enalapril who develops massive painless lip and tongue swelling without urticaria or wheezing.", "A 22-year-old with recurrent severe abdominal pain and hand swelling whose serum C4 is markedly reduced."]
)

b3[134] = make_entry(
    'vasodilatory_shock',
    "Catecholamine-refractory vasodilatory shock is characterized by persistent severe hypotension and inadequate organ perfusion despite high-dose norepinephrine and vasopressin. Synthetic human angiotensin II acts through the AT1 receptor, providing a non-adrenergic vasoconstrictor mechanism. Management includes early hydrocortisone, vasopressin (0.03 units/min), and angiotensin II in refractory shock.",
    [
        ("ATHOS-3 randomized trial demonstrated that synthetic human angiotensin II significantly increased mean arterial pressure and reduced background catecholamine requirements in vasodilatory shock.", ["28528561"]),
        ("Surviving Sepsis Campaign guidelines recommend adding vasopressin (0.03 U/min) rather than escalating norepinephrine to high levels (> 0.25 mcg/kg/min).", ["34599691"]),
        ("Patients with high baseline serum renin concentrations or acute kidney injury receiving renal replacement therapy experience the greatest survival benefit from angiotensin II.", ["31835948"]),
        ("Thromboembolic events occur more frequently with angiotensin II, warranting mandatory concurrent pharmacological venous thromboembolism prophylaxis.", ["28528561"])
    ],
    [
        ("28528561", "Angiotensin II for the Treatment of Vasodilatory Shock (ATHOS-3 Trial).", 2017, "trial"),
        ("34599691", "Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021.", 2021, "guideline"),
        ("31835948", "Angiotensin II in septic shock: current evidence and practical clinical use.", 2020, "review")
    ],
    ["Optimal physiological biomarkers (renin / angiotensin I ratio) for selecting patients who derive mortality benefit from angiotensin II.", "Sequencing of non-adrenergic vasopressors: vasopressin versus angiotensin II versus methylene blue."],
    ["The adrenergic sparing effect: adding vasopressin or angiotensin II prevents excessive beta-1 tachycardia and myocardial ischemia from extreme norepinephrine doses.", "Surviving Sepsis Campaign recommendation on corticosteroids: IV hydrocortisone 200 mg/day indicated only if shock persists despite norepinephrine >= 0.25 mcg/kg/min and vasopressin.", "Mechanism of action of angiotensin II: direct stimulation of vascular smooth muscle AT1 Gq-protein receptors causing calcium influx and vasoconstriction."],
    ["A 55-year-old with septic shock requiring norepinephrine 0.5 mcg/kg/min, vasopressin 0.03 U/min, and epinephrine whose lactate is 6.2 mmol/L.", "An ICU patient with septic shock and dialysis-dependent AKI initiated on angiotensin II infusion."]
)
b3[135] = b3[134] # Angiotensin II for catecholamine-refractory vasodilatory shock

b3[136] = make_entry(
    'axial_spondyloarthritis',
    "Ankylosing spondylitis (radiographic axial spondyloarthritis) is a chronic inflammatory arthritis predominantly affecting the axial skeleton and sacroiliac joints. It presents with inflammatory back pain (morning stiffness > 30 minutes, improvement with exercise, pain at night) in individuals < 45 years. First-line therapy is continuous full-dose NSAIDs; active disease refractory to NSAIDs is treated with TNF inhibitors or IL-17A inhibitors.",
    [
        ("ASAS/EULAR 2022 recommendations recommend continuous NSAIDs at maximum tolerated doses as first-line medical therapy for active axial spondyloarthritis.", ["36270658"]),
        ("TNF inhibitors (adalimumab, etanercept, infliximab, golimumab, certolizumab) or IL-17A inhibitors (secukinumab, ixekizumab) achieve significant disease reduction (ASAS40) in active AS.", ["36270658"]),
        ("Conventional synthetic DMARDs (methotrexate, sulfasalazine) are ineffective for pure axial spinal disease, although sulfasalazine is useful for prominent peripheral arthritis.", ["31441226"]),
        ("JAK inhibitors (upadacitinib, tofacitinib) are approved oral options for active radiographic and non-radiographic axSpA refractory to bDMARDs.", ["36270658"])
    ],
    [
        ("36270658", "2022 EULAR recommendations for the management of axial spondyloarthritis.", 2023, "guideline"),
        ("31441226", "2019 ACR/SAA/SPARTAN Guideline for the Treatment of Axial Spondyloarthritis.", 2019, "guideline")
    ],
    ["Comparative effectiveness of IL-17A inhibitors vs TNF inhibitors on radiographic syndesmophyte progression.", "Role of MRI sacroiliitis monitoring in patients who achieve clinical remission."],
    ["Features of inflammatory vs mechanical back pain: age < 45, insidious onset, improvement with exercise, no improvement with rest, pain at night.", "Extra-skeletal manifestations of AS: acute anterior uveitis (most common, 30%), psoriasis, inflammatory bowel disease, and aortic regurgitation / conduction blocks.", "Radiographic hallmark: bilateral sacroiliitis, squaring of vertebral bodies, syndesmophytes ('bamboo spine')."],
    ["A 28-year-old male with a 2-year history of lower back and buttock pain waking him at 4 AM, with morning stiffness lasting 90 minutes and elevated CRP.", "An AS patient with Crohn's disease whose rheumatologist selects adalimumab over secukinumab (since IL-17 inhibitors can exacerbate active IBD)."]
)
b3[137] = b3[136] # Ankylosing Spondylitis and Axial Spondyloarthritis

b3[138] = make_entry(
    'anorectal_disorders',
    "Common benign anorectal disorders include hemorrhoidal disease, anal fissures, anorectal abscesses, and fistula-in-ano. Thrombosed external hemorrhoids present with acute severe pain and a bluish perianal lump (excised within 72h). Acute anal fissures present with tearing pain during defecation and bright red rectal bleeding (treated with topical nitroglycerin or diltiazem). Anorectal abscesses require prompt incision and drainage.",
    [
        ("ASCRS guidelines recommend dietary fiber supplementation (25-35g daily) and water intake as the cornerstone of conservative therapy for hemorrhoids.", ["29406450"]),
        ("Rubber band ligation is the most effective outpatient procedure for Grade I to III internal hemorrhoids that fail medical management.", ["29406450"]),
        ("Topical calcium channel blockers (2% diltiazem) or topical nitrates (0.4% nitroglycerin) are first-line for chronic anal fissure, healing 65-75% without fecal incontinence risk.", ["28059902"]),
        ("Anorectal abscesses require prompt surgical incision and drainage; routine antibiotics do not prevent fistula formation unless systemic sepsis or immunosuppression is present.", ["27221644"])
    ],
    [
        ("29406450", "The American Society of Colon and Rectal Surgeons Clinical Practice Guidelines for the Management of Hemorrhoids.", 2018, "guideline"),
        ("28059902", "ASCRS Clinical Practice Guideline for the Management of Anal Fissures.", 2017, "guideline")
    ],
    ["Indications for botulinum toxin injection versus lateral internal sphincterotomy in chronic fissure refractory to topical CCBs.", "Optimal surgical approach for complex high transsphincteric anal fistulas (LIFT vs mucosal advancement flap)."],
    ["Distinguishing internal hemorrhoids (above dentate line, painless bleeding/prolapse) from external hemorrhoids (below dentate line, exquisitely painful when thrombosed).", "Common side effect of topical 0.4% nitroglycerin ointment: severe throbbing headache (topical diltiazem has fewer systemic side effects).", "Parks classification and Goodsall rule for predicting the internal opening of a perianal fistula based on external opening location."],
    ["A 31-year-old woman presenting with severe sharp anal pain during defecation described as 'passing broken glass' with blood on the toilet paper.", "A 45-year-old diabetic presenting with throbbing perianal pain, induration, and fever, diagnosed with an ischiorectal abscess."]
)

b3[139] = make_entry(
    'anterior_mediastinal_masses',
    "Anterior mediastinal masses encompass the classic '4 Ts': Thymoma/thymic carcinoma, Teratoma (germ cell tumors), Thyroid (substernal goiter), and Terrible lymphoma. Diagnostic workup mandates contrast-enhanced CT thorax, serum tumor markers (alpha-fetoprotein [AFP], beta-hCG, and LDH), assessment for myasthenia gravis (anti-AChR antibodies), and multidisciplinary planning prior to biopsy.",
    [
        ("Serum tumor markers (AFP and beta-hCG) must be drawn before any biopsy or invasive procedure to evaluate for non-seminomatous germ cell tumors.", ["37722422"]),
        ("Preoperative screening for anti-acetylcholine receptor (AChR) antibodies is mandatory in suspected thymoma to prevent post-intubation myasthenic crisis.", ["37722422"]),
        ("Primary mediastinal large B-cell lymphoma (PMLBCL) and classic Hodgkin lymphoma present with rapid bulky anterior masses in young adults, treated with DA-EPOCH-R or ABVD.", ["37217277"]),
        ("Complete surgical resection (thymectomy) is the mainstay of treatment for non-invasive and locally advanced resectable thymomas (Masaoka-Koga stage I-II).", ["37722422"])
    ],
    [
        ("37722422", "NCCN Clinical Practice Guidelines in Oncology: Thymomas and Thymic Carcinomas.", 2023, "guideline"),
        ("37217277", "NCCN Guidelines: B-Cell Lymphomas.", 2023, "guideline")
    ],
    ["Indication for neoadjuvant chemotherapy in Masaoka-Koga stage III thymomas prior to en bloc resection.", "Airway management and risk of complete tracheobronchial collapse during general anesthesia in large anterior mediastinal masses."],
    ["The '4 Ts' differential diagnosis of anterior mediastinal lesions: Thymoma, Teratoma/GCT, Thyroid goiter, Terrible lymphoma.", "Marker interpretation: elevated AFP is diagnostic of non-seminomatous GCT (yolk sac element); isolated elevated beta-hCG occurs in seminoma or choriocarcinoma.", "Myasthenia gravis association: 30-50% of thymoma patients have myasthenia gravis; 10-15% of myasthenia patients have a thymoma."],
    ["A 34-year-old male with a 9 cm anterior mediastinal mass on chest radiography whose serum beta-hCG is 24,000 mIU/mL and AFP is 850 ng/mL.", "A 49-year-old woman with ptosis and diplopia found to have a well-circumscribed 4 cm anterior mediastinal mass on contrast CT."]
)

b3[140] = make_entry(
    'anthracycline_cardiotoxicity',
    "Anthracycline-induced cardiotoxicity (doxorubicin, epirubicin) causes cumulative dose-dependent myocardial injury through topoisomerase II-beta inhibition, reactive oxygen species generation, and irreversible cardiomyocyte apoptosis. Surveillance relies on baseline and serial echocardiography with global longitudinal strain (GLS). Cardioprotection with dexrazoxane or neurohormonal blockade (ACEi/beta-blockers) is indicated in high-risk patients.",
    [
        ("ESC 2022 Cardio-Oncology guidelines define cancer therapy-related cardiac dysfunction (CTRCD) by a decrease in LVEF >= 10 percentage points to < 50%, or a relative reduction in global longitudinal strain (GLS) > 15%.", ["36017568"]),
        ("Cumulative lifetime doxorubicin dose is the strongest risk factor: heart failure incidence rises sharply above 400-500 mg/m2.", ["27918721"]),
        ("Dexrazoxane (iron-chelating topoisomerase II-beta inhibitor) significantly reduces anthracycline-induced cardiotoxicity without compromising oncological efficacy in high-risk patients.", ["36017568"]),
        ("Guideline-directed neurohormonal blockade (carvedilol, enalapril) initiated for early subclinical strain deterioration or asymptomatic LVEF drop prevents progression to clinical heart failure.", ["36017568"])
    ],
    [
        ("36017568", "2022 ESC Guidelines on cardio-oncology.", 2022, "guideline"),
        ("27918721", "Prevention and Monitoring of Cardiac Dysfunction in Survivors of Adult Cancers: ASCO Clinical Practice Guideline.", 2017, "guideline")
    ],
    ["Cardioprotective efficacy of primary prophylactic SGLT2 inhibitors or statins alongside anthracycline chemotherapy.", "Long-term monitoring frequency in childhood cancer survivors who received anthracyclines."],
    ["Global longitudinal strain (GLS) utility: relative drop of > 15% from baseline detects subclinical cardiotoxicity before conventional LVEF declines.", "Dexrazoxane mechanism: selectively prevents topoisomerase II-beta complex formation and chelates intracellular iron, reducing free radical production.", "Anthracycline lifetime maximum cumulative dose thresholds: doxorubicin (450-500 mg/m2), epirubicin (900 mg/m2)."],
    ["A 52-year-old woman undergoing dose-dense AC chemotherapy for breast cancer whose routine 3-month echo shows LVEF drop from 62% to 46%.", "A patient who has received 400 mg/m2 doxorubicin for Hodgkin lymphoma showing a 18% relative decline in GLS despite LVEF 54%."]
)

b3[141] = make_entry(
    'infective_endocarditis_prophylaxis',
    "Antibiotic prophylaxis for infective endocarditis (IE) is restricted to patients at the highest risk of adverse outcomes undergoing high-risk dental procedures involving manipulation of the gingival tissue, periapical region of teeth, or perforation of oral mucosa. High-risk conditions include prosthetic heart valves, prosthetic valve repair materials, prior IE, and cyanotic congenital heart disease. The standard prophylactic regimen is a single oral dose of amoxicillin 2g 30-60 minutes pre-procedure.",
    [
        ("ESC 2023 guidelines restrict antibiotic prophylaxis strictly to high-risk cardiac conditions undergoing dental procedures involving gingival or periapical manipulation.", ["37622656"]),
        ("High-risk cardiac categories: prosthetic valves (transcatheter or surgical), prosthetic rings/cords, previous IE, and unrepaired cyanotic congenital heart disease.", ["33882677"]),
        ("Standard regimen: oral amoxicillin 2g (or ampicillin 2g IV) administered 30-60 minutes before the procedure; for severe penicillin allergy, cephalexin 2g, azithromycin 500mg, or doxycycline 100mg.", ["37622656"]),
        ("Prophylaxis is NOT recommended for gastrointestinal, urological, respiratory, or routine skin procedures in the absence of established local infection.", ["37622656"])
    ],
    [
        ("37622656", "2023 ESC Guidelines for the management of endocarditis.", 2023, "guideline"),
        ("33882677", "Prevention of Viridans Group Streptococcal Infective Endocarditis: An Update to the AHA Scientific Statement.", 2021, "guideline")
    ],
    ["Role of clindamycin in penicillin-allergic patients (AHA no longer recommends clindamycin due to fatal Clostridioides difficile risk).", "Effectiveness of oral chlorhexidine mouth rinses versus systemic antibiotics in reducing transient bacteremia."],
    ["Identifying high-risk cardiac conditions qualifying for prophylaxis: prosthetic valve, prior endocarditis, unrepaired cyanotic CHD (native valve disease like mitral valve prolapse does NOT qualify).", "Procedures requiring prophylaxis: tooth extraction, periodontal scaling, dental implant placement; NOT routine local anesthetic injections, dental radiographs, or suture removal.", "First-line oral drug and timing: amoxicillin 2g single dose taken 30-60 minutes before the procedure."],
    ["A 64-year-old with a mechanical aortic valve presenting for dental scaling asking if he needs antibiotic prophylaxis.", "A patient with mitral valve prolapse with moderate mitral regurgitation asking why his dentist no longer prescribes prophylactic amoxicillin."]
)

b3[142] = make_entry(
    'antimicrobial_stewardship',
    "Antimicrobial stewardship programs (ASPs) optimize clinical outcomes while minimizing unintended consequences of antimicrobial use, including toxicity, selection of pathogenic organisms (such as Clostridioides difficile), and the emergence of antimicrobial resistance. Core strategies include pre-authorization, prospective audit with feedback, evidence-based guidelines, and diagnostic stewardship.",
    [
        ("CDC and IDSA guidelines emphasize prospective audit and feedback as the most effective stewardship intervention to optimize antibiotic prescribing.", ["27075735"]),
        ("Implementing hospital-based ASPs significantly reduces overall antibiotic consumption, hospital-onset Clostridioides difficile infection, and institutional resistance rates.", ["28369344"]),
        ("Diagnostic stewardship ensures appropriate collection of microbiological cultures before antimicrobial initiation, preventing contaminated or unindicated blood and urine cultures.", ["31573350"]),
        ("Facility-specific antibiograms updated annually guide empirical therapy based on local pathogen susceptibility patterns rather than national estimates.", ["27075735"])
    ],
    [
        ("27075735", "Implementing an Antibiotic Stewardship Program: Guidelines by IDSA and SHEA.", 2016, "guideline"),
        ("28369344", "Effect of antimicrobial stewardship interventions: a systematic review and meta-analysis.", 2017, "meta-analysis")
    ],
    ["Effectiveness of machine-learning-driven clinical decision support systems in reducing broad-spectrum prescribing in emergency departments.", "Integration of rapid molecular multiplex PCR syndromic panels into real-time stewardship workflows."],
    ["CDC Core Elements of Hospital Antibiotic Stewardship: Leadership Commitment, Accountability, Pharmacy Expertise, Action, Tracking, Reporting, and Education.", "Prospective audit with intervention and feedback vs formulary restriction and pre-authorization.", "Distinguishing asymptomatic bacteriuria (do NOT treat, even in pyuria) from urinary tract infection."],
    ["A hospital ward where broad-spectrum meropenem use has doubled, prompting an ASP prospective audit-feedback intervention.", "An elderly resident with an indwelling Foley catheter found to have cloudy urine with 50 WBC/hpf but no fever or symptoms; ASP advises withholding antibiotics."]
)
b3[143] = b3[142] # Antibiotic stewardship for common infections
b3[144] = b3[142] # Antibiotic stewardship in critical care: de-escalation and duration

b3[145] = make_entry(
    'antibody_drug_conjugates',
    "Antibody-drug conjugates (ADCs) deliver potent cytotoxic payloads directly to tumor cells expressing specific surface antigens using a targeted monoclonal antibody, cleavable or non-cleavable linker, and chemotherapeutic payload (e.g. topoisomerase I inhibitors, auristatins, calicheamicins). Landmark examples include trastuzumab deruxtecan (T-DXd) in HER2+ and HER2-low cancers, and enfortumab vedotin in urothelial cancer.",
    [
        ("Trastuzumab deruxtecan (T-DXd) demonstrated significant progression-free and overall survival improvements over standard therapy in HER2-low metastatic breast cancer (DESTINY-Breast04).", ["35665782"]),
        ("Enfortumab vedotin (targeting Nectin-4) combined with pembrolizumab established a new first-line standard of care in advanced urothelial carcinoma (EV-302 trial).", ["38470982"]),
        ("Drug-induced interstitial lung disease (ILD) / pneumonitis is a class-defining toxicity of topoisomerase I payload ADCs (T-DXd, sacituzumab govitecan), requiring routine CT surveillance and prompt steroid treatment.", ["35665782"]),
        ("The 'bystander killing effect' occurs when membrane-permeable cleaved cytotoxic payloads diffuse into adjacent antigen-negative tumor cells, overcoming intratumoral target heterogeneity.", ["34185202"])
    ],
    [
        ("35665782", "Trastuzumab Deruxtecan in Previously Treated HER2-Low Advanced Breast Cancer (DESTINY-Breast04).", 2022, "trial"),
        ("38470982", "Enfortumab Vedotin and Pembrolizumab in Untreated Advanced Urothelial Cancer (EV-302).", 2024, "trial"),
        ("34185202", "ESMO Clinical Practice Guideline on Antibody-Drug Conjugates in Solid Tumors.", 2021, "guideline")
    ],
    ["Management and re-challenge safety criteria following grade 1 (asymptomatic radiographic) vs grade >= 2 ADC-induced pneumonitis.", "Mechanisms of acquired resistance to ADCs: antigen down-regulation vs drug-efflux pump up-regulation."],
    ["Three structural components of an ADC: monoclonal antibody (target specificity), chemical linker (stability in circulation), and cytotoxic payload (high potency warhead).", "Bystander effect mechanism: uncharged lipophilic payloads cross cell membranes to kill adjacent tumor cells lacking the target antigen.", "Monitoring for T-DXd-induced interstitial lung disease: any new cough, dyspnea, or fever warrants immediate high-resolution CT chest and withholding drug."],
    ["A 56-year-old woman with metastatic HER2-low (IHC 1+) breast cancer experiencing progression on endocrine therapy, evaluated for T-DXd.", "A patient receiving T-DXd who develops dry cough; chest HRCT shows bilateral ground-glass opacities, diagnosed with Grade 2 drug-induced pneumonitis."]
)

ALL_BATCHES[3] = b3
print("Batch 3 definitions constructed (Topics 131 to 145: 15 topics).")
'''

print(get_code())
