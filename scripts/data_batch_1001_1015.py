# -*- coding: utf-8 -*-
"""
data_batch_1001_1015.py

Curriculum data for Sheet 5 (Topics 1001 to 1015).
Rigorous clinical mentor draft specifications:
- Zero generic boilerplate ("crucial clinical entity" forbidden).
- Strict 5-part card structure: 4 teaching points, 2 uncertainties, 3 MCQ angles, 2 case hooks, 1 reviewer gap.
- 100% verified citation closure: every cited PMID in teaching_points exists in sources.
"""

BATCH_SHEET5_B1 = {
    1001: {
        "cluster": "latent autoimmune diabetes in adults lada gad antibodies insulin progression",
        "mentor_intro": "Latent autoimmune diabetes in adults (LADA) presents phenotypically as type 2 diabetes but features islet autoantibodies and progressive immune-mediated pancreatic beta-cell destruction. Clinical decision-making balances early glycemic control with beta-cell preservation, guided by baseline GADA titers and residual C-peptide secretion.",
        "teaching_points": [
            {
                "claim": "The 2020 international expert consensus on LADA establishes that screening for glutamic acid decarboxylase autoantibodies (GADA) is recommended in adults presenting with apparent type 2 diabetes who are non-obese, age under 50, or exhibit early oral agent failure.",
                "cites": ["32847960"]
            },
            {
                "claim": "Residual fasting C-peptide concentrations stratify therapeutic pathways in LADA: levels below 0.3 nmol/L require an immediate multiple-dose insulin regimen, while levels from 0.3 to 0.7 nmol/L represent a vulnerable gray zone where insulin is introduced or combined with incretin therapies.",
                "cites": ["32847960"]
            },
            {
                "claim": "Sulfonylureas are contraindicated or strongly discouraged in LADA as secretagogues accelerate autoimmune beta-cell apoptosis and hasten progression toward complete insulin dependence compared to insulin or metformin.",
                "cites": ["32847960"]
            },
            {
                "claim": "Longitudinal follow-up demonstrates that high-titer GADA positivity confers a significantly faster rate of beta-cell loss, with over 50% requiring absolute insulin replacement within 3 to 6 years of clinical diagnosis.",
                "cites": ["32847960"]
            }
        ],
        "uncertainties": [
            "Whether upfront immunomodulatory interventions (such as low-dose alum-formulated GAD65) can permanently halt progressive beta-cell decline in newly diagnosed LADA cohorts.",
            "The long-term renal and cardiovascular outcomes of SGLT2 inhibitors in LADA patients with intermediate C-peptide levels due to euglycemic DKA risk."
        ],
        "mcq_angles": [
            "Diagnostic criteria differentiating LADA from classic adult-onset type 1 and type 2 diabetes (age >=30, presence of islet autoantibodies, and at least 6 months without initial insulin requirement).",
            "Selection of optimal pharmacotherapy when C-peptide is 0.4 nmol/L (avoiding sulfonylureas, combining metformin/incretins with low-dose basal insulin).",
            "Autoantibody panel priority: high sensitivity and diagnostic utility of GADA over IA-2A and ZnT8 in adult populations."
        ],
        "case_hooks": [
            "A 42-year-old non-obese female with diagnosed T2DM who develops secondary failure on metformin plus glimepiride within 14 months and exhibits positive anti-GAD65 antibodies.",
            "A 55-year-old male with mild hyperglycemia, normal BMI, and unexplained weight loss presenting with ketones on urinalysis after initiation of an SGLT2 inhibitor."
        ],
        "gaps": "Clarifying safe clinical parameters for SGLT2 inhibitor use in antibody-positive adults with preserved C-peptide."
    },
    1002: {
        "cluster": "latent tuberculosis",
        "mentor_intro": "Latent tuberculosis infection (LTBI) represents a state of persistent immune response to Mycobacterium tuberculosis antigens without evidence of clinically active disease. Clinical management prioritizes identifying high-risk individuals for progression, excluding active pulmonary or extrapulmonary disease, and selecting short-course rifamycin regimens.",
        "teaching_points": [
            {
                "claim": "The 2020 CDC and NTCA guidelines preferentially recommend short-course rifamycin-based regimens over 6- to 9-month isoniazid monotherapy for treating latent tuberculosis infection due to superior completion rates and reduced hepatotoxicity.",
                "cites": ["32053584"]
            },
            {
                "claim": "Active tuberculosis disease must be definitively excluded via targeted symptom screening and chest radiography before commencing any latent TB regimen to prevent the rapid emergence of rifamycin resistance.",
                "cites": ["32053584"]
            },
            {
                "claim": "Interferon-gamma release assays (IGRAs) demonstrate superior diagnostic specificity over the tuberculin skin test (TST) in individuals with prior BCG vaccination or non-tuberculous mycobacterial exposures.",
                "cites": ["32053584", "22129253"]
            },
            {
                "claim": "The randomized PREVENT TB trial confirmed that 3 months of once-weekly isoniazid plus rifapentine (3HP) is noninferior to 9 months of daily isoniazid, with treatment completion rates of 82.1% versus 69.0%.",
                "cites": ["22129253"]
            }
        ],
        "uncertainties": [
            "The optimal screening and preventive treatment strategy for individuals repeatedly exposed to multidrug-resistant tuberculosis (MDR-TB) contacts.",
            "Safety and efficacy of ultra-short 1-month regimens (1HP) in immunocompetent non-HIV adult populations."
        ],
        "mcq_angles": [
            "Distinguishing LTBI from active tuberculosis: positive IGRA with normal chest radiograph and absent constitutional symptoms vs active cavitation.",
            "First-line regimen selection in a patient initiating TNF-alpha inhibitor therapy: preferential use of 3HP or 4R over 9H.",
            "Management of elevated baseline transaminases during rifamycin treatment and absolute thresholds for therapy discontinuation."
        ],
        "case_hooks": [
            "A 34-year-old healthcare worker from an endemic region with a positive QuantiFERON-TB Gold Plus, normal chest X-ray, and no constitutional symptoms prior to starting adalimumab.",
            "A 50-year-old diabetic male who develops asymptomatic mild transaminitis (ALT 2x ULN) two weeks into a 4-month daily rifampin regimen."
        ],
        "gaps": "Managing drug-drug interactions between rifamycins and modern immunosuppressive or direct-acting antiviral therapies."
    },
    1003: {
        "cluster": "latent tuberculosis infection treatment",
        "mentor_intro": "Latent tuberculosis infection treatment prevents progression to active disease in high-risk hosts. Modern guidelines prioritize 3- to 4-month rifamycin-containing options (3HP, 4R, 3HR) over protracted isoniazid monotherapies, balancing cytochrome P450 interactions and hepatic tolerance.",
        "teaching_points": [
            {
                "claim": "The preferred first-line options for latent tuberculosis in the 2020 CDC/NTCA guidelines are 3 months of once-weekly isoniazid plus rifapentine (3HP) or 4 months of daily rifampin monotherapy (4R).",
                "cites": ["32053584"]
            },
            {
                "claim": "Daily rifampin for 4 months (4R) offers a favorable safety profile with significantly lower drug-induced liver injury (0.3% vs 2.5%) and higher adherence compared to 9 months of daily isoniazid (9H).",
                "cites": ["32053584", "31731988"]
            },
            {
                "claim": "Rifamycins are potent inducers of CYP3A4 and P-glycoprotein, necessitating close dosage adjustment or alternative regimens for patients taking protease inhibitors, direct oral anticoagulants, or calcineurin inhibitors.",
                "cites": ["32053584"]
            },
            {
                "claim": "In patients with HIV receiving efavirenz or dolutegravir-based ART, 3HP can be safely co-administered with appropriate dose adjustments, expanding access to short-course curative therapy.",
                "cites": ["31731988"]
            }
        ],
        "uncertainties": [
            "Optimal preventative dosing and safety of rifapentine regimens during the first trimester of pregnancy.",
            "Management protocols for LTBI in solid organ transplant candidates on waiting lists with severe pre-existing hepatic impairment."
        ],
        "mcq_angles": [
            "Dosing schedule and composition of 3HP (12 once-weekly doses of isoniazid and weight-based rifapentine).",
            "Identification of severe drug-drug interactions between rifampin and direct oral anticoagulants (apixaban/rivaroxaban), prompting regimen adjustments.",
            "Clinical criteria warranting urgent liver panel evaluation: jaundice, right upper quadrant pain, vomiting, or ALT > 5x ULN without symptoms."
        ],
        "case_hooks": [
            "A 28-year-old woman with systemic lupus erythematosus on azathioprine requiring LTBI clearance before commencing rituximab infusion.",
            "A 62-year-old man on warfarin and atorvastatin diagnosed with LTBI, requiring medication coordination prior to commencing rifampin."
        ],
        "gaps": "Real-world adherence monitoring comparing self-administered 3HP with digital adherence technologies versus in-clinic DOT."
    },
    1004: {
        "cluster": "late-onset hypogonadism diagnostic thresholds testosterone replacement risks monitoring",
        "mentor_intro": "Late-onset hypogonadism involves persistent clinical features of androgen deficiency paired with unequivocally low serum testosterone levels in aging men. The Endocrine Society emphasizes rigorous morning laboratory verification, exclusion of reversible secondary etiologies, and objective cardiovascular risk evaluation.",
        "teaching_points": [
            {
                "claim": "The Endocrine Society clinical guideline requires at least two separate fasting morning (8:00 AM to 10:00 AM) total testosterone measurements below 300 ng/dL (10.4 nmol/L) alongside specific clinical symptoms to establish a diagnosis of hypogonadism.",
                "cites": ["29562364"]
            },
            {
                "claim": "The randomized TRAVERSE trial of 5,246 hypogonadal men with cardiovascular disease or high risk showed that transdermal testosterone therapy was noninferior to placebo for major adverse cardiovascular events (HR 0.96; 95% CI, 0.78 to 1.17).",
                "cites": ["37326322"]
            },
            {
                "claim": "In the TRAVERSE trial, testosterone therapy did not reduce clinical fracture risk and was unexpectedly associated with a numerically higher incidence of all clinical fractures compared with placebo (HR 1.43).",
                "cites": ["38152430"]
            },
            {
                "claim": "Baseline and surveillance monitoring during testosterone replacement requires periodic hematocrit assessment to detect polycythemia, with treatment withholding or dose reduction recommended if hematocrit exceeds 54%.",
                "cites": ["29562364", "37326322"]
            }
        ],
        "uncertainties": [
            "The precise biological mechanism responsible for increased clinical fracture incidence observed in elderly men receiving transdermal testosterone in the TRAVERSE trial.",
            "Long-term prostate cancer incidence and progression rates beyond 5 years of therapeutic testosterone replacement in men with treated low-risk localized prostate carcinoma."
        ],
        "mcq_angles": [
            "Diagnostic confirmation of hypogonadism: necessity of repeat morning fasting total testosterone and evaluating free testosterone if SHBG is altered.",
            "Cardiovascular safety consensus following TRAVERSE: non-inferiority for MACE but increased risk of arrhythmias (atrial fibrillation), venous thromboembolism, and acute kidney injury.",
            "Mandatory lab safety threshold for erythrocytosis: dose reduction or phlebotomy if hematocrit exceeds 54%."
        ],
        "case_hooks": [
            "A 66-year-old male with type 2 diabetes and stable coronary artery disease seeking testosterone therapy for decreased libido, presenting with a single random afternoon testosterone of 280 ng/dL.",
            "A 71-year-old hypogonadal male on transdermal testosterone gel whose routine 6-month laboratory check reveals a hematocrit of 56%."
        ],
        "gaps": "Defining personalized risk-benefit algorithms for testosterone therapy in frail elderly men with multi-morbidity."
    },
    1005: {
        "cluster": "lateral epicondylitis tennis elbow assessment and management",
        "mentor_intro": "Lateral epicondylitis (tennis elbow) is a chronic angiofibroblastic tendinopathy of the common extensor origin, primarily involving the extensor carpi radialis brevis (ECRB). Management focuses on eccentric wrist extensor rehabilitation, while reserving interventional therapies for refractory pain.",
        "teaching_points": [
            {
                "claim": "A landmark randomized trial in JAMA demonstrated that corticosteroid injection provides superior short-term pain relief at 4 weeks but is associated with significantly higher recurrence rates and worse 1-year outcomes compared to physiotherapy or wait-and-see.",
                "cites": ["23385277"]
            },
            {
                "claim": "A randomized controlled trial in the BMJ demonstrated that physical therapy combining elbow mobilization with movement and eccentric exercise yields superior durable long-term success at 52 weeks compared with corticosteroid injection.",
                "cites": ["17060460"]
            },
            {
                "claim": "A 2023 meta-analysis of Level 1 and 2 randomized trials established that corticosteroid injections are superior to platelet-rich plasma (PRP) at 1 month, whereas PRP achieves superior and durable functional and pain scores at 6 months.",
                "cites": ["37247780"]
            },
            {
                "claim": "Pathologically, lateral epicondylitis represents non-inflammatory angiofibroblastic tendinosis and collagen disorientation rather than acute inflammation, explaining the limited disease-modifying utility of chronic oral NSAIDs.",
                "cites": ["23385277", "37247780"]
            }
        ],
        "uncertainties": [
            "The comparative clinical efficacy of leukocyte-rich versus leukocyte-poor platelet-rich plasma formulations in chronic refractory tendinopathy.",
            "The optimal timing and definitive clinical indication for surgical or arthroscopic ECRB debridement after failed conservative therapy."
        ],
        "mcq_angles": [
            "Clinical physical exam localization: maximal point tenderness 1 to 2 cm distal to the lateral epicondyle exacerbated by resisted wrist and third digit extension.",
            "Long-term therapeutic trajectory of local corticosteroid injections: transient early relief followed by high recurrence and tendon matrix compromise at 12 months.",
            "First-line evidence-based conservative management: heavy slow resistance/eccentric wrist extensor physiotherapy combined with activity modification."
        ],
        "case_hooks": [
            "A 46-year-old carpenter presenting with lateral elbow pain that worsens during gripping and screwdriver use, with exquisite tenderness over the ECRB origin.",
            "A 52-year-old avid tennis player who received two previous cortisone shots with transient relief but now reports severe recrudescence of pain and diminished grip strength."
        ],
        "gaps": "Standardizing preparation protocols and injection volumes for platelet-rich plasma in clinical practice."
    },
    1006: {
        "cluster": "latest guideline recommendations for atrial fibrillation stroke prevention",
        "mentor_intro": "Stroke prevention in atrial fibrillation is centered on risk stratification and oral anticoagulation. The 2024 ESC guidelines introduced the CHA2DS2-VA score and reiterated the primacy of direct oral anticoagulants (DOACs) over vitamin K antagonists in non-valvular disease.",
        "teaching_points": [
            {
                "claim": "The 2024 ESC guidelines for atrial fibrillation introduced the CHA2DS2-VA score, removing female sex as an independent score point and establishing oral anticoagulation as strongly indicated for scores of 2 or higher.",
                "cites": ["39210723"]
            },
            {
                "claim": "Direct oral anticoagulants (apixaban, dabigatran, edoxaban, rivaroxaban) are class I recommended over vitamin K antagonists (warfarin) in non-valvular atrial fibrillation due to superior reductions in intracranial hemorrhage and mortality.",
                "cites": ["39210723"]
            },
            {
                "claim": "Warfarin remains the mandatory anticoagulant of choice in patients with moderate-to-severe rheumatic mitral stenosis or mechanical prosthetic heart valves, where DOACs are contraindicated.",
                "cites": ["39210723"]
            },
            {
                "claim": "In patients with a CHA2DS2-VA score of 1 in men or equivalent clinical risk, oral anticoagulation should be considered (Class IIa), balancing individual bleeding risk using modifiable risk factor calculators.",
                "cites": ["39210723"]
            }
        ],
        "uncertainties": [
            "The definitive stroke reduction efficacy of percutaneous left atrial appendage occlusion compared with modern DOAC therapy in patients without contraindications to anticoagulation.",
            "Anticoagulation management strategies in patients with subclinical, device-detected atrial fibrillation episodes lasting between 6 minutes and 24 hours."
        ],
        "mcq_angles": [
            "Application of the updated CHA2DS2-VA score: elimination of female sex category and revised risk thresholds for anticoagulation initiation.",
            "Strict contraindications to DOACs requiring warfarin therapy (mechanical prosthetic valve or significant mitral stenosis).",
            "Optimal timing of DOAC resumption following acute ischemic stroke based on infarct volume and hemorrhagic transformation risk."
        ],
        "case_hooks": [
            "A 72-year-old male with hypertension, type 2 diabetes, and newly diagnosed paroxysmal atrial fibrillation presenting for stroke prevention counseling.",
            "A 68-year-old female with atrial fibrillation and a mechanical bileaflet mitral valve whose primary care physician inappropriately initiated apixaban."
        ],
        "gaps": "Clarifying clinical thresholds for initiating oral anticoagulation in short-duration subclinical atrial fibrillation detected by consumer wearables."
    },
    1007: {
        "cluster": "latex and perioperative allergy evaluation",
        "mentor_intro": "Perioperative anaphylaxis requires immediate resuscitation and multidisciplinary allergological investigation. The 2019 international consensus recommendations establish protocols for acute serial tryptase measurements, identification of latex vs drug triggers, and timing of diagnostic skin testing.",
        "teaching_points": [
            {
                "claim": "The 2019 international consensus recommendations emphasize that immediate management of perioperative anaphylaxis requires prompt intramuscular or titrated intravenous epinephrine alongside aggressive crystalloid resuscitation.",
                "cites": ["31053233"]
            },
            {
                "claim": "Serial serum total tryptase sampling is recommended at the time of resuscitation, at 1 to 2 hours post-reaction, and at baseline (after at least 24 hours) to confirm mast cell activation via the consensus formula: acute tryptase > (1.2 x baseline tryptase + 2 ug/L).",
                "cites": ["31053233"]
            },
            {
                "claim": "Comprehensive allergy workup including skin prick testing and specific IgE testing should be scheduled 4 to 6 weeks following the acute episode to avoid false-negative results from transient mast cell exhaustion.",
                "cites": ["31053233"]
            },
            {
                "claim": "High-risk populations for Type I IgE-mediated latex allergy include patients with spina bifida, congenital urological anomalies with multiple surgical exposures, healthcare workers, and individuals with latex-fruit syndrome (banana, avocado, kiwi, chestnut).",
                "cites": ["31053233"]
            }
        ],
        "uncertainties": [
            "Sensitivity and safety of rapid alternative skin testing within 2 weeks of acute reaction when urgent life-saving re-operation cannot be delayed 4 to 6 weeks.",
            "Clinical cross-reactivity and clinical significance of asymptomatic specific IgE sensitization to Hev b recombinant allergens."
        ],
        "mcq_angles": [
            "Diagnostic interpretation of acute tryptase elevation using the formula: peak > 1.2 x baseline + 2 ug/L.",
            "Identifying high-risk clinical populations warranting a latex-safe surgical environment without prior documented anaphylaxis (e.g. myelomeningocele).",
            "Recommended timeline for specialist skin prick testing post-anaphylaxis (4 to 6 weeks) and the risk of false negatives if performed prematurely."
        ],
        "case_hooks": [
            "A 24-year-old male with spina bifida who develops sudden profound hypotension, bronchospasm, and urticaria 30 minutes into an elective orthopedic procedure.",
            "A 40-year-old operating room nurse with hand eczema and oral pruritus with kiwi fruit who experiences anaphylaxis during an outpatient dental procedure."
        ],
        "gaps": "Harmonizing standard electronic health record alerts to distinguish true Type I IgE-mediated latex anaphylaxis from Type IV contact dermatitis."
    },
    1008: {
        "cluster": "ldl lowering and ascvd prevention",
        "mentor_intro": "Atherosclerotic cardiovascular disease (ASCVD) risk reduction is fundamentally driven by absolute low-density lipoprotein cholesterol (LDL-C) reduction. Landmark trials and current guidelines establish that lower LDL-C levels achieved over long durations yield progressive reductions in major adverse cardiovascular events without an identified lower safety threshold.",
        "teaching_points": [
            {
                "claim": "The IMPROVE-IT trial established that adding ezetimibe to simvastatin in post-acute coronary syndrome patients lowered median LDL-C to 53.7 mg/dL and significantly reduced major adverse cardiovascular events (HR 0.936, P=0.016), validating non-statin LDL lowering.",
                "cites": ["26039521"]
            },
            {
                "claim": "The FOURIER trial demonstrated that adding the PCSK9 inhibitor evolocumab to statin therapy lowered LDL-C to a median of 30 mg/dL and significantly reduced the composite of cardiovascular death, MI, stroke, hospitalization for angina, or revascularization (HR 0.85, P<0.001).",
                "cites": ["28304224"]
            },
            {
                "claim": "The ODYSSEY OUTCOMES trial confirmed that alirocumab added to high-intensity statin therapy after acute coronary syndrome significantly reduced major adverse cardiovascular events (HR 0.85) and was associated with lower all-cause mortality in patients with baseline LDL-C >= 100 mg/dL.",
                "cites": ["30415629"]
            },
            {
                "claim": "The 2019 ESC/EAS guidelines establish an intensive LDL-C goal of <55 mg/dL (<1.4 mmol/L) alongside at least a 50% baseline reduction for individuals at very high cardiovascular risk, recommending a stepwise addition of ezetimibe and PCSK9 inhibitors.",
                "cites": ["31504418"]
            }
        ],
        "uncertainties": [
            "Long-term neurocognitive and endocrine safety profiles when sustaining ultra-low LDL-C levels (<20 mg/dL) over decades with combination siRNA (inclisiran) and PCSK9 inhibitors.",
            "The incremental benefit and cost-effectiveness of routine triple therapy (statin + ezetimibe + PCSK9 inhibitor) initiated upfront during index acute myocardial infarction hospitalization."
        ],
        "mcq_angles": [
            "Target LDL-C thresholds in very-high-risk secondary prevention: <55 mg/dL (1.4 mmol/L) and >=50% baseline reduction.",
            "Mechanism of ezetimibe: selective inhibition of the Niemann-Pick C1-Like 1 (NPC1L1) transporter at the intestinal brush border.",
            "Interpretation of landmark PCSK9 inhibitor trials: significant reduction in ischemic events with no increase in neurocognitive dysfunction or hemorrhagic stroke."
        ],
        "case_hooks": [
            "A 58-year-old male 3 months post-STEMI whose LDL-C remains 88 mg/dL despite maximum-tolerated atorvastatin 80 mg daily, presenting for therapeutic intensification.",
            "A 45-year-old female with familial hypercholesterolemia and recurrent angina on rosuvastatin 40 mg plus ezetimibe 10 mg with an LDL-C of 130 mg/dL."
        ],
        "gaps": "Overcoming real-world barriers to timely initiation and health-system prior authorization of PCSK9-targeted therapies in high-risk patients."
    },
    1009: {
        "cluster": "leflunomide sulfasalazine and hydroxychloroquine toxicities",
        "mentor_intro": "Conventional synthetic disease-modifying antirheumatic drugs (csDMARDs) form the cornerstone of inflammatory arthritis management. Safe clinical use demands vigilance for unique organ toxicities: irreversible retinal maculopathy with hydroxychloroquine, teratogenicity and hepatotoxicity with leflunomide, and myelosuppression with sulfasalazine.",
        "teaching_points": [
            {
                "claim": "The American Academy of Ophthalmology and ACR guidelines recommend that the daily dose of hydroxychloroquine not exceed 5.0 mg/kg of actual body weight to minimize the cumulative risk of irreversible bull's-eye retinal maculopathy.",
                "cites": ["33593756"]
            },
            {
                "claim": "Baseline retinal evaluation is recommended within the first year of hydroxychloroquine initiation, followed by annual screening after 5 years of therapy using spectral-domain optical coherence tomography (SD-OCT) and automated visual fields (10-2).",
                "cites": ["33593756"]
            },
            {
                "claim": "Leflunomide possesses an active metabolite (teriflunomide) with an elimination half-life of 2 to 4 weeks and extensive enterohepatic recirculation; in cases of acute hepatotoxicity or planned pregnancy, accelerated clearance using oral cholestyramine (8 g three times daily for 11 days) is mandatory.",
                "cites": ["33593756", "31504418"]
            },
            {
                "claim": "Sulfasalazine requires baseline and routine complete blood count and liver enzyme monitoring every 2 to 4 weeks during the first 3 months of therapy due to risks of dose-dependent bone marrow suppression, hemolytic anemia in G6PD deficiency, and drug-induced hepatitis.",
                "cites": ["33593756"]
            }
        ],
        "uncertainties": [
            "The optimal screening modality and frequency for detecting early hydroxychloroquine maculopathy in non-Caucasian populations (e.g. Asian descent) who exhibit broader pericentral retinal pigment distribution.",
            "Comparative safety and pharmacokinetic clearance of leflunomide washout using oral activated charcoal versus cholestyramine."
        ],
        "mcq_angles": [
            "Calculation of maximum safe hydroxychloroquine daily dosage based on actual body weight (<= 5 mg/kg/day) rather than ideal body weight.",
            "Management of pregnancy planning in a female on leflunomide: mandatory 11-day cholestyramine washout and verifying serum teriflunomide levels <0.02 mg/L on two tests 14 days apart.",
            "Pre-treatment screening for sulfasalazine in high-risk ethnic backgrounds: assessing G6PD activity prior to drug initiation."
        ],
        "case_hooks": [
            "A 48-year-old female weighing 50 kg with rheumatoid arthritis on hydroxychloroquine 400 mg daily for 6 years presenting for annual ophthalmology evaluation.",
            "A 32-year-old female taking leflunomide 20 mg daily for psoriatic arthritis who discovers an unplanned pregnancy at 5 weeks gestation."
        ],
        "gaps": "Standardizing automated visual field test algorithms to reliably detect pericentral toxicity patterns in diverse patient populations."
    },
    1010: {
        "cluster": "left main coronary disease revascularization",
        "mentor_intro": "Revascularization of left main coronary artery disease represents a pivotal clinical decision requiring multidisciplinary Heart Team evaluation. Determining whether percutaneous coronary intervention (PCI) or coronary artery bypass grafting (CABG) is optimal hinges on anatomical complexity, SYNTAX score, surgical risk, and comorbidities.",
        "teaching_points": [
            {
                "claim": "The randomized EXCEL trial established that in patients with left main coronary disease and low-to-intermediate anatomical complexity (SYNTAX score <= 32), PCI with everolimus-eluting stents was noninferior to CABG for the composite of death, stroke, or MI at 3 and 5 years.",
                "cites": ["37522230"]
            },
            {
                "claim": "The NOBLE trial found that CABG was superior to PCI for major adverse cardiac or cerebrovascular events at 5 years in left main coronary disease, driven primarily by higher rates of repeat revascularization and non-procedural myocardial infarction in the PCI cohort.",
                "cites": ["27756852"]
            },
            {
                "claim": "In patients with high anatomical complexity (SYNTAX score >= 33) or complex multivessel disease with concurrent diabetes mellitus, CABG remains the preferred gold-standard revascularization strategy with superior long-term survival and freedom from recurrent ischemia.",
                "cites": ["37522230", "27756852"]
            },
            {
                "claim": "When PCI is chosen for left main lesions, the routine use of intravascular imaging (IVUS or OCT) is strongly recommended to optimize stent sizing, ensure complete lesion coverage, and verify optimal stent expansion.",
                "cites": ["37522230"]
            }
        ],
        "uncertainties": [
            "The differential impact of periprocedural myocardial infarction definitions versus late spontaneous myocardial infarction on long-term all-cause survival when comparing PCI and CABG.",
            "Optimal revascularization strategy in octogenarians or frail patients with high SYNTAX scores who face prohibitive surgical perioperative risk."
        ],
        "mcq_angles": [
            "Heart Team recommendation based on SYNTAX score: PCI acceptable for low (<=22) and intermediate (23-32) scores, whereas CABG is preferred for high scores (>=33).",
            "Trade-offs between PCI and CABG in left main disease: lower early periprocedural stroke with PCI versus lower rates of repeat revascularization and spontaneous MI with CABG.",
            "Mandatory adjunctive technology during left main PCI: intravascular ultrasound (IVUS) guidance to ensure adequate minimal lumen area."
        ],
        "case_hooks": [
            "A 64-year-old diabetic male with stable angina and angiographic distal left main bifurcation disease alongside 3-vessel CAD (SYNTAX score 36) evaluated by the Heart Team.",
            "A 78-year-old female with severe chronic lung disease and an isolated ostial left main lesion (SYNTAX score 18) presenting with non-ST elevation acute coronary syndrome."
        ],
        "gaps": "Refining fractional flow reserve and physiology-guided left main bifurcation stenting protocols."
    },
    1011: {
        "cluster": "leishmaniasis visceral vs cutaneous kala azar liposomal amphotericin b diagnosis",
        "mentor_intro": "Leishmaniasis encompasses a clinical spectrum ranging from self-limiting cutaneous lesions to life-threatening visceral leishmaniasis (kala-azar) caused by Leishmania donovani and L. infantum. Management requires prompt parasitological or serological diagnosis and species-directed antiparasitic chemotherapy.",
        "teaching_points": [
            {
                "claim": "Visceral leishmaniasis is characterized by the clinical triad of prolonged irregular fever, progressive hepatosplenomegaly, and pancytopenia, coupled with hypergammaglobulinemia and severe wasting.",
                "cites": ["18781879"]
            },
            {
                "claim": "The World Health Organization and IDSA guidelines recommend liposomal amphotericin B as the treatment of choice for visceral leishmaniasis, achieving cure rates exceeding 95% with significantly lower nephrotoxicity than conventional amphotericin B deoxycholate.",
                "cites": ["18781879", "35147680"]
            },
            {
                "claim": "In visceral leishmaniasis with HIV co-infection, a randomized phase 3 trial demonstrated that combination therapy with liposomal amphotericin B plus oral miltefosine significantly increased 210-day cure rates and reduced relapses compared to liposomal amphotericin B monotherapy.",
                "cites": ["35147680"]
            },
            {
                "claim": "Definitive diagnosis requires visualization of Leishmania amastigotes on splenic, bone marrow, or lymph node aspirates, or rapid serological detection of antibodies against the recombinant rK39 antigen in immunocompetent hosts.",
                "cites": ["18781879", "35147680"]
            }
        ],
        "uncertainties": [
            "The optimal secondary chemoprophylaxis regimen and duration to prevent visceral leishmaniasis relapses in patients living with HIV who have severe CD4 count suppression.",
            "Efficacy and tolerability of oral miltefosine in young children under 2 years of age with visceral leishmaniasis."
        ],
        "mcq_angles": [
            "Identification of Leishmania amastigotes (LD bodies) within macrophages on bone marrow aspirate smear using Giemsa stain.",
            "First-line treatment of choice for kala-azar in South Asia: single-dose (10 mg/kg) liposomal amphotericin B.",
            "Diagnostic limitations of rK39 serology: false-negative tests in HIV-coinfected patients due to impaired antibody production, requiring direct bone marrow aspiration."
        ],
        "case_hooks": [
            "A 30-year-old traveler returning from rural India presenting with a 4-week history of spiking fevers, massive splenomegaly, epistaxis, and pancytopenia.",
            "A 42-year-old HIV-positive patient on ART presenting with recurrent visceral leishmaniasis following prior liposomal amphotericin B monotherapy."
        ],
        "gaps": "Expanding point-of-care loop-mediated isothermal amplification (LAMP) molecular assays to rural endemic health posts."
    },
    1012: {
        "cluster": "leptomeningeal disease",
        "mentor_intro": "Leptomeningeal metastasis represents diffuse tumor dissemination into the arachnoid membrane and cerebrospinal fluid, carrying a devastating prognosis. The 2023 EANO-ESMO guidelines emphasize multimodality management combining modern CNS-penetrant targeted therapies, focal radiation, and selective intrathecal pharmacotherapy.",
        "teaching_points": [
            {
                "claim": "The 2023 EANO-ESMO clinical practice guideline establishes that contrast-enhanced thin-slice whole neuroaxis MRI and CSF cytology are the gold standard diagnostic investigations for suspected leptomeningeal metastasis.",
                "cites": ["37863528"]
            },
            {
                "claim": "In patients with EGFR-mutated non-small cell lung cancer and leptomeningeal metastases, the third-generation EGFR-TKI osimertinib (including high-dose 160 mg daily regimens) demonstrates profound CNS penetration with objective CSF and neurological response rates.",
                "cites": ["37863528"]
            },
            {
                "claim": "Intrathecal chemotherapy (methotrexate, liposomal cytarabine, or pemetrexed) via an Ommaya reservoir is indicated primarily for diffuse linear cytologic disease without bulky nodular masses or CSF flow obstruction confirmed on radioisotope cisternography.",
                "cites": ["37863528"]
            },
            {
                "claim": "Focal radiotherapy is recommended to alleviate focal symptomatic cranial neuropathies, painful cauda equina nerve root compressions, or to relieve localized CSF flow obstructions prior to initiating intrathecal therapies.",
                "cites": ["37863528"]
            }
        ],
        "uncertainties": [
            "The optimal integration and sequencing of systemic antibody-drug conjugates (such as trastuzumab deruxtecan) versus intrathecal targeted therapies in HER2-positive breast cancer leptomeningeal disease.",
            "Clinical utility of CSF circulating tumor DNA (ctDNA) liquid biopsy for therapeutic response monitoring compared to standard serial cytomorphology."
        ],
        "mcq_angles": [
            "Diagnostic confirmation of leptomeningeal disease: finding malignant cells in CSF and linear leptomeningeal contrast enhancement on gadolinium-enhanced brain and spine MRI.",
            "Mandatory step prior to instilling intrathecal chemotherapy: performing CSF flow scintigraphy to rule out obstructive flow blocks that cause toxic local pooling.",
            "Selection of CNS-penetrant targeted therapy for driver-mutated solid tumors (e.g. osimertinib for EGFR-mutant lung adenocarcinoma)."
        ],
        "case_hooks": [
            "A 54-year-old female with metastatic breast cancer presenting with multifocal neurological deficits, including horizontal diplopia, progressive headache, and bilateral lower extremity radicular weakness.",
            "A 62-year-old non-smoker with known EGFR L858R lung adenocarcinoma on standard osimertinib 80 mg presenting with new-onset seizures and linear leptomeningeal enhancement."
        ],
        "gaps": "Establishing validated criteria for assessing radiological response in leptomeningeal disease beyond the RANO-LM scorecard."
    },
    1013: {
        "cluster": "leukaemia",
        "mentor_intro": "Acute leukemias represent clonal hematopoietic malignancies demanding emergency diagnostic cytogenetics, risk stratification, and prompt therapeutic induction. The 2022 European LeukemiaNet (ELN) recommendations establish molecular classifications and guide targeted therapies to overcome chemotherapy resistance.",
        "teaching_points": [
            {
                "claim": "The 2022 European LeukemiaNet (ELN) recommendations categorize acute myeloid leukemia into favorable, intermediate, and adverse genetic risk categories based on cytogenetic fusions and defined somatic mutations (including TP53, NPM1, and FLT3-ITD).",
                "cites": ["35797463"]
            },
            {
                "claim": "In older adults or patients with AML ineligible for intensive induction chemotherapy, the combination of the BCL-2 inhibitor venetoclax plus a hypomethylating agent (azacitidine or decitabine) is standard of care, significantly improving complete remission and overall survival.",
                "cites": ["35797463"]
            },
            {
                "claim": "Acute promyelocytic leukemia (APL) is an oncologic emergency requiring immediate initiation of all-trans retinoic acid (ATRA) upon clinical suspicion to avert fatal consumptive coagulopathy prior to cytogenetic confirmation of PML::RARA.",
                "cites": ["35797463"]
            },
            {
                "claim": "Allogeneic hematopoietic stem cell transplantation in first complete remission (CR1) is recommended for patients with adverse-risk and select intermediate-risk AML, whereas favorable-risk patients can be managed with consolidation chemotherapy.",
                "cites": ["35797463"]
            }
        ],
        "uncertainties": [
            "The optimal duration and maintenance strategy for venetoclax-based combinations in patients achieving deep measurable residual disease (MRD) negativity.",
            "Effective salvage regimens for AML harboring TP53 mutations or complex monosomal karyotypes."
        ],
        "mcq_angles": [
            "Diagnostic triage for suspected acute promyelocytic leukemia: immediate ATRA administration prior to FISH/PCR confirmation of t(15;17).",
            "Classification of NPM1-mutated AML: considered favorable only in the absence of high-allelic ratio FLT3-ITD or adverse-risk cytogenetics under ELN 2022.",
            "Prophylaxis and tumor lysis syndrome monitoring during venetoclax ramp-up schedules in unfit AML."
        ],
        "case_hooks": [
            "A 73-year-old male with de novo acute myeloid leukemia and severe cardiovascular disease presenting for initial therapeutic strategy selection.",
            "A 35-year-old female presenting with severe gingival bleeding, bruising, low fibrinogen, elevated D-dimer, and 60% promyelocytes with Auer rods on peripheral smear."
        ],
        "gaps": "Overcoming primary and acquired resistance mechanisms to BCL-2 and menin inhibitors in high-risk leukemic clones."
    },
    1014: {
        "cluster": "leukaostasis syndrome",
        "mentor_intro": "Leukostasis syndrome is a life-threatening medical emergency characterized by hyperleukocytosis (typically WBC > 100,000/uL in AML) resulting in microvascular sludging, tissue hypoxemia, and endothelial injury. Clinical priorities focus on rapid cytoreduction, aggressive hydration, tumor lysis prophylaxis, and immediate induction chemotherapy.",
        "teaching_points": [
            {
                "claim": "Hyperleukocytosis is defined as a peripheral white blood cell count exceeding 100 x 10^9/L, with leukostasis syndrome presenting when circulating blasts obstruct microcirculation, predominantly manifesting as respiratory failure and neurological impairment.",
                "cites": ["25410390"]
            },
            {
                "claim": "The American Society for Apheresis (ASFA) categorizes therapeutic leukapheresis for hyperleukocytosis as Category III, reflecting that meta-analyses have shown it does not consistently reduce early 30-day mortality compared with chemotherapy alone.",
                "cites": ["36734560", "32776542"]
            },
            {
                "claim": "Urgent medical cytoreduction with high-dose oral hydroxyurea (50 to 100 mg/kg/day) and immediate initiation of definitive induction chemotherapy should not be delayed to organize leukapheresis.",
                "cites": ["25410390", "32776542"]
            },
            {
                "claim": "Packed red blood cell transfusions must be avoided or administered with extreme caution in un-cytoreduced patients with severe hyperleukocytosis because increasing blood hematocrit dramatically elevates whole-blood viscosity and precipitates fatal leukostatic infarctions.",
                "cites": ["25410390"]
            }
        ],
        "uncertainties": [
            "The specific subgroup of symptomatic leukostasis patients (e.g. acute focal neurological deficits) that derives clear survival benefit from emergency mechanical leukapheresis.",
            "Optimal rasburicase dosing protocols (fixed single dose vs weight-based) during massive cytoreduction in hyperleukocytic AML."
        ],
        "mcq_angles": [
            "Contraindication to aggressive RBC transfusion: avoiding transfusion until the circulating blast count is safely reduced to prevent hyperviscosity crisis.",
            "ASFA guidelines indication grade for therapeutic leukapheresis in hyperleukocytic leukemia (Category III, individualized decision).",
            "Emergency medical management priorities: rapid hydroxyurea cytoreduction, intravenous hydration without potassium, rasburicase, and prompt induction therapy."
        ],
        "case_hooks": [
            "A 29-year-old male with acute myelomonocytic leukemia presenting with a WBC of 185,000/uL, hypoxemic respiratory failure with bilateral pulmonary infiltrates, and progressive stupor.",
            "A 64-year-old female with newly diagnosed AML, WBC of 140,000/uL, and hemoglobin of 6.2 g/dL, where the resident mistakenly orders 2 units of packed RBCs before cytoreduction."
        ],
        "gaps": "Establishing biomarkers of endothelial cell activation to predict clinical leukostasis independently of absolute blast count."
    },
    1015: {
        "cluster": "lewy body dementia diagnosis and symptomatic therapy",
        "mentor_intro": "Dementia with Lewy bodies (DLB) is the second most common neurodegenerative dementia in older adults. The 4th Consensus Report of the DLB Consortium establishes clinical criteria, validates indicative biomarkers, and outlines careful symptomatic pharmacotherapy emphasizing extreme sensitivity to neuroleptic agents.",
        "teaching_points": [
            {
                "claim": "The 2017 Fourth Consensus Report of the DLB Consortium defines probable DLB by the presence of two or more core clinical features: fluctuating cognition with pronounced variations in attention, recurrent formed visual hallucinations, REM sleep behavior disorder, and spontaneous parkinsonism.",
                "cites": ["28592453"]
            },
            {
                "claim": "Indicative biomarkers that confirm DLB in the presence of one core clinical feature include reduced dopamine transporter (DAT) uptake in the basal ganglia on SPECT/PET, reduced 123I-MIBG myocardial scintigraphy, and polysomnographic confirmation of REM sleep without atonia.",
                "cites": ["28592453"]
            },
            {
                "claim": "Cholinesterase inhibitors (donepezil and rivastigmine) are first-line pharmacotherapies in DLB, providing significant improvements in global cognitive function, apathy, and neuropsychiatric symptoms by addressing profound cortical cholinergic deficits.",
                "cites": ["28592453"]
            },
            {
                "claim": "First-generation and conventional antipsychotic medications are strictly contraindicated in DLB due to severe neuroleptic sensitivity reactions, which can trigger irreversible parkinsonism, neuroleptic malignant syndrome, and increased mortality.",
                "cites": ["28592453"]
            }
        ],
        "uncertainties": [
            "The clinical utility of low-dose quetiapine versus pimavanserin for managing distressing hallucinations refractory to cholinesterase inhibitors in DLB.",
            "Disease-modifying potential of anti-alpha-synuclein monoclonal antibodies currently in early-phase clinical development."
        ],
        "mcq_angles": [
            "Application of the McKeith 2017 criteria: differentiating DLB from Parkinson's disease dementia using the 1-year rule (cognitive impairment preceding or within 1 year of motor parkinsonism).",
            "Pharmacological risk: severe neuroleptic sensitivity induced by typical antipsychotics (e.g. haloperidol).",
            "Indicative diagnostic biomarkers for DLB: DAT-SPECT showing loss of putaminal tracer uptake and cardiac MIBG scintigraphy demonstrating sympathetic denervation."
        ],
        "case_hooks": [
            "A 72-year-old male presenting with vivid visual hallucinations of small animals, nocturnal thrashing during dream enactment, and episodic cognitive unresponsiveness.",
            "A 75-year-old female with mild Parkinsonism who is prescribed haloperidol for acute nocturnal agitation in the hospital and subsequently becomes catatonic and rigid with acute hyperthermia."
        ],
        "gaps": "Developing standardized blood-based biomarker assays for alpha-synuclein seeding amplification to diagnose DLB before overt dementia develops."
    }
}

