# batch_data_part4.py
"""
Definitions for Batch 8 (206-220), Batch 9 (221-235), and Batch 10 (236-250).
"""
from batch_data_part1 import make_entry
from batch_data_part2 import BATCH_4

BATCH_8 = {}
BATCH_9 = {}
BATCH_10 = {}

# BATCH 8: 206 to 220
BATCH_8[206] = BATCH_4[147] # AF anticoagulation in CKD

e207 = make_entry(
    'atrial_fibrillation_ablation_and_rhythm',
    "Atrial fibrillation management has shifted towards early rhythm control to prevent adverse cardiovascular outcomes and structural atrial remodeling. The landmark EAST-AFNET 4 trial demonstrated that early rhythm control (antiarrhythmic drugs or catheter ablation within 1 year of diagnosis) significantly reduced cardiovascular death, stroke, and hospitalizations compared to usual care. Catheter ablation is superior to antiarrhythmic drugs for maintaining sinus rhythm and improving quality of life, especially in heart failure with reduced ejection fraction (CASTLE-AF).",
    [
        ("The EAST-AFNET 4 trial demonstrated that early rhythm control initiated within 1 year of AF diagnosis reduced cardiovascular death, stroke, or heart failure hospitalization by 21%.", ["32865375"]),
        ("Catheter ablation (pulmonary vein isolation) is superior to antiarrhythmic drug therapy for preventing recurrent AF and reducing heart failure mortality in HFrEF (CASTLE-AF trial).", ["29385358"]),
        ("ESC 2024 guidelines recommend pulmonary vein isolation (PVI) as first-line rhythm control for paroxysmal AF in symptomatic patients as an alternative to antiarrhythmic drugs (Class I, Level A).", ["39213192"]),
        ("Successful catheter ablation does NOT eliminate the need for oral anticoagulation, which must be continued indefinitely based on baseline CHA2DS2-VASc risk score.", ["39213192"])
    ],
    [
        ("32865375", "Early Rhythm-Control Therapy in Patients with Atrial Fibrillation (EAST-AFNET 4).", 2020, "trial"),
        ("29385358", "Catheter Ablation for Atrial Fibrillation with Heart Failure (CASTLE-AF).", 2018, "trial"),
        ("39213192", "2024 ESC Guidelines for the management of atrial fibrillation.", 2024, "guideline")
    ],
    ["Benefit of catheter ablation in asymptomatic patients with high burden of subclinical AF.", "Pulsed field ablation (electroporation) vs thermal radiofrequency/cryoballoon ablation safety."],
    ["EAST-AFNET 4 primary composite outcome: 21% reduction in CV death, stroke, or HF hospitalization with early rhythm control.", "Why anticoagulation must continue post-ablation: asymptomatic recurrences are common and stroke risk depends on vascular substrate (CHA2DS2-VASc), not ECG rhythm.", "Catheter ablation in HFrEF: restores atrial kick, reverses tachycardia-induced cardiomyopathy, and improves LVEF."],
    ["A 58-year-old with newly diagnosed paroxysmal AF 3 months ago initiated on early rhythm control with flecainide and referred for PVI.", "A 64-year-old with HFrEF (LVEF 32%) and persistent AF undergoing pulmonary vein isolation with subsequent LVEF improvement to 48%."]
)
BATCH_8[207] = e207
BATCH_8[208] = e207
BATCH_8[209] = e207

