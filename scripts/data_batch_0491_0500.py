#!/usr/bin/env python3
"""
data_batch_0491_0500.py

Clinical mentor drafts for Sheet 2 / Topics 251-500: Batch 17 (Topics 491 to 500).
Fully evidence-grounded, landmark trial and guideline backed, zero boilerplate.
"""

BATCH_SHEET2_B17 = {
    491: {
        "cluster": "Hematology / Dermatology / Oncology",
        "mentor_intro": "Cutaneous T-cell lymphomas (CTCL) represent a heterogeneous group of non-Hodgkin lymphomas characterized by neoplastic clonal proliferation of skin-homing CD4+ mature memory T lymphocytes. Mycosis fungoides (MF) is the most prevalent indolent form, displaying an evolution from erythematous patches to indurated plaques and exophytic cutaneous tumors with classic epidermotropism of atypical cerebriform lymphocytes. In contrast, Sézary syndrome (SS) is an aggressive leukemic variant defined by the clinical triad of generalized erythroderma, diffuse lymphadenopathy, and circulating clonal Sézary cells (>=1,000/mcL or CD4/CD8 ratio >=10). Staging follows the ISCL/EORTC TNMB system. Early-stage MF (stages IA-IIA) is managed with skin-directed modalities (topical corticosteroids, nitrogen mustard, phototherapy, total skin electron beam). In advanced-stage disease and Sézary syndrome, targeted systemic therapies—specifically mogamulizumab (anti-CCR4 monoclonal antibody, MAVORIC trial) and brentuximab vedotin (CD30 antibody-drug conjugate, ALCANZA trial)—have transformed survival and quality of life.",
        "teaching_points": [
            {
                "claim": "In previously treated cutaneous T-cell lymphoma (mycosis fungoides and Sézary syndrome), the randomized phase 3 MAVORIC trial demonstrated that the anti-CCR4 monoclonal antibody mogamulizumab achieved significantly longer progression-free survival (7.7 vs 3.1 months, hazard ratio 0.53) and markedly superior overall response rates compared to vorinostat, with dramatic clearance of blood and skin compartment disease.",
                "cites": [30100375, 28365529]
            },
            {
                "claim": "In CD30-positive cutaneous T-cell lymphoma, the randomized phase 3 ALCANZA trial proved that the CD30-targeted antibody-drug conjugate brentuximab vedotin achieved an objective response lasting at least 4 months in 56.3% of patients compared to 12.5% with physician's choice (methotrexate or bexarotene), establishing brentuximab as a primary targeted systemic agent.",
                "cites": [28600132, 28365529]
            },
            {
                "claim": "Sézary syndrome is formally diagnosed by erythroderma involving >=80% of body surface area, generalized lymphadenopathy, and confirmed peripheral blood leukemic involvement (B2 stage: absolute Sézary cell count >=1,000/mcL, CD4/CD8 ratio >=10, or expanded CD4+CD26- or CD4+CD7- T-cell populations by flow cytometry).",
                "cites": [17540847, 30100375]
            },
            {
                "claim": "Early-stage mycosis fungoides (stages IA-IIA: limited patches and plaques without tumors, erythrodermic, or nodal involvement) is treated with skin-directed therapies (narrowband UVB, PUVA, topical nitrogen mustard/mechlorethamine gel, or high-potency corticosteroids), maintaining an indolent course with normal life expectancy in stage IA.",
                "cites": [28365529, 17540847]
            }
        ],
        "uncertainties": [
            "The sequencing and combination of mogamulizumab with extracorporeal photopheresis (ECP) or low-dose interferon-alpha in refractory Sézary syndrome.",
            "Long-term disease-free survival and graft-versus-lymphoma efficacy of allogeneic hematopoietic stem cell transplantation in young, fit patients with advanced transformed MF."
        ],
        "mcq_angles": [
            "Selecting mogamulizumab (anti-CCR4) as superior to vorinostat for cutaneous T-cell lymphoma with blood involvement based on MAVORIC.",
            "Identifying brentuximab vedotin as the targeted therapy of choice for CD30-expressing mycosis fungoides based on ALCANZA.",
            "Recognizing an absolute Sézary cell count >=1,000/mcL or CD4/CD8 ratio >=10 as the criteria for B2 blood involvement in Sézary syndrome."
        ],
        "case_hooks": [
            "A 62-year-old male presenting with generalized intense pruritus, scaling erythroderma covering 90% of his body surface area, and flow cytometry demonstrating CD4/CD8 ratio of 16 with clonal T-cell receptor rearrangement (Sézary syndrome).",
            "A 48-year-old female with biopsy-proven CD30+ large cell-transformed mycosis fungoides refractory to PUVA phototherapy and oral bexarotene, initiated on brentuximab vedotin."
        ],
        "gaps": "Clinicians often prescribe multi-agent cytotoxic chemotherapy (such as CHOP) for early mycosis fungoides, unaware that aggressive systemic chemotherapy provides only transient responses, impairs host immunity, and causes fatal opportunistic infections without improving survival compared to skin-directed therapy.",
        "sources": [
            {
                "pmid": 30100375,
                "title": "Mogamulizumab versus vorinostat in previously treated cutaneous T-cell lymphoma (MAVORIC): an international, open-label, randomised, controlled phase 3 trial",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": 28600132,
                "title": "Brentuximab vedotin versus physician's choice in CD30-positive cutaneous T-cell lymphoma (ALCANZA): an international, open-label, randomised, phase 3, multicentre trial",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": 28365529,
                "title": "European Organisation for Research and Treatment of Cancer consensus recommendations for the treatment of mycosis fungoides/Sézary syndrome - Update 2017",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 17540847,
                "title": "Revisions to the staging and classification of mycosis fungoides and Sézary syndrome: a proposal of the ISCL and EORTC",
                "year": 2007,
                "design": "consensus-guideline"
            }
        ]
    },
    492: {
        "cluster": "Pulmonology / Medical Genetics",
        "mentor_intro": "Cystic fibrosis (CF) is an autosomal recessive monogenic disease caused by loss-of-function mutations in the cystic fibrosis transmembrane conductance regulator (CFTR) gene, which encodes an ATP-binding cassette anion channel transporting chloride and bicarbonate across mucosal epithelial surfaces. The commonest mutation, F508del (present on at least one allele in ~85-90% of CF patients), causes protein misfolding, defective processing, and premature proteasomal degradation (Class II defect). Triple-combination CFTR modulator therapy with elexacaftor-tezacaftor-ivacaftor (ETI) represents one of the most successful translational breakthroughs in genetic medicine. Elexacaftor and tezacaftor function as molecular chaperones ('correctors') binding distinct sites on the nascent CFTR protein to rescue cellular trafficking to the apical plasma membrane, while ivacaftor acts as a channel 'potentiator' increasing channel open probability. ETI therapy dramatically improves lung function, eliminates exacerbations, and normalizes sweat chloride.",
        "teaching_points": [
            {
                "claim": "In patients with cystic fibrosis aged 12 years and older with at least one F508del CFTR allele, triple-combination elexacaftor-tezacaftor-ivacaftor (ETI) produced an unprecedented 14.3 percentage-point increase in percent predicted FEV1, a 63% reduction in annualized pulmonary exacerbations, and a 41.8 mmol/L reduction in sweat chloride concentration compared to placebo (NEJM 2019 trial).",
                "cites": [31697873, 31679946]
            },
            {
                "claim": "In patients homozygous for the F508del mutation who were already receiving dual tezacaftor-ivacaftor, adding elexacaftor yielded an additional 10.0 percentage-point improvement in percent predicted FEV1 and reduced sweat chloride by 45.1 mmol/L (Lancet 2019 trial).",
                "cites": [31679946, 31697873]
            },
            {
                "claim": "Ivacaftor monotherapy functions as a CFTR potentiator that locks open the channel gate, demonstrating dramatic clinical efficacy specifically in patients with CFTR gating mutations (Class III defects, predominantly G551D), increasing FEV1 by 10.6 percentage points and reducing sweat chloride below the 60 mmol/L diagnostic threshold (NEJM 2011 trial).",
                "cites": [22047565, 31697873]
            },
            {
                "claim": "Safety surveillance during elexacaftor-tezacaftor-ivacaftor therapy requires baseline and quarterly liver enzyme monitoring (due to drug-induced transaminitis) and baseline ophthalmological screening for cataracts in pediatric and adolescent patients.",
                "cites": [31697873, 25981758]
            }
        ],
        "uncertainties": [
            "The feasibility and clinical safety of stopping conventional chronic inhaled mucolytics (dornase alfa, hypertonic saline) in patients with sustained normalization of lung function on ETI (SIMPLIFY study).",
            "Development of novel gene-editing and nucleic acid therapies for the 10-15% of CF patients with nonsense or rare non-responsive CFTR mutations."
        ],
        "mcq_angles": [
            "Identifying the molecular mechanism of elexacaftor-tezacaftor-ivacaftor: dual correctors that facilitate protein folding/trafficking plus a potentiator that increases chloride channel open probability.",
            "Selecting ivacaftor monotherapy as the targeted treatment for Class III gating mutations (G551D).",
            "Recognizing that elexacaftor-tezacaftor-ivacaftor is indicated for patients harboring at least one copy of the F508del mutation regardless of the second allele."
        ],
        "case_hooks": [
            "A 16-year-old female with cystic fibrosis heterozygous for F508del and a minimal-function mutation presenting with FEV1 58% predicted and 4 pulmonary exacerbations in the past year, who achieves an FEV1 of 74% and normal sweat chloride 3 months post-ETI initiation.",
            "A 24-year-old male with CF possessing the G551D gating mutation whose sweat chloride drops from 104 mmol/L to 38 mmol/L following ivacaftor monotherapy."
        ],
        "gaps": "Clinicians often fail to recognize that sweat chloride concentration can normalize (<30-60 mmol/L) on triple CFTR modulator therapy, mistakenly assuming that sweat chloride remains permanently fixed in cystic fibrosis.",
        "sources": [
            {
                "pmid": 31697873,
                "title": "Elexacaftor-Tezacaftor-Ivacaftor for Cystic Fibrosis with a Single Phe508del Allele",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": 31679946,
                "title": "Efficacy and safety of the elexacaftor plus tezacaftor plus ivacaftor combination regimen in people with cystic fibrosis homozygous for the F508del mutation: a double-blind, randomised, phase 3 trial",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": 22047565,
                "title": "A CFTR potentiator in patients with cystic fibrosis and the G551D mutation",
                "year": 2011,
                "design": "trial"
            },
            {
                "pmid": 25981758,
                "title": "Lumacaftor-Ivacaftor in Patients with Cystic Fibrosis Homozygous for Phe508del CFTR",
                "year": 2015,
                "design": "trial"
            }
        ]
    },
    493: {
        "cluster": "Pulmonology / Internal Medicine",
        "mentor_intro": "Advances in nutritional management, aggressive airway clearance, and CFTR modulator therapies have transformed cystic fibrosis (CF) into an adult medical specialty, with over 55-60% of individuals with CF now living into adulthood. Comprehensive care in adults centers on preventing progressive bronchiectasis, maintaining pulmonary hygiene, and proactively screening for multi-organ complications. Chronic maintenance pulmonary regimens incorporate inhaled mucolytics (inhaled recombinant human DNase [dornase alfa] and 7% hypertonic saline) to restore airway surface liquid depth and cleave neutrophil-derived DNA. Chronic endobronchial infection with Pseudomonas aeruginosa demands cycled inhaled antipseudomonal antibiotics (nebulized tobramycin or colistimethate). Adult non-pulmonary complications are ubiquitous: Cystic Fibrosis-Related Diabetes (CFRD) develops in up to 40-50% of adults, exocrine pancreatic insufficiency requires tailored enzyme replacement (PERT), and bone disease warrants serial dual-energy x-ray absorptiometry.",
        "teaching_points": [
            {
                "claim": "Cystic Fibrosis-Related Diabetes (CFRD) is the most common non-pulmonary comorbidity in adult CF (prevalence >40-50% by age 30), requiring mandatory annual screening with a 2-hour 75-gram oral glucose tolerance test (OGTT); HbA1c is insensitive in CF due to high erythrocyte turnover and is not recommended for diagnosis.",
                "cites": [21115771, 29456079]
            },
            {
                "claim": "Insulin is the only recommended pharmacological therapy for CFRD; oral hypoglycemic agents (sulfonylureas, metformin) are ineffective and not recommended due to primary insulinopenia caused by islet cell destruction from sticky exocrine secretions.",
                "cites": [21115771, 29456079]
            },
            {
                "claim": "Inhaled dornase alfa (recombinant human DNase, 2.5 mg once daily) and nebulized 7% hypertonic saline are guideline-recommended maintenance therapies that cleave extracellular DNA from degenerate neutrophils and hydrate dehydrated mucus, significantly improving FEV1 and reducing exacerbation frequency.",
                "cites": [23540861, 17761616]
            },
            {
                "claim": "In patients with chronic endobronchial colonization with Pseudomonas aeruginosa, long-term alternating-month suppression with inhaled tobramycin (300 mg twice daily, 28 days on, 28 days off) preserves lung function and prevents acute infective exacerbations.",
                "cites": [17761616, 23540861]
            }
        ],
        "uncertainties": [
            "The long-term incidence of colorectal adenocarcinoma in adults with CF on CFTR modulators, where guidelines recommend initiating colonoscopy screening at age 40 (or age 30 in organ transplant recipients).",
            "Optimal eradication protocols for initial pulmonary colonization with non-tuberculous mycobacteria, particularly Mycobacterium abscessus."
        ],
        "mcq_angles": [
            "Identifying annual 2-hour 75g oral glucose tolerance testing (OGTT) as the only validated screening test for CFRD, rejecting HbA1c.",
            "Selecting insulin as the exclusive pharmacotherapy for CFRD, avoiding oral hypoglycemic medications.",
            "Selecting 28-day on / 28-day off inhaled tobramycin cycles for chronic Pseudomonas suppression."
        ],
        "case_hooks": [
            "A 27-year-old female with adult CF whose annual 2-hour post-OGTT plasma glucose is 218 mg/dL despite a normal HbA1c of 5.6%, initiated on basal-bolus subcutaneous insulin.",
            "A 31-year-old male with CF and chronic productive cough whose sputum culture grows mucoid Pseudomonas aeruginosa, started on cycled inhaled tobramycin."
        ],
        "gaps": "Clinicians frequently rely on HbA1c to screen for diabetes in adult cystic fibrosis patients, failing to diagnose CFRD in up to 50% of affected adults whose rapid red cell turnover produces falsely normal HbA1c levels.",
        "sources": [
            {
                "pmid": 21115771,
                "title": "Clinical care guidelines for cystic fibrosis-related diabetes: a position statement of the ADA and a clinical practice guideline of the CFF",
                "year": 2010,
                "design": "guideline"
            },
            {
                "pmid": 23540861,
                "title": "Cystic fibrosis pulmonary guidelines. Chronic medications for maintenance of lung health",
                "year": 2013,
                "design": "guideline"
            },
            {
                "pmid": 17761616,
                "title": "Cystic fibrosis pulmonary guidelines: chronic medications for maintenance of lung health",
                "year": 2007,
                "design": "guideline"
            },
            {
                "pmid": 29456079,
                "title": "ECFS best practice guidelines: the 2018 revision",
                "year": 2018,
                "design": "guideline"
            }
        ]
    },
    494: {
        "cluster": "Infectious Diseases / Transplant Medicine",
        "mentor_intro": "Cytomegalovirus (CMV) is the single most common and clinically impactful opportunistic viral pathogen in solid organ transplantation (SOT) and allogeneic hematopoietic cell transplantation (HCT). CMV exerts direct pathogenic effects (CMV syndrome with fever, bone marrow suppression, and tissue-invasive disease such as pneumonitis, hepatitis, colitis, and retinitis) and indirect immunomodulatory sequelae (accelerated vascular graft rejection, opportunistic bacterial/fungal coinfections, and decreased graft survival). Risk stratification is dictated by pre-transplant donor (D) and recipient (R) CMV IgG serostatus: D+/R- represents the highest risk in SOT, while R+ represents the highest reactivation risk in HCT. Prevention utilizes two primary strategies: universal pharmacological prophylaxis versus preemptive therapy. In HCT, letermovir has established a non-myelosuppressive prophylactic standard, while maribavir treats refractory CMV.",
        "teaching_points": [
            {
                "claim": "In high-risk solid organ transplant recipients (CMV donor-positive, recipient-negative [D+/R-]), extended universal prophylaxis with oral valganciclovir (900 mg once daily) for 200 days significantly reduced CMV disease at 12 months from 36.8% to 16.1% compared to traditional 100-day prophylaxis (IMPACT trial).",
                "cites": [20353469, 29596127]
            },
            {
                "claim": "In CMV-seropositive allogeneic hematopoietic cell transplant recipients (R+), letermovir—a novel viral DNA terminase complex inhibitor (pUL56)—administered through day 100 post-transplant significantly reduced clinically significant CMV infection from 60.6% to 37.5% and reduced all-cause 24-week mortality without inducing myelosuppression or nephrotoxicity (NEJM 2017 trial).",
                "cites": [29211658, 29596127]
            },
            {
                "claim": "Maribavir, an oral competitive inhibitor of the CMV UL97 protein kinase, achieved significantly superior CMV viremia clearance at week 8 compared to investigator-assigned therapy (ganciclovir, valganciclovir, foscarnet, or cidofovir) in transplant recipients with refractory or resistant CMV infection (SOLSTICE trial).",
                "cites": [36449718, 29596127]
            },
            {
                "claim": "Preemptive therapy relies on serial weekly surveillance of quantitative plasma CMV PCR, initiating therapeutic doses of oral valganciclovir (900 mg twice daily) or intravenous ganciclovir as soon as viral replication surpasses a predefined institution-specific threshold prior to symptom onset.",
                "cites": [29596127, 20353469]
            }
        ],
        "uncertainties": [
            "The long-term development of UL56 mutations conferring resistance to letermovir during extended prophylaxis (>200 days) in high-risk graft-versus-host disease (GVHD) patients.",
            "The role of CMV-specific cell-mediated immunity assays (e.g., QuantiFERON-CMV or EliSPOT) in guiding safe early cessation of antiviral prophylaxis."
        ],
        "mcq_angles": [
            "Identifying D+/R- serostatus as conferring the highest risk of CMV disease in solid organ transplantation.",
            "Selecting letermovir as the non-myelosuppressive viral terminase inhibitor approved for CMV prophylaxis in allogeneic HCT based on its landmark NEJM trial.",
            "Selecting 200 days of valganciclovir prophylaxis over 100 days for D+/R- kidney transplant recipients based on the IMPACT trial."
        ],
        "case_hooks": [
            "A 46-year-old CMV-negative female receiving a kidney transplant from a CMV-positive deceased donor (D+/R-), initiated on valganciclovir 900 mg daily with plans for a 200-day course.",
            "A 52-year-old male with acute myeloid leukemia post-allogeneic stem cell transplant (recipient CMV-positive) who receives letermovir 480 mg daily through day 100, maintaining normal neutrophil counts."
        ],
        "gaps": "Clinicians often administer ganciclovir or valganciclovir for CMV prophylaxis in allogeneic HCT recipients, causing severe neutropenia and graft failure, unaware that letermovir specifically inhibits the viral terminase without any bone marrow toxicity.",
        "sources": [
            {
                "pmid": 29211658,
                "title": "Letermovir Prophylaxis for Cytomegalovirus in Hematopoietic-Cell Transplantation",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": 20353469,
                "title": "The impact of extended valganciclovir prophylaxis on cytomegalovirus disease in high-risk kidney transplant recipients (IMPACT)",
                "year": 2010,
                "design": "trial"
            },
            {
                "pmid": 36449718,
                "title": "Maribavir for Refractory or Resistant Cytomegalovirus Infections in Transplant Recipients (SOLSTICE)",
                "year": 2022,
                "design": "trial"
            },
            {
                "pmid": 29596127,
                "title": "The Third International Consensus Guidelines on the Management of Cytomegalovirus in Solid-organ Transplantation",
                "year": 2018,
                "design": "guideline"
            }
        ]
    },
    495: {
        "cluster": "Cardiovascular Medicine / Hematology",
        "mentor_intro": "The randomized RE-LY trial (Randomized Evaluation of Long-Term Anticoagulation Therapy) marked the historic transition from vitamin K antagonists to direct oral anticoagulants (DOACs) for stroke prevention in non-valvular atrial fibrillation (AF). Dabigatran etexilate is an oral prodrug rapidly converted by serum esterases to dabigatran, a potent, reversible direct thrombin (Factor IIa) inhibitor. In RE-LY (18,113 patients), dabigatran was evaluated at two blinded doses (150 mg twice daily and 110 mg twice daily) against open-label dose-adjusted warfarin (INR 2.0-3.0). The 150 mg BID dose achieved a superior 35% reduction in stroke and systemic embolism with similar major bleeding, while the 110 mg BID dose matched warfarin's stroke prevention with a 20% reduction in major bleeding. Crucially, both dabigatran doses cut lethal intracranial hemorrhage by ~70%. Idarucizumab provides immediate targeted reversal for emergent bleeding or urgent surgery.",
        "teaching_points": [
            {
                "claim": "In the landmark RE-LY trial (18,113 patients with non-valvular atrial fibrillation), dabigatran 150 mg twice daily significantly reduced stroke or systemic embolism by 35% compared to dose-adjusted warfarin (1.11% vs 1.69% per year, relative risk 0.66) with comparable rates of major bleeding (3.11% vs 3.36% per year).",
                "cites": [19717844, 24315314]
            },
            {
                "claim": "Dabigatran 110 mg twice daily demonstrated non-inferiority to warfarin for stroke prevention (1.53% vs 1.69% per year) while achieving a statistically significant 20% reduction in major bleeding (2.71% vs 3.36% per year).",
                "cites": [19717844, 32860505]
            },
            {
                "claim": "Both doses of dabigatran (110 mg and 150 mg twice daily) achieved dramatic, statistically significant reductions in intracranial hemorrhage compared to warfarin (0.23% and 0.30% vs 0.74% per year; relative risk reductions of 69% and 60%).",
                "cites": [19717844, 24315314]
            },
            {
                "claim": "Idarucizumab, a humanized monoclonal antibody Fab fragment that binds dabigatran with 350-fold higher affinity than thrombin, completely reverses dabigatran-induced anticoagulation within minutes in patients with uncontrolled life-threatening bleeding or requiring emergent surgery (RE-VERSE AD trial).",
                "cites": [28693366, 32860505]
            }
        ],
        "uncertainties": [
            "The clinical efficacy and safe dosing of dabigatran in patients with advanced chronic kidney disease (eGFR 15-29 mL/min/1.73m²), where 80% renal clearance increases drug accumulation.",
            "Long-term gastrointestinal tolerability in patients who develop persistent dyspepsia from the tartaric acid core of dabigatran capsules."
        ],
        "mcq_angles": [
            "Selecting dabigatran 150 mg BID as superior to warfarin for stroke prevention in non-valvular AF based on the RE-LY trial.",
            "Recognizing that direct oral anticoagulants consistently reduce intracranial hemorrhage by >50-70% compared to warfarin.",
            "Selecting idarucizumab as the specific, immediate reversal agent for dabigatran based on RE-VERSE AD."
        ],
        "case_hooks": [
            "A 71-year-old male with non-valvular AF and CHA2DS2-VASc score of 3 taking dabigatran 150 mg BID who is brought to the ED following a motor vehicle collision with an acute subdural hematoma requiring emergency craniotomy, receiving IV idarucizumab.",
            "A 68-year-old female with persistent AF and normal renal function evaluated for DOAC initiation whose primary priority is maximizing stroke reduction, initiated on dabigatran 150 mg BID."
        ],
        "gaps": "Clinicians often attempt to reverse dabigatran with prothrombin complex concentrate (PCC) or vitamin K, unaware that a targeted specific reversal antibody (idarucizumab) exists that neutralizes free dabigatran within minutes without thrombogenic risk.",
        "sources": [
            {
                "pmid": 19717844,
                "title": "Dabigatran versus warfarin in patients with atrial fibrillation (RE-LY)",
                "year": 2009,
                "design": "trial"
            },
            {
                "pmid": 28693366,
                "title": "Idarucizumab for Dabigatran Reversal - Full Cohort Analysis (RE-VERSE AD)",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": 24315314,
                "title": "Comparison of the efficacy and safety of new oral anticoagulants with warfarin in patients with atrial fibrillation: a meta-analysis of randomised trials",
                "year": 2014,
                "design": "meta-analysis"
            },
            {
                "pmid": 32860505,
                "title": "2020 ESC Guidelines for the diagnosis and management of atrial fibrillation",
                "year": 2021,
                "design": "guideline"
            }
        ]
    },
    496: {
        "cluster": "Neurology / Neurosurgery",
        "mentor_intro": "Deep brain stimulation (DBS) is an established, neuromodulatory therapy for advanced Parkinson's disease (PD) complicated by motor fluctuations, disabling 'off' periods, or levodopa-induced dyskinesias refractory to optimized medical regimens. Patient selection criteria are strict: confirmed idiopathic PD with documented dopaminergic responsiveness (>=30% improvement in UPDRS motor scores following acute levodopa challenge), absence of significant dementia or major depression, and realistic expectations. Selecting the anatomical stimulation target—the Subthalamic Nucleus (STN) versus the Globus Pallidus internus (GPi)—requires tailoring to individual patient phenotypes. Multicenter randomized trials (including the VA/NINDS cooperative trial and NSTAPS) demonstrate comparable primary motor efficacy between STN and GPi. However, STN-DBS permits substantial reduction in daily levodopa-equivalent doses (~50%) but carries higher risks of neurocognitive decline, executive dysfunction, and mood lability; GPi-DBS directly suppresses dyskinesia with greater cognitive and psychiatric safety.",
        "teaching_points": [
            {
                "claim": "In the landmark VA/NINDS randomized controlled trial comparing bilateral STN versus GPi deep brain stimulation in advanced Parkinson's disease, both surgical targets achieved identical improvements in 'on' time without dyskinesia (mean increase of 4.1 hours/day) and equivalent motor function improvement on the UPDRS.",
                "cites": [20519680, 23168021]
            },
            {
                "claim": "STN-DBS allows significant reduction of dopaminergic medications (average 50% decrease in levodopa-equivalent daily dose), whereas GPi-DBS does not permit major medication reduction but exerts direct, potent suppression of levodopa-induced dyskinesias.",
                "cites": [20519680, 23406026]
            },
            {
                "claim": "GPi-DBS demonstrates superior neurocognitive and psychiatric safety, with significantly less decline in verbal fluency, processing speed, and depressive mood scores compared to STN-DBS, making GPi the preferred target for older patients with borderline cognitive reserve.",
                "cites": [20519680, 23168021]
            },
            {
                "claim": "The randomized EARLYSTIM trial proved that initiating bilateral STN stimulation at early appearance of motor fluctuations (mean PD duration 7.5 years) significantly improved quality of life and motor disability compared to medical therapy alone, establishing earlier intervention before irreversible vocational disability.",
                "cites": [23406026, 16943402]
            }
        ],
        "uncertainties": [
            "The long-term therapeutic utility and battery efficiency of closed-loop adaptive DBS (aDBS) utilizing local field potentials (beta-band suppression) compared to continuous open-loop stimulation.",
            "Optimal surgical targeting for axial gait freezing and postural instability using pedunculopontine nucleus (PPN) stimulation."
        ],
        "mcq_angles": [
            "Differentiating STN vs GPi DBS: STN allows marked dopaminergic drug reduction but has higher cognitive risk; GPi has superior cognitive safety and directly suppresses dyskinesias.",
            "Identifying >=30% improvement on acute levodopa challenge test as the key motor inclusion criterion for DBS candidates.",
            "Recognizing that STN-DBS in early motor fluctuations significantly improves quality of life based on the EARLYSTIM trial."
        ],
        "case_hooks": [
            "A 61-year-old male with 9-year idiopathic PD experiencing 5 hours of disabling 'off' time daily and violent peak-dose dyskinesias on levodopa 1,200 mg/day with intact cognition (MoCA 29/30), undergoing bilateral STN-DBS with 55% medication reduction.",
            "A 69-year-old female with advanced PD, severe levodopa-induced choreoathetosis, and mild executive cognitive decline (MoCA 23/30), selected for bilateral GPi-DBS to safeguard cognitive function."
        ],
        "gaps": "Clinicians often defer DBS evaluation until patients are end-stage, wheelchair-bound, or demented, missing the therapeutic window when patients have preserved cognition and demonstrable levodopa responsiveness as proven in EARLYSTIM.",
        "sources": [
            {
                "pmid": 20519680,
                "title": "Pallidal versus subthalamic deep-brain stimulation for Parkinson's disease",
                "year": 2010,
                "design": "trial"
            },
            {
                "pmid": 23406026,
                "title": "Neurostimulation for Parkinson's disease with early motor complications (EARLYSTIM)",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": 23168021,
                "title": "Subthalamic nucleus versus globus pallidus bilateral deep brain stimulation for advanced Parkinson's disease (NSTAPS study): a randomised controlled trial",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": 16943402,
                "title": "A randomized trial of deep-brain stimulation for Parkinson's disease",
                "year": 2006,
                "design": "trial"
            }
        ]
    },
    497: {
        "cluster": "Hematology / Vascular Medicine",
        "mentor_intro": "Deep vein thrombosis (DVT) is a major manifestation of venous thromboembolism (VTE) with significant risks of fatal pulmonary embolism (PE) and long-term post-thrombotic syndrome (PTS). Diagnostic evaluation integrates the two-level Wells DVT pre-test probability score with high-sensitivity D-dimer testing: in patients categorized as 'DVT unlikely' (Wells score <=1), a negative D-dimer safely excludes DVT without imaging. In 'DVT likely' patients or those with elevated D-dimer, venous duplex compression ultrasonography (CUS)—evaluating non-compressibility of venous lumina—is the definitive imaging standard. Anticoagulation therapy has shifted from heparin/warfarin bridging to direct oral anticoagulants (DOACs: apixaban, rivaroxaban, dabigatran, edoxaban) as preferred first-line agents. Treatment duration is stratified by provoking factors: provoked DVT associated with transient major risk factors (surgery, trauma) requires strictly 3 months, whereas unprovoked proximal DVT demands consideration of extended anticoagulation.",
        "teaching_points": [
            {
                "claim": "In patients with suspected deep vein thrombosis, a validated diagnostic algorithm combining a low-probability Wells score (<=1) with a negative high-sensitivity D-dimer safely rules out DVT without ultrasound imaging, with a 3-month thromboembolic risk <1%.",
                "cites": [14507948, 26867832]
            },
            {
                "claim": "Current CHEST guidelines strongly recommend direct oral anticoagulants (apixaban, rivaroxaban, dabigatran, or edoxaban) over vitamin K antagonists (warfarin) for the initial and extended treatment of acute deep vein thrombosis, providing equivalent antithrombotic efficacy with significantly lower major and fatal bleeding risks.",
                "cites": [26867832, 34499914]
            },
            {
                "claim": "For acute proximal DVT provoked by a major transient risk factor (e.g., major surgery, trauma, or prolonged immobilization), a fixed 3-month course of anticoagulation is recommended; extending anticoagulation beyond 3 months provides no long-term reduction in recurrence while exposing patients to ongoing bleeding risks.",
                "cites": [26867832, 34499914]
            },
            {
                "claim": "In patients with acute extensive proximal DVT, the multicenter randomized ATTRACT trial demonstrated that pharmacomechanical catheter-directed thrombolysis did not reduce the overall incidence of post-thrombotic syndrome (PTS) at 24 months (47% vs 48%) compared to anticoagulation alone, while doubling major bleeding, restricting catheter-directed interventions to severe limb-threatening phlegmasia cerulea dolens.",
                "cites": [29211679, 34499914]
            }
        ],
        "uncertainties": [
            "The clinical utility of reduced-dose DOAC regimens (e.g., apixaban 2.5 mg BID or rivaroxaban 10 mg daily) for indefinite secondary prevention beyond the initial 6 months in unprovoked DVT.",
            "Anticoagulation management and repeat surveillance imaging protocols for isolated asymptomatic muscular calf vein thrombosis."
        ],
        "mcq_angles": [
            "Selecting 3 months of anticoagulation for proximal DVT provoked by a transient surgical risk factor based on CHEST guidelines.",
            "Interpreting the ATTRACT trial: recognizing that catheter-directed thrombolysis failed to reduce overall post-thrombotic syndrome and increased bleeding.",
            "Selecting direct oral anticoagulants over warfarin as the guideline-preferred first-line therapy for acute DVT."
        ],
        "case_hooks": [
            "A 52-year-old male who develops unilateral right leg swelling and pain 2 weeks after total hip arthroplasty, with duplex ultrasound showing occlusive thrombus in the right common femoral vein, started on oral apixaban for 3 months.",
            "A 38-year-old female presenting with an unprovoked extensive iliofemoral DVT whose interventional radiologist suggests catheter-directed thrombolysis, evaluated against the evidence of the ATTRACT trial."
        ],
        "gaps": "Clinicians frequently order catheter-directed thrombolysis for routine proximal femoral DVT under the mistaken assumption that dissolving the clot prevents post-thrombotic syndrome, contrary to the landmark ATTRACT trial showing no reduction in PTS and excess major bleeding.",
        "sources": [
            {
                "pmid": 26867832,
                "title": "Antithrombotic Therapy for VTE Disease: CHEST Guideline and Expert Panel Report",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": 29211679,
                "title": "Pharmacomechanical Catheter-Directed Thrombolysis for Deep-Vein Thrombosis (ATTRACT)",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": 14507948,
                "title": "Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis",
                "year": 2003,
                "design": "trial"
            },
            {
                "pmid": 34499914,
                "title": "Antithrombotic Therapy for VTE Disease: Second Update of the CHEST Guideline and Expert Panel Report",
                "year": 2021,
                "design": "guideline"
            }
        ]
    },
    498: {
        "cluster": "Neurosurgery / Neurology",
        "mentor_intro": "Degenerative cervical myelopathy (DCM) is the most common cause of non-traumatic spinal cord dysfunction and spastic quadriparesis in adults over age 55. Encompassing cervical spondylosis, disc herniation, hypertrophy of the ligamentum flavum, and ossification of the posterior longitudinal ligament (OPLL), DCM results from chronic static mechanical spinal cord compression exacerbated by dynamic repetitive flexion-extension microtrauma, causing localized spinal cord ischemia, neuroinflammation, and apoptotic axonal degeneration. Clinical presentation is often insidious, featuring loss of fine hand dexterity (clumsiness, difficulty buttoning shirts or writing), wide-based unsteady spastic gait, Lhermitte phenomenon, hyperreflexia, positive Hoffman sign, and Babinski responses. MRI of the cervical spine is diagnostic, revealing canal stenosis and intrinsic cord hyperintensity on T2-weighted images. Severity is classified using the modified Japanese Orthopaedic Association (mJOA) score into mild (15-17), moderate (12-14), or severe (<12). Timely surgical decompression halts neurological decline.",
        "teaching_points": [
            {
                "claim": "Clinical severity of degenerative cervical myelopathy is categorized by the modified Japanese Orthopaedic Association (mJOA) 18-point scale into mild (15-17), moderate (12-14), and severe (<12), directly dictating surgical decision-making and predicting postoperative neurological recovery.",
                "cites": [28894683, 24352775]
            },
            {
                "claim": "AOSpine North America and international clinical practice guidelines strongly recommend operative surgical decompression for patients with moderate-to-severe degenerative cervical myelopathy (mJOA <15), proving that surgery halts disease progression and produces meaningful, durable improvements in functional scores and quality of life.",
                "cites": [28894683, 24352775]
            },
            {
                "claim": "In patients with mild DCM (mJOA 15-17), clinical practice guidelines recommend either structured operative decompression or a closely monitored trial of structured non-operative therapy with immediate surgical intervention upon any evidence of functional decline.",
                "cites": [28894683, 28894686]
            },
            {
                "claim": "Pathognomonic clinical physical examination findings of cervical myelopathy include the Hoffman reflex (flick of distal phalanx of middle finger inducing involuntary flexion/adduction of thumb and index finger), the inverted brachioradialis reflex, gait spasticity, and hyperreflexia with clonus.",
                "cites": [31974516, 28894683]
            }
        ],
        "uncertainties": [
            "Comparative clinical efficacy and sagittal balance preservation between anterior surgical approaches (ACDF or corpectomy) versus posterior approaches (laminectomy and fusion vs laminoplasty) in multilevel cervical stenosis.",
            "The prognostic significance and reversibility of focal T1-weighted hypointensity ('black cord sign') on preoperative cervical MRI."
        ],
        "mcq_angles": [
            "Selecting urgent surgical decompression over conservative management for moderate-to-severe DCM (mJOA <15) based on AOSpine guidelines.",
            "Identifying the Hoffman sign and loss of fine hand dexterity as physical examination hallmarks of cervical cord compression.",
            "Recognizing that non-operative therapy in moderate-to-severe DCM leads to progressive, irreversible neurological deterioration."
        ],
        "case_hooks": [
            "A 64-year-old male presenting with progressive clumsiness when typing, difficulty fastening shirt buttons, and a sensation of 'walking on cotton wool', whose exam reveals brisk 3+ reflexes, bilateral Hoffman signs, and cervical MRI showing severe cord compression at C5-C6 with T2 hyperintensity.",
            "A 70-year-old female with mild gait unsteadiness and mJOA score of 16 managed with structured serial neurological monitoring every 3 months."
        ],
        "gaps": "Clinicians often misdiagnose early degenerative cervical myelopathy as carpal tunnel syndrome, peripheral neuropathy, or normal aging, delaying neurosurgical decompression until irreversible paraparesis or sphincter dysfunction develops.",
        "sources": [
            {
                "pmid": 28894683,
                "title": "A Clinical Practice Guideline for the Management of Patients with Degenerative Cervical Myelopathy: Recommendations for Patients with Mild, Moderate, and Severe Disease and Nonmyelopathic Patients with Evidence of Cord Compression",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": 24352775,
                "title": "Efficacy and safety of surgical decompression in patients with cervical spondylotic myelopathy: results of the AOSpine North America prospective multi-center study",
                "year": 2013,
                "design": "trial"
            },
            {
                "pmid": 31974516,
                "title": "Degenerative cervical myelopathy - update and future directions",
                "year": 2020,
                "design": "review"
            },
            {
                "pmid": 28894686,
                "title": "Surgical versus conservative management of mild degenerative cervical myelopathy: a systematic review",
                "year": 2017,
                "design": "review"
            }
        ]
    },
    499: {
        "cluster": "Hematology / Transfusion Medicine",
        "mentor_intro": "Delayed Hemolytic Transfusion Reactions (DHTR) are immune-mediated complications that occur typically 3 to 14 days (up to 30 days) following red blood cell (RBC) transfusion. The underlying mechanism is an anamnestic secondary immune response: the patient was previously alloimmunized to foreign RBC antigens by prior transfusion, pregnancy, or transplantation, but circulating antibody titers subsequently waned below the detection limits of standard pre-transfusion antibody screening. Re-exposure to the cognate antigen on transfused donor RBCs triggers rapid, clonal B-cell proliferation and high-affinity IgG production. The most commonly implicated antibodies belong to the Kidd blood group system (anti-Jka, anti-Jkb), notorious for rapid titer decline and intravascular complement activation, followed by Rh (anti-E, anti-c), Duffy (anti-Fya), and Kell. In patients with sickle cell disease (SCD), DHTR can trigger catastrophic hyperhemolysis syndrome, where both transfused donor cells and autologous recipient erythrocytes are destroyed.",
        "teaching_points": [
            {
                "claim": "Delayed hemolytic transfusion reactions occur 3 to 14 days post-transfusion due to an anamnestic secondary immune response in an alloimmunized recipient whose antibody titers had waned to undetectable levels prior to transfusion, commonly involving the Kidd (anti-Jka, anti-Jkb), Rh (anti-E, anti-c), Duffy, and Kell blood group systems.",
                "cites": [2219273, 21512637]
            },
            {
                "claim": "Clinical manifestations feature an unexplained postoperative or post-transfusion hemoglobin drop, low-grade fever, indirect hyperbilirubinemia, elevated serum LDH, undetectable haptoglobin, spherocytosis on peripheral blood smear, and a newly positive direct antiglobulin test (DAT) with mixed-field agglutination.",
                "cites": [2219273, 28385782]
            },
            {
                "claim": "In patients with sickle cell disease, delayed hemolytic transfusion reactions can progress to life-threatening hyperhemolysis syndrome—characterized by severe post-transfusion anemia with hemoglobin dropping below pre-transfusion nadirs, reticulocytopenia, and destruction of both donor and autologous recipient erythrocytes.",
                "cites": [28385782, 32449551]
            },
            {
                "claim": "Management of severe hyperhemolysis syndrome in sickle cell disease mandates strict avoidance of further blood transfusions (which exacerbates hemolysis), immediate administration of high-dose intravenous corticosteroids plus intravenous immunoglobulin (IVIG), and consideration of the terminal complement inhibitor eculizumab for refractory cases.",
                "cites": [32449551, 28385782]
            }
        ],
        "uncertainties": [
            "The precise molecular trigger of autologous red blood cell bystander hemolysis (macrophage hyperactivation vs complement deposition) in hyperhemolysis syndrome.",
            "The cost-effectiveness and clinical utility of pre-emptive molecular red cell genotyping for comprehensive extended antigen matching (beyond C, E, K) in all transfusion-dependent sickle cell cohorts."
        ],
        "mcq_angles": [
            "Identifying antibodies of the Kidd system (anti-Jka, anti-Jkb) as notorious for waning to undetectable levels and causing severe delayed hemolytic transfusion reactions.",
            "Recognizing hyperhemolysis syndrome in sickle cell disease: hemoglobin falling below pre-transfusion baseline accompanied by reticulocytopenia.",
            "Selecting avoidance of further transfusions and treatment with IVIG plus high-dose steroids for hyperhemolysis syndrome."
        ],
        "case_hooks": [
            "A 42-year-old female 8 days following an elective surgical procedure and 2 units of packed RBCs who develops scleral icterus, dark urine, hemoglobin dropping from 10.2 to 7.1 g/dL, LDH 1,120 U/L, and newly positive anti-Jka on antibody identification.",
            "A 24-year-old male with sickle cell disease who receives 2 units of blood for an acute pain crisis, presenting 7 days later with severe anemia (Hb 4.2 g/dL, lower than baseline 7.5), reticulocytopenia, and hemoglobinuria (hyperhemolysis syndrome)."
        ],
        "gaps": "Clinicians often administer additional red blood cell transfusions when a sickle cell patient develops delayed hyperhemolysis with plummeting hemoglobin, which triggers catastrophic bystander destruction and fatal cardiovascular collapse.",
        "sources": [
            {
                "pmid": 28385782,
                "title": "Delayed hemolytic transfusion reactions in sickle cell disease",
                "year": 2017,
                "design": "review"
            },
            {
                "pmid": 2219273,
                "title": "The delayed hemolytic transfusion reaction--revisited",
                "year": 1990,
                "design": "review"
            },
            {
                "pmid": 21512637,
                "title": "Hemolytic Transfusion Reactions",
                "year": 2008,
                "design": "review"
            },
            {
                "pmid": 32449551,
                "title": "Recommendations for managing acute and delayed hemolytic transfusion reactions in sickle cell disease",
                "year": 2020,
                "design": "guideline"
            }
        ]
    },
    500: {
        "cluster": "Endocrinology / Pediatrics",
        "mentor_intro": "Delayed puberty is clinically defined as the absence of secondary sexual characteristics by an age that lies 2 to 2.5 standard deviations above the population mean: specifically, the lack of testicular enlargement (testicular volume <4 mL measured with a Prader orchidometer) by age 14 in males, or the absence of thelarche (breast budding, Tanner stage B2) by age 13 in females. The diagnostic evaluation begins with baseline gonadotropins: serum luteinizing hormone (LH) and follicle-stimulating hormone (FSH). Elevated gonadotropins establish hypergonadotropic hypogonadism, signifying primary gonadal failure (most frequently Turner syndrome [45,X] in females and Klinefelter syndrome [47,XXY] in males; chromosomal karyotyping is mandatory). Conversely, low or inappropriately normal gonadotropins indicate hypogonadotropic hypogonadism, requiring differentiation between Constitutional Delay of Growth and Puberty (CDGP, a benign, self-limited variant representing 60-80% of cases) and permanent Congenital Hypogonadotropic Hypogonadism (CHH / Kallmann syndrome).",
        "teaching_points": [
            {
                "claim": "Delayed puberty is clinically defined as the absence of initial physical pubertal signs by age 13 years in girls (lack of breast budding, Tanner stage B2) or by age 14 years in boys (testicular volume <4 mL measured by Prader orchidometer), or failure to attain menarche by age 15-16 in females.",
                "cites": [22296078, 31095292]
            },
            {
                "claim": "Basal serum LH and FSH reliably differentiate the etiology: elevated gonadotropins indicate primary gonadal failure (hypergonadotropic hypogonadism: Turner syndrome 45,X, Klinefelter syndrome 47,XXY, or prior gonadotoxic chemotherapy), mandating immediate chromosomal karyotype analysis.",
                "cites": [22296078, 26194704]
            },
            {
                "claim": "Constitutional Delay of Growth and Puberty (CDGP) is the most frequent cause of delayed puberty (>60% in boys, >30% in girls), characterized by delayed bone age on left hand radiograph matching height age rather than chronological age, normal predicted adult height, positive family history of late blooming, and eventual spontaneous pubertal completion.",
                "cites": [22296078, 22774211]
            },
            {
                "claim": "In adolescent boys with severe psychosocial distress due to CDGP aged >=14 years, a short course of low-dose intramuscular testosterone depot (50-100 mg monthly for 3 to 6 months) safely promotes pubertal growth and virilization without compromising final adult height or accelerating premature epiphyseal fusion.",
                "cites": [22774211, 31095292]
            }
        ],
        "uncertainties": [
            "The diagnostic accuracy of GnRH agonist stimulation testing or serum inhibin B and anti-Müllerian hormone (AMH) in definitively distinguishing CDGP from isolated congenital hypogonadotropic hypogonadism before age 15.",
            "The genetic architecture and polygenic contribution of FGFR1, PROKR2, and CHD7 mutations in oligogenic hypogonadotropic hypogonadism."
        ],
        "mcq_angles": [
            "Defining delayed puberty: age 13 in girls (no breast buds) and age 14 in boys (testicular volume <4 mL).",
            "Differentiating CDGP (delayed bone age matching height age, positive family history, spontaneous progression) from hypogonadotropic hypogonadism.",
            "Selecting a short 3- to 6-month trial of low-dose testosterone (50-100 mg monthly) to initiate puberty in distressed adolescent males with CDGP."
        ],
        "case_hooks": [
            "A 14.5-year-old male presenting with short stature and lack of secondary sexual characteristics, testicular volume 2 mL bilaterally, bone age 12 years (delayed by 2.5 years), LH 0.4 mIU/mL, and father who had a late growth spurt at age 17 (CDGP).",
            "A 14-year-old female presenting with no breast development, high-arched palate, low posterior hairline, Tanner stage 1 breasts, serum FSH 68 mIU/mL, and LH 34 mIU/mL, prompting karyotype confirming 45,X Turner syndrome."
        ],
        "gaps": "Clinicians often order cranial MRI and extensive pituitary testing immediately for otherwise healthy 14-year-old boys with delayed puberty, failing to obtain a simple family history and left hand bone age radiograph that would confirm constitutional delay.",
        "sources": [
            {
                "pmid": 22296078,
                "title": "Clinical practice. Delayed puberty",
                "year": 2012,
                "design": "review"
            },
            {
                "pmid": 31095292,
                "title": "Delayed Puberty-Phenotypic Diversity, Molecular Genetic Mechanisms, and Recent Discoveries",
                "year": 2019,
                "design": "review"
            },
            {
                "pmid": 26194704,
                "title": "European Consensus Statement on congenital hypogonadotropic hypogonadism-pathogenesis, diagnosis and treatment",
                "year": 2015,
                "design": "consensus-guideline"
            },
            {
                "pmid": 22774211,
                "title": "Clinical review: Addressing the challenges of delayed puberty: a focus on the adolescent",
                "year": 2012,
                "design": "review"
            }
        ]
    }
}
