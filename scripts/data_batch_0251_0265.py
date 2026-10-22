# data_batch_0251_0265.py
"""
Definitions for Batch 1 of Sheet 2 / Topics 251-500 (Topics 251 to 265).
"""
from data_batch_0001_0015 import make_entry

BATCH_SHEET2_B1 = {}

# 251: Biofilm-Associated Infections: Chronic Wounds, Prosthetics, Rifampicin Strategies
BATCH_SHEET2_B1[251] = make_entry(
    'biofilm_associated_infections_prosthetics_rifampicin',
    "Biofilm-associated infections involving prosthetic joints, vascular grafts, chronic wounds, and indwelling central catheters are characterized by bacterial communities encased in an extracellular polymeric substance (EPS) matrix. Bacteria within biofilms enter a low-metabolic 'persister' phenotype conferring extreme tolerance to standard cell wall-active antibiotics. In staphylococcal prosthetic joint infections (PJI), the landmark Zimmerli trials established that debridement, antibiotics, and implant retention (DAIR) requires combination bactericidal biofilm-active therapy—specifically oral rifampicin paired with a companion agent (fluoroquinolone, cotrimoxazole, or fusidic acid)—to eradicate adherent surface biofilms. Rifampicin monotherapy is strictly contraindicated due to rapid emergence of single-step rpoB point mutation resistance.",
    [
        ("In the landmark randomized trial by Zimmerli et al. (NEJM), adding oral rifampicin to ciprofloxacin in early staphylococcal orthopedic implant infections treated with surgical debridement and implant retention achieved a 100% cure rate compared with 58% for ciprofloxacin alone.", ["15470216"]),
        ("Rifampicin should never be initiated until the bacterial bioburden has been surgically debrided and blood cultures cleared, and must never be administered as monotherapy to avoid rapid selection of resistant rpoB mutants.", ["23223593", "15470216"]),
        ("In chronic non-healing wounds, bacterial biofilms delay re-epithelialization by maintaining chronic non-resolving inflammation; repeated sharp physical debridement remains the cornerstone of biofilm disruption because topical antimicrobials cannot penetrate mature EPS matrices.", ["11549419"]),
        ("IDSA prosthetic joint infection guidelines recommend 3 months of oral rifampicin-based combination therapy for total hip arthroplasties and 6 months for total knee arthroplasties managed with DAIR.", ["23223593"])
    ],
    [
        ("15470216", "Prosthetic-joint infections (Zimmerli Review & Trial).", 2004, "trial"),
        ("23223593", "Diagnosis and management of prosthetic joint infection: clinical practice guidelines by the Infectious Diseases Society of America (IDSA).", 2013, "guideline"),
        ("11549419", "Biofilms and device-associated infections.", 2001, "review")
    ],
    [
        "Optimal companion oral partner for rifampicin in methicillin-resistant Staphylococcus aureus (MRSA) PJI when fluoroquinolone resistance is present.",
        "Role of bacteriophage therapy and novel biofilm-dispersing enzymes in chronic recalcitrant implant infections."
    ],
    [
        "Evidence from the Zimmerli trial supporting combination rifampicin in staphylococcal prosthetic implant retention.",
        "Molecular mechanism of rapid rifampicin resistance emergence (rpoB mutations) under monotherapy.",
        "Duration of targeted oral rifampicin combination therapy in total hip versus total knee arthroplasties under IDSA guidelines."
    ],
    [
        "A 68-year-old male with a total knee arthroplasty implanted 3 weeks ago who develops acute Staphylococcus aureus infection, managed with DAIR and rifampicin plus levofloxacin.",
        "A 72-year-old female with an infected hip hemiarthroplasty inappropriately prescribed rifampicin monotherapy, developing high-level rifampicin resistance within 5 days."
    ]
)

# 252: Biological Therapy for Asthma
BATCH_SHEET2_B1[252] = make_entry(
    'biological_therapy_for_asthma',
    "Targeted biological therapy has transformed the management of severe, uncontrolled asthma refractory to maximal inhaled corticosteroid and long-acting bronchodilator (ICS-LABA) regimens. Contemporary GINA guidelines recommend phenotyping patients into Type 2 (T2)-high inflammation (characterized by blood eosinophils >= 150-300 cells/uL, fractional exhaled nitric oxide [FeNO] >= 20-25 ppb, or allergen-driven IgE) versus non-T2 asthma. Five distinct monoclonal antibody pathways are approved: anti-IgE (omalizumab), anti-IL-5 (mepolizumab, reslizumab), anti-IL-5 receptor alpha (benralizumab), anti-IL-4 receptor alpha (dupilumab), and the epithelial alarmin inhibitor anti-TSLP (tezepelumab), which also benefits non-T2 severe asthma.",
    [
        ("The NAVIGATOR randomized phase 3 trial (Castro et al., NEJM) proved that tezepelumab (anti-TSLP) significantly reduced annualized asthma exacerbation rates by 56% across all patients, maintaining efficacy in patients with low baseline blood eosinophils (< 300 cells/uL) and FeNO.", ["33979488"]),
        ("The landmark LIBERTY ASTHMA QUEST trial demonstrated that dupilumab (blocking IL-4 and IL-13 signaling via IL-4R alpha) reduced exacerbation rates by nearly 50% and improved FEV1 by 200 mL in patients with elevated eosinophils or FeNO.", ["29782210"]),
        ("The MENSA trial established that mepolizumab (anti-IL-5) halved severe asthma exacerbations (53% reduction) and reduced emergency department visits in patients with blood eosinophils >= 150 cells/uL at screening.", ["25199059"]),
        ("GINA guidelines mandate a minimum 4-month trial of biologic therapy before evaluating clinical response (reduction in oral corticosteroid use, lower exacerbation frequency, improved spirometry and symptom scores).", ["35017185"])
    ],
    [
        ("33979488", "Tezepelumab in Adults and Adolescents with Severe, Uncontrolled Asthma (NAVIGATOR Trial).", 2021, "trial"),
        ("29782210", "Dupilumab Efficacy and Safety in Moderate-to-Severe Uncontrolled Asthma (LIBERTY ASTHMA QUEST).", 2018, "trial"),
        ("25199059", "Mepolizumab for Prednisone-Dependent Asthma with Sputum Eosinophilia (MENSA Trial).", 2014, "trial"),
        ("35017185", "Global Strategy for Asthma Management and Prevention: GINA Executive Summary.", 2022, "guideline")
    ],
    [
        "Criteria and clinical predictors for successful tapering and potential discontinuation of biologic therapy after years of disease stability.",
        "Comparative efficacy of switching to anti-TSLP (tezepelumab) in patients who exhibit sub-optimal response to anti-IL-5 or anti-IL-4R biologics."
    ],
    [
        "Biomarker profiles defining eligibility for anti-IL-5 (mepolizumab), anti-IL-4R (dupilumab), and anti-TSLP (tezepelumab).",
        "Unique clinical profile of tezepelumab from NAVIGATOR in severe asthma lacking traditional T2-high biomarkers.",
        "Assessment timeframe (minimum 4 months) to gauge clinical response to biologic therapies under GINA."
    ],
    [
        "A 42-year-old female with severe asthma on maximal triple inhaled therapy having 4 oral steroid-treated exacerbations per year, with blood eosinophils 450/uL and FeNO 55 ppb, initiated on dupilumab.",
        "A 56-year-old male with severe steroid-refractory non-eosinophilic asthma (eosinophils 90/uL, FeNO 12 ppb) successfully treated with tezepelumab."
    ]
)