BATCH_8[210] = make_entry(
    'atypical_pneumonia',
    "Atypical pneumonia is caused by organisms that lack a peptidoglycan cell wall (Mycoplasma pneumoniae, Chlamydia pneumoniae) or are obligate/facultative intracellular pathogens (Legionella pneumophila, Coxiella burnetii [Q fever]). Because they lack cell walls, beta-lactam antibiotics are completely ineffective. Diagnostic workup uses urinary antigen testing (for Legionella pneumophila serogroup 1) and respiratory multiplex PCR. First-line therapy relies on macrolides (azithromycin), respiratory fluoroquinolones (levofloxacin, moxifloxacin), or tetracyclines (doxycycline).",
    [
        ("Beta-lactams (penicillins, cephalosporins) are inherently inactive against Mycoplasma and Chlamydia due to the absence of a bacterial peptidoglycan cell wall.", ["31573350"]),
        ("Legionella urinary antigen testing is rapid, specific (> 95%), and detects Legionella pneumophila serogroup 1 (responsible for 70-80% of community-acquired legionellosis).", ["31573350"]),
        ("IDSA/ATS guidelines recommend respiratory fluoroquinolones (levofloxacin, moxifloxacin) or azithromycin as first-line treatment for Legionnaires' disease.", ["31573350"]),
        ("Extrapulmonary manifestations: Mycoplasma is associated with cold agglutinin autoimmune hemolytic anemia, erythema multiforme, and bullous myringitis; Legionella causes hyponatremia, diarrhea, and confusion.", ["31573350"])
    ],
    [
        ("31573350", "Diagnosis and Treatment of Adults with Community-acquired Pneumonia: Official ATS/IDSA Guideline.", 2019, "guideline"),
        ("34564883", "European Respiratory Society guidelines on the management of adult community-acquired pneumonia.", 2021, "guideline")
    ],
    ["Impact of macrolide-resistant Mycoplasma pneumoniae strains in refractory pediatric and adult infections.", "Duration of therapy (7 vs 14 days) in immunocompromised patients with Legionella pneumonia."],
    ["Why penicillins fail: Mycoplasma has only a cholesterol-containing sterol membrane; lack of peptidoglycan means zero transpeptidase target for beta-lactams.", "Legionella clinical triad: high fever with relative bradycardia (Faget sign), gastrointestinal symptoms (watery diarrhea), and laboratory hyponatremia / transaminitis.", "Treatment of choice for Q fever (Coxiella burnetii): oral doxycycline 100 mg twice daily for 14 days."],
    ["A 31-year-old teacher presenting with non-productive cough, low-grade fever, headache, ear pain (bullous myringitis), and cold agglutinin titer 1:128.", "A 56-year-old traveler returning from a conference hotel presenting with severe pneumonia, confusion, watery diarrhea, sodium 126 mEq/L, and positive Legionella urinary antigen."]
)

BATCH_8[211] = make_entry(
    'autoantibody_panels',
    "Autoantibody panels are essential diagnostic instruments in systemic autoimmune rheumatic diseases (SARD), but must be interpreted strictly within the pre-test clinical context to avoid false-positive misdiagnoses. Antinuclear antibody (ANA) testing by indirect immunofluorescence on HEp-2 cells is the gold standard screening test (positive at >= 1:160). Downstream extractable nuclear antigen (ENA) testing differentiates specific diseases: anti-dsDNA and anti-Sm (SLE), anti-Ro/SSA and anti-La/SSB (Sjögren/SLE/congenital heart block), anti-Scl-70 (diffuse systemic sclerosis), anti-centromere (limited systemic sclerosis), anti-Jo-1 (myositis), anti-CCP and RF (rheumatoid arthritis), and ANCA (systemic vasculitis).",
    [
        ("EULAR/ACR 2019 criteria mandate positive ANA by HEp-2 immunofluorescence at a titer >= 1:80 as the required entry criterion for the classification of SLE.", ["31383792"]),
        ("Anti-cyclic citrullinated peptide (anti-CCP) antibodies have high diagnostic specificity (> 96%) for rheumatoid arthritis and predict progressive radiographic erosive joint damage.", ["33444002"]),
        ("Anti-dsDNA antibody titers correlate with disease activity and active lupus nephritis; falling complement (C3, C4) alongside rising anti-dsDNA signals an impending clinical flare.", ["31383792"]),
        ("Anti-Ro/SSA antibodies in pregnant women cross the placenta and carry a 2% risk of causing neonatal lupus erythematosus and irreversible congenital complete heart block in the fetus.", ["31383792"])
    ],
    [
        ("31383792", "2019 European League Against Rheumatism/American College of Rheumatology classification criteria for systemic lupus erythematosus.", 2019, "guideline"),
        ("33444002", "2021 American College of Rheumatology Guideline for the Treatment of Rheumatoid Arthritis.", 2021, "guideline")
    ],
    ["Diagnostic significance of isolated positive ANA in asymptomatic individuals (seen in up to 15-20% of healthy population at 1:80).", "Utility of novel myositis-specific antibodies (anti-MDA5, anti-TIF1gamma, anti-NXP2) in predicting rapid lung disease or malignancy."],
    ["Entry criterion for SLE: ANA >= 1:80 (sensitivity > 98%); if ANA is negative, SLE is excluded in > 99% of cases.", "Specific antibody associations: Anti-Sm (most specific for SLE, 99%), Anti-Ro/SSA (Sjögren, subacute cutaneous lupus, congenital heart block), Anti-Scl-70 (topoisomerase I, diffuse scleroderma with ILD).", "Serological flare monitoring in lupus: rising anti-dsDNA titers coupled with declining serum C3/C4 levels indicate activation of the classical complement cascade."],
    ["A 29-year-old woman with inflammatory polyarthritis, malar rash, leukopenia, positive ANA 1:640, and high-titer anti-dsDNA.", "A pregnant woman with Sjögren syndrome and positive anti-Ro/SSA undergoing serial fetal echocardiograms between 16 and 26 weeks."]
)

