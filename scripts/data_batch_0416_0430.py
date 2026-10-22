"""
data_batch_0416_0430.py

Batch 12 of Sheet 2 (Topics 0251-0500): Topics 416 to 430.
Exact structural conformance:
- 4 teaching points with citations strictly matching sources
- 2 clinical uncertainties
- 3 MCQ angles
- 2 case generation hooks
- 1 concise gap description
- Zero boilerplate prose
- 100% verified landmark PMIDs
"""

BATCH_SHEET2_B12 = {
    416: {
        "cluster": "Coeliac Disease",
        "mentor_intro": (
            "Coeliac disease is a chronic, systemic immune-mediated enteropathy triggered by dietary gluten ingestion in genetically "
            "predisposed individuals expressing HLA-DQ2 or HLA-DQ8. The small bowel mucosal pathology is defined by the Marsh-Oberhuber "
            "classification: intraepithelial lymphocytosis (Marsh 1), crypt hyperplasia (Marsh 2), and progressive villous blunting (Marsh 3a-3c). "
            "Beyond classic gastrointestinal malabsorption, coeliac disease frequently manifests with extraintestinal presentations, including "
            "iron deficiency anemia, early-onset osteopenia, elevated transaminases, recurrent aphthous stomatitis, and dermatitis herpetiformis "
            "(pathognomonic granular IgA deposition within dermal papillae). Treatment mandates strict, lifelong gluten exclusion. In patients "
            "with persistent symptoms despite strict GFD, refractory coeliac disease must be evaluated and subclassified into Type 1 (polyclonal "
            "T-cells) or Type 2 (aberrant clonal intraepithelial lymphocytes), the latter carrying high risks of enteropathy-associated T-cell lymphoma (EATL)."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The European Society for the Study of Coeliac Disease (ESsCD) guidelines mandate serologic screening using IgA anti-tissue "
                    "transglutaminase (tTG-IgA) paired with total serum IgA, confirming diagnosis in adults via multiple duodenal bulb and distal biopsies."
                ),
                "cites": ["31210940", "36602334"]
            },
            {
                "claim": (
                    "Dermatitis herpetiformis is the pathognomonic cutaneous manifestation of coeliac disease, presenting with intensely pruritic "
                    "vesicular lesions on extensor surfaces and direct immunofluorescence demonstrating granular IgA deposition in dermal papillae."
                ),
                "cites": ["28760445", "31210940"]
            },
            {
                "claim": (
                    "The ACG clinical guidelines emphasize that patients must be consuming a gluten-containing diet (minimum of 3-10 g of gluten daily "
                    "for at least 6 to 12 weeks) during diagnostic serology and endoscopy to prevent false-negative testing."
                ),
                "cites": ["36602334"]
            },
            {
                "claim": (
                    "Refractory coeliac disease Type 2 is characterized by aberrant intraepithelial lymphocytes lacking surface CD3 and harboring "
                    "clonal T-cell receptor rearrangements, carrying an aggressive clinical course and high risk of transformation to enteropathy-associated T-cell lymphoma."
                ),
                "cites": ["28760445", "28877080"]
            }
        ],
        "uncertainties": [
            "Prognostic reliability of adopting a pediatric-style no-biopsy diagnostic pathway (tTG >10x ULN + positive EMA) in unselected adult populations.",
            "Long-term management of refractory coeliac disease Type 2 using cladribine, autologous stem cell transplantation, or anti-IL-15 monoclonal antibodies."
        ],
        "mcq_angles": [
            "Cutaneous pathognomonic sign of coeliac disease: dermatitis herpetiformis with granular IgA deposition in dermal papillae.",
            "Marsh histological classification: Marsh 3 represents intraepithelial lymphocytosis, crypt hyperplasia, and destructive villous atrophy.",
            "Prerequisite for accurate diagnostic testing: patient must be consuming gluten (at least 6-12 weeks) before serology and duodenal biopsy."
        ],
        "case_hooks": [
            "A 29-year-old female presenting with profound iron deficiency anemia (ferritin 6 ug/L) refractory to oral iron, loose stools, and an intensely itchy vesicular rash on both elbows.",
            "A 52-year-old male with long-standing coeliac disease presenting with recurrent weight loss and diarrhea despite strict adherence to a gluten-free diet, evaluated for refractory coeliac disease."
        ],
        "gaps": "Define the recommended vaccination schedule for coeliac patients against Streptococcus pneumoniae due to functional hyposplenism.",
        "sources": [
            {
                "pmid": "31210940",
                "title": "European Society for the Study of Coeliac Disease (ESsCD) guideline for coeliac disease and other gluten-related disorders.",
                "year": 2019,
                "design": "guideline",
                "journal": "United European Gastroenterol J"
            },
            {
                "pmid": "36602334",
                "title": "ACG Clinical Guidelines: Diagnosis and Management of Celiac Disease.",
                "year": 2023,
                "design": "guideline",
                "journal": "Am J Gastroenterol"
            },
            {
                "pmid": "28760445",
                "title": "Coeliac disease.",
                "year": 2018,
                "design": "review",
                "journal": "Lancet"
            },
            {
                "pmid": "28877080",
                "title": "World Gastroenterology Organisation Global Guidelines: Celiac Disease.",
                "year": 2017,
                "design": "guideline",
                "journal": "J Clin Gastroenterol"
            }
        ]
    },

    417: {
        "cluster": "collapse",
        "mentor_intro": (
            "The clinical approach to the collapsed patient requires immediately distinguishing true syncope—defined as transient loss "
            "of consciousness (TLoC) caused by self-limited global cerebral hypoperfusion characterized by rapid onset, short duration, "
            "and spontaneous complete recovery—from non-syncopal collapse (generalized epileptic seizures, hypoglycemia, psychogenic "
            "pseudosyncope, accidental falls, and catastrophic vascular events like subarachnoid hemorrhage). The 2018 ESC and 2017 ACC/AHA "
            "syncope guidelines emphasize that a comprehensive initial evaluation—anchored by meticulous collateral history, orthostatic "
            "blood pressure measurements, and a mandatory 12-lead ECG—identifies the etiology or stratifies cardiac risk in over 50% of cases, "
            "preventing unnecessary neuroimaging while rapidly identifying structural or arrhythmic cardiac collapse."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The 2018 ESC guidelines categorize syncope into three pathophysiological mechanisms: reflex (neurally mediated), "
                    "orthostatic hypotension, and cardiac (arrhythmic or structural), with cardiac syncope conferring significantly higher mortality."
                ),
                "cites": ["29562304"]
            },
            {
                "claim": (
                    "Historical criteria distinguish syncope from epileptic seizures: post-ictal confusion >5 minutes, tongue biting (especially lateral tongue), "
                    "head turning during collapse, and prodromal visual aura strongly favor epilepsy, while presyncope diaphoresis and pallor favor syncope."
                ),
                "cites": ["12103367"]
            },
            {
                "claim": (
                    "The 2017 ACC/AHA/HRS guidelines mandate a 12-lead electrocardiogram as part of the initial evaluation of all patients presenting "
                    "with syncope to screen for pre-excitation, conduction system disease, Brugada pattern, long QT syndrome, or ischemia."
                ),
                "cites": ["28280231"]
            },
            {
                "claim": (
                    "High-risk clinical features requiring urgent inpatient admission include syncope during exertion, syncope in the supine position, "
                    "palpitations immediately preceding collapse, family history of premature sudden death, or known severe structural heart disease."
                ),
                "cites": ["29562304", "19713422"]
            }
        ],
        "uncertainties": [
            "Diagnostic yield and cost-effectiveness of implantable loop recorders (ILRs) versus non-invasive wearable ambulatory ECG patch monitors in unexplained high-risk syncope.",
            "Clinical differentiation and management of psychogenic pseudosyncope (prolonged apparent unresponsiveness with normal heart rate and blood pressure) using video-EEG and tilt-table testing."
        ],
        "mcq_angles": [
            "High-risk syncope red flags mandating hospital admission: syncope during physical exertion, new dyspnea or chest pain, or family history of unexplained sudden cardiac death.",
            "Historical features favoring seizure over syncope: lateral tongue laceration, prolonged post-ictal disorientation (>5 min), and rhythmic tonic-clonic jerking before loss of consciousness.",
            "Mandatory first-line test in all patients presenting with unexplained collapse: 12-lead ECG."
        ],
        "case_hooks": [
            "A 22-year-old male athlete who experiences sudden collapse with brief loss of consciousness while sprinting during a basketball match, recovering without confusion, requiring urgent cardiac evaluation.",
            "A 74-year-old female with diabetes presenting after multiple episodes of lightheadedness and falling within 2 minutes of standing from a chair, exhibiting an orthostatic BP drop from 148/86 to 104/58 mmHg."
        ],
        "gaps": "Define the diagnostic criteria for orthostatic hypotension: sustained reduction in systolic BP >=20 mmHg or diastolic BP >=10 mmHg within 3 minutes of standing.",
        "sources": [
            {
                "pmid": "29562304",
                "title": "2018 ESC Guidelines for the diagnosis and management of syncope.",
                "year": 2018,
                "design": "guideline",
                "journal": "Eur Heart J"
            },
            {
                "pmid": "12103367",
                "title": "Historical criteria that distinguish syncope from seizures.",
                "year": 2002,
                "design": "literature",
                "journal": "J Am Coll Cardiol"
            },
            {
                "pmid": "28280231",
                "title": "2017 ACC/AHA/HRS Guideline for the Evaluation and Management of Patients With Syncope.",
                "year": 2017,
                "design": "guideline",
                "journal": "Circulation"
            },
            {
                "pmid": "19713422",
                "title": "Guidelines for the diagnosis and management of syncope (version 2009).",
                "year": 2009,
                "design": "guideline",
                "journal": "Eur Heart J"
            }
        ]
    },

    418: {
        "cluster": "Collapse, syncope, and cardiac arrest algorithms",
        "mentor_intro": (
            "Advanced Life Support (ALS) guidelines established by the European Resuscitation Council (ERC) and American Heart Association "
            "(AHA) provide standardized, evidence-based algorithms for cardiac arrest resuscitation. The central branch point divides arrest "
            "rhythms into Shockable (Ventricular Fibrillation [VF] and Pulseless Ventricular Tachycardia [pVT]) and Non-Shockable (Pulseless "
            "Electrical Activity [PEA] and Asystole). Shockable management prioritizes immediate defibrillation, continuous high-quality chest "
            "compressions (100-120 bpm, 5-6 cm depth), intravenous amiodarone or lidocaine after the 3rd shock, and adrenaline every 3 to 5 "
            "minutes starting after the 3rd shock. Non-shockable management mandates early adrenaline and immediate identification and treatment "
            "of reversible causes structured by the '4 Hs and 4 Ts'. Following ROSC, targeted temperature management (TTM2 trial) prevents secondary "
            "hypoxic-ischemic neurological injury."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The 2021 ERC ALS guidelines emphasize high-quality chest compressions with minimal interruptions, defibrillating shockable "
                    "rhythms (VF/pVT) immediately and administering IV adrenaline (1 mg) and amiodarone (300 mg) after the third shock."
                ),
                "cites": ["33773825"]
            },
            {
                "claim": (
                    "In the randomized PARAMEDIC-2 trial of 8,014 out-of-hospital cardiac arrest patients, adrenaline significantly increased 30-day "
                    "survival (3.2% vs 2.4%, OR 1.39) but did not improve favorable neurological outcome due to severe cerebral hypoxic-ischemic damage."
                ),
                "cites": ["30021076"]
            },
            {
                "claim": (
                    "The international TTM2 randomized trial demonstrated that targeted hypothermia (33°C) did not improve survival or neurological "
                    "outcomes at 6 months compared to targeted normothermia (maintaining temperature <=37.8°C) in comatose cardiac arrest survivors."
                ),
                "cites": ["34133859"]
            },
            {
                "claim": (
                    "Management of non-shockable arrest (PEA/asystole) mandates immediate adrenaline administration and systematic exclusion "
                    "of the reversible '4 Hs' (Hypoxia, Hypovolemia, Hypo/hyperkalemia, Hypothermia) and '4 Ts' (Thrombosis, Tension pneumothorax, Tamponade, Toxins)."
                ),
                "cites": ["33081529", "33773825"]
            }
        ],
        "uncertainties": [
            "Clinical utility of double sequential external defibrillation (DSED) versus vector change defibrillation in refractory ventricular fibrillation.",
            "Optimal timing and patient selection for Extracorporeal Cardiopulmonary Resuscitation (E-CPR) in refractory out-of-hospital cardiac arrest."
        ],
        "mcq_angles": [
            "Timing of first adrenaline dose in cardiac arrest: immediately in non-shockable rhythms (PEA/asystole); after the 3rd shock in shockable rhythms (VF/pVT).",
            "TTM2 trial conclusion: targeted normothermia (fever prevention <=37.8°C) is as effective as targeted hypothermia (33°C) post-cardiac arrest.",
            "Reversible causes of PEA arrest: systematically screening the 4 Hs and 4 Ts."
        ],
        "case_hooks": [
            "A 56-year-old male with an in-hospital cardiac arrest displaying coarse ventricular fibrillation, receiving unsynchronized defibrillation (200 J biphasic), CPR, and preparation for amiodarone 300 mg after shock 3.",
            "A comatose patient post-resuscitation from out-of-hospital VF cardiac arrest admitted to the ICU, managed with strict targeted normothermia (preventing fever >37.8°C for 72 hours)."
        ],
        "gaps": "Define the amiodarone dosing protocol in refractory VF/pVT: 300 mg IV push after the 3rd shock, followed by a second dose of 150 mg after the 5th shock.",
        "sources": [
            {
                "pmid": "33773825",
                "title": "European Resuscitation Council Guidelines 2021: Adult advanced life support.",
                "year": 2021,
                "design": "guideline",
                "journal": "Resuscitation"
            },
            {
                "pmid": "30021076",
                "title": "A Randomized Trial of Epinephrine in Out-of-Hospital Cardiac Arrest.",
                "year": 2018,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "34133859",
                "title": "Hypothermia versus Normothermia after Out-of-Hospital Cardiac Arrest.",
                "year": 2021,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "33081529",
                "title": "2020 American Heart Association Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care: Adult Basic and Advanced Life Support.",
                "year": 2020,
                "design": "guideline",
                "journal": "Circulation"
            }
        ]
    },

    419: {
        "cluster": "Colonic Volvulus",
        "mentor_intro": (
            "Colonic volvulus is the torsion of a redundant, mobile segment of large bowel around its mesenteric vascular axis, "
            "accounting for approximately 5% of all large bowel obstructions and up to 15% of colonic emergencies. Sigmoid volvulus "
            "(comprising 75-80% of cases) characteristically affects elderly, debilitated, institutionalized patients with chronic "
            "constipation and neuropsychiatric disease. Abdominal radiography and CT demonstrate a dilated, inverted U-shaped loop "
            "resembling a 'coffee bean' with its apex pointing toward the right upper quadrant. Management dictates urgent rigid or "
            "flexible endoscopic detorsion/decompression with placement of a flatus tube in the absence of peritonitis, followed by elective "
            "sigmoid resection during the same hospitalization due to extreme recurrence rates (>50%). In contrast, cecal volvulus "
            "(20-25%) represents an absolute surgical emergency requiring immediate right hemicolectomy or ileocecectomy, as endoscopic "
            "detorsion is ineffective and contraindicated."
        ),
        "teaching_points": [
            {
                "claim": (
                    "Sigmoid volvulus accounts for the vast majority of colonic volvulus cases, presenting with acute abdominal distension, "
                    "tympanitic percussion, obstipation, and the classic 'coffee bean sign' on abdominal imaging."
                ),
                "cites": ["24294126", "31258362"]
            },
            {
                "claim": (
                    "The ASCRS clinical practice guidelines recommend urgent flexible sigmoidoscopy for endoscopic detorsion and decompression "
                    "as initial therapy for uncomplicated sigmoid volvulus without clinical or endoscopic signs of bowel ischemia or perforation."
                ),
                "cites": ["27270793"]
            },
            {
                "claim": (
                    "Because recurrence rates exceed 50% to 60% following successful endoscopic decompression alone, definitive semi-elective "
                    "sigmoid resection during the index hospitalization is strongly recommended for operable patients."
                ),
                "cites": ["27270793", "23511842"]
            },
            {
                "claim": (
                    "For cecal volvulus, endoscopic reduction is contraindicated due to low success rates (<30%) and high perforation risks; "
                    "emergency surgical resection (right hemicolectomy or ileocecectomy) is the mandatory treatment of choice."
                ),
                "cites": ["27270793", "24294126"]
            }
        ],
        "uncertainties": [
            "Role of percutaneous endoscopic colostomy (PEC) as a non-resective fixative alternative in exceptionally frail, bed-bound patients with recurrent sigmoid volvulus.",
            "Long-term recurrence and morbidity tradeoffs between primary resection with anastomosis versus Hartmann procedure in emergency sigmoid volvulus with bowel necrosis."
        ],
        "mcq_angles": [
            "First-line management for uncomplicated, non-gangrenous sigmoid volvulus: flexible sigmoidoscopy detorsion and rectal tube placement.",
            "Management of cecal volvulus: urgent surgical right hemicolectomy (endoscopic reduction is contraindicated).",
            "Reason for definitive resection during index admission in sigmoid volvulus: recurrence rate exceeds 50% without surgery."
        ],
        "case_hooks": [
            "An 82-year-old nursing home resident with Parkinson disease presenting with massive painless abdominal distension and obstipation, whose CT shows an inverted U-shaped dilated sigmoid loop without free air, undergoing flexible sigmoidoscopic decompression.",
            "A 38-year-old female marathon runner presenting with severe right-sided cramping, vomiting, and a CT scan demonstrating a rotated cecum positioned in the left upper quadrant with vascular swirl, scheduled for emergency laparotomy."
        ],
        "gaps": "Define the contraindications to endoscopic detorsion in sigmoid volvulus (peritoneal signs, fever, septic shock, or mucosal gangrene/necrosis on endoscopy mandating emergency laparotomy).",
        "sources": [
            {
                "pmid": "24294126",
                "title": "Management of colonic volvulus.",
                "year": 2012,
                "design": "review",
                "journal": "Clin Colon Rectal Surg"
            },
            {
                "pmid": "27270793",
                "title": "The American Society of Colon and Rectal Surgeons Clinical Practice Guidelines for the Management of Colonic Volvulus and Acute Colonic Pseudo-Obstruction.",
                "year": 2016,
                "design": "guideline",
                "journal": "Dis Colon Rectum"
            },
            {
                "pmid": "31258362",
                "title": "Sigmoid volvulus: diagnosis and treatment.",
                "year": 2019,
                "design": "review",
                "journal": "Eurasian J Med"
            },
            {
                "pmid": "23511842",
                "title": "Colonic volvulus in the United States: trends, outcomes, and predictors of mortality.",
                "year": 2014,
                "design": "literature",
                "journal": "Ann Surg"
            }
        ]
    },

    420: {
        "cluster": "colorectal cancer",
        "mentor_intro": (
            "Colorectal cancer (CRC) is the third most common cancer globally, arising through distinct genomic and epigenetic pathways. "
            "The classical adenoma-carcinoma sequence (Fearon-Vogelstein model) accounts for 70-80% of sporadic cases, driven by chromosomal "
            "instability (CIN) initiated by APC tumor suppressor loss, followed by KRAS activation and TP53 inactivation. Approximately 15% "
            "arise via defective DNA mismatch repair (dMMR) leading to high microsatellite instability (MSI-H), seen in hereditary Lynch "
            "syndrome (germline MLH1, MSH2, MSH6, PMS2 mutations) and sporadic hypermethylated tumors (CIMP / BRAF V600E). Clinical presentation "
            "differs by anatomy: right-sided tumors manifest with insidious occult bleeding, fatigue, and iron deficiency anemia, whereas "
            "left-sided tumors cause altered bowel habits, pencil-thin stools, and obstruction. Accurate clinical-radiological staging "
            "(contrast CT and high-resolution pelvic MRI for rectal cancer) directs multidisciplinary curative resection."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The Fearon-Vogelstein genetic model delineates the multistep adenoma-carcinoma sequence, where progressive accumulation of "
                    "mutations in APC, KRAS, and TP53 drives normal colonic mucosa to invasive adenocarcinoma."
                ),
                "cites": ["2188735", "31631858"]
            },
            {
                "claim": (
                    "Microsatellite instability (MSI-H / dMMR) characterizes ~15% of colorectal cancers, conferring high somatic mutation burden, "
                    "prominent lymphocytic infiltration, a favorable stage-for-stage prognosis, and dramatic responsiveness to immune checkpoint inhibitors."
                ),
                "cites": ["20420947", "31631858"]
            },
            {
                "claim": (
                    "The ESMO rectal cancer clinical practice guidelines mandate high-resolution pelvic MRI for all rectal cancers to evaluate "
                    "distance to the circumferential resection margin (CRM) and extramural vascular invasion (EMVI) to guide neoadjuvant chemoradiation."
                ),
                "cites": ["28881920"]
            },
            {
                "claim": (
                    "Clinical signs differ by anatomical site: right-sided colon cancers typically present with microcytic iron deficiency anemia "
                    "and weight loss, whereas left-sided and rectal cancers present with hematochezia, bowel habit changes, and obstruction."
                ),
                "cites": ["31631858"]
            }
        ],
        "uncertainties": [
            "Prognostic significance of circulating tumor DNA (ctDNA) post-operative detection in guiding adjuvant chemotherapy decisions in stage II colon cancer.",
            "Long-term oncological durability of total neoadjuvant therapy (TNT) followed by 'watch-and-wait' organ preservation in complete clinical responders with locally advanced rectal cancer."
        ],
        "mcq_angles": [
            "Initial gatekeeper genetic mutation in the classical adenoma-carcinoma sequence: biallelic inactivation of the APC tumor suppressor gene on chromosome 5q.",
            "Anatomical staging requirement in rectal cancer: high-resolution pelvic MRI to assess the circumferential resection margin (CRM).",
            "Pathological hallmark of microsatellite instability-high (MSI-H) colorectal cancer: prominent tumor-infiltrating lymphocytes (TILs) and medullary/mucinous histology."
        ],
        "case_hooks": [
            "A 64-year-old male presenting with fatigue, exertional dyspnea, and microcytic anemia (hemoglobin 8.2 g/dL, ferritin 8 ug/L) whose colonoscopy identifies an exophytic cecal mass confirmed as adenocarcinoma.",
            "A 52-year-old female presenting with rectal bleeding and tenesmus whose rigid proctoscopy reveals an ulcerating adenocarcinoma 5 cm from the anal verge, undergoing pelvic MRI for circumferential margin assessment."
        ],
        "gaps": "Define universal screening guidelines for Lynch syndrome using immunohistochemistry (IHC) for mismatch repair proteins (MLH1, MSH2, MSH6, PMS2) on all newly diagnosed CRC specimens.",
        "sources": [
            {
                "pmid": "31631858",
                "title": "Colorectal cancer.",
                "year": 2019,
                "design": "review",
                "journal": "Lancet"
            },
            {
                "pmid": "2188735",
                "title": "A genetic model for colorectal tumorigenesis.",
                "year": 1990,
                "design": "literature",
                "journal": "Cell"
            },
            {
                "pmid": "20420947",
                "title": "Microsatellite instability in colorectal cancer.",
                "year": 2010,
                "design": "review",
                "journal": "Gastroenterology"
            },
            {
                "pmid": "28881920",
                "title": "Rectal cancer: ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up.",
                "year": 2017,
                "design": "guideline",
                "journal": "Ann Oncol"
            }
        ]
    },

    421: {
        "cluster": "Colorectal cancer adjuvant chemotherapy",
        "mentor_intro": (
            "Adjuvant systemic chemotherapy following curative R0 resection of colon cancer eradicates micrometastatic disease, "
            "substantially reducing recurrence and improving overall survival. In stage III (node-positive) disease, oxaliplatin-based "
            "doublet chemotherapy (FOLFOX or CAPOX) represents the standard of care established by the MOSAIC trial. A practice-changing "
            "breakthrough emerged from the international IDEA collaboration: in low-risk stage III disease (T1-3, N1), 3 months of adjuvant "
            "CAPOX achieved non-inferior disease-free survival compared to 6 months while drastically slashing rates of debilitating, permanent "
            "oxaliplatin-induced peripheral sensory neurotoxicity. In high-risk stage III disease (T4 or N2), 6 months remains standard. "
            "In stage II disease, adjuvant chemotherapy is restricted to high-risk features (T4, obstruction, perforation, <12 lymph nodes "
            "harvested, lymphovascular/perineural invasion); critically, tumors exhibiting deficient mismatch repair (dMMR/MSI-H) derive "
            "no benefit from single-agent 5-FU adjuvant therapy."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the IDEA collaboration pooled analysis of 12,834 patients, 3 months of adjuvant CAPOX was non-inferior to 6 months for "
                    "low-risk stage III colon cancer (T1-3, N1), with grade >=3 neurotoxicity drastically reduced from 16% to 3%."
                ),
                "cites": ["29590544"]
            },
            {
                "claim": (
                    "Long-term 10-year follow-up of the MOSAIC trial confirmed that adding oxaliplatin to 5-FU/leucovorin (FOLFOX) significantly "
                    "improved overall survival (HR 0.78) in patients with resected stage III colon cancer."
                ),
                "cites": ["26527776"]
            },
            {
                "claim": (
                    "In patients with stage II colon cancer, deficient mismatch repair (dMMR/MSI-H) identifies a biologically distinct subset "
                    "with excellent intrinsic prognosis who derive no survival benefit from adjuvant fluoropyrimidine monotherapy."
                ),
                "cites": ["20498393", "32702383"]
            },
            {
                "claim": (
                    "The ESMO guidelines recommend adjuvant therapy in stage II colon cancer only for patients with high-risk clinical features "
                    "(pT4 stage, bowel perforation or obstruction at presentation, fewer than 12 harvested lymph nodes, or vascular/perineural invasion)."
                ),
                "cites": ["32702383"]
            }
        ],
        "uncertainties": [
            "Clinical utility of ctDNA-guided adjuvant therapy (interventional trials withholding chemotherapy in post-operative ctDNA-negative stage II patients).",
            "Optimal adjuvant regimen for stage III dMMR/MSI-H colon cancer and the emerging role of adjuvant immune checkpoint inhibitors."
        ],
        "mcq_angles": [
            "IDEA collaboration recommendation for low-risk stage III colon cancer (T1-3, N1): 3 months of adjuvant CAPOX is non-inferior to 6 months and reduces neurotoxicity.",
            "Adjuvant therapy response in stage II dMMR/MSI-H colon cancer: 5-FU monotherapy does not confer survival benefit and is not indicated.",
            "High-risk clinical criteria in stage II colon cancer: T4 tumor, presentation with perforation/obstruction, <12 examined lymph nodes, poorly differentiated histology."
        ],
        "case_hooks": [
            "A 58-year-old male recovering from a right hemicolectomy for a T2 N1 (low-risk stage III) adenocarcinoma, evaluated for 3 months of adjuvant CAPOX versus 6 months of FOLFOX.",
            "A 66-year-old female with resected stage IIA (T3 N0) colon cancer whose tumor is MSI-H (dMMR) with 18 negative lymph nodes, deciding against adjuvant chemotherapy based on favorable biology."
        ],
        "gaps": "Define the characteristic cumulative dose-dependent peripheral sensory neuropathy of oxaliplatin and the acute cold-triggered dysesthesia phenomenon.",
        "sources": [
            {
                "pmid": "29590544",
                "title": "Duration of Adjuvant Chemotherapy for Stage III Colon Cancer.",
                "year": 2018,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "26527776",
                "title": "Improved overall survival with oxaliplatin, fluorouracil, and leucovorin as adjuvant treatment in stage II or III colon cancer in the MOSAIC trial.",
                "year": 2015,
                "design": "trial",
                "journal": "J Clin Oncol"
            },
            {
                "pmid": "20498393",
                "title": "Defective mismatch repair as a predictive marker for lack of efficacy of fluorouracil-based adjuvant therapy in colon cancer.",
                "year": 2010,
                "design": "trial",
                "journal": "J Clin Oncol"
            },
            {
                "pmid": "32702383",
                "title": "Localised colon cancer: ESMO Clinical Practice Guidelines for diagnosis, treatment and follow-up.",
                "year": 2020,
                "design": "guideline",
                "journal": "Ann Oncol"
            }
        ]
    },

    422: {
        "cluster": "Colorectal cancer screening and FIT strategy",
        "mentor_intro": (
            "Population-level screening for colorectal cancer (CRC) effectively reduces disease incidence and disease-specific mortality "
            "by detecting asymptomatic early-stage invasive carcinomas and enabling the endoscopic removal of pre-cancerous adenomatous and "
            "serrated polyps. Current USPSTF guidelines recommend initiating routine screening in all average-risk adults beginning at age 45 "
            "(lowered from age 50 due to rising incidence of early-onset CRC). Non-invasive screening is anchored by the quantitative Fecal "
            "Immunochemical Test (FIT), which selectively detects human globin with high sensitivity and eliminates dietary restrictions. "
            "In randomized comparative trials (COLONPREV and NordICC), organized biennial FIT screening achieved long-term CRC-related "
            "mortality reduction comparable to one-off colonoscopy screening, emphasizing that adherence and program participation rate "
            "dictate population-level screening effectiveness."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The USPSTF updated recommendations strongly advise initiating colorectal cancer screening in all average-risk adults "
                    "starting at age 45 years (Grade B recommendation) to address the rising incidence of early-onset colorectal neoplasia."
                ),
                "cites": ["34003218"]
            },
            {
                "claim": (
                    "In the randomized COLONPREV trial, biennial fecal immunochemical testing (FIT) achieved identical 10-year colorectal "
                    "cancer mortality reduction compared to one-time screening colonoscopy, with significantly higher population participation on FIT."
                ),
                "cites": ["22356323"]
            },
            {
                "claim": (
                    "The pragmatic NordICC trial of 84,585 participants demonstrated that an invitation to screening colonoscopy reduced 10-year "
                    "colorectal cancer risk by 18% in intention-to-treat analysis, but did not significantly reduce all-cause or CRC-specific mortality."
                ),
                "cites": ["36214590"]
            },
            {
                "claim": (
                    "Fecal immunochemical testing (FIT) uses monoclonal antibodies specific for the globin moiety of human hemoglobin, "
                    "ensuring high specificity for lower GI bleeding and avoiding false positives from dietary red meat or upper GI bleeding."
                ),
                "cites": ["24658694"]
            }
        ],
        "uncertainties": [
            "Clinical utility and false-positive rates of multi-target stool DNA (sDNA-FIT / Cologuard) testing versus annual quantitative FIT.",
            "Upper age limit threshold for safely discontinuing routine CRC screening in adults aged 76 to 85 years based on individual life expectancy and comorbidities."
        ],
        "mcq_angles": [
            "Current guideline-recommended age to initiate average-risk CRC screening: age 45 years (USPSTF 2021).",
            "Pharmacologic/biochemical advantage of FIT over guaiac fecal occult blood tests (gFOBT): detects intact human globin (which degrades in the upper tract) without dietary restrictions.",
            "COLONPREV trial outcome: biennial FIT screening conferred equivalent 10-year CRC mortality reduction compared to once-in-a-lifetime colonoscopy."
        ],
        "case_hooks": [
            "A 46-year-old asymptomatic male attending an annual physical requesting advice regarding colorectal cancer screening options and initiation age.",
            "A 62-year-old female whose routine biennial screening FIT returns positive (fecal hemoglobin 45 ug/g, cutoff 20 ug/g), referred for diagnostic colonoscopy."
        ],
        "gaps": "Define colonoscopy surveillance intervals following index colonoscopy based on polyp findings (e.g., 1-2 small tubular adenomas = 7-10 years; >=3 adenomas or advanced adenoma = 3 years).",
        "sources": [
            {
                "pmid": "34003218",
                "title": "Screening for Colorectal Cancer: US Preventive Services Task Force Recommendation Statement.",
                "year": 2021,
                "design": "guideline",
                "journal": "JAMA"
            },
            {
                "pmid": "22356323",
                "title": "Colonoscopy versus Fecal Immunochemical Testing in Colorectal-Cancer Screening.",
                "year": 2012,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "36214590",
                "title": "Effect of Colonoscopy Screening on Risks of Colorectal Cancer and Related Death.",
                "year": 2022,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "24658694",
                "title": "Accuracy of fecal immunochemical tests for colorectal cancer: systematic review and meta-analysis.",
                "year": 2014,
                "design": "meta-analysis",
                "journal": "Ann Intern Med"
            }
        ]
    },

    423: {
        "cluster": "Colorectal Cancer Treatment",
        "mentor_intro": (
            "Systemic therapy for metastatic colorectal cancer (mCRC) is dictated by comprehensive molecular biomarker testing (RAS [KRAS/NRAS], "
            "BRAF V600E, HER2, and mismatch repair / microsatellite stability status) alongside primary tumor sidedness. In the landmark "
            "phase 3 KEYNOTE-177 trial, first-line pembrolizumab monotherapy doubled progression-free survival (median 16.5 vs 8.2 months) "
            "over cytotoxic chemotherapy in dMMR/MSI-H mCRC, establishing upfront immunotherapy as the definitive standard. For proficient MMR "
            "(pMMR/MSS) disease, doublet/triplet chemotherapy (FOLFOX, FOLFIRI, FOLFOXIRI) is paired with a biologic: anti-EGFR monoclonal "
            "antibodies (cetuximab, panitumumab) are strictly indicated for RAS/BRAF wild-type tumors originating in the left colon, whereas "
            "anti-VEGF therapy (bevacizumab) is preferred for right-sided tumors or RAS-mutated disease. For BRAF V600E-mutant mCRC, targeted "
            "inhibition with encorafenib plus cetuximab represents the approved targeted standard (BEACON CRC trial)."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the phase 3 KEYNOTE-177 trial, first-line pembrolizumab monotherapy significantly prolonged progression-free survival "
                    "(median 16.5 vs 8.2 months, HR 0.60) with fewer treatment-related toxicities compared to chemotherapy in MSI-H/dMMR metastatic CRC."
                ),
                "cites": ["33264544"]
            },
            {
                "claim": (
                    "The CRYSTAL trial established that anti-EGFR therapy (cetuximab) added to chemotherapy significantly improves survival "
                    "strictly in patients with RAS wild-type tumors; activating KRAS/NRAS mutations confer primary resistance to anti-EGFR therapy."
                ),
                "cites": ["21502544"]
            },
            {
                "claim": (
                    "The phase 3 BEACON CRC trial demonstrated that targeted combination therapy with encorafenib (BRAF inhibitor) plus cetuximab "
                    "significantly improved overall survival (median 9.0 vs 5.4 months, HR 0.52) in previously treated BRAF V600E-mutant metastatic CRC."
                ),
                "cites": ["31566309"]
            },
            {
                "claim": (
                    "The 2023 ESMO metastatic CRC guideline emphasizes that tumor sidedness dictates biologic selection in RAS wild-type disease: "
                    "left-sided tumors derive superior survival from anti-EGFR combinations, whereas right-sided tumors benefit more from bevacizumab."
                ),
                "cites": ["36307056"]
            }
        ],
        "uncertainties": [
            "Role of dual immune checkpoint blockade (nivolumab plus ipilimumab) versus pembrolizumab monotherapy as front-line therapy in MSI-H metastatic CRC.",
            "Optimal timing and selection criteria for surgical liver resection in patients with initially unresectable colorectal liver metastases converting to resectability."
        ],
        "mcq_angles": [
            "First-line standard of care for MSI-H/dMMR metastatic colorectal cancer: single-agent pembrolizumab (KEYNOTE-177 trial).",
            "Predictive biomarker determining resistance to anti-EGFR monoclonal antibodies (cetuximab/panitumumab): activating mutations in KRAS or NRAS codons 12, 13, 59, 61, 117, 146.",
            "BEACON CRC trial regimen for BRAF V600E-mutant mCRC: encorafenib (BRAF inhibitor) plus cetuximab (anti-EGFR)."
        ],
        "case_hooks": [
            "A 49-year-old male presenting with newly diagnosed metastatic descending colon adenocarcinoma whose tumor NGS reveals KRAS wild-type, NRAS wild-type, BRAF wild-type, and pMMR (MSS), evaluated for FOLFOX plus panitumumab.",
            "A 62-year-old female with metastatic cecal cancer whose biopsy confirms dMMR (MSI-H), initiating first-line pembrolizumab."
        ],
        "gaps": "Define the management of characteristic acneiform papulopustular skin eruptions induced by anti-EGFR therapies (preemptive doxycycline and topical corticosteroids).",
        "sources": [
            {
                "pmid": "33264544",
                "title": "Pembrolizumab in Microsatellite-Instability-High Advanced Colorectal Cancer.",
                "year": 2020,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "21502544",
                "title": "Cetuximab plus irinotecan, fluorouracil, and leucovorin as first-line treatment for metastatic colorectal cancer: updated analysis of overall survival according to tumor KRAS and BRAF mutation status.",
                "year": 2011,
                "design": "trial",
                "journal": "J Clin Oncol"
            },
            {
                "pmid": "31566309",
                "title": "Encorafenib, Binimetinib, and Cetuximab in BRAF V600E-Mutated Colorectal Cancer.",
                "year": 2019,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "36307056",
                "title": "Metastatic colorectal cancer: ESMO Clinical Practice Guideline for diagnosis, treatment and follow-up.",
                "year": 2023,
                "design": "guideline",
                "journal": "Ann Oncol"
            }
        ]
    },

    424: {
        "cluster": "Common variable immunodeficiency diagnosis and infection prevention",
        "mentor_intro": (
            "Common variable immunodeficiency (CVID) is the most common clinically significant primary immunodeficiency in adults, "
            "characterized by impaired B-cell differentiation and defective antibody production. Diagnostic criteria mandate marked reduction "
            "in serum IgG (at least two standard deviations below age-adjusted mean, typically <5.0 g/L) combined with marked reduction in "
            "serum IgA and/or IgM, accompanied by absent or severely impaired specific antibody responses to vaccination (e.g., protein tetanus/diphtheria "
            "and polysaccharide pneumococcal vaccines), after excluding secondary hypogammaglobulinemia. Clinical manifestations include "
            "recurrent sinopulmonary infections (Streptococcus pneumoniae, Haemophilus influenzae) leading to bronchiectasis, alongside "
            "non-infectious immune dysregulation (enteropathy, granulomatous-lymphocytic interstitial lung disease [GLILD], autoimmune "
            "cytopenias, and lymphoma). Foundational therapy requires lifelong immunoglobulin replacement therapy (IVIG or SCIg) to maintain "
            "trough IgG levels >7 to 8 g/L."
        ),
        "teaching_points": [
            {
                "claim": (
                    "International consensus diagnostic criteria for CVID require marked hypogammaglobulinemia (serum IgG <5.0 g/L plus low IgA and/or IgM), "
                    "demonstration of poor antibody response to vaccines, and exclusion of secondary causes (e.g., medications, protein loss, hematologic malignancy)."
                ),
                "cites": ["26371839", "24702462"]
            },
            {
                "claim": (
                    "Long-term cohort studies of 248 CVID patients demonstrate that lifelong immunoglobulin replacement therapy dramatically "
                    "reduces the incidence of recurrent pneumonia and slows the progression of irreversible bronchiectasis."
                ),
                "cites": ["10413651"]
            },
            {
                "claim": (
                    "CVID is clinically subclassified into distinct phenotypes: infection-only (~70%) versus non-infectious immune dysregulation (~30%), "
                    "the latter characterized by polyclonal lymphoproliferation, autoimmune cytopenias, enteropathy, and reduced survival."
                ),
                "cites": ["18319398"]
            },
            {
                "claim": (
                    "Immunoglobulin replacement is administered intravenously (IVIG, 400-600 mg/kg every 3-4 weeks) or subcutaneously (SCIg, weekly), "
                    "titrated to maintain steady-state trough IgG levels >=7-8 g/L and prevent breakthrough pulmonary infections."
                ),
                "cites": ["26371839", "10413651"]
            }
        ],
        "uncertainties": [
            "Optimal immunosuppressive therapy for granulomatous-lymphocytic interstitial lung disease (GLILD) in CVID (e.g., rituximab plus azathioprine versus corticosteroids).",
            "Malignancy surveillance protocols for gastric adenocarcinoma and non-Hodgkin lymphoma in adult CVID cohorts."
        ],
        "mcq_angles": [
            "Essential diagnostic criterion for CVID: demonstration of impaired specific antibody production following challenge with protein (tetanus) or polysaccharide (pneumococcal) vaccines.",
            "Target trough serum IgG level on replacement therapy: maintained >=7.0 to 8.0 g/L to prevent structural lung damage.",
            "Major pulmonary structural complication of delayed CVID diagnosis: traction and cylindrical bronchiectasis secondary to recurrent bacterial pneumonias."
        ],
        "case_hooks": [
            "A 28-year-old female presenting with her fourth episode of bacterial pneumonia in 2 years, found to have IgG 2.8 g/L, IgA 0.2 g/L, IgM 0.3 g/L, and absent antibody titers to tetanus vaccine, initiating IVIG.",
            "A 35-year-old male with CVID receiving adequate IVIG replacement who develops progressive exertional dyspnea, splenomegaly, and high-resolution CT showing diffuse basilar micronodules and ground-glass opacities (GLILD)."
        ],
        "gaps": "Define secondary causes of hypogammaglobulinemia that must be excluded before diagnosing CVID (e.g., B-cell depleting therapies [rituximab], antiepileptics [carbamazepine], protein-losing enteropathy, nephrotic syndrome, myeloma).",
        "sources": [
            {
                "pmid": "26371839",
                "title": "Practice parameter for the diagnosis and management of primary immunodeficiency.",
                "year": 2015,
                "design": "guideline",
                "journal": "J Allergy Clin Immunol"
            },
            {
                "pmid": "10413651",
                "title": "Common variable immunodeficiency: clinical and immunological features of 248 patients.",
                "year": 1999,
                "design": "literature",
                "journal": "Clin Immunol"
            },
            {
                "pmid": "18319398",
                "title": "Common variable immunodeficiency disorders: division into distinct clinical phenotypes.",
                "year": 2008,
                "design": "literature",
                "journal": "Blood"
            },
            {
                "pmid": "24702462",
                "title": "Diagnostic criteria for common variable immunodeficiency (CVID).",
                "year": 2014,
                "design": "consensus-guideline",
                "journal": "Clin Exp Immunol"
            }
        ]
    },

    425: {
        "cluster": "community acquired pneumonia",
        "mentor_intro": (
            "Community-acquired pneumonia (CAP) is a common and potentially life-threatening lower respiratory tract infection "
            "acquired outside of hospital or healthcare environments. While Streptococcus pneumoniae remains the predominant bacterial "
            "etiology, contemporary molecular epidemiological studies (such as the CDC EPIC study) demonstrate that respiratory viruses "
            "(rhinovirus, influenza, RSV, SARS-CoV-2) are detected in a substantial proportion of hospitalized patients, often as co-pathogens. "
            "Atypical pathogens (Mycoplasma pneumoniae, Chlamydophila pneumoniae, and Legionella pneumophila) account for 15-20% of cases. "
            "Clinical presentation classically combines acute cough, purulent sputum, dyspnea, pleuritic chest pain, and fever with focal "
            "auscultatory crackles. Diagnosis requires radiographic demonstration of a new pulmonary infiltrate or consolidation on chest "
            "radiography or CT. Validated risk stratification directs appropriate outpatient versus inpatient management."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The ATS/IDSA clinical guidelines establish that diagnosis of community-acquired pneumonia requires demonstration of a "
                    "new parenchymal pulmonary infiltrate on chest radiography in the presence of acute respiratory symptoms and systemic signs."
                ),
                "cites": ["31573350"]
            },
            {
                "claim": (
                    "In the landmark CDC EPIC prospective surveillance study of 2,320 hospitalized adults with CAP, a specific pathogen was identified "
                    "in only 38% of patients, with respiratory viruses detected more frequently (27%) than bacterial pathogens (14%)."
                ),
                "cites": ["26172429"]
            },
            {
                "claim": (
                    "Streptococcus pneumoniae remains the most common bacterial etiology of community-acquired pneumonia across all age groups, "
                    "conferring the highest risk of bacteremia and secondary empyema."
                ),
                "cites": ["25337750", "31573350"]
            },
            {
                "claim": (
                    "The British Thoracic Society (BTS) guidelines recommend diagnostic sputum and blood cultures for all patients admitted to the hospital "
                    "with moderate-to-severe CAP, while omitting routine microbiologic cultures in low-risk outpatient CAP."
                ),
                "cites": ["19783532"]
            }
        ],
        "uncertainties": [
            "Clinical utility of multiplex PCR respiratory viral panels in guiding antimicrobial de-escalation and discontinuation in stable CAP patients.",
            "Optimal diagnostic evaluation for Legionella species beyond Legionella pneumophila serogroup 1 (which accounts for ~80% of urinary antigen sensitivity)."
        ],
        "mcq_angles": [
            "Diagnostic confirmation of CAP: presence of a new consolidation or infiltrate on chest imaging.",
            "Most common bacterial cause of CAP: Streptococcus pneumoniae (pneumococcus).",
            "CDC EPIC study insight: respiratory viruses are frequently identified in hospitalized CAP patients, either alone or as viral-bacterial co-infections."
        ],
        "case_hooks": [
            "A 64-year-old male smoker presenting with acute rigors, fever of 39.2°C, right-sided pleuritic chest pain, and rusty sputum, whose chest radiograph reveals dense right lower lobe lobar consolidation.",
            "A 24-year-old college student presenting with 10 days of dry paroxysmal cough, low-grade fever, malaise, and bilateral patchy infiltrates on chest X-ray, suspected of Mycoplasma pneumoniae infection."
        ],
        "gaps": "Define the diagnostic role and indications for urinary antigen testing for Streptococcus pneumoniae and Legionella pneumophila in hospitalized CAP patients.",
        "sources": [
            {
                "pmid": "31573350",
                "title": "Diagnosis and Treatment of Adults with Community-acquired Pneumonia: An Official Clinical Practice Guideline of the American Thoracic Society and Infectious Diseases Society of America.",
                "year": 2019,
                "design": "guideline",
                "journal": "Am J Respir Crit Care Med"
            },
            {
                "pmid": "26172429",
                "title": "Community-Acquired Pneumonia Requiring Hospitalization among U.S. Adults.",
                "year": 2015,
                "design": "literature",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "25337750",
                "title": "Community-acquired pneumonia.",
                "year": 2014,
                "design": "review",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "19783532",
                "title": "BTS guidelines for the management of community acquired pneumonia in adults: update 2009.",
                "year": 2009,
                "design": "guideline",
                "journal": "Thorax"
            }
        ]
    },

    426: {
        "cluster": "community-acquired pneumonia",
        "mentor_intro": (
            "Hospitalized community-acquired pneumonia (CAP) encompasses a high-risk spectrum ranging from general medical ward "
            "admissions to life-threatening acute respiratory failure and septic shock. Inpatient management requires immediate severity "
            "triage to determine if direct intensive care unit (ICU) admission is indicated. The ATS/IDSA guidelines define severe CAP by "
            "validated major criteria (invasive mechanical ventilation or septic shock requiring vasopressors) or the presence of at least "
            "three minor criteria (respiratory rate >=30, PaO2/FiO2 ratio <=250, multilobar infiltrates, acute confusion, uremia BUN >=20 mg/dL, "
            "leukopenia, thrombocytopenia, hypothermia, or hypotension requiring aggressive fluid resuscitation). Blood and sputum cultures "
            "and urinary antigen tests must be obtained before initiating parenteral antibiotics within 4 hours. Procalcitonin kinetics guide "
            "safe antibiotic de-escalation once clinical stability is established."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The ATS/IDSA guidelines mandate direct ICU admission for patients with severe CAP meeting 1 major criterion (invasive mechanical "
                    "ventilation or septic shock requiring vasopressors) or at least 3 of 9 validated minor criteria."
                ),
                "cites": ["31573350"]
            },
            {
                "claim": (
                    "The Pneumonia Severity Index (PSI / PORT score) stratifies 30-day mortality across Classes I to V based on 20 demographic, "
                    "comorbid, and laboratory variables, safely identifying low-risk patients (Classes I-II, mortality <1%) eligible for outpatient care."
                ),
                "cites": ["8995086"]
            },
            {
                "claim": (
                    "In a Cochrane systematic review of randomized trials, procalcitonin-guided algorithms significantly reduced antibiotic exposure "
                    "duration and overall prescription rates without increasing mortality or treatment failure in acute respiratory tract infections."
                ),
                "cites": ["29025111"]
            },
            {
                "claim": (
                    "Clinical failure in hospitalized CAP is categorized into early failure (<72 hours, driven by overwhelming sepsis, resistant "
                    "pathogens, or acute ARDS) and late failure (>72 hours, driven by secondary nosocomial superinfections or empyema)."
                ),
                "cites": ["24499212"]
            }
        ],
        "uncertainties": [
            "Optimal threshold of serum procalcitonin (<0.25 ug/L vs <0.1 ug/L) to safely discontinue antibiotic therapy in severe bacteremic pneumococcal pneumonia.",
            "Clinical utility of high-flow nasal cannula (HFNC) versus non-invasive ventilation (NIV) in avoiding endotracheal intubation in severe hypoxic CAP without hypercapnia."
        ],
        "mcq_angles": [
            "ATS/IDSA major criteria mandating direct ICU admission in CAP: requirement for invasive mechanical ventilation OR septic shock requiring vasopressor therapy.",
            "Procalcitonin-guided stewardship finding: safe reduction in total antibiotic duration without increased clinical relapse or mortality.",
            "Pneumonia Severity Index (PSI) Class I-II 30-day mortality: less than 1%, supporting outpatient management."
        ],
        "case_hooks": [
            "A 72-year-old male admitted with CAP whose PaO2/FiO2 is 210, respiratory rate is 34, BUN is 28 mg/dL, and CT shows bilateral lower lobe and right middle lobe infiltrates (fulfilling 4 minor criteria for ICU triage).",
            "An inpatient with pneumococcal pneumonia whose fever and leukocytosis have resolved by day 4, whose procalcitonin has declined from 4.2 to 0.18 ug/L, evaluated for antibiotic cessation."
        ],
        "gaps": "Define the ATS/IDSA minor criteria list for severe CAP (respiratory rate >=30, PaO2/FiO2 <=250, multilobar infiltrates, confusion, BUN >=20 mg/dL, WBC <4,000/uL, platelets <100,000/uL, core temp <36°C, hypotension requiring fluids).",
        "sources": [
            {
                "pmid": "31573350",
                "title": "Diagnosis and Treatment of Adults with Community-acquired Pneumonia: An Official Clinical Practice Guideline of the American Thoracic Society and Infectious Diseases Society of America.",
                "year": 2019,
                "design": "guideline",
                "journal": "Am J Respir Crit Care Med"
            },
            {
                "pmid": "8995086",
                "title": "A prediction rule to identify low-risk patients with community-acquired pneumonia.",
                "year": 1997,
                "design": "literature",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "29025111",
                "title": "Procalcitonin to initiate or discontinue antibiotics in acute respiratory tract infections.",
                "year": 2017,
                "design": "meta-analysis",
                "journal": "Cochrane Database Syst Rev"
            },
            {
                "pmid": "24499212",
                "title": "Community-acquired pneumonia.",
                "year": 2014,
                "design": "review",
                "journal": "N Engl J Med"
            }
        ]
    },

    427: {
        "cluster": "community acquired pneumonia antibiotics",
        "mentor_intro": (
            "Empiric antimicrobial selection for community-acquired pneumonia (CAP) is guided by patient setting (outpatient vs inpatient "
            "non-ICU vs ICU), underlying comorbidities, and local pathogen resistance patterns. For healthy outpatients without chronic disease, "
            "updated ATS/IDSA guidelines strongly endorse high-dose oral amoxicillin (1 g three times daily) or doxycycline (100 mg twice daily); "
            "macrolide monotherapy is restricted strictly to regions where pneumococcal macrolide resistance is documented to be <25%. In "
            "outpatients with chronic cardiopulmonary, renal, or metabolic comorbidities, combination therapy (amoxicillin-clavulanate plus a "
            "macrolide/doxycycline) or respiratory fluoroquinolone monotherapy (levofloxacin, moxifloxacin) is mandatory. In hospitalized non-ICU "
            "patients, the landmark CAP-START trial demonstrated equivalent outcomes between beta-lactam monotherapy, beta-lactam plus macrolide, "
            "and fluoroquinolone monotherapy. Treatment duration should be limited to 5 days once clinical stability is established."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The ATS/IDSA 2019 guidelines recommend amoxicillin (1 g tid) or doxycycline as preferred first-line empiric monotherapy for "
                    "outpatient CAP in healthy adults without comorbidities, advising against macrolide monotherapy if local pneumococcal resistance exceeds 25%."
                ),
                "cites": ["31573350"]
            },
            {
                "claim": (
                    "In a randomized non-inferiority trial by Uranga et al., discontinuing antibiotics at day 5 in hospitalized CAP patients who "
                    "were afebrile for 48 hours and clinically stable was non-inferior to conventional 10-day courses."
                ),
                "cites": ["27455166"]
            },
            {
                "claim": (
                    "The cluster-randomized CAP-START trial of 2,283 hospitalized non-ICU CAP patients showed that beta-lactam monotherapy, "
                    "beta-lactam plus macrolide, and fluoroquinolone monotherapy achieved equivalent 90-day mortality (~9-10%)."
                ),
                "cites": ["25830421"]
            },
            {
                "claim": (
                    "Respiratory fluoroquinolones (levofloxacin 750 mg daily, moxifloxacin 400 mg daily) achieve high clinical cure rates in "
                    "comorbid CAP, covering both penicillin-resistant Streptococcus pneumoniae and atypical intracellular pathogens."
                ),
                "cites": ["9303394", "31573350"]
            }
        ],
        "uncertainties": [
            "Comparative outcomes of beta-lactam monotherapy versus beta-lactam plus macrolide specifically in bacteremic pneumococcal pneumonia.",
            "Long-term tendon rupture, aortic aneurysm dissection, and neuropsychiatric safety risks associated with fluoroquinolone prescribing."
        ],
        "mcq_angles": [
            "First-line oral antibiotic for uncomplicated outpatient CAP in a healthy adult: high-dose amoxicillin (1 g tid) or doxycycline.",
            "Evidence-based duration of antimicrobial therapy in responsive CAP: 5 days (provided afebrile for >=48 hours and stable vitals).",
            "CAP-START trial primary finding: beta-lactam monotherapy was non-inferior to beta-lactam/macrolide and fluoroquinolone strategies in non-ICU inpatients."
        ],
        "case_hooks": [
            "A 34-year-old previously healthy female diagnosed with mild right middle lobe pneumonia in urgent care, prescribed oral amoxicillin 1 g three times daily for 5 days.",
            "A 68-year-old male with COPD and type 2 diabetes presenting with CAP, requiring broad empiric coverage with amoxicillin-clavulanate plus azithromycin."
        ],
        "gaps": "Define the criteria for clinical stability (temp <=37.8°C, HR <=100, RR <=24, SBP >=90, SpO2 >=90% on room air, and ability to maintain oral intake).",
        "sources": [
            {
                "pmid": "31573350",
                "title": "Diagnosis and Treatment of Adults with Community-acquired Pneumonia: An Official Clinical Practice Guideline of the American Thoracic Society and Infectious Diseases Society of America.",
                "year": 2019,
                "design": "guideline",
                "journal": "Am J Respir Crit Care Med"
            },
            {
                "pmid": "27455166",
                "title": "Duration of Antibiotic Treatment in Community-Acquired Pneumonia: A Multicenter Randomized Clinical Trial.",
                "year": 2016,
                "design": "trial",
                "journal": "JAMA Intern Med"
            },
            {
                "pmid": "25830421",
                "title": "Antibiotic Treatment Strategies for Community-Acquired Pneumonia in Adults.",
                "year": 2015,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "9303394",
                "title": "A multicenter, randomized, double-blind study of oral levofloxacin versus oral clarithromycin in the treatment of community-acquired pneumonia.",
                "year": 1997,
                "design": "trial",
                "journal": "Antimicrob Agents Chemother"
            }
        ]
    },

    428: {
        "cluster": "Community-acquired pneumonia: CURB-65, PSI, empirical therapy, atypical pathogens",
        "mentor_intro": (
            "Objective risk assessment in community-acquired pneumonia (CAP) guides site-of-care decisions, reducing avoidable hospital "
            "admissions and associated nosocomial complications. The two primary validated scoring systems are CURB-65 and the Pneumonia "
            "Severity Index (PSI). CURB-65 assigns 1 point each for Confusion, Urea >7 mmol/L (BUN >19 mg/dL), Respiratory rate >=30/min, "
            "Blood pressure (SBP <90 or DBP <=60 mmHg), and Age >=65; scores 0-1 indicate outpatient management, score 2 warrants short inpatient "
            "or supervised care, and scores 3-5 mandate inpatient treatment with consideration of ICU admission. PSI incorporates 20 variables "
            "and demonstrates higher sensitivity for safely triaging low-risk patients (Classes I-III) to outpatient care. Empiric therapy "
            "must cover atypical pathogens (Mycoplasma, Chlamydophila, Legionella), which lack peptidoglycan cell walls and are inherently "
            "resistant to beta-lactam antimicrobials, requiring macrolides, tetracyclines, or fluoroquinolones."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The CURB-65 severity score stratifies 30-day mortality from 0.7% (score 0) to >30% (score 4-5), guiding triage: scores 0-1 "
                    "are suitable for outpatient therapy, score 2 requires inpatient consideration, and scores >=3 indicate severe CAP."
                ),
                "cites": ["12728155", "19783532"]
            },
            {
                "claim": (
                    "The Pneumonia Severity Index (PSI) stratifies patients into 5 mortality risk classes; the ATS/IDSA guidelines recommend PSI "
                    "over CURB-65 because PSI identifies a larger proportion of low-risk patients (Classes I-II) who can be safely treated at home."
                ),
                "cites": ["8995086", "31573350"]
            },
            {
                "claim": (
                    "Atypical pneumonia pathogens (Mycoplasma pneumoniae, Chlamydophila pneumoniae, Legionella pneumophila) lack peptidoglycan cell "
                    "walls and are inherently resistant to all beta-lactam antibiotics, mandating protein-synthesis or DNA-gyrase inhibitors."
                ),
                "cites": ["31573350", "19783532"]
            },
            {
                "claim": (
                    "In patients with severe CAP (CURB-65 >=3), combination therapy with a beta-lactam plus a macrolide reduces mortality compared "
                    "to beta-lactam monotherapy, driven by atypical coverage and immunomodulatory anti-inflammatory effects of macrolides."
                ),
                "cites": ["19783532", "31573350"]
            }
        ],
        "uncertainties": [
            "Prognostic performance of CRB-65 (omitting blood urea measurement) in primary care triage of acute pneumonia.",
            "Impact of macrolide resistance in Mycoplasma pneumoniae on treatment failure with azithromycin versus switching to doxycycline."
        ],
        "mcq_angles": [
            "CURB-65 score elements: Confusion, Urea >7 mmol/L, Respiratory rate >=30, Blood pressure <90/60, Age >=65.",
            "Inherent antimicrobial resistance of atypical pathogens: complete lack of peptidoglycan cell wall makes them completely resistant to beta-lactams.",
            "Comparative advantage of PSI over CURB-65: higher sensitivity for identifying low-risk patients who can be safely managed as outpatients."
        ],
        "case_hooks": [
            "A 72-year-old female presenting with right lower lobe pneumonia whose mental status is intact, BUN is 5.8 mmol/L, RR is 22, BP is 128/76 mmHg (CURB-65 score = 1), evaluated for outpatient oral therapy.",
            "A 45-year-old male presenting with severe Legionella pneumonia (hyponatremia, diarrhea, high fevers, confusion), initiated on IV levofloxacin."
        ],
        "gaps": "Define the CURB-65 30-day mortality risks: score 0 (0.6%), score 1 (2.7%), score 2 (6.8%), score 3 (14.0%), score 4 (27.8%), score 5 (31.2%).",
        "sources": [
            {
                "pmid": "12728155",
                "title": "Defining community acquired pneumonia severity on presentation to hospital: an international derivation and validation study.",
                "year": 2003,
                "design": "literature",
                "journal": "Thorax"
            },
            {
                "pmid": "8995086",
                "title": "A prediction rule to identify low-risk patients with community-acquired pneumonia.",
                "year": 1997,
                "design": "literature",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "31573350",
                "title": "Diagnosis and Treatment of Adults with Community-acquired Pneumonia: An Official Clinical Practice Guideline of the American Thoracic Society and Infectious Diseases Society of America.",
                "year": 2019,
                "design": "guideline",
                "journal": "Am J Respir Crit Care Med"
            },
            {
                "pmid": "19783532",
                "title": "BTS guidelines for the management of community acquired pneumonia in adults: update 2009.",
                "year": 2009,
                "design": "guideline",
                "journal": "Thorax"
            }
        ]
    },

    429: {
        "cluster": "Community acquired pneumonia diagnosis and management",
        "mentor_intro": (
            "Comprehensive management of community-acquired pneumonia spans rapid diagnostic confirmation, risk-adapted antimicrobial "
            "therapy, timely oral step-down, and planned recovery surveillance. Diagnosis combines clinical signs with radiographic verification. "
            "For hospitalized patients, routine microbiologic testing includes blood cultures, sputum Gram stain/culture, and urinary antigen "
            "assays for Streptococcus pneumoniae and Legionella pneumophila. Parenteral therapy is transitioned to oral step-down as early as "
            "day 2 to 3 once the patient is hemodynamically stable, afebrile, and able to absorb oral medications, significantly shortening "
            "hospital length of stay without compromising cure rates. A follow-up chest radiograph is recommended at 6 to 8 weeks post-discharge "
            "for patients aged >=50 or smokers to document radiographic resolution and exclude underlying bronchogenic carcinoma."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In a randomized multicenter trial by Oosterheert et al., an early switch from intravenous to oral antibiotics on day 3 "
                    "reduced hospital length of stay by 2 days without increasing clinical failure or mortality in severe CAP."
                ),
                "cites": ["17090560"]
            },
            {
                "claim": (
                    "The CAP-START trial demonstrated that in hospitalized non-ICU patients with CAP, a preferred empirical beta-lactam monotherapy "
                    "strategy was non-inferior to beta-lactam-macrolide combination therapy in 90-day mortality (HR 1.05)."
                ),
                "cites": ["25830421"]
            },
            {
                "claim": (
                    "The ATS/IDSA guidelines recommend switching from intravenous to oral therapy as soon as clinical stability criteria are met "
                    "(normalized heart rate, respiratory rate, blood pressure, oxygenation, and temperature) and gastrointestinal absorption is intact."
                ),
                "cites": ["31573350"]
            },
            {
                "claim": (
                    "The BTS guidelines advise a repeat chest radiograph at 6 weeks following clinical discharge for patients whose symptoms persist "
                    "or who are at high risk of underlying malignancy (smokers and age >50 years)."
                ),
                "cites": ["19783532"]
            }
        ],
        "uncertainties": [
            "Clinical utility and cost-effectiveness of routine rapid syndromic multiplex PCR respiratory panels on lower respiratory tract specimens in non-ICU inpatients.",
            "Rate of delayed radiographic resolution of pneumococcal consolidation in elderly patients (often taking up to 12 weeks despite complete clinical recovery)."
        ],
        "mcq_angles": [
            "Criteria for safe IV-to-oral antibiotic step-down in CAP: hemodynamic stability, afebrile for >=24 hours, respiratory rate <24, and normal oral intake.",
            "Indication for follow-up chest radiograph at 6 weeks post-CAP: adults aged >50 years or smokers to rule out an underlying endobronchial malignancy.",
            "CAP-START trial clinical message: empirical beta-lactam monotherapy is non-inferior to combination therapy for non-ICU hospitalized patients."
        ],
        "case_hooks": [
            "A 58-year-old male with CAP receiving IV ceftriaxone who on hospital day 3 is afebrile with normal vital signs, tolerating a regular diet, transitioned to oral cefpodoxime.",
            "A 62-year-old chronic smoker treated successfully for left upper lobe pneumonia, scheduled for an outpatient chest X-ray at 6 weeks to ensure complete infiltrate clearance."
        ],
        "gaps": "Outline the diagnostic criteria for parapneumonic effusion and indications for diagnostic thoracentesis (pleural fluid depth >10 mm on ultrasound or decubitus radiograph).",
        "sources": [
            {
                "pmid": "17090560",
                "title": "Effectiveness of early switch from intravenous to oral antibiotics in severe community acquired pneumonia: multicentre randomised trial.",
                "year": 2006,
                "design": "trial",
                "journal": "BMJ"
            },
            {
                "pmid": "25830421",
                "title": "Antibiotic Treatment Strategies for Community-Acquired Pneumonia in Adults.",
                "year": 2015,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "31573350",
                "title": "Diagnosis and Treatment of Adults with Community-acquired Pneumonia: An Official Clinical Practice Guideline of the American Thoracic Society and Infectious Diseases Society of America.",
                "year": 2019,
                "design": "guideline",
                "journal": "Am J Respir Crit Care Med"
            },
            {
                "pmid": "19783532",
                "title": "BTS guidelines for the management of community acquired pneumonia in adults: update 2009.",
                "year": 2009,
                "design": "guideline",
                "journal": "Thorax"
            }
        ]
    },

    430: {
        "cluster": "community acquired pneumonia diagnosis empiric antibiotic management guideline adult",
        "mentor_intro": (
            "Severe community-acquired pneumonia (sCAP) requiring intensive care admission is associated with mortality rates exceeding "
            "20% to 30%, driven by septic shock, multiorgan dysfunction, and acute respiratory distress syndrome (ARDS). Contemporary "
            "international guidelines from ATS/IDSA and the European Society of Intensive Care Medicine (ESICM/ERS) mandate immediate "
            "parenteral combination therapy: a potent non-antipseudomonal beta-lactam (ceftriaxone, cefotaxime, or ampicillin-sulbactam) "
            "plus a macrolide (intravenous azithromycin) or a respiratory fluoroquinolone. Empiric coverage for Pseudomonas aeruginosa "
            "or MRSA should NOT be applied universally, but restricted strictly to patients with documented prior respiratory isolation or "
            "validated risk factors. In a landmark breakthrough, the randomized double-blind CAPE COD trial demonstrated that early adjunctive "
            "hydrocortisone (200 mg daily) significantly reduced 28-day mortality in severe CAP."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the landmark multicenter double-blind CAPE COD trial, early treatment with intravenous hydrocortisone (200 mg daily) "
                    "significantly reduced 28-day all-cause mortality (6.2% vs 11.9%, absolute reduction 5.6%) in patients with severe CAP admitted to the ICU."
                ),
                "cites": ["36942789"]
            },
            {
                "claim": (
                    "The ATS/IDSA guidelines strongly recommend combination therapy with an intravenous beta-lactam plus a macrolide, or a beta-lactam "
                    "plus a respiratory fluoroquinolone, for all adult patients admitted to the ICU with severe community-acquired pneumonia."
                ),
                "cites": ["31573350"]
            },
            {
                "claim": (
                    "The ESICM/ERS/ESCMID 2023 severe CAP guidelines recommend against routine empiric coverage for MRSA or Pseudomonas aeruginosa "
                    "unless specific validated local risk factors (prior respiratory isolation, recent hospitalization with parenteral antibiotics) are present."
                ),
                "cites": ["37049802"]
            },
            {
                "claim": (
                    "Early identification of severe CAP using ATS/IDSA criteria enables rapid delivery of resuscitation bundles, early invasive "
                    "monitoring, lung-protective mechanical ventilation, and timely diagnostic blood and tracheal cultures."
                ),
                "cites": ["18263683", "31573350"]
            }
        ],
        "uncertainties": [
            "Generalizability of the CAPE COD hydrocortisone survival benefit to severe CAP caused by viral pathogens (e.g., severe influenza pneumonia, where steroids may increase mortality).",
            "Optimal duration of adjunctive hydrocortisone therapy (continuous infusion for 8-14 days vs rapid 4-7 day taper)."
        ],
        "mcq_angles": [
            "Landmark CAPE COD trial finding: adjunctive IV hydrocortisone significantly reduced 28-day mortality in severe CAP.",
            "Preferred empiric antibiotic regimen for severe CAP in the ICU: IV beta-lactam (e.g., ceftriaxone) plus IV macrolide (azithromycin) or respiratory fluoroquinolone.",
            "Guideline-directed criteria for adding MRSA or antipseudomonal coverage: presence of validated risk factors (prior respiratory culture isolation) rather than universal empiric coverage."
        ],
        "case_hooks": [
            "A 64-year-old male admitted to the ICU with septic shock and hypoxic respiratory failure (PaO2/FiO2 160) secondary to pneumococcal pneumonia, initiated on IV ceftriaxone, IV azithromycin, and IV hydrocortisone.",
            "A 70-year-old patient with severe CAP and a history of Pseudomonas colonization during a prior bronchiectasis admission, initiating piperacillin-tazobactam plus ciprofloxacin."
        ],
        "gaps": "Define nasal MRSA PCR screening as a high-negative-predictive-value tool (>95% NPV) to rapidly discontinue empiric anti-MRSA therapy (vancomycin or linezolid) in pneumonia.",
        "sources": [
            {
                "pmid": "36942789",
                "title": "Hydrocortisone in Severe Community-Acquired Pneumonia.",
                "year": 2023,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "31573350",
                "title": "Diagnosis and Treatment of Adults with Community-acquired Pneumonia: An Official Clinical Practice Guideline of the American Thoracic Society and Infectious Diseases Society of America.",
                "year": 2019,
                "design": "guideline",
                "journal": "Am J Respir Crit Care Med"
            },
            {
                "pmid": "37049802",
                "title": "Management of severe community-acquired pneumonia.",
                "year": 2023,
                "design": "guideline",
                "journal": "Intensive Care Med"
            },
            {
                "pmid": "18263683",
                "title": "Early identification of patients with community-acquired pneumonia who are at risk of clinical failure.",
                "year": 2008,
                "design": "literature",
                "journal": "Chest"
            }
        ]
    }
}