# 253: Biologics and Malignancy Risk: Lymphoma, Solid Tumours, Non-Melanoma Skin Cancer
BATCH_SHEET2_B1[253] = make_entry(
    'biologics_and_malignancy_risk',
    "The potential association between biological disease-modifying antirheumatic drugs (bDMARDs)—particularly TNF-alpha inhibitors—and de novo or recurrent malignancy has been evaluated extensively across large prospective nationwide registries. Rigorous long-term registry data (such as the French RATIO, Swedish ARTIS, and British BSRBR registries) have definitively shown that TNF inhibitors do not increase the overall risk of solid tumors or lymphomas beyond the baseline elevation inherent to active, severe rheumatoid arthritis. However, TNF inhibitor therapy is associated with a modest but statistically significant 30-40% increase in the risk of non-melanoma skin cancer (NMSC: basal cell and squamous cell carcinoma), mandating routine dermatologic skin surveillance.",
    [
        ("The Swedish ARTIS registry study (Askling et al.) of over 6,000 RA patients treated with TNF inhibitors demonstrated no increased risk of overall solid cancers or non-Hodgkin lymphoma compared with biologic-naive RA controls with similar inflammatory disease activity.", ["19808605"]),
        ("The French RATIO prospective registry (Mariette et al.) showed that the observed lymphoma risk in RA patients on anti-TNF therapy is primarily driven by high chronic inflammatory activity rather than the biologic agent itself.", ["20551156"]),
        ("In the British Society for Rheumatology Biologics Register (BSRBR; Mercer et al.), anti-TNF therapy was associated with a statistically significant increased hazard (HR 1.3-1.4) of non-melanoma skin cancer, supporting annual skin cancer screening.", ["23180806"]),
        ("EULAR and ACR recommendations indicate that in patients with a history of successfully treated solid malignancy in remission for >= 5 years, biologic therapy (particularly rituximab or non-TNF biologics) may be considered when conventional DMARDs fail.", ["31053612"])
    ],
    [
        ("19808605", "Cancer risk in patients with rheumatoid arthritis treated with anti-tumor necrosis factor alpha therapies: does the risk change with the time since start of treatment? (ARTIS Registry).", 2009, "trial"),
        ("20551156", "Lymphoma in patients with rheumatoid arthritis treated with anti-TNF therapy: Results from the French RATIO registry.", 2010, "trial"),
        ("23180806", "The incidence of non-melanoma skin cancer in patients with rheumatoid arthritis treated with anti-TNF therapy: results from the BSRBR.", 2012, "trial"),
        ("31053612", "EULAR points to consider for the management of rheumatoid arthritis patients with a history of cancer.", 2019, "guideline")
    ],
    [
        "Safety and optimal timing of initiating biologic DMARDs in patients with recent (< 5 years) successfully resected breast, colon, or prostate carcinoma.",
        "Comparative melanoma risk among patients receiving newer targeted synthetic DMARDs (JAK inhibitors) versus classic TNF inhibitors."
    ],
    [
        "Real-world lymphoma risks in rheumatoid arthritis: distinguishing disease severity from biologic exposure based on RATIO and ARTIS.",
        "Specific malignancy type (non-melanoma skin cancer) showing elevated hazard ratios on anti-TNF therapy.",
        "Recommendations regarding biologic selection (e.g., rituximab) in patients with a prior history of treated lymphoid or solid malignancy."
    ],
    [
        "A 58-year-old male with severe erosive RA and previous basal cell carcinoma excision, counseled on regular annual skin exams upon starting adalimumab.",
        "A 64-year-old female with RA who underwent curative mastectomy for early breast cancer 7 years ago, being evaluated for biologic DMARD initiation."
    ]
)

# 254: Biologic Switching in RA: Mechanism Switching vs Same Class After Failure
BATCH_SHEET2_B1[254] = make_entry(
    'biologic_switching_in_rheumatoid_arthritis',
    "When patients with rheumatoid arthritis experience treatment failure on their first biological DMARD, determining whether to rotate within the same mechanism of action (cycling to a second TNF inhibitor) or switch to an alternate class with a distinct mechanism (anti-IL-6 receptor tocilizumab, T-cell costimulation blocker abatacept, B-cell depleter rituximab, or JAK inhibitors) is a fundamental decision. The randomized ROC trial conclusively established that switching to a non-TNF targeted mechanism yields significantly higher clinical response rates (EULAR good/moderate response) and disease low activity than cycling to a second anti-TNF, particularly after primary lack of efficacy.",
    [
        ("In the multicenter randomized ROC trial (Gottenberg et al., JAMA), patients with active RA failing an initial anti-TNF who were switched to a non-TNF biologic (abatacept, rituximab, or tocilizumab) achieved significantly higher EULAR good or moderate response rates at 6 months (69% vs 52%, p=0.003) than those cycled to a second anti-TNF.", ["27653778"]),
        ("EULAR 2022 management recommendations recommend switching to a medication with an alternate mode of action (IL-6 inhibitor, abatacept, rituximab, or JAK inhibitor) or another anti-TNF agent after biologic failure.", ["36357155"]),
        ("In primary non-responders (no initial disease suppression by 3 months), mechanism switching to a non-TNF agent is vastly superior, as non-response reflects TNF-independent inflammatory biology.", ["27653778", "26082495"]),
        ("In secondary failure (initial good response followed by loss of efficacy over time), detection of anti-drug antibodies (ADAs) identifies patients who can respond successfully to cycling to an alternate TNF inhibitor.", ["26082495", "36357155"])
    ],
    [
        ("27653778", "Non-TNF-Targeted Biologic Agents vs Second Anti-TNF Agent in Rheumatoid Arthritis: The ROC Randomized Clinical Trial.", 2016, "trial"),
        ("36357155", "EULAR recommendations for the management of rheumatoid arthritis with synthetic and biological disease-modifying antirheumatic drugs: 2022 update.", 2023, "guideline"),
        ("26082495", "Primary versus secondary failure of anti-TNF therapy in rheumatoid arthritis: clinical implications and therapeutic strategies.", 2015, "review")
    ],
    [
        "Comparative durability and radiographic retention of JAK inhibitors (tofacitinib, upadacitinib) versus IL-6 inhibitors (tocilizumab) following second biologic failure.",
        "Clinical utility and cost-effectiveness of routine therapeutic drug monitoring and anti-drug antibody testing to guide switching pathways."
    ],
    [
        "Primary clinical outcomes and EULAR response differences from the ROC randomized trial comparing mechanism switching to anti-TNF cycling.",
        "Distinction in clinical rationale between primary biologic non-response versus secondary loss of response.",
        "Selection of non-TNF biologics (tocilizumab, abatacept, rituximab) based on seropositive status and comorbidities."
    ],
    [
        "A 51-year-old female with seropositive RA exhibiting zero improvement in DAS28 after 3 months of adalimumab (primary non-response), switched to tocilizumab.",
        "A 60-year-old male who had 4 years of complete remission on infliximab and now experiences secondary flare with high anti-infliximab neutralizing antibodies, successfully transitioned to etanercept."
    ]
)

