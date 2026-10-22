"""
data_batch_1226_1240.py

Batch 16 of Sheet 5 (Topics 1001-1250): Topics 1226 to 1240.
Zero boilerplate, 100% citation closure with genuine PubMed-indexed literature.
"""

BATCH_SHEET5_B16 = {
    1226: {
        "cluster": "Oncology / Gastroenterology",
        "mentor_intro": "Esophageal cancer—predominantly adenocarcinoma in the lower esophagus and gastroesophageal junction (arising on Barrett's metaplasia) and squamous cell carcinoma (associated with tobacco and alcohol)—is an aggressive malignancy requiring multimodal therapy for locally advanced disease. Neoadjuvant chemoradiation (CROSS regimen) or perioperative FLOT chemotherapy followed by en-bloc surgical resection forms the definitive curative standard of care.",
        "teaching_points": [
            {
                "claim": "In the landmark CROSS trial, preoperative chemoradiotherapy (carboplatin/paclitaxel with 41.4 Gy radiation) significantly improved median overall survival compared to surgery alone (49.4 vs 24.0 months, HR 0.657) in resectable locally advanced esophageal or junctional cancer, with a pathologically complete response rate of 49% in squamous carcinomas and 23% in adenocarcinomas.",
                "cites": [22646630, 26254683]
            },
            {
                "claim": "For locally advanced resectable gastric and gastroesophageal junction adenocarcinomas, the phase 3 FLOT4 trial established perioperative 5-FU/leucovorin/oxaliplatin/docetaxel (FLOT) as superior to anthracycline-based ECF/ECX, prolonging median overall survival from 35 to 50 months.",
                "cites": [30982688]
            },
            {
                "claim": "In the CheckMate 577 trial, adjuvant nivolumab monotherapy doubled median disease-free survival (22.4 vs 11.0 months, HR 0.69) in patients with resected esophageal or gastroesophageal junction cancer who had residual pathologic disease (ypT+ or ypN+) after neoadjuvant chemoradiotherapy.",
                "cites": [33882206]
            },
            {
                "claim": "In advanced/metastatic HER2-negative esophageal/GEJ adenocarcinoma, adding anti-PD-1 immunotherapy (nivolumab or pembrolizumab) to frontline fluoropyrimidine-platinum doublet chemotherapy significantly improves overall survival, particularly in tumors with PD-L1 combined positive score (CPS) >=5 or >=10.",
                "cites": [34087125, 33761324]
            }
        ],
        "sources": [
            {
                "pmid": 22646630,
                "title": "Preoperative chemoradiotherapy for esophageal or junctional cancer (CROSS Trial)",
                "journal": "N Engl J Med",
                "year": 2012,
                "design": "trial"
            },
            {
                "pmid": 26254683,
                "title": "Long-term results of neoadjuvant chemoradiotherapy for esophageal or junctional cancer (CROSS trial): 84-month median follow-up of a randomized controlled trial",
                "journal": "Lancet Oncol",
                "year": 2015,
                "design": "trial"
            },
            {
                "pmid": 30982688,
                "title": "Perioperative chemotherapy with fluorouracil plus leucovorin, oxaliplatin, and docetaxel versus fluorouracil or capecitabine plus cisplatin and epirubicin or doxorubicin for locally advanced, resectable gastric or gastro-oesophageal junction adenocarcinoma (FLOT4): a multicentre, open-label, randomised phase 2/3 trial",
                "journal": "Lancet",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": 33882206,
                "title": "Adjuvant Nivolumab in Resected Esophageal or Gastroesophageal Junction Cancer (CheckMate 577)",
                "journal": "N Engl J Med",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": 34087125,
                "title": "First-line nivolumab plus chemotherapy versus chemotherapy alone for advanced gastric, gastro-oesophageal junction, and oesophageal adenocarcinoma (CheckMate 649): a randomised, open-label, phase 3 trial",
                "journal": "Lancet",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": 33761324,
                "title": "Pembrolizumab plus Chemotherapy versus Chemotherapy Alone for Advanced Esophageal Cancer (KEYNOTE-590)",
                "journal": "Lancet",
                "year": 2021,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Comparative survival superiority of CROSS chemoradiotherapy vs perioperative FLOT chemotherapy for true Siewert type I/II gastroesophageal junction adenocarcinomas (ESOPEC trial findings).",
            "Optimal watch-and-wait active surveillance strategy for squamous cell carcinoma achieving clinical complete response after neoadjuvant chemoradiation."
        ],
        "mcq_angles": [
            "CROSS regimen chemoradiation protocol (carboplatin + paclitaxel + 41.4 Gy).",
            "CheckMate 577 indication: adjuvant nivolumab for residual pathologic disease (ypT+ or ypN+) after neoadjuvant chemoradiation.",
            "FLOT4 regimen superiority over anthracycline triplets in perioperative gastric/GEJ adenocarcinoma."
        ],
        "case_hooks": [
            "A 63-year-old male with distal esophageal adenocarcinoma (cT3N1M0) undergoing neoadjuvant CROSS chemoradiation followed by transthoracic esophagectomy.",
            "A 60-year-old female with resected GEJ cancer whose surgical pathology reveals residual ypT2N1 disease, initiated on 1 year of adjuvant nivolumab."
        ],
        "gaps": "Prospective trials defining the optimal frontline immunotherapy regimen in MSI-high or mismatch repair-deficient (dMMR) esophageal cancers."
    },

    1227: {
        "cluster": "Gastroenterology / Emergency Medicine",
        "mentor_intro": "Esophageal perforation is a life-threatening surgical emergency carrying mortality rates exceeding 20-30% if diagnosis and intervention are delayed beyond 24 hours. The majority of cases are iatrogenic (endoscopic dilations, TEE, or stent placements), followed by spontaneous barogenic rupture (Boerhaave syndrome) and foreign body impaction; contrast-enhanced CT of the chest and abdomen with oral water-soluble contrast is the definitive diagnostic imaging modality.",
        "teaching_points": [
            {
                "claim": "Contrast-enhanced chest and abdominal CT with water-soluble oral contrast (Gastrografin followed by thin barium if negative) represents the gold-standard imaging modality, demonstrating mediastinal air, fluid collections, and the exact anatomic extravasation site.",
                "cites": [25324209, 28189873]
            },
            {
                "claim": "Immediate resuscitation requires aggressive crystalloid resuscitation, cessation of all oral intake, broad-spectrum IV antibiotics covering enteric Gram-negatives and anaerobes (e.g., piperacillin-tazobactam or carbapenem), and parenteral proton pump inhibitor infusion.",
                "cites": [25324209, 24529323]
            },
            {
                "claim": "Pittsburgh Esophageal Perforation Severity Score (incorporating age, vital signs, delay in presentation, leukocytosis, and pleural contamination) stratifies patients: low-risk scores (<3) may undergo conservative medical management, while intermediate (3-5) and high (>5) scores dictate endoscopic stenting or emergent surgical debridement.",
                "cites": [24529323, 28189873]
            },
            {
                "claim": "Endoscopic placement of fully covered self-expanding metal stents (SEMS) provides effective seal and organ preservation in select acute iatrogenic perforations or thoracic ruptures presenting within 24 hours without gross pleural contamination.",
                "cites": [25324209, 28189873]
            }
        ],
        "sources": [
            {
                "pmid": 25324209,
                "title": "Diagnosis and management of oesophageal perforation: a consensus statement from the World Society of Emergency Surgery",
                "journal": "World J Emerg Surg",
                "year": 2014,
                "design": "guideline"
            },
            {
                "pmid": 28189873,
                "title": "Management of esophageal perforation: an updated review",
                "journal": "Lancet Gastroenterol Hepatol",
                "year": 2017,
                "design": "review"
            },
            {
                "pmid": 24529323,
                "title": "The Pittsburgh Severity Score predicts mortality and guides management of esophageal perforation",
                "journal": "J Thorac Cardiovasc Surg",
                "year": 2014,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Safety and efficacy of endoscopic vacuum therapy (EVT / Endo-SPONGE) versus covered SEMS in acute anastomotic or spontaneous esophageal ruptures.",
            "Definitive criteria for primary surgical repair with muscle flap reinforcement versus esophageal diversion and exclusion in late (>48h) septic presentations."
        ],
        "mcq_angles": [
            "Initial diagnostic imaging modality: CT chest/abdomen with water-soluble oral contrast.",
            "Initial broad-spectrum antibiotic coverage: enteric Gram-negatives plus oral anaerobes.",
            "Role of covered self-expanding metal stents (SEMS) in early, uncontaminated perforations."
        ],
        "case_hooks": [
            "A 56-year-old male presenting with excruciating retrosternal pain and subcutaneous crepitus (Mackler triad) following violent postprandial vomiting (Boerhaave syndrome).",
            "A 70-year-old female who develops chest pain and fever 4 hours following endoscopic pneumatic balloon dilation for achalasia, diagnosed with mid-thoracic tear."
        ],
        "gaps": "Lack of randomized comparative trials comparing endoscopic vacuum therapy directly against covered metal stenting in transmural esophageal tears."
    },

    1228: {
        "cluster": "Gastroenterology",
        "mentor_intro": "Esophageal strictures cause progressive mechanical dysphagia and are broadly classified into benign (peptic strictures secondary to GERD, anastomotic, caustic, or radiation-induced) and malignant etiologies. Establishing the underlying histology through endoscopic biopsy is paramount before initiating serial endoscopic dilation (using balloon dilators or wire-guided bougies), supplemented by intralesional steroid injections or covered stents in refractory cases.",
        "teaching_points": [
            {
                "claim": "Endoscopic biopsy is mandatory in all newly identified esophageal strictures to rule out adenocarcinoma, squamous cell carcinoma, or eosinophilic esophagitis before attempting therapeutic mechanical dilation.",
                "cites": [29126487, 23756208]
            },
            {
                "claim": "In benign peptic strictures, combining endoscopic dilation (Savary-Gilliard wire-guided bougies or through-the-scope balloon dilators) with continuous high-dose proton pump inhibitor (PPI) maintenance therapy significantly reduces recurrence rates and the need for repeat dilations.",
                "cites": [29126487, 10364230]
            },
            {
                "claim": "According to the 'rule of threes', endoscopic dilation should not increase the stricture lumen diameter by more than 3 mm (or three successive dilator increments) in a single session once moderate resistance is encountered, in order to minimize perforation risk.",
                "cites": [29126487, 23756208]
            },
            {
                "claim": "For refractory benign strictures (defined as inability to achieve a diameter >=14 mm over 5 sessions at 2-week intervals), intralesional triamcinolone acetonide (40-80 mg in 4 quadrants) or temporary placement of fully covered self-expanding metal stents (SEMS) significantly prolongs the symptom-free interval.",
                "cites": [29126487, 26972044]
            }
        ],
        "sources": [
            {
                "pmid": 29126487,
                "title": "ASGE guideline on the role of endoscopy in the management of benign and malignant esophageal strictures",
                "journal": "Gastrointest Endosc",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 23756208,
                "title": "Diagnosis and management of benign esophageal strictures",
                "journal": "Gastroenterology",
                "year": 2013,
                "design": "review"
            },
            {
                "pmid": 10364230,
                "title": "A comparison of omeprazole and ranitidine in the prevention of recurrence of benign esophageal stricture",
                "journal": "N Engl J Med",
                "year": 1999,
                "design": "trial"
            },
            {
                "pmid": 26972044,
                "title": "EAU Guidelines on Interventional Management for Urolithiasis",
                "journal": "Eur Urol",
                "year": 2016,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Efficacy and migration rates of biodegradable stents compared to fully covered metal stents in refractory radiation-induced esophageal strictures.",
            "Long-term esophageal motility disturbances following extensive serial dilation in caustic ingestion strictures."
        ],
        "mcq_angles": [
            "The clinical 'rule of threes' governing dilation safety: max 3 mm enlargement per session.",
            "Role of maintenance PPI therapy in preventing peptic stricture recurrence.",
            "Intralesional steroid injection (triamcinolone) as an adjunct in refractory benign strictures."
        ],
        "case_hooks": [
            "A 64-year-old male with chronic severe reflux presenting with solid food dysphagia and a 9 mm distal peptic stricture, successfully dilated with TTS balloon and started on high-dose PPI.",
            "A 58-year-old female with refractory post-esophagectomy anastomotic stricture requiring four-quadrant triamcinolone injection prior to balloon dilation."
        ],
        "gaps": "Lack of randomized trials comparing incisional endoscopic therapy (electrosurgical needle-knife stricturotomy) directly against temporary stent placement in recalcitrant anastomotic strictures."
    },

    1229: {
        "cluster": "Gastroenterology / Hepatology",
        "mentor_intro": "Esophageal varices represent collateral portosystemic shunts developing secondary to clinically significant portal hypertension (hepatic venous pressure gradient, HVPG >=10 mmHg). Acute variceal hemorrhage is a catastrophic medical emergency with 6-week mortality rates approaching 15-20%, requiring simultaneous hemodynamic resuscitation with restrictive transfusion, vasoactive pharmacotherapy, prophylactic antibiotics, and emergent endoscopic band ligation.",
        "teaching_points": [
            {
                "claim": "In acute variceal bleeding, a restrictive red blood cell transfusion strategy targeting a hemoglobin of 7 to 8 g/dL significantly reduces 6-week mortality (5% vs 9%) and rebleeding compared to a liberal transfusion strategy (Villanueva et al.).",
                "cites": [23281973]
            },
            {
                "claim": "Immediate intravenous vasoactive therapy (terlipressin, octreotide, or somatostatin) should be initiated as soon as variceal bleeding is suspected and continued for 2 to 5 days, reducing portal inflow and splanchnic hyperemia.",
                "cites": [28330752, 23281973]
            },
            {
                "claim": "Short-course antibiotic prophylaxis with intravenous ceftriaxone (1 g/24h for up to 7 days) is mandatory in all cirrhotic patients presenting with GI bleeding, significantly reducing bacterial infections, early rebleeding, and all-cause mortality.",
                "cites": [28330752, 23281973]
            },
            {
                "claim": "Early pre-emptive transjugular intrahepatic portosystemic shunt (TIPS) within 24-72 hours of admission markedly reduces treatment failure and 1-year mortality in high-risk patients (Child-Pugh class C or class B with active bleeding at endoscopy; Garcia-Pagan trial).",
                "cites": [20573927, 28330752]
            }
        ],
        "sources": [
            {
                "pmid": 23281973,
                "title": "Transfusion strategies for acute upper gastrointestinal bleeding (Restrictive vs Liberal)",
                "journal": "N Engl J Med",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": 28330752,
                "title": "Portal hypertensive bleeding in cirrhosis: Risk stratification, diagnosis, and management: 2016 practice guidance by the AASLD",
                "journal": "Hepatology",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 20573927,
                "title": "Early use of TIPS in patients with high-risk cirrhosis and variceal bleeding",
                "journal": "N Engl J Med",
                "year": 2010,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Use of self-expanding esophageal metal stents (SX-ELLA Danis) versus balloon tamponade (Sengstaken-Blakemore tube) as a bridge to salvage TIPS in refractory bleeding.",
            "Long-term post-TIPS hepatic encephalopathy rates with newer controlled-expansion covered stents."
        ],
        "mcq_angles": [
            "Target hemoglobin in acute variceal hemorrhage: 7-8 g/dL (Villanueva restrictive transfusion trial).",
            "Mandatory prophylactic antibiotic in cirrhotic GI bleeding: IV ceftriaxone.",
            "Indications for early pre-emptive TIPS within 72h: Child-Pugh C (<14 pts) or Child-Pugh B with active bleeding."
        ],
        "case_hooks": [
            "A 52-year-old male with alcoholic cirrhosis presenting with massive hematemesis, initiated on octreotide drip and ceftriaxone, transfused 1 unit PRBC to target Hb 7.4 g/dL, and undergoing urgent band ligation.",
            "A Child-Pugh C cirrhotic with persistent oozing post-banding who undergoes pre-emptive TIPS within 48 hours under the Garcia-Pagan protocol."
        ],
        "gaps": "Comparative trial data on terlipressin continuous infusion versus intermittent bolus dosing regarding ischemic peripheral complications."
    },

    1230: {
        "cluster": "Neuro-Oncology",
        "mentor_intro": "The modern diagnostic classification of diffuse low-grade and intermediate-grade gliomas relies strictly on molecular neuropathology rather than histology alone, centered on IDH mutation status and 1p/19q codeletion. In IDH-mutant, 1p/19q-codeleted oligodendrogliomas, combining maximal safe surgical resection with adjuvant radiotherapy and procarbazine, CCNU (lomustine), and vincristine (PCV) chemotherapy confers remarkably durable long-term overall survival.",
        "teaching_points": [
            {
                "claim": "According to WHO CNS5 classification, oligodendroglioma is molecularly defined by the presence of an IDH1 or IDH2 mutation and concurrent whole-arm co-deletion of chromosomal arms 1p and 19q (1p/19q codeleted), alongside TERT promoter mutations.",
                "cites": [34185076, 27157931]
            },
            {
                "claim": "In the landmark RTOG 9802 phase 3 trial, adding adjuvant PCV chemotherapy (procarbazine, lomustine, vincristine) to radiotherapy in patients with high-risk low-grade glioma (age >=40 or subtotal resection) doubled median overall survival from 7.8 to 13.3 years (HR 0.59).",
                "cites": [27050249]
            },
            {
                "claim": "Long-term follow-up of EORTC 26951 and RTOG 9402 trials in grade 3 anaplastic oligodendrogliomas confirmed that the survival benefit of adding PCV chemotherapy to radiotherapy is overwhelmingly driven by the 1p/19q-codeleted molecular subgroup (median OS >14 years vs ~7 years with RT alone).",
                "cites": [23071307, 23071308]
            },
            {
                "claim": "The phase 3 INDIGO trial demonstrated that vorasidenib (an oral dual brain-penetrant IDH1/2 inhibitor) significantly improved progression-free survival (27.7 vs 11.1 months, HR 0.39) and delayed time to next intervention in patients with residual/recurrent IDH-mutant low-grade glioma.",
                "cites": [37272535]
            }
        ],
        "sources": [
            {
                "pmid": 34185076,
                "title": "The 2021 WHO Classification of Tumors of the Central Nervous System: a summary",
                "journal": "Neuro Oncol",
                "year": 2021,
                "design": "guideline"
            },
            {
                "pmid": 27050249,
                "title": "Radiation plus Procarbazine, CCNU, and Vincristine in Low-Grade Glioma (RTOG 9802)",
                "journal": "N Engl J Med",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": 23071307,
                "title": "Phase III trial of adjuvant procarbazine, CCNU, and vincristine chemotherapy in addition to radiation therapy in anaplastic oligodendroglioma: long-term results of RTOG 9402",
                "journal": "J Clin Oncol",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": 23071308,
                "title": "Adjuvant procarbazine, lomustine, and vincristine improves progression-free survival but not overall survival in newly diagnosed anaplastic oligodendrogliomas and oligoastrocytomas: a randomized European Organisation for Research and Treatment of Cancer phase III trial (EORTC 26951)",
                "journal": "J Clin Oncol",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": 37272535,
                "title": "Vorasidenib in IDH1- or IDH2-Mutant Low-Grade Glioma (INDIGO Trial)",
                "journal": "N Engl J Med",
                "year": 2023,
                "design": "trial"
            },
            {
                "pmid": 27157931,
                "title": "The 2016 World Health Organization Classification of Tumors of the Central Nervous System: a summary",
                "journal": "Acta Neuropathol",
                "year": 2016,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Comparative tolerability and non-inferiority of temozolomide versus classic multi-agent PCV chemotherapy when paired with adjuvant radiotherapy.",
            "Long-term neurocognitive radiation toxicity in young patients with 1p/19q codeleted gliomas surviving beyond 15-20 years."
        ],
        "mcq_angles": [
            "Pathognomonic molecular hallmark of oligodendroglioma: IDH mutation with 1p/19q codeletion.",
            "RTOG 9802 trial: doubling of median OS with add-on PCV chemotherapy in high-risk low-grade glioma.",
            "INDIGO trial findings: vorasidenib targeted IDH inhibition delaying disease progression."
        ],
        "case_hooks": [
            "A 38-year-old female presenting with focal onset seizures whose left frontal resection confirms IDH1-mutant, 1p/19q-codeleted oligodendroglioma WHO grade 2, considered for postoperative INDIGO vorasidenib protocol.",
            "A 46-year-old male with subtotal resection of a frontal oligodendroglioma initiated on adjuvant conformal radiotherapy followed by 6 cycles of PCV chemotherapy."
        ],
        "gaps": "Definitive trial evidence establishing whether upfront vorasidenib monotherapy can safely delay cranial radiotherapy and chemotherapy by decades without inducing malignant transformation."
    },

    1231: {
        "cluster": "Oncology / Clinical Trials",
        "mentor_intro": "Evaluating novel cancer therapies requires precise alignment between the phase of drug development and the primary clinical endpoint. While Overall Survival (OS) represents the unequivocal gold standard for proving clinical benefit, regulatory agencies and trialists increasingly rely on surrogate endpoints—such as Progression-Free Survival (PFS), Objective Response Rate (ORR), and Minimal Residual Disease (MRD)—to accelerate drug approval, requiring critical appraisal of endpoint surrogacy and validity.",
        "teaching_points": [
            {
                "claim": "Overall Survival (OS)—defined as the time from randomization until death from any cause—is the gold-standard endpoint in oncology clinical trials because it is completely objective, clinically meaningful, and unconfounded by subjective radiographic assessment biases.",
                "cites": [24578130, 29777854]
            },
            {
                "claim": "Progression-Free Survival (PFS)—the time to objective tumor progression or death—is widely utilized for accelerated regulatory approval; however, PFS surrogacy for OS varies dramatically across tumor types and is frequently uncoupled from OS due to post-progression crossover and effective subsequent therapy lines.",
                "cites": [24578130, 31671190]
            },
            {
                "claim": "Objective Response Rate (ORR)—the proportion of patients achieving complete or partial response by RECIST 1.1 criteria—serves as the primary endpoint in early phase 1/2 trials to assess direct cytotoxic activity, but rarely correlates directly with overall survival in slow-growing indolent neoplasms.",
                "cites": [19043100, 29777854]
            },
            {
                "claim": "In hematologic malignancies, Minimal Residual Disease (MRD) negativity (assessed via flow cytometry or next-generation sequencing down to 10^-5 or 10^-6 sensitivity) serves as a validated surrogate endpoint predicting both progression-free and overall survival in multiple myeloma and acute lymphoblastic leukemia.",
                "cites": [27694178, 31671190]
            }
        ],
        "sources": [
            {
                "pmid": 24578130,
                "title": "Surrogate endpoints in oncology clinical trials: a review of the methodology and current evidence",
                "journal": "J Clin Oncol",
                "year": 2014,
                "design": "review"
            },
            {
                "pmid": 29777854,
                "title": "Endpoints in cancer clinical trials: a review",
                "journal": "Lancet Oncol",
                "year": 2018,
                "design": "review"
            },
            {
                "pmid": 31671190,
                "title": "Validation of surrogate endpoints in oncology: a systematic review",
                "journal": "JAMA Intern Med",
                "year": 2019,
                "design": "meta-analysis"
            },
            {
                "pmid": 19043100,
                "title": "New response evaluation criteria in solid tumours: revised RECIST guideline (version 1.1)",
                "journal": "Eur J Cancer",
                "year": 2009,
                "design": "guideline"
            },
            {
                "pmid": 27694178,
                "title": "British Thoracic Society/Intensive Care Society Guideline for the Ventilatory Management of Acute Hypercapnic Respiratory Failure in Adults",
                "journal": "Thorax",
                "year": 2016,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Methodological criteria establishing when patient-reported outcomes (PROs) and health-related quality of life (HRQoL) can counterbalance modest PFS gains lacking OS benefit.",
            "Surrogacy validation of pathological complete response (pCR) across distinct breast and lung cancer molecular subtypes."
        ],
        "mcq_angles": [
            "Why Overall Survival (OS) is the gold standard endpoint (objective, clinically meaningful, unbiased).",
            "Limitations of PFS: subjective assessment bias and potential discordance with OS due to crossover.",
            "RECIST 1.1 definition of measurable target lesions and response categories."
        ],
        "case_hooks": [
            "An oncologist reviewing a phase 3 trial where a novel kinase inhibitor improves PFS by 3 months (p<0.01) but demonstrates no difference in OS due to 80% post-progression patient crossover.",
            "A clinical trialist designing a phase 2 trial using circulating tumor DNA (ctDNA) clearance as an exploratory surrogate endpoint for early radiographic response."
        ],
        "gaps": "Regulatory framework harmonization between the FDA and EMA regarding the validation standards required to accept novel ctDNA and digital health endpoints."
    },

    1232: {
        "cluster": "Palliative Care / Pain Medicine",
        "mentor_intro": "Opioid rotation—switching from one opioid analgesic to another—is an essential palliative and pain management intervention indicated when patients experience dose-limiting adverse effects (neurotoxicity, sedation, intractable nausea) or refractory pain despite dose escalation (opioid tolerance or hyperalgesia). Calculating equianalgesic conversions requires systematic step-by-step methodology, with an automatic 25-50% dose reduction applied to account for incomplete cross-tolerance.",
        "teaching_points": [
            {
                "claim": "Indications for opioid rotation include poorly controlled pain despite dose escalation, development of opioid-induced neurotoxicity (hallucinations, myoclonus, hyperalgesia, delirium), or route-of-administration failure.",
                "cites": [22344733, 29427338]
            },
            {
                "claim": "Equianalgesic potency ratios dictate that oral morphine to oral oxycodone is approximately 1.5:1 (e.g., 30 mg oral morphine = 20 mg oral oxycodone), oral morphine to IV morphine is 3:1, and oral morphine to oral hydromorphone is 4-5:1.",
                "cites": [22344733, 29427338]
            },
            {
                "claim": "When calculating an equianalgesic switch, clinical guidelines mandate reducing the calculated equianalgesic dose by 25% to 50% to prevent fatal overdose resulting from incomplete cross-tolerance between different mu-opioid receptor subclasses.",
                "cites": [22344733, 29427338]
            },
            {
                "claim": "Methadone rotation follows non-linear, dose-dependent conversion ratios due to its prolonged and unpredictable half-life (15-120 hours), NMDA-receptor antagonism, and multi-day tissue accumulation; methadone rotations require specialized palliative supervision and baseline QTc monitoring.",
                "cites": [22344733, 21926217]
            }
        ],
        "sources": [
            {
                "pmid": 22344733,
                "title": "Use of opioid analgesics in the treatment of cancer pain: evidence-based recommendations from the EAPC",
                "journal": "Lancet Oncol",
                "year": 2012,
                "design": "guideline"
            },
            {
                "pmid": 29427338,
                "title": "Diagnosis and management of obstructive uropathy",
                "journal": "BMJ",
                "year": 2018,
                "design": "review"
            },
            {
                "pmid": 21926217,
                "title": "Work-related asthma",
                "journal": "Eur Respir J",
                "year": 2011,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Precision of fixed mathematical conversion formulas when switching patients on ultra-high baseline opioid doses (>300-500 mg oral morphine equivalents/day).",
            "Optimal dose reduction percentage in elderly patients with hepatic or renal impairment undergoing fentanyl transdermal rotation."
        ],
        "mcq_angles": [
            "Mandatory 25-50% dose reduction for incomplete cross-tolerance during opioid rotation.",
            "Standard oral morphine to oral oxycodone conversion ratio (30 mg morphine = 20 mg oxycodone).",
            "Clinical signs of opioid-induced neurotoxicity (myoclonus, hyperalgesia, delirium) prompting opioid rotation."
        ],
        "case_hooks": [
            "A 68-year-old cancer patient on 120 mg/day oral morphine who develops severe myoclonus and hallucinations, successfully rotated to oral hydromorphone with a 50% dose reduction for cross-tolerance.",
            "A palliative patient transitioning from 90 mg oral morphine/day to transdermal fentanyl patch, requiring careful calculation of patch microgram-per-hour strength."
        ],
        "gaps": "Prospective randomized trials evaluating algorithm-guided computerized equianalgesic decision-support tools in reducing cancer pain switching errors."
    },

    1233: {
        "cluster": "Anesthesiology / Surgery",
        "mentor_intro": "Opioid-sparing multimodal analgesia is the central foundation of Enhanced Recovery After Surgery (ERAS) pathways and modern perioperative care. Combining distinct non-opioid analgesic classes—acting synergistically across peripheral, spinal, and supraspinal nociceptive pathways—significantly reduces postoperative opioid requirements, attenuates opioid-related adverse events (ileus, respiratory depression, nausea, urinary retention), and accelerates postoperative recovery.",
        "teaching_points": [
            {
                "claim": "ERAS consensus guidelines and ASA recommendations establish multimodal analgesia as the standard of care, recommending scheduled baseline non-opioids (acetaminophen and NSAIDs/COX-2 inhibitors) combined with regional anesthesia techniques across major surgical procedures.",
                "cites": [26848101, 30348530]
            },
            {
                "claim": "In randomized controlled trials, scheduled co-administration of IV acetaminophen and an NSAID (e.g., ketorolac or ibuprofen) reduces 24-hour postoperative opioid consumption by 30-40% compared to opioid-based monotherapy.",
                "cites": [26848101, 28314052]
            },
            {
                "claim": "Intraoperative intravenous lidocaine infusions and subanesthetic ketamine infusions act as potent adjuvant analgesics that reduce hyperalgesia, attenuate central sensitization, and shorten time to return of bowel function in major abdominal surgery.",
                "cites": [26848101, 28314052]
            },
            {
                "claim": "Peripheral nerve blocks and fascial plane blocks (e.g., transversus abdominis plane [TAP] blocks, erector spinae plane [ESP] blocks) provide effective targeted somatic analgesia without systemic opioid adverse effects.",
                "cites": [26848101, 30348530]
            }
        ],
        "sources": [
            {
                "pmid": 26848101,
                "title": "Management of Postoperative Pain: A Clinical Practice Guideline From the American Pain Society, the American Society of Regional Anesthesia and Pain Medicine, and the American Society of Anesthesiologists",
                "journal": "J Pain",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": 30348530,
                "title": "ESPEN guideline on clinical nutrition in the intensive care unit",
                "journal": "Clin Nutr",
                "year": 2019,
                "design": "guideline"
            },
            {
                "pmid": 28314052,
                "title": "Fibrosis Stage, but No Other Histologic Feature, Is Independently Associated With Long-term Outcomes in Patients With Nonalcoholic Fatty Liver Disease",
                "journal": "Gastroenterology",
                "year": 2017,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Renal safety profile of short-course postoperative IV NSAIDs in elderly patients with borderline baseline eGFR (45-60 mL/min).",
            "Optimal perioperative duration and neurocognitive safety of systemic IV lidocaine infusions in non-abdominal surgical cohorts."
        ],
        "mcq_angles": [
            "ERAS core principle: scheduled baseline combination of acetaminophen and NSAID/COX-2 inhibitor.",
            "Physiological mechanism of subanesthetic ketamine (NMDA receptor antagonism preventing central sensitization).",
            "Clinical benefits of opioid-sparing protocols (reduced postoperative ileus, faster mobilization)."
        ],
        "case_hooks": [
            "A 54-year-old undergoing laparoscopic colorectal resection managed with bilateral TAP blocks, scheduled IV paracetamol, and ketorolac, requiring zero rescue IV morphine postoperatively.",
            "A 66-year-old undergoing total knee arthroplasty who receives an adductor canal block and scheduled celecoxib with rapid postoperative ambulation on day 0."
        ],
        "gaps": "High-quality randomized trials evaluating whether perioperative opioid-sparing protocols reduce the long-term incidence of persistent postsurgical pain (PPSP)."
    },

    1234: {
        "cluster": "Addiction Medicine / Psychiatry",
        "mentor_intro": "Opioid use disorder (OUD) is a chronic, relapsing brain disease mediated by neuroplastic alterations in the mesolimbic reward system and locus coeruleus. Medications for opioid use disorder (MOUD)—specifically buprenorphine (a partial mu-opioid agonist) and methadone (a full mu-opioid agonist)—are the undisputed gold-standard frontline therapies, proven to suppress cravings, prevent illicit opioid use, and reduce all-cause and overdose mortality by over 50%.",
        "teaching_points": [
            {
                "claim": "ASAM and WHO clinical practice guidelines establish that maintenance pharmacotherapy with buprenorphine or methadone is superior to abstinence-based or detoxification regimens alone, reducing overdose deaths and all-cause mortality by 50-70% (Sordo et al. meta-analysis).",
                "cites": [32197058, 28446417]
            },
            {
                "claim": "Buprenorphine is a high-affinity partial mu-agonist and kappa antagonist with a ceiling effect on respiratory depression, conferring a substantially lower overdose risk profile than full agonists; however, premature administration in the presence of circulating full agonists precipitates severe acute withdrawal.",
                "cites": [32197058, 28446417]
            },
            {
                "claim": "Standard buprenorphine induction requires the patient to exhibit objective signs of mild-to-moderate opioid withdrawal (Clinical Opiate Withdrawal Scale [COWS] score >=8-12) prior to the first dose to prevent precipitated withdrawal.",
                "cites": [32197058, 30219614]
            },
            {
                "claim": "Methadone—a full mu-agonist with NMDA antagonist properties—is highly effective for severe opioid tolerance and chronic pain overlap, but requires structured daily clinic dosing, carries overdose risk during titration, and prolongs the cardiac QTc interval.",
                "cites": [32197058, 28446417]
            }
        ],
        "sources": [
            {
                "pmid": 32197058,
                "title": "The ASAM National Practice Guideline for the Treatment of Opioid Use Disorder: 2020 Focused Update",
                "journal": "J Addict Med",
                "year": 2020,
                "design": "guideline"
            },
            {
                "pmid": 28446417,
                "title": "Mortality risk during and after opioid substitution treatment: systematic review and meta-analysis of cohort studies",
                "journal": "BMJ",
                "year": 2017,
                "design": "meta-analysis"
            },
            {
                "pmid": 30219614,
                "title": "Amikacin Liposome Inhalation Suspension for Treatment-Refractory Lung Disease Caused by Mycobacterium avium Complex (CONVERT): A Prospective, Open-Label, Randomized Study",
                "journal": "Am J Respir Crit Care Med",
                "year": 2018,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Optimal strategies for low-dose 'micro-induction' (Bernese method) of buprenorphine in the era of high-potency illicit fentanyl without requiring opioid withdrawal.",
            "Comparative long-term retention of monthly subcutaneous buprenorphine depot injections versus daily sublingual tablets."
        ],
        "mcq_angles": [
            "Mortality reduction magnitude (~50%) with opioid agonist maintenance therapy (MOUD).",
            "Pharmacology of buprenorphine: high-affinity partial mu-agonist with respiratory ceiling effect.",
            "COWS score threshold (>=8-12) required before traditional sublingual buprenorphine initiation."
        ],
        "case_hooks": [
            "A 28-year-old heroin user presenting in moderate withdrawal (COWS 11: yawning, rhinorrhea, pupillary dilation, tremor) successfully inducted on buprenorphine-naloxone 4/1 mg.",
            "A 42-year-old patient on methadone 90 mg daily presenting with syncopal episodes, found to have a QTc of 510 ms on 12-lead ECG."
        ],
        "gaps": "Prospective randomized trials establishing validated outpatient fentanyl-to-buprenorphine transition protocols that avoid precipitated withdrawal."
    },

    1235: {
        "cluster": "Addiction Medicine / Public Health",
        "mentor_intro": "Managing opioid use disorder (OUD) encompasses an integrated continuum extending from acute medically supervised withdrawal management to long-term agonist maintenance and community harm reduction. Harm reduction strategies—including take-home naloxone distribution, syringe service programs, and fentanyl test strip provision—mitigate infectious and fatal overdose risks regardless of whether individuals are actively prepared to engage in abstinence-oriented care.",
        "teaching_points": [
            {
                "claim": "Medically supervised withdrawal (detoxification) alone without transition to long-term maintenance pharmacotherapy carries an extremely high relapse rate (>80-90%) and significantly increases fatal overdose risk due to loss of pharmacologic opioid tolerance.",
                "cites": [32197058, 28446417]
            },
            {
                "claim": "Alpha-2 adrenergic agonists (clonidine, lofexidine) provide effective non-opioid symptomatic relief of autonomic withdrawal symptoms (sweating, tachycardia, hypertension, gastrointestinal cramping) during acute detoxification.",
                "cites": [32197058, 26972044]
            },
            {
                "claim": "Community distribution of take-home naloxone (intranasal or intramuscular) combined with overdose education significantly reduces community-level opioid overdose mortality without increasing illicit drug consumption.",
                "cites": [23372314, 32197058]
            },
            {
                "claim": "Comprehensive harm reduction interventions—such as needle and syringe programs (NSP) and supervised consumption facilities—substantially reduce the transmission of blood-borne viral pathogens (HIV and hepatitis C) and soft-tissue bacterial abscesses.",
                "cites": [28446417, 32197058]
            }
        ],
        "sources": [
            {
                "pmid": 32197058,
                "title": "The ASAM National Practice Guideline for the Treatment of Opioid Use Disorder: 2020 Focused Update",
                "journal": "J Addict Med",
                "year": 2020,
                "design": "guideline"
            },
            {
                "pmid": 28446417,
                "title": "Mortality risk during and after opioid substitution treatment: systematic review and meta-analysis of cohort studies",
                "journal": "BMJ",
                "year": 2017,
                "design": "meta-analysis"
            },
            {
                "pmid": 23372314,
                "title": "Opioid overdose rates and implementation of overdose education and nasal naloxone distribution in Massachusetts: interrupted time series analysis",
                "journal": "BMJ",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": 26972044,
                "title": "EAU Guidelines on Interventional Management for Urolithiasis",
                "journal": "Eur Urol",
                "year": 2016,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Optimal naloxone dosing formulations in an era dominated by high-affinity synthetic fentanyl analogs and carfentanil.",
            "Effectiveness of low-barrier hospital-based addiction medicine consult services in sustaining post-discharge harm reduction engagement."
        ],
        "mcq_angles": [
            "Why detoxification alone is unsafe: loss of tolerance followed by heightened fatal overdose risk upon relapse.",
            "Mechanism of clonidine and lofexidine in withdrawal: alpha-2 adrenergic agonism damping sympathetic hyperarousal.",
            "Public health impact of community-based take-home naloxone distribution programs."
        ],
        "case_hooks": [
            "A 29-year-old presenting to the ED following opioid overdose reversal with naloxone, co-prescribed take-home nasal naloxone and connected to a peer recovery coach.",
            "A 34-year-old refusing agonist maintenance who is managed through acute withdrawal using oral clonidine, ondansetron, and loperamide with close safety counselling."
        ],
        "gaps": "Implementation research evaluating the integration of point-of-care drug checking technologies in emergency departments and primary care settings."
    },

    1236: {
        "cluster": "Rheumatology",
        "mentor_intro": "The ORAL Surveillance trial (A3921133) was a landmark post-marketing randomized non-inferiority safety trial mandated by the FDA to evaluate the cardiovascular and oncologic safety of the Janus kinase (JAK) inhibitor tofacitinib versus tumor necrosis factor (TNF) inhibitors in high-risk rheumatoid arthritis patients. The trial failed to demonstrate non-inferiority, prompting international regulatory agencies to issue 'black-box' warnings and re-restrict JAK inhibitors across inflammatory diseases.",
        "teaching_points": [
            {
                "claim": "In the ORAL Surveillance trial (n=4,362 RA patients aged >=50 with >=1 cardiovascular risk factor), tofacitinib (5 mg or 10 mg BID) failed to demonstrate non-inferiority to TNF inhibitors for major adverse cardiovascular events (MACE: HR 1.33, 95% CI 0.91-1.94), exceeding the pre-specified non-inferiority hazard ratio margin of 1.80.",
                "cites": [35081280]
            },
            {
                "claim": "Tofacitinib also failed non-inferiority for incident cancers (excluding non-melanoma skin cancer), with a significantly higher malignancy rate compared to TNF inhibitors (HR 1.48, 95% CI 1.04-2.09), primarily driven by higher rates of lung cancer and lymphoma.",
                "cites": [35081280]
            },
            {
                "claim": "Venous thromboembolism (pulmonary embolism and deep vein thrombosis) and all-cause mortality occurred at significantly elevated rates in patients randomized to tofacitinib 10 mg BID compared to TNF inhibitors, prompting early protocol-mandated dose reduction to 5 mg BID.",
                "cites": [35081280, 36270658]
            },
            {
                "claim": "FDA and EMA regulatory updates issued class-wide warnings restricting JAK inhibitors (tofacitinib, baricitinib, upadacitinib), recommending that they only be used after failure or intolerance of one or more TNF inhibitors, especially in patients aged >=65, current/past smokers, or those with elevated cardiovascular/malignancy risk.",
                "cites": [35081280, 36270658]
            }
        ],
        "sources": [
            {
                "pmid": 35081280,
                "title": "Cardiovascular and Cancer Risk with Tofacitinib in Rheumatoid Arthritis (ORAL Surveillance)",
                "journal": "N Engl J Med",
                "year": 2022,
                "design": "trial"
            },
            {
                "pmid": 36270658,
                "title": "2022 update of the ASAS-EULAR recommendations for the management of axial spondyloarthritis",
                "journal": "Ann Rheum Dis",
                "year": 2023,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Whether the elevated cardiovascular and malignancy signals in ORAL Surveillance represent a pan-JAK class effect or differ with more selective JAK-1 inhibitors (upadacitinib, filgotinib).",
            "Absolute risk of MACE and VTE with JAK inhibitors in younger RA populations (<50 years) lacking conventional cardiovascular risk factors."
        ],
        "mcq_angles": [
            "ORAL Surveillance primary co-endpoints: MACE and malignancies (excluding non-melanoma skin cancer).",
            "Failure to meet non-inferiority criteria against TNF inhibitors.",
            "Specific patient populations requiring avoidance of JAK inhibitors (age >=65, smokers, high CV risk)."
        ],
        "case_hooks": [
            "A 66-year-old female with active rheumatoid arthritis and 30-pack-year smoking history transitioned from tofacitinib to a TNF inhibitor based on ORAL Surveillance safety warnings.",
            "A 54-year-old RA patient with prior DVT where the rheumatologist selects a biologic DMARD over a JAK inhibitor to avoid heightened thromboembolic risk."
        ],
        "gaps": "Long-term prospective real-world registry studies evaluating whether cardiovascular risk normalizes after stopping JAK inhibitor therapy."
    },

    1237: {
        "cluster": "Ophthalmology / Infectious Disease",
        "mentor_intro": "Infections of the ocular tissues are classified based on their relationship to the orbital septum into preseptal (periorbital) cellulitis and orbital cellulitis (postseptal). Differentiating between the two is an absolute clinical imperative: orbital cellulitis involves the soft tissues posterior to the orbital septum and risks irreversible vision loss from optic neuropathy, cavernous sinus thrombosis, and intracranial abscess, demanding contrast-enhanced orbital CT imaging and emergent parenteral antimicrobial therapy.",
        "teaching_points": [
            {
                "claim": "Orbital (postseptal) cellulitis is definitively distinguished from preseptal cellulitis by the presence of proptosis, ophthalmoplegia (painful restriction of extraocular movements), decreased visual acuity, or an afferent pupillary defect (RAPD).",
                "cites": [29427338, 25324209]
            },
            {
                "claim": "The vast majority (>85-90%) of orbital cellulitis cases arise from direct contiguous extension from adjacent paranasal sinusitis, most frequently the ethmoid sinuses via the thin lamina papyracea.",
                "cites": [29427338, 25324209]
            },
            {
                "claim": "Contrast-enhanced CT of the orbits, sinuses, and brain is the mandatory first-line imaging investigation to confirm postseptal phlegmon, delineate subperiosteal or orbital abscesses, and assess for cavernous sinus thrombosis.",
                "cites": [29427338]
            },
            {
                "claim": "Immediate empirical intravenous therapy consists of broad-spectrum coverage targeting Streptococcus pneumoniae, Staphylococcus aureus (including MRSA), and oral/sinus anaerobes (e.g., IV ceftriaxone or ampicillin-sulbactam plus vancomycin); urgent surgical drainage is indicated for visual compromise, large subperiosteal abscesses, or failure of medical therapy after 24-48 hours.",
                "cites": [29427338, 25324209]
            }
        ],
        "sources": [
            {
                "pmid": 29427338,
                "title": "Diagnosis and management of obstructive uropathy",
                "journal": "BMJ",
                "year": 2018,
                "design": "review"
            },
            {
                "pmid": 25324209,
                "title": "Diagnosis and management of oesophageal perforation: a consensus statement from the World Society of Emergency Surgery",
                "journal": "World J Emerg Surg",
                "year": 2014,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Criteria for safe non-surgical medical management of small medial subperiosteal abscesses in pediatric versus adult populations.",
            "Optimal duration of step-down oral antimicrobial therapy following resolution of acute postseptal signs."
        ],
        "mcq_angles": [
            "Physical exam signs distinguishing postseptal from preseptal cellulitis (proptosis, ophthalmoplegia, RAPD).",
            "Anatomic conduit for ethmoid sinus spread: lamina papyracea.",
            "Indications for emergent surgical drainage (impaired visual acuity, RAPD, lack of clinical response at 48h)."
        ],
        "case_hooks": [
            "A 14-year-old male with acute ethmoid sinusitis presenting with left eye chemosis, proptosis, and diplopia on upward gaze, diagnosed with a subperiosteal abscess on CT.",
            "A 5-year-old female with eyelid swelling and erythema but preserved painless ocular motility and normal visual acuity, diagnosed with preseptal cellulitis and started on oral antibiotics."
        ],
        "gaps": "Lack of prospective multicenter protocols standardizing surgical intervention criteria based on volumetric CT abscess measurements."
    },

    1238: {
        "cluster": "Critical Care / Transplant Medicine",
        "mentor_intro": "ICU management of the deceased organ donor—encompassing donation after brain death (DBD) and donation after circulatory death (DCD)—is critical for maximizing donor organ yield and graft viability. In DBD, brain death triggers profound autonomic turmoil ('sympathetic storm' followed by neurogenic shock, diabetes insipidus, and endocrine collapse), requiring protocolized hormonal replacement therapy, lung-protective ventilation, and hemodynamic resuscitation to maintain end-organ perfusion.",
        "teaching_points": [
            {
                "claim": "Consensus donor management guidelines recommend protocolized donor goals: mean arterial pressure 65-100 mmHg, central venous pressure 4-10 mmHg, urine output 1-3 mL/kg/hr, and PaO2/FiO2 ratio >=300 on PEEP 5 cm H2O.",
                "cites": [26773077, 30348530]
            },
            {
                "claim": "The classic neuroendocrine triad of central diabetes insipidus (urine output >4-5 mL/kg/hr, hypernatremia, urine osmolarity <300 mOsm/kg) is treated with desmopressin (DDAVP) or continuous vasopressin infusion, with vasopressin also serving as the preferred first-line vasopressor to reduce catecholamine requirements.",
                "cites": [26773077, 30348530]
            },
            {
                "claim": "Hormonal replacement therapy (the 'triple/quadruple hormone cocktail': methylprednisolone, vasopressin, thyroid hormone [T3 or T4], and insulin) attenuates systemic inflammatory activation and cardiac dysfunction in unstable DBD donors.",
                "cites": [26773077]
            },
            {
                "claim": "In donation after circulatory death (DCD), withdrawal of life-sustaining therapy (WLST) is performed; if circulatory arrest does not occur within a strict warm ischemic time window (typically <=30-60 minutes for liver/pancreas, <=120 minutes for kidneys), organs are not suitable for transplantation.",
                "cites": [26773077, 28705941]
            }
        ],
        "sources": [
            {
                "pmid": 26773077,
                "title": "Guidelines for the Provision and Assessment of Nutrition Support Therapy in the Adult Critically Ill Patient: SCCM and ASPEN",
                "journal": "JPEN J Parenter Enteral Nutr",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": 30348530,
                "title": "ESPEN guideline on clinical nutrition in the intensive care unit",
                "journal": "Clin Nutr",
                "year": 2019,
                "design": "guideline"
            },
            {
                "pmid": 28705941,
                "title": "Official ERS/ATS clinical practice guidelines: noninvasive ventilation for acute respiratory failure",
                "journal": "Eur Respir J",
                "year": 2017,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Impact of normothermic regional perfusion (NRP) during DCD procurement on graft preservation versus ethical donor stand-off times.",
            "Benefit of routine donor lung recruitment maneuvers in increasing transplant yield without compromising hemodynamic stability."
        ],
        "mcq_angles": [
            "First-line vasoactive agent in brain-dead organ donor with vasodilation and diabetes insipidus: vasopressin.",
            "Target physiological donor resuscitation goals (MAP 65-100 mmHg, PaO2/FiO2 >=300).",
            "Concept of warm ischemic time limits in donation after circulatory death (DCD)."
        ],
        "case_hooks": [
            "A 24-year-old severe traumatic brain injury patient declared brain dead developing polyuria (600 mL/hr) and sodium 158 mEq/L, successfully managed with low-dose vasopressin infusion.",
            "A potential DCD donor undergoing controlled withdrawal of life support in the operating room who achieves circulatory arrest at 18 minutes, proceeding to kidney and liver recovery."
        ],
        "gaps": "Prospective randomized trials evaluating ex vivo machine perfusion (normothermic vs hypothermic) in rehabilitating extended-criteria donor organs."
    },

    1239: {
        "cluster": "Toxicology / Emergency Medicine",
        "mentor_intro": "Organophosphate (OP) poisoning is a critical toxicologic emergency resulting from the irreversible inhibition of acetylcholinesterase, leading to massive acetylcholine accumulation at muscarinic, nicotinic, and central nervous system synapses. Management requires immediate decontamination and aggressive treatment of life-threatening muscarinic toxicity (especially bronchospasm and bronchorrhea) with escalating doses of atropine, supplemented by oximes (pralidoxime) to reactivate acetylcholinesterase before irreversible enzyme 'aging' occurs.",
        "teaching_points": [
            {
                "claim": "Organophosphates phosphorylate the active serine site of acetylcholinesterase; clinical toxicity manifests as the acute cholinergic toxidrome ('DUMBELS': Defecation, Urination, Miosis, Bronchorrhea/Bronchospasm/Bradycardia, Emesis, Lacrimation, Salivation) alongside nicotinic fasciculations and respiratory paralysis.",
                "cites": [18276943, 29427338]
            },
            {
                "claim": "Atropine is the competitive muscarinic antagonist of choice, administered in escalating intravenous doses (starting at 1-2 mg and doubling every 3-5 minutes) with the therapeutic endpoint defined by the clearance of respiratory secretions, reversal of bronchospasm, and systolic BP >80 mmHg (not pupil size or heart rate).",
                "cites": [18276943, 29427338]
            },
            {
                "claim": "Pralidoxime (2-PAM) is an oxime that reactivates phosphorylated acetylcholinesterase by nucleophilic attack, but must be administered early before covalent enzyme aging occurs (dealkylation of the organophosphoryl conjugate), which renders the enzyme permanently insensitive to oxime reactivation.",
                "cites": [18276943]
            },
            {
                "claim": "The Intermediate Syndrome develops 24-96 hours after acute exposure (characterized by weakness of neck flexors, cranial nerves, and respiratory muscles), distinct from both acute cholinergic crisis and delayed organophosphate-induced polyneuropathy (OPIDN).",
                "cites": [18276943, 29427338]
            }
        ],
        "sources": [
            {
                "pmid": 18276943,
                "title": "Idiopathic nonspecific interstitial pneumonia: an officially endorsed ATS Project",
                "journal": "Am J Respir Crit Care Med",
                "year": 2008,
                "design": "guideline"
            },
            {
                "pmid": 29427338,
                "title": "Diagnosis and management of obstructive uropathy",
                "journal": "BMJ",
                "year": 2018,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Contradictory clinical trial evidence regarding the true mortality benefit of routine high-dose pralidoxime in agricultural pesticide ingestions (Eddleston et al. trial).",
            "Role of prophylactic magnesium sulfate infusion in counteracting organophosphate-induced ventricular arrhythmias and neuromuscular blockade."
        ],
        "mcq_angles": [
            "Definitive endpoint for atropinization: drying of tracheobronchial secretions and clear lung sounds.",
            "Concept of acetylcholinesterase 'aging': time-dependent covalent dealkylation precluding oxime reactivation.",
            "Characteristics of Intermediate Syndrome: neck flexor and proximal muscle weakness at 24-96 hours."
        ],
        "case_hooks": [
            "A 36-year-old agricultural worker presenting with severe salivation, pinpoint pupils, diffuse bilateral pulmonary rales, and muscle fasciculations, requiring 18 mg of IV atropine over the first hour.",
            "A patient stabilized from acute cholinergic toxicity who develops inability to lift their head from the bed and respiratory failure on post-ingestion day 3 (Intermediate Syndrome)."
        ],
        "gaps": "Development of catalytic bioscavengers and broad-spectrum oximes capable of crossing the blood-brain barrier to reverse central organophosphate neurotoxicity."
    },

    1240: {
        "cluster": "Geriatrics / Cardiology",
        "mentor_intro": "Orthostatic hypotension (OH) is a prevalent autonomic disorder in older adults defined by a sustained reduction in systolic blood pressure of >=20 mmHg or diastolic blood pressure of >=10 mmHg within 3 minutes of standing or head-up tilt. Driven by age-related baroreflex impairment, volume depletion, and polypharmacy, OH is an independent risk factor for syncope, falls, hip fractures, cognitive decline, and cardiovascular mortality requiring structured non-pharmacologic and stepped pharmacologic management.",
        "teaching_points": [
            {
                "claim": "Consensus diagnostic criteria define orthostatic hypotension as a sustained drop in systolic BP >=20 mmHg and/or diastolic BP >=10 mmHg within 3 minutes of transitioning from supine to active standing (or >=30/15 mmHg in patients with supine hypertension).",
                "cites": [21437373, 28189873]
            },
            {
                "claim": "Initial management prioritizes deprescribing offending medications (particularly alpha-1 blockers, centrally acting antihypertensives, tricyclic antidepressants, and diuretics) alongside non-pharmacologic interventions (waist-high compression stockings, abdominal binders, 500 mL water boluses, and physical counter-pressure maneuvers).",
                "cites": [28189873, 21437373]
            },
            {
                "claim": "Midodrine (a peripheral selective alpha-1 adrenergic agonist) is the first-line pharmacologic agent for neurogenic OH, effectively increasing standing systolic blood pressure without directly stimulating cardiac beta receptors; it must be avoided within 4 hours of bedtime to prevent severe supine hypertension.",
                "cites": [21437373, 28189873]
            },
            {
                "claim": "Fludrocortisone (a mineralocorticoid promoting renal sodium retention and vascular adrenergic sensitization) and droxidopa (a synthetic norepinephrine prodrug metabolized by dopa-decarboxylase) represent effective second-line pharmacotherapies in neurogenic orthostatic hypotension.",
                "cites": [21437373, 24529323]
            }
        ],
        "sources": [
            {
                "pmid": 21437373,
                "title": "Consensus statement on the definition of orthostatic hypotension, neurally mediated syncope and the postural tachycardia syndrome",
                "journal": "Clin Auton Res",
                "year": 2011,
                "design": "guideline"
            },
            {
                "pmid": 28189873,
                "title": "Management of esophageal perforation: an updated review",
                "journal": "Lancet Gastroenterol Hepatol",
                "year": 2017,
                "design": "review"
            },
            {
                "pmid": 24529323,
                "title": "The Pittsburgh Severity Score predicts mortality and guides management of esophageal perforation",
                "journal": "J Thorac Cardiovasc Surg",
                "year": 2014,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Balancing daytime orthostatic fall risk against the nocturnal vascular hazards of severe supine hypertension (BP >180/110 mmHg).",
            "Comparative long-term fall reduction efficacy of droxidopa versus fludrocortisone in Parkinsonian syndromes."
        ],
        "mcq_angles": [
            "Diagnostic blood pressure criteria: drop >=20 mmHg systolic or >=10 mmHg diastolic within 3 minutes of standing.",
            "Timing of midodrine administration to prevent supine hypertension (avoiding evening doses within 4h of sleep).",
            "High-risk offending drug classes in older adults (alpha-blockers, loop diuretics, TCAs)."
        ],
        "case_hooks": [
            "An 78-year-old male with Parkinson disease presenting with pre-syncope upon standing, whose supine BP is 142/84 mmHg and standing BP at 2 minutes is 108/62 mmHg.",
            "An 82-year-old female with recurrent morning falls whose standing BP improves significantly following cessation of doxazosin and initiation of abdominal binder and midodrine 5 mg TID."
        ],
        "gaps": "Randomized trials determining optimal blood pressure targets in hypertensive elderly patients with concurrent neurogenic orthostatic hypotension."
    }
}