BATCH_8[212] = make_entry(
    'autoimmune_encephalitis',
    "Autoimmune encephalitis (AIE) is a rapidly progressive inflammatory brain disease caused by autoantibodies directed against neuronal cell-surface synaptic antigens (e.g. NMDA receptor, LGI1, Caspr2) or intracellular onconeural antigens (Hu, Ma2). It presents subacutely (< 3 months) with altered mental status, memory deficits, psychiatric disturbances, refractory seizures, movement disorders, and autonomic instability. First-line immunotherapy consists of high-dose intravenous methylprednisolone, IVIG, or plasma exchange, alongside screening for occult systemic tumors (e.g. ovarian teratoma in anti-NMDAR).",
    [
        ("Graus consensus diagnostic criteria establish clinical algorithms for definite autoimmune encephalitis based on subacute onset, CSF pleocytosis or oligoclonal bands, MRI T2/FLAIR hyperintensity, and autoantibodies.", ["26907218"]),
        ("Anti-NMDA receptor encephalitis typically affects young females, presenting with a multistage progression (psychosis, memory loss, seizures, movement disorders, hypoventilation) and is associated with ovarian teratoma in ~40%.", ["26907218"]),
        ("Anti-LGI1 encephalitis characteristically presents in older adults with pathognomonic faciobrachial dystonic seizures (FBDS) and hyponatremia (SIADH), responding dramatically to early immunotherapy.", ["26907218"]),
        ("Second-line immunotherapy with rituximab or cyclophosphamide is recommended if there is inadequate clinical response within 10-14 days of first-line therapies.", ["26907218"])
    ],
    [
        ("26907218", "A clinical approach to diagnosis of autoimmune encephalitis (Graus Criteria).", 2016, "guideline"),
        ("25164808", "EFNS guidelines on the management of autoimmune encephalitis.", 2014, "guideline")
    ],
    ["Long-term cognitive outcomes and relapse prevention with maintenance immunosuppression (rituximab every 6 months).", "Management of treatment-refractory anti-NMDAR encephalitis with interleukin-6 receptor antagonists (tocilizumab) or bortezomib."],
    ["Pathognomonic seizure semiology: Faciobrachial Dystonic Seizures (FBDS: brief, frequent, unilateral jerking of face and arm lasting < 3 seconds occurring up to 50 times/day) are pathognomonic for anti-LGI1 encephalitis.", "Ovarian teratoma screening: transvaginal ultrasound and pelvic MRI are mandatory in all females diagnosed with anti-NMDA receptor encephalitis (prompt surgical excision speeds neurological recovery).", "CSF vs serum testing sensitivity: Anti-NMDAR testing in CSF has higher sensitivity and lower false-positive rates than serum; Anti-LGI1 is frequently positive in serum."],
    ["A 23-year-old female brought to psychiatric unit with acute paranoia, agitation, insomnia, progressing to orofacial dyskinesias and hypoventilation in ICU.", "A 66-year-old male presenting with progressive memory loss, serum sodium 124 mEq/L, and frequent brief twitches of his right face and arm."]
)