# 255: Biologic Therapies in Severe Eosinophilic Asthma
BATCH_SHEET2_B1[255] = make_entry(
    'biologic_therapies_severe_eosinophilic_asthma',
    "Severe eosinophilic asthma (SEA) represents a distinct, adult-onset Type 2-high inflammatory endotype driven by interleukin-5 (IL-5), the master cytokine governing eosinophil differentiation, activation, and survival. Monoclonal antibodies targeting either the soluble IL-5 ligand (mepolizumab, reslizumab) or the IL-5 receptor alpha chain on eosinophils and basophils (benralizumab) have demonstrated profound clinical efficacy in randomized clinical trials (MENSA, SIROCCO, CALIMA, and SIRIUS). In addition to halving asthma exacerbations and improving lung function, IL-5/IL-5R blockade achieves remarkable oral corticosteroid (OCS)-sparing effects, allowing up to 50-75% of previously steroid-dependent patients to completely discontinue maintenance oral prednisone.",
    [
        ("The landmark MENSA trial (Ortega et al., NEJM) proved that mepolizumab (100 mg SC every 4 weeks) reduced severe exacerbations by 53% and significantly improved asthma quality-of-life scores in patients with recurrent exacerbations and blood eosinophils >= 150/uL.", ["25199059"]),
        ("In the randomized double-blind SIROCCO and CALIMA phase 3 trials, benralizumab (30 mg SC every 8 weeks) reduced annual exacerbation rates by up to 51% and rapidly induced near-complete depletion of circulating blood eosinophils via antibody-dependent cell-mediated cytotoxicity (ADCC).", ["27609401", "27609400"]),
        ("The SIRIUS trial established that mepolizumab enabled a median 50% reduction in daily oral corticosteroid dose while maintaining asthma symptom control, with 14% of patients achieving complete prednisone cessation compared with placebo.", ["25199060"]),
        ("Selection of anti-IL-5 therapy requires documented peripheral blood eosinophilia (>= 150 cells/uL at presentation or >= 300 cells/uL within the preceding 12 months); baseline eosinophil count directly predicts the magnitude of exacerbation reduction.", ["35017185", "25199059"])
    ],
    [
        ("25199059", "Mepolizumab for Prednisone-Dependent Asthma with Sputum Eosinophilia (MENSA Trial).", 2014, "trial"),
        ("27609401", "Efficacy and safety of benralizumab for patients with severe, uncontrolled asthma with eosinophilia: a randomised, double-blind, placebo-controlled phase 3 trial (SIROCCO).", 2016, "trial"),
        ("27609400", "Benralizumab, an anti-interleukin-5 receptor alpha monoclonal antibody, as add-on treatment for patients with severe, uncontrolled, eosinophilic asthma (CALIMA).", 2016, "trial"),
        ("25199060", "Oral Glucocorticoid-Sparing Effect of Mepolizumab in Severe Eosinophilic Asthma (SIRIUS Trial).", 2014, "trial"),
        ("35017185", "Global Strategy for Asthma Management and Prevention: GINA Executive Summary.", 2022, "guideline")
    ],
    [
        "Long-term immunological sequelae of sustained complete peripheral eosinophil depletion induced by benralizumab beyond 5 years of treatment.",
        "Role of IL-5 blockade in managing concurrent eosinophilic granulomatosis with polyangiitis (EGPA) in patients with severe asthma."
    ],
    [
        "Exacerbation and OCS-sparing endpoints achieved by mepolizumab in the MENSA and SIRIUS trials.",
        "Mechanism of action of benralizumab (ADCC via natural killer cells) leading to absolute eosinophil depletion versus mepolizumab ligand sequestration.",
        "Biomarker thresholds (blood eosinophil counts) defining candidate eligibility for anti-IL-5 therapy."
    ],
    [
        "A 49-year-old male with severe adult-onset asthma on maintenance prednisone 15 mg daily and blood eosinophils 620/uL, initiated on mepolizumab and successfully tapered off oral steroids.",
        "A 55-year-old female with frequent asthma exacerbations and blood eosinophils 400/uL who achieves profound depletion of eosinophils to 0/uL within 48 hours of her first benralizumab dose."
    ]
)

# 256: Biologic Therapy Pre-Treatment Infection Screening
BATCH_SHEET2_B1[256] = make_entry(
    'biologic_therapy_infection_screening',
    "Prior to the initiation of biologic or targeted synthetic DMARDs (anti-TNF, anti-IL-6, anti-IL-17, anti-IL-23, anti-CD20, and JAK inhibitors), rigorous standardized pre-treatment screening for latent and active infections is legally and clinically mandatory. Immunosuppressive biologic therapies significantly increase the risk of reactivation of latent tuberculosis (LTBI) and chronic hepatitis B virus (HBV). American College of Rheumatology (ACR) and European consensus guidelines mandate baseline screening with interferon-gamma release assays (IGRA) or tuberculin skin testing (TST), chest radiography, and comprehensive hepatitis B serologies (HBsAg, anti-HBc total, anti-HBs) and hepatitis C antibodies (anti-HCV).",
    [
        ("ACR guidelines for rheumatoid arthritis mandate screening for latent tuberculosis with an IGRA or TST and chest radiograph prior to initiating any biologic or targeted synthetic DMARD.", ["34101387"]),
        ("In patients testing positive for latent tuberculosis (positive IGRA without active symptoms or radiographic disease), prophylactic LTBI therapy (e.g., 3-4 months of rifampin or 3 months of weekly isoniazid plus rifapentine) must be initiated, and biologic therapy should be delayed for at least 1 month of completed prophylactic treatment.", ["34101387", "18275037"]),
        ("Hepatitis B screening must include both HBsAg and anti-HBc; in patients with resolved hepatitis B (HBsAg negative, anti-HBc positive), B-cell depleting therapies (rituximab) carry a high (> 10-20%) risk of fatal viral reactivation, requiring mandatory prophylactic antiviral therapy (entecavir).", ["28359837", "25068478"]),
        ("European consensus guidelines emphasize assessing serological status for HIV, hepatitis C, and varicella zoster virus (VZV) prior to biologic initiation, ensuring completion of indicated non-live vaccines.", ["25068478", "34101387"])
    ],
    [
        ("34101387", "2021 American College of Rheumatology Guideline for the Treatment of Rheumatoid Arthritis.", 2021, "guideline"),
        ("25068478", "Systematic review and consensus recommendations on the screening and management of tuberculosis and viral hepatitis prior to biologic therapy.", 2014, "consensus-guideline"),
        ("18275037", "Screening for latent tuberculosis infection in patients with rheumatoid arthritis: an international perspective.", 2008, "review"),
        ("28359837", "EASL 2017 Clinical Practice Guidelines on the management of hepatitis B virus infection.", 2017, "guideline")
    ],
    [
        "Whether serial annual tuberculosis re-screening with IGRA is cost-effective in patients residing in low-endemic countries without known TB re-exposure.",
        "Monitoring protocols (serial HBV DNA every 1-3 months) versus universal preemptive antiviral prophylaxis in patients receiving anti-TNF therapy with isolated anti-HBc positivity."
    ],
    [
        "Required baseline screening tests (IGRA, chest X-ray, HBsAg, anti-HBc, anti-HCV) before starting biologic DMARDs.",
        "Delay required between starting latent TB prophylactic antibiotics and initiating biological therapy (minimum 1 month).",
        "High risk of HBV reactivation with rituximab in anti-HBc positive individuals and indication for prophylactic entecavir."
    ],
    [
        "A 45-year-old female with severe RA whose pre-biologic IGRA is positive with a normal chest X-ray, initiated on 3 months of weekly isoniazid/rifapentine 4 weeks before starting adalimumab.",
        "A 62-year-old male planned for rituximab for refractory vasculitis whose labs show HBsAg negative, anti-HBc positive, and HBV DNA undetectable, requiring prophylactic entecavir."
    ]
)

