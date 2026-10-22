import json
import sqlite3

with open('scratch_remaining_85.json', 'r', encoding='utf-8') as f:
    topics = json.load(f)

print(f"Total topics to process: {len(topics)}")

# Clinical synthesis rules for the 85 topics based on their titles and gap notes
curated_tp4_map = {
    "Dementia with Lewy Bodies (DLB): core features, neuroleptic sensitivity management": {
        "claim": "Severe neuroleptic sensitivity occurs in up to 50% of DLB patients treated with first-generation dopamine D2 antagonists (triggering irreversible parkinsonism, neuroleptic malignant syndrome, and acute mortality); cholinesterase inhibitors (donepezil, rivastigmine) are first-line for neuropsychiatric symptoms, while quetiapine or pimavanserin/clozapine are used with extreme caution.",
        "cites": ["28592453"],
        "mcq": "Recognizing severe neuroleptic sensitivity and choosing safest agents (cholinesterase inhibitors, low-dose quetiapine) for distressing psychosis in DLB.",
        "case": "A 74-year-old male with Lewy body dementia given haloperidol for visual hallucinations who develops profound rigidity, autonomic instability, and rapid clinical deterioration.",
        "unc": "Efficacy and long-term motor safety of novel 5-HT2A inverse agonists (pimavanserin) in DLB psychosis."
    },
    "Diabetes insipidus: central vs nephrogenic, water deprivation test, desmopressin": {
        "claim": "Differential diagnosis between central and nephrogenic diabetes insipidus relies on the water deprivation test followed by desmopressin challenge (central DI exhibits a >50% increase in urine osmolality, whereas nephrogenic DI shows <50% response); plasma copeptin >21.4 pmol/L following hypertonic saline infusion reliably identifies nephrogenic DI.",
        "cites": ["39438674"],
        "mcq": "Interpreting water deprivation test results and post-desmopressin urine osmolality changes in central versus nephrogenic DI.",
        "case": "A 32-year-old with pituitary surgery developing acute polyuria (>5 L/day), dilute urine (<200 mOsm/kg), and hypernatremia managed with titrated oral or parenteral desmopressin.",
        "unc": "Diagnostic thresholds and safety of hypertonic saline-stimulated copeptin testing versus arginine stimulation in elderly patients."
    },
    "Diagnostic Upper GI Endoscopy": {
        "claim": "Urgent diagnostic endoscopy is indicated for new-onset dyspepsia with alarm features (unintentional weight loss, progressive dysphagia, persistent vomiting, overt gastrointestinal bleeding, or age >55 with treatment-resistant symptoms), requiring systematic photo-documentation and minimum 4-quadrant biopsies for suspected mucosal dysplasia.",
        "cites": ["28821598"],
        "mcq": "Indications for urgent diagnostic endoscopy in dyspepsia with alarm features versus test-and-treat for Helicobacter pylori.",
        "case": "A 58-year-old male with a 6-month history of epigastric fullness, 6 kg unintended weight loss, and iron deficiency anemia referred for urgent diagnostic gastroscopy.",
        "unc": "Diagnostic yield and cost-effectiveness of routine gastric mucosal biopsy mapping in asymptomatic atrophic gastritis."
    },
    "Duodenal Pathology": {
        "claim": "Diagnostic evaluation of duodenal pathology requires oriented biopsies from the bulb and second part of the duodenum to confirm celiac disease (Marsh classification: intraepithelial lymphocytosis, crypt hyperplasia, and villous blunting) in seropositive individuals, while non-ampullary duodenal adenomas require endoscopic mucosal resection.",
        "cites": ["35523224"],
        "mcq": "Biopsy sampling strategy and histological staging (Marsh classification) in suspected celiac disease and duodenal adenomas.",
        "case": "A 29-year-old woman with chronic diarrhea, iron deficiency, and positive anti-tissue transglutaminase IgA undergoing targeted duodenal bulb and second-part mucosal biopsies.",
        "unc": "Endoscopic surveillance intervals for duodenal adenomatosis in patients with familial adenomatous polyposis (Spigelman classification)."
    },
    "Dyspnoea and Breathlessness in Advanced Cancer": {
        "claim": "Low-dose systemic opioids (oral morphine 5-10 mg or parenteral equivalent) represent the evidence-based first-line pharmacotherapy for cancer-related breathlessness refractory to non-pharmacologic interventions (handheld facial fan, positioning), while benzodiazepines provide benefit only when significant episodic panic or anxiety co-occurs.",
        "cites": ["33617290"],
        "mcq": "Selecting first-line pharmacotherapy (low-dose opioids) and identifying reversible etiologies in refractory cancer-related dyspnea.",
        "case": "A 66-year-old patient with metastatic non-small cell lung cancer experiencing severe resting breathlessness despite maximal inhaler therapy, initiated on low-dose oral morphine.",
        "unc": "Role of prophylactic high-flow nasal cannula versus non-invasive ventilation in terminal dyspnea without hypercapnic respiratory failure."
    },
    "Fluid Assessment and Management in Renal Disease": {
        "claim": "Multimodal fluid assessment in advanced renal disease combines physical examination (elevated JVP, peripheral edema, crackles) with point-of-care lung ultrasound (B-lines) and bioimpedance spectroscopy; high-dose loop diuretics combined with thiazides or SGLT2 inhibitors and controlled ultrafiltration (<10-13 mL/kg/h) prevent intradialytic myocardial stunning.",
        "cites": ["38432324"],
        "mcq": "Point-of-care ultrasonography (lung B-lines, IVC collapsibility) and loop-thiazide diuretic synergy in diuretic-resistant nephrotic volume overload.",
        "case": "A 54-year-old hemodialysis patient with refractory hypertension, recurrent interdialytic weight gains of 4.5 kg, and symptomatic pulmonary congestion undergoing dry-weight recalibration.",
        "unc": "Impact of bioimpedance-guided dry weight titration on preserving residual kidney function in peritoneal and hemodialysis patients."
    },
    "Gastric Polyps": {
        "claim": "All gastric adenomas possess premalignant potential and require complete endoscopic resection and histological evaluation, whereas hyperplastic polyps >=10 mm or those associated with dysplastic foci warrant resection alongside Helicobacter pylori eradication to promote spontaneous regression of residual lesions.",
        "cites": ["41711625"],
        "mcq": "Management algorithms distinguishing fundic gland polyps (PPI-associated, benign) from adenomatous and hyperplastic polyps requiring polypectomy.",
        "case": "A 61-year-old woman undergoing routine gastroscopy found to have multiple smooth 3-5 mm fundic gland polyps and a single 14 mm antral hyperplastic polyp requiring biopsied resection and H. pylori testing.",
        "unc": "Malignant transformation risk and surveillance intervals for fundic gland polyps with low-grade dysplasia in patients on chronic PPIs."
    },
    "Group 1 pulmonary arterial hypertension: ERA, PDE5i, prostacyclin, combination therapy": {
        "claim": "Upfront dual oral combination therapy with an endothelin receptor antagonist (ERA: ambrisentan or macitentan) and a phosphodiesterase-5 inhibitor (PDE5i: tadalafil or sildenafil) is the standard of care for low- and intermediate-risk PAH (demonstrated in the AMBITION trial), while high-risk patients require immediate triple therapy including parenteral prostacyclin analogs.",
        "cites": ["37085727"],
        "mcq": "Risk stratification-guided selection of upfront combination therapy (ERA + PDE5i vs parenteral prostacyclin) in newly diagnosed pulmonary arterial hypertension.",
        "case": "A 43-year-old woman with idiopathic PAH, 6-minute walk distance 340 m, and elevated BNP initiated on upfront dual oral therapy with ambrisentan and tadalafil.",
        "unc": "Long-term clinical impact of adding the activin receptor ligand trap sotatercept to background triple combination therapy in Group 1 PAH."
    },
    "Haemodialysis Complications": {
        "claim": "Intradialytic hypotension (IDH) is the most frequent acute complication of hemodialysis, driven by aggressive ultrafiltration rates exceeding vascular refill capacity; preventative management includes dialysate cooling (35-36°C), avoiding food ingestion during treatment, linear ultrafiltration profiling, and strict dry-weight optimization.",
        "cites": ["38519239"],
        "mcq": "Preventative strategies and acute hemodynamic management for intradialytic hypotension and dialyzer hypersensitivity reactions.",
        "case": "A 68-year-old diabetic ESRD patient experiencing repeated symptomatic blood pressure drops (systolic <90 mmHg) and muscle cramping during the final hour of hemodialysis treatments.",
        "unc": "Comparative cardiovascular mortality outcomes between cooled dialysate and automated biofeedback blood volume tracking systems."
    },
    "Haemoglobin Electrophoresis Interpretation": {
        "claim": "Elevated HbA2 (>3.5%) on capillary electrophoresis or HPLC confirms the diagnosis of beta-thalassemia trait (differentiating it from iron deficiency anemia), whereas marked elevation of HbF indicates hereditary persistence of fetal hemoglobin (HPFH) or beta-thalassemia major/intermedia, and HbS migration establishes sickle cell hemoglobinopathies.",
        "cites": ["27890718"],
        "mcq": "Distinguishing beta-thalassemia trait (elevated HbA2 >3.5%) from alpha-thalassemia and iron deficiency anemia on hemoglobin electrophoresis.",
        "case": "A 26-year-old asymptomatic primigravida found on antenatal screening to have microcytic anemia (MCV 66 fL, ferritin normal) and HbA2 4.8% on HPLC, requiring paternal trait screening.",
        "unc": "Sensitivity and diagnostic pitfalls of HPLC in detecting rare unstable hemoglobin variants causing unexplained hemolytic anemia."
    }
}

print(f"Sample curated map entries: {len(curated_tp4_map)}")