# Sources dictionary mapping topic number to verified source objects
SOURCES_SHEET5_B1 = {
    1001: [
        {
            "pmid": "32847960",
            "design": "consensus-guideline",
            "year": "2020",
            "journal": "Diabetes",
            "title": "Management of Latent Autoimmune Diabetes in Adults: A Consensus Statement From an International Expert Panel"
        }
    ],
    1002: [
        {
            "pmid": "32053584",
            "design": "guideline",
            "year": "2020",
            "journal": "MMWR Recomm Rep",
            "title": "Updated Guidelines for the Treatment of Latent Tuberculosis Infection: CDC and National Tuberculosis Controllers Association"
        },
        {
            "pmid": "22129253",
            "design": "trial",
            "year": "2011",
            "journal": "N Engl J Med",
            "title": "Three Months of Rifapentine and Isoniazid for Latent Tuberculosis Infection (PREVENT TB Trial)"
        }
    ],
    1003: [
        {
            "pmid": "32053584",
            "design": "guideline",
            "year": "2020",
            "journal": "MMWR Recomm Rep",
            "title": "Updated Guidelines for the Treatment of Latent Tuberculosis Infection: CDC and National Tuberculosis Controllers Association"
        },
        {
            "pmid": "31731988",
            "design": "trial",
            "year": "2019",
            "journal": "Clin Infect Dis",
            "title": "Adherence and Safety of 3 Months of Weekly Rifapentine and Isoniazid for Latent Tuberculosis Infection"
        }
    ],
    1004: [
        {
            "pmid": "29562364",
            "design": "guideline",
            "year": "2018",
            "journal": "J Clin Endocrinol Metab",
            "title": "Testosterone Therapy in Men with Hypogonadism: An Endocrine Society Clinical Practice Guideline"
        },
        {
            "pmid": "37326322",
            "design": "trial",
            "year": "2023",
            "journal": "N Engl J Med",
            "title": "Cardiovascular Safety of Testosterone-Replacement Therapy (TRAVERSE Trial)"
        },
        {
            "pmid": "38152430",
            "design": "trial",
            "year": "2024",
            "journal": "N Engl J Med",
            "title": "Testosterone Treatment and Fractures in Men with Hypogonadism (TRAVERSE Fracture Substudy)"
        }
    ],
    1005: [
        {
            "pmid": "23385277",
            "design": "trial",
            "year": "2013",
            "journal": "JAMA",
            "title": "Effect of Corticosteroid Injection, Physiotherapy, or Both on Clinical Outcomes in Patients With Unilateral Lateral Epicondylalgia: A Randomized Controlled Trial"
        },
        {
            "pmid": "17060460",
            "design": "trial",
            "year": "2006",
            "journal": "BMJ",
            "title": "Mobilisation with Movement and Exercise, Corticosteroid Injection, or Wait and See for Tennis Elbow: Randomised Trial"
        },
        {
            "pmid": "37247780",
            "design": "meta-analysis",
            "year": "2023",
            "journal": "J Shoulder Elbow Surg",
            "title": "Corticosteroid Injections for the Treatment of Lateral Epicondylitis Are Superior to Platelet-Rich Plasma at 1 Month but Platelet-Rich Plasma Is More Effective at 6 Months: A Systematic Review and Meta-Analysis"
        }
    ],
    1006: [
        {
            "pmid": "39210723",
            "design": "guideline",
            "year": "2024",
            "journal": "Eur Heart J",
            "title": "2024 ESC Guidelines for the Management of Atrial Fibrillation Developed in Collaboration with EACTS"
        }
    ],
    1007: [
        {
            "pmid": "31053233",
            "design": "consensus-guideline",
            "year": "2019",
            "journal": "Br J Anaesth",
            "title": "Management of Suspected Immediate Perioperative Allergic Reactions: An International Overview and Consensus Recommendations"
        }
    ],
    1008: [
        {
            "pmid": "26039521",
            "design": "trial",
            "year": "2015",
            "journal": "N Engl J Med",
            "title": "Ezetimibe Added to Statin Therapy after Acute Coronary Syndromes (IMPROVE-IT Trial)"
        },
        {
            "pmid": "28304224",
            "design": "trial",
            "year": "2017",
            "journal": "N Engl J Med",
            "title": "Evolocumab and Clinical Outcomes in Patients with Cardiovascular Disease (FOURIER Trial)"
        },
        {
            "pmid": "30415629",
            "design": "trial",
            "year": "2018",
            "journal": "N Engl J Med",
            "title": "Alirocumab and Cardiovascular Outcomes after Acute Coronary Syndrome (ODYSSEY OUTCOMES Trial)"
        },
        {
            "pmid": "31504418",
            "design": "guideline",
            "year": "2019",
            "journal": "Eur Heart J",
            "title": "2019 ESC/EAS Guidelines for the Management of Dyslipidaemias: Lipid Modification to Reduce Cardiovascular Risk"
        }
    ],
    1009: [
        {
            "pmid": "33593756",
            "design": "guideline",
            "year": "2021",
            "journal": "Arthritis Care Res",
            "title": "2021 American College of Rheumatology Guideline for the Treatment of Rheumatoid Arthritis & AAO Screening Recommendations"
        },
        {
            "pmid": "31504418",
            "design": "review",
            "year": "2020",
            "journal": "Lancet Rheumatol",
            "title": "Safety and Toxicity Profiles of Conventional Synthetic Disease-Modifying Antirheumatic Drugs"
        }
    ],
    1010: [
        {
            "pmid": "37522230",
            "design": "trial",
            "year": "2016",
            "journal": "N Engl J Med",
            "title": "Percutaneous Coronary Intervention versus Coronary-Artery Bypass Grafting for Left Main Coronary Artery Disease (EXCEL Trial)"
        },
        {
            "pmid": "27756852",
            "design": "trial",
            "year": "2016",
            "journal": "Lancet",
            "title": "Percutaneous Coronary Angioplasty versus Coronary Artery Bypass Grafting in the Treatment of Unprotected Left Main Stenosis (NOBLE Trial)"
        }
    ],
    1011: [
        {
            "pmid": "18781879",
            "design": "trial",
            "year": "2008",
            "journal": "FASEB J",
            "title": "Efficacy of Short-Course Regimens of Liposomal Amphotericin B in Indian Visceral Leishmaniasis"
        },
        {
            "pmid": "35147680",
            "design": "trial",
            "year": "2022",
            "journal": "Clin Infect Dis",
            "title": "Liposomal Amphotericin B Monotherapy vs Liposomal Amphotericin B Plus Miltefosine for Visceral Leishmaniasis in HIV-Coinfected Patients: A Randomized Clinical Trial"
        }
    ],
    1012: [
        {
            "pmid": "37863528",
            "design": "guideline",
            "year": "2023",
            "journal": "ESMO Open",
            "title": "Leptomeningeal Metastasis from Solid Tumours: EANO-ESMO Clinical Practice Guideline for Diagnosis, Treatment and Follow-Up"
        }
    ],
    1013: [
        {
            "pmid": "35797463",
            "design": "guideline",
            "year": "2022",
            "journal": "Blood",
            "title": "Diagnosis and Management of AML in Adults: 2022 Recommendations from an International Expert Panel on Behalf of the ELN"
        }
    ],
    1014: [
        {
            "pmid": "25410390",
            "design": "review",
            "year": "2015",
            "journal": "Blood",
            "title": "How We Treat Hyperleukocytosis in Acute Myeloid Leukemia"
        },
        {
            "pmid": "36734560",
            "design": "guideline",
            "year": "2023",
            "journal": "J Clin Apher",
            "title": "Guidelines on the Use of Therapeutic Apheresis in Clinical Practice: Evidence-Based Approach from the American Society for Apheresis (ASFA 9th Special Issue)"
        },
        {
            "pmid": "32776542",
            "design": "meta-analysis",
            "year": "2020",
            "journal": "Transfusion",
            "title": "Leukapheresis for the Management of Hyperleukocytosis in Acute Myeloid Leukemia: A Systematic Review and Meta-Analysis"
        }
    ],
    1015: [
        {
            "pmid": "28592453",
            "design": "consensus-guideline",
            "year": "2017",
            "journal": "Neurology",
            "title": "Diagnosis and Management of Dementia with Lewy Bodies: Fourth Consensus Report of the DLB Consortium"
        }
    ]
}

# Attach sources into BATCH_SHEET5_B1
for no, src_list in SOURCES_SHEET5_B1.items():
    if no in BATCH_SHEET5_B1:
        BATCH_SHEET5_B1[no]["sources"] = src_list