# 257: Biologic Therapy Pre-Treatment Infection Screening & Immunizations
BATCH_SHEET2_B1[257] = make_entry(
    'biologic_therapy_screening_and_vaccination',
    "Beyond tuberculosis and hepatitis, comprehensive pre-treatment evaluation before initiating biological or targeted synthetic therapies requires assessing endemic fungal risks, screening for latent parasitic infections (Strongyloides in exposed populations), and updating the patient's vaccination schedule. EULAR and ACR consensus guidelines recommend administering all indicated non-live vaccines (pneumococcal conjugate PCV20, recombinant zoster vaccine Shingrix, influenza, COVID-19, and hepatitis B) prior to immunosuppression. Live-attenuated vaccines (e.g., MMR, yellow fever, oral polio) are strictly contraindicated during active biologic therapy and must be completed at least 4 weeks prior to biologic initiation.",
    [
        ("EULAR recommendations on vaccination in adult patients with autoimmune inflammatory rheumatic diseases advise administering all indicated vaccines during stable disease, ideally prior to commencing biologic DMARD therapy, to ensure optimal humoral immune responses.", ["31443672"]),
        ("Live-attenuated vaccines are strictly contraindicated during therapy with biologic DMARDs; if indicated, live vaccines must be administered at least 4 weeks before the initiation of biologic treatment.", ["31443672", "26508738"]),
        ("Recombinant zoster vaccine (Shingrix, a non-live adjuvant subunit vaccine) is safe, highly immunogenic, and strongly recommended in patients >= 19-50 years of age initiating biologic or targeted synthetic DMARDs (including JAK inhibitors) to prevent herpes zoster reactivation.", ["31443672"]),
        ("In patients originating from or traveling to endemic areas, screening for Strongyloides stercoralis (with serology) is recommended prior to high-dose immunosuppression, as biologic and corticosteroid therapy can trigger catastrophic Strongyloides hyperinfection syndrome.", ["26508738"])
    ],
    [
        ("31443672", "2019 update of EULAR recommendations for vaccination in adult patients with autoimmune inflammatory rheumatic diseases.", 2020, "guideline"),
        ("26508738", "Infections and biologic DMARDs: consensus recommendations of the European League Against Rheumatism (EULAR).", 2016, "consensus-guideline")
    ],
    [
        "Duration of biologic drug-free washout required before a live vaccine can be safely administered to a patient needing emergency travel vaccination.",
        "Safety and booster timing of adjuvanted recombinant zoster vaccination concurrently administered during anti-CD20 (rituximab) therapy."
    ],
    [
        "Absolute contraindication of live-attenuated vaccines during active biologic therapy and mandatory 4-week pre-treatment safety buffer.",
        "Indications for the non-live recombinant zoster vaccine (Shingrix) prior to starting biologics and JAK inhibitors.",
        "Clinical risks and screening indications for Strongyloides hyperinfection syndrome in immunosuppressed hosts."
    ],
    [
        "A 38-year-old female preparing for infliximab for Crohn disease who receives Shingrix and PCV20 without interrupting her induction schedule.",
        "A 52-year-old male with active psoriatic arthritis scheduled for secukinumab requesting a yellow fever vaccine for international travel, advised to delay biologic therapy by 4 weeks after the live vaccine."
    ]
)

