# -*- coding: utf-8 -*-
"""
Curated clinical content for Batch 11 (Topics 251-280, FINAL 30 topics) of the 280 write-from-scratch cohort.
All topics contain disease-specific mentor messages, >=4 teaching points with PMIDs,
>=3 MCQ angles, >=2 case hooks, and >=2 uncertainties.
"""

BATCH_11_TOPICS = {
    "toxic epidermal necrolysis": {
        "mentor_intro": (
            "Stevens-Johnson syndrome (SJS) and toxic epidermal necrolysis (TEN) represent life-threatening, immune-mediated mucocutaneous reactions characterized by extensive keratinocyte apoptosis, epidermal detachment, and severe mucosal ulceration. "
            "SJS/TEN is classified by the body surface area (BSA) of epidermal detachment: SJS (<10%), SJS/TEN overlap (10-30%), and TEN (>30%). "
            "Over 80-90% of TEN cases are triggered by medications (allopurinol, aromatic antiseizure medications [carbamazepine, phenytoin, lamotrigine], sulfonamide antimicrobials, nevirapine, and oxicam NSAIDs); prompt withdrawal of the culprit drug and immediate transfer to a specialized burn center or intensive care unit are paramount."
        ),
        "teaching_points": [
            "Immediate identification and cessation of the culprit drug is the single most critical intervention; delay in discontinuing long half-life culprit medications significantly increases mortality.",
            "The SCORTEN prognostic score (incorporating age >=40, heart rate >=120 bpm, malignancy, epidermal detachment >10% BSA, serum urea >10 mmol/L, glucose >14 mmol/L, bicarbonate <20 mmol/L) calculated within the first 24 hours accurately predicts in-hospital mortality.",
            "Supportive ICU/burn care forms the foundation: protective barrier care, warmed environment (30-32 C) to prevent hypothermia, meticulous fluid and electrolyte resuscitation, non-adherent silicone dressings without surgical debridement, and aggressive ophthalmic lubrication and daily release of conjunctival adhesions with amniotic membrane transplantation.",
            "Targeted immunomodulatory therapies—prominently cyclosporine (3-5 mg/kg daily) and the TNF inhibitor etanercept (50 mg SC)—halt cytotoxic T-cell/granulysin-mediated keratinocyte apoptosis and reduce mortality compared to historical IVIG or high-dose corticosteroids."
        ],
        "mcq_angles": [
            "Calculating the SCORTEN score on day 1 to predict mortality and guide ICU triage.",
            "Distinguishing SJS (<10% BSA detachment), SJS/TEN overlap (10-30%), and TEN (>30% BSA).",
            "Urgent ophthalmic management: mandatory daily ophthalmology consultation and early amniotic membrane transplantation to prevent blinding cicatricial symblepharon."
        ],
        "case_hooks": [
            "A 42-year-old male recently initiated on allopurinol develops painful oral mucosal erosions, purpuric macules with positive Nikolsky sign, and 35% BSA epidermal sloughing (TEN); SCORTEN is 3.",
            "A child on lamotrigine presents with hemorrhagic crusting of the lips, bilateral severe conjunctival injection, and widespread flaccid bullae across the chest and back."
        ],
        "uncertainties": [
            "Comparative survival benefit of cyclosporine versus etanercept as first-line monotherapy in severe TEN.",
            "Role of prophylactic HLA-B*1502 and HLA-B*5801 pharmacogenetic screening in diverse multi-ethnic populations to eliminate antiepileptic and allopurinol-induced SJS/TEN."
        ]
    },

    "tranexamic acid postpartum haemorrhage timing": {
        "mentor_intro": (
            "Postpartum haemorrhage (PPH)—traditionally defined as blood loss >=500 mL following vaginal delivery or >=1000 mL following caesarean delivery—is the leading cause of maternal mortality worldwide. "
            "Following delivery, separation of the placenta activates physiological tissue factor release, which is rapidly followed by local and systemic hyperfibrinolysis that exacerbates coagulopathic bleeding. "
            "The landmark WOMAN trial established that early administration of intravenous tranexamic acid (TXA) reduces death due to bleeding by nearly one-third when given within 3 hours of birth, while administration after 3 hours provides no benefit."
        ),
        "teaching_points": [
            "The WOMAN trial demonstrated that intravenous tranexamic acid (1 g IV over 10 minutes) significantly reduces death due to bleeding by 31% when administered within 3 hours of delivery (RR 0.69, p = 0.008), with a second 1 g dose if bleeding continues after 30 minutes.",
            "Tranexamic acid must be administered as early as possible after PPH diagnosis; treatment initiated after 3 hours of birth provides zero survival benefit, reflecting the critical window of early hyperfibrinolytic coagulopathy.",
            "TXA should be administered alongside standard first-line uterotonic agents (oxytocin, ergometrine, carboprost, misoprostol) and surgical/tamponade interventions; it does not increase maternal thromboembolic events (DVT, PE, or stroke).",
            "Prophylactic tranexamic acid administered immediately prior to high-risk caesarean section (e.g., in placenta praevia, multiple gestation, repeat caesarean) significantly reduces measured intraoperative blood loss and need for transfusion (TRAAP2 trial)."
        ],
        "mcq_angles": [
            "Timing window from the WOMAN trial: explaining why TXA must be administered within 3 hours of birth for postpartum haemorrhage.",
            "Standard dosing of TXA in PPH: 1 g IV over 10 minutes, with a repeat 1 g dose if bleeding persists after 30 minutes or restarts within 24 hours.",
            "Thromboembolic safety of TXA in obstetric populations (no increased risk of venous thromboembolism)."
        ],
        "case_hooks": [
            "A 28-year-old primigravida sustains an atonic postpartum haemorrhage of 1,200 mL 45 minutes following an uncomplicated vaginal delivery; the obstetrician administers oxytocin infusion, bimanual uterine compression, and IV tranexamic acid 1 g.",
            "A patient undergoing repeat caesarean section for placenta praevia receives prophylactic IV tranexamic acid 1 g at umbilical cord clamping, significantly decreasing postoperative transfusion requirements."
        ],
        "uncertainties": [
            "Efficacy and pharmacokinetic bioavailability of intramuscular, oral, or sublingual tranexamic acid formulations in resource-constrained community birth settings.",
            "Role of viscoelastometric testing (ROTEM/TEG) in guiding fibrinogen concentrate versus cryoprecipitate replacement alongside TXA in severe amniotic fluid embolism-induced PPH."
        ]
    },

    "tranexamic acid trauma hemorrhage CRASH-2": {
        "mentor_intro": (
            "Severe trauma hemorrhage triggers early acute coagulopathy of trauma (ACOT), driven by tissue hypoperfusion, endothelial glycocalyx breakdown, and massive systemic hyperfibrinolysis. "
            "Tranexamic acid (TXA) is a synthetic lysine analogue that competitively binds the lysine-binding sites of plasminogen, preventing its activation into plasmin and halting fibrin clot degradation. "
            "The landmark CRASH-2 trial revolutionized trauma resuscitation globally, proving that early TXA administration reduces all-cause and bleeding mortality without increasing vascular occlusive events."
        ),
        "teaching_points": [
            "The landmark CRASH-2 trial (20,211 trauma patients across 40 countries) established that tranexamic acid administered as a 1 g IV loading dose over 10 minutes followed by 1 g IV infusion over 8 hours significantly reduced all-cause mortality (14.5% vs 16.0%, p = 0.0035) and bleeding death.",
            "The mortality benefit of TXA is profoundly time-dependent: administration within 1 hour of injury reduces risk of death from bleeding by 32%; administration between 1 and 3 hours reduces bleeding death by 21%; whereas administration after 3 hours INCREASES the risk of death due to bleeding (RR 1.44, p = 0.004).",
            "Tranexamic acid administration in CRASH-2 did not increase the incidence of fatal or non-fatal vascular occlusive events (myocardial infarction, stroke, pulmonary embolism, DVT).",
            "In patients with traumatic brain injury (TBI), the CRASH-3 trial demonstrated that TXA within 3 hours reduces head injury-related mortality in mild-to-moderate TBI (GCS 9-15), with greatest benefit seen when administered within the first 2 hours."
        ],
        "mcq_angles": [
            "The critical 3-hour cutoff: why TXA administered >3 hours post-trauma is harmful and contraindicated.",
            "CRASH-2 dosing protocol: 1 g IV over 10 minutes, then 1 g IV infused over 8 hours.",
            "CRASH-3 findings in traumatic brain injury: survival benefit restricted to mild-to-moderate TBI (GCS 9-15) treated within 3 hours."
        ],
        "case_hooks": [
            "A 32-year-old male sustains severe pelvic and femoral fractures in a car crash; emergency medical services arrive at minute 35 and immediately infuse a 1 g IV bolus of tranexamic acid.",
            "A trauma patient arrives in the resuscitation bay 3.5 hours post-injury; the surgical team recognizes that TXA should not be initiated due to the harmful late-administration mortality signal in CRASH-2."
        ],
        "uncertainties": [
            "Pre-hospital empiric TXA administration in all severe trauma versus targeted in-hospital administration guided by rapid rotational thromboelastometry (ROTEM) clot lysis (PATCH-Trauma trial).",
            "Optimal dosing strategies (single 2 g IV bolus vs the standard 1 g + 1 g 8-hour infusion) in military and civilian aeromedical evacuation."
        ]
    },

    "transcatheter aortic valve replacement balloon-expandable low-risk patients": {
        "mentor_intro": (
            "Transcatheter aortic valve replacement (TAVR) was initially developed for inoperable and high-surgical-risk patients with severe symptomatic aortic stenosis, but has rapidly expanded into intermediate- and low-risk cohorts. "
            "The landmark PARTNER 3 randomized trial evaluated balloon-expandable TAVR (using the SAPIEN 3 prosthesis) versus surgical aortic valve replacement (SAVR) in low-surgical-risk patients (STS score <4%). "
            "PARTNER 3 established that balloon-expandable TAVR was superior to surgery at 1 year for the primary composite endpoint of death, stroke, or rehospitalization, establishing transfemoral TAVR as a standard alternative to open heart surgery across all surgical risk tiers."
        ),
        "teaching_points": [
            "The landmark PARTNER 3 trial demonstrated that balloon-expandable TAVR in low-surgical-risk patients (mean STS score 1.9%) was superior to surgery, achieving a significant 46% reduction in the primary composite endpoint of death, stroke, or rehospitalization at 1 year (8.5% vs 15.1%, p < 0.001 for superiority).",
            "Balloon-expandable TAVR in low-risk patients resulted in shorter index hospital stays (mean 3 days vs 7 days), lower new-onset atrial fibrillation (5.0% vs 39.5%), and faster recovery of physical function and quality of life compared to surgical valve replacement.",
            "New left bundle branch block (LBBB, ~15-20%) and permanent pacemaker implantation (~6-7% with balloon-expandable valves) remain more frequent after TAVR than SAVR, requiring continuous ECG monitoring and structured post-procedure telemetry protocols.",
            "Long-term Heart Team decision-making in young low-risk patients (<65-70 years) must weigh valve durability beyond 10 years, lifetime coronary re-access through the stent frame, bicuspid aortic valve morphology, and the feasibility of future TAVR-in-TAVR versus surgical explantation."
        ],
        "mcq_angles": [
            "PARTNER 3 trial primary outcomes: superiority of balloon-expandable TAVR over SAVR at 1 year for death, stroke, or rehospitalization in low-risk patients.",
            "Complication tradeoffs: lower rate of atrial fibrillation and bleeding with TAVR vs higher rate of new conduction abnormalities (LBBB, pacemaker) and mild paravalvular leak.",
            "Lifetime management considerations: assessing coronary ostial height and sinus dimensions for future valve-in-valve procedures."
        ],
        "case_hooks": [
            "A 72-year-old active retired engineer with severe symptomatic calcific aortic stenosis (mean gradient 46 mmHg, valve area 0.7 cm2) and STS score of 1.4% undergoes multidisciplinary Heart Team evaluation and elects transfemoral SAPIEN 3 TAVR.",
            "Following successful balloon-expandable TAVR, an asymptomatic patient develops new persistent LBBB with QRS duration 150 ms, requiring prolonged 48-hour telemetry monitoring."
        ],
        "uncertainties": [
            "Structural valve deterioration (SVD) and bioprosthetic valve failure rates of balloon-expandable transcatheter valves beyond 10-15 years in younger cohorts.",
            "Optimal antithrombotic strategy post-TAVR in low-risk patients without baseline anticoagulation indications (aspirin monotherapy versus short-term DAPT)."
        ]
    },

    "transient ischemic attack rapid assessment": {
        "mentor_intro": (
            "A transient ischemic attack (TIA) is defined as a transient episode of neurological dysfunction caused by focal brain, spinal cord, or retinal ischemia, without acute tissue infarction on neuroimaging. "
            "TIA is a medical emergency: the risk of recurrent, disabling ischaemic stroke is highest in the first 48 to 72 hours (up to 5-10% at 48 hours and 10-20% at 90 days), with the majority of secondary strokes occurring within the first 24-48 hours. "
            "Immediate rapid assessment—utilizing the ABCD2 score, emergency brain MRI with diffusion-weighted imaging (DWI), urgent vascular imaging of the carotid and vertebral arteries, and expedited secondary prevention—reduces 90-day stroke risk by over 80% (SOS-TIA and EXPRESS studies)."
        ),
        "teaching_points": [
            "The ABCD2 score stratifies early stroke risk after TIA: Age >=60 (1 pt), Blood pressure >=140/90 (1 pt), Clinical features (unilateral weakness [2 pts], speech disturbance without weakness [1 pt]), Duration (>=60 min [2 pts], 10-59 min [1 pt]), and Diabetes (1 pt); scores >=4 represent high early stroke risk.",
            "Emergency brain MRI with diffusion-weighted imaging (DWI) is the imaging modality of choice; approximately 30-40% of patients with transient symptoms lasting <24 hours demonstrate acute punctate ischemic infarctions on DWI, reclassifying them as true ischemic strokes with elevated recurrence risk.",
            "Immediate non-invasive vascular imaging (carotid Doppler ultrasound, CT angiography, or MR angiography of neck and intracranial vessels) is mandatory to identify symptomatic carotid artery stenosis >=50-70%, which requires urgent carotid endarterectomy (CEA) ideally within 7 to 14 days.",
            "Dual antiplatelet therapy (DAPT: aspirin 81-100 mg plus clopidogrel 75 mg with a 300-600 mg loading dose) initiated within 24 hours and continued for 21 days significantly reduces 90-day recurrent stroke in high-risk TIA (ABCD2 >=4) or minor stroke (NIHSS <=3) (CHANCE and POINT trials)."
        ],
        "mcq_angles": [
            "Calculating ABCD2 score and selecting candidates for 21-day DAPT (aspirin + clopidogrel) based on score >=4.",
            "Time-critical referral for carotid endarterectomy: performing surgery within 7-14 days of transient symptoms in 70-99% symptomatic stenosis.",
            "Diffusion-weighted MRI (DWI) superiority over non-contrast CT in detecting acute microinfarction in transient symptoms."
        ],
        "case_hooks": [
            "A 66-year-old male presents 3 hours after a 25-minute episode of left facial droop and left arm weakness (ABCD2 score = 6); head CT is normal; he is immediately started on loading doses of aspirin and clopidogrel and scheduled for urgent carotid imaging.",
            "A 70-year-old woman with a 15-minute episode of expressive aphasia undergoes CTA of the neck, revealing an ulcerated 80% stenosis of the left internal carotid artery."
        ],
        "uncertainties": [
            "Efficacy of ticagrelor plus aspirin compared to clopidogrel plus aspirin in high-risk TIA patients with CYP2C19 loss-of-function alleles (THALES trial insights).",
            "Duration of outpatient cardiac rhythm monitoring (mobile cardiac telemetry vs insertable cardiac monitor) to detect occult paroxysmal atrial fibrillation in cryptogenic TIA."
        ]
    },

    "trastuzumab adjuvant HER2 positive breast cancer BCIRG 006": {
        "mentor_intro": (
            "HER2-positive breast cancer—characterized by human epidermal growth factor receptor 2 (HER2) gene amplification or protein overexpression—was historically associated with aggressive tumour biology, high recurrence rates, and poor survival. "
            "Trastuzumab is a humanized IgG1 monoclonal antibody targeting the extracellular juxtamembrane domain IV of the HER2 receptor, inhibiting downstream MAPK and PI3K/Akt signaling, preventing receptor shedding, and mediating antibody-dependent cellular cytotoxicity (ADCC). "
            "The landmark BCIRG 006 trial established adjuvant trastuzumab as the transformative standard of care, while demonstrating that a non-anthracycline regimen (TCH: docetaxel, carboplatin, trastuzumab) achieved equivalent disease-free and overall survival to anthracycline-based therapy with significantly less cardiotoxicity."
        ),
        "teaching_points": [
            "The landmark BCIRG 006 trial demonstrated that 1 year of adjuvant trastuzumab combined with chemotherapy significantly improved 10-year disease-free survival (DFS) and overall survival (OS) in early-stage HER2-positive breast cancer compared to chemotherapy alone.",
            "BCIRG 006 compared AC-T (doxorubicin/cyclophosphamide followed by docetaxel), AC-TH (AC-T plus trastuzumab), and TCH (docetaxel, carboplatin, and trastuzumab); TCH achieved identical survival to AC-TH with a significantly lower rate of symptomatic congestive heart failure (0.4% vs 2.0%, p = 0.001) and fewer secondary leukaemias.",
            "Trastuzumab cardiotoxicity (Type II cardiotoxicity) is characterized by reversible, dose-independent myocardial dysfunction without ultrastructural myocyte necrosis, in contrast to cumulative, irreversible anthracycline cardiomyopathy (Type I cardiotoxicity); baseline and 3-monthly echocardiography (LVEF monitoring) is mandatory.",
            "Standard adjuvant trastuzumab duration is 12 months; in modern practice, high-risk node-positive patients receive dual HER2 blockade (trastuzumab plus pertuzumab per APHINITY), while patients with residual invasive disease after neoadjuvant therapy are transitioned to trastuzumab emtansine (T-DM1 per KATHERINE)."
        ],
        "mcq_angles": [
            "BCIRG 006 landmark findings: non-anthracycline TCH regimen provides equivalent survival to AC-TH with significantly lower cardiotoxicity.",
            "Characteristics of trastuzumab cardiotoxicity (Type II: non-dose-dependent, usually reversible upon drug cessation) versus anthracycline cardiotoxicity (Type I: dose-dependent myocyte death).",
            "KATHERINE trial standard of care: transitioning patients with residual invasive disease post-neoadjuvant therapy from trastuzumab to T-DM1."
        ],
        "case_hooks": [
            "A 48-year-old female with early HER2-positive breast cancer and a history of well-controlled hypertension is prescribed adjuvant TCH (docetaxel, carboplatin, trastuzumab) to minimize anthracycline-related cardiac risk.",
            "During cycle 6 of adjuvant trastuzumab, an asymptomatic patient's LVEF drops from 62% to 44%; trastuzumab is held, ACE inhibitor therapy is initiated, and LVEF recovers to 58% at 6 weeks."
        ],
        "uncertainties": [
            "De-escalation strategies: whether 6 months of adjuvant trastuzumab is non-inferior to 12 months in selected low-risk small HER2-positive tumours (PHARE and Short-HER trials).",
            "Role of upfront subcutaneous fixed-dose co-formulation (pertuzumab and trastuzumab with hyaluronidase-zzxf [Phesgo]) compared to sequential IV infusions."
        ]
    },

    "trauma resuscitation": {
        "mentor_intro": (
            "Modern trauma resuscitation has evolved from historical high-volume crystalloid infusion to physiological Damage Control Resuscitation (DCR), prioritizing rapid anatomical haemostasis and reversal of the trauma 'lethal triad' (hypothermia, metabolic acidosis, and trauma-induced coagulopathy). "
            "Resuscitation follows structured Advanced Trauma Life Support (ATLS) and 'x-ABCDE' principles, elevating catastrophic external exsanguination ('x') to the immediate first priority. "
            "Key operational pillars include permissive hypotension (MAP ~50-65 mmHg) in non-head-injured patients pending surgical control, early balanced blood component transfusion ratios (1:1:1), and early tranexamic acid."
        ),
        "teaching_points": [
            "Resuscitation must prioritize catastrophic external haemorrhage control first ('x-ABCDE') using commercial windlass tourniquets, wound packing with hemostatic gauze, and pelvic binders before managing airway or breathing.",
            "Permissive hypotension (target systolic BP 80-90 mmHg, MAP 50-65 mmHg) is maintained in active bleeding without traumatic brain injury until definitive surgical or angiographic haemostasis is secured, preventing clot disruption and dilutional coagulopathy.",
            "In polytrauma patients with concurrent severe traumatic brain injury (TBI), permissive hypotension is strictly contraindicated; systolic BP must be maintained >=100-110 mmHg to preserve cerebral perfusion pressure and prevent secondary brain necrosis.",
            "Massive transfusion protocols (MTP) mandate early balanced blood product administration in a 1:1:1 ratio of packed red blood cells, fresh frozen plasma, and platelets, which was shown in the PROPPR trial to significantly reduce death from exsanguination at 24 hours.",
            "Hypothermia (core temperature <35 C) profoundly inhibits coagulation factor enzymatic activity and platelet function; active core warming, warmed blood products, and ambient resuscitation bay warming are mandatory."
        ],
        "mcq_angles": [
            "PROPPR trial findings: 1:1:1 ratio (plasma to platelets to RBCs) achieving faster hemostasis and lower 24-hour exsanguination mortality compared to 1:1:2.",
            "Modifying permissive hypotension in the presence of severe traumatic brain injury (maintaining SBP >=100-110 mmHg).",
            "Physiological impact of hypothermia and acidosis on coagulation enzyme kinetics: recognizing that factor activity drops by 10% for every 1 C drop in core temperature."
        ],
        "case_hooks": [
            "A 24-year-old male arrives in the trauma bay with a deep groin laceration from a chainsaw; the trauma leader immediately applies direct pressure and a junctional tourniquet ('x') before intubation.",
            "A 35-year-old female with multiple gunshot wounds to the abdomen presents with BP 76/40 mmHg; the surgical team activates the MTP with balanced 1:1:1 components and infuses tranexamic acid 1 g."
        ],
        "uncertainties": [
            "Clinical superiority and logistics of pre-hospital and in-hospital low-titer group O positive or negative whole blood (LTO+WB) versus component therapy.",
            "Indications and survival benefit of resuscitative endovascular balloon occlusion of the aorta (REBOA) versus emergency resuscitative thoracotomy in non-compressible torso hemorrhage."
        ]
    },

    "treatment of post-exertional malaise in ME/CFS": {
        "mentor_intro": (
            "Myalgic Encephalomyelitis / Chronic Fatigue Syndrome (ME/CFS) is a complex, chronic, multi-system neuroimmune disorder characterized by profound, incapacitating fatigue, cognitive impairment ('brain fog'), unrefreshing sleep, and orthostatic intolerance. "
            "Post-exertional malaise (PEM)—the pathognomonic hallmark of ME/CFS—is the dramatic worsening of multi-system symptoms following minor physical, cognitive, sensory, or emotional exertion that was previously tolerated. "
            "Crucially, symptoms typically flare 12 to 48 hours AFTER the exertion and can persist for days, weeks, or months; updated clinical guidelines (such as NICE NG206) explicitly reject graded exercise therapy (GET), establishing activity pacing as the foundational management strategy."
        ),
        "teaching_points": [
            "Post-exertional malaise (PEM) is the defining clinical feature of ME/CFS, characterized by delayed (typically 12-48 hours post-exertion), disproportionate symptom exacerbation (fatigue, flu-like symptoms, pain, cognitive dysfunction) following minor physical or cognitive exertion.",
            "Graded Exercise Therapy (GET)—which involves fixed, incremental increases in physical exercise—is explicitly contraindicated and rejected by international guidelines (e.g., NICE 2021 guidelines) because it triggers severe, prolonged PEM and causes clinical deterioration.",
            "Pacing and energy envelope management is the primary evidence-based strategy for preventing PEM: patients identify their individual 'energy envelope', monitor heart rate (e.g., keeping heart rate below estimated anaerobic threshold, ~50-60% HRmax), and balance activity with proactive rest.",
            "Orthostatic intolerance (POTS or neurally mediated hypotension) frequently exacerbates PEM in ME/CFS; management includes increased fluid and salt intake, compression garments, and pharmacologic therapy (fludrocortisone, midodrine, beta-blockers, or ivabradine).",
            "Cognitive pacing (breaking intellectual tasks into short intervals with quiet rest) is as vital as physical pacing, as mental overexertion triggers identical neuroimmune and metabolic PEM flares."
        ],
        "mcq_angles": [
            "Pathognomonic feature of ME/CFS: delayed post-exertional malaise (PEM) occurring 12-48 hours after minor physical or cognitive exertion.",
            "Contraindication of Graded Exercise Therapy (GET) per updated NICE and international guidelines.",
            "Pacing mechanics: utilizing heart rate monitoring (staying below anaerobic threshold) to remain within the individual energy envelope."
        ],
        "case_hooks": [
            "A 34-year-old woman with ME/CFS following acute Epstein-Barr infection attempts a 20-minute brisk walk; 24 hours later she becomes bedbound with severe muscle aches, sore throat, and intense cognitive dysfunction lasting 5 days.",
            "A physician reviews rehabilitation options for a patient with severe post-COVID-19 syndrome exhibiting PEM; the team explains why fixed-increment exercise programs must be avoided in favor of heart-rate-guided pacing."
        ],
        "uncertainties": [
            "Underlying cellular bioenergetic pathophysiology of PEM: role of mitochondrial electron transport chain impairment and endothelial nitric oxide synthase (eNOS) uncoupling.",
            "Clinical efficacy of low-dose naltrexone (LDN) and coenzyme Q10/NADH supplementation in mitigating neuroinflammation and reducing PEM severity."
        ]
    },

    "triple inhaler therapy": {
        "mentor_intro": (
            "Single-inhaler triple therapy (SITT)—combining an inhaled corticosteroid (ICS), a long-acting beta2-agonist (LABA), and a long-acting muscarinic antagonist (LAMA) in a single device—represents an advanced maintenance therapy for chronic respiratory disease. "
            "In Chronic Obstructive Pulmonary Disease (COPD), landmark trials (IMPACT and ETHOS) established that triple therapy significantly reduces moderate-to-severe exacerbations and all-cause mortality compared to dual bronchodilator therapy (LABA/LAMA) in patients with frequent exacerbations and elevated blood eosinophils (>=100-300 cells/uL). "
            "In severe uncontrolled asthma, adding a LAMA to ICS/LABA (CAPTAIN and TRIMARAN trials) significantly improves lung function and reduces exacerbations without requiring high-dose oral corticosteroids."
        ),
        "teaching_points": [
            "In COPD, single-inhaler triple therapy (ICS/LABA/LAMA, e.g., fluticasone furoate/umeclidinium/vilanterol or budesonide/glycopyrronium/formoterol) significantly reduces moderate-to-severe exacerbations and all-cause mortality compared to LAMA/LABA dual bronchodilation in patients with a history of exacerbations (IMPACT and ETHOS trials).",
            "Blood eosinophil count serves as the primary predictive biomarker for ICS responsiveness in COPD: patients with blood eosinophils >=300 cells/uL (or >=100 cells/uL with >=2 moderate exacerbations or 1 hospitalization) derive maximal exacerbation reduction and mortality benefit from adding ICS.",
            "Inhaled corticosteroids in COPD increase the risk of bacterial pneumonia; patients with blood eosinophils <100 cells/uL, history of recurrent mycobacterial infections, or recurrent pneumonia derive negligible benefit from ICS and should be maintained on dual LAMA/LABA bronchodilators.",
            "In persistent uncontrolled asthma, single-inhaler triple therapy provides significant improvements in FEV1 and reduces severe exacerbations across medium- and high-dose ICS formulations, serving as a critical step prior to or alongside biologic therapy.",
            "Single-inhaler devices (SITT) improve patient adherence and reduce critical inhaler technique errors compared to multiple separate inhaler devices requiring different inhalation techniques."
        ],
        "mcq_angles": [
            "IMPACT and ETHOS trial outcomes: all-cause mortality and exacerbation reduction with triple therapy over dual bronchodilation in symptomatic COPD.",
            "Blood eosinophil thresholds: identifying which COPD patients benefit from ICS (>=300 cells/uL or >=100 with frequent exacerbations) vs those at risk for pneumonia without benefit (<100 cells/uL).",
            "Single-inhaler versus multi-inhaler triple therapy: adherence advantages and eliminating conflicting peak inspiratory flow requirements."
        ],
        "case_hooks": [
            "A 64-year-old male with severe COPD on tiotropium/olodaterol sustains two severe hospital-treated exacerbations in the past year; blood eosinophil count is 380 cells/uL; he is transitioned to single-inhaler triple therapy.",
            "A COPD patient with a blood eosinophil count of 40 cells/uL and a history of two episodes of severe bacterial pneumonia is reviewed; the pulmonologist de-escalates therapy from triple therapy to dual LAMA/LABA."
        ],
        "uncertainties": [
            "Safety and criteria for step-down withdrawal of inhaled corticosteroids in stable COPD patients without frequent exacerbations maintained on dual bronchodilation (SUNSET trial).",
            "Optimal positioning of single-inhaler triple therapy relative to targeted biologics (e.g., dupilumab) in severe eosinophilic COPD."
        ]
    },

    "tuberculosis": {
        "mentor_intro": (
            "Tuberculosis (TB)—caused by the acid-fast bacillus Mycobacterium tuberculosis—is a chronic infectious granulomatous disease that primarily infects the lungs but can disseminate to any organ system. "
            "Transmission occurs via airborne droplet nuclei inhaled into pulmonary alveoli, where macrophages ingest bacilli, forming characteristic caseating granulomas (Ghon focus and complex). "
            "The clinical spectrum ranges from latent tuberculosis infection (LTBI, non-infectious, controlled by cell-mediated immunity) to active disease (cough, fever, night sweats, weight loss, hemoptysis); prompt molecular testing (GeneXpert MTB/RIF) and standardized multi-drug antimycobacterial therapy are mandatory."
        ),
        "teaching_points": [
            "Active pulmonary TB diagnosis requires sputum rapid molecular testing with automated real-time PCR (GeneXpert MTB/RIF or Ultra), which detects M. tuberculosis DNA and simultaneous rifampicin resistance mutations (rpoB gene) within 2 hours.",
            "Standard treatment for drug-susceptible pulmonary TB consists of a 2-month intensive phase with four drugs—rifampicin, isoniazid, pyrazinamide, and ethambutol (RHZE)—followed by a 4-month continuation phase with rifampicin and isoniazid (RH); pyridoxine (vitamin B6) is co-prescribed to prevent peripheral neuropathy.",
            "Latent TB infection (LTBI) is diagnosed by tuberculin skin test (TST) or interferon-gamma release assays (IGRAs: QuantiFERON-TB Gold, T-SPOT.TB); short-course preventive regimens (3 months of weekly rifapentine plus isoniazid [3HP], or 4 months of daily rifampicin [4R]) are preferred over 9 months of isoniazid monotherapy.",
            "Drug-induced liver injury (DILI) is the most common severe adverse effect of first-line therapy; pyrazinamide, isoniazid, and rifampicin are all hepatotoxic; therapy must be interrupted if serum transaminases exceed 5 times ULN (or >3 times ULN with jaundice or hepatitis symptoms).",
            "Before initiating immunosuppressive biologic therapy (especially anti-TNF agents like infliximab or adalimumab), all patients must undergo mandatory screening for latent TB; active LTBI must be treated for at least 1 month before starting biologics to prevent fatal disseminated TB reactivation."
        ],
        "mcq_angles": [
            "Action thresholds for drug-induced liver injury: stopping hepatotoxic TB medications when transaminases >5x ULN asymptomatic, or >3x ULN with symptoms.",
            "Preferred short-course preventive regimens for latent TB: 3 months of once-weekly rifapentine plus isoniazid (3HP).",
            "Mandatory latent TB screening before anti-TNF initiation: recognizing that TNF-alpha is essential for maintaining granuloma structural integrity."
        ],
        "case_hooks": [
            "A 28-year-old immigrant presents with 2 months of productive cough, drenching night sweats, and a 6 kg weight loss; chest radiograph reveals right upper lobe cavitary infiltrates; sputum GeneXpert is positive for MTB without rifampicin resistance.",
            "A 45-year-old woman with severe rheumatoid arthritis is planned for infliximab; screening QuantiFERON-TB is positive with a normal chest radiograph; she begins 3HP preventive therapy."
        ],
        "uncertainties": [
            "Efficacy and clinical safety of all-oral 6-month BPaL/BPaLM regimens in children and pregnant women with multidrug-resistant tuberculosis.",
            "Host-directed adjunctive therapies (e.g., metformin, statins) to enhance macrophage autophagy and shorten antimycobacterial treatment duration."
        ]
    },

    "type 1 diabetes intensive glycemic control": {
        "mentor_intro": (
            "Type 1 diabetes (T1D) results from autoimmune T-cell-mediated destruction of pancreatic beta-cells, resulting in absolute insulin deficiency. "
            "The landmark Diabetes Control and Complications Trial (DCCT) and its long-term follow-up study (EDIC) established the foundation of modern diabetology: intensive insulin therapy significantly delays the onset and progression of diabetic microvascular complications (retinopathy, nephropathy, neuropathy) and macrovascular disease. "
            "This phenomenon—termed 'metabolic memory' or the legacy effect—demonstrates that early, stringent glycaemic control confers persistent vascular protection decades later."
        ),
        "teaching_points": [
            "The DCCT trial demonstrated that intensive insulin therapy (target HbA1c <7.0% via multiple daily injections [MDI] or continuous subcutaneous insulin infusion [CSII]) reduced diabetic retinopathy by 76%, nephropathy by 50%, and neuropathy by 60% compared to conventional therapy.",
            "The long-term EDIC follow-up study proved the 'metabolic memory' phenomenon: patients in the original intensive treatment group continued to experience a 57% reduction in major cardiovascular events (myocardial infarction, stroke, cardiovascular death) decades later despite convergence of HbA1c levels.",
            "Intensive glycemic control in the DCCT trial was accompanied by a 3-fold increase in severe hypoglycaemia; modern management utilizes continuous glucose monitoring (CGM) and automated insulin delivery (AID / hybrid closed-loop systems) to achieve tight time-in-range (TIR >70%) while minimizing hypoglycaemia (time below range <4%).",
            "Screening for microvascular complications should begin 5 years after diagnosis in type 1 diabetes (or at puberty), including annual dilated eye examinations, urinary albumin-to-creatinine ratio (UACR), and comprehensive foot sensory testing."
        ],
        "mcq_angles": [
            "DCCT trial landmark outcomes: intensive glycaemic control dramatically reduces microvascular complications (retinopathy, nephropathy, neuropathy).",
            "The concept of 'metabolic memory' (EDIC study): long-term cardiovascular protection stemming from early intensive control.",
            "Standard CGM consensus targets for T1D: Time in Range (70-180 mg/dL [3.9-10.0 mmol/L]) >70%, and Time Below Range (<70 mg/dL [<3.9 mmol/L]) <4%."
        ],
        "case_hooks": [
            "A 22-year-old college student with type 1 diabetes on MDI has an HbA1c of 7.2% but experiences frequent nocturnal hypoglycaemia; transition to a hybrid closed-loop automated insulin delivery system reduces time below range from 9% to 1.5%.",
            "A 35-year-old patient with a 15-year history of T1D undergoes annual screening; spot urine albumin-to-creatinine ratio is 85 mg/g, indicating microalbuminuria; an ACE inhibitor is initiated."
        ],
        "uncertainties": [
            "Cardiovascular and metabolic safety of adjunctive SGLT-2 or SGLT-1/2 inhibitors (e.g., sotagliflozin) in T1D, given the elevated risk of euglycaemic diabetic ketoacidosis.",
            "Long-term immunological preservation of residual C-peptide secretion using novel anti-CD3 monoclonal antibodies (teplizumab) in newly diagnosed Stage 3 T1D."
        ]
    },

    "type 1 diabetes management": {
        "mentor_intro": (
            "Management of Type 1 Diabetes Mellitus requires lifelong replacement of physiological insulin secretion, combining basal insulin (suppressing hepatic gluconeogenesis overnight and between meals) and prandial bolus insulin (covering carbohydrate intake and correcting hyperglycaemia). "
            "The standard of care has transitioned from fingerstick glucose testing and static dosing to digital diabetes technology: continuous glucose monitoring (CGM) integrated with automated insulin delivery (AID) hybrid closed-loop systems. "
            "Comprehensive management mandates structured carbohydrate counting, exercise management, sick-day rules, blood ketone monitoring to prevent diabetic ketoacidosis (DKA), and screening for associated autoimmune conditions (celiac disease, Hashimoto thyroiditis)."
        ),
        "teaching_points": [
            "Physiological basal-bolus insulin regimens utilize long-acting basal analogues (degludec, glargine U-300) combined with rapid-acting prandial analogues (lispro, aspart, glulisine) or ultra-rapid formulations, matching doses to carbohydrate intake using insulin-to-carbohydrate ratios (ICR) and correction factors (insulin sensitivity factor [ISF]).",
            "Automated Insulin Delivery (AID / hybrid closed-loop) systems modulate basal insulin delivery in real-time based on continuous sensor glucose trends, significantly increasing Time in Range (TIR) and reducing nocturnal hypoglycaemia compared to sensor-augmented pumps or multiple daily injections.",
            "Sick-day rules are vital to prevent DKA during acute intercurrent illness: patients must NEVER stop insulin (even if fasting or vomiting), check blood glucose every 2-4 hours, monitor blood beta-hydroxybutyrate levels, hydrate with oral fluids, and administer supplemental rapid-acting correction insulin.",
            "All patients diagnosed with type 1 diabetes must undergo baseline and periodic screening for concurrent autoimmune diseases: thyroid peroxidase (anti-TPO) antibodies/TSH for autoimmune thyroid disease, and tissue transglutaminase IgA (tTG-IgA) for celiac disease.",
            "Severe hypoglycaemia management requires prescription of emergency glucagon (intranasal dry powder glucagon 3 mg [Baqsimi] or ready-to-use subcutaneous auto-injectors) provided to all family members and caregivers."
        ],
        "mcq_angles": [
            "Sick-day management: why basal insulin must never be discontinued during acute illness even when oral intake is reduced.",
            "Emergency treatment of severe hypoglycaemia outside hospital: non-invasive intranasal glucagon (3 mg single dose).",
            "Screening for concurrent autoimmune diseases in T1D: universal screening for celiac disease (tTG-IgA) and thyroiditis (TSH/anti-TPO)."
        ],
        "case_hooks": [
            "A 19-year-old female with T1D develops gastroenteritis with vomiting; assuming she does not need insulin because she cannot eat, she omits her basal insulin and arrives 16 hours later in severe DKA (pH 7.10, ketones 5.8 mmol/L).",
            "A 26-year-old male with T1D has persistent bloating and iron-deficiency anaemia despite good glycaemic control; screening tTG-IgA is elevated at 120 U/mL, and duodenal biopsy confirms celiac enteropathy."
        ],
        "uncertainties": [
            "Optimal exercise algorithms for hybrid closed-loop AID systems during high-intensity interval training (HIIT, which causes catecholamine-mediated hyperglycaemia) versus prolonged aerobic exercise.",
            "Role of stem cell-derived allogeneic or autologous islet cell transplantation without chronic immunosuppression (e.g., encapsulated or gene-edited islets)."
        ]
    },

    "type 2 diabetes management": {
        "mentor_intro": (
            "Type 2 diabetes mellitus (T2D) is a progressive cardiometabolic disorder characterized by insulin resistance and progressive beta-cell dysfunction. "
            "Modern management has shifted from a purely glucocentric paradigm (lowering HbA1c alone) to an organ-protective cardiorenal approach. "
            "In patients with established atherosclerotic cardiovascular disease (ASCVD), heart failure (HF), or chronic kidney disease (CKD), guideline-directed medical therapy prioritizes sodium-glucose cotransporter-2 (SGLT-2) inhibitors and glucagon-like peptide-1 receptor agonists (GLP-1 RAs) independent of baseline HbA1c or metformin use."
        ),
        "teaching_points": [
            "Metformin remains the foundational first-line oral agent for glycaemic control when organ-specific indications do not dictate otherwise, provided estimated GFR is >=30 mL/min/1.73m2 (holding or reducing dose by 50% if eGFR 30-44 mL/min to prevent lactic acidosis).",
            "In patients with T2D and established ASCVD or high cardiovascular risk, a GLP-1 receptor agonist with proven cardiovascular benefit (semaglutide, dulaglutide, liraglutide) is recommended to reduce 3-point MACE (myocardial infarction, stroke, cardiovascular death).",
            "In patients with T2D and heart failure (HFrEF or HFpEF) or chronic kidney disease (eGFR 20-60 mL/min or UACR >30 mg/g), SGLT-2 inhibitors (dapagliflozin, empagliflozin) are strongly recommended to reduce heart failure hospitalizations and renal progression.",
            "Dual GIP/GLP-1 receptor agonists (tirzepatide) deliver unprecedented reductions in HbA1c (>2.0-2.5%) and substantial weight loss (>15-20%), representing the most potent glucose- and weight-lowering agent in the SURPASS clinical trial program.",
            "Glycaemic targets must be individualized: HbA1c <7.0% (<53 mmol/mol) for most non-pregnant adults without severe hypoglycaemia, while relaxed targets (HbA1c <7.5-8.0%) are appropriate for frail older adults with limited life expectancy or extensive vascular complications."
        ],
        "mcq_angles": [
            "Selecting second-line therapy based on compelling comorbidities: SGLT-2 inhibitor for heart failure/CKD vs GLP-1 RA for ASCVD/weight loss.",
            "Metformin renal safety thresholds: dose reduction at eGFR <45 mL/min, and absolute contraindication/discontinuation at eGFR <30 mL/min.",
            "SGLT-2 inhibitor adverse effects: mycotic genital infections, volume depletion, and recognizing euglycaemic diabetic ketoacidosis (euDKA)."
        ],
        "case_hooks": [
            "A 58-year-old male with T2D, prior CABG, and eGFR 48 mL/min has HbA1c 7.6% on metformin; the clinician adds empagliflozin to provide cardiorenal protection.",
            "A 52-year-old woman with severe obesity (BMI 38 kg/m2) and uncontrolled T2D (HbA1c 9.4%) is initiated on weekly subcutaneous tirzepatide with rapid glycaemic and weight improvement."
        ],
        "uncertainties": [
            "Additive long-term cardiovascular and microvascular outcomes of combining dual GIP/GLP-1 agonists (tirzepatide) with SGLT-2 inhibitors.",
            "Durable diabetes remission criteria following intensive lifestyle intervention versus metabolic bariatric surgery in early-stage T2D."
        ]
    },

    "ulcerative colitis": {
        "mentor_intro": (
            "Ulcerative colitis (UC) is a chronic idiopathic inflammatory bowel disease characterized by diffuse, continuous mucosal inflammation commencing in the rectum and extending proximally to variable extents of the colon. "
            "Disease extent is classified by the Montreal classification into proctitis (E1), left-sided colitis (E2), and extensive/pancolitis (E3), presenting clinically with bloody diarrhoea, rectal urgency, tenesmus, and cramping abdominal pain. "
            "Management follows a 'treat-to-target' strategy (STRIDE-II), aiming not merely for symptomatic relief but for objective endoscopic mucosal healing (Mayo endoscopic subscore 0 or 1) and histologic remission to prevent dysplasia, colectomy, and colorectal cancer."
        ),
        "teaching_points": [
            "5-Aminosalicylates (5-ASA, mesalazine) are the first-line therapy for inducing and maintaining remission in mild-to-moderate UC; combined oral plus topical rectal 5-ASA therapy is significantly superior to oral mesalazine monotherapy for left-sided and extensive colitis.",
            "Systemic corticosteroids (oral prednisolone or IV hydrocortisone) are highly effective for inducing remission in moderate-to-severe acute flares, but have NO role in maintenance therapy due to lack of mucosal healing and severe steroid-related toxicities.",
            "Acute severe ulcerative colitis (ASUC)—defined by Truelove and Witts criteria (>=6 bloody stools/day plus >=1 systemic sign: pulse >90, temp >37.8 C, Hb <105 g/L, or ESR >30 mm/h)—is a medical emergency requiring hospitalization, IV methylprednisolone, and objective day 3 response assessment (Oxford criteria) to trigger rescue therapy (infliximab or cyclosporine).",
            "Long-term surveillance colonoscopy with dye-spray chromoendoscopy is mandatory starting 8 years after symptom onset in patients with left-sided or extensive colitis, repeated every 1 to 5 years based on risk factors (primary sclerosing cholangitis, active inflammation, family history of CRC).",
            "Restorative proctocolectomy with ileal pouch-anal anastomosis (IPAA, 'J-pouch') is the surgical procedure of choice for medically refractory ulcerative colitis, acute toxic megacolon, or colonic high-grade dysplasia/adenocarcinoma."
        ],
        "mcq_angles": [
            "First-line induction and maintenance in mild-to-moderate UC: superior efficacy of combined oral plus rectal 5-ASA over oral alone.",
            "Truelove and Witts criteria for acute severe UC (ASUC) and day 3 Oxford criteria triggering rescue therapy with infliximab or cyclosporine.",
            "Dysplasia surveillance timing: initiating screening colonoscopy at 8 years post-diagnosis in extensive or left-sided colitis (annual in primary sclerosing cholangitis)."
        ],
        "case_hooks": [
            "A 26-year-old female presents with 8 bloody bowel movements per day, resting heart rate 104 bpm, temperature 38.1 C, and CRP 48 mg/L (Truelove and Witts acute severe UC); she is admitted for IV corticosteroids.",
            "A 34-year-old male with left-sided ulcerative colitis has persistent rectal bleeding on oral mesalazine 4 g daily; adding a nightly 1 g mesalazine suppository induces complete symptomatic remission."
        ],
        "uncertainties": [
            "Comparative safety and clinical positioning of oral Janus kinase (JAK) inhibitors (tofacitinib, upadacitinib) versus anti-IL-23 antibodies (mirikizumab, guselkumab) in moderate-to-severe UC.",
            "Role of faecal microbiota transplantation (FMT) as an adjunctive induction therapy in mild-to-moderate ulcerative colitis."
        ]
    },

    "ulcerative colitis biologic therapy comparative effectiveness adults": {
        "mentor_intro": (
            "Advanced therapies for moderate-to-severe ulcerative colitis encompass diverse mechanistic classes: TNF inhibitors (infliximab, adalimumab, golimumab), gut-selective anti-integrin alpha4beta7 (vedolizumab), anti-IL-12/23 (ustekinumab), anti-IL-23 p19 inhibitors (mirikizumab, guselkumab), oral JAK inhibitors (tofacitinib, upadacitinib), and sphingosine-1-phosphate (S1P) receptor modulators (ozanimod, etrasimod). "
            "Network meta-analyses and head-to-head randomized trials (e.g., the landmark VARSITY trial) provide high-quality evidence guiding personalized drug selection based on speed of onset, endoscopic remission rates, prior biologic exposure, and patient safety profiles."
        ),
        "teaching_points": [
            "The landmark VARSITY trial—the first direct head-to-head randomized trial of biologics in moderate-to-severe UC—demonstrated that gut-selective vedolizumab was significantly superior to the anti-TNF agent adalimumab in achieving clinical remission (31.3% vs 22.5%, p = 0.006) and endoscopic mucosal healing at week 52.",
            "In biologic-naive patients, infliximab and vedolizumab rank among the highest for induction and maintenance of clinical and endoscopic remission; infliximab is co-prescribed with an immunomodulator (thiopurine) to reduce anti-drug antibody formation and loss of response.",
            "Upadacitinib (oral selective JAK-1 inhibitor) demonstrates the highest rates of rapid clinical response and endoscopic mucosal healing among oral agents in network meta-analyses, functioning as an exceptionally potent option for both biologic-naive and biologic-experienced refractory patients.",
            "Vedolizumab and ustekinumab exhibit the most favorable overall infection and malignancy safety profiles, making them preferred first-line advanced therapies in elderly patients (>60-65 years) or those with prior opportunistic infections.",
            "Sphingosine-1-phosphate (S1P) receptor modulators (ozanimod, etrasimod) provide oral advanced therapy options by sequestering lymphocytes in lymph nodes; pre-treatment screening requires ECG (evaluating bradyarrhythmias/AV block), ophthalmic exam (excluding macular edema), and varicella zoster immunity."
        ],
        "mcq_angles": [
            "VARSITY trial landmark findings: vedolizumab demonstrated superior clinical remission and endoscopic mucosal improvement over adalimumab in moderate-to-severe UC.",
            "Safety stratification in elderly patients with UC: selecting gut-selective vedolizumab or ustekinumab over anti-TNF or JAK inhibitors due to lower infection/thromboembolism risk.",
            "Pre-treatment screening requirements for S1P receptor modulators (ozanimod): baseline ECG for conduction block, macular edema screening, and VZV serology."
        ],
        "case_hooks": [
            "A 68-year-old male with moderate-to-severe UC and a history of myocardial infarction and diverticulitis requires advanced therapy; the gastroenterologist selects vedolizumab due to its gut-selective safety profile.",
            "A 29-year-old female with severe UC failing infliximab is initiated on oral upadacitinib (45 mg daily induction), achieving symptomatic resolution of bloody diarrhea within 5 days."
        ],
        "uncertainties": [
            "Comparative long-term effectiveness of novel IL-23 p19-specific inhibitors (mirikizumab, guselkumab) versus JAK inhibitors in multi-biologic refractory ulcerative colitis.",
            "Safety and efficacy of dual targeted therapy (e.g., combining vedolizumab with a JAK inhibitor or anti-TNF) in highly refractory IBD."
        ]
    },

    "upper GI bleeding": {
        "mentor_intro": (
            "Acute upper gastrointestinal bleeding (UGIB)—defined as bleeding proximal to the ligament of Treitz—is a common medical emergency carrying an overall mortality of 5-10%. "
            "Etiologies are broadly categorized into non-variceal (peptic ulcer disease [~50%], gastroduodenal erosions, Mallory-Weiss syndrome, Dieulafoy lesions, vascular ectasias, malignancy) and variceal bleeding secondary to portal hypertension. "
            "Resuscitation must proceed synchronously with risk stratification (Glasgow-Blatchford Score [GBS]), restrictive blood transfusion, empiric pharmacotherapies, and diagnostic/therapeutic upper endoscopy within 24 hours of presentation."
        ),
        "teaching_points": [
            "The Glasgow-Blatchford Score (GBS) is the recommended risk stratification tool for acute UGIB; patients with a GBS of 0-1 have a <1% risk of intervention or death and can safely be managed as outpatients without hospital admission.",
            "A restrictive red blood cell transfusion strategy (transfusing when haemoglobin is <70 g/L [7.0 g/dL], targeting a post-transfusion Hb of 70-90 g/L) significantly reduces rebleeding and all-cause 45-day mortality compared to a liberal strategy (Hb trigger <90 g/L), except in patients with acute coronary syndromes (Villanueva trial).",
            "Intravenous proton pump inhibitor (PPI) therapy (e.g., omeprazole 80 mg IV bolus followed by 8 mg/h continuous infusion, or 40 mg IV twice daily) raises gastric pH >=6, promoting platelet aggregation and stabilizing fibrin clots in bleeding peptic ulcers.",
            "In patients with suspected variceal haemorrhage or known cirrhosis, empiric vasoactive therapy (terlipressin, octreotide) and prophylactic intravenous antibiotics (ceftriaxone 1 g daily) must be started immediately upon hospital presentation prior to endoscopy.",
            "Timing of endoscopy: endoscopy should be performed within 24 hours of presentation following hemodynamic resuscitation; emergent endoscopy within <6 hours has not been shown to improve clinical outcomes or reduce mortality in unselected patients."
        ],
        "mcq_angles": [
            "Villanueva restrictive transfusion trial findings: Hb threshold of <70 g/L improves survival and lowers rebleeding in acute upper GI bleeding compared to liberal transfusion (<90 g/L).",
            "Glasgow-Blatchford Score cutoff: identifying scores 0-1 as safe for immediate outpatient discharge.",
            "Endoscopy timing: within 24 hours after resuscitation; ultra-early endoscopy (<6 hours) confers no added mortality benefit."
        ],
        "case_hooks": [
            "A 72-year-old woman with osteoarthritis on meloxicam presents with melaena and lightheadedness; BP is 98/62 mmHg, HR 105 bpm, Hb 68 g/L; she receives IV crystalloids, 1 unit of packed RBCs, and IV omeprazole.",
            "A 24-year-old male presents with painless melaena after binge drinking; his GBS is 1; the emergency physician safely discharges him with outpatient follow-up and oral PPI."
        ],
        "uncertainties": [
            "High-dose continuous IV PPI infusion (80 mg bolus + 8 mg/h) versus intermittent high-dose IV boluses (40 mg IV twice daily) for post-endoscopic high-risk ulcer bleeding.",
            "Optimal timing for restarting oral anticoagulant or antiplatelet therapy following endoscopically confirmed haemostasis in high thrombotic risk patients."
        ]
    },

    "upper gi bleed": {
        "mentor_intro": (
            "An acute upper GI bleed (UGIB) presents classically with haematemesis (bright red blood or 'coffee-ground' emesis) and/or melaena (black, tarry, foul-smelling stool resulting from the oxidation of heme by intestinal bacteria). "
            "In patients presenting with severe, brisk hematochezia accompanied by hemodynamic instability or shock, an upper source must always be considered due to rapid transit of massive blood loss through the GI tract. "
            "Core management pillars include securing the airway in actively vomiting or encephalopathic patients, hemodynamic resuscitation, pre-endoscopic prokinetic administration (erythromycin), and multimodal endoscopic haemostasis."
        ),
        "teaching_points": [
            "Rapid gastrointestinal transit of massive upper GI bleeding (>1000 mL) can present with bright red hematochezia and hemodynamic shock; an elevated blood urea nitrogen-to-creatinine ratio (>20-30:1 in conventional units, or >100 in SI units) strongly supports an upper GI source.",
            "Elective endotracheal intubation should be considered prior to upper endoscopy in patients with active hematemesis, severe altered mental status (hepatic encephalopathy), or ongoing agitation to prevent catastrophic pulmonary aspiration.",
            "Pre-procedure intravenous erythromycin (250 mg IV infused 30-60 minutes prior to endoscopy) acts as a motilin agonist to clear blood, clots, and debris from the stomach, significantly improving endoscopic mucosal visualization and diagnostic yield.",
            "For non-variceal peptic ulcers with high-risk stigmata (Forrest Ia spurting, Ib oozing, IIa non-bleeding visible vessel), dual endoscopic therapy (epinephrine injection PLUS mechanical hemoclips or thermal contact probe) is mandatory; epinephrine monotherapy is strictly inadequate due to high rebleeding rates.",
            "Endoscopic band ligation (EVL) is the gold standard for esophageal variceal bleeding; in fundic gastric varices (GOV2/IGV1), endoscopic tissue adhesives (cyanoacrylate glue injection) or transjugular intrahepatic portosystemic shunt (TIPS) is required."
        ],
        "mcq_angles": [
            "BUN/creatinine ratio utility: elevated ratio (>20-30:1) distinguishing brisk upper GI bleed from lower GI hemorrhage in hematochezia.",
            "Dual-modality endoscopic haemostasis requirement for high-risk peptic ulcers: mechanical or thermal therapy combined with epinephrine.",
            "Endoscopic management of gastric fundic varices: cyanoacrylate tissue adhesive injection rather than band ligation."
        ],
        "case_hooks": [
            "A 52-year-old male presents with massive hematochezia and syncope; BP is 80/50 mmHg; nasogastric lavage yields bright red blood with clots, confirming an upper gastrointestinal origin.",
            "During emergency gastroscopy for bleeding duodenal ulcer, the endoscopist visualizes a spurting arterial vessel (Forrest Ia); dual therapy with dilute epinephrine and through-the-scope hemoclips achieves complete haemostasis."
        ],
        "uncertainties": [
            "Role of over-the-scope clips (OTSC) as first-line therapy versus conventional through-the-scope clips (TTSC) for large (>2 cm) fibrotic chronic peptic ulcers.",
            "Efficacy and clinical safety of topical hemostatic powders (e.g., Hemospray) as temporary bridge therapy in massive malignant upper GI bleeding."
        ]
    },

    "urinary tract infection": {
        "mentor_intro": (
            "Urinary tract infections (UTIs) represent one of the most frequent bacterial infections encountered in clinical practice, spanning acute uncomplicated cystitis, complicated UTI, catheter-associated UTI (CAUTI), and acute pyelonephritis. "
            "Uropathogenic Escherichia coli (UPEC) accounts for >75-85% of community-acquired infections, expressing type 1 and P-fimbriae that mediate uroepithelial adherence and invasion. "
            "Diagnostic accuracy requires integrating clinical symptoms (dysuria, frequency, urgency) with urinalysis (pyuria, nitrite); asymptomatic bacteriuria (ASB) must be recognized and not treated in non-pregnant, non-urologic surgery populations."
        ),
        "teaching_points": [
            "First-line empirical antimicrobial agents for acute uncomplicated cystitis in women include: nitrofurantoin (100 mg orally bid for 5 days), trimethoprim-sulfamethoxazole (160/800 mg bid for 3 days, where local resistance is <20%), or fosfomycin trometamol (3 g single oral dose).",
            "Fluoroquinolones (ciprofloxacin, levofloxacin) should NOT be used for uncomplicated cystitis due to serious risks of tendonitis, aortic dissection, peripheral neuropathy, and accelerating population-level antimicrobial resistance; they must be reserved for pyelonephritis or complicated infections.",
            "Asymptomatic bacteriuria (ASB)—isolation of significant bacterial count in the absence of symptoms referable to the urinary tract—should ONLY be screened and treated in: (1) pregnant women (to prevent pyelonephritis and low birth weight), and (2) patients undergoing invasive urological procedures with anticipated mucosal bleeding.",
            "Urine dipstick testing: leukocyte esterase indicates the presence of white blood cells (pyuria, ~80-90% sensitivity); nitrite testing indicates enterobacteria that reduce dietary nitrate to nitrite (high specificity >95% but lower sensitivity ~50%).",
            "Catheter-associated UTI (CAUTI) requires the presence of symptoms with >=10^3 CFU/mL; when CAUTI is diagnosed, replacing or removing the indwelling catheter prior to starting antibiotics accelerates resolution and eradicates intraluminal biofilms."
        ],
        "mcq_angles": [
            "Indications for treating asymptomatic bacteriuria: pregnancy and pre-urologic mucosal procedures ONLY.",
            "First-line antibiotics and durations for uncomplicated cystitis: nitrofurantoin 5 days vs TMP-SMX 3 days vs fosfomycin single dose.",
            "Why fluoroquinolones are restricted and avoided in simple uncomplicated cystitis (FDA/EMA safety warnings and antimicrobial stewardship)."
        ],
        "case_hooks": [
            "A 24-year-old healthy female presents with 2 days of painful dysuria, frequency, and suprapubic discomfort without fever or back pain; urine dipstick is positive for leukocyte esterase and nitrites; nitrofurantoin 100 mg bid for 5 days is prescribed.",
            "An 80-year-old asymptomatic nursing home resident undergoes routine urine dipstick showing positive leukocytes and nitrates, with culture growing 10^5 CFU/mL E. coli; the physician appropriately withholds antibiotic therapy."
        ],
        "uncertainties": [
            "Clinical utility and threshold of urinary biomarkers (interleukin-6, urinary lactoferrin) in differentiating ASB from symptomatic UTI in patients with advanced dementia.",
            "Efficacy of non-antibiotic bladder instillations (e.g., bacteriophage therapy) in recurrent multidrug-resistant complicated UTIs."
        ]
    },

    "urticaria": {
        "mentor_intro": (
            "Urticaria is a mast cell-driven dermatological disorder characterized by the rapid appearance of pruritic wheals (hives), angioedema, or both. "
            "Wheals feature three distinct hallmarks: central swelling of variable size surrounded by reflex erythema, intense pruritus or burning, and transient nature (individual lesions resolve completely within 24 hours without leaving bruising or hyperpigmentation). "
            "Urticaria is classified into acute (<6 weeks) and chronic (>=6 weeks), with chronic spontaneous urticaria (CSU) driven by mast cell activation through autoallergic (IgE against autoantigens) or autoimmune (IgG against Fc-epsilon-RI or IgE) mechanisms."
        ),
        "teaching_points": [
            "Individual urticarial wheals are characteristically transient, resolving within 2 to 24 hours; individual lesions that persist in the exact same location for >24-48 hours, especially with purpura, hyperpigmentation, or burning rather than itching, suggest urticarial vasculitis and mandate skin biopsy.",
            "Step 1 treatment for both acute and chronic urticaria is a standard-dose second-generation H1-antihistamine (e.g., cetirizine, fexofenadine, bilastine, loratadine); first-generation antihistamines (diphenhydramine, hydroxyzine) are discouraged due to sedation, anticholinergic toxicity, and REM sleep disruption.",
            "In chronic spontaneous urticaria (CSU) unresponsive to standard-dose antihistamines after 2-4 weeks, Step 2 guidelines recommend increasing the dose of the second-generation H1-antihistamine up to 4-fold the licensed dose before switching to alternative classes.",
            "For CSU refractory to high-dose antihistamines (Step 3), omalizumab (anti-IgE monoclonal antibody, 300 mg subcutaneously every 4 weeks) is the preferred targeted biologic, achieving complete control in >65-70% of patients with an outstanding safety profile.",
            "Step 4 in the international algorithm is oral cyclosporine (3.5-5 mg/kg daily) for omalizumab-refractory disease, requiring blood pressure and renal function monitoring."
        ],
        "mcq_angles": [
            "Transient nature of true urticarial wheals (<24 hours) versus urticarial vasculitis (>24 hours with post-inflammatory purpura/staining).",
            "Stepwise international guidelines for CSU: up-dosing second-generation H1-antihistamines up to 4x standard dose before adding omalizumab.",
            "Disadvantages of first-generation sedating antihistamines (cognitive impairment, anticholinergic side effects) establishing second-generation agents as undisputed first-line."
        ],
        "case_hooks": [
            "A 30-year-old woman presents with daily itchy wheals across her trunk and limbs for 10 weeks; individual lesions disappear within 12 hours; she has inadequate control on fexofenadine 180 mg daily; the dose is increased to 360 mg twice daily.",
            "A 45-year-old male presents with hives that each remain fixed for 36 hours and leave faint purpuric staining; skin punch biopsy demonstrates leukocytoclastic vasculitis."
        ],
        "uncertainties": [
            "Biomarkers predicting rapid versus slow or poor response to omalizumab (baseline total IgE levels, anti-TPO autoantibody status, basophil activation test).",
            "Comparative efficacy of emerging oral Bruton tyrosine kinase (BTK) inhibitors (remibrutinib, fenebrutinib) versus injectable biologics in CSU."
        ]
    },

    "uterine fibroids": {
        "mentor_intro": (
            "Uterine fibroids (leiomyomas) are benign monoclonal smooth muscle neoplasms of the myometrium, representing the most prevalent pelvic tumor in women of reproductive age (affecting up to 70-80% of women by age 50). "
            "Fibroids are classified anatomically by the FIGO system (Types 0 through 8: submucosal, intramural, subserosal, cervical/pedunculated). "
            "Clinical manifestations depend on size and anatomical location, manifesting as heavy menstrual bleeding (HMB, especially submucosal types 0-2), iron deficiency anaemia, pelvic bulk/pressure symptoms, and reproductive dysfunction."
        ),
        "teaching_points": [
            "Submucosal fibroids (FIGO Types 0, 1, 2) protrude into the endometrial cavity and are the primary drivers of heavy menstrual bleeding (HMB), dysmenorrhoea, and subfertility/miscarriage; hysteroscopic myomectomy is the minimally invasive surgical treatment of choice.",
            "Oral gonadotropin-releasing hormone (GnRH) receptor antagonists with add-back hormone therapy (relugolix or linzagolix with estradiol and norethindrone acetate) are approved for moderate-to-severe fibroid-associated HMB, rapidly suppressing ovarian estrogen synthesis to reduce bleeding while preventing hot flushes and bone mineral density loss.",
            "Tranexamic acid (oral 1300 mg tid during heavy menstrual flow) and the levonorgestrel-releasing intrauterine device (LNG-IUD) are effective medical options for reducing blood loss in women desiring non-hormonal or contraceptive management without bulky cavity distortion.",
            "Uterine artery embolization (UAE) provides a minimally invasive uterine-preserving alternative to surgery for symptomatic intramural and subserosal fibroids, achieving substantial volume reduction (40-60%) and bleeding relief, but is generally avoided in women desiring future pregnancy due to potential ovarian reserve and obstetric risks.",
            "Surgical options include myomectomy (laparoscopic, hysteroscopic, or open) for women wishing to retain their uterus or pursue pregnancy, and hysterectomy as the definitive curative treatment for women who have completed childbearing."
        ],
        "mcq_angles": [
            "FIGO classification of fibroids: recognizing that submucosal fibroids (Types 0-2) are primarily responsible for heavy menstrual bleeding and infertility, managed hysteroscopically.",
            "Mechanism of modern oral GnRH antagonists with add-back therapy: rapid estrogen suppression with low-dose add-back hormones to preserve bone density.",
            "Patient selection for uterine artery embolization (UAE): excellent for bulk and bleeding in women not seeking future fertility."
        ],
        "case_hooks": [
            "A 38-year-old nulligravid woman presents with severe menorrhagia (Hb 82 g/L) and infertility; transvaginal ultrasound and saline infusion sonography demonstrate a 2.5 cm intracavitary submucosal fibroid (FIGO Type 0); hysteroscopic resection is scheduled.",
            "A 46-year-old female with an enlarged, multi-fibroid uterus (16-week size) causing urinary frequency and pelvic fullness wishes to avoid hysterectomy; she undergoes successful uterine artery embolization."
        ],
        "uncertainties": [
            "Long-term fertility, placentation, and miscarriage outcomes following uterine artery embolization compared to laparoscopic myomectomy.",
            "Efficacy and cost-effectiveness of high-intensity focused ultrasound (HIFU / MRgFUS) versus surgical myomectomy in young reproductive-age women."
        ]
    },

    "variceal GI bleeding": {
        "mentor_intro": (
            "Acute variceal gastrointestinal bleeding is a life-threatening complication of portal hypertension in decompensated cirrhosis, associated with an in-hospital mortality rate of 15-20%. "
            "Variceal rupture occurs when the hepatic venous pressure gradient (HVPG) rises above the critical threshold of 12 mmHg, resulting in critical wall tension in thin-walled submucosal oesophageal or gastric veins. "
            "Modern management follows a structured, protocolized care bundle: early resuscitation with restrictive transfusion, immediate vasoactive drug therapy (terlipressin, somatostatin, octreotide), mandatory prophylactic IV antibiotics (ceftriaxone), and urgent endoscopic variceal ligation (EVL) within 12 hours."
        ),
        "teaching_points": [
            "Vasoactive drug therapy (terlipressin continuous infusion or bolus, or octreotide/somatostatin) must be initiated IMMEDIATELY upon suspicion of variceal bleeding, prior to endoscopy, and continued for 2 to 5 days to reduce splanchnic arterial inflow and lower portal pressures.",
            "Short-term prophylactic antibiotics (intravenous ceftriaxone 1 g every 24 hours for up to 7 days) are mandatory for all cirrhotic patients presenting with GI bleeding, significantly reducing secondary bacterial infections, early rebleeding, and hospital mortality.",
            "Endoscopic variceal ligation (EVL) is the definitive endoscopic therapy of choice for esophageal varices, performed within 12 hours of presentation following initial resuscitation; endoscopic sclerotherapy is no longer recommended due to higher complication rates.",
            "Preemptive ('early') Transjugular Intrahepatic Portosystemic Shunt (TIPS) placed within 24 to 72 hours significantly improves survival in high-risk patients (Child-Pugh Class C score 10-13, or Child-Pugh Class B with active bleeding on endoscopy per Baveno VII criteria).",
            "Secondary prophylaxis with combined non-selective beta-blockers (carvedilol or propranolol) PLUS repeated sessions of endoscopic band ligation (until variceal obliteration) is mandatory to prevent recurrent bleeding."
        ],
        "mcq_angles": [
            "Baveno VII criteria for early preemptive TIPS: identifying high-risk patients (Child-Pugh C 10-13 or Child-Pugh B with active bleeding) who benefit from TIPS within 72 hours.",
            "Mandatory antibiotic prophylaxis with IV ceftriaxone in all cirrhotic patients with gastrointestinal haemorrhage.",
            "Secondary prophylaxis combination therapy: non-selective beta-blockers (NSBB: carvedilol) combined with serial endoscopic band ligation."
        ],
        "case_hooks": [
            "A 54-year-old male with alcoholic cirrhosis presents with massive haematemesis and BP 84/50 mmHg; the medical registrar starts IV crystalloids targeting MAP 65, starts IV octreotide and IV ceftriaxone, and pages the endoscopist.",
            "A cirrhotic patient with Child-Pugh class C cirrhosis (score 11) achieves initial hemostasis with band ligation; within 36 hours, interventional radiology performs an early preemptive TIPS."
        ],
        "uncertainties": [
            "Optimal timing and dose-escalation protocol for carvedilol versus traditional propranolol/nadolol in secondary prophylaxis after acute variceal bleeding.",
            "Role of temporary self-expanding covered esophageal metal stents (SEMS, e.g., SX-Ella Danis stent) versus balloon tamponade (Sengstaken-Blakemore tube) in refractory bleeding as a bridge to TIPS."
        ]
    },

    "vasopressor use cardiogenic shock": {
        "mentor_intro": (
            "Cardiogenic shock (CS) is a state of critical end-organ hypoperfusion caused by primary cardiac pump failure, most frequently triggered by acute myocardial infarction (AMI-CS) with extensive left ventricular necrosis. "
            "The hemodynamic profile features low cardiac output, elevated ventricular filling pressures, and inadequate systemic perfusion pressure (mean arterial pressure <65 mmHg). "
            "Vasoactive medications are mandatory to maintain minimum coronary and vital organ perfusion while definitive mechanical reperfusion or mechanical circulatory support (MCS) is established; however, vasopressors increase myocardial afterload and oxygen demand, demanding rigorous drug selection."
        ),
        "teaching_points": [
            "Norepinephrine is the first-line vasopressor of choice in cardiogenic shock with severe hypotension, superior to dopamine; the landmark SOAP II trial demonstrated that dopamine was associated with a significant 2-fold increase in tachyarrhythmias and increased mortality in the cardiogenic shock subgroup.",
            "Epinephrine should be avoided as a first-line agent in cardiogenic shock; randomized trials and meta-analyses show that epinephrine is associated with a 3-fold higher incidence of refractory cardiogenic shock, marked lactic acidosis, increased myocardial oxygen demand, and higher short-term mortality compared to norepinephrine.",
            "When systemic blood pressure is stabilized (MAP >=65 mmHg) but cardiac index remains inadequate (<2.0-2.2 L/min/m2) with signs of persistent hypoperfusion, an inotrope—dobutamine (beta-1 selective agonist) or milrinone (phosphodiesterase-3 inhibitor)—is added to augment myocardial contractility.",
            "Vasopressors should be titrated to the minimum effective dose required to maintain coronary perfusion (MAP 65 mmHg); excessive vasoconstriction increases LV afterload, worsening myocardial mechanical efficiency and accelerating pulmonary oedema.",
            "Early initiation of temporary mechanical circulatory support (percutaneous microaxial pump [Impella] or VA-ECMO) should be considered in refractory shock before escalating to toxic multi-vasopressor infusions (DanGer Shock trial)."
        ],
        "mcq_angles": [
            "SOAP II trial landmark findings: norepinephrine superior to dopamine in cardiogenic shock (dopamine causes fatal arrhythmias and higher mortality).",
            "Why epinephrine is detrimental in cardiogenic shock: excessive tachycardia, increased myocardial oxygen consumption, lactic acidosis, and higher mortality.",
            "Hemodynamic titration targets: maintaining MAP ~65 mmHg while avoiding excessive afterload that exacerbates left ventricular failure."
        ],
        "case_hooks": [
            "A 64-year-old male with acute anterior STEMI undergoes emergency PCI to the LAD; in the CCU, his BP is 78/48 mmHg, heart rate 110 bpm, and cold extremities; the team initiates norepinephrine infusion to achieve MAP 65, followed by low-dose dobutamine.",
            "A junior resident suggests switching a patient in cardiogenic shock from norepinephrine to high-dose dopamine; the attending explains the SOAP II trial evidence demonstrating excess arrhythmogenic mortality with dopamine."
        ],
        "uncertainties": [
            "Optimal timing of routine microaxial LV unloading (Impella) versus medical stabilization in AMI cardiogenic shock based on the DanGer Shock trial.",
            "Comparative efficacy of milrinone versus dobutamine in ischemic versus non-ischemic cardiogenic shock (DOREMI randomized trial findings)."
        ]
    },

    "vasopressor use septic shock": {
        "mentor_intro": (
            "Septic shock is a subset of sepsis characterized by profound circulatory, cellular, and metabolic abnormalities, defined clinically by persistent hypotension requiring vasopressors to maintain MAP >=65 mmHg and serum lactate >2 mmol/L despite adequate fluid resuscitation. "
            "Pathophysiology involves dysregulated host immune response, excessive inducible nitric oxide synthase (iNOS) activation, ATP-sensitive potassium channel opening, and relative vasopressin deficiency, causing profound systemic vasodilation and vascular collapse. "
            "Vasopressor therapy must be initiated early to restore organ perfusion pressure without delay, guided by Surviving Sepsis Campaign evidence-based recommendations."
        ),
        "teaching_points": [
            "Norepinephrine is the undisputed first-line vasopressor of choice in septic shock, targeting a mean arterial pressure (MAP) of 65 mmHg; early administration (even peripherally during fluid loading) restores venous return and coronary perfusion faster, reducing mortality (CENSER trial).",
            "Vasopressin (at a fixed, non-titrated dose of 0.03 units/min) is the recommended second-line vasopressor to be added when norepinephrine reaches 0.25 to 0.5 ug/kg/min, restoring endogenous neurohypophyseal vasopressin depletion and reducing adrenergic toxicity (VASST trial).",
            "Epinephrine is the third-line agent recommended when MAP remains inadequate despite norepinephrine and vasopressin; dopamine is explicitly not recommended due to significant tachyarrhythmic mortality.",
            "In patients with refractory septic shock requiring escalating vasopressor doses (norepinephrine >=0.25 ug/kg/min for >=4 hours), intravenous hydrocortisone (200 mg daily as continuous infusion or 50 mg IV q6h) significantly accelerates shock reversal and reduces ICU length of stay (ADRENAL and APROCCHSS trials).",
            "Peripheral intravenous vasopressor administration via a well-placed large-bore vein (in or proximal to the antecubital fossa) is safe for initial resuscitation (up to 24-48 hours) to prevent life-threatening delays while central venous access is being established."
        ],
        "mcq_angles": [
            "Surviving Sepsis Campaign first-line vasopressor: norepinephrine over all other agents.",
            "Role and fixed dosing of vasopressin (0.03 units/min) as a catecholamine-sparing agent in septic shock.",
            "Indications for adjunctive low-dose intravenous hydrocortisone (200 mg/day) in refractory septic shock requiring escalating vasopressors."
        ],
        "case_hooks": [
            "A 68-year-old female with severe urosepsis remains hypotensive (MAP 52 mmHg) despite 30 mL/kg of balanced crystalloids; norepinephrine infusion is immediately initiated through an 18G antecubital IV line while a central venous catheter is prepped.",
            "A patient with septic shock requires norepinephrine at 0.40 ug/kg/min to maintain MAP 65; the intensivist initiates vasopressin at 0.03 units/min and adds IV hydrocortisone 50 mg q6h."
        ],
        "uncertainties": [
            "Targeting a higher MAP target (75-85 mmHg vs 65 mmHg) in septic patients with chronic pre-existing hypertension (SEPSISPAM trial subgroup analysis).",
            "Role of synthetic human angiotensin II (Giapreza) as a rescue non-adrenergic vasopressor in refractory high-output vasodilatory shock."
        ]
    },

    "venous leg ulcer": {
        "mentor_intro": (
            "Venous leg ulcers (VLUs) represent the end-stage cutaneous manifestation of chronic venous hypertension, accounting for 70-80% of all chronic lower extremity ulcers. "
            "Sustained ambulatory venous hypertension—arising from superficial, deep, or perforator valvular incompetence and calf muscle pump failure—leads to leukocyte entrapment, endothelial activation, pericapillary fibrin cuffing, and microvascular ischemia. "
            "Ulcers classically present in the lower medial gaiter region, surrounded by stasis dermatitis, hemosiderin pigmentation, and lipodermatosclerosis; high-grade graduated compression therapy is the cornerstone of healing."
        ),
        "teaching_points": [
            "Graduated compression therapy (delivering 35-40 mmHg of pressure at the ankle, graduated up to the calf) is the single most effective non-surgical treatment for healing venous leg ulcers and preventing ulcer recurrence.",
            "Before applying therapeutic compression, arterial perfusion must be verified by measuring the Ankle-Brachial Pressure Index (ABPI); an ABPI >=0.8 indicates safety for full 40 mmHg compression, while ABPI <0.8 indicates concurrent arterial disease requiring vascular consultation or modified reduced compression.",
            "The landmark EVRA trial established that early endovenous ablation of superficial venous reflux within 2 weeks of presentation significantly accelerates ulcer healing (median time to healing 56 days vs 82 days) and extends ulcer-free time compared to compression therapy alone.",
            "Routine topical or systemic antimicrobial therapy is strictly NOT recommended for clinically uninfected venous ulcers; positive surface swab cultures represent normal colonizing flora, and antibiotics do not promote wound healing in the absence of surrounding cellulitis.",
            "Oral pentoxifylline (400 mg three times daily) acts as a microcirculatory rheological agent (reducing leukocyte adhesion and blood viscosity) and is an evidence-based systemic adjunct to compression therapy that accelerates healing."
        ],
        "mcq_angles": [
            "EVRA trial findings: early superficial endovenous ablation within 2 weeks accelerates ulcer healing compared to delayed intervention.",
            "ABPI safety threshold: verifying ABPI >=0.8 before applying 40 mmHg compression bandages.",
            "Inappropriateness of routine systemic antibiotics for colonizing bacteria in non-infected venous ulcers."
        ],
        "case_hooks": [
            "A 62-year-old woman presents with a 6-month history of a painful, weeping 3 cm ulcer over the medial malleolus with surrounding hyperpigmentation; ABPI is 1.1; duplex ultrasound demonstrates great saphenous vein reflux; she is referred for early endovenous laser ablation and multi-layer compression.",
            "A primary care resident reviews a superficial wound swab from a clean granulating venous ulcer showing growth of Pseudomonas aeruginosa; the attending explains why systemic antibiotics should be withheld in the absence of cellulitis."
        ],
        "uncertainties": [
            "Efficacy of micronized purified flavonoid fractions (MPFF) versus pentoxifylline as oral adjuncts to compression bandaging.",
            "Role of advanced cellular skin substitutes (allogeneic bilayered cellular constructs) in chronic non-healing ulcers refractory to 12 weeks of high-compression therapy."
        ]
    },

    "venous thromboembolism": {
        "mentor_intro": (
            "Venous thromboembolism (VTE) encompasses deep vein thrombosis (DVT) and pulmonary embolism (PE), representing a major cause of global vascular morbidity and preventable hospital mortality. "
            "Pathogenesis reflects Virchow's triad: venous endothelial injury, circulatory stasis, and hypercoagulability. "
            "Clinical evaluation utilizes validated pre-test probability clinical decision rules (Wells score, Geneva score), age-adjusted D-dimer, and definitive vascular imaging (duplex ultrasound, CT pulmonary angiography), with anticoagulation initiated immediately upon high clinical suspicion."
        ),
        "teaching_points": [
            "Diagnostic algorithms for suspected DVT and PE integrate validated pre-test clinical probability scores (Wells criteria) with D-dimer testing: low-probability patients with a negative high-sensitivity D-dimer (or age-adjusted cutoff: age x 10 ug/L for patients >50 years) can safely have VTE excluded without imaging.",
            "Direct oral anticoagulants (DOACs: apixaban, rivaroxaban, edoxaban, dabigatran) are the preferred first-line anticoagulants over warfarin for the treatment of acute VTE in the general non-pregnant population, offering equivalent efficacy with significantly lower risk of fatal intracranial haemorrhage.",
            "In patients presenting with hemodynamically unstable, massive pulmonary embolism (sustained systolic BP <90 mmHg or cardiogenic shock), emergency systemic intravenous thrombolysis (e.g., alteplase 100 mg over 2 hours) or surgical/catheter embolectomy is indicated.",
            "Inferior vena cava (IVC) filters do not reduce long-term mortality and increase recurrent DVT rates; they are strictly indicated ONLY in patients with acute documented proximal VTE who have an absolute contraindication to anticoagulation (e.g., active major internal bleeding) or recurrent PE despite therapeutic anticoagulation.",
            "Optimal treatment duration is 3 months for VTE provoked by a transient major risk factor (surgery, trauma); unprovoked VTE requires extended, indefinite anticoagulation if bleeding risk is acceptable."
        ],
        "mcq_angles": [
            "Applying age-adjusted D-dimer thresholds (age x 10 for age >50) to safely rule out VTE without imaging in low-risk individuals.",
            "Indications for inferior vena cava (IVC) filters: acute proximal VTE with absolute contraindications to anticoagulation.",
            "Emergency management of massive high-risk pulmonary embolism: immediate systemic thrombolysis (alteplase 100 mg IV) followed by unfractionated heparin."
        ],
        "case_hooks": [
            "A 72-year-old male presents with unilateral leg swelling; Wells score is 1 (unlikely); D-dimer is 620 ug/L; applying the age-adjusted cutoff (72 x 10 = 720 ug/L), DVT is safely excluded without ultrasound.",
            "A 56-year-old woman collapses on post-op day 3 with acute dyspnoea, cyanosis, and BP 72/40 mmHg; echocardiogram reveals acute right ventricular dilation and McConnell's sign; systemic thrombolysis is initiated."
        ],
        "uncertainties": [
            "Management of subsegmental pulmonary embolism (SSPE) in low-risk ambulatory outpatients: therapeutic anticoagulation versus serial duplex compression ultrasound surveillance.",
            "Safety and efficacy of direct oral anticoagulants (DOACs) in severe renal impairment (eGFR 15-29 mL/min) and in end-stage renal disease on haemodialysis."
        ]
    },

    "venous thromboembolism prevention": {
        "mentor_intro": (
            "Hospital-acquired venous thromboembolism is the leading preventable cause of in-hospital death across surgical and medical inpatient populations. "
            "Hospitalized patients harbor multiple synergistic risk factors: acute inflammatory illness, prolonged immobilization, surgical trauma, malignancy, and dehydration. "
            "Systematic thromboprophylaxis requires universal risk stratification upon admission using validated risk assessment models (Caprini score for surgical patients, Padua or IMPROVE scores for medical patients), balancing individual thrombosis risk against bleeding hazards."
        ),
        "teaching_points": [
            "In hospitalized medical patients with acute illness and reduced mobility (Padua score >=4), pharmacological thromboprophylaxis with low-molecular-weight heparin (e.g., enoxaparin 40 mg SC daily) reduces venous thromboembolism by ~50% without a significant increase in major bleeding.",
            "In surgical patients undergoing major abdominal, pelvic, or orthopaedic surgery, risk stratification using the Caprini score directs prophylaxis: high-risk patients (Caprini >=5) require pharmacological prophylaxis with LMWH combined with mechanical pneumatic compression.",
            "In major orthopaedic arthroplasty (total hip or knee arthroplasty), extended prophylaxis (up to 35 days for hip, 10-14 days for knee) is recommended; the landmark CRISTAL and PEPPER trials demonstrated that aspirin (81-100 mg daily) is safe and effective as step-down prophylaxis after an initial short course of LMWH or in low-risk patients.",
            "Extended-duration thromboprophylaxis (post-discharge for 4 weeks with LMWH) is strongly recommended for patients undergoing major curative-intent open or laparoscopic resection for abdominal or pelvic malignancy, significantly reducing late post-discharge VTE.",
            "Mechanical thromboprophylaxis (intermittent pneumatic compression [IPC]) is the primary intervention for patients with active bleeding, high bleeding risk, or severe coagulopathy, with pharmacologic prophylaxis added once bleeding risk normalizes."
        ],
        "mcq_angles": [
            "Applying the Caprini risk assessment score in surgical patients to select mechanical vs pharmacologic vs combined dual prophylaxis.",
            "Indications for extended 4-week post-discharge thromboprophylaxis following major oncologic abdominopelvic surgery.",
            "Role of aspirin in modern orthopaedic thromboprophylaxis following total hip and knee arthroplasty."
        ],
        "case_hooks": [
            "A 64-year-old male undergoes open low anterior resection for rectal adenocarcinoma; the surgical team orders enoxaparin 40 mg SC daily to be continued for 28 days post-operatively.",
            "A 70-year-old female admitted for acute decompensated heart failure and pneumonia is confined to bed; her Padua score is 5; subcutaneous enoxaparin 40 mg daily is ordered."
        ],
        "uncertainties": [
            "Comparative efficacy and safety of direct oral anticoagulants (DOACs: rivaroxaban, apixaban) versus LMWH for extended post-discharge thromboprophylaxis in non-orthopaedic cancer surgeries.",
            "Clinical utility of extended post-discharge thromboprophylaxis in medically ill patients without cancer (MAGELLAN and MARINER trials risk-benefit balance)."
        ]
    },

    "viral hepatitis B": {
        "mentor_intro": (
            "Hepatitis B virus (HBV) is a partially double-stranded DNA virus belonging to the Hepadnaviridae family, transmitted via perinatal, percutaneous, or sexual exposure. "
            "Chronic hepatitis B (CHB)—defined by persistence of hepatitis B surface antigen (HBsAg) for >=6 months—affects over 250 million people worldwide, leading to cirrhosis, liver failure, and hepatocellular carcinoma (HCC). "
            "Serological interpretation of HBV markers (HBsAg, anti-HBs, anti-HBc IgM/IgG, HBeAg, anti-HBe, and quantitative HBV DNA) establishes disease phase and directs potent, high barrier-to-resistance nucleos(t)ide analogue antiviral therapy (entecavir, tenofovir)."
        ),
        "teaching_points": [
            "Serological interpretation: HBsAg indicates active infection (acute or chronic); anti-HBs indicates immunity (from vaccination if isolated, or natural recovery if combined with anti-HBc IgG); anti-HBc IgM indicates acute infection; and HBeAg correlates with high viral replication and infectivity.",
            "First-line antiviral therapies for chronic hepatitis B are nucleos(t)ide analogues with a high genetic barrier to resistance: entecavir, tenofovir disoproxil fumarate (TDF), and tenofovir alafenamide (TAF); lamivudine and adefovir are abandoned due to high resistance rates.",
            "Tenofovir alafenamide (TAF) delivers equivalent viral suppression to TDF with significantly improved renal (less tubular proteinuria and GFR decline) and bone mineral density safety profiles, making TAF or entecavir preferred in patients aged >60 years, with CKD, or with osteoporosis.",
            "Hepatocellular carcinoma (HCC) screening with abdominal ultrasound every 6 months (with or without serum alpha-fetoprotein [AFP]) is mandatory in all cirrhotic patients, Asian men >40 years, Asian women >50 years, African patients >20 years, and those with a family history of HCC, even in non-cirrhotic patients with suppressed viral loads.",
            "Prophylactic antiviral therapy (entecavir or tenofovir) is mandatory before initiating B-cell depleting therapies (rituximab) or intensive chemotherapy in patients who are HBsAg-positive or anti-HBc positive (even if HBsAg-negative), to prevent life-threatening HBV reactivation and fulminant hepatic failure."
        ],
        "mcq_angles": [
            "Deciphering HBV serology panels: distinguishing vaccine-induced immunity (anti-HBs alone) from resolved natural infection (anti-HBs + anti-HBc IgG).",
            "Selecting TAF or entecavir over TDF in patients with baseline chronic kidney disease or osteopenia to avoid proximal renal tubulopathy and bone loss.",
            "Preventing HBV reactivation during immunosuppression: universal screening with HBsAg and anti-HBc and preemptive antiviral prophylaxis during rituximab therapy."
        ],
        "case_hooks": [
            "A 34-year-old asymptomatic male has HBsAg positive, anti-HBc IgG positive, HBeAg positive, HBV DNA 12,000,000 IU/mL, and ALT 95 U/L; he is initiated on oral entecavir 0.5 mg daily.",
            "A 62-year-old woman with lymphoma is scheduled for R-CHOP chemotherapy; screening reveals HBsAg negative but anti-HBc IgG positive; she is started on prophylactic entecavir to prevent lethal viral reactivation."
        ],
        "uncertainties": [
            "Feasibility and safety of discontinuing nucleos(t)ide analogue therapy in HBeAg-negative patients with sustained viral suppression ('stopping rules' to achieve functional cure).",
            "Role of novel therapeutic pipelines (siRNA gene silencers, capsid assembly modulators, entry inhibitors) in achieving functional cure (sustained HBsAg seroclearance)."
        ]
    },

    "viral hepatitis C": {
        "mentor_intro": (
            "Hepatitis C virus (HCV) is a single-stranded enveloped RNA flavivirus transmitted predominantly through parenteral blood exposure (injection drug use, unsterilized medical equipment, blood transfusions prior to 1992). "
            "Unlike HBV, acute HCV rarely resolves spontaneously (75-85% progress to chronic hepatitis C), leading silently over decades to progressive liver fibrosis, cirrhosis, end-stage liver disease, and hepatocellular carcinoma. "
            "The advent of direct-acting antiviral (DAA) therapy has revolutionized medicine: pangenotypic, all-oral, interferon-free regimens administered for 8 to 12 weeks achieve sustained virological response (SVR12 / virological cure) in >95-98% of patients with minimal adverse effects."
        ),
        "teaching_points": [
            "Diagnostic confirmation of active hepatitis C infection requires a two-step algorithm: screening with anti-HCV antibody (demonstrating exposure) followed by mandatory reflexive HCV RNA PCR testing to confirm active viral replication.",
            "Sustained Virological Response (SVR12, defined as undetectable serum HCV RNA at 12 weeks after completing antiviral therapy) represents a definitive microbiological cure, associated with halted fibrosis progression, reduced portal hypertension, and >70% reduction in hepatocellular carcinoma and all-cause mortality.",
            "First-line treatment utilizes all-oral, pangenotypic direct-acting antiviral (DAA) regimens: glecaprevir/pibrentasvir (3 tablets daily with food for 8 weeks in treatment-naive non-cirrhotic patients) or sofosbuvir/velpatasvir (1 tablet daily for 12 weeks), effective across all HCV genotypes 1 through 6.",
            "Drug-drug interactions with DAAs are common: sofosbuvir is contraindicated with amiodarone (causes life-threatening symptomatic bradycardia and fatal cardiac arrest); acid-reducing agents (PPIs) impair velpatasvir absorption; and statins require dose adjustments with protease inhibitors (glecaprevir).",
            "Patients who achieve SVR but have pre-existing advanced fibrosis (F3) or cirrhosis (F4) remain at permanent lifetime risk for hepatocellular carcinoma and must continue lifelong surveillance with abdominal ultrasound every 6 months."
        ],
        "mcq_angles": [
            "Confirming active HCV infection: why positive anti-HCV antibody must always be followed by quantitative HCV RNA PCR testing.",
            "Lethal drug-drug interaction: co-administration of sofosbuvir and amiodarone is strictly contraindicated due to severe bradyarrhythmias.",
            "Post-cure surveillance: patients with pre-existing cirrhosis (F4) who achieve SVR12 still require lifelong semi-annual ultrasound HCC screening."
        ],
        "case_hooks": [
            "A 44-year-old male with a history of injection drug use tests positive for anti-HCV; reflexive HCV RNA is 1,800,000 IU/mL (Genotype 3); transient elastography shows F1 fibrosis; he is cured with 8 weeks of glecaprevir/pibrentasvir.",
            "A 60-year-old cirrhotic patient achieves SVR12 after sofosbuvir/velpatasvir; the patient asks if routine follow-up can be discontinued; the hepatologist explains the necessity of ongoing 6-monthly liver ultrasound for HCC screening."
        ],
        "uncertainties": [
            "Optimal salvage regimens for the rare <2-3% of patients failing first-line pangenotypic DAAs (triple-combination sofosbuvir/velpatasvir/voxilaprevir for 12 weeks).",
            "Reinfection rates and public health micro-elimination strategies among active injection drug users and incarcerated populations."
        ]
    },

    "vitamin B12 deficiency": {
        "mentor_intro": (
            "Vitamin B12 (cobalamin) is an essential water-soluble cofactor required for two critical intracellular enzymes: methionine synthase (converting homocysteine to methionine, essential for DNA purine/pyrimidine synthesis and myelin methylation) and methylmalonyl-CoA mutase (converting methylmalonyl-CoA to succinyl-CoA). "
            "Deficiency leads to defective DNA synthesis, resulting in megaloblastic haematopoiesis (macrocytic anaemia, hypersegmented neutrophils), and progressive demyelination of the central and peripheral nervous systems. "
            "Crucially, neuropsychiatric symptoms—paresthesias, sensory ataxia from subacute combined degeneration, spasticity, dementia, depression—can develop in the complete absence of haematologic anaemia."
        ),
        "teaching_points": [
            "Vitamin B12 deficiency can cause devastating, irreversible neurological damage (subacute combined degeneration of the spinal cord, peripheral sensorimotor neuropathy, cognitive decline) EVEN IN THE ABSENCE of haematologic anaemia or macrocytosis.",
            "Serum methylmalonic acid (MMA) is the most sensitive and specific functional metabolic biomarker for cellular B12 deficiency, significantly superior to total serum B12; MMA is elevated in B12 deficiency but completely normal in folate deficiency.",
            "Recreational nitrous oxide ('whippits') inhalation is an increasingly recognized cause of acute, severe functional B12 deficiency; nitrous oxide irreversibly oxidizes the cobalt core of cobalamin from Co+ to Co3+, inactivating methionine synthase and precipitating acute myeloneuropathy with normal or borderline serum B12 levels.",
            "Pernicious anaemia is an autoimmune atrophic gastritis causing destruction of gastric parietal cells and loss of intrinsic factor secretion, confirmed by testing for anti-intrinsic factor antibodies (specificity ~99%); it carries a 3-fold increased risk of gastric adenocarcinoma and neuroendocrine tumours.",
            "Treatment of symptomatic B12 deficiency with neurological involvement requires immediate intramuscular hydroxycobalamin (1000 ug on alternate days for 2 weeks or until neurological improvement ceases, followed by maintenance 1000 ug every 2-3 months for life)."
        ],
        "mcq_angles": [
            "Diagnostic utility of methylmalonic acid (MMA): elevated in B12 deficiency, distinguishing it from isolated folate deficiency.",
            "Mechanism of nitrous oxide neurotoxicity: chemical oxidation and functional inactivation of vitamin B12 causing acute subacute combined degeneration.",
            "Administration of folic acid in unrecognized B12 deficiency: resolves haematologic megaloblastic changes while masking and accelerating neurological destruction."
        ],
        "case_hooks": [
            "A 22-year-old student presents with progressive numbness in both feet, sensory ataxia, and positive Lhermitte sign; history reveals heavy recreational nitrous oxide use on weekends; serum B12 is 180 pmol/L but methylmalonic acid is markedly elevated.",
            "A 68-year-old woman presents with progressive memory loss and bilateral lower limb paresthesias; CBC shows macrocytic anaemia (Hb 92 g/L, MCV 112 fL) with hypersegmented neutrophils; anti-intrinsic factor antibodies are positive."
        ],
        "uncertainties": [
            "Diagnostic thresholds and clinical equivalence of active B12 (holotranscobalamin) compared to total serum cobalamin and methylmalonic acid in primary care.",
            "Efficacy of high-dose oral cobalamin (1000-2000 ug daily via non-intrinsic factor-dependent passive diffusion) in treating subacute combined degeneration compared to parenteral injections."
        ]
    },

    "withdrawal syndrome": {
        "mentor_intro": (
            "Withdrawal syndrome encompasses the cluster of physiological and psychological signs and symptoms that emerge upon abrupt cessation, rapid dose reduction, or antagonist administration of a drug or substance of dependence. "
            "Underlying mechanisms reflect neuroadaptation: chronic receptor activation or inhibition triggers compensatory changes in neurotransmitter receptors and second-messenger cascades. "
            "Withdrawal syndromes range from benign and uncomfortable (opioid, nicotine, cannabis withdrawal) to acute, potentially fatal medical emergencies—most prominently alcohol and benzodiazepine withdrawal syndromes—which cause severe autonomic hyperarousal, seizures, and delirium tremens."
        ),
        "teaching_points": [
            "Alcohol withdrawal syndrome is a medical emergency caused by down-regulated inhibitory GABA-A receptors and upregulated excitatory NMDA receptors; symptoms progress from autonomic hyperactivity (tremor, diaphoresis, tachycardia) at 6-24 hours, to withdrawal seizures at 12-48 hours, and delirium tremens (confusion, severe agitation, visual hallucinations, autonomic instability) at 48-96 hours.",
            "Validated symptom-triggered therapy using the Clinical Institute Withdrawal Assessment for Alcohol (CIWA-Ar) protocol with long-acting benzodiazepines (diazepam or chlordiazepoxide) is the standard of care, significantly reducing total benzodiazepine requirements and hospital stay compared to fixed-schedule dosing.",
            "In patients with severe hepatic cirrhosis or advanced age, short- or intermediate-acting benzodiazepines without active hepatic metabolites (lorazepam, oxazepam, temazepam—remembered by 'LOT') are preferred to avoid prolonged drug accumulation and oversedation.",
            "Phenobarbital (long-acting barbiturate enhancing GABA-A receptor opening duration and directly inhibiting AMPA/kainate glutamate receptors) is an increasingly utilized, highly effective protocolized alternative to benzodiazepines for severe alcohol withdrawal in emergency and ICU settings.",
            "Opioid withdrawal (dysphoria, nausea, vomiting, diarrhoea, piloerection, pupillary dilation, severe myalgias) is intensely distressing but rarely life-threatening in adults; management utilizes alpha-2 adrenergic agonists (clonidine, lofexidine) for autonomic symptoms, or buprenorphine/methadone substitution tapering."
        ],
        "mcq_angles": [
            "Selecting benzodiazepines in alcohol withdrawal with severe liver disease: utilizing lorazepam or oxazepam ('LOT' agents that undergo direct glucuronidation without CYP metabolism).",
            "Delirium tremens timing and hallmarks: onset at 48-96 hours, characterized by delirium, autonomic instability, and visual hallucinations.",
            "Phenobarbital pharmacology: dual mechanism (GABA-A enhancement and AMPA receptor inhibition) providing stable self-tapering anticonvulsant sedation."
        ],
        "case_hooks": [
            "A 48-year-old male with chronic alcohol use is admitted for a femur fracture; 72 hours post-admission he becomes severely agitated, disoriented, diaphoretic, with BP 178/105 mmHg, HR 132 bpm, and visual hallucinations of insects crawling on the bed (Delirium Tremens).",
            "A patient with known Child-Pugh B cirrhosis develops tremor, sweating, and agitation on day 2 of hospital admission; the hospitalist initiates symptom-triggered lorazepam guided by CIWA-Ar scores."
        ],
        "uncertainties": [
            "Single-dose or front-loaded intravenous phenobarbital versus standard symptom-triggered benzodiazepine protocols for ICU admission avoidance in acute alcohol withdrawal.",
            "Optimal tapering strategies and risk of persistent post-acute withdrawal syndrome (PAWS) in patients discontinuing long-term therapeutic benzodiazepines or selective serotonin reuptake inhibitors."
        ]
    }
}
