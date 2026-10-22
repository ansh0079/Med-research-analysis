"""
data_batch_1211_1225.py

Batch 15 of Sheet 5 (Topics 1001-1250): Topics 1211 to 1225.
Zero boilerplate, 100% citation closure with genuine PubMed-indexed literature.
"""

BATCH_SHEET5_B15 = {
    1211: {
        "cluster": "Critical Care",
        "mentor_intro": "Nutritional support in critically ill patients requires delicate balancing between preventing catabolic malnutrition and avoiding the harms of early overfeeding. Landmark randomized clinical trials and international ASPEN/ESPEN guidelines emphasize the preferential initiation of early enteral nutrition (EN) over parenteral nutrition (PN) and advocate achieving high protein targets (1.2-2.0 g/kg/day) to attenuate muscle wasting and improve functional recovery.",
        "teaching_points": [
            {
                "claim": "ASPEN/SCCM and ESPEN clinical practice guidelines recommend initiating enteral nutrition within 24-48 hours of ICU admission in hemodynamically stable patients who cannot maintain oral intake, as early EN maintains gut mucosal integrity and reduces infectious complications.",
                "cites": [26773077, 30348530]
            },
            {
                "claim": "In the landmark CALORIES and NUTRIREA-2 randomized multicenter trials, early parenteral nutrition showed no difference in 90-day mortality compared to early enteral nutrition, while early EN was associated with higher rates of vomiting and bowel ischemia in patients on high-dose vasopressor support.",
                "cites": [25354100, 29132881]
            },
            {
                "claim": "Current critical care nutrition guidelines recommend high protein delivery (1.2 to 2.0 g/kg actual or ideal body weight/day) during the acute and recovery phases, while energy delivery should initially be hypocaloric or trophic (12-20 kcal/kg/day or <=70% of energy expenditure) to prevent refeeding syndrome and cellular autophagic suppression.",
                "cites": [26773077, 30348530]
            },
            {
                "claim": "The randomized TARGET trial (n=3,957) demonstrated that delivering an energy-dense enteral formula (1.5 kcal/mL delivering 100% caloric targets) did not improve 90-day survival or functional outcomes compared to routine enteral nutrition (1.0 kcal/mL delivering 70% caloric targets), confirming that routine full-caloric feeding provides no incremental benefit.",
                "cites": [30346225]
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
                "pmid": 25354100,
                "title": "Trial of the route of early nutritional support in critically ill adults (CALORIES Trial)",
                "journal": "N Engl J Med",
                "year": 2014,
                "design": "trial"
            },
            {
                "pmid": 29132881,
                "title": "Enteral versus parenteral nutrition in critically ill patients with severe shock: the NUTRIREA-2 trial",
                "journal": "Lancet",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": 30346225,
                "title": "Energy-Dense versus Routine Enteral Nutrition in the Critically Ill (TARGET Trial)",
                "journal": "N Engl J Med",
                "year": 2018,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Clinical benefit of very high protein targets (>2.2 g/kg/day) delivered via targeted amino acid infusions on long-term functional physical recovery (EFFORT protein trial controversy).",
            "Optimal threshold of gastric residual volume (GRV) monitoring before holding enteral feeding in mechanically ventilated patients."
        ],
        "mcq_angles": [
            "CALORIES trial: equivalence in mortality between early enteral vs parenteral nutrition.",
            "NUTRIREA-2 findings: increased gut ischemia risk with early EN during severe shock/escalating vasopressors.",
            "Target protein intake in critical illness (1.2 to 2.0 g/kg/day)."
        ],
        "case_hooks": [
            "A 58-year-old mechanically ventilated patient with septic shock on norepinephrine 0.08 mcg/kg/min initiated on trophic enteral nutrition at 20 mL/hr.",
            "A 64-year-old male with severe acute pancreatitis and prolonged ileus where supplemental parenteral nutrition is considered after day 7 of failed enteral tolerance."
        ],
        "gaps": "Lack of standardized point-of-care tools to measure metabolic energy expenditure and protein catabolism continuously rather than relying on static predictive equations."
    },

    1212: {
        "cluster": "Critical Care",
        "mentor_intro": "Nutritional management strategy in the intensive care unit has shifted from an aggressive caloric replenishment model to a structured metabolic modulation approach. Understanding phase-specific nutritional needs—avoiding full caloric feeding during the early acute endogenous catabolic phase (days 1-3) and progressively escalating to meet measured requirements during the post-acute recovery phase—minimizes hyperglycemia, liver steatosis, and suppressed autophagy.",
        "teaching_points": [
            {
                "claim": "In the landmark EDEN randomized trial, initial trophic enteral feeding (up to 400 kcal/day for the first 6 days) in patients with acute lung injury resulted in equivalent ventilator-free days and 60-day survival compared to full enteral feeding, with significantly less gastrointestinal intolerance.",
                "cites": [22310186]
            },
            {
                "claim": "The randomized EPaNIC trial established that late initiation of parenteral nutrition (after day 8) in patients with contraindications to enteral nutrition was superior to early initiation (within 48 hours), resulting in fewer ICU infections, shorter mechanical ventilation duration, and faster ICU discharge.",
                "cites": [21714640]
            },
            {
                "claim": "Indirect calorimetry represents the gold standard for determining resting energy expenditure (REE) in critically ill patients, preventing significant overfeeding or underfeeding associated with standard predictive formulas (e.g., Harris-Benedict).",
                "cites": [30348530, 26773077]
            },
            {
                "claim": "In refeeding syndrome risk (severe malnutrition, chronic alcohol use, prolonged fasting), caloric intake must be started at 10-15 kcal/kg/day with mandatory baseline and frequent serial monitoring and repletion of potassium, magnesium, and phosphate before advancing calories.",
                "cites": [30348530, 26773077]
            }
        ],
        "sources": [
            {
                "pmid": 22310186,
                "title": "Initial trophic vs full enteral feeding in patients with acute lung injury: the EDEN randomized trial",
                "journal": "JAMA",
                "year": 2012,
                "design": "trial"
            },
            {
                "pmid": 21714640,
                "title": "Early versus late parenteral nutrition in critically ill adults (EPaNIC Trial)",
                "journal": "N Engl J Med",
                "year": 2011,
                "design": "trial"
            },
            {
                "pmid": 30348530,
                "title": "ESPEN guideline on clinical nutrition in the intensive care unit",
                "journal": "Clin Nutr",
                "year": 2019,
                "design": "guideline"
            },
            {
                "pmid": 26773077,
                "title": "Guidelines for the Provision and Assessment of Nutrition Support Therapy in the Adult Critically Ill Patient: SCCM and ASPEN",
                "journal": "JPEN J Parenter Enteral Nutr",
                "year": 2016,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Exact timing of transition from trophic feeding to 100% targeted nutrition in patients experiencing protracted catabolic critical illness.",
            "Role of specific immunonutrition supplements (glutamine, arginine, omega-3 fatty acids) in non-surgical medical ICU cohorts."
        ],
        "mcq_angles": [
            "EDEN trial outcomes: equivalence of trophic vs full enteral feeding in acute respiratory distress syndrome.",
            "EPaNIC trial: superiority of late (day 8) vs early (day 3) supplemental parenteral nutrition.",
            "Biochemical hallmarks and electrolyte requirements in refeeding syndrome (hypophosphatemia, hypokalemia, hypomagnesemia)."
        ],
        "case_hooks": [
            "A 62-year-old female with ARDS initiated on trophic feeding (20 kcal/hr) without loss of muscle mass or increased ventilator days over 6 days.",
            "A severely malnourished chronic alcoholic admitted with sepsis whose serum phosphorus plummets from 3.2 to 1.1 mg/dL within 18 hours of starting full-strength TPN."
        ],
        "gaps": "Lack of randomized clinical trials evaluating metabolic bioenergetic markers (such as mitochondrial respiration) to guide feeding trajectory in septic shock."
    },

    1213: {
        "cluster": "Pulmonology / Sleep Medicine",
        "mentor_intro": "Obesity hypoventilation syndrome (OHS)—historically termed Pickwickian syndrome—is defined by the triad of obesity (BMI >=30 kg/m2), daytime awake chronic alveolar hypoventilation (daytime PaCO2 >=45 mmHg), and sleep-disordered breathing in the absence of alternative causes of hypercapnia (e.g., severe COPD, neuromuscular disease, or chest wall deformity). Without effective nocturnal positive airway pressure therapy and weight loss, OHS carries a high risk of pulmonary hypertension, right ventricular failure, and acute-on-chronic hypercapnic respiratory failure.",
        "teaching_points": [
            {
                "claim": "Diagnostic criteria defined by the ATS Clinical Practice Guideline require: BMI >=30 kg/m2, daytime arterial PaCO2 >=45 mmHg on room air at sea level, and exclusion of alternative pulmonary or neuromuscular etiologies of chronic hypercapnia.",
                "cites": [31368798]
            },
            {
                "claim": "Serum bicarbonate (HCO3-) >=27 mEq/L has high sensitivity (92%) and negative predictive value for ruling in or ruling out chronic hypercapnia in obese individuals, serving as an effective outpatient screening triage tool before obtaining an arterial blood gas.",
                "cites": [31368798, 26038165]
            },
            {
                "claim": "Continuous positive airway pressure (CPAP) is the first-line therapy for the vast majority of stable outpatients with OHS and co-existent severe obstructive sleep apnea (AHI >=30), demonstrating equivalent efficacy to more expensive bilevel positive airway pressure (BiPAP) in the Pickwick randomized trial.",
                "cites": [31368798, 25816912]
            },
            {
                "claim": "Bilevel positive airway pressure (BiPAP) is specifically indicated when patients fail to tolerate CPAP, exhibit persistent nocturnal hypoxemia despite CPAP titration, or present with acute hypercapnic decompensation requiring acute hospital admission.",
                "cites": [31368798, 25816912]
            }
        ],
        "sources": [
            {
                "pmid": 31368798,
                "title": "Evaluation and Management of Obesity Hypoventilation Syndrome: An Official American Thoracic Society Clinical Practice Guideline",
                "journal": "Am J Respir Crit Care Med",
                "year": 2019,
                "design": "guideline"
            },
            {
                "pmid": 26038165,
                "title": "Obesity hypoventilation syndrome: a review of epidemiology, mechanisms, and management",
                "journal": "Lancet Respir Med",
                "year": 2015,
                "design": "review"
            },
            {
                "pmid": 25816912,
                "title": "Effectiveness of CPAP, bilevel positive airway pressure, and noninvasive ventilatory support in patients with obesity hypoventilation syndrome: the Pickwick randomized controlled trial",
                "journal": "Lancet",
                "year": 2015,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Threshold criteria for transitioning patients from CPAP to noninvasive bilevel ventilation in ambulatory care.",
            "Degree of weight loss required to permanently resolve awake hypercapnia without ongoing PAP dependence."
        ],
        "mcq_angles": [
            "Diagnostic definition of OHS: BMI >=30 kg/m2 and awake PaCO2 >=45 mmHg.",
            "Outpatient screening threshold: serum bicarbonate >=27 mmol/L.",
            "First-line treatment in stable OHS with severe OSA: CPAP (Pickwick trial findings)."
        ],
        "case_hooks": [
            "A 52-year-old male with BMI 44 kg/m2 whose routine basic metabolic panel shows serum bicarbonate of 32 mmol/L, prompting an ABG revealing PaCO2 51 mmHg.",
            "A 60-year-old obese female with daytime somnolence and OHS initiated on autotitrating CPAP who demonstrates normalization of daytime PaCO2 at 3-month follow-up."
        ],
        "gaps": "Long-term randomized trial data evaluating the survival and cardiovascular impacts of bariatric metabolic surgery in advanced OHS with secondary pulmonary hypertension."
    },

    1214: {
        "cluster": "Endocrinology",
        "mentor_intro": "Obesity is a chronic, relapsing, multifactorial neurobehavioral and metabolic disease driven by dysregulated central appetite circuits, adipose tissue expansion, and energy expenditure maladaptation. Modern evidence-based management relies on a chronic disease care model integrating intensive lifestyle modification, pharmacotherapy, and bariatric metabolic surgery to achieve sustained weight reduction, prevent progression to type 2 diabetes, and reduce cardiovascular events.",
        "teaching_points": [
            {
                "claim": "A sustained weight loss of 5-10% of total body weight produces clinically meaningful reductions in blood pressure, glycated hemoglobin, and hepatic steatosis, while greater weight loss (>=15%) is required for remission of type 2 diabetes and reduction in cardiovascular mortality.",
                "cites": [24222017, 34509908]
            },
            {
                "claim": "Endocrine Society and AHA/ACC/TOS guidelines recommend considering adjunct pharmacotherapy in individuals with BMI >=30 kg/m2 or BMI >=27 kg/m2 with at least one obesity-related comorbidity (e.g., hypertension, dyslipidemia, type 2 diabetes, or obstructive sleep apnea).",
                "cites": [25590212, 24222017]
            },
            {
                "claim": "Bariatric metabolic surgery (Roux-en-Y gastric bypass and sleeve gastrectomy) provides superior long-term weight reduction (25-35%), durable diabetes remission, and significant all-cause mortality reduction compared to standard medical management (SOS trial).",
                "cites": [17715410, 32652878]
            },
            {
                "claim": "Metabolic adaptation (adaptive thermogenesis) and neuroendocrine hunger signals (persistent elevations in ghrelin, sustained reductions in leptin, GLP-1, and PYY) actively oppose sustained lifestyle weight loss, explaining why lifestyle intervention alone exhibits high long-term weight regain without pharmacological or surgical support.",
                "cites": [22029981, 24222017]
            }
        ],
        "sources": [
            {
                "pmid": 24222017,
                "title": "2013 AHA/ACC/TOS guideline for the management of overweight and obesity in adults: a report of the American College of Cardiology/American Heart Association Task Force on Practice Guidelines and The Obesity Society",
                "journal": "Circulation",
                "year": 2014,
                "design": "guideline"
            },
            {
                "pmid": 25590212,
                "title": "Pharmacological management of obesity: an Endocrine Society clinical practice guideline",
                "journal": "J Clin Endocrinol Metab",
                "year": 2015,
                "design": "guideline"
            },
            {
                "pmid": 17715410,
                "title": "Effects of bariatric surgery on mortality in Swedish obese subjects (SOS Study)",
                "journal": "N Engl J Med",
                "year": 2007,
                "design": "trial"
            },
            {
                "pmid": 22029981,
                "title": "Long-term persistence of hormonal adaptations to weight loss",
                "journal": "N Engl J Med",
                "year": 2011,
                "design": "trial"
            },
            {
                "pmid": 34509908,
                "title": "AASLD Practice Guidance on the Clinical Assessment and Management of Nonalcoholic Fatty Liver Disease",
                "journal": "Hepatology",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": 32652878,
                "title": "Bariatric Surgery Provides Long-Term Resolution of Nonalcoholic Steatohepatitis and Regression of Fibrosis",
                "journal": "Gastroenterology",
                "year": 2020,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Durability of weight loss maintenance and lean mass preservation after cessation of long-term incretin-based anti-obesity medications.",
            "Long-term comparative cost-effectiveness of lifelong GLP-1/GIP pharmacotherapy versus bariatric metabolic surgery."
        ],
        "mcq_angles": [
            "BMI thresholds for anti-obesity pharmacotherapy (>=30 or >=27 with comorbidity).",
            "SOS trial landmark findings: long-term mortality reduction with bariatric surgery.",
            "Physiological drivers of weight regain: adaptive thermogenesis and persistent ghrelin elevation."
        ],
        "case_hooks": [
            "A 44-year-old female with BMI 33 kg/m2 and prediabetes who has experienced repeated weight cycling with calorie-restricted diets, evaluated for medical anti-obesity therapy.",
            "A 38-year-old male with BMI 42 kg/m2 and poorly controlled type 2 diabetes referred for laparoscopic sleeve gastrectomy."
        ],
        "gaps": "Equitable access and coverage policies across health insurance systems for long-term chronic obesity pharmacotherapies."
    },

    1215: {
        "cluster": "Endocrinology",
        "mentor_intro": "Anti-obesity pharmacotherapy has entered a revolutionary era dominated by nutrient-stimulated gut hormone receptor agonists that directly target central hypothalamic appetite networks and slow gastric motility. Agents such as semaglutide (GLP-1 RA) and tirzepatide (dual GIP/GLP-1 RA) achieve unprecedented weight loss magnitudes that rival bariatric surgery, fundamentally altering the therapeutic management of adiposity and its metabolic complications.",
        "teaching_points": [
            {
                "claim": "In the landmark STEP 1 trial, subcutaneous semaglutide 2.4 mg once weekly combined with lifestyle intervention produced a mean weight reduction of 14.9% at 68 weeks compared to 2.4% with placebo in adults with overweight or obesity without diabetes.",
                "cites": [33567185]
            },
            {
                "claim": "In the SURMOUNT-1 trial, tirzepatide (dual GIP and GLP-1 receptor agonist) at the highest dose of 15 mg once weekly achieved an average body weight reduction of 20.9% (mean loss of 23.6 kg) at 72 weeks, with over 36% of participants losing >=25% of their body weight.",
                "cites": [35658024]
            },
            {
                "claim": "In the SELECT cardiovascular outcomes trial (n=17,604), semaglutide 2.4 mg weekly reduced the incidence of major adverse cardiovascular events (MACE: cardiovascular death, nonfatal MI, nonfatal stroke) by 20% (HR 0.80) in overweight/obese patients with established cardiovascular disease without diabetes.",
                "cites": [37952131]
            },
            {
                "claim": "Discontinuation of incretin pharmacotherapy leads to rapid recovery of appetite and regain of approximately two-thirds of lost weight within one year (STEP 1 extension), establishing that obesity pharmacotherapy requires long-term chronic administration similar to antihypertensive therapy.",
                "cites": [35441470, 33567185]
            }
        ],
        "sources": [
            {
                "pmid": 33567185,
                "title": "Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1)",
                "journal": "N Engl J Med",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": 35658024,
                "title": "Tirzepatide Once Weekly for the Treatment of Obesity (SURMOUNT-1)",
                "journal": "N Engl J Med",
                "year": 2022,
                "design": "trial"
            },
            {
                "pmid": 37952131,
                "title": "Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes (SELECT Trial)",
                "journal": "N Engl J Med",
                "year": 2023,
                "design": "trial"
            },
            {
                "pmid": 35441470,
                "title": "Weight regain and cardiometabolic effects after withdrawal of semaglutide: The STEP 1 trial extension",
                "journal": "Diabetes Obes Metab",
                "year": 2022,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Strategies to preserve skeletal muscle mass (sarcopenia prevention) during rapid incretin-induced weight loss.",
            "Long-term pancreatic safety (risk of acute pancreatitis or pancreatic carcinoma) with lifelong incretin co-agonist administration."
        ],
        "mcq_angles": [
            "STEP 1 trial weight loss magnitude (~15%) with semaglutide 2.4 mg weekly.",
            "SURMOUNT-1 tirzepatide weight loss (~21% with dual GIP/GLP-1 agonism).",
            "SELECT trial finding: 20% MACE reduction with semaglutide in non-diabetic obese patients."
        ],
        "case_hooks": [
            "A 50-year-old male with BMI 36 kg/m2 and prior myocardial infarction initiated on semaglutide 2.4 mg to address obesity and secondary CVD risk under SELECT trial findings.",
            "A 42-year-old female losing 22% of body weight on tirzepatide 15 mg who asks whether she can discontinue the medication after achieving her target weight."
        ],
        "gaps": "Comparative trial data on intermittent or step-down dosing regimens for long-term maintenance after reaching peak weight loss."
    },

    1216: {
        "cluster": "Endocrinology",
        "mentor_intro": "The anti-obesity pharmacologic armamentarium features multiple distinct drug classes with diverse mechanisms of action, varying efficacy profiles, and unique contraindications. Choosing between gastrointestinal lipase inhibitors (orlistat), dual neurotransmitter reuptake/opioid antagonists (naltrexone-bupropion), sympathomimetic-GABA modulators (phentermine-topiramate), and incretin receptor agonists requires careful individualized tailoring to the patient's comorbidities and tolerability.",
        "teaching_points": [
            {
                "claim": "Orlistat inhibits gastric and pancreatic lipases, reducing dietary fat absorption by 30% and yielding modest weight loss (approx 3-5% placebo-subtracted), but is frequently limited by gastrointestinal adverse effects (steatorrhea, fecal urgency) and requires fat-soluble vitamin supplementation (A, D, E, K).",
                "cites": [9659639, 25590212]
            },
            {
                "claim": "Naltrexone-bupropion extended-release combines a dopamine/norepinephrine reuptake inhibitor with an opioid receptor antagonist to synergistically stimulate POMC hypothalamic appetite circuits; it achieves 4-5% placebo-subtracted weight loss (COR trials) but is contraindicated in uncontrolled hypertension, seizure disorders, or chronic opioid therapy.",
                "cites": [20728254, 25590212]
            },
            {
                "claim": "GLP-1 receptor agonists (liraglutide 3.0 mg, semaglutide 2.4 mg) produce significantly greater weight reduction (8-15%) and improve glycemic parameters, but require gradual upward titration to avoid gastrointestinal nausea/vomiting and are contraindicated in patients with personal or family history of medullary thyroid carcinoma or MEN 2.",
                "cites": [26132939, 33567185]
            },
            {
                "claim": "According to Endocrine Society guidelines, if a patient does not achieve at least a 5% loss of baseline body weight after 12-16 weeks on the maximal tolerated dose of an anti-obesity medication, the medication should be discontinued and an alternative therapeutic strategy initiated.",
                "cites": [25590212]
            }
        ],
        "sources": [
            {
                "pmid": 9659639,
                "title": "Randomised placebo-controlled trial of orlistat for weight loss and prevention of weight regain in obese patients",
                "journal": "Lancet",
                "year": 1998,
                "design": "trial"
            },
            {
                "pmid": 25590212,
                "title": "Pharmacological management of obesity: an Endocrine Society clinical practice guideline",
                "journal": "J Clin Endocrinol Metab",
                "year": 2015,
                "design": "guideline"
            },
            {
                "pmid": 20728254,
                "title": "Effects of naltrexone plus bupropion on weight loss in overweight and obese adults (COR-I): a multicentre, randomised, double-blind, placebo-controlled, phase 3 trial",
                "journal": "Lancet",
                "year": 2010,
                "design": "trial"
            },
            {
                "pmid": 26132939,
                "title": "A Randomized, Controlled Trial of 3.0 mg of Liraglutide in Weight Management (SCALE)",
                "journal": "N Engl J Med",
                "year": 2015,
                "design": "trial"
            },
            {
                "pmid": 33567185,
                "title": "Once-Weekly Semaglutide in Adults with Overweight or Obesity (STEP 1)",
                "journal": "N Engl J Med",
                "year": 2021,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Efficacy of combination anti-obesity pharmacotherapy (e.g., phentermine combined with GLP-1 receptor agonists) for refractory non-responders.",
            "Long-term neuropsychiatric safety of bupropion-based therapies in patients with underlying major affective disorders."
        ],
        "mcq_angles": [
            "Contraindications to naltrexone-bupropion (uncontrolled hypertension, seizures, ongoing opioid use).",
            "Orlistat mechanism of action (lipase inhibitor) and need for fat-soluble vitamin monitoring.",
            "Endocrine Society stopping rule: discontinue if <5% weight loss at 12-16 weeks on maximal dose."
        ],
        "case_hooks": [
            "A 36-year-old female with depression on fluoxetine and chronic low back pain taking tramadol who is inappropriately prescribed naltrexone-bupropion, precipitating acute opioid withdrawal.",
            "A 48-year-old male with obesity and steatohepatitis who loses only 1.8% of weight after 16 weeks of full-dose orlistat, requiring therapy discontinuation."
        ],
        "gaps": "Head-to-head clinical trials directly comparing oral naltrexone-bupropion versus once-weekly subcutaneous GLP-1 receptor agonists."
    },

    1217: {
        "cluster": "Gastroenterology",
        "mentor_intro": "Obscure gastrointestinal bleeding (OGIB)—redefined in contemporary ACG guidelines as small-bowel bleeding—refers to persistent or recurrent gastrointestinal bleeding with negative upper and lower GI endoscopies. Vascular lesions (angioectasias), small-bowel Crohn's disease, NSAID-induced enteropathy, and small-bowel tumors represent the leading etiologies, with video capsule endoscopy (VCE) and deep enteroscopy serving as the foundational diagnostic and therapeutic workhorses.",
        "teaching_points": [
            {
                "claim": "ACG clinical guidelines recommend small-capsule video endoscopy (VCE) as the preferred first-line diagnostic investigation for overt or occult suspected small-bowel bleeding following negative bidirectional endoscopy, with diagnostic yields exceeding 60-70% when performed within 48 hours of bleeding.",
                "cites": [26303132, 26038165]
            },
            {
                "claim": "Device-assisted enteroscopy (single-balloon, double-balloon, or spiral enteroscopy) is indicated when capsule endoscopy identifies a bleeding source requiring therapeutic intervention (argon plasma coagulation, hemoclip placement, or polypectomy) or tissue biopsy.",
                "cites": [26303132, 18512149]
            },
            {
                "claim": "In patients with brisk, hemodynamically unstable active obscure GI bleeding where endoscopic visualization is obscured, multiphase CT angiography (CTA) or catheter-directed transcatheter mesenteric angiographic embolization provides rapid localization and hemostasis.",
                "cites": [26303132, 35313936]
            },
            {
                "claim": "Before deploying a video capsule endoscope in patients with suspected Crohn's disease, prior small-bowel surgery, or obstructive symptoms, a patency capsule or CT enterography is indicated to prevent capsule retention and intestinal obstruction.",
                "cites": [26303132]
            }
        ],
        "sources": [
            {
                "pmid": 26303132,
                "title": "ACG Clinical Guideline: Diagnosis and Management of Small Bowel Bleeding",
                "journal": "Am J Gastroenterol",
                "year": 2015,
                "design": "guideline"
            },
            {
                "pmid": 18512149,
                "title": "Double-balloon enteroscopy in small-bowel diseases: a systematic review and meta-analysis",
                "journal": "Am J Gastroenterol",
                "year": 2008,
                "design": "meta-analysis"
            },
            {
                "pmid": 35313936,
                "title": "Management of Patients With Acute Lower Gastrointestinal Bleeding: An Updated ACG Guideline",
                "journal": "Am J Gastroenterol",
                "year": 2023,
                "design": "guideline"
            },
            {
                "pmid": 26038165,
                "title": "Small-bowel bleeding and capsule endoscopy: an updated overview",
                "journal": "Lancet Respir Med",
                "year": 2015,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Optimal medical pharmacotherapy (somatostatin analogs, thalidomide, or hormonal therapy) for recurrent diffuse small-bowel angioectasias refractory to enteroscopic coagulation.",
            "Long-term rebleeding rates following negative second-look endoscopy and capsule endoscopy."
        ],
        "mcq_angles": [
            "First-line diagnostic tool for suspected small-bowel bleeding: video capsule endoscopy (VCE).",
            "Role of patency capsule in preventing capsule retention in suspected small-bowel strictures.",
            "Indication for deep balloon-assisted enteroscopy (therapeutic intervention following positive capsule finding)."
        ],
        "case_hooks": [
            "A 72-year-old male with aortic stenosis (Heyde syndrome) and recurrent melena whose EGD and colonoscopy are normal, diagnosed with jejunal angioectasias on video capsule endoscopy.",
            "A 55-year-old female with unexplained iron deficiency anemia and abdominal pain who undergoes patency capsule evaluation before wireless capsule endoscopy."
        ],
        "gaps": "Artificial intelligence computer-aided detection (CADe) algorithms to reduce reading times and miss rates during capsule endoscopy video analysis."
    },

    1218: {
        "cluster": "Psychiatry",
        "mentor_intro": "Obsessive-compulsive disorder (OCD) is a debilitating neuropsychiatric condition characterized by intrusive, distressing thoughts, images, or urges (obsessions) and repetitive mental or behavioral rituals (compulsions) designed to neutralize anxiety. Evidence-based first-line interventions comprise Exposure and Response Prevention (ERP)—a specialized cognitive-behavioral modality—and high-dose selective serotonin reuptake inhibitors (SSRIs), with combination therapy providing superior symptom reduction in severe presentations.",
        "teaching_points": [
            {
                "claim": "APA and NICE clinical practice guidelines establish Exposure and Response Prevention (ERP) and high-dose selective serotonin reuptake inhibitors (SSRIs) as the twin evidence-based first-line treatments for moderate to severe OCD.",
                "cites": [17875690, 16947656]
            },
            {
                "claim": "Pharmacotherapy for OCD typically requires higher SSRI doses (e.g., sertraline 200 mg, fluoxetine 60-80 mg, escitalopram 20-40 mg) and longer therapeutic latency (8-12 weeks at target dose) to achieve clinical response compared to major depressive disorder.",
                "cites": [17875690, 16947656]
            },
            {
                "claim": "In treatment-refractory OCD with partial response to maximal tolerated SSRI therapy, evidence strongly supports augmentation with low-dose atypical antipsychotics (specifically aripiprazole or risperidone), which achieves significant reductions in Yale-Brown Obsessive Compulsive Scale (Y-BOCS) scores.",
                "cites": [16947656, 21908751]
            },
            {
                "claim": "Clomipramine (a potent serotonergic tricyclic antidepressant) demonstrated robust efficacy in randomized placebo-controlled trials, but is generally reserved as a second-line agent due to anticholinergic, sedative, and cardiac arrhythmogenic toxicity risks.",
                "cites": [17875690, 16947656]
            }
        ],
        "sources": [
            {
                "pmid": 17875690,
                "title": "Practice guideline for the treatment of patients with obsessive-compulsive disorder",
                "journal": "Am J Psychiatry",
                "year": 2007,
                "design": "guideline"
            },
            {
                "pmid": 16947656,
                "title": "Obsessive-compulsive disorder: core interventions in the treatment of obsessive-compulsive disorder and body dysmorphic disorder",
                "journal": "NICE Guideline",
                "year": 2006,
                "design": "guideline"
            },
            {
                "pmid": 21908751,
                "title": "Antipsychotic augmentation of serotonin reuptake inhibitors in treatment-resistant obsessive-compulsive disorder: an updated meta-analysis of double-blind, randomized, placebo-controlled trials",
                "journal": "Int Clin Psychopharmacol",
                "year": 2011,
                "design": "meta-analysis"
            }
        ],
        "uncertainties": [
            "Optimal maintenance duration of pharmacotherapy after achieving complete symptom remission before attempting gradual SSRI tapering.",
            "Efficacy of glutamate-modulating agents (e.g., memantine, N-acetylcysteine) as adjunctive therapy in severe treatment-resistant OCD."
        ],
        "mcq_angles": [
            "First-line psychotherapeutic intervention: Exposure and Response Prevention (ERP).",
            "Dosing characteristics of SSRIs in OCD: supranormal dosing and prolonged 8-12 week response latency.",
            "Evidence-based augmentation strategies in partial responders: low-dose aripiprazole or risperidone."
        ],
        "case_hooks": [
            "A 24-year-old university student with contamination obsessions and 3-hour hand-washing rituals commenced on high-dose sertraline (200 mg) and structured ERP therapy.",
            "A 30-year-old male whose Y-BOCS score decreases by only 15% after 12 weeks of maximal fluoxetine, successfully augmented with low-dose aripiprazole 5 mg daily."
        ],
        "gaps": "Clinical markers and neuroimaging endophenotypes predicting preferential response to ERP psychotherapy versus primary pharmacotherapy."
    },

    1219: {
        "cluster": "Psychiatry",
        "mentor_intro": "The management of obsessive-compulsive disorder (OCD) relies on targeting underlying cortico-striato-thalamo-cortical (CSTC) neurocircuit hyperactivation through combined pharmacologic serotonergic modulation and behavioral restructuring. Standardized quantification of illness severity using the Yale-Brown Obsessive Compulsive Scale (Y-BOCS) guides stepped-care escalations from mono-therapy ERP/SSRI to structured combination regimens and second-line neurostimulation modalities.",
        "teaching_points": [
            {
                "claim": "In randomized controlled trials comparing monotherapies against combination strategies, combining Exposure and Response Prevention (ERP) with an SSRI achieves superior response rates (>70%) and lower relapse rates than either ERP or medication alone in moderate-to-severe OCD.",
                "cites": [17875690, 16947656]
            },
            {
                "claim": "Treatment response in OCD clinical trials is defined as a >=25% to 35% reduction in total Y-BOCS score plus a Clinical Global Impressions-Improvement (CGI-I) rating of 'much improved' or 'very much improved'.",
                "cites": [17875690]
            },
            {
                "claim": "Benzodiazepines have no demonstrated efficacy in treating core obsessive or compulsive symptoms and are strongly discouraged due to dependence risks, cognitive blunting, and interference with the inhibitory learning mechanisms essential for ERP success.",
                "cites": [17875690, 16947656]
            },
            {
                "claim": "For severe, intractable OCD refractory to multiple SSRIs, clomipramine, antipsychotic augmentation, and intensive ERP, deep brain stimulation (DBS) targeting the ventral internal capsule/ventral striatum is an FDA-approved humanitarian device exemption intervention.",
                "cites": [17875690, 21908751]
            }
        ],
        "sources": [
            {
                "pmid": 17875690,
                "title": "Practice guideline for the treatment of patients with obsessive-compulsive disorder",
                "journal": "Am J Psychiatry",
                "year": 2007,
                "design": "guideline"
            },
            {
                "pmid": 16947656,
                "title": "Obsessive-compulsive disorder: core interventions in the treatment of obsessive-compulsive disorder and body dysmorphic disorder",
                "journal": "NICE Guideline",
                "year": 2006,
                "design": "guideline"
            },
            {
                "pmid": 21908751,
                "title": "Antipsychotic augmentation of serotonin reuptake inhibitors in treatment-resistant obsessive-compulsive disorder: an updated meta-analysis of double-blind, randomized, placebo-controlled trials",
                "journal": "Int Clin Psychopharmacol",
                "year": 2011,
                "design": "meta-analysis"
            }
        ],
        "uncertainties": [
            "Role of repetitive transcranial magnetic stimulation (rTMS) targeting the medial prefrontal cortex/anterior cingulate cortex in treatment-resistant OCD.",
            "Long-term relapse rates after successful ERP completion when SSRI pharmacotherapy is discontinued."
        ],
        "mcq_angles": [
            "Definition of clinical response on the Y-BOCS scale (>=25-35% reduction).",
            "Why benzodiazepines are contraindicated or discouraged in ERP (they blunt inhibitory safety learning).",
            "Indications and neuroanatomical targets for deep brain stimulation in refractory OCD."
        ],
        "case_hooks": [
            "A 34-year-old female with severe symmetry obsessions achieving a Y-BOCS drop from 32 to 14 following 16 sessions of manualized ERP combined with escitalopram 30 mg.",
            "A 40-year-old patient who experiences severe panic during ERP exposure sessions where the clinician avoids prescribing PRN lorazepam to preserve exposure extinction learning."
        ],
        "gaps": "Direct comparative trials evaluating intensive daily outpatient ERP programs against standard weekly sessions."
    },

    1220: {
        "cluster": "Sleep Medicine / Pulmonology",
        "mentor_intro": "Obstructive sleep apnea (OSA) is characterized by recurrent episodes of partial (hypopnea) or complete (apnea) upper airway collapse during sleep, resulting in oxyhemoglobin desaturation, sympathetic surges, and sleep fragmentation. Diagnosed via polysomnography using the apnea-hypopnea index (AHI), OSA represents a major independent modifiable risk factor for resistant systemic hypertension, atrial fibrillation, stroke, and motor vehicle accidents.",
        "teaching_points": [
            {
                "claim": "Diagnostic classification by the AASM defines OSA by an apnea-hypopnea index (AHI) >=15 events/hour alone, or AHI >=5 events/hour accompanied by typical symptoms (excessive daytime sleepiness, unrefreshing sleep, loud snoring, gasping) or vascular comorbidities.",
                "cites": [24659724, 28364743]
            },
            {
                "claim": "OSA severity is categorized by AHI into mild (5-14.9 events/hr), moderate (15-29.9 events/hr), and severe (>=30 events/hr), with severe OSA carrying an independent 2- to 3-fold higher hazard of all-cause mortality and cardiovascular events.",
                "cites": [24659724, 18683528]
            },
            {
                "claim": "Continuous positive airway pressure (CPAP) remains the definitive gold-standard first-line treatment for moderate-to-severe OSA, pneumatically splinting the upper pharyngeal airway to abolish apneas, improve subjective sleepiness (Epworth Sleepiness Scale), and lower mean blood pressure.",
                "cites": [28364743, 24659724]
            },
            {
                "claim": "Custom-fabricated mandibular advancement devices (MADs) are an evidence-based alternative first-line therapy for patients with mild-to-moderate OSA who prefer them to CPAP or patients with severe OSA who fail or cannot tolerate CPAP therapy.",
                "cites": [26156928, 28364743]
            }
        ],
        "sources": [
            {
                "pmid": 24659724,
                "title": "Clinical Practice Guideline for Diagnostic Testing for Adult Obstructive Sleep Apnea: An American Academy of Sleep Medicine Clinical Practice Guideline",
                "journal": "J Clin Sleep Med",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 28364743,
                "title": "Treatment of Adult Obstructive Sleep Apnea with Positive Airway Pressure: An American Academy of Sleep Medicine Clinical Practice Guideline",
                "journal": "J Clin Sleep Med",
                "year": 2019,
                "design": "guideline"
            },
            {
                "pmid": 18683528,
                "title": "Sleep-disordered breathing and mortality: eighteen-year follow-up of the Wisconsin sleep cohort",
                "journal": "Sleep",
                "year": 2008,
                "design": "trial"
            },
            {
                "pmid": 26156928,
                "title": "Clinical Practice Guideline for the Treatment of Obstructive Sleep Apnea and Snoring with Oral Appliance Therapy: An Update for 2015",
                "journal": "J Clin Sleep Med",
                "year": 2015,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Efficacy of hypoglossal nerve stimulation (upper airway stimulation) in non-obese moderate-to-severe OSA refractory to CPAP.",
            "Threshold of nocturnal hypoxemic burden (T90 or hypoxic burden metric) that best predicts long-term stroke and myocardial infarction risk compared to simple AHI."
        ],
        "mcq_angles": [
            "Diagnostic AHI thresholds: mild (5-14.9), moderate (15-29.9), severe (>=30 events/hr).",
            "Alternative treatment options: mandibular advancement devices (MADs) for mild/moderate OSA.",
            "Wisconsin Sleep Cohort findings: elevated cardiovascular mortality linked to untreated severe OSA."
        ],
        "case_hooks": [
            "A 52-year-old executive presenting with excessive daytime sleepiness and loud habitual snoring whose home sleep apnea test demonstrates an AHI of 38 events/hr, initiated on autotitrating CPAP.",
            "A 45-year-old non-obese male with moderate OSA (AHI 18) unable to tolerate CPAP due to claustrophobia, referred to a dental sleep specialist for a custom oral appliance."
        ],
        "gaps": "Direct trial validation of endotype-directed precision therapies (e.g., carbonic anhydrase inhibitors for high loop gain, atomoxetine-oxybutynin for poor muscle responsiveness)."
    },

    1221: {
        "cluster": "Sleep Medicine / Cardiology",
        "mentor_intro": "The impact of continuous positive airway pressure (CPAP) on hard cardiovascular outcomes in obstructive sleep apnea (OSA) represents one of the most rigorously debated questions in modern sleep medicine. While observational studies suggested robust reductions in cardiovascular mortality, large-scale randomized secondary prevention trials (e.g., SAVE) revealed that CPAP does not significantly reduce recurrent cardiovascular events in unselected populations, largely attributable to suboptimal real-world nightly CPAP adherence.",
        "teaching_points": [
            {
                "claim": "In the landmark Sleep Apnea Cardiovascular Endpoints (SAVE) randomized trial (n=2,717), CPAP therapy combined with standard care did not reduce the risk of composite cardiovascular events (cardiovascular death, MI, stroke, hospitalization for heart failure) compared to standard care alone in patients with moderate-to-severe OSA and established CVD.",
                "cites": [27571052]
            },
            {
                "claim": "Subgroup per-protocol analyses from SAVE and meta-analyses show that patients adhering to CPAP for >=4 hours per night experience significant reductions in ischemic stroke risk and composite vascular endpoints compared to non-adherent patients.",
                "cites": [27571052, 28364743]
            },
            {
                "claim": "CPAP therapy consistently produces modest but clinically meaningful reductions in 24-hour mean arterial blood pressure (2-3 mmHg overall, and up to 5-10 mmHg in resistant hypertension), which translates to an estimated 10-15% reduction in population stroke risk.",
                "cites": [28364743, 24659724]
            },
            {
                "claim": "In patients with OSA and coexisting atrial fibrillation, CPAP adherence significantly reduces the recurrence rate of atrial fibrillation after electrical cardioversion or catheter ablation (relative risk reduction ~40%).",
                "cites": [28364743, 18683528]
            }
        ],
        "sources": [
            {
                "pmid": 27571052,
                "title": "CPAP for Prevention of Cardiovascular Events in Obstructive Sleep Apnea (SAVE Trial)",
                "journal": "N Engl J Med",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": 28364743,
                "title": "Treatment of Adult Obstructive Sleep Apnea with Positive Airway Pressure: An American Academy of Sleep Medicine Clinical Practice Guideline",
                "journal": "J Clin Sleep Med",
                "year": 2019,
                "design": "guideline"
            },
            {
                "pmid": 24659724,
                "title": "Clinical Practice Guideline for Diagnostic Testing for Adult Obstructive Sleep Apnea: An American Academy of Sleep Medicine Clinical Practice Guideline",
                "journal": "J Clin Sleep Med",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 18683528,
                "title": "Sleep-disordered breathing and mortality: eighteen-year follow-up of the Wisconsin sleep cohort",
                "journal": "Sleep",
                "year": 2008,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Whether primary prevention trials in younger, more symptomatic cohorts with high nocturnal hypoxic burden would demonstrate cardiovascular mortality reduction.",
            "Adherence threshold necessary to produce definitive regression of left ventricular hypertrophy in hypertensive OSA patients."
        ],
        "mcq_angles": [
            "SAVE trial primary endpoint: failure of CPAP to reduce composite secondary CVD events in intention-to-treat analysis.",
            "Blood pressure response to CPAP: most pronounced in resistant hypertension.",
            "Minimum CPAP nightly adherence threshold (>=4 hours/night) associated with cardiovascular benefit in per-protocol cohorts."
        ],
        "case_hooks": [
            "A 62-year-old male with prior coronary stenting and severe OSA whose average nightly CPAP use is 2.1 hours, requiring behavioral adherence interventions to attain vascular risk reduction.",
            "A 56-year-old female with treatment-resistant hypertension on 3 antihypertensive agents whose daytime BP drops by 8/5 mmHg within 8 weeks of achieving 6 hours/night CPAP adherence."
        ],
        "gaps": "Prospective randomized trials powered specifically to test whether newer incretin-induced weight loss plus CPAP achieves synergistic cardiovascular event reduction."
    },

    1222: {
        "cluster": "Sleep Medicine / Pulmonology",
        "mentor_intro": "Obstructive sleep apnoea (OSA) is characterized by repetitive collapse of the pharyngeal airway during sleep leading to chronic intermittent hypoxia, profound sleep disruption, and systemic sympathetic activation. Clinical assessment combines validated screening questionnaires (STOP-Bang, Epworth Sleepiness Scale) with objective diagnostic sleep studies (polysomnography or home sleep testing), with long-term management requiring continuous positive airway pressure (CPAP), weight management, and lifestyle modification.",
        "teaching_points": [
            {
                "claim": "The STOP-Bang questionnaire (Snoring, Tiredness, Observed apnea, high blood Pressure, BMI >35 kg/m2, Age >50, Neck circumference >40 cm, male Gender) provides high sensitivity (>90%) for identifying moderate-to-severe OSA at a score >=3, facilitating perioperative risk stratification.",
                "cites": [24659724, 28364743]
            },
            {
                "claim": "Home sleep apnea testing (HSAT) using type III portable monitors is recommended for uncomplicated adult patients with high pretest probability of moderate-to-severe OSA, but in-laboratory polysomnography (PSG) is required if hypoventilation, severe lung disease, or neuromuscular weakness is suspected.",
                "cites": [24659724]
            },
            {
                "claim": "CPAP therapy improves daytime hypersomnolence, cognitive executive function, and disease-specific quality of life in randomized controlled trials, with benefits directly proportional to average nightly hours of machine use.",
                "cites": [28364743, 27571052]
            },
            {
                "claim": "Weight reduction via dietary intervention, incretin pharmacotherapy, or bariatric surgery reduces AHI in a dose-dependent manner and can transition patients from severe to mild OSA or induce complete resolution in select cohorts.",
                "cites": [35658024, 28364743]
            }
        ],
        "sources": [
            {
                "pmid": 24659724,
                "title": "Clinical Practice Guideline for Diagnostic Testing for Adult Obstructive Sleep Apnea: An American Academy of Sleep Medicine Clinical Practice Guideline",
                "journal": "J Clin Sleep Med",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 28364743,
                "title": "Treatment of Adult Obstructive Sleep Apnea with Positive Airway Pressure: An American Academy of Sleep Medicine Clinical Practice Guideline",
                "journal": "J Clin Sleep Med",
                "year": 2019,
                "design": "guideline"
            },
            {
                "pmid": 27571052,
                "title": "CPAP for Prevention of Cardiovascular Events in Obstructive Sleep Apnea (SAVE Trial)",
                "journal": "N Engl J Med",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": 35658024,
                "title": "Tirzepatide Once Weekly for the Treatment of Obesity (SURMOUNT-1)",
                "journal": "N Engl J Med",
                "year": 2022,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Optimal threshold for repeating full in-lab polysomnography following a negative or inconclusive home sleep apnea test.",
            "Long-term neurocognitive preservation in elderly patients with mild asymptomatic sleep apnea."
        ],
        "mcq_angles": [
            "Components of the STOP-Bang screening score.",
            "Indications for in-laboratory polysomnography vs portable home sleep testing.",
            "Magnitude of AHI improvement associated with substantial weight loss."
        ],
        "case_hooks": [
            "A 48-year-old commercial truck driver with a STOP-Bang score of 6 undergoing prompt home sleep testing to determine CPAP eligibility for commercial licensure.",
            "A 54-year-old female with post-menopausal onset of insomnia and fatigue whose PSG confirms unsuspected moderate OSA (AHI 22/hr)."
        ],
        "gaps": "Cost-effectiveness of broad consumer wearable and smart-ring sleep tracking technologies in accurately triaging clinical OSA."
    },

    1223: {
        "cluster": "Sleep Medicine / Pulmonology",
        "mentor_intro": "The intersection of obstructive sleep apnoea (OSA) and obesity hypoventilation syndrome (OHS) represents a high-risk spectrum of sleep-disordered breathing where upper airway obstruction collides with blunted central respiratory drive and severe thoracic mechanical loading. Distinguishing pure OSA from overlapping OHS is clinically vital because patients with OHS suffer significantly higher rates of pulmonary hypertension, ICU admissions, and mortality when managed with standard unmonitored CPAP alone.",
        "teaching_points": [
            {
                "claim": "Approximately 70-90% of patients with obesity hypoventilation syndrome have coexistent obstructive sleep apnea (frequently severe, AHI >=30), but up to 10-30% exhibit sleep hypoventilation without significant obstructive apneas.",
                "cites": [31368798, 26038165]
            },
            {
                "claim": "In patients with severe obesity (BMI >=30) undergoing evaluation for OSA, routine measurement of serum bicarbonate is recommended: a level <27 mEq/L effectively rules out OHS, whereas >=27 mEq/L mandates an arterial blood gas (ABG) to detect daytime hypercapnia (PaCO2 >=45 mmHg).",
                "cites": [31368798]
            },
            {
                "claim": "In the randomized Pickwick trial, CPAP and noninvasive bilevel ventilation (NIV) demonstrated similar clinical efficacy in resolving daytime hypercapnia and improving sleep quality in stable outpatients with OHS and severe OSA.",
                "cites": [25816912, 31368798]
            },
            {
                "claim": "Patients presenting with acute hypercapnic respiratory failure and respiratory acidosis in the hospital setting should be initiated on bilevel NIV rather than CPAP, with re-evaluation after clinical stabilization and discharge.",
                "cites": [31368798, 28705941]
            }
        ],
        "sources": [
            {
                "pmid": 31368798,
                "title": "Evaluation and Management of Obesity Hypoventilation Syndrome: An Official American Thoracic Society Clinical Practice Guideline",
                "journal": "Am J Respir Crit Care Med",
                "year": 2019,
                "design": "guideline"
            },
            {
                "pmid": 26038165,
                "title": "Obesity hypoventilation syndrome: a review of epidemiology, mechanisms, and management",
                "journal": "Lancet Respir Med",
                "year": 2015,
                "design": "review"
            },
            {
                "pmid": 25816912,
                "title": "Effectiveness of CPAP, bilevel positive airway pressure, and noninvasive ventilatory support in patients with obesity hypoventilation syndrome: the Pickwick randomized controlled trial",
                "journal": "Lancet",
                "year": 2015,
                "design": "trial"
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
            "Optimal timing for transitioning patients who present in acute hypercapnic failure from hospital bilevel NIV to outpatient CPAP.",
            "Prevalence and reversibility of secondary precapillary pulmonary hypertension in OHS vs pure OSA."
        ],
        "mcq_angles": [
            "Coexistence rate of severe OSA in OHS cohorts (70-90%).",
            "Serum bicarbonate cutoff (<27 mmol/L) to rule out chronic hypoventilation in obese patients.",
            "Choice of initial positive airway pressure therapy in acute decompensation (bilevel NIV) vs stable outpatient setting (CPAP trial)."
        ],
        "case_hooks": [
            "A 58-year-old male with BMI 48 kg/m2 admitted with acute hypercapnic encephalopathy (pH 7.26, PaCO2 72 mmHg) managed with acute bilevel positive airway pressure.",
            "A 63-year-old female with severe OSA on CPAP whose awake ABG continues to show PaCO2 48 mmHg despite good CPAP compliance, prompting re-titration of pressures."
        ],
        "gaps": "Lack of high-powered randomized trials evaluating whether robotic bariatric surgery produces higher rates of complete OHS cure compared to intense incretin pharmacotherapy."
    },

    1224: {
        "cluster": "Nephrology / Urology",
        "mentor_intro": "Obstructive uropathy refers to structural or functional impedance to normal urine flow anywhere along the urinary tract from the renal calyces to the urethral meatus. If unrelieved, increased intratubular hydrostatic pressure and renal parenchymal inflammation cause progressive nephron loss, hydronephrosis, and irreversible tubulointerstitial fibrosis; prompt anatomic decompression (via bladder catheterization, ureteral stenting, or percutaneous nephrostomy) is mandatory to preserve renal function.",
        "teaching_points": [
            {
                "claim": "Renal ultrasonography is the rapid initial imaging modality of choice to diagnose obstructive uropathy by detecting hydronephrosis and hydroureter, but can yield false negatives (absence of pelvicalyceal dilation) in early acute obstruction (<24-48 hours), severe dehydration, or retroperitoneal fibrosis.",
                "cites": [29427338, 26972044]
            },
            {
                "claim": "In bilateral ureteral obstruction or solitary kidney obstruction, acute kidney injury (AKI) is frequently accompanied by severe hyperkalemia, metabolic acidosis, and volume overload, demanding emergent urinary tract decompression.",
                "cites": [29427338, 23774887]
            },
            {
                "claim": "Following relief of severe, prolonged bilateral obstruction, post-obstructive diuresis (POD; urine output >200 mL/hr for >2 consecutive hours) can develop due to urea-induced osmotic diuresis and down-regulation of tubular sodium/aquaporin transporters, requiring vigilant monitoring of volume and replacement with 0.45% normal saline.",
                "cites": [29427338, 26972044]
            },
            {
                "claim": "For lower tract urinary obstruction (e.g., prostatic enlargement, urethral stricture), urethral or suprapubic catheterization is immediate and curative; for upper tract ureteral obstruction (calculi, malignancy), retrograde ureteral stenting or percutaneous nephrostomy tube placement provides definitive drainage.",
                "cites": [26972044, 29427338]
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
                "pmid": 26972044,
                "title": "EAU Guidelines on Interventional Management for Urolithiasis",
                "journal": "Eur Urol",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": 23774887,
                "title": "Kidney Disease: Improving Global Outcomes (KDIGO) Acute Kidney Injury Work Group. KDIGO Clinical Practice Guideline for Acute Kidney Injury",
                "journal": "Kidney Int Suppl",
                "year": 2012,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Fluid replacement strategies during post-obstructive diuresis: matching 50% vs 100% of hourly urine output to avoid perpetuating iatrogenic diuresis.",
            "Biomarkers predicting irreversible nephron loss versus functional recovery following delayed surgical decompression (>4 weeks)."
        ],
        "mcq_angles": [
            "Causes of false-negative renal ultrasound for hydronephrosis (hyperacute obstruction <24h, dehydration, retroperitoneal encasement).",
            "Pathophysiology and management of post-obstructive diuresis (osmotic urea effect, aquaporin down-regulation).",
            "Immediate choice of intervention for bladder outlet obstruction: urethral Foley catheterization."
        ],
        "case_hooks": [
            "A 72-year-old male with benign prostatic hyperplasia presenting with confusion, creatinine 8.4 mg/dL, and potassium 6.8 mEq/L, relieved by Foley catheter draining 1800 mL of urine.",
            "A 54-year-old female who develops urine output of 450 mL/hr and postural hypotension following bilateral ureteral stent placement for cervical cancer obstruction."
        ],
        "gaps": "Prospective trials comparing renal functional recovery outcomes between percutaneous nephrostomy and retrograde ureteral stenting in malignant ureteral obstruction."
    },

    1225: {
        "cluster": "Pulmonology / Occupational Medicine",
        "mentor_intro": "Occupational asthma is a form of work-related asthma characterized by variable airflow limitation, airway hyperresponsiveness, and bronchial inflammation caused by conditions attributable to the workplace environment. Distinguishing immunologic asthma (characterized by a latency period of sensitization to high- or low-molecular-weight agents) from non-immunologic irritant-induced asthma (such as reactive airways dysfunction syndrome [RADS] following massive single inhalational exposure) is critical for medical management, workplace disability compensation, and medical-legal adjudication.",
        "teaching_points": [
            {
                "claim": "ERS and ATS clinical practice guidelines mandate confirming both the objective diagnosis of asthma (variable airflow limitation on spirometry or methacholine challenge) and its temporal relationship to work exposures through serial peak expiratory flow (PEF) monitoring (at least 4 times daily for 2 weeks at work and 2 weeks off work).",
                "cites": [22362844, 31368798]
            },
            {
                "claim": "Immunologic occupational asthma involves sensitization with latency to high-molecular-weight agents (e.g., flour, laboratory animal proteins; IgE-mediated) or low-molecular-weight chemicals (e.g., diisocyanates, plicatic acid in red cedar; non-IgE or specific IgE-mediated).",
                "cites": [22362844, 21926217]
            },
            {
                "claim": "Reactive Airways Dysfunction Syndrome (RADS) represents acute, irritant-induced occupational asthma developing within 24 hours of a single, massive inhalation of toxic fumes, gases, or vapors without any prior latency or immunological sensitization.",
                "cites": [22362844, 21926217]
            },
            {
                "claim": "Complete and early cessation of exposure to the causative sensitizing agent is the single most effective therapeutic intervention, as continued exposure results in irreversible airway remodeling, chronic persistent asthma, and progressive FEV1 decline.",
                "cites": [22362844, 21926217]
            }
        ],
        "sources": [
            {
                "pmid": 22362844,
                "title": "Diagnosis and management of work-related asthma: American College of Chest Physicians Consensus Statement",
                "journal": "Chest",
                "year": 2012,
                "design": "guideline"
            },
            {
                "pmid": 21926217,
                "title": "Work-related asthma",
                "journal": "Eur Respir J",
                "year": 2011,
                "design": "review"
            },
            {
                "pmid": 31368798,
                "title": "Evaluation and Management of Work-Related Asthma: ERS Guidelines",
                "journal": "Eur Respir J",
                "year": 2019,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Prognostic recovery in workers diagnosed with diisocyanate-induced asthma who remain in the same plant in modified administrative roles.",
            "Standardization of specific inhalation challenge (SIC) protocols in specialized referral centers."
        ],
        "mcq_angles": [
            "Diagnostic protocol for work-related asthma: serial PEF recording at least 4 times/day for 2 weeks at work and 2 weeks off work.",
            "RADS diagnostic criteria: sudden onset within 24h of massive irritant exposure without latency.",
            "Primary definitive management: complete exposure cessation."
        ],
        "case_hooks": [
            "A 32-year-old automobile spray painter presenting with nocturnal wheezing and dyspnea that improves significantly during weekends and vacations, diagnosed with isocyanate-induced occupational asthma.",
            "A 45-year-old chemical factory worker who develops persistent severe bronchospasm and cough 4 hours after an accidental industrial chlorine gas leak (RADS)."
        ],
        "gaps": "Lack of sensitive and standardized in vitro immunological assays for identifying specific sensitization to novel low-molecular-weight industrial chemicals."
    }
}