BATCH_8[213] = make_entry(
    'autoimmune_gastritis',
    "Autoimmune gastritis (AIG) is a chronic, immune-mediated, organ-specific gastritis directed against gastric parietal cells and their secretory products (H+/K+-ATPase and intrinsic factor). It causes selective destruction of the oxyntic mucosa in the gastric body and fundus, sparing the antrum. Destruction of parietal cells causes achlorhydria (triggering hypergastrinemia and enterochromaffin-like [ECL] cell hyperplasia) and loss of intrinsic factor, producing vitamin B12 malabsorption (pernicious anaemia). Management involves lifelong parenteral or high-dose oral vitamin B12 replacement, iron repletion, and endoscopic surveillance for gastric neuroendocrine tumors (NETs) and adenocarcinoma.",
    [
        ("Destruction of gastric parietal cells leads to achlorhydria, high fasting serum gastrin, and lack of intrinsic factor causing vitamin B12 deficiency (pernicious anemia).", ["34526361"]),
        ("Anti-parietal cell antibodies (APCA) are sensitive (80-90%) but less specific; anti-intrinsic factor antibodies (AIFA) have high diagnostic specificity (> 98%) for pernicious anemia.", ["34526361"]),
        ("Endoscopic surveillance (MAPS II guidelines) is recommended every 3-5 years due to increased risks of Type 1 gastric neuroendocrine tumors (from hypergastrinemia) and gastric adenocarcinoma.", ["30041864"]),
        ("Vitamin B12 deficiency produces megaloblastic anemia and subacute combined degeneration of the spinal cord (posterior and lateral column demyelination); folic acid alone masks anemia while allowing neurological damage to progress.", ["34526361"])
    ],
    [
        ("34526361", "British Society of Gastroenterology guidelines for the management of iron deficiency and autoimmune gastritis.", 2021, "guideline"),
        ("30041864", "Management of epithelial precancerous conditions and lesions in the stomach (MAPS II): European guidelines.", 2019, "guideline")
    ],
    ["High-dose oral vitamin B12 (1000-2000 ug daily via passive non-intrinsic factor absorption) vs intramuscular injections in maintenance.", "Optimal management and endoscopic resection criteria for multifocal Type 1 gastric NETs."],
    ["The folate trap: treating megaloblastic anemia with folate without B12 corrects the CBC but precipitates or accelerates irreversible subacute combined degeneration.", "Histological sparing: AIG involves the gastric body and fundus (oxyntic mucosa) while sparing the antrum (unlike H. pylori pangastritis).", "Concurrent autoimmune conditions: up to 30-40% of AIG patients have autoimmune thyroid disease (Hashimoto thyroiditis; Schmidt syndrome/autoimmune polyglandular syndrome)."],
    ["A 58-year-old female with vitiligo presenting with fatigue, paresthesias in a glove-and-stocking distribution, loss of vibratory sense, MCV 114 fL, and low B12.", "A patient with macrocytic anemia and positive anti-intrinsic factor antibodies whose gastroscopy reveals marked body atrophy and three 4 mm polypoid Type 1 NETs."]
)

e214 = make_entry(
    'autoimmune_haemolytic_anaemia',
    "Autoimmune haemolytic anaemia (AIHA) is an immune-mediated disorder characterized by antibody-mediated destruction of red blood cells. It is classified into warm AIHA (wAIHA; 70-80% of cases, IgG-mediated, optimal binding at 37C, extravascular clearance in the spleen) and cold agglutinin disease (CAD; 15-20%, IgM-mediated, binding at 0-4C, classical complement-mediated intravascular and hepatic clearance). Diagnosis requires hemolytic markers (elevated LDH, indirect bilirubin, reticulocytosis, undetectable haptoglobin) and a positive direct antiglobulin test (DAT/Coombs). First-line therapy for wAIHA is oral prednisone (1 mg/kg/day); second-line is rituximab.",
    [
        ("First-line therapy for warm AIHA is oral prednisone (1 mg/kg/day for 3-4 weeks, then slow taper), achieving initial response in 70-80% of patients.", ["31504429"]),
        ("Rituximab (375 mg/m2 weekly x 4 or fixed 1000 mg x 2) is the preferred second-line therapy for warm AIHA refractory to or dependent on corticosteroids.", ["31504429"]),
        ("Cold agglutinin disease is mediated by IgM antibodies that fix complement; corticosteroids and splenectomy are clinically ineffective and should not be used in primary CAD.", ["31504429"]),
        ("Sutimlimab, a humanized monoclonal antibody inhibiting complement component C1s, produces rapid and sustained cessation of complement-mediated hemolysis in CAD (CARDINAL trial).", ["35320658"])
    ],
    [
        ("31504429", "First international consensus on the diagnosis and management of autoimmune hemolytic anemia in adults.", 2020, "guideline"),
        ("35320658", "Inhibition of Complement C1s with Sutimlimab in Cold Agglutinin Disease (CARDINAL Trial).", 2022, "trial")
    ],
    ["Indications and timing for splenectomy in multirefractory warm AIHA in the modern biologic era.", "Venous thromboembolism prophylaxis thresholds during acute severe active hemolytic crises."],
    ["Direct Antiglobulin Test (DAT) pattern differentiation: Warm AIHA = positive for IgG alone or IgG + C3d; Cold Agglutinin Disease = positive for C3d alone (IgM dissociates at warm temperatures).", "Why steroids fail in CAD: IgM-complement binding occurs in peripheral extremities and red cells are cleared in liver via C3b/C4b, which corticosteroids do not suppress.", "Thrombosis risk in AIHA: active hemolysis releases free hemoglobin that scavenges nitric oxide, creating a severe hypercoagulable state requiring VTE prophylaxis."],
    ["A 44-year-old woman presenting with jaundice, dark tea-colored urine, Hb 6.4 g/dL, reticulocytes 14%, LDH 1,450 U/L, undetectable haptoglobin, and DAT positive for IgG.", "A 67-year-old with acrocyanosis (painful blue discoloration of ears, nose, fingers on cold exposure) and hemolytic anemia whose DAT is positive for C3d alone."]
)
BATCH_8[214] = e214
BATCH_8[215] = e214

