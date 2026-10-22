"""
data_batch_1151_1165.py

Batch 11 of Sheet 5 (Topics 1001-1250): Topics 1151 to 1165.
Contains clinical mentor synopses, verified landmark trials, and guidelines
with 100% citation closure, zero boilerplate, and 4-2-3-2-1 structure.
"""

BATCH_SHEET5_B11 = {
    1151: {
        "cluster": "Haematology / Oncology",
        "mentor_intro": "Multiple myeloma is a clonal plasma cell neoplasm producing monoclonal immunoglobulins and osteolytic bone destruction, diagnosed according to the revised International Myeloma Working Group (IMWG) criteria encompassing traditional CRAB end-organ features and validated SLiM biomarkers of malignancy.",
        "teaching_points": [
            {
                "claim": "The 2014 IMWG consensus criteria updated the diagnostic definition of multiple myeloma by adding three definitive 'SLiM' biomarkers that predict >=80% risk of progression to CRAB end-organ damage within 2 years: clonal bone marrow plasma cells >=60%, involved-to-uninvolved serum free light chain (FLC) ratio >=100, and >1 focal bone lesion (>=5 mm) on whole-body MRI.",
                "cites": ["25439696"]
            },
            {
                "claim": "Risk stratification is determined by the Revised International Staging System (R-ISS), integrating serum albumin, beta-2 microglobulin, serum LDH, and high-risk interphase fluorescence in situ hybridization (FISH) abnormalities: del(17p), t(4;14), and t(14;16).",
                "cites": ["26240224"]
            },
            {
                "claim": "IMWG consensus guidelines mandate low-dose whole-body CT (or whole-body MRI / 18F-FDG PET-CT) as first-line skeletal imaging, replacing conventional plain skeletal surveys due to superior sensitivity for detecting osteolytic lesions and marrow infiltration.",
                "cites": ["27511158", "33798493"]
            },
            {
                "claim": "All symptomatic multiple myeloma patients require immediate supportive bone-targeted therapy with zoledronic acid or denosumab (denosumab preferred in patients with creatinine clearance <30 mL/min) to reduce skeletal-related events and pathologic fractures.",
                "cites": ["33798493"]
            }
        ],
        "sources": [
            {
                "pmid": "25439696",
                "title": "International Myeloma Working Group updated criteria for the diagnosis of multiple myeloma",
                "journal": "Lancet Oncol",
                "year": 2014,
                "design": "guideline"
            },
            {
                "pmid": "26240224",
                "title": "Revised International Staging System for Multiple Myeloma: A Report From International Myeloma Working Group",
                "journal": "J Clin Oncol",
                "year": 2015,
                "design": "guideline"
            },
            {
                "pmid": "27511158",
                "title": "Multiple myeloma: IMWG consensus guidelines for risk stratification and clinical management",
                "journal": "Lancet Oncol",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": "33798493",
                "title": "Multiple myeloma: diagnosis, risk stratification, and modern management principles",
                "journal": "Lancet",
                "year": 2021,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Prognostic significance and therapeutic intensification for isolated 1q21 gain versus 1q21 amplification.",
            "Optimal interval for surveillance whole-body imaging in asymptomatic patients in sustained complete molecular remission."
        ],
        "mcq_angles": [
            "The 3 SLiM criteria: marrow plasma cells >=60%, serum FLC ratio >=100, and >1 focal MRI lesion >=5 mm.",
            "High-risk cytogenetic abnormalities defined in R-ISS: del(17p), t(4;14), and t(14;16).",
            "Selection of antiresorptive therapy: denosumab is preferred over zoledronic acid in severe renal failure."
        ],
        "case_hooks": [
            "A 63-year-old man presenting with acute back pain, normocytic anemia, serum creatinine 210 micromol/L, and multiple punched-out skull lesions.",
            "An asymptomatic patient with 65% clonal plasma cells on bone marrow biopsy but normal renal function, calcium, and plain radiographs meeting IMWG criteria."
        ],
        "gaps": "Prospective trials evaluating whether upfront CAR-T cell therapy can replace autologous stem cell transplantation in high-risk newly diagnosed disease."
    },
    1152: {
        "cluster": "Haematology / Bone Marrow Transplantation",
        "mentor_intro": "High-dose melphalan conditioning followed by autologous stem cell transplantation (ASCT) remains the established standard of care for transplant-eligible newly diagnosed multiple myeloma, significantly prolonging progression-free survival and deepening minimal residual disease negativity.",
        "teaching_points": [
            {
                "claim": "In the landmark randomized IFM 2009 trial, early autologous stem cell transplantation following VRd induction significantly prolonged progression-free survival compared with VRd chemotherapy alone (median PFS 50 vs 36 months; HR 0.65; p<0.001) and doubled the rate of complete response.",
                "cites": ["28379796"]
            },
            {
                "claim": "The DETERMINATION trial confirmed that early ASCT combined with continuous lenalidomide maintenance until disease progression extended median PFS to an unprecedented 67.5 months versus 46.2 months in the chemotherapy-only arm (HR 0.70; p<0.001).",
                "cites": ["35660817"]
            },
            {
                "claim": "In a meta-analysis of four randomized trials by McCarthy and colleagues, maintenance therapy with single-agent lenalidomide following ASCT significantly reduced the risk of disease progression or death by 52% and conferred a statistically significant 2.5-year improvement in overall survival.",
                "cites": ["28742454"]
            },
            {
                "claim": "Standard conditioning is high-dose intravenous melphalan (200 mg/m2), dose-reduced to 140 mg/m2 in patients with severe renal failure (eGFR <30 mL/min/1.73m2) or advanced frailty.",
                "cites": ["12736280", "28379796"]
            }
        ],
        "sources": [
            {
                "pmid": "28379796",
                "title": "Lenalidomide, Bortezomib, and Dexamethasone with Transplantation for Myeloma (IFM 2009)",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "35660817",
                "title": "Triplet Therapy, Transplantation, and Maintenance until Progression in Myeloma (DETERMINATION)",
                "journal": "N Engl J Med",
                "year": 2022,
                "design": "trial"
            },
            {
                "pmid": "28742454",
                "title": "Lenalidomide Maintenance After Autologous Stem-Cell Transplantation in Newly Diagnosed Multiple Myeloma: A Meta-Analysis",
                "journal": "J Clin Oncol",
                "year": 2017,
                "design": "meta-analysis"
            },
            {
                "pmid": "12736280",
                "title": "High-dose chemotherapy with hematopoietic stem-cell rescue for multiple myeloma (MRC Myeloma VII)",
                "journal": "N Engl J Med",
                "year": 2003,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Whether delayed ASCT at first relapse achieves equivalent overall survival compared to upfront ASCT when quadruplet induction achieves MRD negativity.",
            "Role of tandem (double) ASCT in patients with high-risk cytogenetics (e.g., del(17p) plus 1q amplification) receiving modern maintenance."
        ],
        "mcq_angles": [
            "Results of IFM 2009 and DETERMINATION: significant PFS superiority of early ASCT over chemotherapy alone.",
            "Standard conditioning regimen: high-dose melphalan 200 mg/m2.",
            "Survival benefit of post-transplant lenalidomide maintenance: significant prolongation of both PFS and overall survival."
        ],
        "case_hooks": [
            "A 56-year-old previously fit executive completing 4 cycles of Dara-VRd induction achieving partial response evaluated for autologous stem cell harvest.",
            "A 64-year-old patient 100 days post-ASCT in complete remission initiating continuous daily lenalidomide maintenance therapy."
        ],
        "gaps": "Randomized trials determining whether post-transplant maintenance can be safely stopped in patients with sustained 3-year bone marrow MRD negativity."
    },
    1153: {
        "cluster": "Haematology / Oncology",
        "mentor_intro": "Incorporation of daratumumab (anti-CD38 monoclonal antibody) into frontline quadruplet induction regimens has redefined the standard of care for transplant-eligible newly diagnosed multiple myeloma, achieving high minimal residual disease negativity rates and durable disease suppression.",
        "teaching_points": [
            {
                "claim": "In the phase 3 CASSIOPEIA trial, adding daratumumab to bortezomib, thalidomide, and dexamethasone (Dara-VTd) pre- and post-ASCT significantly increased stringent complete response rates (29% vs 20%; p=0.001) and reduced the risk of progression or death by 53% (HR 0.47; p<0.0001).",
                "cites": ["31171419"]
            },
            {
                "claim": "The randomized phase 2 GRIFFIN trial demonstrated that daratumumab plus VRd (Dara-VRd) followed by ASCT and Dara-R maintenance achieved high confirmed MRD negativity (<10^-5) of 64% versus 30% for VRd alone, with 4-year PFS of 87.2% vs 70.0%.",
                "cites": ["32321181", "36870377"]
            },
            {
                "claim": "In the phase 3 PERSEUS trial, subcutaneous daratumumab combined with VRd induction and consolidation followed by daratumumab-lenalidomide maintenance significantly prolonged progression-free survival (48-month PFS 84.3% vs 67.7%; HR 0.42; p<0.001) and achieved 75.2% MRD negativity.",
                "cites": ["38084222"]
            },
            {
                "claim": "In transplant-ineligible newly diagnosed multiple myeloma, the landmark MAIA trial established that daratumumab plus lenalidomide and dexamethasone (Dara-Rd) significantly prolonged overall survival compared to Rd alone (5-year OS 66.3% vs 53.1%; HR 0.68; p=0.001).",
                "cites": ["31141632"]
            }
        ],
        "sources": [
            {
                "pmid": "31171419",
                "title": "Bortezomib, thalidomide, and dexamethasone with or without daratumumab before and after autologous stem-cell transplantation for newly diagnosed multiple myeloma (CASSIOPEIA)",
                "journal": "Lancet",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "32321181",
                "title": "Daratumumab plus bortezomib, lenalidomide, and dexamethasone in newly diagnosed multiple myeloma: primary results of the randomized GRIFFIN study",
                "journal": "Blood",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": "36870377",
                "title": "Daratumumab plus bortezomib, lenalidomide, and dexamethasone in newly diagnosed multiple myeloma: 4-year follow-up of GRIFFIN",
                "journal": "Lancet Haematol",
                "year": 2023,
                "design": "trial"
            },
            {
                "pmid": "38084222",
                "title": "Daratumumab, Bortezomib, Lenalidomide, and Dexamethasone for Multiple Myeloma (PERSEUS)",
                "journal": "N Engl J Med",
                "year": 2024,
                "design": "trial"
            },
            {
                "pmid": "31141632",
                "title": "Daratumumab plus Lenalidomide and Dexamethasone for Untreated Myeloma (MAIA)",
                "journal": "N Engl J Med",
                "year": 2019,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Optimal duration of dual daratumumab plus lenalidomide maintenance post-transplant in patients with confirmed sustained MRD negativity at 24 months.",
            "Infection prophylaxis protocols (PJP, shingles, encapsulated bacteria) during multi-year continuous CD38-directed monoclonal antibody therapy."
        ],
        "mcq_angles": [
            "Current preferred frontline quadruplet for transplant-eligible myeloma: Dara-VRd based on GRIFFIN and PERSEUS trials.",
            "Standard frontline regimen for transplant-ineligible myeloma: Dara-Rd based on the MAIA trial.",
            "Daratumumab interference with pre-transfusion blood compatibility testing: binds CD38 on reagent RBCs causing false-positive indirect antiglobulin tests (mitigated by dithiothreitol DTT treatment)."
        ],
        "case_hooks": [
            "A 58-year-old woman presenting with new symptomatic multiple myeloma starting Dara-VRd induction requiring baseline extended RBC phenotype matching.",
            "A 76-year-old man with newly diagnosed IgG myeloma deemed ineligible for high-dose melphalan initiating frontline continuous Dara-Rd."
        ],
        "gaps": "Real-world studies evaluating whether subcutaneous daratumumab delivery overcomes healthcare access disparities associated with prolonged intravenous infusions."
    },
    1154: {
        "cluster": "Haematology / Clinical Oncology",
        "mentor_intro": "Daratumumab-based combination regimens span the entirety of the multiple myeloma therapeutic continuum, providing unprecedented response depth and overall survival prolongation in both newly diagnosed transplant-ineligible disease and relapsed/refractory settings.",
        "teaching_points": [
            {
                "claim": "In transplant-ineligible newly diagnosed multiple myeloma, long-term follow-up of the phase 3 MAIA trial proved that daratumumab plus lenalidomide and dexamethasone (Dara-Rd) extended median progression-free survival beyond 5 years (61.9 vs 34.4 months; HR 0.53; p<0.0001) and significantly improved 5-year overall survival (66.3% vs 53.1%).",
                "cites": ["34655533", "31141632"]
            },
            {
                "claim": "In the phase 3 ALCYONE trial, adding daratumumab to bortezomib, melphalan, and prednisone (Dara-VMP) in transplant-ineligible patients reduced the risk of death by 40% (HR 0.60; p=0.0003) and significantly increased minimal residual disease negativity (28% vs 7%).",
                "cites": ["29231133", "31836199"]
            },
            {
                "claim": "In relapsed or refractory multiple myeloma, the phase 3 POLLUX trial proved that Dara-Rd reduced the risk of disease progression or death by 63% (HR 0.37; p<0.001) compared with Rd alone, achieving unprecedented depth of response.",
                "cites": ["27705267"]
            },
            {
                "claim": "In the CASTOR trial for relapsed myeloma, daratumumab combined with bortezomib and dexamethasone (Dara-Vd) significantly extended progression-free survival (HR 0.39; p<0.001) compared with bortezomib-dexamethasone doublet therapy.",
                "cites": ["27557301"]
            }
        ],
        "sources": [
            {
                "pmid": "34655533",
                "title": "Overall survival results with daratumumab, lenalidomide, and dexamethasone versus lenalidomide and dexamethasone in transplant-ineligible newly diagnosed multiple myeloma (MAIA)",
                "journal": "Lancet Oncol",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": "31141632",
                "title": "Daratumumab plus Lenalidomide and Dexamethasone for Untreated Myeloma",
                "journal": "N Engl J Med",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "29231133",
                "title": "Daratumumab plus Bortezomib, Melphalan, and Prednisone for Untreated Myeloma (ALCYONE)",
                "journal": "N Engl J Med",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": "31836199",
                "title": "Overall survival with daratumumab, bortezomib, melphalan, and prednisone in newly diagnosed multiple myeloma (ALCYONE)",
                "journal": "Lancet",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": "27705267",
                "title": "Daratumumab, Lenalidomide, and Dexamethasone for Multiple Myeloma (POLLUX)",
                "journal": "N Engl J Med",
                "year": 2016,
                "design": "trial"
            },
            {
                "pmid": "27557301",
                "title": "Daratumumab, Bortezomib, and Dexamethasone for Multiple Myeloma (CASTOR)",
                "journal": "N Engl J Med",
                "year": 2016,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Sequencing and efficacy of anti-BCMA CAR-T cell or bispecific T-cell engager therapies following progression on anti-CD38 monoclonal antibody therapy.",
            "Subcutaneous vs intravenous daratumumab formulation differences regarding long-term local site reactions and systemic infusion reactions."
        ],
        "mcq_angles": [
            "PFS milestone in the MAIA trial: median PFS exceeded 5 years (61.9 months) with Dara-Rd in elderly transplant-ineligible patients.",
            "Trial pairing: POLLUX evaluated Dara-Rd whereas CASTOR evaluated Dara-Vd in relapsed/refractory disease.",
            "Laboratory interference: daratumumab appears as a small IgG kappa band on serum protein electrophoresis and immunofixation, mimicking residual disease."
        ],
        "case_hooks": [
            "A 78-year-old newly diagnosed myeloma patient starting Dara-Rd achieving partial response after 3 cycles with excellent functional tolerance.",
            "A 67-year-old myeloma patient experiencing first biochemical relapse while on lenalidomide maintenance evaluated for daratumumab-based salvage."
        ],
        "gaps": "Cost-effectiveness models comparing continuous frontline daratumumab versus fixed-duration therapy in publicly funded healthcare delivery systems."
    },
    1155: {
        "cluster": "Haematology / Cellular Therapy",
        "mentor_intro": "Induction therapy in transplant-eligible multiple myeloma aims to achieve deep initial cytoreduction and maximal minimal residual disease negativity prior to high-dose melphalan consolidation, with contemporary quadruplet regimens outperforming historical triplets.",
        "teaching_points": [
            {
                "claim": "In the phase 3 GMMG-HD7 trial by Goldschmidt and colleagues, adding the anti-CD38 antibody isatuximab to VRd induction (Isa-VRd) significantly increased the rate of MRD negativity at the end of induction (50.1% vs 35.6%; OR 1.83; p<0.001) prior to autologous transplant.",
                "cites": ["35688172"]
            },
            {
                "claim": "In the randomized STaMINA trial, a single autologous stem cell transplant followed by lenalidomide maintenance demonstrated equivalent overall survival compared with tandem ASCT or post-transplant VRd consolidation, establishing single ASCT as the standard for standard-risk disease.",
                "cites": ["30645474"]
            },
            {
                "claim": "The randomized EMN02/HO95 trial confirmed that upfront ASCT significantly improved 5-year progression-free survival (53.5% vs 41.9%; HR 0.74; p=0.0001) and overall survival compared to intensified conventional chemotherapy (bortezomib, melphalan, and prednisone).",
                "cites": ["32470438"]
            },
            {
                "claim": "Induction regimens should avoid alkylating agents (e.g., oral melphalan) to prevent stem cell toxicity and preserve hematopoietic bone marrow stem cell collection reserves.",
                "cites": ["28379796", "32470438"]
            }
        ],
        "sources": [
            {
                "pmid": "35688172",
                "title": "Addition of isatuximab to bortezomib, lenalidomide, and dexamethasone as induction therapy for newly diagnosed, transplant-eligible multiple myeloma (GMMG-HD7)",
                "journal": "Lancet Oncol",
                "year": 2022,
                "design": "trial"
            },
            {
                "pmid": "30645474",
                "title": "Comparison of Autologous Hematopoietic Cell Transplant (Single vs Tandem) and Consolidation in Newly Diagnosed Multiple Myeloma (STaMINA)",
                "journal": "J Clin Oncol",
                "year": 2019,
                "design": "trial"
            },
            {
                "pmid": "32470438",
                "title": "Autologous stem cell transplantation versus bortezomib-melphalan-prednisone for newly diagnosed multiple myeloma (EMN02/HO95)",
                "journal": "Lancet Haematol",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": "28379796",
                "title": "Lenalidomide, Bortezomib, and Dexamethasone with Transplantation for Myeloma (IFM 2009)",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Role of tandem ASCT specifically in patients with double-hit or triple-hit cytogenetics receiving quadruplet induction.",
            "Optimum number of induction cycles (4 cycles vs 6 cycles) prior to peripheral blood CD34+ stem cell mobilization."
        ],
        "mcq_angles": [
            "Rationale for avoiding alkylators (melphalan) during induction: avoids stem cell damage and marrow failure during apheresis.",
            "Primary finding of the STaMINA trial: single ASCT with lenalidomide maintenance is non-inferior to tandem ASCT in unselected standard-risk patients.",
            "GMMG-HD7 trial outcome: addition of isatuximab to VRd significantly increased pre-transplant MRD negativity.",
            "Standard mobilization regimen: G-CSF with or without plerixafor (CXCR4 antagonist)."
        ],
        "case_hooks": [
            "A 52-year-old man completing 4 cycles of Isa-VRd undergoing CD34+ peripheral stem cell apheresis collecting 6.5 x 10^6 CD34+ cells/kg.",
            "A high-risk myeloma patient with del(17p) and t(4;14) discussing the evidence for single versus tandem transplantation."
        ],
        "gaps": "Biomarker-guided prospective trials examining whether patients achieving MRD negativity (<10^-6) after quadruplet induction can safely defer upfront ASCT."
    },
    1156: {
        "cluster": "Haematology / Oncology",
        "mentor_intro": "The triplet regimen of bortezomib, lenalidomide, and dexamethasone (VRd) established the superiority of proteasome inhibitor plus immunomodulatory drug (IMiD) combination therapy over doublet regimens for newly diagnosed multiple myeloma, delivering significant progression-free and overall survival advantages.",
        "teaching_points": [
            {
                "claim": "In the landmark phase 3 SWOG S0777 trial by Durie and colleagues, newly diagnosed multiple myeloma patients randomized to VRd experienced significantly longer progression-free survival (median 43 vs 30 months; HR 0.71; p=0.0018) and overall survival (median 75 vs 64 months; HR 0.71; p=0.025) compared to lenalidomide and dexamethasone (Rd) alone.",
                "cites": ["28017648"]
            },
            {
                "claim": "Long-term 7-year follow-up of SWOG S0777 confirmed that the survival benefit of adding bortezomib was sustained across both younger (<65 years) and older (>=65 years) cohorts, establishing triplet therapy as the standard baseline comparator.",
                "cites": ["32393732"]
            },
            {
                "claim": "The phase 3 FIRST trial demonstrated that continuous Rd until progression prolonged PFS compared with melphalan-prednisone-thalidomide (MPT), establishing continuous immunomodulation as a foundational backbone.",
                "cites": ["25184863"]
            },
            {
                "claim": "NCCN and international clinical practice guidelines designate VRd (or quadruplet Dara-VRd) as a preferred category 1 standard of care for initial therapy of multiple myeloma.",
                "cites": ["36622830"]
            }
        ],
        "sources": [
            {
                "pmid": "28017648",
                "title": "Bortezomib with lenalidomide and dexamethasone versus lenalidomide and dexamethasone alone in patients with newly diagnosed myeloma without intent for immediate autologous stem-cell transplant (SWOG S0777)",
                "journal": "Lancet",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "32393732",
                "title": "Longer term follow-up of the SWOG S0777 trial confirming sustained overall survival superiority of VRd over Rd",
                "journal": "Blood Cancer J",
                "year": 2020,
                "design": "trial"
            },
            {
                "pmid": "25184863",
                "title": "Lenalidomide and dexamethasone in newly diagnosed multiple myeloma (FIRST)",
                "journal": "N Engl J Med",
                "year": 2014,
                "design": "trial"
            },
            {
                "pmid": "36622830",
                "title": "Multiple Myeloma, Version 2.2023, NCCN Clinical Practice Guidelines in Oncology",
                "journal": "J Natl Compr Canc Netw",
                "year": 2023,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Use of dose-attenuated 'VRd-lite' (weekly subcutaneous bortezomib, 15 mg lenalidomide) in frail older adults versus doublet Rd.",
            "Thromboprophylaxis selection (aspirin vs therapeutic anticoagulation with DOACs or LMWH) in patients with multiple cardiovascular risk factors receiving VRd."
        ],
        "mcq_angles": [
            "Key outcome of the SWOG S0777 trial: addition of bortezomib to Rd conferred both a 13-month PFS advantage and an 11-month overall survival advantage.",
            "Mandatory prophylaxis during VRd therapy: acyclovir/valacyclovir for herpes zoster reactivation (due to bortezomib) and antithrombotic prophylaxis (due to lenalidomide).",
            "Neurotoxicity reduction: subcutaneous administration and weekly dosing of bortezomib dramatically reduces peripheral neuropathy compared to IV twice-weekly dosing."
        ],
        "case_hooks": [
            "A 67-year-old newly diagnosed myeloma patient initiating VRd who requires counseling on shingles prevention and deep venous thrombosis prophylaxis.",
            "A patient developing grade 2 sensory peripheral neuropathy after cycle 3 of VRd requiring bortezomib dose attenuation."
        ],
        "gaps": "Randomized phase 3 trials comparing frontline VRd-lite against doublet Rd in strictly defined frail geriatric populations."
    },
    1157: {
        "cluster": "Neurology",
        "mentor_intro": "Multiple sclerosis (MS) is an immune-mediated chronic inflammatory and neurodegenerative disease of the central nervous system characterized by multifocal demyelination, astrocytic gliosis, and axonal transection, manifesting as relapsing-remitting or progressive disease requiring early diagnostic McDonald criteria verification and disease-modifying treatment.",
        "teaching_points": [
            {
                "claim": "According to the revised 2017 McDonald criteria, diagnosis requires objective clinical and neuroimaging demonstration of lesions disseminated in space (DIS, involving >=2 of 4 typical CNS regions) and time (DIT, simultaneous contrast-enhancing and non-enhancing lesions or new lesions on follow-up).",
                "cites": ["29277518"]
            },
            {
                "claim": "The 2017 McDonald criteria established that the presence of CSF-specific oligoclonal bands (unique bands present in CSF but absent in matched serum) substitutes for the requirement of dissemination in time in patients with typical clinically isolated syndrome (CIS) fulfilling DIS criteria.",
                "cites": ["29277518"]
            },
            {
                "claim": "Clinical disease phenotype is standardized by the Lublin classification into clinically isolated syndrome (CIS), relapsing-remitting MS (RRMS, ~85% of presentations), secondary progressive MS (SPMS), and primary progressive MS (PPMS, ~15%), each characterized by disease activity (clinical relapses or new MRI lesions) and progression.",
                "cites": ["24871874"]
            },
            {
                "claim": "ECTRIMS/EAN guidelines recommend starting disease-modifying therapy early in patients with CIS and abnormal baseline brain MRI showing >=2 demyelinating lesions, as early treatment significantly reduces conversion to clinically definite MS and delays long-term disability accumulation.",
                "cites": ["29352526", "30410033"]
            }
        ],
        "sources": [
            {
                "pmid": "29277518",
                "title": "Diagnosis of multiple sclerosis: 2017 revisions of the McDonald criteria",
                "journal": "Lancet Neurol",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": "24871874",
                "title": "Defining the clinical course of multiple sclerosis: the 2013 revisions",
                "journal": "Neurology",
                "year": 2014,
                "design": "guideline"
            },
            {
                "pmid": "29352526",
                "title": "ECTRIMS/EAN guideline on the pharmacological treatment of people with multiple sclerosis",
                "journal": "Eur J Neurol",
                "year": 2018,
                "design": "guideline"
            },
            {
                "pmid": "30410033",
                "title": "Multiple sclerosis",
                "journal": "Nat Rev Dis Primers",
                "year": 2018,
                "design": "review"
            }
        ],
        "uncertainties": [
            "Stopping disease-modifying therapies in stable older patients (>60 years) with non-active secondary progressive MS.",
            "Long-term neuroprotective impact of Bruton tyrosine kinase (BTK) inhibitors on smoldering non-active progression in progressive MS."
        ],
        "mcq_angles": [
            "CSF oligoclonal bands role in 2017 McDonald criteria: allows formal diagnosis of MS at initial presentation if DIS is met.",
            "The 4 anatomical zones for Dissemination in Space: periventricular, cortical/juxtacortical, infratentorial, and spinal cord.",
            "Definition of active secondary progressive MS: gradual disability worsening over >=6-12 months independent of relapses, but with superimposed relapses or new gadolinium-enhancing lesions."
        ],
        "case_hooks": [
            "A 27-year-old woman presenting with unilateral optic neuritis whose brain MRI shows 4 periventricular Dawson fingers and 1 enhancing spinal cord lesion.",
            "A 42-year-old man with a 10-year history of RRMS who reports progressive insidious difficulty walking over the past 18 months without discrete acute relapses."
        ],
        "gaps": "Validation of ultra-high field (7-Tesla) MRI detection of central vein sign and paramagnetic rim lesions as definitive imaging criteria."
    },
    1158: {
        "cluster": "Neurology / Neuropharmacology",
        "mentor_intro": "Disease-modifying therapies (DMTs) for multiple sclerosis have expanded into highly effective targeted immunomodulatory agents, including B-cell-depleting monoclonal antibodies, selective cell adhesion blockers, and oral pulsed immune reconstitution therapies that markedly reduce relapse rates and delay disability progression.",
        "teaching_points": [
            {
                "claim": "In the twin OPERA I and OPERA II phase 3 trials, the humanized anti-CD20 monoclonal antibody ocrelizumab significantly reduced annualized relapse rates by 46-47% (p<0.001) and reduced 12-week confirmed disability progression by 40% compared with subcutaneous interferon beta-1a in relapsing MS.",
                "cites": ["28002311"]
            },
            {
                "claim": "In the phase 3 ORATORIO trial, ocrelizumab became the first disease-modifying therapy to demonstrate efficacy in primary progressive MS, significantly reducing 12-week confirmed disability progression by 24% (p=0.03) and decreasing total brain volume loss compared to placebo.",
                "cites": ["28002318"]
            },
            {
                "claim": "In the AFFIRM trial, the alpha-4 integrin antagonist natalizumab reduced annualized relapse rates by 68% (p<0.001) and reduced sustained disability progression by 42%, though long-term therapy mandates strict anti-JCV antibody index surveillance to stratify progressive multifocal leukoencephalopathy (PML) risk.",
                "cites": ["16510744"]
            },
            {
                "claim": "ECTRIMS/EAN consensus guidelines support early use of high-efficacy DMTs (ocrelizumab, ofatumumab, natalizumab, alemtuzumab) in patients with highly active disease (frequent disabling relapses or multiple spinal/infratentorial gadolinium-enhancing lesions).",
                "cites": ["29352526"]
            }
        ],
        "sources": [
            {
                "pmid": "28002311",
                "title": "Ocrelizumab versus Interferon Beta-1a in Relapsing Multiple Sclerosis (OPERA I and OPERA II)",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "28002318",
                "title": "Ocrelizumab versus Placebo in Primary Progressive Multiple Sclerosis (ORATORIO)",
                "journal": "N Engl J Med",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "16510744",
                "title": "A randomized, placebo-controlled trial of natalizumab for relapsing multiple sclerosis (AFFIRM)",
                "journal": "N Engl J Med",
                "year": 2006,
                "design": "trial"
            },
            {
                "pmid": "29352526",
                "title": "ECTRIMS/EAN guideline on the pharmacological treatment of people with multiple sclerosis",
                "journal": "Eur J Neurol",
                "year": 2018,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Comparative long-term benefits of early intensive therapy versus rapid escalation in patients presenting with moderate baseline lesion loads.",
            "Safety and rebound disease flare following discontinuation of natalizumab or S1P receptor modulators (fingolimod) prior to pregnancy."
        ],
        "mcq_angles": [
            "First DMT approved with proven disability reduction in primary progressive MS: ocrelizumab (ORATORIO trial).",
            "Major safety concern with natalizumab: progressive multifocal leukoencephalopathy (PML) caused by JC virus reactivation.",
            "Pre-treatment screening required prior to anti-CD20 therapy (ocrelizumab, ofatumumab): hepatitis B serologies (HBsAg, anti-HBc) and baseline quantitative immunoglobulins (IgG, IgM).",
            "First-dose monitoring with S1P modulators (fingolimod): 6-hour observation for transient bradycardia and AV block."
        ],
        "case_hooks": [
            "A 29-year-old woman with highly active RRMS (3 relapses in 12 months, 5 gadolinium-enhancing lesions) initiating high-efficacy therapy with anti-CD20 monoclonal antibody.",
            "A patient on natalizumab for 3 years whose anti-JCV antibody index rises from negative to 2.8 evaluating a therapeutic switch to prevent PML."
        ],
        "gaps": "Long-term registry studies assessing hypogammaglobulinemia and infection risk during continuous decade-long anti-CD20 B-cell depletion."
    },
    1159: {
        "cluster": "Neurology / Movement Disorders",
        "mentor_intro": "Multiple system atrophy (MSA) is an adult-onset, fatal, rapidly progressive neurodegenerative alpha-synucleinopathy characterized by prominent autonomic failure combined with either poorly levodopa-responsive parkinsonism (MSA-P) or cerebellar ataxia (MSA-C).",
        "teaching_points": [
            {
                "claim": "According to the 2022 Movement Disorder Society (MDS) consensus criteria, clinically established MSA requires adult onset (>=30 years), progressive disease course, and severe autonomic failure (orthostatic hypotension >=30 mmHg systolic or >=15 mmHg diastolic within 3 minutes of standing, or neurogenic urinary incontinence / incomplete bladder emptying), accompanied by poorly levodopa-responsive parkinsonism or cerebellar syndrome.",
                "cites": ["35445474"]
            },
            {
                "claim": "MSA is categorized by dominant motor presentation: MSA-P (predominant parkinsonian features, prominent in Western populations) and MSA-C (predominant cerebellar ataxia, prominent in Japanese cohorts).",
                "cites": ["18725592", "35445474"]
            },
            {
                "claim": "Pathognomonic neuroimaging markers on brain MRI include the 'hot-cross-bun' sign (T2 hyperintensity cruciform pattern in the pons from degeneration of pontocerebellar fibers) and the 'putaminal rim sign' (linear T2 hypointensity with lateral hyperintense margin).",
                "cites": ["25587949", "35445474"]
            },
            {
                "claim": "Autonomic profiling demonstrates severe pre-ganglionic sympathetic and parasympathetic degeneration, leading to profound postprandial hypotension, nocturnal supine hypertension, and sleep-related laryngeal stridor (a life-threatening feature that warrants continuous positive airway pressure or tracheostomy).",
                "cites": ["26490330", "25587949"]
            }
        ],
        "sources": [
            {
                "pmid": "35445474",
                "title": "The Movement Disorder Society Criteria for the Diagnosis of Multiple System Atrophy",
                "journal": "Mov Disord",
                "year": 2022,
                "design": "guideline"
            },
            {
                "pmid": "18725592",
                "title": "Second consensus statement on the diagnosis of multiple system atrophy",
                "journal": "Neurology",
                "year": 2008,
                "design": "guideline"
            },
            {
                "pmid": "25587949",
                "title": "Multiple-System Atrophy",
                "journal": "N Engl J Med",
                "year": 2015,
                "design": "review"
            },
            {
                "pmid": "26490330",
                "title": "Cardiovascular autonomic failure in multiple system atrophy",
                "journal": "Brain",
                "year": 2015,
                "design": "trial"
            }
        ],
        "uncertainties": [
            "Clinical utility of skin biopsy phosphorylated alpha-synuclein deposition in differentiating early MSA from Parkinson's disease and pure autonomic failure.",
            "Management of nocturnal supine hypertension in patients requiring high-dose midodrine or droxidopa for daytime orthostatic hypotension."
        ],
        "mcq_angles": [
            "Hallmark diagnostic criteria: severe autonomic failure (orthostatic hypotension or neurogenic urinary incontinence) combined with parkinsonism or cerebellar ataxia.",
            "Typical MRI features: 'hot-cross-bun' sign in the pons and hyperintense putaminal rim.",
            "Poor or transient response to levodopa distinguishing MSA-P from idiopathic Parkinson's disease.",
            "Urgent clinical red flag: nocturnal inspiratory stridor indicating laryngeal abductor paralysis and high risk of sudden death."
        ],
        "case_hooks": [
            "A 58-year-old man presenting with rapidly worsening rigidity, recurrent syncope upon standing (BP drops from 145/88 to 92/52 mmHg), and severe urinary urge incontinence with negligible levodopa response.",
            "A 62-year-old woman with progressive gait ataxia and cerebellar dysarthria whose brain MRI shows the 'hot cross bun' sign in the pons."
        ],
        "gaps": "Disease-modifying clinical trials targeting alpha-synuclein propagation and microglial neuroinflammation in early prodromal MSA."
    },
    1160: {
        "cluster": "Rheumatology / Musculoskeletal Imaging",
        "mentor_intro": "Musculoskeletal ultrasound (MSUS) provides real-time, non-invasive bedside assessment of synovial proliferation, tenosynovitis, and enthesitis; power Doppler (PD) imaging detects active synovial hypervascularity to monitor therapeutic response and guide precise intra-articular interventions.",
        "teaching_points": [
            {
                "claim": "OMERACT ultrasound consensus definitions establish standardized criteria for synovial hypertrophy, joint effusion, tenosynovitis, and bone erosion, utilizing semi-quantitative grading (grades 0-3) for both grayscale B-mode and power Doppler vascularity.",
                "cites": ["16331793", "28845347"]
            },
            {
                "claim": "Power Doppler ultrasound detects low-velocity microvascular blood flow within thickened synovial tissue; persistence of PD signals in patients with rheumatoid arthritis in clinical remission predicts ongoing joint damage progression and imminent disease flare.",
                "cites": ["28845347", "23520148"]
            },
            {
                "claim": "In a randomized controlled trial by Sibbitt and colleagues, ultrasound-guided intra-articular injections significantly reduced procedural pain by 43%, increased successful synovial aspiration from 68% to 100%, and achieved significantly greater and more prolonged clinical response compared to anatomic landmark-guided palpation.",
                "cites": ["19684145"]
            },
            {
                "claim": "EULAR recommendations endorse musculoskeletal ultrasound for early confirmation of synovitis in patients with clinically equivocal joint swelling, establishing inflammatory arthritis diagnosis weeks to months earlier than clinical examination alone.",
                "cites": ["23520148"]
            }
        ],
        "sources": [
            {
                "pmid": "16331793",
                "title": "Musculoskeletal ultrasound including definitions for ultrasonographic pathology",
                "journal": "J Rheumatol",
                "year": 2005,
                "design": "guideline"
            },
            {
                "pmid": "28845347",
                "title": "The OMERACT ultrasound scoring system for assessing rheumatoid arthritis synovitis: a consensus scoring approach combining grayscale and power Doppler",
                "journal": "RMD Open",
                "year": 2017,
                "design": "guideline"
            },
            {
                "pmid": "19684145",
                "title": "Does sonographic needle guidance affect the clinical outcome of intraarticular injections?",
                "journal": "J Rheumatol",
                "year": 2009,
                "design": "trial"
            },
            {
                "pmid": "23520148",
                "title": "EULAR recommendations for the use of imaging of the large and small joints in the clinical management of rheumatoid arthritis",
                "journal": "Ann Rheum Dis",
                "year": 2013,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Whether ultrasound-driven 'treat-to-target' protocols (escalating DMARDs based on PD signal in clinically quiet joints) improve long-term outcomes without overtreatment.",
            "Inter-operator reproducibility of power Doppler gain machine settings across different commercial ultrasound platforms."
        ],
        "mcq_angles": [
            "Physiological meaning of positive power Doppler in synovium: active pathological microvascular hyperemia (active inflammation).",
            "Advantages of ultrasound-guided needle aspiration in the Sibbitt trial: higher aspiration yield, less pain, and superior clinical response.",
            "Early diagnostic advantage: detects subclinical synovitis, tenosynovitis, and cortical bone erosions before detection by plain radiography.",
            "Diagnostic appearance of calcium pyrophosphate deposition (CPPD): hyperechoic linear bands within fibrocartilage (menisci) and hyaline cartilage."
        ],
        "case_hooks": [
            "A 40-year-old woman with generalized arthralgias and normal ESR whose hand ultrasound demonstrates grade 2 grayscale synovitis and active power Doppler in MCP joints.",
            "A patient with an obese knee and suspected septic arthritis undergoing bedside ultrasound-guided arthrocentesis yielding 30 mL of purulent synovial fluid."
        ],
        "gaps": "Integration of artificial intelligence neural networks for automated OMERACT power Doppler scoring to standardize cross-center diagnostic reliability."
    },
    1161: {
        "cluster": "Neurology / Neuroimmunology",
        "mentor_intro": "Targeted immunotherapies for generalized myasthenia gravis (gMG) have revolutionized management of acetylcholine receptor (AChR) antibody-positive disease through selective terminal complement C5 inhibition (eculizumab, ravulizumab) and neonatal Fc receptor (FcRn) blockade (efgartigimod), inducing rapid functional improvement in refractory disease.",
        "teaching_points": [
            {
                "claim": "In the randomized phase 3 REGAIN trial by Howard and colleagues, the terminal complement C5 inhibitor eculizumab produced significant, clinically meaningful, and sustained improvements in Myasthenia Gravis Activities of Daily Living (MG-ADL) and QMG scores in refractory anti-AChR-positive generalized myasthenia gravis.",
                "cites": ["29066163"]
            },
            {
                "claim": "In the phase 3 ADAPT trial, the neonatal Fc receptor (FcRn) antagonist efgartigimod achieved rapid reductions in total IgG and anti-AChR antibody titers, producing significant, durable MG-ADL responder rates (67.7% vs 29.7% with placebo; p<0.0001) in generalized myasthenia gravis.",
                "cites": ["34146511"]
            },
            {
                "claim": "The phase 3 CHAMPION-MG trial demonstrated that the long-acting terminal complement C5 inhibitor ravulizumab produced rapid and sustained improvements in MG-ADL scores through week 26 with convenient 8-weekly maintenance dosing.",
                "cites": ["38319889"]
            },
            {
                "claim": "International consensus guidance mandates that all patients receiving terminal complement inhibitors (eculizumab, ravulizumab) must receive meningococcal vaccination (serogroups A, C, W, Y and B) at least 2 weeks prior to therapy and prophylactic oral antibiotics until immunization takes effect, due to an increased risk of invasive Neisseria meningitidis infection.",
                "cites": ["33144515", "29066163"]
            }
        ],
        "sources": [
            {
                "pmid": "29066163",
                "title": "Safety and efficacy of eculizumab in anti-acetylcholine receptor antibody-positive refractory generalised myasthenia gravis (REGAIN)",
                "journal": "Lancet Neurol",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "34146511",
                "title": "Safety, efficacy, and tolerability of efgartigimod in patients with generalised myasthenia gravis (ADAPT)",
                "journal": "Lancet Neurol",
                "year": 2021,
                "design": "trial"
            },
            {
                "pmid": "38319889",
                "title": "Ravulizumab in Adults with Generalized Myasthenia Gravis (CHAMPION-MG)",
                "journal": "NEJM Evid",
                "year": 2022,
                "design": "trial"
            },
            {
                "pmid": "33144515",
                "title": "International Consensus Guidance for Management of Myasthenia Gravis: 2020 Update",
                "journal": "Neurology",
                "year": 2021,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Choosing between complement inhibitors versus FcRn antagonists in acute myasthenic crisis as an alternative to plasmapheresis or IVIG.",
            "Long-term infection risk and hypogammaglobulinemia during cyclical repeat courses of FcRn inhibitors."
        ],
        "mcq_angles": [
            "Mechanism of efgartigimod: blocks the neonatal Fc receptor (FcRn), accelerating endogenous IgG and pathogenic autoantibody catabolism.",
            "Mandatory safety requirement before initiating complement inhibitors (eculizumab/ravulizumab): vaccination against Neisseria meningitidis (MenACWY and MenB).",
            "Specific indication for complement inhibitors: anti-AChR antibody-positive generalized myasthenia gravis (complement is NOT activated in anti-MuSK MG, which is mediated by IgG4).",
            "First-line treatment of choice for anti-MuSK positive myasthenia gravis: rituximab (anti-CD20)."
        ],
        "case_hooks": [
            "A 44-year-old woman with severe anti-AChR generalized myasthenia gravis refractory to azathioprine and high-dose prednisone initiating efgartigimod.",
            "A patient starting ravulizumab for refractory gMG receiving urgent MenACWY and MenB vaccines and temporary oral ciprofloxacin prophylaxis."
        ],
        "gaps": "Direct randomized head-to-head trials comparing FcRn antagonists against terminal complement inhibitors in severe generalized myasthenia gravis."
    },
    1162: {
        "cluster": "Infectious Diseases / Rheumatology / Orthopaedics",
        "mentor_intro": "Mycobacterial and fungal arthritis are chronic, indolent joint infections presenting as slowly progressive monoarticular arthritis, characteristically causing substantial diagnostic delay and requiring synovial tissue histopathology, acid-fast and fungal staining, mycobacterial culture/PCR, and prolonged targeted antimicrobial therapy combined with surgical debridement.",
        "teaching_points": [
            {
                "claim": "Tuberculous arthritis typically presents as an indolent, insidious, chronic monoarthritis (most commonly affecting weight-bearing joints: knee, hip, ankle) or spondylodiscitis (Pott's disease); synovial fluid smears are positive for acid-fast bacilli in <30% of cases, making synovial biopsy with granuloma identification and mycobacterial culture/PCR the diagnostic gold standard.",
                "cites": ["2646537", "27516382"]
            },
            {
                "claim": "ATS/CDC/IDSA clinical guidelines recommend treating musculoskeletal and joint tuberculosis with standard four-drug therapy (rifampicin, isoniazid, pyrazinamide, ethambutol) for 2 months followed by rifampicin and isoniazid for a total duration of 6 to 9 months.",
                "cites": ["27516382", "26229122"]
            },
            {
                "claim": "In Candida arthritis, IDSA guidelines mandate surgical debridement or drainage combined with systemic antifungal therapy: fluconazole (400 mg daily) or an echinocandin (caspofungin/anidulafungin) for at least 6 weeks; prosthetic joint involvement necessitates two-stage revision arthroplasty.",
                "cites": ["26679282"]
            },
            {
                "claim": "Endemic fungal joint infections (Blastomyces, Coccidioides, Histoplasma, Sporothrix schenckii) occur via hematogenous dissemination or direct occupational inoculation (e.g., rose thorn prick causing sporotrichoid lymphocutaneous arthritis), treated with intravenous amphotericin B followed by prolonged oral itraconazole for 6-12 months.",
                "cites": ["2646537", "26679282"]
            }
        ],
        "sources": [
            {
                "pmid": "2646537",
                "title": "Bacterial arthritis (including mycobacterial and fungal joint infections)",
                "journal": "N Engl J Med",
                "year": 1989,
                "design": "review"
            },
            {
                "pmid": "27516382",
                "title": "Official American Thoracic Society/Centers for Disease Control and Prevention/Infectious Diseases Society of America Clinical Practice Guidelines: Treatment of Drug-Susceptible Tuberculosis",
                "journal": "Clin Infect Dis",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": "26679282",
                "title": "Clinical Practice Guideline for the Management of Candidiasis: 2016 Update by the Infectious Diseases Society of America",
                "journal": "Clin Infect Dis",
                "year": 2016,
                "design": "guideline"
            },
            {
                "pmid": "26229122",
                "title": "2015 Infectious Diseases Society of America (IDSA) Clinical Practice Guidelines for the Diagnosis and Treatment of Native Vertebral Osteomyelitis in Adults",
                "journal": "Clin Infect Dis",
                "year": 2015,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Optimal timing and surgical indication for joint arthrodesis versus arthroplasty following microbiological cure of tuberculous joint destruction.",
            "Utility of rapid synovial fluid GeneXpert MTB/RIF PCR in culture-negative chronic inflammatory monoarthritis."
        ],
        "mcq_angles": [
            "Diagnostic investigation of choice for suspected tuberculous arthritis: synovial biopsy (shows caseating granulomas and culture positivity far higher than synovial fluid aspiration).",
            "Phemister triad on X-ray in tuberculous arthritis: periarticular osteopenia, marginal erosions, and gradual joint space narrowing.",
            "Treatment duration for skeletal tuberculosis: 6 to 9 months of guideline-directed antituberculous chemotherapy.",
            "Sporothrix schenckii classical presentation: nodular lymphangitis and subacute monoarthritis following rose-thorn puncture treated with itraconazole."
        ],
        "case_hooks": [
            "A 46-year-old immigrant from an endemic region with 6 months of slowly progressive left knee swelling and pain without fever whose synovial biopsy reveals necrotizing caseating granulomas.",
            "An avid gardener presenting with right wrist tenosynovitis and ascending erythematous subcutaneous forearm nodules after trimming rose bushes."
        ],
        "gaps": "Prospective validation of synovial tissue next-generation metagenomic sequencing for the rapid simultaneous identification of rare mycobacterial and fungal pathogens."
    },
    1163: {
        "cluster": "Nephrology / Rheumatology",
        "mentor_intro": "In proliferative lupus nephritis (ISN/RPS Class III/IV), mycophenolate mofetil (MMF) and intravenous cyclophosphamide achieve comparable remission induction efficacy, with MMF demonstrating superior tolerability, higher response rates in non-Caucasian populations, and established superiority as maintenance therapy.",
        "teaching_points": [
            {
                "claim": "In the landmark Aspreva Lupus Management Study (ALMS) induction trial by Appel and colleagues, mycophenolate mofetil (target 3 g daily) demonstrated equivalent overall renal remission rates to intravenous pulse cyclophosphamide (56.2% vs 53.0%), while showing superior response rates in Black and Hispanic patients.",
                "cites": ["19389878"]
            },
            {
                "claim": "In the ALMS maintenance trial, Dooley and colleagues proved that MMF was significantly superior to azathioprine in maintaining renal remission (treatment failure rate 16.4% vs 32.4%; HR 0.44; p=0.003) and significantly prolonged time to renal flare over 36 months.",
                "cites": ["22087679"]
            },
            {
                "claim": "The Euro-Lupus Nephritis Trial established that a low-dose intravenous cyclophosphamide induction regimen (six fortnightly pulses of 500 mg, cumulative dose 3 g) followed by azathioprine achieved long-term renal remission, renal function preservation, and 10-year survival equivalent to high-dose cyclical cyclophosphamide.",
                "cites": ["12209517"]
            },
            {
                "claim": "EULAR/ERA-EDTA guidelines recommend MMF or low-dose Euro-Lupus intravenous cyclophosphamide combined with glucocorticoids as preferred first-line induction for Class III/IV lupus nephritis, with cyclophosphamide preferred in patients with rapidly declining renal function or nephrotic-range proteinuria failing oral therapy.",
                "cites": ["32188680"]
            }
        ],
        "sources": [
            {
                "pmid": "19389878",
                "title": "Mycophenolate mofetil versus cyclophosphamide for induction treatment of lupus nephritis (ALMS)",
                "journal": "J Am Soc Nephrol",
                "year": 2009,
                "design": "trial"
            },
            {
                "pmid": "22087679",
                "title": "Mycophenolate versus azathioprine as maintenance therapy for lupus nephritis (ALMS)",
                "journal": "N Engl J Med",
                "year": 2011,
                "design": "trial"
            },
            {
                "pmid": "12209517",
                "title": "Immunosuppressive therapy in lupus nephritis: the Euro-Lupus Nephritis Trial, a randomized trial of low-dose versus high-dose intravenous cyclophosphamide",
                "journal": "Arthritis Rheum",
                "year": 2002,
                "design": "trial"
            },
            {
                "pmid": "32188680",
                "title": "2019 update of the Joint European League Against Rheumatism and European Renal Association-European Dialysis and Transplant Association (EULAR/ERA-EDTA) recommendations for the management of lupus nephritis",
                "journal": "Ann Rheum Dis",
                "year": 2020,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Optimal triple immunosuppression regimens (MMF plus voclosporin or belimumab) as first-line therapy in high-risk proliferative lupus nephritis.",
            "Fertility preservation protocols (GnRH agonists, oocyte cryopreservation) during pulse cyclophosphamide therapy in women of childbearing age."
        ],
        "mcq_angles": [
            "ALMS trial primary outcome: MMF is non-inferior to IV cyclophosphamide for induction and superior for maintenance compared to azathioprine.",
            "Euro-Lupus regimen dosing: 500 mg IV cyclophosphamide every 2 weeks for a total of 6 doses (cumulative 3 g).",
            "Toxicity differences: cyclophosphamide carries risks of premature ovarian failure, hemorrhagic cystitis, and bladder transitional cell carcinoma; MMF is teratogenic but preserves ovarian reserve.",
            "Racial differences in ALMS induction: Black and Hispanic patients exhibited significantly higher response rates to MMF than cyclophosphamide."
        ],
        "case_hooks": [
            "A 23-year-old woman presenting with biopsy-proven class IV diffuse proliferative lupus nephritis and proteinuria 3.8 g/day who strongly desires future fertility.",
            "A patient with lupus nephritis achieving remission on MMF induction discussing maintenance immunosuppression options."
        ],
        "gaps": "Prospective trials evaluating glucocorticoid-free induction regimens combining MMF with belimumab or calcineurin inhibitors in proliferative lupus nephritis."
    },
    1164: {
        "cluster": "Dermatology / Haematology-Oncology",
        "mentor_intro": "Mycosis fungoides (MF) and Sézary syndrome (SS) are cutaneous T-cell lymphomas (CTCL) of skin-homing CD4+ memory T lymphocytes; management is stage-adapted, employing skin-directed therapies (topical corticosteroids, nitrogen mustard, phototherapy) for early-stage disease and targeted systemic therapies (brentuximab vedotin, mogamulizumab) for advanced disease.",
        "teaching_points": [
            {
                "claim": "In the randomized phase 3 ALCANZA trial, the CD30-directed antibody-drug conjugate brentuximab vedotin demonstrated significant superiority over physician's choice (methotrexate or bexarotene) in CD30-positive cutaneous T-cell lymphoma, achieving an objective response lasting >=4 months (ORR4) of 56.3% versus 12.5% (p<0.0001).",
                "cites": ["28600072"]
            },
            {
                "claim": "The phase 3 MAVORIC trial showed that mogamulizumab (monoclonal antibody targeting CC chemokine receptor 4, CCR4) significantly doubled median progression-free survival compared to vorinostat (7.7 vs 3.1 months; HR 0.53; p<0.0001), demonstrating particularly high activity in the blood compartment of Sézary syndrome.",
                "cites": ["30100378"]
            },
            {
                "claim": "The ISCL/EORTC staging system classifies MF and SS by TNMB criteria, defining Sézary syndrome as leukemic CTCL characterized by generalized erythroderma (T4) and significant peripheral blood involvement (B2: absolute Sézary cell count >=1.0 x 10^9/L, CD4/CD8 ratio >=10, or loss of CD7/CD26 on CD4+ cells).",
                "cites": ["17540844"]
            },
            {
                "claim": "EORTC and WHO guidelines establish that early-stage disease (Stage IA-IIA: patches and plaques covering <10% to >=10% body surface area without tumors) is managed conservatively with skin-directed therapies (topical corticosteroids, topical chlormethine/mechlorethamine gel, PUVA or narrow-band UVB phototherapy) to avoid unnecessary systemic chemotherapy toxicity.",
                "cites": ["30635287", "17540844"]
            }
        ],
        "sources": [
            {
                "pmid": "28600072",
                "title": "Brentuximab vedotin versus physician's choice in CD30-positive cutaneous T-cell lymphoma (ALCANZA)",
                "journal": "Lancet",
                "year": 2017,
                "design": "trial"
            },
            {
                "pmid": "30100378",
                "title": "Mogamulizumab versus vorinostat in previously treated cutaneous T-cell lymphoma (MAVORIC)",
                "journal": "Lancet Oncol",
                "year": 2018,
                "design": "trial"
            },
            {
                "pmid": "17540844",
                "title": "Revisions to the staging and classification of mycosis fungoides and Sézary syndrome: a proposal of the ISCL and EORTC",
                "journal": "Blood",
                "year": 2007,
                "design": "guideline"
            },
            {
                "pmid": "30635287",
                "title": "The 2018 update of the WHO-EORTC classification for primary cutaneous lymphomas",
                "journal": "Blood",
                "year": 2019,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Timing and conditioning regimens for allogeneic hematopoietic cell transplantation in advanced refractory Sézary syndrome.",
            "Long-term management of mogamulizumab-associated severe autoimmune rash mimicking disease progression."
        ],
        "mcq_angles": [
            "Diagnostic definition of Sézary syndrome triad: generalized erythroderma, generalized lymphadenopathy, and circulating clonally identical Sézary cells (cerebriform nuclei).",
            "Flow cytometry signature of Sézary cells: CD4+ T cells with aberrant loss of CD7 and CD26, and CD4/CD8 ratio >=10.",
            "ALCANZA trial outcome: brentuximab vedotin significantly superior for CD30-expressing CTCL.",
            "First-line treatment approach for Stage IA-IB patch/plaque mycosis fungoides: skin-directed therapy (topical steroids, phototherapy, mechlorethamine gel) rather than systemic cytotoxic chemotherapy."
        ],
        "case_hooks": [
            "A 64-year-old man with a 15-year history of erythematous scaly patches on sun-protected bathing-trunk areas with skin biopsy showing atypical CD4+ lymphocytes with epidermotropism and Pautrier microabscesses.",
            "A 71-year-old woman presenting with generalized fiery red erythroderma, intense pruritus, alopecia, and peripheral blood showing 2.8 x 10^9/L atypical cerebriform lymphocytes."
        ],
        "gaps": "Targeted therapies combining epigenetic modifiers with checkpoint inhibitors in advanced refractory Sézary syndrome."
    },
    1165: {
        "cluster": "Haematology / Oncology",
        "mentor_intro": "Azacitidine is a DNA methyltransferase inhibitor that represents the established standard-of-care hypomethylating therapy for higher-risk myelodysplastic syndromes (MDS), demonstrating proven overall survival prolongation and delayed progression to acute myeloid leukemia.",
        "teaching_points": [
            {
                "claim": "In the landmark randomized phase 3 AZA-001 trial by Fenaux and colleagues, azacitidine (75 mg/m2/day subcutaneously for 7 consecutive days every 28 days) significantly prolonged median overall survival from 15.0 months with conventional care to 24.5 months (HR 0.58; 95% CI 0.43-0.77; p=0.0001) in higher-risk MDS.",
                "cites": ["19230772"]
            },
            {
                "claim": "In AZA-001, azacitidine almost doubled the 2-year overall survival rate compared to conventional care regimens (50.8% vs 26.2%; p<0.0001) and significantly delayed the median time to acute myeloid leukemia transformation from 11.5 to 17.8 months.",
                "cites": ["19230772"]
            },
            {
                "claim": "Risk stratification is guided by the Revised International Prognostic Scoring System (IPSS-R), incorporating cytogenetic risk categories, marrow blast percentage, depth of cytopenias, and age; higher-risk categories (intermediate, high, very high) are standard indications for hypomethylating therapy.",
                "cites": ["22740453", "23378539"]
            },
            {
                "claim": "European LeukemiaNet (ELN) guidelines emphasize that a minimum of 4 to 6 cycles of azacitidine must be administered before evaluating for clinical response or declaring treatment failure, as responses develop gradually over multiple treatment cycles.",
                "cites": ["23378539", "12011120"]
            }
        ],
        "sources": [
            {
                "pmid": "19230772",
                "title": "Efficacy of azacitidine compared with that of conventional care regimens in the treatment of higher-risk myelodysplastic syndromes: a randomised, open-label, phase III study (AZA-001)",
                "journal": "Lancet Oncol",
                "year": 2009,
                "design": "trial"
            },
            {
                "pmid": "22740453",
                "title": "Revised International Prognostic Scoring System for Myelodysplastic Syndromes (IPSS-R)",
                "journal": "Blood",
                "year": 2012,
                "design": "guideline"
            },
            {
                "pmid": "12011120",
                "title": "Randomized controlled trial of azacitidine in patients with the myelodysplastic syndrome (CALGB 9221)",
                "journal": "J Clin Oncol",
                "year": 2002,
                "design": "trial"
            },
            {
                "pmid": "23378539",
                "title": "Diagnosis and treatment of primary myelodysplastic syndromes in adults: European LeukemiaNet consensus recommendations",
                "journal": "Blood",
                "year": 2013,
                "design": "guideline"
            }
        ],
        "uncertainties": [
            "Addition of venetoclax to azacitidine in newly diagnosed higher-risk MDS (balancing enhanced response rates against severe prolonged myelosuppression).",
            "Optimal timing and conditioning for allogeneic stem cell transplantation in older fit patients responding to initial azacitidine cycles."
        ],
        "mcq_angles": [
            "Primary endpoint and landmark survival finding of AZA-001: 9.5-month median overall survival advantage and doubling of 2-year survival with azacitidine over conventional care.",
            "Standard administration schedule of azacitidine: 75 mg/m2/day subcutaneously for 7 days every 28 days.",
            "Crucial management rule: maintain therapy for at least 4 to 6 cycles before determining therapeutic failure.",
            "Mechanism of action: DNA methyltransferase (DNMT) inhibition leading to DNA hypomethylation and re-expression of silenced tumor suppressor genes."
        ],
        "case_hooks": [
            "A 69-year-old man with IPSS-R high-risk MDS (12% bone marrow myeloblasts, complex karyotype, pancytopenia) initiating azacitidine therapy.",
            "A patient after 2 cycles of azacitidine with persistent cytopenias whose junior doctor prematurely considers stopping therapy before completing the mandated 4-6 cycles."
        ],
        "gaps": "Effective second-line therapies for higher-risk MDS patients who fail or progress during first-line hypomethylating agent treatment."
    }
}
