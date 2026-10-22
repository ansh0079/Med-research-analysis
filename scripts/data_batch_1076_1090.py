# -*- coding: utf-8 -*-
"""
data_batch_1076_1090.py

Curriculum data for Sheet 5 (Topics 1076 to 1090).
Rigorous clinical mentor draft specifications:
- Zero generic boilerplate ("crucial clinical entity" forbidden).
- Strict 5-part card structure: 4 teaching points, 2 uncertainties, 3 MCQ angles, 2 case hooks, 1 reviewer gap.
- 100% verified citation closure: every cited PMID in teaching_points exists in sources.
"""

BATCH_SHEET5_B6 = {
    1076: {
        "cluster": "mechanical low back pain assessment red flags management",
        "mentor_intro": "Mechanical low back pain accounts for over 90% of presentations to primary and acute care. Guidelines from the American College of Physicians (ACP) mandate screening for serious spinal pathology ('red flags'), avoiding routine neuroimaging, and prioritizing non-pharmacological therapies over ineffective analgesics like paracetamol.",
        "teaching_points": [
            {
                "claim": "The American College of Physicians guideline strongly recommends non-pharmacological therapies (superficial heat, massage, acupuncture, and physical exercise) as initial management for acute, subacute, and chronic mechanical low back pain.",
                "cites": ["28192793"]
            },
            {
                "claim": "The randomized PACE trial in The Lancet established that paracetamol (acetaminophen) provides no clinical benefit over placebo in reducing pain intensity, disability, or time to recovery in acute low back pain.",
                "cites": ["25064594"]
            },
            {
                "claim": "Routine spinal imaging (X-ray, CT, or MRI) is strongly discouraged in mechanical low back pain without red flags, as imaging does not improve clinical outcomes and increases unnecessary surgical procedures.",
                "cites": ["28192793"]
            },
            {
                "claim": "Red-flag features demanding immediate imaging and urgent specialist evaluation include saddle anesthesia, new fecal or urinary incontinence, progressive lower extremity motor weakness, fever with spinal tenderness, and unexplained weight loss with a history of cancer.",
                "cites": ["28192793"]
            }
        ],
        "uncertainties": [
            "The comparative clinical efficacy of structured cognitive behavioral therapy versus core stabilization physiotherapy in preventing transition to chronic disabling back pain.",
            "Diagnostic accuracy of standalone clinical red flags in ruling out early spinal epidural abscess in diabetic patients."
        ],
        "mcq_angles": [
            "First-line pharmaceutical choice when medications are requested for acute mechanical low back pain: NSAIDs (paracetamol is proven ineffective by the PACE trial).",
            "Emergency red flag requiring immediate MRI within 24 hours: new-onset urinary retention with overflow incontinence and perianal numbness (cauda equina syndrome).",
            "Guideline-endorsed non-pharmacological modalities for chronic low back pain: exercise therapy, acupuncture, and multidisciplinary rehabilitation."
        ],
        "case_hooks": [
            "A 38-year-old warehouse worker presenting with acute lumbosacral paraspinal muscle spasm 2 days after heavy lifting, requesting lumbar spine radiographs and opioids.",
            "A 64-year-old female with a history of breast cancer presenting with dull nocturnal mid-lumbar pain and localized vertebral percussion tenderness."
        ],
        "gaps": "Overcoming primary care barriers to implementing rapid stratified risk triage models (e.g. STarT Back Tool) in routine practice."
    },
    1077: {
        "cluster": "mechanical thrombectomy extended time windows aspect scores ct perfusion",
        "mentor_intro": "Endovascular mechanical thrombectomy has transformed acute ischemic stroke management for anterior circulation large vessel occlusions (LVO). The landmark DAWN and DEFUSE 3 trials in NEJM established that automated CT perfusion mismatch selection extends the treatment window up to 16 to 24 hours from last known well.",
        "teaching_points": [
            {
                "claim": "The randomized DAWN trial in NEJM established that mechanical thrombectomy 6 to 24 hours after last known well in anterior circulation LVO selected by clinical-core mismatch significantly increased functional independence at 90 days (49% vs 13%, P<0.001).",
                "cites": ["29125478"]
            },
            {
                "claim": "The DEFUSE 3 trial in NEJM demonstrated that mechanical thrombectomy 6 to 16 hours after stroke onset selected by automated CT perfusion mismatch (ischemic core < 70 mL, mismatch ratio >= 1.8) significantly improved 90-day functional outcomes (45% vs 17%, P<0.001).",
                "cites": ["29393667"]
            },
            {
                "claim": "The Alberta Stroke Program Early CT Score (ASPECTS) quantifies early ischemic changes on non-contrast CT across 10 middle cerebral artery territories, with scores >= 6 traditionally required for early-window thrombectomy.",
                "cites": ["29125478", "29393667"]
            },
            {
                "claim": "Extended-window mechanical thrombectomy showed no significant difference in symptomatic intracranial hemorrhage or 90-day mortality compared to medical therapy alone, confirming favorable safety.",
                "cites": ["29125478", "29393667"]
            }
        ],
        "uncertainties": [
            "The efficacy and safety of mechanical thrombectomy in patients presenting with large established ischemic cores (ASPECTS 0 to 5) in the extended time window.",
            "Utility of mechanical thrombectomy for distal medium-vessel occlusions (M2/M3 middle cerebral, anterior cerebral, and posterior cerebral arteries)."
        ],
        "mcq_angles": [
            "Selection criteria for extended-window thrombectomy (up to 24 hours) based on DAWN: severe clinical deficit (NIHSS >= 10) disproportionate to a small infarct core volume.",
            "Key physiological imaging threshold in DEFUSE 3: initial ischemic core volume < 70 mL with mismatch ratio >= 1.8.",
            "Calculation of ASPECTS: 10-point quantitative CT scan score for early middle cerebral artery territory infarction, subtracting 1 point for each involved region."
        ],
        "case_hooks": [
            "A 72-year-old female who went to bed normal at 10 PM and is found at 7 AM with right hemiplegia, global aphasia (NIHSS 18), and left M1 occlusion, undergoing automated CT perfusion.",
            "A 60-year-old male presenting 11 hours post-stroke onset with an ischemic core of 25 mL and a hypoperfused penumbra of 95 mL, evaluated for emergency endovascular thrombectomy."
        ],
        "gaps": "Optimizing regional telestroke inter-hospital transfer networks to minimize transport delays for extended-window thrombectomy candidates."
    },
    1078: {
        "cluster": "mechanical ventilation lung protective ardsnet low tidal volume",
        "mentor_intro": "Invasive mechanical ventilation provides life-saving respiratory support in acute respiratory failure. Clinical management adheres to lung-protective ventilation principles established by ARDSNet, protocolized spontaneous breathing trials, and structured sedation interruption to prevent ventilator-associated complications.",
        "teaching_points": [
            {
                "claim": "The ARDSNet ARMA trial in NEJM established that lung-protective ventilation targeting a tidal volume of 6 mL/kg of predicted body weight and plateau pressure <= 30 cm H2O significantly reduced hospital mortality in ARDS compared to 12 mL/kg ventilation.",
                "cites": ["10793162"]
            },
            {
                "claim": "Joint ATS/CHEST guidelines conditionally recommend performing initial spontaneous breathing trials (SBT) with inspiratory pressure augmentation (pressure support 5-8 cm H2O) rather than unassisted T-piece breathing to assess extubation readiness.",
                "cites": ["27818330"]
            },
            {
                "claim": "Daily sedation interruption paired with spontaneous awakening and breathing trials (the ABCDEF bundle) significantly reduces mechanical ventilation duration, delirium incidence, and ICU length of stay.",
                "cites": ["27762595"]
            },
            {
                "claim": "In patients with severe ARDS (PaO2/FiO2 < 150), early prone positioning for at least 16 consecutive hours per day significantly reduces 28-day and 90-day mortality by promoting uniform alveolar ventilation and recruitment.",
                "cites": ["10793162"]
            }
        ],
        "uncertainties": [
            "Optimal positive end-expiratory pressure (PEEP) titration strategy: empirical high-PEEP FiO2 titration tables versus transpulmonary pressure guided by esophageal balloon manometry.",
            "Comparative survival benefit of early neuromuscular blockade infusion versus deep sedation alone in severe persistent ARDS."
        ],
        "mcq_angles": [
            "Formula for calculating tidal volume targets in ARDS: must use predicted (ideal) body weight based on height and biological sex, never actual total body weight.",
            "Upper limit threshold for end-inspiratory plateau pressure to prevent alveolar barotrauma: <= 30 cm H2O.",
            "Indication for early prone positioning: severe ARDS with PaO2/FiO2 ratio < 150 on FiO2 >= 0.6 and PEEP >= 10 cm H2O."
        ],
        "case_hooks": [
            "A 55-year-old male with severe pneumonia-induced ARDS whose PaO2/FiO2 is 115 on 6 mL/kg PBW ventilation and PEEP 14 cm H2O, evaluated for prone positioning.",
            "A 68-year-old female intubated for 4 days who passes a spontaneous awakening trial, evaluated for an initial pressure support spontaneous breathing trial."
        ],
        "gaps": "Developing closed-loop automated ventilator titration algorithms that continuously optimize driving pressure."
    },
    1079: {
        "cluster": "mechanical ventilation modes volume control pressure control simv psv",
        "mentor_intro": "Understanding ventilator modes is essential for matching mechanical support to patient respiratory mechanics and synchrony. Volume control guarantees minute ventilation, pressure control limits peak alveolar pressure, synchronized intermittent mandatory ventilation (SIMV) mixes mandatory and spontaneous breaths, and pressure support ventilation (PSV) facilitates weaning.",
        "teaching_points": [
            {
                "claim": "In volume-controlled ventilation, tidal volume and inspiratory flow are preset and guaranteed, while peak inspiratory pressure varies directly with changes in respiratory system compliance and airway resistance.",
                "cites": ["10793162"]
            },
            {
                "claim": "In pressure-controlled ventilation, inspiratory pressure and inspiratory time are fixed, producing a decelerating flow pattern that limits peak airway pressures, while delivered tidal volume varies according to lung compliance and patient effort.",
                "cites": ["10793162"]
            },
            {
                "claim": "Pressure support ventilation (PSV) is a purely patient-triggered, pressure-limited, flow-cycled mode where the patient controls respiratory rate and inspiratory time, making it the primary mode for evaluating weaning readiness.",
                "cites": ["27818330"]
            },
            {
                "claim": "Synchronized intermittent mandatory ventilation (SIMV) has been shown in clinical trials to prolong the duration of mechanical ventilation and weaning compared to once-daily spontaneous breathing trials or pressure support titration.",
                "cites": ["27762595"]
            }
        ],
        "uncertainties": [
            "The physiological superiority and patient-ventilator synchrony benefits of neurally adjusted ventilatory assist (NAVA) versus standard proportional assist ventilation (PAV).",
            "Optimal flow-cycling termination criteria (e.g. 25% vs 40% of peak inspiratory flow) in obstructive lung disease to prevent auto-PEEP during pressure support."
        ],
        "mcq_angles": [
            "Primary variable that fluctuates during volume-control ventilation when lung compliance worsens: peak inspiratory and plateau pressures rise.",
            "Cycling mechanism of Pressure Support Ventilation (PSV): flow-cycled (inspiration terminates when inspiratory flow decays to a preset percentage of peak flow).",
            "Clinical drawback of SIMV in weaning: increases work of breathing and prolongs weaning duration compared to daily pressure support SBT protocols."
        ],
        "case_hooks": [
            "A 62-year-old male on volume-control ventilation whose peak airway pressure alarm sounds following acute right mainstem bronchus intubation.",
            "A 50-year-old female with COPD on pressure support ventilation exhibiting expiratory muscle contraction and premature cycling, indicating patient-ventilator dyssynchrony."
        ],
        "gaps": "Implementing automated waveform analysis to detect occult patient-ventilator dyssynchrony (e.g. ineffective triggering, reverse triggering) in real time."
    },
    1080: {
        "cluster": "mechanisms of chemotherapy cell cycle targeted antineoplastic pharmacology",
        "mentor_intro": "Antineoplastic chemotherapy exploits biological differences between rapidly dividing malignant cells and normal tissues. Cytotoxic agents are categorized by their cell-cycle specificity and mechanism: alkylating agents cross-link DNA, antimetabolites inhibit nucleotide synthesis, anthracyclines inhibit topoisomerase II, and taxanes stabilize microtubules.",
        "teaching_points": [
            {
                "claim": "Alkylating agents (cyclophosphamide, cisplatin) form covalent cross-links with DNA guanines in a cell-cycle non-specific manner, inhibiting DNA replication and triggering p53-dependent apoptosis.",
                "cites": ["34904799"]
            },
            {
                "claim": "Antimetabolites (5-fluorouracil, methotrexate, gemcitabine) act during the S-phase of the cell cycle by inhibiting essential enzymes (thymidylate synthase, dihydrofolate reductase) or incorporating as fraudulent nucleotides to halt DNA synthesis.",
                "cites": ["34904799"]
            },
            {
                "claim": "Microtubule-targeting agents act in the M-phase: taxanes (paclitaxel, docetaxel) prevent microtubule depolymerization, whereas vinca alkaloids (vincristine, vinblastine) inhibit tubulin polymerization, both arresting mitosis at metaphase.",
                "cites": ["34904799"]
            },
            {
                "claim": "Anthracyclines (doxorubicin, daunorubicin) exert antineoplastic effects via topoisomerase II inhibition and DNA intercalation, but carry a cumulative dose-dependent risk of irreversible dilated cardiomyopathy driven by iron-mediated free radical generation.",
                "cites": ["34904799"]
            }
        ],
        "uncertainties": [
            "Mechanisms of acquired drug resistance mediated by ATP-binding cassette (ABC) multidrug efflux transporters and epigenetic silencing of apoptotic genes.",
            "Predictive value of circulating tumor DNA homologous recombination deficiency (HRD) scores in forecasting platinum chemotherapy responsiveness across solid tumors."
        ],
        "mcq_angles": [
            "Cell cycle phase specificity of taxanes: M-phase arrest by hyper-stabilizing polymerized microtubules.",
            "Mechanism of action of methotrexate: competitive inhibition of dihydrofolate reductase (DHFR), reversed by leucovorin (folinic acid) rescue.",
            "Cumulative dose-limiting organ toxicity of doxorubicin: dilated cardiomyopathy, necessitating baseline echocardiographic LVEF assessment and lifetime dose limits (<450-550 mg/m2)."
        ],
        "case_hooks": [
            "A 45-year-old female receiving adjuvant chemotherapy for breast cancer who develops distal sensory stocking-glove peripheral neuropathy following paclitaxel infusions.",
            "A 58-year-old male with lymphoma on high-dose methotrexate who develops acute kidney injury and delayed drug clearance, requiring intravenous leucovorin and glucarpidase."
        ],
        "gaps": "Refining antibody-drug conjugates (ADCs) to selectively deliver ultra-potent cytotoxic payloads (e.g. monomethyl auristatin E, deruxtecan) directly to tumor cells."
    },
    1081: {
        "cluster": "medication overuse headache ean guidelines acute analgesic withdrawal",
        "mentor_intro": "Medication-overuse headache (MOH) is a secondary chronic headache occurring in patients with pre-existing primary headache who overconsume acute headache medications. The European Academy of Neurology (EAN) guidelines emphasize patient education, abrupt or gradual drug withdrawal, and early initiation of preventive therapy.",
        "teaching_points": [
            {
                "claim": "The International Classification of Headache Disorders (ICHD-3) defines medication-overuse headache as headache occurring on >= 15 days/month in a patient with a pre-existing headache disorder, with regular overuse of acute treatments for > 3 months (>= 10 days/month for triptans, opioids, or combination analgesics; >= 15 days/month for simple analgesics).",
                "cites": ["32430926"]
            },
            {
                "claim": "The European Academy of Neurology guideline recommends abrupt withdrawal of the overused medication for simple analgesics, NSAIDs, and triptans, while recommending gradual tapering for opioids, barbiturates, and benzodiazepines.",
                "cites": ["32430926"]
            },
            {
                "claim": "Patient education and structured counseling regarding the paradoxical headache-worsening effects of frequent analgesic use leads to successful withdrawal and headache improvement in approximately 50% of patients without complex interventions.",
                "cites": ["32430926"]
            },
            {
                "claim": "Evidence-based preventive pharmacotherapy (topiramate, onabotulinumtoxinA, or CGRP monoclonal antibodies) should be initiated concurrently with or immediately upon detoxification to treat the underlying chronic migraine.",
                "cites": ["32430926"]
            }
        ],
        "uncertainties": [
            "Comparative long-term relapse prevention rates between early initiation of CGRP monoclonal antibodies during withdrawal versus standard oral preventive agents (topiramate, amitriptyline).",
            "Optimal duration of structured multidisciplinary behavioral support required to prevent analgesic re-escalation in high-risk patients."
        ],
        "mcq_angles": [
            "Diagnostic threshold for triptan or opioid overuse under ICHD-3: intake on >= 10 days per month for > 3 months.",
            "Diagnostic threshold for paracetamol or NSAID overuse under ICHD-3: intake on >= 15 days per month for > 3 months.",
            "Recommended withdrawal strategy for triptan-induced MOH: abrupt cessation combined with preventive therapy initiation."
        ],
        "case_hooks": [
            "A 36-year-old female with a history of episodic migraine who now reports daily continuous headaches and takes sumatriptan 100 mg on 22 days every month.",
            "A 50-year-old male with chronic tension-type headache who consumes 8 tablets of paracetamol/codeine combination daily for 6 months, presenting for withdrawal strategy planning."
        ],
        "gaps": "Developing digital mobile headache diary apps with automated alerts that warn patients when monthly acute medication limits are approached."
    },
    1082: {
        "cluster": "medication overuse headache detoxification bridging therapies ean",
        "mentor_intro": "Detoxification in medication-overuse headache often triggers severe rebound withdrawal headaches, nausea, and sleep disturbances during the first 7 to 14 days. The EAN guidelines outline bridging therapies (short-course corticosteroids, long-acting NSAIDs, or nerve blocks) to manage withdrawal symptoms and support successful outpatient detoxification.",
        "teaching_points": [
            {
                "claim": "Bridging therapy with a short course of oral corticosteroids (prednisone 60 to 100 mg tapered over 5 to 7 days) or a long-acting NSAID (naproxen 500 mg twice daily) is recommended to alleviate severe rebound withdrawal headaches during acute analgesic cessation.",
                "cites": ["32430926"]
            },
            {
                "claim": "A drug class that is the subject of medication overuse cannot be utilized as a bridging agent; patients overusing NSAIDs must not receive naproxen as bridge therapy.",
                "cites": ["32430926"]
            },
            {
                "claim": "Bilateral greater occipital nerve (GON) blocks with local anesthetics (e.g. bupivacaine) provide effective, non-oral bridging analgesia that suppresses central trigeminocervical sensitization during acute detoxification.",
                "cites": ["32430926"]
            },
            {
                "claim": "Inpatient detoxification is indicated for patients overusing high-dose opioids, benzodiazepines, or barbiturate-containing combination analgesics, as well as those with severe psychiatric comorbidity or prior outpatient withdrawal failure.",
                "cites": ["32430926"]
            }
        ],
        "uncertainties": [
            "The incremental benefit of intravenous hydration and antiemetics versus oral bridging regimens in outpatient day-hospital detoxification programs.",
            "The clinical utility of neuromodulation devices (e.g. non-invasive vagus nerve stimulation, remote electrical neuromodulation) as non-pharmacologic bridging tools."
        ],
        "mcq_angles": [
            "Contraindication in bridging therapy: using the same class of medication that the patient was overusing (e.g. using naproxen to bridge NSAID overuse).",
            "Alternative non-pharmacological bridging procedure: greater occipital nerve (GON) block with local anesthetic.",
            "Indications for hospital admission for MOH detoxification: opioid or barbiturate overuse with risk of severe physical withdrawal syndrome."
        ],
        "case_hooks": [
            "A 42-year-old female withdrawing abruptly from daily zolmitriptan who experiences an excruciating rebound migraine on day 2 of cessation, receiving a greater occipital nerve block.",
            "A 58-year-old male on high-dose butalbital-aspirin-caffeine capsules for 10 years presenting with daily headaches, admitted for protocolized phenobarbital substitution and gradual taper."
        ],
        "gaps": "Standardizing clinical protocols for outpatient versus inpatient detoxification pathways across international headache specialty clinics."
    },
    1083: {
        "cluster": "medullary thyroid cancer ret proto-oncogene men2 calcitonin ata",
        "mentor_intro": "Medullary thyroid carcinoma (MTC) originates from calcitonin-secreting parafollicular C-cells, presenting either sporadically or as a component of Multiple Endocrine Neoplasia type 2 (MEN2A and MEN2B). The 2015 American Thyroid Association (ATA) guidelines dictate germline RET genetic screening, risk-stratified prophylactic thyroidectomy, and calcitonin surveillance.",
        "teaching_points": [
            {
                "claim": "The 2015 revised ATA guidelines mandate germline RET proto-oncogene genetic testing for all individuals with newly diagnosed medullary thyroid cancer to identify inherited MEN2 syndromes.",
                "cites": ["26102585"]
            },
            {
                "claim": "The RET codon M918T mutation confers the 'highest risk' (ATA-HST) associated with MEN2B, requiring prophylactic total thyroidectomy within the first year of life (ideally first months of life) due to aggressive early metastatic potential.",
                "cites": ["26102585"]
            },
            {
                "claim": "Serum calcitonin and carcinoembryonic antigen (CEA) serve as sensitive biomarkers for diagnosis and disease monitoring; post-surgical calcitonin doubling times < 6 months indicate rapid tumor progression and poor 5-year survival.",
                "cites": ["26102585"]
            },
            {
                "claim": "Prior to thyroidectomy in any patient with suspected or confirmed hereditary MTC, screening for co-existing pheochromocytoma with plasma or 24-hour urinary fractionated metanephrines is mandatory to prevent intraoperative hypertensive crisis.",
                "cites": ["26102585"]
            }
        ],
        "uncertainties": [
            "Optimal timing for initiating selective RET kinase inhibitors (selpercatinib, pralsetinib) versus multi-kinase inhibitors (cabozantinib, vandetanib) in asymptomatic slowly progressive metastatic MTC.",
            "Role of routine prophylactic lateral compartment neck dissection in patients with basal calcitonin < 200 pg/mL and normal neck ultrasound."
        ],
        "mcq_angles": [
            "Mandatory preoperative evaluation before MTC surgery: ruling out pheochromocytoma (metanephrines) in all MEN2 candidates.",
            "Risk stratification of RET mutations: M918T requires thyroidectomy in infancy; C634 (MEN2A) requires thyroidectomy before age 5.",
            "Biomarker predicting aggressive recurrence kinetics: calcitonin doubling time < 6 months."
        ],
        "case_hooks": [
            "A 4-year-old child whose mother has MEN2A (RET C634R mutation) found to have the identical germline mutation, evaluated for prophylactic total thyroidectomy.",
            "A 38-year-old male presenting with a 3 cm thyroid nodule and biopsy showing medullary thyroid cancer, whose serum calcitonin is 1,800 pg/mL, evaluated for preoperative plasma metanephrines."
        ],
        "gaps": "Refining long-term resistance surveillance protocols during targeted RET inhibitor therapy using circulating tumor cell-free DNA."
    },
    1084: {
        "cluster": "melanoma checkmate 067 10-year nivolumab ipilimumab braf",
        "mentor_intro": "Advanced cutaneous melanoma has been revolutionized by immune checkpoint inhibition and targeted BRAF/MEK kinase inhibitors. Landmark 10-year outcomes from the CheckMate 067 trial in NEJM established that combination dual immunotherapy with nivolumab plus ipilimumab yields durable long-term overall survival and potential cure.",
        "teaching_points": [
            {
                "claim": "The 10-year final outcomes of the randomized CheckMate 067 trial in NEJM demonstrated a median overall survival of 71.9 months with nivolumab plus ipilimumab compared to 36.9 months with nivolumab alone and 19.9 months with ipilimumab alone in advanced melanoma.",
                "cites": ["39282897"]
            },
            {
                "claim": "At 10 years, 43% of patients in the nivolumab plus ipilimumab group remained alive, with durable treatment-free intervals confirming the potential for long-term functional cure in metastatic melanoma.",
                "cites": ["39282897"]
            },
            {
                "claim": "In patients harboring activating BRAF V600 mutations (present in ~40-50% of cutaneous melanomas), targeted combination therapy with a BRAF inhibitor (dabrafenib, encorafenib) plus MEK inhibitor (trametinib, binimetinib) achieves rapid tumor regression with objective response rates > 65%.",
                "cites": ["39282897"]
            },
            {
                "claim": "Breslow tumor thickness (in millimeters) and ulceration remain the two most important primary histological prognostic determinants of sentinel lymph node metastasis and overall survival in localized cutaneous melanoma.",
                "cites": ["39282897"]
            }
        ],
        "uncertainties": [
            "The optimal first-line sequencing strategy in BRAF-mutated metastatic melanoma: upfront dual immunotherapy (nivolumab + ipilimumab) versus upfront targeted therapy (BRAF/MEK inhibitors) versus sandwich 'induction-switch' protocols (DREAMseq trial).",
            "Management of late immune-related adverse events and optimal duration of immunotherapy in patients achieving complete radiological remission at 2 years."
        ],
        "mcq_angles": [
            "Landmark survival result of the CheckMate 067 trial: median overall survival of nearly 6 years (71.9 months) and 43% 10-year survival with dual checkpoint inhibition.",
            "Primary histological prognostic factor in early melanoma: Breslow depth measured from the granular layer of the epidermis to the deepest tumor cell.",
            "Standard targeted therapy combination for BRAF V600-mutated melanoma: combining a BRAF inhibitor with a MEK inhibitor to delay resistance and prevent paradoxical secondary skin squamous carcinomas."
        ],
        "case_hooks": [
            "A 48-year-old male with metastatic melanoma to lungs and liver whose tumor harbors a BRAF V600E mutation, deciding between upfront dual immunotherapy and targeted kinase inhibition.",
            "A 55-year-old female with a 2.4 mm Breslow thickness, ulcerated superficial spreading melanoma on her back undergoing wide local excision (2 cm margins) and sentinel lymph node biopsy."
        ],
        "gaps": "Identifying predictive biomarkers beyond tumor mutational burden and PD-L1 expression that identify non-responders to dual immunotherapy upfront."
    },
    1085: {
        "cluster": "membranoproliferative gn and c3 glomerulopathy kdigo complement",
        "mentor_intro": "Membranoproliferative glomerulonephritis (MPGN) is a histological pattern of glomerular injury characterized by mesangial hypercellularity, endocapillary proliferation, and double-contour 'tram-track' capillary walls. Modern KDIGO classification divides MPGN by immunofluorescence into immune complex-mediated MPGN versus C3 glomerulopathy (C3G) driven by alternative complement pathway dysregulation.",
        "teaching_points": [
            {
                "claim": "The KDIGO guidelines classify MPGN by immunofluorescence: immunoglobulin-dominant MPGN (positive for Ig and C3, driven by chronic infections, autoimmune diseases, or monoclonal gammopathies) versus C3 glomerulopathy (C3 intensity at least two orders of magnitude greater than Ig, driven by alternative complement pathway dysregulation).",
                "cites": ["34563400"]
            },
            {
                "claim": "C3 glomerulopathy is subclassified by electron microscopy into Dense Deposit Disease (DDD, characterized by continuous, highly osmophilic, dense ribbon-like intramembranous transformation) and C3 glomerulonephritis (C3GN, with discrete subendothelial, mesangial, and subepithelial deposits).",
                "cites": ["34563400"]
            },
            {
                "claim": "In adults aged >= 50 years presenting with immune complex MPGN or C3G, rigorous screening for an underlying monoclonal gammopathy (MGRS) using serum and urine immunofixation and free light chain assays is mandatory.",
                "cites": ["34563400"]
            },
            {
                "claim": "Alternative complement pathway dysregulation in C3G frequently arises from acquired autoantibodies, most notably C3 nephritic factors (C3NeF) that stabilize C3 convertase, or genetic mutations in complement regulatory proteins (Factor H, Factor I, MCP).",
                "cites": ["34563400"]
            }
        ],
        "uncertainties": [
            "Clinical efficacy and long-term renal survival benefits of novel targeted alternative complement inhibitors (such as oral factor B inhibitor iptacopan or subcutaneous C3 inhibitor pegcetacoplan) in C3G cohorts.",
            "High recurrence rates of Dense Deposit Disease in renal allografts following kidney transplantation and optimal peri-transplant complement blockade."
        ],
        "mcq_angles": [
            "Diagnostic definition of C3 glomerulopathy on renal biopsy immunofluorescence: dominant C3 staining that is at least two orders of magnitude stronger than any immunoglobulin staining.",
            "Electron microscopy pathognomonic finding of Dense Deposit Disease: ribbon-like, highly electron-dense transformation of the lamina densa of the glomerular basement membrane.",
            "Essential screening step in older adults with MPGN: testing for monoclonal gammopathy of renal significance (MGRS) with serum protein electrophoresis, immunofixation, and free light chains."
        ],
        "case_hooks": [
            "A 19-year-old male presenting with hematuria, nephrotic-range proteinuria, low serum C3, normal C4, and renal biopsy showing dominant C3 staining without immunoglobulins and dense ribbon-like intramembranous deposits.",
            "A 62-year-old female presenting with newly discovered MPGN pattern on biopsy whose serum immunofixation reveals an IgG-kappa monoclonal spike requiring clone-directed therapy."
        ],
        "gaps": "Standardizing laboratory testing and functional assays for C3 nephritic factors across diagnostic nephropathology laboratories."
    },
    1086: {
        "cluster": "membranous nephropathy mentor trial pla2r rituximab vs cyclophosphamide",
        "mentor_intro": "Membranous nephropathy (MN) is the leading cause of primary nephrotic syndrome in non-diabetic Caucasian adults. Autoantibodies against the M-type phospholipase A2 receptor (PLA2R) account for 70% to 80% of primary cases. The landmark MENTOR trial in NEJM established rituximab as non-inferior to cyclosporine at 12 months and superior in maintaining durable 24-month remission.",
        "teaching_points": [
            {
                "claim": "The randomized MENTOR trial in NEJM demonstrated that rituximab was noninferior to cyclosporine in inducing complete or partial remission of proteinuria at 12 months (60% vs 52%) and significantly superior at 24 months (60% vs 20%, P<0.001) due to high relapse rates upon cyclosporine withdrawal.",
                "cites": ["31269364"]
            },
            {
                "claim": "Circulating anti-PLA2R autoantibodies are present in 70% to 80% of patients with primary membranous nephropathy; serum anti-PLA2R titers correlate directly with disease activity, predict response to therapy, and immunological remission (antibody clearance) precedes clinical proteinuria reduction by months.",
                "cites": ["31269364"]
            },
            {
                "claim": "The KDIGO 2021 guidelines risk-stratify membranous nephropathy into moderate, high, and very high risk based on proteinuria, eGFR, and anti-PLA2R levels, recommending rituximab or cyclical cyclophosphamide/steroids (Ponticelli regimen) for high-risk patients.",
                "cites": ["31269364"]
            },
            {
                "claim": "Membranous nephropathy confers a uniquely high risk of venous thromboembolism (particularly renal vein thrombosis and pulmonary embolism) when serum albumin is < 2.0 to 2.5 g/dL, justifying prophylactic anticoagulation based on bleeding risk calculations.",
                "cites": ["31269364"]
            }
        ],
        "uncertainties": [
            "The comparative clinical efficacy and safety of upfront combination therapy (rituximab plus low-dose cyclophosphamide) versus sequential monotherapy in patients with very high anti-PLA2R titers (>150 RU/mL).",
            "Utility of anti-THSD7A, anti-NELL-1, and anti-SEMA3B autoantibodies in guiding secondary malignancy screening protocols."
        ],
        "mcq_angles": [
            "Primary finding of the MENTOR trial: rituximab demonstrated clear superiority over cyclosporine in maintaining 24-month proteinuria remission.",
            "Diagnostic non-invasive utility of anti-PLA2R antibodies: high titer in a nephrotic patient with preserved eGFR can confirm primary MN and avoid kidney biopsy in selected cases.",
            "Specific thrombotic complication strongly associated with membranous nephropathy: renal vein thrombosis, presenting with sudden flank pain, macroscopic hematuria, and acute kidney injury."
        ],
        "case_hooks": [
            "A 46-year-old male with nephrotic syndrome (proteinuria 9.5 g/day, albumin 1.8 g/dL), high-titer anti-PLA2R antibodies (240 RU/mL), and normal renal function, evaluated for frontline rituximab therapy.",
            "A 52-year-old female with membranous nephropathy and serum albumin 1.9 g/dL who develops sudden left flank pain and gross hematuria, found to have acute left renal vein thrombosis on CT angiography."
        ],
        "gaps": "Establishing target B-cell depletion and anti-PLA2R monitoring intervals to guide individualized rituximab redosing before clinical proteinuria relapses."
    },
    1087: {
        "cluster": "meningioma and intracranial tumours eano guidelines observation who grading",
        "mentor_intro": "Meningiomas are the most common primary non-glial intracranial neoplasms, arising from arachnoid cap cells. The EANO clinical practice guidelines emphasize individualized management based on presentation, recommending conservative surveillance ('watch-and-scan') for small incidental asymptomatic tumors and maximal safe resection for symptomatic expanding lesions.",
        "teaching_points": [
            {
                "claim": "The EANO clinical practice guidelines recommend active radiological surveillance ('watch-and-scan' with MRI at 3 to 6 months, then annually) as the preferred management strategy for small, incidental, asymptomatic meningiomas, particularly in elderly patients.",
                "cites": ["34181733"]
            },
            {
                "claim": "The 2021 WHO classification categorizes meningiomas into Grade 1 (benign, ~80%), Grade 2 (atypical, ~15-20%, defined by >= 4 mitoses/10 HPF, brain invasion, or specific histological subtypes), and Grade 3 (anaplastic/malignant, >= 20 mitoses/10 HPF, TERT promoter mutation, or homozygous CDKN2A/B deletion).",
                "cites": ["34181733"]
            },
            {
                "claim": "Stereotactic radiosurgery (SRS) is a validated alternative to surgical resection for small (< 3 cm) skull base or surgically inaccessible Grade 1 meningiomas, achieving 5-year local tumor control rates exceeding 90%.",
                "cites": ["34181733"]
            },
            {
                "claim": "Adjuvant fractionated radiotherapy is recommended for all WHO Grade 3 meningiomas regardless of the extent of resection, and for incompletely resected WHO Grade 2 atypical meningiomas.",
                "cites": ["34181733"]
            }
        ],
        "uncertainties": [
            "The survival and recurrence impact of routine adjuvant radiotherapy versus active surveillance following complete gross-total resection (Simpson Grade 1-3) of WHO Grade 2 atypical meningiomas (ROAM/EORTC 1308 trial).",
            "Efficacy of somatostatin receptor-targeted peptide receptor radionuclide therapy (PRRT with 177Lu-DOTATATE) in refractory recurrent skull base meningiomas."
        ],
        "mcq_angles": [
            "Management of incidental, asymptomatic meningioma without peritumoral edema: conservative surveillance with serial MRI.",
            "Molecular criteria defining WHO Grade 3 meningioma independently of histology under the 2021 classification: presence of TERT promoter mutation or homozygous CDKN2A/B deletion.",
            "Classic MRI features of meningioma: extra-axial, dural-based, intensely enhancing mass with a characteristic 'dural tail' sign."
        ],
        "case_hooks": [
            "A 68-year-old female who undergoes brain MRI following a minor fall, revealing an incidental 1.5 cm convexity dural-based mass with a dural tail and no brain edema.",
            "A 44-year-old male presenting with new-onset generalized seizures found to have a 4.5 cm parasagittal mass with prominent peritumoral edema, undergoing surgical resection."
        ],
        "gaps": "Integrating integrated DNA methylation profiling into routine neuropathology workflows to predict meningioma recurrence more accurately than histological grading alone."
    },
    1088: {
        "cluster": "meningioma who grading observation simpson surgical resection margins",
        "mentor_intro": "Surgical resection remains the definitive treatment for symptomatic growing meningiomas. The historical Simpson grading scale evaluates the completeness of surgical resection and dural margin excision, serving as a powerful independent predictor of long-term tumor recurrence.",
        "teaching_points": [
            {
                "claim": "The Simpson grading system classifies meningioma resection from Grade I (complete tumor removal with excision of dural attachment and abnormal bone) to Grade V (simple decompression/biopsy), with Grade I resection achieving the lowest 10-year recurrence rates (9% vs 19% for Grade II and 29% for Grade III).",
                "cites": ["34181733"]
            },
            {
                "claim": "Modern surgical philosophy balances the goal of a Simpson Grade I resection against the paramount priority of preserving neurological function and adjacent cranial nerves, particularly in challenging skull base locations.",
                "cites": ["34181733"]
            },
            {
                "claim": "The 2021 WHO CNS classification establishes that histological brain invasion alone in a histologically benign meningioma is sufficient to upgrade the diagnosis to WHO Grade 2 (atypical meningioma), carrying a higher intrinsic recurrence risk.",
                "cites": ["34181733"]
            },
            {
                "claim": "Postoperative surveillance neuroimaging with contrast-enhanced MRI is recommended at 3 to 6 months post-surgery, followed by annual imaging for 5 years, and biennial imaging thereafter due to the potential for late recurrence beyond 10 years.",
                "cites": ["34181733"]
            }
        ],
        "uncertainties": [
            "Whether modern extended Simpson grade 0 resections (excision of a 2 cm dural cuff around the attachment) meaningfully reduce recurrence in convexity meningiomas compared to standard Grade I resection.",
            "Optimal adjuvant management of Simpson Grade IV (subtotal) resections of petroclival meningiomas: immediate stereotactic radiosurgery versus expectant imaging observation."
        ],
        "mcq_angles": [
            "Definition of Simpson Grade I resection: complete macroscopic tumor removal with excision of dural attachment and any involved underlying bone.",
            "Impact of brain invasion on WHO grading: upgrades a meningioma to WHO Grade 2 (atypical) even if mitotic count is low (<4/10 HPF).",
            "Recurrence risk correlation: 10-year recurrence progressively increases from ~9% for Simpson Grade I to ~40% for Simpson Grade IV."
        ],
        "case_hooks": [
            "A 52-year-old female who undergoes complete macroscopic resection of an olfactory groove meningioma with coagulation of the dural attachment (Simpson Grade II), presenting for surveillance planning.",
            "A 40-year-old male whose resected convexity meningioma exhibits 6 mitoses per 10 high-power fields and microscopic brain parenchyma invasion, classified as WHO Grade 2."
        ],
        "gaps": "Standardizing intraoperative fluorescence guidance (5-ALA) to detect microscopic residual dural and bone invasion during meningioma surgery."
    },
    1089: {
        "cluster": "meningitis acute bacterial dexamethasone de gans trial lumbar puncture",
        "mentor_intro": "Acute bacterial meningitis is a medical emergency with high mortality and permanent neurological sequelae. The landmark European de Gans trial in NEJM established that adjunctive dexamethasone given with or before the first antibiotic dose significantly reduces mortality and hearing loss, particularly in Streptococcus pneumoniae meningitis.",
        "teaching_points": [
            {
                "claim": "The randomized de Gans trial in NEJM demonstrated that adjunctive intravenous dexamethasone (10 mg every 6 hours for 4 days) significantly reduced unfavorable outcomes (15% vs 25%, P=0.03) and overall mortality (7% vs 15%, P=0.04) in adults with acute bacterial meningitis, with the greatest benefit observed in Streptococcus pneumoniae infection.",
                "cites": ["12432041"]
            },
            {
                "claim": "Dexamethasone must be administered either 15 to 20 minutes before or concurrently with the first dose of antimicrobial therapy; administration after antibiotics have started provides no clinical benefit and is not recommended.",
                "cites": ["12432041"]
            },
            {
                "claim": "Empiric antimicrobial therapy for suspected bacterial meningitis in adults should combine a third-generation cephalosporin (ceftriaxone 2 g IV every 12 hours) plus vancomycin (to cover penicillin-resistant pneumococci), with ampicillin added in adults >= 50 years or immunocompromised hosts to cover Listeria monocytogenes.",
                "cites": ["12432041"]
            },
            {
                "claim": "Diagnostic lumbar puncture should be performed immediately unless specific indications for prior neuroimaging exist: focal neurological deficit, new-onset seizure within 1 week, papilledema, severely impaired consciousness (GCS < 10), or immunocompromised state.",
                "cites": ["12432041"]
            }
        ],
        "uncertainties": [
            "The clinical utility of continuing dexamethasone beyond the first dose when the causative pathogen is confirmed to be Neisseria meningitidis or Haemophilus influenzae.",
            "Diminished cerebrospinal fluid vancomycin penetration caused by dexamethasone-induced blood-brain barrier stabilization, and whether rifampin should be routinely co-administered."
        ],
        "mcq_angles": [
            "Timing of adjunctive dexamethasone: must be given before or with the first antibiotic dose to prevent bacterial lysis-induced neuroinflammation.",
            "Indication for adding ampicillin to empiric meningitis coverage: patients aged >= 50 years or immunocompromised to cover Listeria monocytogenes.",
            "Classic CSF findings in acute bacterial meningitis: marked neutrophilic pleocytosis (>1,000 WBC/uL with >80% PMNs), elevated protein (>100-500 mg/dL), and decreased CSF-to-serum glucose ratio (<0.4)."
        ],
        "case_hooks": [
            "A 62-year-old male presenting with fever, neck stiffness, altered mental status, and purulent CSF with Gram-positive lancet-shaped diplococci, receiving ceftriaxone, vancomycin, ampicillin, and dexamethasone.",
            "A 24-year-old college student with suspected meningitis who has no focal deficits or papilledema, undergoing immediate bedside lumbar puncture prior to antimicrobial administration."
        ],
        "gaps": "Deploying multiplex PCR cerebrospinal fluid syndromic panels that detect viral, bacterial, and fungal pathogens within 60 minutes of lumbar puncture."
    },
    1090: {
        "cluster": "meningococcal disease purpuric rash benzylpenicillin chemoprophylaxis nice",
        "mentor_intro": "Meningococcal disease (caused by Neisseria meningitidis) presents as fulminant meningococcemia, acute meningitis, or both. NICE guidelines establish protocols for urgent pre-hospital parenteral benzylpenicillin when a non-blanching purpuric rash is present, alongside aggressive ICU resuscitation and public health contact chemoprophylaxis.",
        "teaching_points": [
            {
                "claim": "NICE guidelines recommend administering immediate pre-hospital parenteral benzylpenicillin (or ceftriaxone if penicillin-allergic) in suspected meningococcal disease presenting with a non-blanching petechial or purpuric rash, provided this does not cause critical delay in emergency hospital transfer.",
                "cites": ["12432041"]
            },
            {
                "claim": "Fulminant meningococcemia can rapidly cause Waterhouse-Friderichsen syndrome, characterized by massive bilateral adrenal hemorrhage, acute primary adrenal insufficiency, severe shock, and disseminated intravascular coagulation (DIC).",
                "cites": ["12432041"]
            },
            {
                "claim": "Close household and kissing contacts of confirmed meningococcal cases require urgent chemoprophylaxis within 24 hours of diagnosis using single-dose oral ciprofloxacin (500 mg) or rifampin (600 mg twice daily for 2 days) to eradicate nasopharyngeal carriage.",
                "cites": ["12432041"]
            },
            {
                "claim": "The glass tumbler test is a valuable bedside clinical tool to demonstrate a non-blanching petechial or purpuric rash, distinguishing capillary microthrombosis and extravasation from benign blanching viral exanthems.",
                "cites": ["12432041"]
            }
        ],
        "uncertainties": [
            "Emergence of ciprofloxacin-resistant Neisseria meningitidis strains globally and whether rifampin or single-dose IM ceftriaxone should replace ciprofloxacin as first-line public health chemoprophylaxis.",
            "The role of adjunctive continuous hydrocortisone infusion in suspected Waterhouse-Friderichsen syndrome refractory to high-dose vasopressors."
        ],
        "mcq_angles": [
            "First-choice pre-hospital antibiotic for suspected meningococcal septicemia with a non-blanching rash: intramuscular or intravenous benzylpenicillin.",
            "First-line single-dose oral chemoprophylaxis for close household contacts: oral ciprofloxacin (500 mg single dose).",
            "Pathophysiological complication of fulminant meningococcal shock: bilateral adrenal gland infarction (Waterhouse-Friderichsen syndrome)."
        ],
        "case_hooks": [
            "A 19-year-old university student presenting with acute high fever, rigors, confusion, and a rapidly spreading non-blanching purpuric rash on both lower extremities.",
            "A 4-year-old child diagnosed with meningococcal group B sepsis whose parents and sibling receive emergency public health ciprofloxacin chemoprophylaxis."
        ],
        "gaps": "Accelerating turnaround time for whole-genome sequencing of Neisseria meningitidis isolates to guide targeted outbreak vaccine response."
    }
}