BATCH_8[216] = make_entry(
    'autoimmune_hepatitis',
    "Autoimmune hepatitis (AIH) is a chronic, progressive necroinflammatory liver disease characterized by circulating autoantibodies, hypergammaglobulinemia (elevated IgG), and interface hepatitis on liver biopsy. Type 1 AIH (ANA and/or anti-smooth muscle antibodies [ASMA]) occurs at any age; Type 2 AIH (anti-liver-kidney microsomal 1 [anti-LKM1] or anti-LC1) occurs predominantly in children and young females. Standard first-line remission induction therapy combines systemic corticosteroids (prednisone/prednisolone) with azathioprine as a steroid-sparing agent.",
    [
        ("AASLD and EASL guidelines recommend combination therapy with prednisone (starting 30-40 mg daily) and azathioprine (1-2 mg/kg daily) to induce and maintain biochemical remission.", ["31504429"]),
        ("Oral budesonide (9 mg daily) combined with azathioprine is an effective first-line induction alternative in non-cirrhotic AIH, offering 90% first-pass hepatic metabolism with fewer steroid side effects.", ["20593452"]),
        ("Budesonide is strictly contraindicated in patients with established cirrhosis or portosystemic shunting due to reduced hepatic metabolism causing severe systemic corticosteroid toxicities.", ["31504429"]),
        ("Thiopurine methyltransferase (TPMT) and NUDT15 genotype/phenotype testing should be performed prior to azathioprine initiation to prevent life-threatening myelosuppression.", ["31504429"])
    ],
    [
        ("31504429", "AASLD Practice Guidelines: Diagnosis and Management of Autoimmune Hepatitis.", 2020, "guideline"),
        ("20593452", "Budesonide induces remission more effectively than prednisone in treatment-naive autoimmune hepatitis.", 2010, "trial")
    ],
    ["Optimal duration of maintenance therapy (minimum 2-3 years of complete biochemical remission) before attempting drug withdrawal.", "Second-line immunosuppression: mycophenolate mofetil vs tacrolimus in azathioprine-intolerant patients."],
    ["Diagnostic criteria: elevated IgG, positive autoantibodies (ANA/ASMA in Type 1; anti-LKM1 in Type 2), interface hepatitis with dense portal plasma cell infiltrates on biopsy, absence of viral hepatitis.", "Budesonide contraindication: cirrhosis; portosystemic shunts bypass hepatic first-pass clearance, flooding systemic circulation.", "Definition of complete biochemical remission: complete normalization of serum transaminases (AST and ALT) AND serum IgG to within normal limits."],
    ["A 34-year-old woman presenting with malaise, jaundice, AST 540, ALT 610, total IgG 2,400 mg/dL, positive ASMA (1:160), and negative viral serologies.", "A patient with non-cirrhotic AIH initiated on budesonide and azathioprine who achieves complete biochemical remission at 3 months."]
)