# 258: Bipolar Depression Pharmacotherapy
BATCH_SHEET2_B1[258] = make_entry(
    'bipolar_depression_pharmacotherapy',
    "Treating acute bipolar depression is one of the most challenging areas in psychiatric medicine because antidepressant monotherapy (SSRIs, SNRIs, tricyclics) carries minimal proven efficacy and poses a substantial risk of precipitating manic switch, cycle acceleration, or mixed states. Evidence-based guidelines (CANMAT and ISBD) endorse atypical antipsychotics with proven antimanic and antidepressant properties as first-line monotherapy: quetiapine (BOLDER trials), lurasidone (PREVAIL trials), lumateperone, cariprazine, or the olanzapine-fluoxetine combination (OFC). Lamotrigine and lithium provide valuable mood-stabilizing maintenance, but are slower-acting for severe acute depressive crises.",
    [
        ("In the randomized, double-blind, placebo-controlled BOLDER trials (Calabrese et al., Am J Psychiatry), quetiapine monotherapy (300 mg or 600 mg daily) demonstrated rapid and statistically significant reductions in depressive symptoms (MADRS score) in both bipolar I and bipolar II depression.", ["15994999"]),
        ("The PREVAIL randomized trial (Suppes et al.) proved that lurasidone monotherapy (20-120 mg daily, taken with >= 350 calories) achieved significant depressive symptom improvement with minimal metabolic liabilities (weight neutral) compared to placebo.", ["24077641"]),
        ("The Canadian Network for Mood and Anxiety Treatments (CANMAT) and ISBD guidelines recommend quetiapine, lurasidone, cariprazine, and lithium as first-line treatments for acute bipolar I depression, and strongly recommend against antidepressant monotherapy.", ["29536616"]),
        ("Antidepressants (specifically bupropion or SSRIs) should only ever be considered as adjuncts to a therapeutic mood stabilizer (lithium, valproate, or second-generation antipsychotic) in bipolar I depression, and should be tapered once depressive remission is achieved.", ["29536616", "20092882"])
    ],
    [
        ("15994999", "A randomized, double-blind, placebo-controlled trial of quetiapine in the treatment of bipolar I and II depression: the BOLDER study.", 2005, "trial"),
        ("24077641", "Lurasidone in the treatment of bipolar depression: a randomized, double-blind, placebo-controlled study (PREVAIL 1).", 2013, "trial"),
        ("29536616", "Canadian Network for Mood and Anxiety Treatments (CANMAT) and International Society for Bipolar Disorders (ISBD) 2018 guidelines for the management of patients with bipolar disorder.", 2018, "guideline"),
        ("20092882", "Lithium plus valproate combination therapy versus monotherapy for relapse prevention in bipolar I disorder (BALANCE): a randomised open-label trial.", 2010, "trial")
    ],
    [
        "Comparative efficacy of lumateperone versus cariprazine in bipolar depression with predominant anhedonia or cognitive slowing.",
        "Role of intravenous ketamine or intranasal esketamine as rapid-acting anti-suicidal rescue therapy in severe treatment-resistant bipolar depression."
    ],
    [
        "First-line medications for acute bipolar depression established by CANMAT/ISBD guidelines.",
        "Clinical evidence and metabolic profile comparing quetiapine (BOLDER) versus lurasidone (PREVAIL).",
        "The hazards and contraindications of antidepressant monotherapy in bipolar I disorder (manic switch and cycle destabilization)."
    ],
    [
        "A 28-year-old male with bipolar I disorder presenting with severe psychomotor retardation, profound melancholia, and suicidal ideation, initiated on quetiapine 300 mg at bedtime.",
        "A 34-year-old female with bipolar depression concerned about weight gain who is successfully treated with lurasidone 40 mg taken with an evening meal."
    ]
)

# 259: Bipolar Disorder Maintenance Mood Stabilizer Therapy
BATCH_SHEET2_B1[259] = make_entry(
    'bipolar_disorder_maintenance_therapy',
    "Maintenance pharmacotherapy is essential for individuals with bipolar disorder to prevent affective relapse (both manic and depressive poles), attenuate subthreshold mood instability, and reduce completed suicide rates. Lithium remains the gold standard, first-line mood stabilizer, demonstrating unmatched long-term evidence in preventing relapse and reducing suicide risk by > 60-80%. In the landmark BALANCE trial, lithium monotherapy and combined lithium plus valproate were both significantly superior to valproate monotherapy in preventing relapse. Lamotrigine provides preferential protection against recurrent depressive episodes, while second-generation antipsychotics (quetiapine, aripiprazole, olanzapine) prevent predominantly manic recurrences.",
    [
        ("In the open-label randomized BALANCE trial (Geddes et al., Lancet), lithium monotherapy and combined lithium plus valproate were both significantly more effective at preventing relapse to any mood episode than valproate monotherapy in bipolar I disorder.", ["20092882"]),
        ("Lithium possesses proven, unique anti-suicidal properties independent of its mood-stabilizing effects, reducing suicides and suicide attempts by over 60-80% compared with other mood stabilizers and placebo.", ["29536616", "20092882"]),
        ("Lamotrigine demonstrates preferential efficacy in preventing depressive relapses rather than manic relapses; slow upward dose titration (25 mg daily for 2 weeks, doubling every 2 weeks) is mandatory to prevent life-threatening Stevens-Johnson syndrome.", ["12513941"]),
        ("Therapeutic drug monitoring is essential for lithium maintenance, targeting serum trough concentrations of 0.6 to 0.8 mmol/L (up to 1.0 mmol/L during acute stabilization), with regular 6-month surveillance of renal function (eGFR) and thyroid-stimulating hormone (TSH).", ["29536616"])
    ],
    [
        ("20092882", "Lithium plus valproate combination therapy versus monotherapy for relapse prevention in bipolar I disorder (BALANCE): a randomised open-label trial.", 2010, "trial"),
        ("12513941", "A placebo-controlled 18-month trial of lamotrigine and lithium maintenance treatment in recently manic or hypomanic patients with bipolar I disorder.", 2003, "trial"),
        ("29536616", "Canadian Network for Mood and Anxiety Treatments (CANMAT) and International Society for Bipolar Disorders (ISBD) 2018 guidelines for the management of patients with bipolar disorder.", 2018, "guideline")
    ],
    [
        "Safety and efficacy of long-term lithium in elderly bipolar patients with mild-to-moderate chronic kidney disease (eGFR 45-60 mL/min).",
        "Comparative maintenance durability of once-monthly injectable atypical antipsychotics (aripiprazole lauroxil, paliperidone palmitate) in patients with severe medication non-adherence."
    ],
    [
        "Key comparative outcomes between lithium, valproate, and their combination from the BALANCE trial.",
        "Anti-suicide properties and target serum trough monitoring parameters (0.6-0.8 mmol/L) for lithium.",
        "Mandatory slow dose titration protocol for lamotrigine to prevent severe cutaneous adverse reactions."
    ],
    [
        "A 30-year-old female with bipolar I disorder with 3 past manic episodes initiated on lithium carbonate, stabilized at a trough level of 0.72 mmol/L with normal renal and thyroid panels.",
        "A 24-year-old male with bipolar II disorder and predominant depressive recurrences successfully maintained on lamotrigine 200 mg daily."
    ]
)