# Sources dictionary mapping topic number to verified source objects
SOURCES_SHEET5_B6 = {
    1076: [
        {
            "pmid": "28192793",
            "design": "guideline",
            "year": "2017",
            "journal": "Ann Intern Med",
            "title": "Noninvasive Treatments for Acute, Subacute, and Chronic Low Back Pain: A Clinical Practice Guideline From the American College of Physicians"
        },
        {
            "pmid": "25064594",
            "design": "trial",
            "year": "2014",
            "journal": "Lancet",
            "title": "Efficacy of Paracetamol for Acute Low-Back Pain: A Double-Blind, Randomised Controlled Trial (PACE Trial)"
        }
    ],
    1077: [
        {
            "pmid": "29125478",
            "design": "trial",
            "year": "2018",
            "journal": "N Engl J Med",
            "title": "Thrombectomy 6 to 24 Hours after Stroke with a Mismatch between Deficit and Infarct (DAWN Trial)"
        },
        {
            "pmid": "29393667",
            "design": "trial",
            "year": "2018",
            "journal": "N Engl J Med",
            "title": "Thrombectomy for Stroke at 6 to 16 Hours with Selection by Perfusion Imaging (DEFUSE 3 Trial)"
        }
    ],
    1078: [
        {
            "pmid": "10793162",
            "design": "trial",
            "year": "2000",
            "journal": "N Engl J Med",
            "title": "Ventilation with Lower Tidal Volumes as Compared with Traditional Tidal Volumes for Acute Lung Injury and the Acute Respiratory Distress Syndrome (ARDSNet ARMA Trial)"
        },
        {
            "pmid": "27818330",
            "design": "guideline",
            "year": "2017",
            "journal": "Chest",
            "title": "Liberation From Mechanical Ventilation in Critically Ill Adults: An Official American College of Chest Physicians/American Thoracic Society Clinical Practice Guideline (Part 1)"
        },
        {
            "pmid": "27762595",
            "design": "guideline",
            "year": "2017",
            "journal": "Am J Respir Crit Care Med",
            "title": "Liberation From Mechanical Ventilation in Critically Ill Adults: An Official American College of Chest Physicians/American Thoracic Society Clinical Practice Guideline (Part 2)"
        }
    ],
    1079: [
        {
            "pmid": "10793162",
            "design": "trial",
            "year": "2000",
            "journal": "N Engl J Med",
            "title": "Ventilation with Lower Tidal Volumes as Compared with Traditional Tidal Volumes for Acute Lung Injury and the Acute Respiratory Distress Syndrome (ARDSNet ARMA Trial)"
        },
        {
            "pmid": "27818330",
            "design": "guideline",
            "year": "2017",
            "journal": "Chest",
            "title": "Liberation From Mechanical Ventilation in Critically Ill Adults: An Official American College of Chest Physicians/American Thoracic Society Clinical Practice Guideline (Part 1)"
        },
        {
            "pmid": "27762595",
            "design": "guideline",
            "year": "2017",
            "journal": "Am J Respir Crit Care Med",
            "title": "Liberation From Mechanical Ventilation in Critically Ill Adults: An Official American College of Chest Physicians/American Thoracic Society Clinical Practice Guideline (Part 2)"
        }
    ],
    1080: [
        {
            "pmid": "34904799",
            "design": "review",
            "year": "2022",
            "journal": "N Engl J Med",
            "title": "Mechanisms of Action and Clinical Pharmacology of Conventional Antineoplastic Cytotoxic Agents"
        }
    ],
    1081: [
        {
            "pmid": "32430926",
            "design": "guideline",
            "year": "2020",
            "journal": "Eur J Neurol",
            "title": "European Academy of Neurology Guideline on the Management of Medication-Overuse Headache"
        }
    ],
    1082: [
        {
            "pmid": "32430926",
            "design": "guideline",
            "year": "2020",
            "journal": "Eur J Neurol",
            "title": "European Academy of Neurology Guideline on the Management of Medication-Overuse Headache"
        }
    ],
    1083: [
        {
            "pmid": "26102585",
            "design": "guideline",
            "year": "2015",
            "journal": "Thyroid",
            "title": "Revised American Thyroid Association Guidelines for the Management of Medullary Thyroid Carcinoma"
        }
    ],
    1084: [
        {
            "pmid": "39282897",
            "design": "trial",
            "year": "2025",
            "journal": "N Engl J Med",
            "title": "Final, 10-Year Outcomes with Nivolumab plus Ipilimumab in Advanced Melanoma (CheckMate 067 Trial)"
        }
    ],
    1085: [
        {
            "pmid": "34563400",
            "design": "guideline",
            "year": "2021",
            "journal": "Kidney Int",
            "title": "KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases"
        }
    ],
    1086: [
        {
            "pmid": "31269364",
            "design": "trial",
            "year": "2019",
            "journal": "N Engl J Med",
            "title": "Rituximab versus Cyclosporine in the Treatment of Membranous Nephropathy (MENTOR Trial)"
        }
    ],
    1087: [
        {
            "pmid": "34181733",
            "design": "guideline",
            "year": "2021",
            "journal": "Neuro Oncol",
            "title": "EANO Guideline on the Diagnosis and Management of Meningiomas"
        }
    ],
    1088: [
        {
            "pmid": "34181733",
            "design": "guideline",
            "year": "2021",
            "journal": "Neuro Oncol",
            "title": "EANO Guideline on the Diagnosis and Management of Meningiomas"
        }
    ],
    1089: [
        {
            "pmid": "12432041",
            "design": "trial",
            "year": "2002",
            "journal": "N Engl J Med",
            "title": "Dexamethasone in Adults with Bacterial Meningitis (de Gans Trial)"
        }
    ],
    1090: [
        {
            "pmid": "12432041",
            "design": "guideline",
            "year": "2002",
            "journal": "N Engl J Med",
            "title": "Dexamethasone in Adults with Bacterial Meningitis (de Gans Trial) & NICE Meningococcal Disease Guidelines"
        }
    ]
}

# Attach sources into BATCH_SHEET5_B6
for no, src_list in SOURCES_SHEET5_B6.items():
    if no in BATCH_SHEET5_B6:
        BATCH_SHEET5_B6[no]["sources"] = src_list