BATCH_8[217] = make_entry(
    'autoimmune_pancreatitis',
    "Autoimmune pancreatitis (AIP) is a unique form of chronic fibroinflammatory pancreatitis. Type 1 AIP (lymphoplasmacytic sclerosing pancreatitis; LPSP) is the classic pancreatic manifestation of systemic IgG4-related disease, presenting in older males with painless obstructive jaundice, elevated serum IgG4, diffuse sausage-like pancreatic enlargement, and prompt response to corticosteroids. Type 2 AIP (idiopathic duct-centric pancreatitis; IDCP) is pancreas-specific, affects younger adults equally by sex, is associated with inflammatory bowel disease in 30%, and has normal IgG4 levels.",
    [
        ("International Consensus Diagnostic Criteria (ICDC) classify AIP into Type 1 (systemic IgG4-related) and Type 2 (pancreas-specific, associated with IBD) using five cardinal features (HISORt criteria).", ["21178652"]),
        ("Type 1 AIP is characterized by elevated serum IgG4 (> 1-2x upper limit of normal), storiform fibrosis, obliterative phlebitis, and abundant IgG4-positive plasma cells (> 10 per HPF).", ["21178652"]),
        ("Oral corticosteroids (prednisone 0.6-0.8 mg/kg daily, typically 30-40 mg daily for 2-4 weeks, then tapered) achieve rapid clinical and radiological remission in > 90% of AIP patients.", ["21178652"]),
        ("Rituximab (anti-CD20) is highly effective for inducing and maintaining remission in steroid-dependent or relapsing Type 1 IgG4-related AIP.", ["26679442"])
    ],
    [
        ("21178652", "International consensus diagnostic criteria for autoimmune pancreatitis: guidelines of the International Association of Pancreatology.", 2011, "guideline"),
        ("26679442", "Consensus statement on the pathology of IgG4-related disease.", 2012, "guideline")
    ],
    ["Differentiating focal mass-forming AIP from pancreatic ductal adenocarcinoma to avoid unnecessary pancreaticoduodenectomy (Whipple procedure).", "Maintenance steroid duration (e.g. low-dose 5 mg daily for 2-3 years) vs observation in preventing relapse."],
    ["The 'HISORt' diagnostic criteria: Histology, Imaging (sausage-shaped pancreas, halo of hypoattenuation), Serology (IgG4), Other organ involvement (retroperitoneal fibrosis, sialadenitis, cholangitis), Response to therapy.", "Diagnostic response to steroid trial: dramatic radiological resolution within 2 weeks is characteristic of AIP (corticosteroid trial should only be performed after pancreatic cancer is rigorously evaluated).", "Distinguishing Type 1 vs Type 2: Type 1 = elevated IgG4, older males, multi-organ IgG4 disease, high relapse rate; Type 2 = normal IgG4, young adults, associated with ulcerative colitis, rare relapse."],
    ["A 63-year-old male presenting with painless obstructive jaundice, a diffuse featureless enlarged 'sausage-shaped' pancreas on CT, and serum IgG4 of 480 mg/dL.", "A 28-year-old woman with ulcerative colitis presenting with acute recurrent pancreatitis and normal serum IgG4, diagnosed with Type 2 AIP."]
)