# 260: Bipolar Mania Acute Pharmacotherapy
BATCH_SHEET2_B1[260] = make_entry(
    'bipolar_mania_acute_pharmacotherapy',
    "Acute bipolar mania represents a psychiatric emergency characterized by grandiosity, decreased need for sleep, pressured speech, racing thoughts, severe impulsivity, and psychotic features. Rapid control of agitation, psychosis, and mood elevation is necessary to prevent bodily harm, social disruption, and exhaustion. In a comprehensive Lancet network meta-analysis of 18 antimanic drugs (Cipriani et al.), dopamine-blocking atypical antipsychotics (haloperidol, risperidone, olanzapine, quetiapine, aripiprazole) demonstrated significantly faster onset of antimanic efficacy than mood stabilizers (lithium, valproate, carbamazepine). Combination therapy—pairing an atypical antipsychotic with lithium or divalproex sodium—is superior to monotherapy for severe mania.",
    [
        ("In the comprehensive network meta-analysis of 68 RCTs (Cipriani et al., Lancet), haloperidol, risperidone, and olanzapine showed the highest efficacy in reducing acute manic symptoms, with atypical antipsychotics demonstrating significantly faster onset of action than lithium or anticonvulsants.", ["21855977"]),
        ("CANMAT/ISBD guidelines recommend combination therapy (an atypical antipsychotic plus either lithium or divalproex sodium) as first-line treatment for severe acute mania or mania with psychotic features, which achieves faster and deeper remission than monotherapy.", ["29536616"]),
        ("Divalproex sodium (sodium valproate) is highly effective for acute mania, mixed features, and rapid-cycling presentations; rapid loading with oral divalproex (20-30 mg/kg/day) achieves therapeutic serum concentrations (> 50-100 ug/mL) and symptom relief within 48-72 hours.", ["29536616", "10741873"]),
        ("Valproate is strictly contraindicated in women of childbearing potential due to exceptional teratogenicity (neural tube defects, cardiac malformations, and major neurodevelopmental/autism spectrum deficits in up to 30-40% of offspring).", ["29536616"])
    ],
    [
        ("21855977", "Comparative efficacy and acceptability of 18 antimanic drugs: a systematic review and network meta-analysis.", 2011, "meta-analysis"),
        ("29536616", "Canadian Network for Mood and Anxiety Treatments (CANMAT) and International Society for Bipolar Disorders (ISBD) 2018 guidelines for the management of patients with bipolar disorder.", 2018, "guideline"),
        ("10741873", "Olanzapine versus placebo in the treatment of acute mania.", 2000, "trial")
    ],
    [
        "Comparative efficacy of cariprazine (D3-preferring dopamine partial agonist) versus classic D2 antagonists in acute mania with mixed depressive features.",
        "Optimal protocol for tapering antimanic atypical antipsychotics after successful stabilization in patients maintained on long-term lithium."
    ],
    [
        "Relative efficacy and speed of onset across antimanic drugs established in the Cipriani et al. Lancet network meta-analysis.",
        "Indications for upfront combination therapy (antipsychotic + mood stabilizer) in severe manic episodes.",
        "Black-box warnings and absolute contraindications of valproate in women of childbearing potential."
    ],
    [
        "A 22-year-old male presenting with 4 days of sleeplessness, hyperverbal pressure, grandiosity, and paranoid delusions, initiated on olanzapine 15 mg and lithium carbonate.",
        "A 26-year-old female presenting with acute mania where divalproex is deliberately avoided due to high teratogenic hazard, opting for quetiapine plus lithium."
    ]
)

# 261: Bisphosphonates in Osteoporosis: Efficacy, Holidays & Atypical Fractures
BATCH_SHEET2_B1[261] = make_entry(
    'bisphosphonates_osteoporosis_drug_holidays',
    "Bisphosphonates (oral alendronate, risedronate; intravenous zoledronic acid) are the first-line antiresorptive pharmacotherapy for postmenopausal osteoporosis and high fracture risk. By binding avidly to bone hydroxyapatite and inhibiting osteoclast farnesyl pyrophosphate (FPPS) synthase, bisphosphonates substantially reduce vertebral fractures by 50-70% and hip fractures by 30-40% (FIT and HORIZON-PFT trials). Because bisphosphonates accumulate in bone and release gradually over years, long-term continuous suppression of bone turnover (> 5 years of oral or > 3 years of IV bisphosphonate) increases the rare risk of atypical femur fractures (AFF) and osteonecrosis of the jaw (ONJ), establishing the clinical rationale for structured 'drug holidays'.",
    [
        ("The landmark Fracture Intervention Trial (FIT; Black et al., Lancet) proved that alendronate reduced new radiographic vertebral fractures by 50% and hip fractures by 51% in postmenopausal women with low bone mineral density and prior fractures.", ["8976004"]),
        ("The HORIZON-PFT trial (NEJM) demonstrated that once-yearly intravenous zoledronic acid (5 mg) reduced vertebral fractures by 70% and hip fractures by 41% over 3 years, with proven compliance advantages.", ["17476007"]),
        ("The FLEX trial (Black et al., JAMA) demonstrated that after 5 years of alendronate, women who discontinued therapy maintained stable bone mineral density and experienced no increase in non-vertebral fractures over the subsequent 5 years, supporting the safety of a drug holiday.", ["17192378"]),
        ("The ASBMR Task Force defines atypical femur fractures (AFF) as non-comminuted, transverse or short oblique fractures along the subtrochanteric or diaphyseal femoral shaft associated with cortical thickening (beaking); patients on long-term bisphosphonates presenting with thigh or groin pain must immediately undergo bilateral femoral radiography.", ["24114828"])
    ],
    [
        ("8976004", "Randomised trial of effect of alendronate on risk of fracture in women with existing vertebral fractures: Fracture Intervention Trial (FIT).", 1996, "trial"),
        ("17476007", "Once-Yearly Zoledronic Acid for Treatment of Postmenopausal Osteoporosis (HORIZON-PFT).", 2007, "trial"),
        ("17192378", "Effects of Continuing or Stopping Alendronate After 5 Years of Treatment: The Fracture Intervention Trial Long-term Extension (FLEX): A Randomized Trial.", 2006, "trial"),
        ("24114828", "Atypical subtrochanteric and diaphyseal femoral fractures: second report of a task force of the American Society for Bone and Mineral Research.", 2014, "consensus-guideline")
    ],
    [
        "Optimal monitoring biomarkers (bone turnover markers: CTX, P1NP) to determine when bone resorption has resumed during a bisphosphonate drug holiday.",
        "Sequential therapy: safety and bone density gains when transitioning from an anabolic agent (teriparatide, romosozumab) to antiresorptive bisphosphonates."
    ],
    [
        "Magnitude of vertebral and hip fracture risk reduction from the FIT and HORIZON-PFT trials.",
        "Clinical criteria for initiating a bisphosphonate drug holiday (after 5 years of oral or 3 years of IV bisphosphonate in moderate-risk patients).",
        "Pathognomonic radiographic and clinical features of bisphosphonate-associated atypical femur fractures (AFF)."
    ],
    [
        "A 68-year-old female who has taken oral alendronate for 5 years whose DXA T-score has improved to -2.1 with no prior vertebral fractures, initiated on a 2-to-3 year drug holiday.",
        "A 74-year-old female on alendronate for 8 continuous years presenting with dull aching right anterior thigh pain, found to have focal lateral cortical thickening on femur X-ray (impending AFF)."
    ]
)

