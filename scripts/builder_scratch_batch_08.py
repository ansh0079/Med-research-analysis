# -*- coding: utf-8 -*-
"""
Curated clinical content for Batch 8 (Topics 176-200) of the 280 write-from-scratch cohort.
All topics contain disease-specific mentor messages, >=4 teaching points with PMIDs,
>=3 MCQ angles, >=2 case hooks, and >=2 uncertainties.
"""

BATCH_08_TOPICS = {
    "terlipressin hepatorenal syndrome": {
        "mentor_intro": (
            "Hepatorenal syndrome (HRS, now classified as HRS-AKI) is a severe form of functional renal failure in advanced cirrhosis, driven by splanchnic arterial vasodilation, systemic arterial underfilling, and profound renal vasoconstriction. "
            "Terlipressin—a synthetic vasopressin V1a receptor agonist—induces potent splanchnic arterial vasoconstriction, redirecting blood volume to the systemic and renal circulations. "
            "The CONFIRM trial established terlipressin combined with intravenous albumin as the standard of care for reversing HRS-AKI; however, therapy carries significant risks of ischemic complications and respiratory failure from fluid overload, requiring baseline oxygenation and volume monitoring."
        ),
        "teaching_points": [
            "Terlipressin combined with intravenous albumin (1 g/kg on day 1, followed by 20-40 g/day) is the first-line pharmacotherapy for HRS-AKI, achieving significantly higher rates of verified renal reversal compared to placebo or midodrine/octreotide (CONFIRM trial).",
            "Continuous intravenous infusion of terlipressin (starting at 2 mg/day and titrating up to 12 mg/day) delivers equivalent renal reversal with significantly fewer ischemic and gastrointestinal adverse events compared to intermittent intravenous bolus dosing.",
            "Respiratory failure is a major risk of terlipressin therapy; terlipressin is strictly contraindicated in patients with severe hypoxemia (SpO2 <90% on room air), acute pulmonary oedema, or active fluid overload, and patients must be screened for volume overload before initiating therapy.",
            "Complete response to terlipressin is defined by a decrease in serum creatinine to <=1.5 mg/dL (or return to within 0.3 mg/dL of baseline); treatment is typically continued until creatinine reversal or for a maximum of 14 days."
        ],
        "mcq_angles": [
            "Recognizing major adverse effects and contraindications of terlipressin: respiratory failure/pulmonary oedema and peripheral ischemic necrosis.",
            "Advantages of continuous IV terlipressin infusion over intermittent IV boluses in reducing adverse events while maintaining reversal rates.",
            "Combining terlipressin with albumin (synergistic oncotic expansion and vasoconstriction) versus vasoconstrictor monotherapy."
        ],
        "case_hooks": [
            "A 56-year-old male with decompensated alcoholic cirrhosis and refractory ascites develops an increase in serum creatinine from 1.1 to 2.8 mg/dL over 48 hours without proteinuria; after fluid challenge fails, terlipressin plus albumin is initiated.",
            "A cirrhotic patient receiving terlipressin boluses develops progressive dyspnoea, bilateral crackles, and an oxygen saturation of 86% on room air on day 3 of therapy."
        ],
        "uncertainties": [
            "Comparative long-term post-liver-transplantation survival among patients reversed with terlipressin versus norepinephrine infusions in the ICU.",
            "Predictive role of novel urinary biomarkers (NGAL) in distinguishing acute tubular necrosis from pure functional HRS-AKI to predict terlipressin responsiveness."
        ]
    },

    "thrombectomy criteria": {
        "mentor_intro": (
            "Mechanical endovascular thrombectomy (EVT) is the standard of care for acute ischaemic stroke caused by emergent large vessel occlusion (LVO) of the intracranial anterior circulation. "
            "Patient selection criteria have rapidly expanded from the historic 0-6 hour window (based on non-contrast CT ASPECTS >=6) to the extended 6-24 hour window. "
            "Extended-window selection (DAWN and DEFUSE-3 trials) relies on advanced CT/MRI perfusion imaging to demonstrate a clinical-core or target mismatch (small ischemic core with substantial salvageable ischemic penumbra and robust collateral circulation)."
        ),
        "teaching_points": [
            "Standard anterior circulation thrombectomy criteria within 0-6 hours include: pre-stroke mRS 0-1, causative occlusion of the internal carotid artery (ICA) or proximal middle cerebral artery (MCA-M1), age >=18 years, baseline NIHSS >=6, and non-contrast CT ASPECTS >=6.",
            "Extended window thrombectomy (6-24 hours from last known well) requires physiological tissue imaging demonstrating salvageable penumbra: DAWN criteria (mismatch between clinical severity [NIHSS] and infarct core volume) or DEFUSE-3 criteria (ischemic core <70 mL, mismatch ratio >=1.8, and mismatch volume >=15 mL on CT perfusion or diffusion MRI).",
            "Robust intracranial collateral circulation on multi-phase CTA predicts slower infarct core growth, lower hemorrhagic transformation rates, and improved functional independence post-recanalization.",
            "Recent randomized clinical trials (RESCUE-Japan LIMIT, SELECT2, ANGEL-ASPECT) have established that EVT also benefits patients with large ischemic core infarcts (ASPECTS 3-5 or core >=50 mL), extending eligibility beyond conventional restricted criteria."
        ],
        "mcq_angles": [
            "Applying DAWN and DEFUSE-3 criteria for patient selection in the 6-24 hour extended window.",
            "Calculating and interpreting the ASPECTS score on non-contrast CT (10-point scale evaluating 10 designated middle cerebral artery territory regions).",
            "Expanding criteria: identifying the evidence supporting thrombectomy in large core infarctions (ASPECTS 3-5)."
        ],
        "case_hooks": [
            "A 71-year-old woman is found with dense left hemiplegia 11 hours after last known well (wake-up stroke); CT perfusion shows an ischemic core of 22 mL with a total hypoperfused territory of 115 mL and right MCA-M1 occlusion.",
            "An 80-year-old male arrives 3 hours post-stroke onset with an NIHSS of 16; non-contrast head CT shows early ischemic changes in the insular ribbon and lentiform nucleus (ASPECTS = 8) with terminal ICA 'T' occlusion."
        ],
        "uncertainties": [
            "Efficacy and safety of mechanical thrombectomy in distal medium vessel occlusions (MeVOs: M2/M3 MCA, A2/A3 ACA, P2/P3 PCA).",
            "Optimal post-thrombectomy blood pressure targets following complete TICI 2b/3 recanalization versus partial recanalization."
        ]
    },

    "thrombocytopenia": {
        "mentor_intro": (
            "Thrombocytopenia (platelet count <150 x 10^9/L) is a frequent haematologic abnormality resulting from decreased bone marrow production, increased peripheral destruction, splenic sequestration, or dilution. "
            "The initial clinical priority is excluding pseudothrombocytopenia (EDTA-dependent platelet clumping, ruled out by examining a peripheral blood smear and repeating the count in a citrated or heparinized tube). "
            "Urgent differentiation is required for life-threatening microangiopathic syndromes (TTP, HUS, DIC) and drug-induced etiologies (heparin-induced thrombocytopenia [HIT]), while distinguishing primary immune thrombocytopenia (ITP) from bone marrow failure."
        ),
        "teaching_points": [
            "Pseudothrombocytopenia must always be ruled out by peripheral blood smear review showing platelet satellitism or clumping in EDTA; repeat analysis using a sodium citrate or heparin anticoagulant tube confirms the true platelet count.",
            "A peripheral blood smear is mandatory in acute thrombocytopenia to evaluate for schistocytes (MAHA: TTP, HUS, DIC), blasts (acute leukaemia), dysplastic cells (myelodysplasia), or giant platelets (inherited thrombocytopenias or peripheral destruction).",
            "Immune thrombocytopenia (ITP) is a diagnosis of exclusion; frontline treatment for newly diagnosed active adult ITP with bleeding or platelets <20-30 x 10^9/L consists of oral corticosteroids (dexamethasone 40 mg daily for 4 days or prednisone 1 mg/kg/day) with or without IVIG.",
            "Heparin-induced thrombocytopenia (HIT) is evaluated via the 4Ts score (Thrombocytopenia magnitude, Timing of fall [days 5-10], Thrombosis, and absence of oTher causes); a high 4Ts score warrants immediate cessation of all heparin and initiation of a non-heparin anticoagulant (argatroban, fondaparinux)."
        ],
        "mcq_angles": [
            "Stepwise exclusion of pseudothrombocytopenia before invasive bone marrow testing.",
            "Applying the 4Ts score in suspected heparin-induced thrombocytopenia and selecting non-heparin anticoagulation.",
            "Platelet transfusion thresholds: prophylactic threshold of 10 x 10^9/L in stable hypoproliferative patients, 20 x 10^9/L in febrile/septic patients, 50 x 10^9/L for major surgery, and 100 x 10^9/L for neurosurgery."
        ],
        "case_hooks": [
            "An asymptomatic 35-year-old male routine blood test shows a platelet count of 12 x 10^9/L; peripheral blood smear displays extensive large platelet aggregates in EDTA, which disperses in a citrated tube with normal count (220 x 10^9/L).",
            "A 68-year-old post-cardiac surgery patient on enoxaparin prophylaxis experiences a 55% drop in platelets from 260 to 110 x 10^9/L on postoperative day 7, with new pain and swelling in his left calf."
        ],
        "uncertainties": [
            "Predictive value of novel thrombopoietin receptor agonists (TPO-RAs: romiplostim, eltrombopag, avatrombopag) as upfront therapy alongside steroids in adult ITP.",
            "Safety and efficacy of direct oral anticoagulants (DOACs) as alternatives to parenteral argatroban in acute HIT."
        ]
    },

    "thyroid disease": {
        "mentor_intro": (
            "Thyroid disease spans disorders of hormone synthesis and function (hypothyroidism, hyperthyroidism/thyrotoxicosis) and structural pathology (goitre, thyroiditis, benign nodules, and thyroid malignancies). "
            "Third-generation serum thyroid-stimulating hormone (TSH) serves as the primary, most sensitive screening test, with reflexive free thyroxine (FT4) and free triiodothyronine (FT3) determining overt versus subclinical disease. "
            "Etiologic evaluation utilizes thyroid autoantibodies (anti-TPO and anti-Tg for Hashimoto thyroiditis; TSH receptor antibodies [TRAb/TSI] for Graves' disease) and radioactive iodine uptake/scintigraphy to guide targeted antithyroid medications, radioiodine ablation, or surgery."
        ),
        "teaching_points": [
            "Serum TSH is the single most sensitive first-line test for evaluating thyroid functional status due to the logarithmic inverse relationship between TSH and circulating free thyroid hormones.",
            "Subclinical hypothyroidism (elevated TSH with normal free T4) carries risks of progression to overt failure, dyslipidemia, and adverse pregnancy outcomes; levothyroxine treatment is strongly indicated for TSH >=10 mIU/L, during pregnancy, or in symptomatic younger individuals with positive anti-TPO antibodies.",
            "Graves' disease is distinguished from destructive thyroiditis (subacute, painless, or postpartum thyroiditis) by positive TSH receptor antibodies (TRAb) and diffuse high uptake on radioactive iodine scanning, whereas destructive thyroiditis exhibits low or absent uptake.",
            "Amiodarone-induced thyrotoxicosis is categorized into Type 1 (iodine-induced hyperthyroidism in underlying latent thyroid autonomy, treated with thionamides) and Type 2 (destructive thyroiditis in normal glands, treated with systemic corticosteroids); differentiating via color flow Doppler ultrasound is essential."
        ],
        "mcq_angles": [
            "Differentiating Graves' disease from subacute thyroiditis based on radioactive iodine uptake (high/diffuse vs suppressed/absent) and vascularity on Doppler ultrasound.",
            "Treatment thresholds for subclinical hypothyroidism: universally treating when TSH >=10 mIU/L or during pregnancy/conception.",
            "Managing amiodarone-induced thyrotoxicosis: distinguishing Type 1 (thionamides + potassium perchlorate) from Type 2 (corticosteroids)."
        ],
        "case_hooks": [
            "A 28-year-old woman presents with palpitations, weight loss, heat intolerance, bilateral proptosis, and pretibial myxoedema; TSH is <0.01 mIU/L and free T4 is 42 pmol/L.",
            "A 42-year-old female presents with neck tenderness, fever, palpitations, and an elevated ESR of 85 mm/h following a viral upper respiratory infection; radioactive iodine uptake is <1%."
        ],
        "uncertainties": [
            "Cardiovascular risk-benefit balance of treating subclinical hyperthyroidism (TSH <0.1 mIU/L) in asymptomatic individuals aged <65 years.",
            "Optimal timing and thresholds for radioiodine versus long-term low-dose thionamide maintenance in relapsed Graves' disease."
        ]
    },

    "thyroid nodule evaluation and fna": {
        "mentor_intro": (
            "Thyroid nodules are exceptionally common, detected in up to 50-60% of healthy adults on high-resolution ultrasonography, but fewer than 5-10% harbor malignancy. "
            "The initial evaluation mandates serum TSH measurement: a suppressed TSH warrants radionuclide scintigraphy (hot/hyperfunctioning nodules rarely represent malignancy and do not require biopsy). "
            "Euthyroid or hypothyroid nodules are risk-stratified using standardized ultrasound systems (ACR TI-RADS or EU-TIRADS), which dictate the size thresholds for fine-needle aspiration (FNA) biopsy classified by the Bethesda System for Reporting Thyroid Cytopathology."
        ),
        "teaching_points": [
            "Initial laboratory evaluation of a thyroid nodule must begin with serum TSH; if TSH is subnormal, a radionuclide thyroid scan (technetium-99m or I-123) should be performed to detect autonomous hyperfunctioning ('hot') nodules, which are rarely malignant and do not require FNA.",
            "Ultrasound features conferring high risk of malignancy include: solid composition, hypoechogenicity, taller-than-wide shape, irregular/infiltrative margins, and punctate echogenic foci (microcalcifications).",
            "According to ACR TI-RADS, FNA thresholds are based on cumulative feature points: TR3 (mildly suspicious) FNA at >=2.5 cm; TR4 (moderately suspicious) FNA at >=1.5 cm; and TR5 (highly suspicious) FNA at >=1.0 cm, safely reducing unnecessary biopsies of benign nodules.",
            "The Bethesda System categorizes FNA cytology into six tiers (I: Non-diagnostic; II: Benign; III: AUS/FLUS; IV: Follicular neoplasm; V: Suspicious for malignancy; VI: Malignant); molecular testing (e.g., Afirma, ThyroSeq) is indicated for indeterminate categories (Bethesda III and IV) to rule in or rule out malignancy."
        ],
        "mcq_angles": [
            "Applying ACR TI-RADS points and size thresholds for recommending FNA versus ultrasound surveillance.",
            "Management of Bethesda Category III (AUS/FLUS) and IV (Follicular neoplasm): utilizing molecular diagnostic testing or repeat FNA versus immediate diagnostic lobectomy.",
            "Recognizing benign ultrasound patterns (purely cystic nodules or spongiform nodules >50%) that do not require biopsy."
        ],
        "case_hooks": [
            "A 46-year-old woman has an incidental 1.4 cm solid, markedly hypoechoic thyroid nodule with microcalcifications and irregular margins on ultrasound (ACR TI-RADS 5, 8 points); TSH is 2.1 mIU/L.",
            "A 52-year-old male undergoes FNA of a 2.2 cm nodule, yielding Bethesda Category III (Atypia of Undetermined Significance); the clinician discusses molecular testing versus repeat FNA."
        ],
        "uncertainties": [
            "Role of contrast-enhanced ultrasound (CEUS) and shear-wave elastography as adjuncts to refine FNA selection in indeterminate nodules.",
            "Cost-effectiveness and long-term diagnostic accuracy of next-generation sequencing molecular panels in diverse non-Caucasian populations."
        ]
    },

    "thyroid nodules": {
        "mentor_intro": (
            "Thyroid nodules represent discrete lesions within the thyroid gland that are radiologically distinct from surrounding parenchyma, encompassing benign follicular adenomas, colloid nodules, cysts, Hashimoto thyroiditis pseudonodules, and primary or metastatic malignancies. "
            "Clinical evaluation balances avoiding invasive over-investigation of indolent benign disease with ensuring early detection of clinically significant carcinomas. "
            "High-risk clinical history—including childhood head/neck ionizing radiation exposure, rapid painless growth, vocal cord paralysis, family history of familial medullary thyroid cancer/MEN2—significantly amplifies malignancy probability and mandates urgent comprehensive evaluation."
        ),
        "teaching_points": [
            "Clinical red flags for thyroid nodule malignancy include: history of childhood head/neck external beam irradiation, total body irradiation for bone marrow transplant, family history of thyroid carcinoma or syndromes (MEN2, Cowden, FAP), rapid nodule growth, firm/fixed texture, and associated hoarseness or cervical lymphadenopathy.",
            "Purely cystic nodules are virtually always benign (<1% malignancy risk) and can be managed with therapeutic needle aspiration if symptomatic, without requiring formal cytologic biopsy unless solid mural nodules are present.",
            "Isthmic thyroid nodules carry a significantly higher rate of extrathyroidal extension and lymph node metastasis compared to lobar nodules of equivalent size, warranting lower thresholds for surgical consultation if malignant features are present.",
            "Nodule surveillance protocols recommend repeat ultrasound at 12-24 months for low-to-intermediate risk nodules; significant growth is defined as a >=20% increase in at least two dimensions with a minimum 2 mm increase, or a >=50% increase in volume."
        ],
        "mcq_angles": [
            "Identifying high-risk clinical history and physical examination features that lower the threshold for biopsy.",
            "Definition of clinically significant thyroid nodule growth on serial ultrasound surveillance.",
            "Management of symptomatic benign simple thyroid cysts: therapeutic aspiration and role of ethanol ablation for recurrent fluid collection."
        ],
        "case_hooks": [
            "A 32-year-old male who received mantle radiation for Hodgkin lymphoma at age 14 presents with a palpable 1.2 cm firm nodule in the right thyroid lobe.",
            "A 58-year-old woman with a known 1.8 cm spongiform thyroid nodule undergoes surveillance ultrasound 18 months later, showing stability in all three dimensions."
        ],
        "uncertainties": [
            "Role of thermal ablation (radiofrequency ablation [RFA], microwave ablation, laser ablation) as an alternative to surgery for symptomatic, enlarging benign solid thyroid nodules.",
            "Clinical significance and oncologic impact of EIF1AX and other non-BRAF driver mutations in cytologically indeterminate thyroid nodules."
        ]
    },

    "ticagrelor versus clopidogrel acute coronary syndromes": {
        "mentor_intro": (
            "Dual antiplatelet therapy (DAPT) combining aspirin with an oral P2Y12 inhibitor is the cornerstone of secondary prevention in acute coronary syndromes (ACS: STEMI, NSTEMI, and unstable angina) undergoing percutaneous coronary intervention (PCI) or medical management. "
            "Ticagrelor is a direct-acting, reversibly binding P2Y12 receptor antagonist that does not require hepatic metabolic bioactivation, offering faster onset, higher and more consistent platelet inhibition than clopidogrel. "
            "The landmark PLATO trial demonstrated that ticagrelor significantly reduces ischemic events, stent thrombosis, and vascular/all-cause mortality compared to clopidogrel, establishing ticagrelor (or prasugrel) as the preferred guideline-directed P2Y12 inhibitor in ACS."
        ),
        "teaching_points": [
            "In the landmark PLATO trial, ticagrelor (180 mg loading dose, then 90 mg twice daily) significantly reduced the primary composite outcome of death from vascular causes, myocardial infarction, or stroke (9.8% vs 11.7%, p < 0.001) and all-cause mortality compared to clopidogrel in ACS patients.",
            "Unlike clopidogrel (a prodrug requiring two-step hepatic CYP2C19 activation susceptible to loss-of-function polymorphisms and drug interactions), ticagrelor binds reversibly to the P2Y12 receptor and provides consistent, rapid platelet inhibition without metabolic pharmacogenetic variability.",
            "Ticagrelor-specific adverse effects include dyspnoea (occurring in 10-15% of patients due to adenosine reuptake inhibition, typically self-limiting and not reflecting bronchospasm or heart failure) and asymptomatic ventricular pauses/bradyarrhythmias.",
            "Ticagrelor carries an increased risk of non-CABG major bleeding compared to clopidogrel, and is strictly contraindicated in patients with prior intracranial haemorrhage or active severe bleeding; aspirin maintenance dosing with ticagrelor must not exceed 100 mg daily (as high-dose aspirin attenuates ticagrelor efficacy)."
        ],
        "mcq_angles": [
            "PLATO trial outcomes: vascular mortality reduction with ticagrelor over clopidogrel in ACS.",
            "Managing ticagrelor-induced dyspnoea: recognizing its benign adenosine-mediated mechanism vs genuine cardiopulmonary decompensation.",
            "Drug-drug interactions and aspirin dosing limits: avoiding aspirin doses >100 mg daily with ticagrelor."
        ],
        "case_hooks": [
            "A 58-year-old man undergoes primary PCI with a drug-eluting stent for acute STEMI and is initiated on aspirin and ticagrelor 90 mg bid; on day 2 he complains of sudden mild breathlessness with clear lungs and normal oxygen saturation.",
            "A 64-year-old diabetic patient with NSTEMI has CYP2C19*2 loss-of-function allele carriage; the cardiology team selects the appropriate P2Y12 inhibitor to avoid antiplatelet resistance."
        ],
        "uncertainties": [
            "Head-to-head superiority of prasugrel over ticagrelor in ACS patients undergoing invasive PCI (ISAR-REACT 5 trial findings and real-world applicability).",
            "Optimal timing and clinical safety of guided versus unguided DAPT de-escalation from ticagrelor to clopidogrel after 1-3 months in high-bleeding-risk patients."
        ]
    },

    "tick borne rickettsial disease empiric doxycycline": {
        "mentor_intro": (
            "Tick-borne rickettsial diseases (TBRDs)—including Rocky Mountain spotted fever (RMSF, Rickettsia rickettsii), human monocytic ehrlichiosis (Ehrlichia chaffeensis), and human granulocytic anaplasmosis (Anaplasma phagocytophilum)—are potentially fatal vector-borne infections. "
            "These obligate intracellular bacteria infect vascular endothelial cells (RMSF) or leukocytes, causing microvascular leakage, non-cardiogenic pulmonary oedema, acute kidney injury, encephalopathy, and fatal multi-organ failure. "
            "Because clinical diagnosis is challenging and confirmatory serologies are universally negative during early acute infection, empiric oral or IV doxycycline therapy must be initiated immediately upon suspicion; delaying treatment beyond day 5 of illness exponentially increases mortality."
        ),
        "teaching_points": [
            "Empiric doxycycline (100 mg orally or IV twice daily for adults; 2.2 mg/kg twice daily for children) is the definitive drug of choice for suspected tick-borne rickettsial diseases and must NEVER be withheld while awaiting diagnostic confirmation.",
            "Short-course doxycycline (<14-21 days) does not cause tooth staining or enamel hypoplasia in children under 8 years of age; the American Academy of Pediatrics and CDC explicitly designate doxycycline as first-line therapy for TBRDs across ALL age groups.",
            "The classic triad of fever, headache, and rash is present in fewer than 60% of patients at initial presentation; the characteristic petechial rash of RMSF typically appears only on days 3 to 5, and up to 10-15% of cases present without a rash (spotless RMSF).",
            "Routine laboratory abnormalities that provide vital diagnostic clues include thrombocytopenia, leukopenia or normal WBC with profound left shift, elevated serum transaminases, and hyponatraemia."
        ],
        "mcq_angles": [
            "First-line treatment of suspected RMSF in a paediatric patient: doxycycline is the undisputed choice regardless of age.",
            "Timing of therapy: initiating treatment before day 5 of illness to prevent mortality from microvascular collapse.",
            "Diagnostic utility of acute vs convalescent IFA serologies (acute serology is typically negative; diagnosis must be clinical/empiric)."
        ],
        "case_hooks": [
            "A 5-year-old girl in Oklahoma presents with high fever, malaise, myalgias, and thrombocytopenia (75 x 10^9/L) 5 days after a tick exposure; the physician considers whether doxycycline can be safely prescribed in young children.",
            "A 62-year-old hiker presents with fever, confusion, AST 210 U/L, ALT 185 U/L, and platelets 45 x 10^9/L; peripheral blood smear reveals intracytoplasmic morulae in peripheral blood monocytes."
        ],
        "uncertainties": [
            "Alternative antimicrobial options in patients with documented life-threatening anaphylaxis to tetracyclines (chloramphenicol has high failure and mortality rates in RMSF).",
            "Clinical significance and management of serologically confirmed coinfections (e.g., Borrelia, Anaplasma, and Babesia) following a single Ixodes tick bite."
        ]
    },

    "tissue plasminogen activator acute ischemic stroke": {
        "mentor_intro": (
            "Intravenous recombinant tissue plasminogen activator (rtPA, alteplase) was the first pharmacologic reperfusion therapy approved for acute ischaemic stroke, established by the landmark NINDS rt-PA Stroke Study in 1995. "
            "Alteplase converts plasminogen to active plasmin on the thrombus surface, catalyzing fibrin degradation and restoring downstream cerebral perfusion. "
            "Administration must occur within the validated 0 to 4.5 hour time window in eligible patients without absolute contraindications, under strict blood pressure control (<185/110 mmHg pre-infusion; <180/105 mmHg post-infusion) to minimize fatal symptomatic intracranial haemorrhage."
        ),
        "teaching_points": [
            "Alteplase is dosed at 0.9 mg/kg (maximum total dose 90 mg), administered as a 10% intravenous bolus over 1 minute followed by the remaining 90% infused continuously over 60 minutes.",
            "The therapeutic window is 0 to 4.5 hours from symptom onset (or last known well); earlier administration delivers significantly greater odds of functional independence at 3 months (NNT ~4.5 within 90 minutes; NNT ~9 within 3-4.5 hours).",
            "Major absolute contraindications include: acute intracranial haemorrhage, active internal bleeding, severe uncontrolled hypertension (>185/110 mmHg despite antihypertensive therapy), infective endocarditis, aortic arch dissection, platelet count <100 x 10^9/L, INR >1.7, or use of therapeutic DOACs within the past 48 hours.",
            "Symptomatic intracranial haemorrhage (sICH) occurs in approximately 6% of patients treated with alteplase; sudden neurological deterioration, headache, nausea, or acute hypertension during infusion warrants immediate infusion termination and urgent non-contrast head CT."
        ],
        "mcq_angles": [
            "Correct dosing and administration breakdown of IV alteplase (0.9 mg/kg total; 10% bolus over 1 min, 90% infusion over 1 hour; max 90 mg).",
            "Emergency protocol for managing suspected acute intracranial haemorrhage during rtPA infusion (stop infusion, STAT head CT, check fibrinogen, infuse cryoprecipitate and tranexamic acid).",
            "Contraindications relating to concurrent anticoagulation (warfarin with INR >1.7; therapeutic DOAC within 48 hours unless specific reversal agent is given)."
        ],
        "case_hooks": [
            "A 68-year-old male arrives 2 hours after acute right hemiparesis and dysarthria; BP is 198/112 mmHg; IV labetalol is titrated to achieve BP 178/102 mmHg prior to alteplase initiation.",
            "Forty minutes into an alteplase infusion, a 55-year-old woman develops severe headache, vomiting, and her NIHSS worsens from 8 to 18; the infusion is immediately halted."
        ],
        "uncertainties": [
            "Benefit of IV alteplase versus oral aspirin in patients presenting with minor, non-disabling ischemic stroke deficits (NIHSS 0-5) in the PRISMS trial.",
            "Utility of idarucizumab-assisted thrombolysis with alteplase in acute ischemic stroke patients taking dabigatran."
        ]
    },

    "tocilizumab COVID-19 hospitalized patients": {
        "mentor_intro": (
            "Severe and critical COVID-19 is characterized by a hyperinflammatory host response ('cytokine release storm') driven by excessive interleukin-6 (IL-6), leading to acute respiratory distress syndrome (ARDS), systemic microthrombosis, and multi-organ failure. "
            "Tocilizumab—a humanized monoclonal antibody targeting the soluble and membrane-bound IL-6 receptor—dampens this hyperinflammatory cascade. "
            "The landmark RECOVERY and REMAP-CAP randomized platform trials demonstrated that adding tocilizumab to baseline systemic corticosteroids significantly reduces 28-day mortality, progression to mechanical ventilation, and ICU length of stay in hospitalized patients with rapid respiratory deterioration and systemic inflammation."
        ),
        "teaching_points": [
            "Tocilizumab (single IV dose of 8 mg/kg actual body weight, maximum 800 mg) is indicated in hospitalized patients with COVID-19 exhibiting rapid respiratory decompensation (requiring high-flow nasal oxygen, non-invasive ventilation, or mechanical ventilation) and marked systemic inflammation (serum CRP >=75 mg/L), administered in combination with dexamethasone.",
            "The survival benefit of tocilizumab is strictly dependent on co-administration with systemic corticosteroids (dexamethasone 6 mg daily); tocilizumab monotherapy without corticosteroids confers no clear clinical advantage (RECOVERY trial).",
            "Baricitinib (an oral JAK1/JAK2 inhibitor) provides equivalent clinical efficacy to tocilizumab when added to corticosteroids; guidelines recommend either tocilizumab OR baricitinib as preferred second immunomodulator, avoiding simultaneous combination of both due to severe immunosuppressive risks.",
            "Tocilizumab administration results in an immediate, profound suppression of serum C-reactive protein (CRP) and fever, which can mask secondary bacterial or fungal superinfections; clinical monitoring must focus on new fever, hemodynamic instability, or worsening leukocytosis."
        ],
        "mcq_angles": [
            "RECOVERY trial criteria for tocilizumab eligibility: hospitalized COVID-19 with oxygen requirement + CRP >=75 mg/L, co-prescribed with dexamethasone.",
            "Masking of secondary infections: understanding why CRP cannot be used to monitor secondary bacterial sepsis following IL-6 receptor blockade.",
            "Choosing between baricitinib (JAK inhibitor) and tocilizumab (IL-6 inhibitor) as interchangeable second immunomodulatory agents."
        ],
        "case_hooks": [
            "A 58-year-old male hospitalized with COVID-19 pneumonia on day 4 of dexamethasone requires escalation to high-flow nasal cannula (FiO2 0.60, flow 50 L/min); serum CRP is 142 mg/L.",
            "A patient treated with dexamethasone and tocilizumab 5 days ago for severe COVID-19 develops new hypotension and purulent sputum; CRP remains 2 mg/L despite blood cultures growing Pseudomonas aeruginosa."
        ],
        "uncertainties": [
            "Indications for a second dose of tocilizumab at 12-24 hours in patients with persistent or worsening respiratory failure.",
            "Comparative long-term safety regarding opportunistic fungal infections (e.g., COVID-19-associated pulmonary aspergillosis [CAPA]) between tocilizumab and baricitinib."
        ]
    },

    "Tracheobronchomalacia": {
        "mentor_intro": (
            "Tracheobronchomalacia (TBM) is a pathological condition characterized by dynamic structural weakness and excessive collapsibility of the tracheal and bronchial cartilaginous rings and posterior membranous wall during expiration. "
            "It is classified into congenital (primary) forms in infants—often linked to tracheoesophageal fistula or prematurity—and acquired (secondary) forms in adults, triggered by chronic airway inflammation (COPD, relapsing polychondritis), prolonged endotracheal intubation, or trauma. "
            "Dynamic flexible bronchoscopy during active forced expiration or coughing is the gold standard for definitive diagnosis, identifying >=50% (and often >=70-80%) dynamic airway lumen collapse."
        ),
        "teaching_points": [
            "Definitive diagnosis of tracheobronchomalacia requires dynamic flexible bronchoscopy during tidal breathing, deep expiration, and forced coughing, documenting >=50% reduction in luminal cross-sectional area (with severe disease defined as >=70-80% collapse).",
            "Dynamic multi-detector paired inspiratory-expiratory computed tomography (dynamic CT) serves as the primary non-invasive imaging modality of choice, capturing the 'frown sign' of dynamic crescentic airway narrowing on end-expiratory phases.",
            "Conservative medical management includes non-invasive positive pressure ventilation (CPAP/BiPAP), which acts as a 'pneumatic stent' to maintain dynamic airway patency during exhalation, paired with aggressive pulmonary clearance and treatment of underlying COPD.",
            "In severe, highly symptomatic adult TBM refractory to conservative therapy, surgical tracheobronchoplasty (posterior membranous wall stabilization using polypropylene mesh, performed open or robotic-assisted) provides durable symptomatic and functional improvement following a successful temporary stent trial."
        ],
        "mcq_angles": [
            "Diagnostic gold standard for TBM: dynamic flexible bronchoscopy during forced expiration or coughing.",
            "Pneumatic stenting mechanism: explaining how continuous positive airway pressure (CPAP) prevents dynamic expiratory collapse.",
            "Preoperative evaluation for surgical tracheobronchoplasty: utility of a temporary silicone or metallic Y-stent trial to confirm symptomatic reversibility."
        ],
        "case_hooks": [
            "A 62-year-old male with severe COPD and recurrent lower respiratory infections presents with a harsh, barking ('seal-like') cough and inability to clear secretions; dynamic expiratory CT reveals 85% collapse of the distal trachea and both mainstem bronchi.",
            "An 8-month-old infant with a history of repaired esophageal atresia presents with persistent stridor, barking cough, and recurrent reflex apnoeic spells ('dying spells') during feeding."
        ],
        "uncertainties": [
            "Long-term complication rates (granulation tissue, stent migration, mucus plugging) of silicone versus self-expanding metallic stents in adult central airway collapse.",
            "Efficacy and patient selection for posterior tracheopexy versus aortopexy in paediatric severe tracheomalacia."
        ]
    },

    "Tracheostomy: indications, timing, percutaneous vs surgical technique": {
        "mentor_intro": (
            "Tracheostomy is one of the most common surgical procedures performed in critically ill patients requiring prolonged mechanical ventilation, acute airway obstruction, or chronic pulmonary toilet impairment. "
            "Timing of tracheostomy—traditionally categorized into early (within 7-10 days) versus late (>10-14 days)—balances the risks of prolonged translaryngeal intubation (glottic injury, subglottic stenosis) against procedural complications and unnecessary operations in rapidly weaning patients. "
            "Percutaneous dilatational tracheostomy (PDT) performed at the bedside in the ICU has largely superseded open surgical tracheostomy (OST) for elective adult patients due to reduced wound infections and comparable safety when guided by real-time bronchoscopy."
        ),
        "teaching_points": [
            "Major indications for tracheostomy in the ICU include: anticipated prolonged mechanical ventilation, failed extubation, severe neurological deficit with loss of protective airway reflexes, and acute or chronic upper airway obstruction.",
            "The landmark TracMan trial demonstrated that early tracheostomy (within day 4) does not improve 30-day or 1-year mortality compared to late tracheostomy (after day 10), but significantly reduces the duration of sedation and ICU length of stay.",
            "Percutaneous dilatational tracheostomy (PDT) at the bedside is associated with lower surgical site infection rates, smaller incisions, less tissue trauma, and reduced hospital costs compared to open surgical tracheostomy, provided anatomical contraindications are absent.",
            "Real-time bronchoscopic visualization during percutaneous dilatational tracheostomy significantly reduces catastrophic procedural complications, including posterior tracheal wall laceration, paratracheal false-passage placement, and pneumothorax."
        ],
        "mcq_angles": [
            "TracMan trial findings: early vs late tracheostomy impact on mortality (no difference) vs sedation requirements and ICU stay (improved with early).",
            "Anatomical contraindications to bedside percutaneous tracheostomy favoring open surgical tracheostomy (morbid obesity with unidentifiable landmarks, gross thyroid goitre, cervical spine instability, severe coagulopathy).",
            "Role of continuous bronchoscopic guidance during percutaneous dilational tracheostomy."
        ],
        "case_hooks": [
            "A 52-year-old male with severe traumatic brain injury remains comatose (GCS 6) on mechanical ventilation on day 8; the ICU team plans elective tracheostomy for airway protection and weaning.",
            "During a bedside percutaneous dilatational tracheostomy, the intensivist utilizes dynamic bronchoscopy to guide needle puncture between the second and third tracheal cartilages."
        ],
        "uncertainties": [
            "Optimal timing of tracheostomy in acute cervical spinal cord injury (day 3-5 vs later) to prevent pulmonary complications and facilitate diaphragm weaning.",
            "Standardized protocols for decannulation readiness using peak cough flow, blue dye testing, and capping trials in ICU survivors."
        ]
    },

    "Tranexamic acid and damage control resuscitation in trauma": {
        "mentor_intro": (
            "Damage control resuscitation (DCR) is the modern paradigm for resuscitating severe trauma patients with life-threatening haemorrhagic shock, targeting the lethal triad of coagulopathy, hypothermia, and acidosis. "
            "DCR integrates permissive hypotension (MAP ~50-65 mmHg pending surgical haemostasis), balanced blood component transfusion ratios (1:1:1 of packed RBCs, fresh frozen plasma, and platelets), and early antifibrinolytic therapy. "
            "Tranexamic acid (TXA)—a synthetic lysine analogue that competitively blocks plasminogen activation—was proven by the CRASH-2 trial to reduce trauma mortality when administered within 3 hours of injury, while administration after 3 hours increases mortality."
        ),
        "teaching_points": [
            "The landmark CRASH-2 trial demonstrated that early administration of tranexamic acid (1 g IV bolus over 10 minutes followed by 1 g IV infusion over 8 hours) significantly reduces all-cause mortality and death due to bleeding in trauma patients with significant haemorrhage.",
            "Tranexamic acid must be administered within 3 hours of injury; administration after 3 hours is associated with increased bleeding-related mortality and is strictly contraindicated.",
            "Damage control resuscitation prioritizes balanced 1:1:1 transfusion ratios of packed red blood cells, plasma, and platelets, minimizing large-volume crystalloid infusions to prevent dilutional coagulopathy and endothelial glycocalyx disruption (PROPPR trial).",
            "In patients with traumatic brain injury (TBI), the CRASH-3 trial demonstrated that TXA reduces head injury-related death in mild-to-moderate TBI (GCS 9-15) when given within 3 hours of trauma, with negligible benefit in severe TBI (GCS 3-8)."
        ],
        "mcq_angles": [
            "CRASH-2 timing rule: explaining why TXA must be given within 3 hours of trauma injury and why post-3-hour administration increases mortality.",
            "Dosing regimen of TXA in trauma resuscitation: 1 g IV loading dose over 10 minutes, followed by 1 g IV infusion over 8 hours.",
            "Damage control resuscitation components: permissive hypotension, 1:1:1 transfusion ratio, and limitation of crystalloids."
        ],
        "case_hooks": [
            "A 28-year-old male sustains multiple gunshot wounds to the abdomen, presenting 45 minutes post-injury with BP 74/42 mmHg, HR 135 bpm, and massive external haemorrhage; the trauma team initiates the massive transfusion protocol and TXA bolus.",
            "A motorcyclist presents 4 hours after a severe highway collision with pelvic fractures and bleeding; the junior trainee asks whether IV tranexamic acid should still be infused."
        ],
        "uncertainties": [
            "Efficacy and vascular thromboembolism risks of pre-hospital TXA administration versus in-hospital administration (PATCH-Trauma trial findings).",
            "Individualized viscoelastometric testing (TEG / ROTEM) guided TXA dosing versus standardized empiric 2 g bolus protocols."
        ]
    },

    "Transcatheter aortic valve implantation (TAVI): patient selection, access, complications": {
        "mentor_intro": (
            "Transcatheter aortic valve implantation (TAVI, or TAVR) has revolutionized the treatment of severe symptomatic native aortic stenosis across prohibitive, high, intermediate, and low surgical risk patients. "
            "Multidisciplinary 'Heart Team' evaluation integrates anatomical suitability on ECG-gated multidetector CT (annulus dimensions, coronary ostial heights, calcification distribution, and transfemoral access caliber) with clinical risk scores (STS, EuroSCORE II) and patient life expectancy. "
            "Although transfemoral TAVI achieves outstanding hemodynamics and rapid recovery, operators must anticipate and manage specific complications: high-degree atrioventricular conduction block requiring permanent pacemaker, paravalvular regurgitation, vascular access injury, and stroke."
        ),
        "teaching_points": [
            "Transfemoral access is the preferred first-line vascular approach for TAVI (>90% of cases), requiring minimum iliofemoral luminal diameters (typically >=5.0-5.5 mm depending on sheath size) without circumferential calcification or severe tortuosity.",
            "Pre-procedural ECG-gated multislice cardiac CT is mandatory to measure the aortic valve annulus area/perimeter, evaluate coronary artery take-off heights (distance <10-12 mm from annulus confers risk of acute coronary ostial obstruction), and plan coplanar fluoroscopic angles.",
            "New-onset high-degree atrioventricular block and permanent pacemaker (PPM) implantation remain frequent complications, occurring more often with self-expanding valves (15-25%) than balloon-expandable valves (5-10%), due to mechanical compression of the membranous septum and His bundle.",
            "Paravalvular aortic regurgitation (PVL)—arising from incomplete frame sealing in heavily calcified commissures—is associated with increased long-term mortality and is classified by VARC-3 criteria using Doppler echocardiography."
        ],
        "mcq_angles": [
            "Identifying risk factors for acute coronary ostial obstruction during TAVI (coronary height <10-12 mm and shallow sinuses of Valsalva).",
            "Predictors and rates of permanent pacemaker requirement comparing self-expanding vs balloon-expandable prostheses.",
            "Patient selection: transcatheter versus surgical aortic valve replacement (SAVR) in younger low-risk patients (<65-70 years) where valve durability, bicuspid anatomy, and lifetime coronary access are primary concerns."
        ],
        "case_hooks": [
            "An 82-year-old female with severe symptomatic aortic stenosis (mean gradient 48 mmHg, valve area 0.6 cm2) and STS score 6.2% is evaluated for transfemoral TAVI; CT shows coronary ostia at 14 mm and femoral arteries measuring 6.5 mm.",
            "Following successful deployment of a self-expanding transcatheter aortic valve, a patient develops new right bundle branch block with first-degree AV block and intermittent 2:1 Mobitz II block on telemetry."
        ],
        "uncertainties": [
            "Long-term structural valve deterioration (SVD) and durability of transcatheter bioprostheses beyond 10 years compared to surgical bioprosthetic valves.",
            "Optimal antithrombotic therapy post-TAVI in patients without baseline anticoagulation indications (single antiplatelet therapy [SAPT] with aspirin vs DAPT vs oral anticoagulants)."
        ]
    },

    "Transfusion-Associated Circulatory Overload": {
        "mentor_intro": (
            "Transfusion-Associated Circulatory Overload (TACO) is an acute, hydrostatic pulmonary oedema precipitated by the transfusion of blood products, and represents the leading cause of transfusion-related morbidity and mortality in high-income countries. "
            "Pathophysiology involves excessive volume, rapid infusion rate, or impaired cardiovascular/renal compensation, leading to elevated left atrial pressures and fluid extravasation into lung alveoli. "
            "Differentiating TACO from Transfusion-Related Acute Lung Injury (TRALI)—which is non-cardiogenic and mediated by neutrophil activation—is critical, as TACO responds dramatically to diuresis and positive pressure ventilation whereas TRALI does not."
        ),
        "teaching_points": [
            "TACO is defined clinically by acute respiratory distress developing within 6 (or up to 12) hours of blood product transfusion, with evidence of hydrostatic cardiac overload (tachycardia, hypertension, elevated JVP, peripheral oedema, cardiomegaly/pulmonary oedema on CXR, and marked elevation in BNP or NT-proBNP).",
            "Major risk factors for TACO include advanced age (>70 years), pre-existing congestive heart failure, chronic kidney disease, hypoalbuminaemia, rapid infusion rates, and large-volume transfusion.",
            "TACO is distinguished from TRALI by the presence of systemic hypertension (versus hypotension in TRALI), elevated jugular venous pressure, responsive diuresis with loop diuretics, and post-transfusion BNP elevation >1.5-fold baseline.",
            "Prevention requires pre-transfusion risk assessment, restrictive single-unit red cell transfusion strategies, slowing infusion rates (transfusing a single unit over 3 to 4 hours), and prophylactic pre- or mid-transfusion loop diuretics (e.g., IV furosemide 20-40 mg) in high-risk patients."
        ],
        "mcq_angles": [
            "Differentiating TACO from TRALI: hypertension, elevated JVP, high post-transfusion BNP/NT-proBNP, and rapid response to IV furosemide definitively favor TACO.",
            "Immediate emergency management of suspected TACO: stop transfusion, sit patient upright, administer high-flow oxygen/CPAP, and give intravenous loop diuretics.",
            "Prophylactic strategies for TACO in high-risk patients (pre-transfusion IV furosemide, single-unit transfusion over 3-4 hours)."
        ],
        "case_hooks": [
            "A 78-year-old woman with ischemic cardiomyopathy and CKD stage 3 receives 2 units of packed RBCs over 2 hours for anaemia; 45 minutes after the second unit, she develops acute dyspnoea, BP rises to 185/100 mmHg, and JVP is 8 cm.",
            "A hospital transfusion committee reviews an adverse reaction where an elderly oncology patient developed pulmonary infiltrates after plasma infusion; the team analyzes post-transfusion BNP and hemodynamic parameters."
        ],
        "uncertainties": [
            "Diagnostic accuracy and specific cutoff thresholds for pre- versus post-transfusion NT-proBNP in differentiating mixed TACO/TRALI presentations.",
            "Effectiveness of automated electronic health record clinical decision support alerts in prompting prophylactic diuretic orders for high-risk patients."
        ]
    },

    "Transoesophageal echocardiography: indications, LA thrombus, valve assessment": {
        "mentor_intro": (
            "Transoesophageal echocardiography (TOE/TEE) provides high-resolution ultrasonic visualization of posterior cardiac structures unobstructed by chest wall, ribs, or lung parenchyma. "
            "Because the transducer sits in the mid-oesophagus directly posterior to the left atrium, TOE is the undisputed gold standard for detecting left atrial appendage (LAA) thrombi, ruling out infective endocarditis vegetations and perivalvular abscesses, and guiding transcatheter structural heart interventions. "
            "Safe performance demands pre-procedure evaluation of oesophageal pathology contraindications, conscious sedation monitoring, and multiplane probe manipulation."
        ),
        "teaching_points": [
            "TOE is the gold standard modality for excluding left atrial appendage (LAA) thrombus prior to direct current cardioversion or catheter ablation for atrial fibrillation/flutter, exhibiting sensitivity and specificity approaching 99-100%.",
            "In suspected infective endocarditis (IE), TOE is strongly indicated when transthoracic echo (TTE) is negative or non-diagnostic despite high clinical suspicion, in all patients with prosthetic valves or intracardiac devices, and to detect invasive perivalvular complications (root abscess, fistula, leaflet perforation).",
            "Comprehensive prosthetic valve assessment by TOE evaluates mechanism of dysfunction (structural leaflet degeneration, pannus ingrowth vs mobile thrombus, paravalvular regurgitant jets, rocking of the sewing ring in dehiscence).",
            "Absolute contraindications to TOE include oesophageal pathology with risk of perforation: oesophageal stricture, oesophageal carcinoma, active upper gastrointestinal bleeding, oesophageal perforation, Zenker diverticulum, and recent oesophageal surgery."
        ],
        "mcq_angles": [
            "Mandatory TOE indications in infective endocarditis: prosthetic valves, intracardiac electronic devices, and suspected perivalvular abscess.",
            "Excluding LAA thrombus before cardioversion: identifying 'smoke' (spontaneous echo contrast, a precursor of stasis) versus discrete mobile thrombus in the pectinate muscles.",
            "Identifying absolute contraindications to TOE probe insertion (active GI bleeding, oesophageal malignancy/stricture, Zenker diverticulum)."
        ],
        "case_hooks": [
            "A 64-year-old male with persistent atrial fibrillation of unknown duration is scheduled for electrical cardioversion; TOE is performed, demonstrating a 1.2 cm hyperechoic mobile mass in the left atrial appendage apex.",
            "A 55-year-old female with a mechanical aortic valve presents with persistent Enterococcus faecalis bacteraemia and new-onset PR-interval prolongation; TTE is inconclusive, prompting urgent TOE."
        ],
        "uncertainties": [
            "Diagnostic equivalence of modern 4D cardiac CT angiography compared to TOE for pre-procedural left atrial appendage thrombus exclusion.",
            "Routine utility of TOE versus surface POCUS during active cardiopulmonary resuscitation in out-of-hospital cardiac arrest."
        ]
    },

    "Transthyretin amyloidosis treatment": {
        "mentor_intro": (
            "Transthyretin amyloidosis (ATTR) is a progressive, fatal systemic protein-misfolding disorder caused by the dissociation of transthyretin tetramers into misfolded monomers that aggregate as insoluble amyloid fibrils in myocardial and neural tissues. "
            "ATTR manifests as ATTR cardiomyopathy (ATTR-CM) and/or ATTR polyneuropathy (ATTR-PN), occurring in both wild-type (ATTRwt, predominantly in older men) and hereditary variant (ATTRv) forms. "
            "The therapeutic landscape has undergone a revolutionary shift from purely supportive care to targeted disease-modifying therapies: kinetic tetramer stabilizers (tafamidis, acoramidis) and hepatic gene-silencing therapies (RNA interference: patisiran, vutrisiran; antisense oligonucleotides: inotersen, eplontersen)."
        ),
        "teaching_points": [
            "Tafamidis is a kinetic stabilizer that binds with high affinity to the thyroxine-binding sites of the TTR tetramer, preventing dissociation into amyloidogenic monomers; the landmark ATTR-ACT trial established that tafamidis reduces all-cause mortality by 30% and cardiovascular hospitalizations in ATTR cardiomyopathy.",
            "Non-invasive diagnostic criteria for ATTR cardiomyopathy allow diagnosis without endomyocardial biopsy if patients have typical heart failure/echo findings, Grade 2 or 3 cardiac uptake on 99mTc-pyrophosphate (PYP) or DPND bone scintigraphy, AND completely negative serum/urine monoclonal protein studies (immunofixation and free light chains).",
            "RNA interference (RNAi) therapeutics—specifically patisiran (IV every 3 weeks) and vutrisiran (subcutaneous every 3 months)—target hepatic TTR mRNA, degrading the transcript and reducing serum transthyretin production by >80-85%, halting or reversing polyneuropathy progression (APOLLO and HELIOS-A trials).",
            "The HELIOS-B trial demonstrated that vutrisiran significantly reduces all-cause mortality and recurrent cardiovascular events in patients with ATTR cardiomyopathy, establishing subcutaneous gene silencers as potent disease-modifying agents in cardiac disease."
        ],
        "mcq_angles": [
            "ATTR-ACT trial landmark findings: tafamidis reduces 30-month mortality and cardiovascular hospitalizations in ATTR-CM.",
            "Non-invasive diagnosis requirements: positive 99mTc-PYP/DPD scan (grade 2-3) PLUS strict exclusion of AL amyloidosis via serum and urine immunofixation and serum free light chains.",
            "Mechanism of action of gene silencers (vutrisiran, patisiran: mRNA degradation) versus stabilizers (tafamidis, acoramidis: tetramer stabilization)."
        ],
        "case_hooks": [
            "A 76-year-old male presents with HFpEF, bilateral carpal tunnel syndrome, and low-voltage QRS on ECG despite marked concentric LV wall thickening (16 mm); 99mTc-PYP scan shows intense Grade 3 myocardial uptake with normal light chains.",
            "A 54-year-old woman with confirmed hereditary ATTR (Val30Met mutation) presents with progressive sensorimotor peripheral neuropathy and orthostatic hypotension, evaluated for subcutaneous vutrisiran initiation."
        ],
        "uncertainties": [
            "Long-term combination therapy: whether combining a TTR gene silencer (vutrisiran) with a tetramer stabilizer (tafamidis) provides additive clinical benefit over monotherapy.",
            "Role of emerging in vivo CRISPR-Cas9 gene editing (e.g., nexiguran ziclumeran) in achieving permanent single-dose suppression of mutant and wild-type TTR."
        ]
    },

    "Trauma resuscitation and head injury": {
        "mentor_intro": (
            "The coexistence of severe traumatic brain injury (TBI) and systemic haemorrhagic shock represents a formidable clinical resuscitation dilemma. "
            "While damage control resuscitation for systemic trauma advocates permissive hypotension (systolic BP ~80-90 mmHg) to limit clot disruption, systemic hypotension in severe TBI doubles mortality by precipitating secondary cerebral ischemic injury. "
            "Resuscitation must aggressively prioritize cerebral perfusion pressure (CPP) maintenance—strictly avoiding systolic BP <100-110 mmHg—alongside rapid haemostasis, normoxia, normocarbia, and timely surgical intracranial decompression."
        ),
        "teaching_points": [
            "In patients with combined severe TBI and systemic haemorrhagic trauma, 'permissive hypotension' is strictly contraindicated; the Brain Trauma Foundation guidelines mandate maintaining systolic BP >=100 mmHg for patients aged 50-69 years and >=110 mmHg for patients aged 15-49 or >70 years to prevent secondary ischemic brain injury.",
            "A single documented episode of systemic hypotension (SBP <90 mmHg) or hypoxemia (PaO2 <60 mmHg / SpO2 <90%) in severe TBI is independently associated with a doubling of mortality.",
            "Damage control fluid resuscitation in concomitant TBI requires balanced blood components (1:1:1 pRBC, FFP, platelets) or whole blood; hypotonic crystalloids (such as 0.9% normal saline with low osmolarity relative to injured brain, and especially Ringer's lactate with osmolarity ~273 mOsm/L) must be avoided to prevent worsening cerebral oedema.",
            "Tranexamic acid (TXA) should be administered within 3 hours of injury in polytrauma patients with significant bleeding; in head injury (CRASH-3 trial), TXA reduces mortality in mild-to-moderate TBI without expanding intracranial hematomas."
        ],
        "mcq_angles": [
            "Modifying permissive hypotension targets when severe traumatic brain injury coexists with torso haemorrhage (maintaining SBP >=100-110 mmHg).",
            "Why hypotonic fluids (like Ringer's lactate) are avoided in severe TBI (hypotonicity increases brain tissue water content and elevates ICP).",
            "Impact of secondary physiological insults (hypotension, hypoxia, hyperthermia, hypocapnia) on TBI mortality."
        ],
        "case_hooks": [
            "A 24-year-old unrestrained driver sustains blunt abdominal trauma with pelvic fracture and severe closed head injury (GCS 6); BP is 82/46 mmHg, and the trauma team must choose blood pressure targets and resuscitation fluids.",
            "An intubated TBI patient in the trauma bay has a sudden drop in PaCO2 to 24 mmHg due to accidental hyperventilation on the transport ventilator, causing cerebral vasoconstriction."
        ],
        "uncertainties": [
            "Optimal blood pressure targets guided by non-invasive cerebral autoregulation monitoring (PRx) versus standardized SBP cutoffs in multi-trauma TBI.",
            "Use of pre-hospital whole blood transfusion versus component therapy in polytrauma patients with blunt intracranial hemorrhage."
        ]
    },

    "Traumatic brain injury ICU management": {
        "mentor_intro": (
            "Intensive care management of severe traumatic brain injury (TBI, defined as post-resuscitation GCS <=8) focuses on the prevention, prompt detection, and aggressive mitigation of secondary brain injury. "
            "Secondary insults—ischemia, cellular energy failure, cerebral oedema, intracranial hypertension, and non-convulsive seizures—occur hours to days after the primary mechanical injury. "
            "A structured tier-based protocol coordinates mechanical ventilation, hemodynamic optimization targeting cerebral perfusion pressure (CPP 60-70 mmHg), automated pupillometry, temperature control, and multi-modality neuromonitoring."
        ),
        "teaching_points": [
            "Continuous intracranial pressure (ICP) monitoring is recommended in severe TBI patients (GCS <=8) with an abnormal admission head CT (hematomas, contusions, swelling, compressed basal cisterns) or normal CT with >=2 clinical risk factors (age >40, motor posturing, SBP <90 mmHg).",
            "Guideline-directed management targets an ICP threshold <22 mmHg and a cerebral perfusion pressure (CPP = MAP - ICP) between 60 and 70 mmHg; avoiding CPP <60 mmHg prevents cerebral ischemia, while avoiding CPP >70 mmHg prevents hyperperfusion and ARDS.",
            "Prophylactic post-traumatic seizure prevention with levetiracetam or phenytoin is recommended for the first 7 days following severe TBI to decrease early post-traumatic seizures; routine extension beyond 7 days is not recommended as it does not prevent late epilepsy.",
            "Automated quantitative pupillometry (Neurological Pupil Index [NPI]) provides objective, operator-independent measurement of pupillary reactivity, detecting impending brain herniation and elevated ICP hours before gross clinical changes."
        ],
        "mcq_angles": [
            "Therapeutic target ranges for ICP (<22 mmHg) and CPP (60-70 mmHg) per Brain Trauma Foundation guidelines.",
            "Duration and drug selection for post-traumatic seizure prophylaxis (7 days of levetiracetam or phenytoin; lack of benefit beyond 7 days).",
            "Avoiding aggressive routine hyperventilation (PaCO2 <30-35 mmHg) due to profound cerebral vasoconstriction and secondary ischemic necrosis."
        ],
        "case_hooks": [
            "A 30-year-old male with severe TBI post-evacuation of an acute subdural hematoma has an external ventricular drain placed; monitor displays ICP 26 mmHg and MAP 82 mmHg (CPP = 56 mmHg).",
            "A patient with severe TBI on day 3 in the neuro-ICU demonstrates a decline in automated pupillometry NPI from 4.2 to 2.1 in the left eye despite stable sedation."
        ],
        "uncertainties": [
            "Utility of advanced multi-modality neuromonitoring (brain tissue oxygen tension [PbtO2] and microdialysis) in improving neurological recovery (BOOST-3 trial).",
            "Optimal timing and patient selection for secondary decompressive craniectomy in medically refractory intracranial hypertension (RESCUEicp trial)."
        ]
    },

    "Traumatic brain injury intracranial pressure management": {
        "mentor_intro": (
            "Elevated intracranial pressure (ICP >22 mmHg) following severe traumatic brain injury reflects the Monro-Kellie doctrine: within the rigid cranium, expanding volume (hematoma, brain oedema, vascular engorgement) compromises compensatory reserve, resulting in brain tissue herniation and death. "
            "Management utilizes a structured, tiered protocol escalating from basic neuroprotective foundations to advanced surgical and medical interventions. "
            "Tier 1 interventions include head elevation (30 degrees), midline neck positioning, analgesia/sedation, and CSF drainage; Tier 2 incorporates hyperosmolar therapy (mannitol or hypertonic saline); Tier 3 reserves decompressive craniectomy, barbiturate coma, or therapeutic hypothermia for refractory crises."
        ),
        "teaching_points": [
            "Tier 1 baseline neuroprotective measures include: elevating the head of the bed to 30 degrees to optimize jugular venous outflow, maintaining the cervical spine in neutral midline position, ensuring normothermia (36-37 C), light-to-moderate sedation, and intermittent CSF drainage via external ventricular drain (EVD).",
            "Tier 2 hyperosmolar therapy utilizes either equimolar boluses of mannitol (0.25 to 1.0 g/kg) or hypertonic saline (3% NaCl 150-250 mL bolus, or 23.4% NaCl 30 mL bolus); hypertonic saline is preferred in hemodynamically unstable or hypotensive patients as it expands plasma volume without inducing osmotic diuresis.",
            "Mild hypocapnia (PaCO2 target 30-35 mmHg) may be utilized temporarily as a temporizing bridge for acute intracranial hypertension crises, but prolonged or severe hyperventilation (PaCO2 <30 mmHg) causes severe cerebral vasoconstriction and tissue ischemia.",
            "Tier 3 therapies for refractory intracranial hypertension include surgical secondary decompressive craniectomy (RESCUEicp trial), high-dose continuous barbiturate infusion (pentobarbital or thiopental titrated to burst suppression), and deep neuromuscular blockade."
        ],
        "mcq_angles": [
            "Choosing between mannitol and hypertonic saline: why hypertonic saline is preferred in hypotensive trauma patients (preserves intravascular volume vs osmotic dehydration).",
            "Understanding the dangers of prolonged hyperventilation in ICP management (cerebral vasoconstriction leading to brain tissue hypoxia).",
            "Stepwise tier escalation for intracranial hypertension refractory to Tier 1 and Tier 2 measures."
        ],
        "case_hooks": [
            "An intubated 22-year-old male with severe diffuse axonal injury develops sustained ICP of 28 mmHg for 20 minutes despite EVD drainage and sedation; serum sodium is 138 mmol/L and BP is 105/65 mmHg.",
            "A neuro-ICU patient with refractory ICP >30 mmHg fails hyperosmolar boluses; the neurosurgical team is consulted to discuss decompressive craniectomy versus pentobarbital infusion."
        ],
        "uncertainties": [
            "Comparative long-term neurological functional outcomes between 3% hypertonic saline continuous infusions versus intermittent bolus administration.",
            "Safety and efficacy of ultra-early secondary decompressive craniectomy versus medical refractory rescue in diffuse brain swelling."
        ]
    },

    "Treatment of psoriatic arthritis: NSAIDs, csDMARDs, IL-17, IL-23, TNF inhibitors": {
        "mentor_intro": (
            "Psoriatic arthritis (PsA) is a chronic, heterogeneous inflammatory spondyloarthritis affecting peripheral joints, axial spine, entheses (enthesitis), and digits (dactylitis), intimately associated with cutaneous psoriasis and nail dystrophy. "
            "Management follows domain-based treatment recommendations (GRAPPA and EULAR guidelines), selecting therapies according to active disease domains (peripheral arthritis, axial disease, enthesitis, dactylitis, skin, nails). "
            "Treatment escalates from NSAIDs and conventional synthetic DMARDs (methotrexate) to targeted biological DMARDs—TNF inhibitors, IL-17 inhibitors (secukinumab, ixekizumab, bimekizumab), and IL-23 inhibitors (guselkumab, risankizumab)—and targeted synthetic JAK inhibitors."
        ),
        "teaching_points": [
            "Treatment selection in psoriatic arthritis is domain-driven: while conventional synthetic DMARDs (methotrexate, leflunomide, sulfasalazine) are effective for peripheral arthritis, they are completely INEFFECTIVE for axial disease and enthesitis.",
            "Tumour necrosis factor (TNF) inhibitors (adalimumab, etanercept, infliximab, certolizumab, golimumab) demonstrate robust efficacy across all clinical domains of PsA, including peripheral arthritis, axial disease, enthesitis, dactylitis, and radiographic structural progression.",
            "Interleukin-17 (IL-17A and IL-17F) inhibitors (secukinumab, ixekizumab, bimekizumab) and IL-23 inhibitors (guselkumab, risankizumab) provide superior cutaneous clearance (PASI 90/100) compared to TNF inhibitors, alongside equivalent peripheral articular efficacy.",
            "In patients with prominent axial involvement or severe enthesitis refractory to NSAIDs, biologic therapy with a TNF inhibitor or IL-17 inhibitor should be initiated directly, bypassing ineffective conventional synthetic DMARDs."
        ],
        "mcq_angles": [
            "Domain-specific efficacy: recognizing that methotrexate does not treat axial PsA or enthesitis.",
            "Selecting IL-17 or IL-23 inhibitors over TNF inhibitors in patients with severe, extensive plaque psoriasis or concurrent inflammatory bowel disease considerations (IL-17 inhibitors are contraindicated in active Crohn disease).",
            "Monitoring and safety screening before starting biologic DMARDs (latent tuberculosis screening, hepatitis B/C serology)."
        ],
        "case_hooks": [
            "A 38-year-old male with severe plaque psoriasis presents with severe heel pain (Achilles enthesitis) and inflammatory back pain; spinal MRI confirms bilateral sacroiliitis; the rheumatologist discusses why methotrexate should be bypassed.",
            "A 45-year-old woman with active polyarticular psoriatic arthritis and extensive cutaneous psoriasis fails methotrexate 20 mg weekly; the team evaluates starting an IL-17 inhibitor versus TNF inhibitor."
        ],
        "uncertainties": [
            "Long-term disease-modifying potential of early biologic therapy in preventing the transition from cutaneous psoriasis to overt inflammatory psoriatic arthritis.",
            "Comparative persistence and anti-drug antibody formation between fully humanized monoclonal antibodies and soluble receptor fusion proteins."
        ]
    },

    "Treatment-resistant depression ketamine and ECT": {
        "mentor_intro": (
            "Treatment-resistant depression (TRD)—defined clinically as the failure to achieve symptomatic remission despite adequate trials (dose and duration >=6-8 weeks) of at least two antidepressant medications from different pharmacological classes. "
            "TRD is associated with marked psychosocial impairment, increased healthcare utilization, and high suicide risk. "
            "When standard pharmacotherapies and oral augmentation (atypical antipsychotics, lithium) fail, advanced somatic and rapid-acting neuroplastic interventions are indicated: electroconvulsive therapy (ECT, the historical gold standard for efficacy) and glutamatergic modulators (intranasal esketamine and intravenous ketamine)."
        ),
        "teaching_points": [
            "Electroconvulsive therapy (ECT) remains the single most acutely effective intervention for severe treatment-resistant and psychotic depression, achieving response rates of 70-80% and rapid resolution of acute suicidal intent.",
            "Right unilateral ultrabrief pulse ECT delivers clinical antidepressant efficacy comparable to bilateral ECT while dramatically reducing retrograde and anterograde cognitive and memory adverse effects.",
            "Intravenous ketamine (0.5 mg/kg infused over 40 minutes) and intranasal esketamine (S-enantiomer, administered with oral antidepressant) produce rapid, robust antidepressant and anti-suicidal effects within 2 to 4 hours by blocking NMDA receptors and triggering AMPA-mediated BDNF synaptic neuroplasticity.",
            "Maintenance strategies are mandatory following acute response to both ECT and ketamine/esketamine, as relapse rates exceed 50-60% within 1 to 3 months without continuation maintenance ECT (c-ECT) or ongoing scheduled esketamine dosing."
        ],
        "mcq_angles": [
            "Indications for urgent ECT: psychotic depression, severe catatonia, acute life-threatening suicidality, or severe malnutrition from depressive stupor.",
            "Electrode placement and pulse width tradeoffs in ECT (bilateral vs right unilateral; ultrabrief pulse reducing cognitive/memory side effects).",
            "Mechanism of action and administrative monitoring for intranasal esketamine (mandatory 2-hour clinical observation for sedation and blood pressure surges)."
        ],
        "case_hooks": [
            "A 54-year-old woman with severe recurrent MDD fails sertraline, venlafaxine, and aripiprazole augmentation, presenting with profound depressive stupor and food refusal; urgent ECT is planned.",
            "A 36-year-old male with severe TRD and active suicidal ideation receives an infusion of IV ketamine (0.5 mg/kg), experiencing substantial symptom relief and resolution of suicidal urges within 4 hours."
        ],
        "uncertainties": [
            "Comparative long-term cognitive outcomes and sustained durability between maintenance ECT and maintenance esketamine protocols in TRD.",
            "Risk of dependency, bladder cystitis, and neurocognitive decline with repeated, multi-year ketamine infusions."
        ]
    },

    "Tricuspid regurgitation TEER": {
        "mentor_intro": (
            "Tricuspid transcatheter edge-to-edge repair (T-TEER) has emerged as a groundbreaking, minimally invasive percutaneous therapy for severe, symptomatic tricuspid regurgitation (TR) in patients at prohibitive or high surgical risk. "
            "Severe TR ('the forgotten valve disease') leads to progressive right ventricular dilation, hepatic congestion, peripheral oedema, and renal dysfunction, carrying high mortality with medical therapy alone. "
            "The landmark TRILUMINATE Pivotal trial demonstrated that T-TEER (using the TriClip device system) successfully reduces TR severity to moderate or less in >85% of patients, delivering significant, sustained improvements in health-related quality of life and functional capacity."
        ),
        "teaching_points": [
            "The TRILUMINATE Pivotal trial established that tricuspid TEER safely and effectively reduces severe tricuspid regurgitation, achieving significant improvements in quality of life (KCCQ score) and functional status without excess procedural mortality.",
            "Transoesophageal echocardiographic (TOE) procedural guidance—specifically simultaneous transgastric and multiplane mid-oesophageal views—is essential for accurate leaflet grasping across the anteroseptal and posteroseptal commissures.",
            "Anatomical suitability criteria for T-TEER include: coaptation gap width (ideally <7 mm), sufficient leaflet length (>=8-10 mm), and absence of severe leaflet tethering or dense subvalvular pacemaker lead impingement.",
            "Tricuspid regurgitation severity grading has expanded beyond traditional classifications to include 'massive' and 'torrential' grades (effective regurgitant orifice area [EROA] >=60-80 mm2), which still achieve substantial clinical benefit from grade reduction."
        ],
        "mcq_angles": [
            "TRILUMINATE Pivotal trial outcomes: significant quality-of-life improvement with TriClip despite lacking a standalone 1-year mortality reduction.",
            "Anatomical feasibility: identifying coaptation gap size (<7 mm) and leaflet mobility prerequisites for successful clip grasping.",
            "Interference of transvenous cardiac implantable electronic device (CIED) leads: assessing lead-induced vs lead-independent functional TR."
        ],
        "case_hooks": [
            "A 77-year-old woman with torrential functional tricuspid regurgitation, recurrent ascites, and multiple heart failure admissions despite high-dose loop diuretics is evaluated for percutaneous TriClip repair.",
            "During T-TEER planning, intraprocedural transgastric short-axis TOE demonstrates a 4 mm coaptation defect between the anterior and septal tricuspid leaflets suitable for clip placement."
        ],
        "uncertainties": [
            "Long-term right ventricular reverse remodeling and survival benefit of transcatheter repair in patients with advanced pre-existing right ventricular systolic dysfunction (TAPSE <13 mm).",
            "Comparative clinical efficacy and durability between tricuspid TEER and transcatheter tricuspid valve replacement (TTVR: e.g., EVOQUE system)."
        ]
    },

    "Tricuspid regurgitation: functional vs primary, transcatheter repair options": {
        "mentor_intro": (
            "Tricuspid regurgitation (TR) is etiologically divided into secondary (functional, >90% of cases) and primary (organic, <10%) valvular heart disease. "
            "Secondary TR is driven by annular dilation and leaflet tethering secondary to left-sided heart disease / pulmonary hypertension (ventricular functional TR) or atrial fibrillation with right atrial enlargement (atrial functional TR). "
            "Primary TR results from direct structural damage (endocarditis, carcinoid syndrome, rheumatic disease, congenital Ebstein anomaly, or pacemaker lead-induced leaflet perforation). "
            "Accurate differentiation dictates medical versus surgical or transcatheter intervention (TEER, transcatheter annuloplasty, heterotopic caval valve implantation, or transcatheter valve replacement)."
        ),
        "teaching_points": [
            "Functional (secondary) TR is characterized by normal tricuspid valve leaflet morphology with pathological annular dilation (>40 mm or >21 mm/m2) and leaflet tethering driven by RV pressure/volume overload or chronic atrial fibrillation (atrial functional TR).",
            "Primary TR features intrinsic structural leaflet abnormalities—leaflet prolapse/flail, rheumatic retraction, carcinoid plaque thickening, infective endocarditis vegetations, or direct transvalvular pacemaker lead impingement/laceration.",
            "Surgical tricuspid repair with a prosthetic annuloplasty ring is strongly indicated (Class I) at the time of left-sided valve surgery in patients with severe TR, or mild-to-moderate TR with significant annular dilatation (>=40 mm).",
            "For isolated severe functional TR with high surgical risk, emerging transcatheter options include edge-to-edge repair (TEER: TriClip/PASCAL), transcatheter orthotopic valve replacement (TTVR: EVOQUE), and heterotopic caval valve implantation (CAVI: TricValve) for advanced non-reconstructible anatomy."
        ],
        "mcq_angles": [
            "Differentiating atrial functional TR (isolated RA and annular dilation, preserved RV geometry) from ventricular functional TR (pulmonary hypertension, RV remodeling).",
            "Indications for concomitant tricuspid annuloplasty during left-sided cardiac surgery based on annular dimension (diameter >=40 mm).",
            "Role of heterotopic caval valve implantation (TricValve) in reducing systemic venous congestion when the tricuspid valve itself is untreatable."
        ],
        "case_hooks": [
            "A 72-year-old woman with long-standing permanent atrial fibrillation presents with massive tricuspid regurgitation, severe right atrial enlargement, tricuspid annular diameter 46 mm, but normal pulmonary artery pressures (atrial functional TR).",
            "A 48-year-old male with a dual-chamber pacemaker implanted 3 years ago presents with new severe TR; echocardiography reveals the ventricular lead entangled and tethering the posterior tricuspid leaflet."
        ],
        "uncertainties": [
            "Optimal timing of intervention in asymptomatic severe functional TR to prevent irreversible right ventricular failure and cardiorenal syndrome.",
            "Long-term thrombotic and durability outcomes of transcatheter tricuspid valve replacement (TTVR) in low-pressure right heart hemodynamics requiring anticoagulation."
        ]
    },

    "Trigeminal neuralgia: carbamazepine optimization, microvascular decompression": {
        "mentor_intro": (
            "Trigeminal neuralgia (TN) is an agonizing facial neuropathic pain disorder characterized by recurrent, sudden, unilateral, brief, electric shock-like paroxysmal pain restricted to one or more divisions of the trigeminal nerve (most commonly V2 and V3). "
            "Classical TN is caused by neurovascular conflict—neurovascular compression of the trigeminal nerve root entry zone by an aberrant arterial loop (most commonly the superior cerebellar artery [SCA]), leading to focal demyelination and ephaptic transmission. "
            "Initial management relies on voltage-gated sodium channel blockers (carbamazepine as first-line gold standard), with early evaluation for microvascular decompression (MVD, Janetta procedure) in eligible patients with MRI-confirmed neurovascular compression."
        ),
        "teaching_points": [
            "Carbamazepine (100-200 mg twice daily, titrated up to 800-1200 mg daily) and oxcarbazepine are the established first-line medical therapies for classical trigeminal neuralgia, providing initial pain relief in >80% of patients.",
            "High-resolution 3D T2-weighted MRI (e.g., FIESTA or CISS sequences) coupled with 3D MR angiography is the diagnostic imaging modality of choice to visualize neurovascular conflict at the root entry zone and exclude secondary causes (multiple sclerosis plaques, cerebellopontine angle tumours).",
            "Microvascular decompression (MVD) via retrosigmoid craniotomy is the most effective definitive surgical treatment for classical TN, achieving long-term pain freedom (>70-80% at 5-10 years) without sensory loss by dissecting the compressing vessel and placing an inert Teflon sponge prosthesis.",
            "For elderly, frail patients or those without identifiable neurovascular conflict who fail medical therapy, percutaneous ablative rhizotomy procedures (radiofrequency thermocoagulation, balloon compression, glycerol rhizolysis) or stereotactic radiosurgery (Gamma Knife) provide effective less invasive alternatives, albeit with higher rates of facial numbness and recurrence."
        ],
        "mcq_angles": [
            "First-line pharmacotherapy for trigeminal neuralgia: carbamazepine optimization and monitoring (baseline CBC, liver function, and electrolytes for hyponatraemia).",
            "Surgical mechanism and outcomes of microvascular decompression (MVD): identifying the superior cerebellar artery as the primary culprit vessel and placing a Teflon spacer.",
            "Screening prerequisites: ruling out multiple sclerosis in young patients presenting with bilateral trigeminal neuralgia."
        ],
        "case_hooks": [
            "A 58-year-old woman presents with excruciating, lancinating right cheek pain triggered by light wind touching her face or brushing her teeth; each shock lasts 5 to 15 seconds; MRI shows an arterial loop compressing the right CN V root entry zone.",
            "A 64-year-old man on carbamazepine 800 mg daily develops lethargy and confusion; serum sodium is found to be 122 mmol/L due to carbamazepine-induced SIADH."
        ],
        "uncertainties": [
            "Efficacy and safety of newer subtype-selective sodium channel blockers (e.g., Nav1.7 blockers) with fewer CNS and hyponatraemic side effects compared to carbamazepine.",
            "Predictive value of artificial intelligence and automated radiomics in identifying truly symptomatic neurovascular compression on preoperative MRI."
        ]
    }
}