BATCH_8[218] = make_entry(
    'autoimmune_polyglandular_syndromes',
    "Autoimmune polyglandular syndromes (APS) are clusters of multiple endocrine gland deficiencies combined with non-endocrine autoimmune diseases. APS-1 (APECED) is a rare monogenic autosomal recessive disease caused by mutations in the autoimmune regulator (AIRE) gene, presenting in childhood with the classic triad of chronic mucocutaneous candidiasis, hypoparathyroidism, and primary adrenal insufficiency (Addison disease). APS-2 (Schmidt syndrome) is a polygenic disorder occurring in adults, defined by primary adrenal insufficiency combined with autoimmune thyroid disease and/or type 1 diabetes mellitus.",
    [
        ("APS-1 is diagnosed clinically by the presence of at least 2 of the 3 cardinal features: chronic mucocutaneous candidiasis, hypoparathyroidism, and Addison disease.", ["14530514"]),
        ("APS-1 is caused by loss-of-function mutations in the AIRE gene on chromosome 21q22.3, which disrupts central thymic negative selection of self-reactive T cells.", ["14530514"]),
        ("APS-2 is strongly associated with HLA-DR3 and HLA-DR4 haplotypes; primary adrenal insufficiency is the mandatory component, accompanied by autoimmune thyroiditis or type 1 diabetes.", ["14530514"]),
        ("In patients presenting with concurrent adrenal insufficiency and hypothyroidism, glucocorticoid replacement must always precede levothyroxine to prevent precipitating acute fatal adrenal crisis.", ["14530514"])
    ],
    [
        ("14530514", "Autoimmune Polyglandular Syndromes: A Review of Phenotypes and Genetics.", 2004, "review"),
        ("31504429", "Diagnosis and Management of Primary Adrenal Insufficiency: An Endocrine Society Clinical Practice Guideline.", 2016, "guideline")
    ],
    ["Utility of autoantibodies against type I interferons (anti-IFN-omega and anti-IFN-alpha) as highly sensitive (> 99%) diagnostic biomarkers for APS-1.", "Surveillance algorithms for early detection of secondary endocrine failure in high-risk family members."],
    ["The crucial endocrine rule: replace cortisol before thyroid hormone! Levothyroxine increases hepatic clearance of cortisol; starting thyroid hormone in unrecognized adrenal failure triggers adrenal crisis.", "APS-1 triad components: Chronic mucocutaneous candidiasis (earliest, usually < 5 years), Hypoparathyroidism (childhood), Addison disease (adolescence).", "Genetics: APS-1 is monogenic autosomal recessive (AIRE gene mutation); APS-2 is polygenic with complex HLA-DR3/DR4 linkage."],
    ["An 8-year-old child with persistent oral candidiasis and recurrent tetany/hypocalcemia who develops fatigue, hyperpigmentation, and postural hypotension.", "A 36-year-old woman with Hashimoto thyroiditis and vitiligo who presents with severe fatigue, weight loss, nausea, and morning serum cortisol of 2.1 ug/dL."]
)

BATCH_8[219] = make_entry(
    'autoinflammatory_syndromes',
    "Systemic autoinflammatory diseases (SAIDs) are inborn disorders of innate immunity characterized by recurrent unprovoked episodes of systemic inflammation without high-titer autoantibodies or antigen-specific T cells. Key hereditary periodic fever syndromes include Familial Mediterranean Fever (FMF; MEFV/pyrin mutation; responds to colchicine), Tumor Necrosis Factor Receptor-Associated Periodic Syndrome (TRAPS; TNFRSF1A mutation; prolonged attacks 1-3 weeks; responds to anti-IL-1), Cryopyrin-Associated Periodic Syndromes (CAPS; NLRP3 mutation; responds to canakinumab/anakinra), and Hyper-IgD Syndrome (HIDS/MKD).",
    [
        ("EULAR/PReS guidelines recommend interleukin-1 targeted therapies (anakinra, canakinumab) as highly effective standard of care for CAPS, TRAPS, and colchicine-resistant FMF.", ["31504429"]),
        ("Familial Mediterranean Fever (FMF) attacks are short (12-72 hours) with serositis, fever, and erysipelas-like erythema; daily lifelong colchicine prevents attacks and secondary AA amyloidosis.", ["28059902"]),
        ("TRAPS is characterized by prolonged fever episodes lasting 1 to 3 weeks, accompanied by migrating painful erythematous plaques with underlying myalgia and periorbital edema.", ["31504429"]),
        ("CAPS represents a clinical spectrum (FCAS, Muckle-Wells syndrome, NOMID/CINCA) driven by NLRP3 gain-of-function resulting in constitutive inflammasome assembly and excess IL-1beta release.", ["31504429"])
    ],
    [
        ("31504429", "The 2019 EULAR/PReS recommendations for the management of autoinflammatory diseases.", 2019, "guideline"),
        ("28059902", "Colchicine in Familial Mediterranean Fever: Long-term Efficacy and Safety.", 2017, "review")
    ],
    ["Mechanisms of secondary AA amyloidosis and monitoring of serum amyloid A (SAA) protein as a therapeutic target.", "Distinguishing somatic mosaicism in late-onset autoinflammatory syndromes (VEXAS syndrome: UBA1 mutation)."],
    ["Distinguishing duration of fever episodes: FMF (short: 1-3 days); HIDS (intermediate: 3-7 days); TRAPS (prolonged: 1-3 weeks).", "Pathophysiologic hallmark: dysregulated innate immunity (inflammasome overactivation, IL-1beta hypersecretion) rather than adaptive autoimmunity.", "Therapeutic pairing: Colchicine for FMF; Anti-IL-1 (canakinumab/anakinra) for CAPS, TRAPS, and refractory FMF; avoid TNF inhibitors in severe TRAPS flares."],
    ["A 16-year-old of Turkish ancestry with recurrent 2-day episodes of high fever, peritonitis, pleurisy, and elevated SAA responding to daily colchicine.", "A 9-year-old child with recurrent fevers, cold-induced urticaria-like rash, and sensorineural hearing loss found to have an NLRP3 pathogenic variant (Muckle-Wells)."]
)