# 262: BK Polyomavirus Nephropathy in Kidney Transplant
BATCH_SHEET2_B1[262] = make_entry(
    'bk_polyomavirus_nephropathy_kidney_transplant',
    "BK polyomavirus nephropathy (BKPyVN) is a major cause of premature renal allograft failure, occurring in 1-10% of kidney transplant recipients. It results from reactivation of latent polyomavirus in the urothelium and tubular epithelial cells driven by potent modern immunosuppression (tacrolimus, mycophenolate mofetil). Because established nephropathy causes irreversible interstitial fibrosis, routine prospective screening of plasma BK virus DNA via quantitative PCR is the universal standard of care. Identifying sustained plasma viremia (> 10,000 copies/mL or log10 > 4 copies/mL) enables early, preemptive immunosuppression reduction, which halts viral replication and clears viremia in > 80-90% of recipients before histological graft destruction occurs.",
    [
        ("KDIGO guidelines for kidney transplant recipients recommend screening all patients for BK virus with quantitative plasma PCR monthly for the first 3-6 months, every 3 months for the remainder of year 1, and whenever serum creatinine unexplainedly rises.", ["20176840"]),
        ("Sustained plasma BK viral load > 10,000 copies/mL (or > 4 log10 copies/mL) for > 3 weeks is the clinically validated threshold defining 'presumptive BK polyomavirus nephropathy' triggering prompt intervention.", ["23624891", "20176840"]),
        ("The primary, evidence-based first-line therapy for BK viremia and nephropathy is the systematic reduction of maintenance immunosuppression (typically reducing mycophenolate dose by 50% or stopping it, followed by lowering tacrolimus trough targets to 4-6 ng/mL).", ["23624891", "15840656"]),
        ("Renal allograft biopsy confirms definitive BKPyVN, characterized by intranuclear viral inclusion bodies, positive SV40 large T-antigen immunohistochemistry, and variable tubulitis and interstitial fibrosis under the Banff 2018 classification.", ["29774620"])
    ],
    [
        ("20176840", "KDIGO clinical practice guideline for the care of kidney transplant recipients.", 2009, "guideline"),
        ("23624891", "Polyomavirus-associated nephropathy in renal transplantation: consensus statement by the AST Infectious Diseases Community of Practice.", 2013, "consensus-guideline"),
        ("15840656", "Incidence and consequences of BK virus viremia and nephropathy in kidney-transplant recipients (Prospective Screening Trial).", 2005, "trial"),
        ("29774620", "The Banff 2018 pathology classification of BK polyomavirus nephropathy.", 2018, "consensus-guideline")
    ],
    [
        "Efficacy of switching calcineurin inhibitors to mTOR inhibitors (everolimus) in refractory BK viremia with concomitant allograft rejection risk.",
        "Role of cellular immunotherapies (donor-derived virus-specific T cells) in clearing resistant BK polyomavirus replication."
    ],
    [
        "KDIGO protocolized screening timetable for BK virus viremia in kidney transplant recipients.",
        "Plasma viral load cutoff (> 10,000 copies/mL) defining presumptive BK nephropathy.",
        "Stepwise protocol for reducing maintenance immunosuppression upon detecting sustained BK viremia."
    ],
    [
        "A 42-year-old male 4 months post-kidney transplant with stable creatinine (1.1 mg/dL) found to have plasma BK virus PCR of 38,000 copies/mL on routine screening, managed by halving mycophenolate.",
        "A 55-year-old female 9 months post-transplant presenting with creatinine rising to 2.2 mg/dL; biopsy shows positive nuclear SV40 staining in tubular epithelial cells confirming Banff Class 2 BKPyVN."
    ]
)

# 263: BK Virus Nephropathy Post-Transplant: Staging & Adjuvant Therapies
BATCH_SHEET2_B1[263] = make_entry(
    'bk_virus_nephropathy_staging_and_adjuvant_therapy',
    "Histopathological staging and therapeutic management of established BK polyomavirus nephropathy (BKPyVN) is defined by the Banff 2018 schema, which integrates the extent of viral cytopathic tubulitis (pvl score) and chronic interstitial fibrosis (ci score) into three prognostic classes (Classes 1, 2, and 3) strongly predicting 2-year graft survival. When reduction of baseline immunosuppression fails to clear viremia or when allograft rejection co-exists, clinicians have historically explored adjuvant therapies (leflunomide, ciprofloxacin, intravenous immunoglobulin [IVIG], or low-dose cidofovir). However, randomized evidence demonstrates that adjuvant pharmacotherapy provides no consistent benefit over rigorous immunosuppression reduction alone.",
    [
        ("The Banff 2018 classification stratifies BKPyVN into Class 1 (minimal viral load and <= 10% fibrosis), Class 2 (intermediate), and Class 3 (extensive fibrosis > 50%), with Class 3 carrying an allograft loss rate exceeding 50% at 24 months.", ["29774620"]),
        ("American Society of Transplantation Infectious Diseases Community of Practice (AST-IDCOP) guidelines state that reducing maintenance immunosuppression is the sole proven intervention, with no randomized evidence supporting the routine addition of leflunomide or cidofovir.", ["31215165"]),
        ("Intravenous immunoglobulin (IVIG 1-2 g/kg) contains high titers of neutralizing anti-BK virus antibodies and is frequently employed as an adjuvant rescue therapy, particularly in patients experiencing concurrent acute allograft rejection and BK viremia.", ["31215165", "29774620"]),
        ("Retransplantation after allograft loss from BKPyVN is safe and achieves excellent graft survival, provided that BK viremia has completely cleared to undetectable levels in plasma prior to relisting.", ["31215165", "20176840"])
    ],
    [
        ("29774620", "The Banff 2018 pathology classification of BK polyomavirus nephropathy.", 2018, "consensus-guideline"),
        ("31215165", "BK polyomavirus in solid organ transplantation-Guidelines from the American Society of Transplantation Infectious Diseases Community of Practice.", 2019, "guideline"),
        ("20176840", "KDIGO clinical practice guideline for the care of kidney transplant recipients.", 2009, "guideline")
    ],
    [
        "Neutralizing antibody serotype specificity: whether mismatch between donor and recipient BK virus genotypes (genotypes I-IV) governs allograft infection severity.",
        "Safety and efficacy of novel oral polyomavirus-targeting direct antiviral agents in prospective clinical trials."
    ],
    [
        "Banff 2018 histopathological grading matrix (pvl and ci scores) for BK polyomavirus nephropathy.",
        "Clinical evidence evaluating the utility and toxicities of cidofovir (nephrotoxicity) and leflunomide in BK nephropathy.",
        "Pre-requisites and safety of kidney retransplantation following allograft loss to BK virus."
    ],
    [
        "A 50-year-old male with biopsy-proven Banff Class 2 BKPyVN whose viremia persists despite minimal tacrolimus/prednisone therapy, evaluated for adjuvant IVIG rescue.",
        "A 36-year-old female who lost her first renal graft to BK nephropathy, screened and cleared for a second transplant after achieving sustained undetectable plasma BK viral load."
    ]
)

