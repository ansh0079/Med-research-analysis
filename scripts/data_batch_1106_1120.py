"""
data_batch_1106_1120.py

Batch 8 of Sheet 5 (Topics 1001-1250): Topics 1106 to 1120.
Contains clinical mentor synopses, verified landmark trials, and guidelines
with 100% citation closure, zero boilerplate, and 4-2-3-2-1 structure.
"""

BATCH_SHEET5_B8 = {
    1106: {
        "cluster": "Endocrinology / Metabolism",
        "mentor_intro": "Early intensive glycemic control with metformin in type 2 diabetes exerts a sustained 'glycemic legacy effect', conferring long-term protection against microvascular complications, myocardial infarction, and all-cause mortality that persists for decades even when HbA1c levels subsequently converge.",
        "teaching_points": [
            {
                "claim": "In the landmark UKPDS 34 trial, overweight patients randomized to intensive glucose control with metformin experienced significant risk reductions in any diabetes-related endpoint (32%; p=0.002), diabetes-related death (42%; p=0.017), and myocardial infarction (39%; p=0.01) compared with conventional dietary therapy.",
                "cites": ["9742977"]
            },
            {
                "claim": "The 10-year post-trial follow-up of UKPDS (UKPDS 80) established the 'legacy effect': despite prompt loss of glycemic differences between groups within one year of trial completion, patients originally allocated to metformin maintained significant persistent risk reductions in myocardial infarction (33%; p=0.005) and death from any cause (27%; p=0.002).",
                "cites": ["18784090"]
            },
            {
                "claim": "Metformin primarily suppresses hepatic gluconeogenesis and stimulates peripheral glucose disposal without increasing circulating insulin levels, producing glycemic control without intrinsic hypoglycemia risk or treatment-associated weight gain.",
                "cites": ["9742977", "25538310"]
            },
            {
                "claim": "ADA and EASD consensus recommendations highlight that immediate initiation of metformin at type 2 diabetes diagnosis establishes this durable metabolic memory, securing cardiovascular benefits that are difficult to replicate if intensive glycemic control is delayed until advanced vascular disease develops.",
                "cites": ["25538310", "18945920"]
            }
        ],
        "sources": [
            {
                "pmid": "9742977",
                "title": "Effect of intensive blood-glucose control with metformin on complications in overweight patients with type 2 diabetes (UKPDS 34)",
                "journal": "Lancet",
                "year": 1998,
                "design": "trial"
            },
            {
                "pmid": "18784090",
                "title": "10-year follow-up of intensive glucose control in type 2 diabetes (UKPDS 80)",
                "journal": "N Engl J Med",
                "year": 2008,
                "design": "trial"
            },
            {
                "pmid": "25538310",
                "title": "Management of hyperglycemia in type 2 diabetes, 2015: a patient-centered approach: update to a position statement of the American Diabetes Association and the European Association for the Study of Diabetes",
                "journal": "Diabetes Care",
                "year": 2015,
                "design": "guideline"
            },
            {
                "pmid": "18945920",
                "title": "Medical management of hyperglycemia in type 2 diabetes: a consensus algorithm for the initiation and adjustment of therapy",
                "journal": "Diabetes Care",
                "year": 2009,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Epigenetic mechanisms (histone methylation, chromatin remodeling) explaining the multi-decade maintenance of metabolic memory following early glycemic control.",
            "Whether modern SGLT2 inhibitors and GLP-1 receptor agonists confer synergistic or additive legacy cardiovascular effects when combined with upfront metformin."
        ],
        "mcq_angles": [
            "Findings of UKPDS 34 in overweight diabetics: metformin significantly reduced all-cause mortality and MI compared to conventional sulfonylurea/insulin therapy.",
            "Definition of the 'legacy effect' in UKPDS 80: persistent reduction in micro- and macrovascular events despite post-trial equalization of HbA1c.",
            "Differences in hypoglycemia and weight gain outcomes between metformin and sulfonylureas in early disease."
        ],
        "case_hooks": [
            "A 46-year-old newly diagnosed asymptomatic patient with type 2 diabetes and HbA1c 7.6% whose physician debates immediate metformin versus 6 months of diet alone.",
            "A 65-year-old patient with 15 years of well-controlled diabetes transitioning off metformin whose clinician reviews the long-term legacy benefits on cardiovascular mortality."
        ],
        "gaps": "Prospective trials evaluating whether re-intensification of glycemic control in late-stage type 2 diabetes can rescue the absence of an early legacy effect."
    },
    1107: {
        "cluster": "Endocrinology / Primary Care",
        "mentor_intro": "Metformin remains the foundational first-line biguanide oral antihyperglycemic agent for type 2 diabetes, lowering HbA1c by 1.0-1.5% through inhibition of mitochondrial respiration and hepatic gluconeogenesis while requiring routine monitoring for gastrointestinal intolerance and vitamin B12 malabsorption.",
        "teaching_points": [
            {
                "claim": "According to the ADA/EASD consensus statement, metformin is initiated at diagnosis in conjunction with lifestyle therapy, titrated gradually from 500 mg daily to a target maintenance dose of 2000 mg daily in divided doses to minimize gastrointestinal adverse effects.",
                "cites": ["36507646", "36148873"]
            },
            {
                "claim": "Molecularly, metformin inhibits mitochondrial respiratory chain complex I and activates AMP-activated protein kinase (AMPK), repressing hepatic gluconeogenesis genes (PEPCK, G6Pase) and enhancing peripheral insulin-mediated glucose uptake.",
                "cites": ["28776086"]
            },
            {
                "claim": "In a randomized placebo-controlled trial over 4.3 years, de Jager and colleagues demonstrated that long-term metformin treatment increased the risk of vitamin B12 deficiency (absolute risk increase 11.2%; NNH 9) and lowered folate concentrations, necessitating periodic B12 surveillance.",
                "cites": ["20488910"]
            },
            {
                "claim": "Extended-release (XR) metformin formulations achieve equivalent glycemic efficacy with significantly lower incidences of nausea, abdominal cramping, and osmotic diarrhea compared to immediate-release formulations.",
                "cites": ["36507646", "36148873"]
            }
        ],
        "sources": [
            {
                "pmid": "36507646",
                "title": "6. Glycemic Targets: Standards of Care in Diabetes-2023",
                "journal": "Diabetes Care",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": "36148873",
                "title": "Management of Hyperglycemia in Type 2 Diabetes, 2022. A Consensus Report by the American Diabetes Association (ADA) and the European Association for the Study of Diabetes (EASD)",
                "journal": "Diabetes Care",
                "year": 2022,
                "design": "guideline"
            },
            {
                "pmid": "28776086",
                "title": "The mechanisms of action of metformin",
                "journal": "Diabetologia",
                "year": 2017,
                "design": "review"
            },
            {
                "pmid": "20488910",
                "title": "Long term treatment with metformin in patients with type 2 diabetes and risk of vitamin B-12 deficiency: randomised placebo controlled trial",
                "journal": "BMJ",
                "year": 2010,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Clinical utility of universal routine annual serum vitamin B12 screening versus symptom-prompted testing in asymptomatic long-term metformin users.",
            "Comparative microbiome-mediated metabolic effects between extended-release and immediate-release metformin."
        ],
        "mcq_angles": [
            "Primary biochemical mechanism of action of metformin (inhibition of hepatic gluconeogenesis via mitochondrial complex I / AMPK).",
            "Screening for macrocytic anemia and peripheral neuropathy secondary to metformin-induced vitamin B12 deficiency.",
            "Strategies for managing early gastrointestinal intolerance (taking with meals, dose titration, switching to extended-release)."
        ],
        "case_hooks": [
            "A 58-year-old man taking metformin 1000 mg twice daily for 6 years who presents with progressive distal bilateral lower limb paresthesias and macrocytic red cell indices.",
            "A newly diagnosed 49-year-old woman developing severe abdominal bloating and diarrhea 3 days after starting immediate-release metformin 850 mg twice daily."
        ],
        "gaps": "Standardized dosing algorithms optimizing gut versus hepatic metformin delivery in patients with concomitant non-alcoholic fatty liver disease."
    },
    1108: {
        "cluster": "Pharmacology / Nephrology / Endocrinology",
        "mentor_intro": "Metformin requires vigilant dose titration aligned with renal filtration function to avoid drug accumulation and rare metformin-associated lactic acidosis (MALA), while serving as a proven off-label metabolic insulin-sensitizing therapy in polycystic ovary syndrome (PCOS).",
        "teaching_points": [
            {
                "claim": "FDA and KDIGO guidance mandates renal dosing based on estimated glomerular filtration rate (eGFR): metformin is safe at full dose when eGFR >=60 mL/min/1.73m2, requires dose reduction to a maximum of 1000 mg daily when eGFR is 30-44 mL/min/1.73m2, and is strictly contraindicated when eGFR is <30 mL/min/1.73m2.",
                "cites": ["25536168"]
            },
            {
                "claim": "Pharmacokinetic studies by Lalau and colleagues confirmed that while metformin plasma concentrations remain therapeutic and lactate levels physiological in CKD stage 3a and 3b with appropriate dose adjustment, unadjusted dosing in stage 4 (eGFR <30 mL/min/1.73m2) causes severe drug accumulation.",
                "cites": ["29339474"]
            },
            {
                "claim": "Metformin-associated lactic acidosis (MALA) is characterized by high anion gap metabolic acidosis, arterial blood lactate >5 mmol/L, and elevated metformin concentrations; large systematic reviews confirm an exceedingly low incidence (~3-10 per 100,000 patient-years) that does not exceed the baseline lactic acidosis rate in diabetic comparators when renal contraindications are observed.",
                "cites": ["20393934", "25536168"]
            },
            {
                "claim": "In international evidence-based PCOS guidelines, metformin is recommended to improve insulin resistance, lower androgen levels, assist with weight management, and restore ovulatory cyclicity, especially in women with BMI >=25 kg/m2 or metabolic risk factors.",
                "cites": ["30052961"]
            }
        ],
        "sources": [
            {
                "pmid": "25536168",
                "title": "Metformin in patients with type 2 diabetes and kidney disease: a systematic review",
                "journal": "JAMA",
                "year": 2014,
                "design": "meta-analysis"
            },
            {
                "pmid": "29339474",
                "title": "Metformin in patients with type 2 diabetes and chronic kidney disease: metformin accumulation and lactic acidosis in CKD stages 3A, 3B, and 4",
                "journal": "Diabetes Care",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": "20393934",
                "title": "Risk of fatal and nonfatal lactic acidosis with metformin use in type 2 diabetes mellitus: systematic review and meta-analysis of randomized trials",
                "journal": "Cochrane Database Syst Rev",
                "year": 2010,
                "design": "meta-analysis"
            },
            {
                "pmid": "30052961",
                "title": "Recommendations from the international evidence-based guideline for the assessment and management of polycystic ovary syndrome (PCOS)",
                "journal": "Hum Reprod",
                "year": 2018,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Utility of intermittent holding of metformin during intercurrent minor febrile illnesses in patients with eGFR 30-44 mL/min/1.73m2.",
            "Long-term metabolic and live-birth superiority of metformin combined with letrozole versus letrozole monotherapy in infertile PCOS."
        ],
        "mcq_angles": [
            "Specific eGFR thresholds: safe >=45, maximum 1000 mg/day for 30-44, contraindicated <30 mL/min/1.73m2.",
            "Temporary cessation of metformin prior to iodinated radiocontrast procedures in patients with eGFR <60 or acute kidney injury.",
            "Role of hemodialysis as the treatment of choice for severe MALA to clear both lactate and accumulated metformin."
        ],
        "case_hooks": [
            "A 72-year-old diabetic woman on metformin 1000 mg twice daily presenting with dehydration from acute gastroenteritis, eGFR dropping from 55 to 22 mL/min, and blood lactate 8.2 mmol/L.",
            "A 26-year-old woman with PCOS, oligomenorrhea, and hirsutism seeking non-hormonal treatment to assist with weight management and cycle regularity."
        ],
        "gaps": "Prospective randomized trials evaluating renal safety and pharmacokinetics of ultra-low dose metformin (500 mg daily) in stable CKD stage 4 (eGFR 20-29 mL/min/1.73m2)."
    },
    1109: {
        "cluster": "Rheumatology",
        "mentor_intro": "Early aggressive treatment in rheumatoid arthritis (RA) prevents irreversible structural joint damage; comparative effectiveness trials show that conventional oral triple synthetic DMARD therapy achieves clinical disease control and radiographic non-inferiority comparable to biological anti-TNF combination regimens at substantially lower cost.",
        "teaching_points": [
            {
                "claim": "In the randomized double-blind TEAR trial, early aggressive combination therapy (oral triple therapy: methotrexate + sulfasalazine + hydroxychloroquine vs etanercept + methotrexate) produced immediate and equivalent disease activity score reductions (DAS28-ESR) and equivalent preservation of radiographic progression over 2 years.",
                "cites": ["22508468"]
            },
            {
                "claim": "The randomized Swefot trial confirmed that among early RA patients with inadequate response to methotrexate monotherapy at 3 months, addition of sulfasalazine and hydroxychloroquine (triple therapy) produced durable clinical responses comparable to biological anti-TNF addition through 24 months.",
                "cites": ["22464344"]
            },
            {
                "claim": "In the RACAT non-inferiority trial, oral triple therapy was clinically non-inferior to etanercept plus methotrexate in patients with active RA despite methotrexate monotherapy, with successful cross-over demonstrating that patients failing triple therapy responded effectively to anti-TNF rescue.",
                "cites": ["23758277"]
            },
            {
                "claim": "EULAR guidelines recommend starting conventional synthetic DMARD (csDMARD) monotherapy with methotrexate rapidly at RA diagnosis, with progression to csDMARD combination or biologic DMARD (bDMARD) therapy if treatment targets (remission or low disease activity) are not achieved by 3-6 months.",
                "cites": ["36357155"]
            }
        ],
        "sources": [
            {
                "pmid": "22508468",
                "title": "A randomized comparative effectiveness study of oral triple therapy versus etanercept plus methotrexate in early aggressive rheumatoid arthritis: the treatment of Early Aggressive Rheumatoid Arthritis Trial",
                "journal": "Arthritis Rheum",
                "year": 2012,
                "design": "trial"
            },
            {
                "pmid": "22464344",
                "title": "Conventional combination treatment versus biological treatment in methotrexate-refractory early rheumatoid arthritis: 2-year results of the randomised, open-label Swefot trial",
                "journal": "Lancet",
                "year": 2012,
                "design": "trial"
            },
            {
                "pmid": "23758277",
                "title": "Therapies for active rheumatoid arthritis after methotrexate failure (RACAT)",
                "journal": "N Engl J Med",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": "36357155",
                "title": "EULAR recommendations for the management of rheumatoid arthritis with synthetic and biological disease-modifying antirheumatic drugs: 2022 update",
                "journal": "Ann Rheum Dis",
                "year": 2023,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Biomarkers predicting patients who specifically require upfront biological or targeted synthetic DMARDs (JAK inhibitors) rather than initial csDMARD triple therapy.",
            "Comparative long-term adherence and gastrointestinal tolerability of oral triple therapy vs single-injection biologic plus methotrexate."
        ],
        "mcq_angles": [
            "Components of conventional oral triple therapy: methotrexate, sulfasalazine, and hydroxychloroquine.",
            "Findings of the TEAR and RACAT trials: non-inferiority of oral triple therapy to etanercept plus MTX in DAS28 reduction.",
            "Initial step recommended by EULAR guidelines: MTX monotherapy + short-term bridging glucocorticoids before stepping up."
        ],
        "case_hooks": [
            "A 38-year-old teacher with newly diagnosed seropositive RA, 12 swollen joints, and elevated CRP considering upfront triple therapy vs biologic therapy.",
            "A 52-year-old man with persistent moderate RA activity after 4 months of optimal methotrexate monotherapy whose insurance denies biologic authorization."
        ],
        "gaps": "Cost-effectiveness and health equity outcomes of mandatory initial oral triple therapy trials prior to biologic approval in diverse socioeconomic healthcare systems."
    },
    1110: {
        "cluster": "Rheumatology / Clinical Pharmacology",
        "mentor_intro": "Methotrexate is the anchor synthetic DMARD for rheumatoid arthritis, requiring weekly oral or subcutaneous administration paired with mandatory folic acid supplementation, structured blood monitoring, and early recognition of hepatotoxic, hematologic, and pulmonary toxicities.",
        "teaching_points": [
            {
                "claim": "ACR and EULAR guidelines recommend initiating oral methotrexate at 15 mg once weekly, escalating rapidly by 2.5-5 mg every 2-4 weeks to a target dose of 20-25 mg once weekly to establish disease control within the critical early therapeutic window.",
                "cites": ["34101387", "19033291"]
            },
            {
                "claim": "A Cochrane systematic review confirmed that routine folic acid supplementation (5-10 mg weekly, taken 24-48 hours after MTX) reduces methotrexate-induced hepatic transaminitis by 73% (RR 0.27; 95% CI 0.17-0.44) and reduces gastrointestinal adverse events and trial discontinuation without impairing DMARD efficacy.",
                "cites": ["23728635"]
            },
            {
                "claim": "Switching from oral to subcutaneous methotrexate significantly improves bioavailability, bypasses gut saturable active transport mechanisms, and provides superior clinical efficacy with lower gastrointestinal toxicity in patients with inadequate response or intolerance to oral doses >=15 mg/week.",
                "cites": ["19033291", "34101387"]
            },
            {
                "claim": "Safety monitoring requires baseline complete blood count, transaminases, and renal function, repeated every 2-4 weeks for the first 3 months, then every 8-12 weeks thereafter; transient transaminase elevations <3x upper limit of normal warrant dose reduction rather than permanent drug cessation.",
                "cites": ["19054825", "34101387"]
            }
        ],
        "sources": [
            {
                "pmid": "34101387",
                "title": "2021 American College of Rheumatology Guideline for the Treatment of Rheumatoid Arthritis",
                "journal": "Arthritis Care Res",
                "year": 2021,
                "design": "guideline"
            },
            {
                "pmid": "23728635",
                "title": "Folic acid and folinic acid for reducing side effects in patients receiving methotrexate for rheumatoid arthritis",
                "journal": "Cochrane Database Syst Rev",
                "year": 2013,
                "design": "meta-analysis"
            },
            {
                "pmid": "19033291",
                "title": "Optimal dosage and route of administration of methotrexate in rheumatoid arthritis: a systematic review",
                "journal": "Ann Rheum Dis",
                "year": 2009,
                "design": "review"
            },
            {
                "pmid": "19054825",
                "title": "Long-term safety of methotrexate: an updated systematic literature research",
                "journal": "Ann Rheum Dis",
                "year": 2009,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Threshold cumulative lifetime dose of methotrexate necessitating non-invasive hepatic fibrosis screening (transient elastography/FibroScan).",
            "Optimal folic acid dosing schedule: 1 mg daily vs single 5 mg weekly dose."
        ],
        "mcq_angles": [
            "Weekly dosing schedule of methotrexate: daily dosing is a catastrophic medication error leading to bone marrow aplasia.",
            "Evidence-based benefits of co-administering folic acid: significant reduction in transaminitis and mucosal/GI side effects.",
            "Indications for subcutaneous formulation: GI intolerance or failure of oral titration beyond 15 mg/week."
        ],
        "case_hooks": [
            "An 81-year-old RA patient inadvertently dispensed methotrexate for daily instead of weekly use presenting with mucositis, bloody diarrhea, and pancytopenia.",
            "A 45-year-old woman with RA complaining of debilitating nausea 24 hours after weekly oral methotrexate 20 mg evaluated for route switching."
        ],
        "gaps": "Pharmacogenomic markers (e.g., MTHFR polymorphisms) predicting specific methotrexate toxicity or non-response in diverse ethnic populations."
    },
    1111: {
        "cluster": "Clinical Pharmacology / Rheumatology / Oncology",
        "mentor_intro": "Methotrexate toxicity spans idiosyncratic pulmonary hypersensitivity, cumulative hepatotoxicity, myelosuppression, and oncologic overdose nephrotoxicity, demanding structured surveillance protocols, urgent recognition of acute pneumonitis, and emergency rescue algorithms.",
        "teaching_points": [
            {
                "claim": "In the large cardiovascular inflammation reduction trial (CIRT) evaluating 4,786 patients on low-dose methotrexate (15-20 mg/week), MTX caused modest elevations in liver enzymes, mild reductions in white blood cell counts, and an increased incidence of non-basal cell skin cancers without catastrophic liver failure or pulmonary fibrosis.",
                "cites": ["30415610"]
            },
            {
                "claim": "Acute methotrexate pneumonitis is an idiosyncratic, life-threatening hypersensitivity reaction presenting with subacute dry cough, dyspnea, fever, peripheral eosinophilia, and bilateral ground-glass opacities; it requires immediate and permanent discontinuation of methotrexate and high-dose corticosteroid therapy.",
                "cites": ["24694119"]
            },
            {
                "claim": "In high-dose oncology regimens (>=500 mg/m2), methotrexate precipitates in renal tubules causing acute kidney injury; prevention mandates vigorous intravenous hydration, urinary alkalinization to pH >=7.0, leucovorin (folinic acid) rescue, and emergent glucarpidase in refractory toxic accumulation.",
                "cites": ["27663450"]
            },
            {
                "claim": "Drug interactions with NSAIDs, trimethoprim-sulfamethoxazole, penicillin, and proton pump inhibitors impair renal tubular secretion or displace methotrexate from albumin binding, precipitating severe myelosuppression.",
                "cites": ["22678970", "27663450"]
            }
        ],
        "sources": [
            {
                "pmid": "30415610",
                "title": "Low-Dose Methotrexate for the Prevention of Atherosclerotic Events (CIRT)",
                "journal": "N Engl J Med",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "27663450",
                "title": "Preventing and managing toxicities of high-dose methotrexate",
                "journal": "Oncologist",
                "year": 2016,
                "design": "review"
            },
            {
                "pmid": "24694119",
                "title": "Methotrexate and lung disease in rheumatoid arthritis: a systematic review and meta-analysis of randomized controlled trials",
                "journal": "Arthritis Res Ther",
                "year": 2014,
                "design": "meta-analysis"
            },
            {
                "pmid": "22678970",
                "title": "American College of Rheumatology 2012 recommendations for the use of disease-modifying antirheumatic drugs and biologic agents in the treatment of rheumatoid arthritis",
                "journal": "Arthritis Care Res",
                "year": 2012,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Distinguishing methotrexate hypersensitivity pneumonitis from rheumatoid arthritis-associated interstitial lung disease (RA-ILD) or opportunistic Pneumocystis jirovecii pneumonia.",
            "Long-term significance of isolated transaminase elevations up to 2x ULN in patients with normal transient elastography scores."
        ],
        "mcq_angles": [
            "Contraindication of co-prescribing trimethoprim-sulfamethoxazole with methotrexate due to synergistic folate antagonism and lethal marrow aplasia.",
            "Distinction between leucovorin (folinic acid) rescue in high-dose oncologic overdose vs standard low-dose weekly folic acid in rheumatology.",
            "Glucarpidase (carboxypeptidase G2) mechanism: enzymatic cleavage of methotrexate into inactive metabolites in renal failure."
        ],
        "case_hooks": [
            "A 67-year-old RA patient prescribed co-trimoxazole for a urinary tract infection presenting 5 days later with mouth ulcers, fever, and absolute neutrophil count 0.1 x 10^9/L.",
            "A patient with osteosarcoma receiving high-dose MTX who develops acute oliguric renal failure with plasma methotrexate level >50 micromol/L at 48 hours."
        ],
        "gaps": "Prospective validation of circulating microRNA-122 as a non-invasive monitor for early subclinical methotrexate hepatotoxicity."
    },
    1112: {
        "cluster": "Critical Care / Cardiac Surgery",
        "mentor_intro": "Vasoplegic shock following cardiopulmonary bypass is characterized by profound systemic hypotension refractory to high-dose catecholaminergic vasopressors; methylene blue restores systemic vascular resistance by selectively inhibiting inducible nitric oxide synthase and soluble guanylyl cyclase.",
        "teaching_points": [
            {
                "claim": "In a randomized controlled trial by Levin and colleagues of patients developing vasoplegic syndrome after cardiac surgery, intravenous methylene blue (1.5 mg/kg infusion over 1 hour) produced rapid, sustained arterial blood pressure recovery and significantly reduced mortality (0% vs 21.4%; p=0.01) compared with placebo.",
                "cites": ["14759425"]
            },
            {
                "claim": "Methylene blue acts as an inhibitor of both inducible nitric oxide synthase (iNOS) and soluble guanylyl cyclase (sGC), terminating excessive cyclic GMP generation and restoring vascular smooth muscle responsiveness to circulating catecholamines.",
                "cites": ["19324183", "26526139"]
            },
            {
                "claim": "A 2022 systematic review and meta-analysis by Lenglet and colleagues demonstrated that methylene blue administration in post-cardiac surgery vasoplegia was associated with a significant reduction in vasopressor requirements, shorter ICU stay, and decreased operative mortality.",
                "cites": ["36443831"]
            },
            {
                "claim": "Clinicians must recognize critical contraindications and toxicities: methylene blue is a potent monoamine oxidase inhibitor (MAOI) that can precipitate life-threatening serotonin syndrome when co-administered with serotonergic agents (SSRIs/SNRIs) and can trigger acute hemolysis in glucose-6-phosphate dehydrogenase (G6PD) deficiency.",
                "cites": ["26526139", "36443831"]
            }
        ],
        "sources": [
            {
                "pmid": "14759425",
                "title": "Methylene blue reduces mortality and morbidity in vasoplegic patients after cardiac surgery",
                "journal": "Ann Thorac Surg",
                "year": 2004,
                "design": "trial"
            },
            {
                "pmid": "36443831",
                "title": "Methylene blue in cardiac surgery vasoplegic shock: a systematic review and meta-analysis",
                "journal": "Crit Care",
                "year": 2022,
                "design": "meta-analysis"
            },
            {
                "pmid": "26526139",
                "title": "Methylene blue: magic bullet for vasoplegia, or another disappointment?",
                "journal": "J Cardiothorac Vasc Anesth",
                "year": 2016,
                "design": "review"
            },
            {
                "pmid": "19324183",
                "title": "Vasoplegic syndrome after cardiac surgery: the role of the nitric oxide-cyclic guanosine monophosphate pathway",
                "journal": "Ann Thorac Surg",
                "year": 2009,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Optimal timing: prophylactic administration in high-risk cardiac surgery patients (e.g., LVAD implantation, pre-op ACE inhibitor use) vs rescue therapy in established shock.",
            "Hemodynamic dosing regimens: bolus 1.5-2 mg/kg vs continuous maintenance infusions (0.25-0.5 mg/kg/h)."
        ],
        "mcq_angles": [
            "Pharmacological target of methylene blue: inhibition of soluble guanylyl cyclase (sGC) and nitric oxide synthase (NOS).",
            "Severe drug interaction: precipitation of serotonin toxicity in patients receiving SSRI/SNRI medications due to MAO-A inhibition.",
            "Spurious artifactual pulse oximetry desaturation down to ~85% caused by light absorption overlap without true arterial hypoxemia."
        ],
        "case_hooks": [
            "A 64-year-old man weaning from cardiopulmonary bypass with MAP 45 mmHg despite 0.3 mcg/kg/min noradrenaline and 0.04 units/min vasopressin evaluated for methylene blue.",
            "An ICU patient with refractory vasoplegia who develops profound hyperthermia, clonus, and agitation following methylene blue infusion while on chronic sertraline."
        ],
        "gaps": "Multicenter phase 3 randomized controlled trials evaluating long-term renal and neurologic outcomes of upfront methylene blue in septic vs postcardiotomy vasoplegia."
    },
    1113: {
        "cluster": "Cardiology",
        "mentor_intro": "Metoprolol succinate controlled-release/extended-release (CR/XL) is one of three guideline-directed beta-blockers proven to improve survival in heart failure with reduced ejection fraction (HFrEF), reducing all-cause mortality, sudden cardiac death, and hospitalization.",
        "teaching_points": [
            {
                "claim": "In the landmark MERIT-HF randomized trial, metoprolol succinate CR/XL added to standard therapy in 3,991 patients with NYHA class II-IV heart failure and ejection fraction <=40% reduced all-cause mortality by 34% (RR 0.66; 95% CI 0.53-0.81; p=0.00009) and sudden death by 41%.",
                "cites": ["10376614"]
            },
            {
                "claim": "The COMET trial proved that the formulations are not interchangeable: carvedilol produced significantly superior survival compared to short-acting metoprolol tartrate, emphasizing that guideline-directed survival benefits are specific to metoprolol succinate CR/XL and cannot be extrapolated to metoprolol tartrate.",
                "cites": ["12853193"]
            },
            {
                "claim": "ESC and AHA/ACC guidelines mandate initiating metoprolol succinate at low doses (12.5-25 mg once daily) and titrating every 2 weeks toward the target dose of 200 mg once daily, as trial benefits were achieved at high target doses.",
                "cites": ["34447992", "35363499"]
            },
            {
                "claim": "Cardioselective beta-1 adrenergic blockade reverses chronic sympathetic neurohormonal overdrive, suppresses ventricular tachyarrhythmias, and promotes reverse left ventricular remodeling with progressive recovery of ejection fraction.",
                "cites": ["10376614", "35363499"]
            }
        ],
        "sources": [
            {
                "pmid": "10376614",
                "title": "Effect of metoprolol CR/XL in chronic heart failure: Metoprolol CR/XL Randomised Intervention Trial in Congestive Heart Failure (MERIT-HF)",
                "journal": "Lancet",
                "year": 1999,
                "design": "trial"
            },
            {
                "pmid": "12853193",
                "title": "Comparison of carvedilol and metoprolol tartrate on clinical outcomes in patients with heart failure in the Carvedilol Or Metoprolol European Trial (COMET)",
                "journal": "Lancet",
                "year": 2003,
                "design": "trial"
            },
            {
                "pmid": "34447992",
                "title": "2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure",
                "journal": "Eur Heart J",
                "year": 2021,
                "design": "guideline"
            },
            {
                "pmid": "35363499",
                "title": "2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure",
                "journal": "Circulation",
                "year": 2022,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Comparative outcome benefits between metoprolol succinate and carvedilol in patients with concomitant HFrEF and chronic obstructive pulmonary disease.",
            "Safety and efficacy of beta-blocker continuation versus dose reduction during acute decompensated heart failure hospitalizations."
        ],
        "mcq_angles": [
            "Mortality reduction in MERIT-HF: 34% reduction in all-cause mortality with metoprolol succinate CR/XL.",
            "Critical pharmacological distinction between metoprolol succinate (once daily, proven survival in MERIT-HF) and metoprolol tartrate (twice daily, failed in COMET).",
            "Target daily maintenance dose in HFrEF: 200 mg once daily."
        ],
        "case_hooks": [
            "A 60-year-old man with ischemic cardiomyopathy and LVEF 28% whose community pharmacy inadvertently substitutes metoprolol tartrate 25 mg bid for metoprolol succinate 50 mg daily.",
            "A patient with stable NYHA class II HFrEF taking metoprolol succinate 50 mg daily evaluated in clinic for guideline-directed up-titration toward 200 mg daily."
        ],
        "gaps": "Real-world registry implementation strategies to overcome clinician therapeutic inertia in up-titrating beta-blockers to target doses."
    },
    1114: {
        "cluster": "Critical Care / Anaesthesia",
        "mentor_intro": "Methylene blue administration represents a targeted hemodynamic rescue therapy for refractory vasoplegic syndrome following cardiopulmonary bypass, arresting downstream cyclic GMP-mediated vasodilation through dual inhibition of nitric oxide synthase and soluble guanylyl cyclase.",
        "teaching_points": [
            {
                "claim": "Randomized clinical trial evidence from Levin and colleagues established that early infusion of methylene blue (1.5 mg/kg over 1 hour) in patients with postcardiotomy vasoplegia resolved shock, shortened vasopressor duration from 71 to 17 hours, and eliminated vasoplegia-related mortality.",
                "cites": ["14759425"]
            },
            {
                "claim": "Vasoplegia in cardiac surgery involves pathological endothelial nitric oxide synthase (eNOS) and inducible nitric oxide synthase (iNOS) upregulation, driving massive vascular smooth muscle cyclic GMP synthesis; methylene blue directly blocks sGC and scavenges nitric oxide.",
                "cites": ["19324183", "16859543"]
            },
            {
                "claim": "Systematic reviews of rescue rescue therapy across refractory cardiac and septic shock indicate that methylene blue consistently elevates mean arterial pressure and systemic vascular resistance while reducing vasopressor dependency index.",
                "cites": ["16183296", "16859543"]
            },
            {
                "claim": "Safety evaluation requires careful screening for concurrent serotonergic medications to prevent fatal serotonin syndrome, recognition of transient pulse oximeter interference, and avoidance in known G6PD deficiency due to Heinz body hemolytic anemia.",
                "cites": ["19324183", "16183296"]
            }
        ],
        "sources": [
            {
                "pmid": "14759425",
                "title": "Methylene blue reduces mortality and morbidity in vasoplegic patients after cardiac surgery",
                "journal": "Ann Thorac Surg",
                "year": 2004,
                "design": "trial"
            },
            {
                "pmid": "19324183",
                "title": "Vasoplegic syndrome after cardiac surgery: the role of the nitric oxide-cyclic guanosine monophosphate pathway",
                "journal": "Ann Thorac Surg",
                "year": 2009,
                "design": "review"
            },
            {
                "pmid": "16859543",
                "title": "Use of methylene blue in sepsis and refractory vasoplegic shock",
                "journal": "Crit Care",
                "year": 2006,
                "design": "review"
            },
            {
                "pmid": "16183296",
                "title": "Vasoplegic syndrome—the role of methylene blue",
                "journal": "Eur J Cardiothorac Surg",
                "year": 2005,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Efficacy of second rescue boluses or continuous infusions in patients who exhibit transient hemodynamic rebound after initial bolus.",
            "Interaction between methylene blue and concurrent arginine vasopressin or angiotensin II infusions in vasodilatory shock."
        ],
        "mcq_angles": [
            "Enzymatic targets of methylene blue: soluble guanylyl cyclase (sGC) and inducible nitric oxide synthase (iNOS).",
            "Hemolysis risk in glucose-6-phosphate dehydrogenase (G6PD) deficiency.",
            "Serotonergic drug-drug interaction caused by monoamine oxidase A inhibition."
        ],
        "case_hooks": [
            "A patient after prolonged cardiopulmonary bypass developing profound distributive shock refractory to noradrenaline and vasopressin receiving methylene blue rescue.",
            "A cardiac surgical patient developing an abrupt false saturation drop to 84% on peripheral pulse oximetry within minutes of methylene blue administration."
        ],
        "gaps": "Prospective registries evaluating cellular mitochondrial respiration and microvascular flow alterations following clinical methylene blue rescue."
    },
    1115: {
        "cluster": "Haematology / Critical Care",
        "mentor_intro": "Microangiopathic haemolytic anaemia (MAHA) is a clinicopathologic syndrome defined by red blood cell fragmentation (schistocytes on peripheral blood smear), severe thrombocytopenia, and microvascular thrombosis, requiring rapid diagnostic discrimination between thrombotic thrombocytopenic purpura (TTP), hemolytic uremic syndrome (HUS), and disseminated intravascular coagulation (DIC).",
        "teaching_points": [
            {
                "claim": "In the randomized HERCULES trial, the anti-vWF nanobody caplacizumab added to plasma exchange and immunosuppression in immune TTP significantly reduced the time to platelet count response, reduced TTP-related deaths, recurrences, or thromboembolic events by 74% (12.7% vs 49.3%; p<0.001), and prevented refractoriness.",
                "cites": ["30625070"]
            },
            {
                "claim": "TTP is defined by severe deficiency of ADAMTS13 activity (<10%), while pre-test probability is rapidly quantified by the PLASMIC score; scores >=6 indicate high risk of severe ADAMTS13 deficiency and mandate immediate plasma exchange and corticosteroids without awaiting enzyme results.",
                "cites": ["28416507", "22670719"]
            },
            {
                "claim": "Atypical hemolytic uremic syndrome (aHUS) is mediated by uncontrolled alternative complement pathway activation; early initiation of terminal complement C5 inhibitors (eculizumab or ravulizumab) halts complement-mediated endothelial injury, normalizes hematologic parameters, and recovers renal function.",
                "cites": ["28242109"]
            },
            {
                "claim": "Platelet transfusions are strictly contraindicated in suspected TTP unless life-threatening hemorrhage is present, because exogenous platelets fuel disseminated microvascular thrombosis and have precipitated acute myocardial infarction and stroke.",
                "cites": ["22670719", "28416507"]
            }
        ],
        "sources": [
            {
                "pmid": "30625070",
                "title": "Caplacizumab treatment for acquired thrombotic thrombocytopenic purpura (HERCULES)",
                "journal": "N Engl J Med",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "22670719",
                "title": "Guidelines on the diagnosis and management of thrombotic thrombocytopenic purpura and other thrombotic microangiopathies",
                "journal": "Br J Haematol",
                "year": 2012,
                "design": "guideline"
            },
            {
                "pmid": "28242109",
                "title": "Haemolytic uraemic syndrome",
                "journal": "Lancet",
                "year": 2017,
                "design": "review"
            },
            {
                "pmid": "28416507",
                "title": "Thrombotic thrombocytopenic purpura",
                "journal": "Blood",
                "year": 2017,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Duration of caplacizumab therapy following normalization of platelet counts in patients with persistently suppressed ADAMTS13 activity.",
            "Discontinuation protocols for complement inhibitor therapy in patients with genetic vs unmapped atypical HUS in stable remission."
        ],
        "mcq_angles": [
            "Diagnostic blood film hallmark of MAHA: presence of schistocytes (helmet cells) exceeding 1% of red cells.",
            "Contraindication to platelet transfusions in TTP.",
            "PLASMIC score criteria predicting severe ADAMTS13 deficiency: platelets <30, hemolysis, MCV <90, INR <1.5, creatinine <2.0 mg/dL, no active cancer, no solid organ transplant."
        ],
        "case_hooks": [
            "A 32-year-old woman presenting with confusion, petechiae, platelets 14 x 10^9/L, Hb 7.8 g/dL, LDH 1450 U/L, and multiple schistocytes on blood film.",
            "A 7-year-old child presenting with acute anuric renal failure, thrombocytopenia, and bloody diarrhea following Shiga toxin-producing E. coli (STEC) infection."
        ],
        "gaps": "Rapid point-of-care ADAMTS13 activity assays providing bedside turnaround within 30 minutes to eliminate diagnostic ambiguity."
    },
    1116: {
        "cluster": "Gastroenterology",
        "mentor_intro": "Microscopic colitis, encompassing collagenous colitis and lymphocytic colitis, is a chronic inflammatory disorder of the large bowel characterized by chronic watery, non-bloody diarrhea and endoscopically normal colonic mucosa, definitively diagnosed by histopathological biopsy and treated primarily with oral budesonide.",
        "teaching_points": [
            {
                "claim": "European Microscopic Colitis Group (EMCG) and AGA guidelines establish that colonoscopy with multiple mucosal biopsies (both right and left colon) is mandatory, as macroscopically the mucosal appearance is normal or near-normal despite extensive microscopic inflammation.",
                "cites": ["30071227", "26584602"]
            },
            {
                "claim": "Histopathological hallmarks differentiate the two subtypes: collagenous colitis features a thickened subepithelial collagen band (>=10 micrometers), while lymphocytic colitis is defined by >=20 intraepithelial lymphocytes per 100 surface epithelial cells.",
                "cites": ["30071227", "16423889"]
            },
            {
                "claim": "Cochrane systematic reviews demonstrate that oral budesonide (9 mg daily for 6-8 weeks) is the gold standard first-line treatment for induction of clinical remission (RR 7.35; 95% CI 2.43-22.2), significantly outperforming mesalazine or placebo.",
                "cites": ["29152737"]
            },
            {
                "claim": "Risk factors and triggers include female sex, age >60 years, concurrent autoimmune diseases (celiac disease, Hashimoto thyroiditis), and frequent culprit medications (NSAIDs, proton pump inhibitors, SSRIs, and statins) that should be discontinued upon diagnosis.",
                "cites": ["30071227", "16423889"]
            }
        ],
        "sources": [
            {
                "pmid": "30071227",
                "title": "European Microscopic Colitis Group (EMCG) statements and recommendations on the management of microscopic colitis",
                "journal": "Gastroenterology",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": "26584602",
                "title": "American Gastroenterological Association Institute Technical Review on the Medical Management of Microscopic Colitis",
                "journal": "Gastroenterology",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": "29152737",
                "title": "Budesonide for induction of remission in collagenous and lymphocytic colitis",
                "journal": "Cochrane Database Syst Rev",
                "year": 2017,
                "design": "meta-analysis"
            },
            {
                "pmid": "16423889",
                "title": "Systematic review: microscopic colitis",
                "journal": "Gut",
                "year": 2006,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Optimal biologic or immunomodulator therapy (anti-TNF vs vedolizumab vs thiopurines) in budesonide-refractory or budesonide-dependent disease.",
            "Long-term bone density monitoring requirements in patients requiring multi-year low-dose budesonide maintenance."
        ],
        "mcq_angles": [
            "Imperative need for colonic biopsies despite completely normal macroscopic endoscopy findings.",
            "Histological threshold for lymphocytic colitis: >=20 intraepithelial lymphocytes per 100 epithelial cells.",
            "Pharmacological superiority of budesonide (high first-pass hepatic metabolism) over conventional systemic steroids or mesalamine."
        ],
        "case_hooks": [
            "A 68-year-old woman with chronic nocturnal watery diarrhea and 8 kg weight loss whose colonoscopy report is reported as 'entirely normal'.",
            "A 62-year-old man taking omeprazole and sertraline diagnosed with collagenous colitis evaluating medication discontinuation and budesonide initiation."
        ],
        "gaps": "Prospective trials evaluating non-invasive biomarkers (fecal calprotectin, eosinophil protein X) in monitoring disease flare and remission."
    },
    1117: {
        "cluster": "Gastroenterology / Clinical Pharmacology",
        "mentor_intro": "Oral budesonide represents the evidence-based cornerstone for both induction and maintenance of clinical remission in microscopic colitis, providing localized colonic anti-inflammatory action with minimal systemic glucocorticoid adverse effects due to extensive hepatic first-pass metabolism.",
        "teaching_points": [
            {
                "claim": "In a randomized, double-blind, placebo-controlled trial by Miehlke and colleagues, budesonide maintenance therapy (initially 6 mg daily, titrated to 3-4.5 mg daily) maintained clinical remission over 1 year in 61.4% of patients compared to 16.7% with placebo (HR 0.23; p=0.0002).",
                "cites": ["24488494"]
            },
            {
                "claim": "A comprehensive Cochrane review confirmed that budesonide produces clinical remission in over 80% of patients with lymphocytic and collagenous colitis (RR 3.19; 95% CI 1.89-5.38), with clinical improvement typically documented within 1 to 2 weeks of therapy.",
                "cites": ["29152738"]
            },
            {
                "claim": "Bonderup and colleagues proved that 8 weeks of oral budesonide (9 mg/day) achieved significant histological remission, reduction of stool weight, and cessation of nocturnal diarrhea in collagenous colitis without adrenal suppression.",
                "cites": ["12524408"]
            },
            {
                "claim": "Following successful 8-week induction with budesonide 9 mg daily, approximately 60-80% of patients experience symptom recurrence upon cessation; EMCG guidelines recommend tapering to the lowest effective maintenance dose (3 mg daily or 3 mg on alternate days) for recurrent disease.",
                "cites": ["30071227", "24488494"]
            }
        ],
        "sources": [
            {
                "pmid": "24488494",
                "title": "Oral budesonide is very effective in maintaining remission in microscopic colitis: a randomized, double-blind, placebo-controlled trial",
                "journal": "Gut",
                "year": 2014,
                "design": "trial"
            },
            {
                "pmid": "29152738",
                "title": "Interventions for treating lymphocytic colitis",
                "journal": "Cochrane Database Syst Rev",
                "year": 2017,
                "design": "meta-analysis"
            },
            {
                "pmid": "12524408",
                "title": "Budesonide treatment of collagenous colitis: a randomised, double blind, placebo controlled trial",
                "journal": "Gut",
                "year": 2003,
                "design": "trial"
            },
            {
                "pmid": "30071227",
                "title": "European Microscopic Colitis Group (EMCG) statements and recommendations on the management of microscopic colitis",
                "journal": "Gastroenterology",
                "year": 2018,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Optimal bone protection strategy (calcium, vitamin D, bisphosphonates) during long-term low-dose budesonide maintenance exceeding 2 years.",
            "Role of delayed-release granules (budesonide MMX) versus standard pH-dependent enteric-coated capsules in proximal versus distal colitis."
        ],
        "mcq_angles": [
            "Induction dosing of budesonide for microscopic colitis: 9 mg once daily for 6 to 8 weeks.",
            "High relapse rate (>60%) after treatment withdrawal prompting low-dose maintenance therapy.",
            "Pharmacokinetic advantage of budesonide: ~90% hepatic first-pass metabolism via CYP3A4 limiting systemic glucocorticoid toxicities."
        ],
        "case_hooks": [
            "A 65-year-old woman with collagenous colitis achieving complete remission on budesonide 9 mg whose watery diarrhea relapses 10 days after stopping therapy.",
            "An osteopenic 72-year-old woman requiring chronic budesonide 3 mg daily to maintain continence evaluated for bone safety."
        ],
        "gaps": "Direct randomized trials comparing budesonide maintenance versus vedolizumab in steroid-dependent microscopic colitis."
    },
    1118: {
        "cluster": "Rheumatology / Nephrology",
        "mentor_intro": "Microscopic polyangiitis (MPA) is a systemic necrotizing pauci-immune small-vessel vasculitis strongly associated with myeloperoxidase (MPO)-ANCA, characteristically manifesting as rapidly progressive crescentic glomerulonephritis and alveolar hemorrhage, managed with remission-induction immunosuppression.",
        "teaching_points": [
            {
                "claim": "In the landmark RAVE trial, rituximab was non-inferior to cyclophosphamide for remission induction in severe ANCA-associated vasculitis (64% vs 53%) and was significantly superior to cyclophosphamide for induction in patients presenting with relapsing disease (67% vs 42%; p=0.01).",
                "cites": ["20647199"]
            },
            {
                "claim": "The randomized PEXIVAS trial demonstrated that plasma exchange did not reduce the incidence of end-stage kidney disease or death (HR 0.86; 95% CI 0.65-1.13) in patients with severe ANCA-associated vasculitis with renal impairment or pulmonary hemorrhage, while a reduced-dose glucocorticoid regimen was non-inferior to standard-dose glucocorticoids with fewer serious infections.",
                "cites": ["32050087"]
            },
            {
                "claim": "In the ADVOCATE trial, the oral complement C5a receptor antagonist avacopan proved superior to a standard prednisone taper in achieving sustained remission at 52 weeks (65.7% vs 54.9%; p=0.007) while significantly enhancing eGFR recovery and reducing glucocorticoid toxicity.",
                "cites": ["33596356"]
            },
            {
                "claim": "Unlike granulomatosis with polyangiitis (GPA), MPA typically lacks granulomatous upper respiratory tract inflammation and pulmonary cavitary nodules, and is predominantly characterized by perinuclear (p-ANCA) staining targeting myeloperoxidase (MPO).",
                "cites": ["34235884", "20647199"]
            }
        ],
        "sources": [
            {
                "pmid": "20647199",
                "title": "Rituximab versus cyclophosphamide for ANCA-associated vasculitis (RAVE)",
                "journal": "N Engl J Med",
                "year": 2010,
                "design": "trial"
            },
            {
                "pmid": "32050087",
                "title": "Plasma exchange and glucocorticoids in severe ANCA-associated vasculitis (PEXIVAS)",
                "journal": "N Engl J Med",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": "33596356",
                "title": "Avacopan for the treatment of ANCA-associated vasculitis (ADVOCATE)",
                "journal": "N Engl J Med",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": "34235884",
                "title": "2021 American College of Rheumatology/Vasculitis Foundation Guideline for the Management of ANCA-Associated Vasculitis",
                "journal": "Arthritis Rheumatol",
                "year": 2021,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Duration of maintenance rituximab therapy (2 years vs 5 years) in MPO-ANCA positive patients who achieve negative ANCA seroconversion.",
            "Role of plasma exchange in the specific subgroup with hyper-acute pulmonary alveolar hemorrhage and hypoxemic mechanical ventilation."
        ],
        "mcq_angles": [
            "Results of PEXIVAS: lack of long-term reduction in death or ESKD with routine therapeutic plasma exchange.",
            "Serological and histological hallmarks of MPA: p-ANCA / MPO antibodies and pauci-immune necrotizing crescentic glomerulonephritis without granulomas.",
            "Mechanism of avacopan: selective oral antagonist of the complement C5a receptor-1 (C5aR1)."
        ],
        "case_hooks": [
            "A 66-year-old man presenting with malaise, purpuric skin lesions, serum creatinine rise from 80 to 340 micromol/L, red blood cell casts, and high-titer p-ANCA (anti-MPO).",
            "A patient with severe MPA and pulmonary hemorrhage starting remission induction whose team debates adding plasma exchange in light of PEXIVAS."
        ],
        "gaps": "Head-to-head prospective trials evaluating avacopan plus rituximab without any initial intravenous pulse methylprednisolone."
    },
    1119: {
        "cluster": "Neurology / Primary Care",
        "mentor_intro": "Migraine is a prevalent neurovascular brain disorder characterized by recurrent attacks of moderate-to-severe throbbing headache associated with photophobia, phonophobia, nausea, and in one-third of individuals, transient focal neurological aura, managed by acute stratified analgesia and proactive preventive therapies.",
        "teaching_points": [
            {
                "claim": "According to ICHD-3 criteria, migraine without aura requires at least 5 attacks lasting 4-72 hours, with >=2 pain characteristics (unilateral, pulsating, moderate/severe, aggravated by routine physical activity) and >=1 associated symptom (nausea/vomiting, photophobia and phonophobia).",
                "cites": ["29368949"]
            },
            {
                "claim": "In systematic reviews and meta-analyses by Ferrari and colleagues, oral 5-HT1B/1D receptor agonists (triptans: rizatriptan, eletriptan, sumatriptan) demonstrated robust 2-hour headache relief (59-67%) and pain-free response, outperforming ergotamines and analgesics when administered early in the headache phase.",
                "cites": ["11728541"]
            },
            {
                "claim": "American Headache Society guidelines recommend initiating preventive pharmacotherapy when patients experience >=4 headache days per month, debilitating attacks despite acute therapy, or are at risk of medication-overuse headache from taking acute analgesics >=10-15 days per month.",
                "cites": ["34160823", "26252585"]
            },
            {
                "claim": "First-line conventional preventive options with established Level A evidence include beta-blockers without intrinsic sympathomimetic activity (propranolol, metoprolol), topiramate, and amitriptyline, while gepants (rimegepant, atogepant) and anti-CGRP monoclonal antibodies offer targeted non-vasoconstrictive alternatives.",
                "cites": ["34160823", "26252585"]
            }
        ],
        "sources": [
            {
                "pmid": "29368949",
                "title": "The International Classification of Headache Disorders, 3rd edition (ICHD-3)",
                "journal": "Cephalalgia",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": "34160823",
                "title": "The American Headache Society Consensus Statement: Update on integrating new migraine treatments into clinical practice",
                "journal": "Headache",
                "year": 2021,
                "design": "guideline"
            },
            {
                "pmid": "11728541",
                "title": "Oral triptans (serotonin 5-HT(1B/1D) agonists) in acute migraine treatment: a meta-analysis of 53 trials",
                "journal": "Lancet",
                "year": 2001,
                "design": "meta-analysis"
            },
            {
                "pmid": "26252585",
                "title": "Preventive migraine treatment",
                "journal": "Continuum (Minneap Minn)",
                "year": 2015,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Comparative long-term cardiovascular safety of novel 5-HT1F receptor agonists (lasmiditan) vs CGRP receptor antagonists (gepants) in patients with coronary artery disease.",
            "Optimal duration of preventive medication in patients who achieve zero migraine days for >12 consecutive months."
        ],
        "mcq_angles": [
            "Contraindications to triptan therapy: ischemic heart disease, previous stroke/TIA, peripheral vascular disease, uncontrolled hypertension.",
            "Distinction between migraine aura (gradual spread over >=5 minutes, duration 5-60 minutes, positive visual phenomena) and transient ischemic attack (sudden negative deficit).",
            "Threshold for defining medication overuse headache (triptans >=10 days/month, simple analgesics >=15 days/month for >3 months)."
        ],
        "case_hooks": [
            "A 28-year-old woman with shimmering zig-zag lines expanding across her left visual field followed 30 minutes later by a right-sided pounding headache and vomiting.",
            "A 42-year-old executive experiencing 12 migraine days per month using sumatriptan and paracetamol almost daily who presents with worsening continuous daily headache."
        ],
        "gaps": "Neuroimaging and electrophysiological biomarkers capable of predicting individualized patient response to topiramate versus anti-CGRP therapies."
    },
    1120: {
        "cluster": "Neurology",
        "mentor_intro": "Monoclonal antibodies targeting calcitonin gene-related peptide (CGRP) or its canonical receptor (erenumab, galcanezumab, fremanezumab, eptinezumab) represent targeted, disease-specific preventive therapies for episodic and chronic migraine, demonstrating rapid onset of efficacy, sustained reduction in migraine days, and favorable adverse effect profiles.",
        "teaching_points": [
            {
                "claim": "In the phase 3 STRIVE trial, monthly subcutaneous erenumab (targeting the canonical CGRP receptor complex) significantly reduced monthly migraine days by 3.7 days (70 mg) and 4.0 days (140 mg) compared with 1.8 days for placebo, with >=50% reduction achieved by 50% of patients.",
                "cites": ["29171821"]
            },
            {
                "claim": "The phase 3 EVOLVE-1 and EVOLVE-2 randomized trials demonstrated that galcanezumab (targeting the CGRP ligand) produced statistically significant, clinically meaningful reductions in monthly migraine headache days and acute medication use days across 6 months in episodic migraine.",
                "cites": ["29813147", "29714603"]
            },
            {
                "claim": "In chronic migraine (>=15 headache days/month), the PROMISE-2 trial demonstrated that quarterly intravenous eptinezumab produced significant migraine day reductions starting from day 1 post-infusion through week 24, with favorable tolerability and high patient compliance.",
                "cites": ["32098863"]
            },
            {
                "claim": "Because CGRP inhibitors do not cause vascular smooth muscle constriction, they do not carry the vasoconstrictive ischemic contraindications of triptans or ergot alkaloids, though post-marketing surveillance identifies severe constipation and worsening hypertension as potential risks with erenumab.",
                "cites": ["34168341", "29171821"]
            }
        ],
        "sources": [
            {
                "pmid": "29171821",
                "title": "A controlled trial of erenumab for episodic migraine (STRIVE)",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "29813147",
                "title": "Effect of Galcanezumab Following Treatment Cessation in Patients With Migraine: Results From 2 Randomized Phase 3 Trials (EVOLVE-1 and EVOLVE-2)",
                "journal": "JAMA Neurol",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": "29714603",
                "title": "Efficacy and safety of galcanezumab for the prevention of episodic migraine: Results of the EVOLVE-2 Phase 3 randomized controlled clinical trial",
                "journal": "Cephalalgia",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": "32098863",
                "title": "Efficacy and safety of eptinezumab in patients with chronic migraine (PROMISE-2)",
                "journal": "Neurology",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": "34168341",
                "title": "CGRP and PACAP in migraine biology and modern targeted therapeutics",
                "journal": "Nat Rev Neurol",
                "year": 2021,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Long-term cardiovascular and coronary microvascular safety during acute myocardial ischemia when compensatory CGRP-mediated vasodilation is blocked.",
            "Optimal treatment duration and rebound attack rates following planned cessation after 12-24 months of successful suppression."
        ],
        "mcq_angles": [
            "Mechanistic distinction: erenumab targets the CGRP receptor, whereas galcanezumab, fremanezumab, and eptinezumab bind the CGRP peptide ligand directly.",
            "Administration route differences: eptinezumab is administered via intravenous infusion quarterly, whereas erenumab and galcanezumab are monthly subcutaneous injections.",
            "Specific adverse effects: erenumab is associated with severe constipation and exacerbation of pre-existing hypertension."
        ],
        "case_hooks": [
            "A 39-year-old woman with chronic migraine experiencing 18 headache days per month refractory to propranolol, topiramate, and amitriptyline evaluated for anti-CGRP therapy.",
            "A patient receiving monthly erenumab who develops severe refractory constipation and new-onset stage 2 hypertension requiring treatment review."
        ],
        "gaps": "Comparative randomized trials comparing anti-CGRP monoclonal antibodies against oral CGRP receptor antagonists (gepants) for maintenance migraine prevention."
    }
}