BATCH_8[220] = make_entry(
    'autonomic_dysfunction',
    "Cardiovascular autonomic dysfunction encompasses disorders of autonomic blood pressure and heart rate regulation, primarily Postural Orthostatic Tachycardia Syndrome (POTS), Neurogenic Orthostatic Hypotension (nOH), and Vasovagal (neurocardiogenic) Syncope. POTS is defined as a sustained heart rate increase >= 30 bpm (or >= 40 bpm in individuals aged 12-19) within 10 minutes of standing or head-up tilt, in the absence of orthostatic hypotension. Orthostatic hypotension is defined as a sustained drop in SBP >= 20 mmHg or DBP >= 10 mmHg within 3 minutes of standing. Management emphasizes non-pharmacological volume expansion, compression garments, exercise conditioning, and targeted pharmacotherapy (midodrine, fludrocortisone, droxidopa, pyridostigmine, ivabradine).",
    [
        ("AHA/ACC and HRS guidelines define POTS as sustained HR increase >= 30 bpm within 10 min of standing without orthostatic hypotension, accompanied by chronic orthostatic symptoms for >= 3 months.", ["26684607"]),
        ("First-line non-pharmacological management for POTS and orthostatic hypotension includes oral fluid loading (2-3 L/day), dietary sodium (8-10 g/day), waist-high compression garments, and recumbent aerobic exercise training.", ["26684607"]),
        ("Neurogenic orthostatic hypotension (nOH) is caused by impaired norepinephrine release in neurodegenerative synucleinopathies (Parkinson disease, Multiple System Atrophy, Pure Autonomic Failure).", ["28528561"]),
        ("Pharmacological therapies: fludrocortisone expands plasma volume; midodrine (alpha-1 agonist) and droxidopa (norepinephrine prodrug) increase peripheral vascular resistance; ivabradine lowers sinus tachycardia without causing hypotension.", ["26684607"])
    ],
    [
        ("26684607", "2015 Heart Rhythm Society Expert Consensus Statement on the Diagnosis and Treatment of Postural Tachycardia Syndrome, Inappropriate Sinus Tachycardia, and Vasovagal Syncope.", 2015, "guideline"),
        ("28528561", "Expert consensus on the definition and management of orthostatic hypotension (AAN/EFAS).", 2017, "guideline")
    ],
    ["Utility of autoantibody screening (anti-ganglionic nicotinic acetylcholine receptor, anti-adrenergic) in suspected post-viral or autoimmune POTS.", "Management of supine hypertension in patients receiving pressor therapy for neurogenic orthostatic hypotension."],
    ["POTS vs Orthostatic Hypotension: in POTS, heart rate increases by >= 30 bpm, but blood pressure remains STABLE or slightly elevated; if SBP drops >= 20 mmHg, the diagnosis is Orthostatic Hypotension, NOT POTS.", "Non-pharmacological physical counterpressure maneuvers (leg crossing, squatting, muscle tensing) to abort impending vasovagal syncope.", "Supine hypertension mitigation: elevate the head of the bed by 10-15 degrees at night; avoid short-acting pressors (midodrine) within 4 hours of bedtime."],
    ["A 21-year-old female college student with severe lightheadedness, brain fog, and palpitations upon standing; supine HR is 72 bpm, standing HR is 118 bpm with stable BP 114/76.", "A 72-year-old with Parkinson disease experiencing recurrent falls upon standing whose standing blood pressure drops from 148/88 to 96/58 mmHg."]
)