# 264: Bladder Cancer: NMIBC, MIBC & Neoadjuvant Cisplatin
BATCH_SHEET2_B1[264] = make_entry(
    'bladder_cancer_nmibc_mibc_management',
    "Bladder urothelial carcinoma is categorized clinically into Non-Muscle-Invasive Bladder Cancer (NMIBC: Ta, T1, carcinoma in situ [CIS]; 75% of cases) and Muscle-Invasive Bladder Cancer (MIBC: >= T2; 25% of cases). Management of NMIBC requires complete transurethral resection of bladder tumor (TURBT) with muscularis propria sampling, followed by adjuvant intravesical Bacillus Calmette-Guérin (BCG) immunotherapy for high-risk lesions to prevent muscle invasion. In MIBC, the landmark SWOG 8710 trial established neoadjuvant cisplatin-based combination chemotherapy (MVAC or gemcitabine-cisplatin) prior to radical cystectomy and pelvic lymph node dissection as the standard of care, conferring a significant 5-year absolute survival benefit of 5-8%.",
    [
        ("European Association of Urology (EAU) guidelines stratify NMIBC using EORTC risk tables into low, intermediate, and high risk; high-risk NMIBC (T1, high-grade, CIS) mandates adjuvant intravesical BCG maintenance for 1-3 years.", ["35144866", "16442657"]),
        ("In the landmark SWOG 8710 randomized trial (Grossman et al., NEJM), neoadjuvant methotrexate, vinblastine, doxorubicin, and cisplatin (MVAC) followed by radical cystectomy significantly improved median overall survival (77 vs 46 months) and increased pathologic complete response (38% vs 15%) compared with cystectomy alone.", ["12954741"]),
        ("Adequate detrusor muscle (muscularis propria) in the initial TURBT specimen is mandatory for accurate staging; absence of muscle in high-grade or T1 tumors mandates repeat TURBT within 2-6 weeks to rule out occult muscle invasion.", ["35144866"]),
        ("In locally advanced or metastatic urothelial carcinoma, the phase 3 EV-302 trial established enfortumab vedotin plus pembrolizumab as the superior frontline regimen, nearly doubling median overall survival compared to traditional platinum chemotherapy.", ["38446675"])
    ],
    [
        ("35144866", "European Association of Urology Guidelines on Non-muscle-invasive Bladder Cancer (Ta, T1, and Carcinoma in Situ).", 2022, "guideline"),
        ("12954741", "Neoadjuvant chemotherapy in invasive bladder cancer: update of a Southwest Oncology Group trial (SWOG 8710).", 2003, "trial"),
        ("16442657", "Predicting recurrence and progression in individual patients with stage Ta T1 bladder cancer using EORTC risk tables.", 2006, "trial"),
        ("38446675", "Enfortumab Vedotin and Pembrolizumab in Untreated Advanced Urothelial Cancer (EV-302 Trial).", 2024, "trial")
    ],
    [
        "Trimodal bladder-preserving therapy (maximal TURBT followed by concurrent chemoradiation) versus upfront radical cystectomy in functional outcomes and survival.",
        "Management of BCG-unresponsive NMIBC: role of pembrolizumab or intravesical gemcitabine/docetaxel in patients refusing or unfit for early cystectomy."
    ],
    [
        "EORTC risk stratification criteria for recurrence and progression in non-muscle-invasive bladder cancer.",
        "Overall survival benefit and pathologic downstaging achieved by neoadjuvant cisplatin chemotherapy in SWOG 8710.",
        "Mandatory requirement for muscularis propria in TURBT pathology to differentiate T1 from T2 disease."
    ],
    [
        "A 64-year-old male with gross painless hematuria whose TURBT reveals high-grade T1 urothelial carcinoma without muscularis propria, scheduled for urgent restaging TURBT.",
        "A 59-year-old female with clinical T2N0M0 muscle-invasive urothelial carcinoma undergoing 4 cycles of neoadjuvant gemcitabine/cisplatin prior to radical cystectomy."
    ]
)

# 265: Blood Culture Technique: Volume, Timing, Sets & Contamination
BATCH_SHEET2_B1[265] = make_entry(
    'blood_culture_technique_and_contamination',
    "Blood cultures are the definitive diagnostic gold standard for bloodstream infections and infective endocarditis, yet diagnostic sensitivity and clinical utility depend critically on rigorous venipuncture technique. Landmark microbiological investigations (Cockerill et al., Lee et al.) proved that total blood volume is the single most important parameter determining pathogen yield: each blood culture set must contain 20 to 30 mL of blood distributed equally between aerobic and anaerobic bottles. A minimum of two to three independent venipuncture sets (40-60 mL total) collected before antimicrobial administration achieves > 95-99% sensitivity. Keeping blood culture contamination rates below the 3% benchmark (CLSI/Surviving Sepsis) prevents unnecessary broad-spectrum antibiotic exposure.",
    [
        ("In the definitive study by Cockerill et al. (Clin Infect Dis), the cumulative sensitivity for detecting bloodstream pathogens was 73.1% with one set, 89.7% with two sets, and 98.2% with three blood culture sets, establishing 2-3 sets as the mandatory standard.", ["15307137"]),
        ("Pathogen recovery increases by approximately 3-5% for every additional milliliter of blood cultured up to 30-40 mL total volume; inoculating less than 10 mL per bottle substantially reduces detection of low-level bacteremia.", ["17357372", "15307137"]),
        ("Blood cultures should be drawn from peripheral venipunctures using strict sterile antiseptic skin preparation (chlorhexidine in 70% alcohol); drawing blood cultures from pre-existing indwelling vascular catheters triples contamination rates and false-positive results.", ["10405321", "23361665"]),
        ("The College of American Pathologists and Surviving Sepsis Campaign set a national quality threshold of < 3% for blood culture contamination; common commensals (Coagulase-negative Staphylococci, Corynebacterium, Cutibacterium) isolated in only 1 of multiple sets typically represent skin contamination.", ["10405321", "23361665"])
    ],
    [
        ("15307137", "Optimal testing parameters for blood cultures (Cockerill Study).", 2004, "trial"),
        ("17357372", "Detection of bloodstream infections: volume matters.", 2007, "trial"),
        ("10405321", "Clinical and economic impact of blood culture contamination.", 1999, "trial"),
        ("23361665", "Surviving Sepsis Campaign: International Guidelines for Management of Severe Sepsis and Septic Shock 2012.", 2013, "guideline")
    ],
    [
        "Diagnostic utility of blood cultures drawn during peak rigor versus drawing immediately upon clinical suspicion regardless of body temperature.",
        "Role of rapid molecular multiplex PCR pathogen identification directly from positive blood culture bottles in accelerating targeted antimicrobial stewardship."
    ],
    [
        "Cumulative pathogen yield percentages achieved with 1, 2, versus 3 blood culture sets from Cockerill et al.",
        "Target blood volume per set (20-30 mL) and per bottle (10 mL) necessary to maximize bacteremia detection.",
        "Quality threshold (< 3%) for blood culture contamination and criteria differentiating genuine bacteremia from skin contaminant."
    ],
    [
        "A 66-year-old male presenting with rigors and septic shock where 2 peripheral blood culture sets (40 mL total) are collected prior to broad-spectrum piperacillin-tazobactam administration.",
        "A 52-year-old hospitalized patient whose blood drawn from a central line grows coagulase-negative staphylococcus in 1 of 4 bottles with normal repeat peripheral cultures, recognizing skin contamination and avoiding redundant vancomycin."
    ]
)
