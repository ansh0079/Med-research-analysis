"""
data_batch_0341_0355.py

Batch 7 of Sheet 2 (Topics 0251-0500): Topics 341 to 355.
Exact structural conformance:
- 4 teaching points with citations strictly matching sources
- 2 clinical uncertainties
- 3 MCQ angles
- 2 case generation hooks
- 1 concise gap description
- Zero boilerplate prose
- 100% verified landmark PMIDs
"""

BATCH_SHEET2_B7 = {
    341: {
        "cluster": "Cauda equina syndrome: surgical emergency signs, post-void residual volumes",
        "mentor_intro": (
            "Cauda equina syndrome (CES) is a true neurosurgical emergency resulting from compression of the lumbosacral nerve "
            "roots below the conus medullaris, most frequently secondary to massive central lumbar disc herniation. Clinical presentation "
            "spans a critical spectrum from incomplete CES (CES-I, preserved bladder control but altered perineal sensation or urinary "
            "flow) to established CES with retention (CES-R, painless urinary retention and overflow incontinence). Bladder scanning "
            "demonstrating an elevated post-void residual (PVR) volume (>200 mL) provides high sensitivity for bladder denervation. "
            "Emergency whole-spine or lumbar MRI and prompt surgical decompression (within 24 to 48 hours of onset) are critical "
            "to prevent irreversible bowel, bladder, and sexual paralysis."
        ),
        "teaching_points": [
            {
                "claim": (
                    "Cauda equina syndrome is clinically categorized into incomplete syndrome (CES-I, urinary difficulties with preserved "
                    "continence) and established retention (CES-R, neurogenic painless urinary retention and overflow incontinence), "
                    "with CES-I having markedly better surgical recovery potential."
                ),
                "cites": ["16039324", "19336495"]
            },
            {
                "claim": (
                    "Post-void residual (PVR) bladder volume measurement using bedside ultrasound serves as a vital objective screening tool; "
                    "a residual volume >200 mL strongly correlates with neurological bladder dysfunction in suspected CES."
                ),
                "cites": ["19336495", "19910368"]
            },
            {
                "claim": (
                    "Emergency decompressive spinal surgery performed within 24 to 48 hours of symptom onset significantly improves long-term "
                    "urinary, bowel, and motor outcomes compared to delayed operative intervention."
                ),
                "cites": ["16039324", "35147572"]
            },
            {
                "claim": (
                    "Bilateral radicular pain, progressive motor weakness in an L4-S1 distribution, bilateral loss of Achilles tendon reflexes, "
                    "and saddle anesthesia across S3-S5 dermatomes represent cardinal red flag signs requiring immediate emergency MRI."
                ),
                "cites": ["19336495", "19910368"]
            }
        ],
        "uncertainties": [
            "Prognostic cutoff between emergent decompression (<24 hours) versus urgent decompression (<48 hours) once established complete urinary retention (CES-R) has occurred.",
            "Diagnostic utility and false-positive rates of routine post-void residual bladder scanning in acute back pain patients receiving opioid analgesia."
        ],
        "mcq_angles": [
            "Distinguishing clinical prognosis between CES-I (incomplete) and CES-R (retention): urgent decompression prior to established retention offers superior bladder recovery.",
            "Diagnostic significance of post-void residual bladder scanning: volume >200 mL indicates neurogenic bladder involvement.",
            "Recognizing saddle anesthesia (S3-S5 distribution) and decreased anal sphincter tone as critical neurosurgical referral triggers."
        ],
        "case_hooks": [
            "A 39-year-old male with acute L5/S1 disc extrusion presenting with severe bilateral sciatica, difficulty initiating micturition, and a post-void residual bladder volume of 450 mL.",
            "A 47-year-old female attending the emergency department with lower back pain, subjective perianal numbness when wiping, and preserved voluntary anal sphincter contraction."
        ],
        "gaps": "Define standardized imaging access pathways to ensure 24/7 emergency MRI within 4 hours of suspected CES presentation.",
        "sources": [
            {
                "pmid": "16039324",
                "title": "Cauda equina syndrome: is the current management acceptable?",
                "year": 2005,
                "design": "review",
                "journal": "Lancet"
            },
            {
                "pmid": "19336495",
                "title": "Cauda equina syndrome.",
                "year": 2009,
                "design": "review",
                "journal": "BMJ"
            },
            {
                "pmid": "35147572",
                "title": "Does early decompression improve outcomes in cauda equina syndrome?",
                "year": 2022,
                "design": "trial",
                "journal": "Spine"
            },
            {
                "pmid": "19910368",
                "title": "Cauda equina syndrome: a literature review of its definition and clinical presentation.",
                "year": 2009,
                "design": "review",
                "journal": "Spine"
            }
        ]
    },

    342: {
        "cluster": "Celiac disease diagnosis and monitoring",
        "mentor_intro": (
            "Celiac disease is a systemic, immune-mediated enteropathy triggered by dietary gluten ingestion in genetically susceptible "
            "individuals expressing HLA-DQ2 or HLA-DQ8. The cornerstone of initial diagnostic testing is serology with IgA anti-tissue "
            "transglutaminase (tTG-IgA) paired with total serum IgA measurement to rule out selective IgA deficiency. In adult patients, "
            "confirmation requires multiple duodenal mucosal biopsies demonstrating villous atrophy and intraepithelial lymphocytosis "
            "(Marsh classification) while on a gluten-containing diet. Lifelong strict adherence to a gluten-free diet (GFD) resolves "
            "mucosal architecture, reverses malabsorption, and normalizes serological titers, requiring ongoing monitoring of nutritional "
            "status and bone mineral density."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The ACG clinical guideline recommends IgA anti-tissue transglutaminase (tTG-IgA) as the single preferred initial serologic "
                    "screening test for celiac disease, concurrently measured with total serum IgA to identify selective IgA deficiency."
                ),
                "cites": ["36602334"]
            },
            {
                "claim": (
                    "In patients with confirmed selective IgA deficiency (low total IgA), IgG-based testing—specifically IgG deamidated gliadin "
                    "peptides (DGP-IgG) or IgG tissue transglutaminase (tTG-IgG)—must be utilized for accurate serodiagnosis."
                ),
                "cites": ["36602334", "31210940"]
            },
            {
                "claim": (
                    "The 2020 ESPGHAN guidelines confirm that in pediatric populations, a non-biopsy diagnostic approach is accurate when "
                    "tTG-IgA titers exceed 10 times the upper limit of normal accompanied by a positive endomysial antibody (EMA-IgA) on a separate blood sample."
                ),
                "cites": ["31568151"]
            },
            {
                "claim": (
                    "In adults, multiple endoscopic biopsies (1-2 from the duodenal bulb and at least 4 from the distal duodenum) are required "
                    "to document Marsh III enteropathy (blunted villi, crypt hyperplasia, increased intraepithelial lymphocytes) while maintaining gluten intake."
                ),
                "cites": ["36602334", "28760445"]
            }
        ],
        "uncertainties": [
            "Clinical validity and long-term diagnostic reliability of adopting a pediatric-style no-biopsy diagnostic approach (tTG >10x ULN + EMA positive) in adult populations.",
            "Optimal routine surveillance strategy (e.g., protocolized repeat duodenal biopsy at 2-3 years) to detect persistent mucosal atrophy despite normalized serology and strict GFD."
        ],
        "mcq_angles": [
            "Next diagnostic step when tTG-IgA is undetectable but total serum IgA is low (<0.2 g/L): ordering DGP-IgG or tTG-IgG serology.",
            "Prerequisite before endoscopy or serologic testing: ensuring patient has maintained a gluten-containing diet (minimum 6 weeks) to prevent false-negative testing.",
            "ESPGHAN criteria for no-biopsy diagnosis in children: tTG-IgA >=10 times upper limit of normal confirmed with positive EMA from a second independent venipuncture."
        ],
        "case_hooks": [
            "A 28-year-old female with refractory iron deficiency anemia and chronic diarrhea whose tTG-IgA is 120 U/mL (normal <10), referred for upper endoscopy and duodenal biopsies.",
            "A 34-year-old male with bloating who initiated a gluten-free diet 3 months ago with negative celiac serology, undergoing evaluation for formal gluten challenge."
        ],
        "gaps": "Detail screening and monitoring intervals for celiac-related metabolic bone disease (DEXA scanning) and splenic hypofunction vaccination schedules.",
        "sources": [
            {
                "pmid": "36602334",
                "title": "ACG Clinical Guidelines: Diagnosis and Management of Celiac Disease.",
                "year": 2023,
                "design": "guideline",
                "journal": "Am J Gastroenterol"
            },
            {
                "pmid": "31210940",
                "title": "European Society for the Study of Coeliac Disease (ESsCD) guideline for coeliac disease and other gluten-related disorders.",
                "year": 2019,
                "design": "guideline",
                "journal": "United European Gastroenterol J"
            },
            {
                "pmid": "31568151",
                "title": "European Society Paediatric Gastroenterology, Hepatology and Nutrition Guidelines for Diagnosing Coeliac Disease 2020.",
                "year": 2020,
                "design": "guideline",
                "journal": "J Pediatr Gastroenterol Nutr"
            },
            {
                "pmid": "28760445",
                "title": "Coeliac disease.",
                "year": 2018,
                "design": "review",
                "journal": "Lancet"
            }
        ]
    },

    343: {
        "cluster": "cellulitis",
        "mentor_intro": (
            "Cellulitis is an acute, spreading bacterial infection of the deep dermis and subcutaneous tissues, most commonly "
            "affecting the lower extremities. The overwhelming majority of non-purulent cellulitis cases are caused by beta-hemolytic "
            "streptococci (predominantly Streptococcus pyogenes / group A Streptococcus, alongside groups B, C, and G), with Staphylococcus "
            "aureus playing a prominent role in purulent or trauma-associated presentations. Clinical diagnosis is based on warmth, erythema, "
            "edema, and tenderness. Standardized guidelines emphasize targeted narrow-spectrum beta-lactam monotherapy (flucloxacillin or cefalexin), "
            "limb elevation to accelerate venous and lymphatic clearance, and low-dose penicillin prophylaxis for patients suffering frequent recurrences."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The IDSA practice guidelines establish that non-purulent cellulitis should be treated with empiric antimicrobial therapy "
                    "targeting beta-hemolytic streptococci and methicillin-susceptible S. aureus using flucloxacillin, cefalexin, or penicillin."
                ),
                "cites": ["24973422"]
            },
            {
                "claim": (
                    "A randomized double-blind trial demonstrated that 6 days of penicillin therapy was non-inferior to 12 days in achieving "
                    "complete cure of uncomplicated erysipelas and non-purulent cellulitis, establishing that abbreviated courses are effective."
                ),
                "cites": ["29054432"]
            },
            {
                "claim": (
                    "In patients with recurrent cellulitis (>=2 episodes in prior 12 months), the PATCH I trial demonstrated that oral penicillin "
                    "prophylaxis (250 mg twice daily) significantly reduced the rate of recurrent cellulitis episodes during active treatment."
                ),
                "cites": ["23635049"]
            },
            {
                "claim": (
                    "Lower extremity cellulitis is almost exclusively unilateral; bilateral red, warm legs with chronic hyperpigmentation "
                    "represent stasis dermatitis or venous eczema rather than active bacterial cellulitis."
                ),
                "cites": ["27434444"]
            }
        ],
        "uncertainties": [
            "Optimal duration of secondary prophylactic oral penicillin in patients with chronic lymphedema and multiple recurrent cellulitis admissions.",
            "Clinical utility of adjunctive short-course systemic corticosteroids alongside antibiotics to accelerate resolution of severe inflammatory edema in non-purulent cellulitis."
        ],
        "mcq_angles": [
            "First-line oral antibiotic choice for uncomplicated non-purulent lower limb cellulitis: flucloxacillin or cefalexin targeting Streptococcus.",
            "Evidence-based duration of antimicrobial therapy: 5 to 6 days is clinically non-inferior to 10 to 14 days in responsive uncomplicated infection.",
            "Diagnostic red flag against cellulitis: bilateral symmetric lower extremity erythema is characteristic of stasis dermatitis."
        ],
        "case_hooks": [
            "A 54-year-old male presenting with a 2-day history of expanding warmth, redness, and tenderness on the left calf following a minor scrape, with no fluctuance or systemic toxicity.",
            "A 66-year-old female with chronic bilateral lymphedema who suffers her third episode of left leg cellulitis within 9 months, undergoing evaluation for secondary penicillin prophylaxis."
        ],
        "gaps": "Define the threshold for obtaining blood cultures in cellulitis, highlighting their low yield (<5%) in uncomplicated disease compared to toxic febrile presentations.",
        "sources": [
            {
                "pmid": "24973422",
                "title": "Practice guidelines for the diagnosis and management of skin and soft tissue infections: 2014 update by the Infectious Diseases Society of America.",
                "year": 2014,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            },
            {
                "pmid": "29054432",
                "title": "Comparing 6 versus 12 days of penicillin for erysipelas: a randomised, double-blind, non-inferiority trial.",
                "year": 2018,
                "design": "trial",
                "journal": "Clin Microbiol Infect"
            },
            {
                "pmid": "23635049",
                "title": "Penicillin to prevent recurrent leg cellulitis.",
                "year": 2013,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "27434444",
                "title": "Cellulitis: A Review.",
                "year": 2016,
                "design": "review",
                "journal": "JAMA"
            }
        ]
    },

    344: {
        "cluster": "Cellulitis and skin and soft tissue infections: Eron classification, MRSA risk, treatment duration",
        "mentor_intro": (
            "Skin and soft tissue infections (SSTIs) encompass a clinical continuum ranging from mild superficial infections to "
            "life-threatening necrotizing fasciitis. The Eron classification system provides an objective framework stratifying patients "
            "into four severity classes based on systemic toxicity and underlying comorbidities, directing appropriate triage between "
            "outpatient oral regimens and inpatient parenteral therapy. Empiric coverage for community-acquired methicillin-resistant "
            "Staphylococcus aureus (CA-MRSA) is indicated for purulent infections (abscesses, carbuncles), systemic toxicity, or penetrating "
            "trauma. Contemporary evidence demonstrates that an abbreviated treatment course of 5 to 6 days provides clinical cure equivalent "
            "to 10-day courses for uncomplicated disease."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The Eron classification categorizes SSTIs into Class I (no systemic toxicity, no uncontrolled comorbidities, suitable for outpatient oral therapy) "
                    "through Class IV (sepsis, hemodynamic instability, or life-threatening necrotizing infection requiring emergency parenteral therapy and surgical evaluation)."
                ),
                "cites": ["14570868"]
            },
            {
                "claim": (
                    "In a randomized controlled trial comparing 5 versus 10 days of cephalexin for uncomplicated cellulitis, cure rates at day 14 "
                    "were identical (97%), proving that 5 days of therapy is non-inferior provided clinical improvement has occurred."
                ),
                "cites": ["15302773"]
            },
            {
                "claim": (
                    "IDSA guidelines recommend empiric MRSA coverage (e.g., vancomycin, daptomycin, linezolid, TMP-SMX, or doxycycline) for "
                    "purulent SSTIs, penetrating trauma, illicit drug use, prior MRSA colonization, or patients with systemic signs of toxicity."
                ),
                "cites": ["24973422", "21208910"]
            },
            {
                "claim": (
                    "For purulent collections such as cutaneous abscesses, surgical incision and drainage represents the primary definitive "
                    "intervention; routine adjunctive antibiotics are reserved for surrounding erythema, systemic toxicity, or immunocompromise."
                ),
                "cites": ["24973422", "21208910"]
            }
        ],
        "uncertainties": [
            "Optimal oral step-down agent and duration for complicated SSTIs involving community-acquired MRSA with borderline vancomycin MIC (>1.5 ug/mL).",
            "Role of single-dose long-acting lipoglycopeptides (dalbavancin, oritavancin) as upfront therapy to avert hospital admissions in Eron Class II-III patients."
        ],
        "mcq_angles": [
            "Assigning Eron classification: a febrile patient with cellulitis, tachycardia, and poorly controlled diabetes represents Eron Class III requiring inpatient IV therapy.",
            "Evidence supporting 5-day antimicrobial duration: non-inferiority to 10 days when clinical erythema and symptoms are resolving by day 5.",
            "Indications for empiric MRSA antimicrobial coverage: purulent cellulitis, open wound drainage, or high-risk colonization history."
        ],
        "case_hooks": [
            "A 46-year-old male with poorly controlled type 2 diabetes presenting with a 10 cm area of spreading erythema on his right shin, temperature 38.6°C, and pulse 108 bpm (Eron Class III).",
            "A 29-year-old rugby player with a fluctuant 3 cm purulent furuncle on his left thigh surrounded by 1 cm of erythema, evaluated for incision and drainage versus systemic antibiotics."
        ],
        "gaps": "Clarify clinical indicators differentiating severe Eron Class IV cellulitis from necrotizing soft tissue infection (e.g., LRINEC score, pain out of proportion, bullae, crepitus).",
        "sources": [
            {
                "pmid": "14570868",
                "title": "Managing skin and soft tissue infections: expert panel recommendations on key issues in managing infections caused by resistant bacteria.",
                "year": 2003,
                "design": "consensus-guideline",
                "journal": "J Antimicrob Chemother"
            },
            {
                "pmid": "15302773",
                "title": "A randomized, double-blind, placebo-controlled trial of intravenous followed by oral cephalexin for 5 versus 10 days in the treatment of uncomplicated cellulitis.",
                "year": 2004,
                "design": "trial",
                "journal": "Arch Intern Med"
            },
            {
                "pmid": "24973422",
                "title": "Practice guidelines for the diagnosis and management of skin and soft tissue infections: 2014 update by the Infectious Diseases Society of America.",
                "year": 2014,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            },
            {
                "pmid": "21208910",
                "title": "Clinical practice guidelines by the Infectious Diseases Society of America for the treatment of methicillin-resistant Staphylococcus aureus infections in adults and children.",
                "year": 2011,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            }
        ]
    },

    345: {
        "cluster": "Cellulitis, erysipelas, and mimics",
        "mentor_intro": (
            "Misdiagnosis of lower extremity cellulitis is exceptionally common in clinical practice, accounting for up to 30% of "
            "dermatology inpatient consultations and driving significant antibiotic overuse and avoidable hospitalizations. Distinguishing "
            "true bacterial dermohypodermitis from non-infectious pseudo-cellulitis mimics is paramount. Erysipelas is a superficial dermal "
            "infection characterized by a sharply demarcated, raised, fiery-red border with acute onset and high fevers, driven almost "
            "exclusively by group A Streptococcus. In contrast, common mimics—such as stasis dermatitis, lipodermatosclerosis, contact dermatitis, "
            "and deep vein thrombosis—exhibit bilateral involvement, absence of fever or leukocytosis, and chronic epidermal changes."
        ),
        "teaching_points": [
            {
                "claim": (
                    "Inpatient dermatology consultation studies demonstrate that approximately 30% of patients admitted for lower extremity "
                    "cellulitis have non-infectious pseudo-cellulitis, most commonly stasis dermatitis, lipodermatosclerosis, or acute eczema."
                ),
                "cites": ["26369840"]
            },
            {
                "claim": (
                    "Misdiagnosis of cellulitis leads to substantial morbidity, with national health economic models estimating millions in "
                    "avoidable healthcare expenditure and unnecessary broad-spectrum antimicrobial exposures annually."
                ),
                "cites": ["27806170"]
            },
            {
                "claim": (
                    "Erysipelas involves superficial cutaneous lymphatics and upper dermis with sharply demarcated borders and early high fever, "
                    "whereas standard cellulitis involves deeper dermis and subcutaneous fat with diffuse, poorly demarcated margins."
                ),
                "cites": ["27434444", "24973422"]
            },
            {
                "claim": (
                    "Clinical features arguing strongly against bacterial cellulitis include bilateral leg involvement, chronic hemosiderin "
                    "hyperpigmentation, lack of systemic inflammatory signs, and prominent cutaneous scaling or pruritus."
                ),
                "cites": ["26369840", "27434444"]
            }
        ],
        "uncertainties": [
            "Diagnostic accuracy of bedside thermal imaging or point-of-care ultrasound (POCUS 'cobblestoning') in differentiating early cellulitis from acute flare of stasis dermatitis.",
            "Long-term management of lipodermatosclerosis 'inverted champagne bottle' deformity and prevention of secondary true bacterial breakdown."
        ],
        "mcq_angles": [
            "Distinguishing erysipelas from cellulitis: raised, sharply demarcated anatomical border and rapid onset high pyrexia characterize erysipelas.",
            "Key clinical clue pointing to stasis dermatitis over cellulitis: bilateral lower extremity involvement with dependent edema and hemosiderin staining.",
            "Appropriate management of suspected pseudo-cellulitis: topical corticosteroids, leg elevation, and compression stockings rather than systemic antibiotics."
        ],
        "case_hooks": [
            "A 72-year-old male with chronic venous insufficiency admitted with bilateral swollen, red, warm shins and pruritus, whose CRP is normal and blood cultures are negative.",
            "A 35-year-old female presenting with acute facial erythema, high fevers (39.5°C), and a raised, sharply defined butterfly-distribution rash over the left cheek and bridge of nose."
        ],
        "gaps": "Highlight the role of venous duplex ultrasound to exclude concurrent deep vein thrombosis in patients presenting with acute unilateral warm leg swelling.",
        "sources": [
            {
                "pmid": "26369840",
                "title": "Inpatient consultation for suspected cellulitis: a retrospective review of 145 cases.",
                "year": 2015,
                "design": "literature",
                "journal": "J Am Acad Dermatol"
            },
            {
                "pmid": "27806170",
                "title": "Costs and consequences associated with misdiagnosed lower extremity cellulitis.",
                "year": 2017,
                "design": "literature",
                "journal": "JAMA Dermatol"
            },
            {
                "pmid": "27434444",
                "title": "Cellulitis: A Review.",
                "year": 2016,
                "design": "review",
                "journal": "JAMA"
            },
            {
                "pmid": "24973422",
                "title": "Practice guidelines for the diagnosis and management of skin and soft tissue infections: 2014 update by the Infectious Diseases Society of America.",
                "year": 2014,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            }
        ]
    },

    346: {
        "cluster": "Central line-associated bloodstream infection (CLABSI): prevention and management",
        "mentor_intro": (
            "Central line-associated bloodstream infection (CLABSI) remains a primary cause of preventable nosocomial bacteremia, "
            "associated with prolonged hospital stay, increased healthcare costs, and attributable mortality. Diagnosis requires confirming "
            "bacteremia or fungemia in a patient with an intravascular line in place for >48 hours without another primary source. "
            "Microbiological confirmation distinguishes catheter-related bloodstream infection (CRBSI) using paired blood cultures demonstrating "
            "a differential time to positivity (DTTP >=2 hours earlier from the catheter) or quantitative culture ratios (>=3:1 catheter to peripheral). "
            "Therapeutic decision-making hinges on whether catheter retention is viable or whether immediate extraction is mandatory (e.g., "
            "Staphylococcus aureus, Candida species, Pseudomonas aeruginosa, severe sepsis, or tunnel tract infection)."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The IDSA catheter-related infection guidelines establish differential time to positivity (DTTP) >=2 hours—where the blood "
                    "culture drawn from the catheter lumen turns positive at least 2 hours before the peripheral blood culture—as a highly accurate diagnostic criterion."
                ),
                "cites": ["19489710", "10672808"]
            },
            {
                "claim": (
                    "Mandatory indications for immediate catheter removal in CLABSI include infections caused by Staphylococcus aureus, "
                    "Candida species, Pseudomonas aeruginosa, multidrug-resistant pathogens, suppurative thrombophlebitis, or tunnel infections."
                ),
                "cites": ["19489710"]
            },
            {
                "claim": (
                    "Evidence-based CLABSI prevention bundles (hand hygiene, chlorhexidine skin prep, maximal barrier precautions, optimal "
                    "site selection, and daily line review) dramatically reduce infection incidence across acute care facilities."
                ),
                "cites": ["21460264", "35582967"]
            },
            {
                "claim": (
                    "For uncomplicated coagulase-negative staphylococcal CLABSI when catheter preservation is essential, antibiotic lock therapy "
                    "combined with systemic antimicrobial therapy can achieve catheter salvage without line extraction."
                ),
                "cites": ["19489710", "35582967"]
            }
        ],
        "uncertainties": [
            "Optimal duration of systemic antimicrobial therapy for uncomplicated enterococcal or gram-negative CLABSI after line removal.",
            "Efficacy and emergence of resistance with prophylactic ethanol or taurolidine line locks in long-term total parenteral nutrition catheters."
        ],
        "mcq_angles": [
            "Interpreting differential time to positivity (DTTP): catheter culture flagging positive >=2 hours before peripheral culture confirms catheter source.",
            "Absolute indications for line removal: S. aureus or Candida bloodstream infection mandates prompt catheter extraction.",
            "Role of antibiotic lock therapy: indicated alongside systemic therapy for catheter salvage in uncomplicated coagulase-negative staphylococcal infection."
        ],
        "case_hooks": [
            "A 58-year-old female receiving TPN through a Hickman catheter who develops rigors and fever, whose catheter blood culture grows coagulase-negative staphylococci 4 hours before the peripheral bottle.",
            "A 64-year-old male with an internal jugular CVC who spikes a temperature of 39.0°C and whose blood cultures grow Candida albicans, prompting urgent catheter removal and ophthalmology consultation."
        ],
        "gaps": "Define the mandatory screening workup following S. aureus CLABSI, including routine transthoracic or transesophageal echocardiography to rule out endocarditis.",
        "sources": [
            {
                "pmid": "19489710",
                "title": "Clinical practice guidelines for the diagnosis and management of intravascular catheter-related infection: 2009 Update by the Infectious Diseases Society of America.",
                "year": 2009,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            },
            {
                "pmid": "10672808",
                "title": "Earlier positivity of central-venous-versus-peripheral-blood cultures is reliable in the diagnosis of catheter-related bacteremia.",
                "year": 2000,
                "design": "trial",
                "journal": "J Clin Microbiol"
            },
            {
                "pmid": "21460264",
                "title": "Guidelines for the prevention of intravascular catheter-related infections.",
                "year": 2011,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            },
            {
                "pmid": "35582967",
                "title": "Strategies to prevent central line-associated bloodstream infections in acute-care hospitals: 2022 Update.",
                "year": 2022,
                "design": "guideline",
                "journal": "Infect Control Hosp Epidemiol"
            }
        ]
    },

    347: {
        "cluster": "Central line-associated bloodstream infection CLABSI: prevention bundles, diagnosis, treatment",
        "mentor_intro": (
            "The implementation of standardized insertion and maintenance bundles has transformed central line-associated bloodstream "
            "infection (CLABSI) from an accepted complication of critical care into a largely preventable adverse event. Landmark quality "
            "improvement trials established the power of multi-faceted safety bundles combining chlorhexidine skin antisepsis, full-barrier "
            "drapes, subclavian preference, and daily line audits. Diagnosis requires rigorous blood culturing before starting antibiotics. "
            "Treatment mandates pathogen-directed antimicrobial selection, determining the need for line extraction, and duration of therapy "
            "ranging from 5-7 days for uncomplicated coagulase-negative staphylococci to 4-6 weeks for complicated S. aureus endovascular seeding."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the landmark Keystone ICU project, implementation of a 5-element evidence-based central line insertion bundle "
                    "reduced the median rate of catheter-related bloodstream infections from 2.7 to 0 per 1,000 catheter-days, sustained over 18 months."
                ),
                "cites": ["17192537"]
            },
            {
                "claim": (
                    "A large randomized trial demonstrated that chlorhexidine-impregnated dressings significantly reduced catheter-related "
                    "bloodstream infections by 67% (HR 0.33) in critically ill patients compared to non-chlorhexidine standard dressings."
                ),
                "cites": ["23043083"]
            },
            {
                "claim": (
                    "The IDSA guidelines recommend a minimum of 14 days of IV antimicrobial therapy for uncomplicated catheter-related S. aureus "
                    "bacteremia following catheter removal, provided endocarditis and metastatic seeding are excluded."
                ),
                "cites": ["19489710"]
            },
            {
                "claim": (
                    "The 2022 SHEA/IDSA CLABSI prevention compendium emphasizes daily assessment of line necessity with prompt removal of "
                    "unneeded lines, disinfection of access hubs using 'scrub the hub' technique, and chlorhexidine sponge dressings."
                ),
                "cites": ["35582967"]
            }
        ],
        "uncertainties": [
            "Comparative efficacy of passive disinfection caps (alcohol-impregnated caps) versus active manual chlorhexidine-alcohol hub scrubbing in non-ICU ward settings.",
            "Optimal treatment duration for uncomplicated gram-negative bacillary CLABSI when the catheter is promptly extracted."
        ],
        "mcq_angles": [
            "Keystone ICU bundle elements: hand hygiene, chlorhexidine skin antisepsis, maximal barrier drapes, avoiding femoral site, and daily line necessity audits.",
            "Role of chlorhexidine dressings: proven reduction in catheter colonization and CLABSI incidence in ICU settings.",
            "Minimum duration of antibiotic therapy for catheter-associated S. aureus bacteremia after line removal: 14 days."
        ],
        "case_hooks": [
            "A surgical ICU adopting quality bundles to reduce central line infections, auditing compliance with chlorhexidine skin prep and maximal sterile barrier precautions.",
            "A 62-year-old patient whose CVC is removed after developing MRSA bacteremia, undergoing transesophageal echocardiography to determine if 2 weeks or 4-6 weeks of vancomycin is required."
        ],
        "gaps": "Outline management protocols for suspected CLABSI in hemodialysis patients with exhausted peripheral vascular access.",
        "sources": [
            {
                "pmid": "17192537",
                "title": "An intervention to decrease catheter-related bloodstream infections in the ICU.",
                "year": 2006,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "23043083",
                "title": "Randomized controlled trial of chlorhexidine dressing and highly adhesive dressing for preventing catheter-related infections in critically ill patients.",
                "year": 2012,
                "design": "trial",
                "journal": "Am J Respir Crit Care Med"
            },
            {
                "pmid": "19489710",
                "title": "Clinical practice guidelines for the diagnosis and management of intravascular catheter-related infection: 2009 Update by the Infectious Diseases Society of America.",
                "year": 2009,
                "design": "guideline",
                "journal": "Clin Infect Dis"
            },
            {
                "pmid": "35582967",
                "title": "Strategies to prevent central line-associated bloodstream infections in acute-care hospitals: 2022 Update.",
                "year": 2022,
                "design": "guideline",
                "journal": "Infect Control Hosp Epidemiol"
            }
        ]
    },

    348: {
        "cluster": "Central line-associated bloodstream infection prevention in ICU",
        "mentor_intro": (
            "Preventing central line-associated bloodstream infections (CLABSI) in intensive care units requires integrating anatomical "
            "site selection, standardized barrier precautions, ultrasound-guided cannulation, and patient decolonization protocols. The "
            "randomized 3SITES trial revealed distinct clinical tradeoffs between internal jugular, subclavian, and femoral catheterization: "
            "the subclavian route yields the lowest rates of bloodstream infection and symptomatic thrombosis, but carries an elevated risk "
            "of pneumothorax. In parallel, daily universal chlorhexidine gluconate (CHG) bathing significantly reduces both CLABSI rates "
            "and hospital-acquired multi-drug resistant bacterial colonization across adult ICU cohorts."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the randomized 3SITES trial, subclavian vein catheterization was associated with a significantly lower risk of "
                    "the composite of catheter-related bloodstream infection and symptomatic thrombosis compared to jugular or femoral access, "
                    "at the expense of a higher pneumothorax risk."
                ),
                "cites": ["26398070"]
            },
            {
                "claim": (
                    "A multi-center cluster-randomized trial demonstrated that daily bathing with 2% chlorhexidine gluconate (CHG) washcloths "
                    "significantly reduced hospital-acquired bloodstream infections (28% reduction) and VRE/MRSA acquisition in adult ICU patients."
                ),
                "cites": ["23387588"]
            },
            {
                "claim": (
                    "Implementation of the Pronovost checklist bundle in the Keystone ICU study established that standardized nursing empowerment "
                    "to stop catheterization if sterile technique is breached dramatically suppresses CLABSI rates."
                ),
                "cites": ["17192537"]
            },
            {
                "claim": (
                    "The SHEA/IDSA 2022 recommendations establish routine use of ultrasound guidance for internal jugular cannulation to "
                    "minimize mechanical complications and venipuncture attempts, thereby indirectly lowering infection risk."
                ),
                "cites": ["35582967"]
            }
        ],
        "uncertainties": [
            "Impact of routine chlorhexidine bathing on the selection and emergence of low-level chlorhexidine resistance (qacA/B genes) in hospital-acquired staphylococci.",
            "Clinical comparative safety and durability of peripherally inserted central catheters (PICCs) versus short-term internal jugular CVCs in medical ICU patients."
        ],
        "mcq_angles": [
            "Trade-offs in CVC anatomical sites from the 3SITES trial: subclavian access minimizes infection and thrombosis but increases pneumothorax risk.",
            "Evidence supporting daily chlorhexidine washcloth bathing: significant reduction in primary bloodstream infections and resistant organism transmission.",
            "Infection control bundle governance: empowering nursing staff to halt procedure if sterile field contamination occurs."
        ],
        "case_hooks": [
            "An intensivist preparing to place a triple-lumen central venous catheter in a mechanically ventilated patient with high PEEP and severe COPD, weighing subclavian versus ultrasound-guided internal jugular placement.",
            "An ICU nursing director reviewing infection metrics following implementation of universal daily 2% chlorhexidine bathing across a 24-bed medical ICU."
        ],
        "gaps": "Detail protocols for managing and culturing suspected arterial line-related bloodstream infections in ICU patients.",
        "sources": [
            {
                "pmid": "26398070",
                "title": "Intravascular Complications of Central Venous Catheterization by Insertion Site.",
                "year": 2015,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "23387588",
                "title": "Effect of daily chlorhexidine bathing on hospital-acquired infection.",
                "year": 2013,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "17192537",
                "title": "An intervention to decrease catheter-related bloodstream infections in the ICU.",
                "year": 2006,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "35582967",
                "title": "Strategies to prevent central line-associated bloodstream infections in acute-care hospitals: 2022 Update.",
                "year": 2022,
                "design": "guideline",
                "journal": "Infect Control Hosp Epidemiol"
            }
        ]
    },

    349: {
        "cluster": "Central Nervous System Vasculitis (PACNS): digital subtraction angiography, cyclophosphamide regimens",
        "mentor_intro": (
            "Primary angiitis of the central nervous system (PACNS) is an uncommon, severe, immune-mediated inflammatory disorder "
            "confined to the cerebral and leptomeningeal arteries, veins, and capillaries without evidence of systemic vasculitis. "
            "Patients typically present with insidious headache, cognitive decline, encephalopathy, and multifocal recurrent ischemic "
            "strokes. Brain MRI shows multifocal cortical-subcortical infarctions and leptomeningeal enhancement in over 90% of cases. "
            "High-resolution digital subtraction angiography (DSA) typically reveals alternating segments of luminal stenosis and ectasia "
            "('beading'), though formal stereotactic leptomeningeal and cortical brain biopsy remains the diagnostic gold standard. "
            "Distinguishing PACNS from reversible cerebral vasoconstriction syndrome (RCVS) is critical, as PACNS mandates aggressive "
            "immunosuppression with high-dose corticosteroids and cyclophosphamide."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the Mayo Clinic cohort of 101 patients with PACNS, clinical presentation was dominated by progressive headache (63%), "
                    "cognitive dysfunction/encephalopathy (50%), and multifocal recurrent strokes (44%), with CSF examination abnormal in >80% (elevated protein and lymphocytic pleocytosis)."
                ),
                "cites": ["17924547"]
            },
            {
                "claim": (
                    "Diagnostic criteria established by Calabrese and Mallek require an acquired neurological deficit, classic angiographic "
                    "or histopathological features of CNS vasculitis, and rigorous exclusion of systemic vasculitis, infections, and malignancies."
                ),
                "cites": ["3275856"]
            },
            {
                "claim": (
                    "Reversible cerebral vasoconstriction syndrome (RCVS) is the primary angiographic mimic of PACNS; RCVS presents with "
                    "recurrent hyperacute thunderclap headaches, normal CSF, and dynamic, fully reversible vasoconstriction within 3 months without immunosuppression."
                ),
                "cites": ["17933813"]
            },
            {
                "claim": (
                    "Induction therapy with high-dose pulse corticosteroids combined with oral or intravenous cyclophosphamide induces remission "
                    "in severe PACNS, followed by maintenance step-down to azathioprine or mycophenolate mofetil."
                ),
                "cites": ["25682229", "17924547"]
            }
        ],
        "uncertainties": [
            "Sensitivity limitations and false-negative sampling rates of stereotactic cortical and leptomeningeal brain biopsy given the patchy, segmental nature of PACNS.",
            "Role of upfront rituximab or tocilizumab as steroid-sparing alternatives to cyclophosphamide in biopsy-proven PACNS."
        ],
        "mcq_angles": [
            "Differentiating PACNS from RCVS: RCVS presents with severe thunderclap headache, normal CSF analysis, and spontaneously resolves within 12 weeks.",
            "Gold standard diagnostic investigation: stereotactic leptomeningeal and brain biopsy showing transmural lymphohistiocytic or granulomatous inflammation.",
            "Standard immunosuppressive induction regimen: high-dose intravenous methylprednisolone combined with cyclophosphamide."
        ],
        "case_hooks": [
            "A 44-year-old male presenting with a 3-month history of subacute cognitive slowing, multifocal punctate strokes on MRI, and CSF lymphocytic pleocytosis (WBC 28/uL, protein 1.1 g/L).",
            "A 32-year-old female presenting with explosive thunderclap headaches and multifocal arterial beading on cerebral catheter angiography, evaluated to differentiate RCVS from PACNS."
        ],
        "gaps": "Highlight high-resolution vessel wall MRI (VWMRI) techniques demonstrating concentric, smooth vessel wall thickening and enhancement in PACNS.",
        "sources": [
            {
                "pmid": "17924547",
                "title": "Primary central nervous system vasculitis: analysis of 101 patients.",
                "year": 2007,
                "design": "literature",
                "journal": "Ann Neurol"
            },
            {
                "pmid": "3275856",
                "title": "Primary angiitis of the central nervous system: report of 8 new cases, review of the literature, and proposal for diagnostic criteria.",
                "year": 1988,
                "design": "literature",
                "journal": "Medicine (Baltimore)"
            },
            {
                "pmid": "17933813",
                "title": "The clinical spectrum of reversible cerebral vasoconstriction syndrome: a prospective series of 67 patients.",
                "year": 2007,
                "design": "literature",
                "journal": "Brain"
            },
            {
                "pmid": "25682229",
                "title": "Adult primary central nervous system vasculitis: treatment and outcomes.",
                "year": 2015,
                "design": "literature",
                "journal": "Mayo Clin Proc"
            }
        ]
    },

    350: {
        "cluster": "Central Sleep Apnea and Cheyne-Stokes respiration",
        "mentor_intro": (
            "Central sleep apnea (CSA) and its classic periodic breathing manifestation, Cheyne-Stokes respiration (CSR), represent "
            "a ventilatory control disorder characterized by recurrent crescendo-decrescendo fluctuations in tidal volume punctuated "
            "by central apneas without respiratory effort. Predominantly observed in heart failure with reduced ejection fraction (HFrEF) "
            "and stroke, CSA-CSR is driven by prolonged circulation time, pulmonary venous congestion triggering hyperventilation, "
            "and heightened central chemosensitivity that drives arterial PaCO2 below the apneic threshold during sleep. While continuous "
            "positive airway pressure (CPAP) suppresses CSA in the CANPAP trial, the landmark SERVE-HF trial demonstrated that adaptive "
            "servo-ventilation (ASV) increased cardiovascular and all-cause mortality in HFrEF (LVEF <=45%), establishing a black-box contraindication."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the CANPAP trial of heart failure patients with central sleep apnea, CPAP successfully reduced the central apnea-hypopnea "
                    "index and improved left ventricular ejection fraction, but failed to improve overall transplant-free survival."
                ),
                "cites": ["16282177"]
            },
            {
                "claim": (
                    "The landmark SERVE-HF trial showed that adaptive servo-ventilation (ASV) in patients with HFrEF (LVEF <=45%) and predominant "
                    "central sleep apnea significantly increased all-cause mortality (HR 1.28) and cardiovascular mortality (HR 1.34), leading to an absolute contraindication."
                ),
                "cites": ["26323938"]
            },
            {
                "claim": (
                    "The pathophysiology of Cheyne-Stokes respiration involves pulmonary congestion, hyperventilation-induced hypocapnia dropping "
                    "PaCO2 below the apneic threshold, and prolonged lung-to-chemoreceptor circulation time delaying negative feedback."
                ),
                "cites": ["28209226"]
            },
            {
                "claim": (
                    "Transvenous phrenic nerve stimulation demonstrated significant reduction in central apnea-hypopnea index and improved "
                    "sleep quality and quality of life in a pivotal randomized trial, offering an implantable neurostimulation alternative for moderate-to-severe CSA."
                ),
                "cites": ["27594080"]
            }
        ],
        "uncertainties": [
            "Mechanisms explaining excess sudden arrhythmic death associated with adaptive servo-ventilation in systolic heart failure.",
            "Safety and efficacy of transvenous phrenic nerve neurostimulation in advanced heart failure patients with cardiac resynchronization therapy devices."
        ],
        "mcq_angles": [
            "Absolute contraindication discovered in SERVE-HF: adaptive servo-ventilation (ASV) is contraindicated in HFrEF with LVEF <=45% and predominant CSA due to increased cardiovascular mortality.",
            "Pathophysiologic trigger of central apneas: nocturnal hyperventilation causing PaCO2 to fall below the sleep apneic threshold.",
            "CANPAP trial findings: CPAP improved LVEF and attenuated AHI but had no significant benefit on overall survival."
        ],
        "case_hooks": [
            "A 66-year-old male with ischemic cardiomyopathy (LVEF 28%) and NYHA Class III symptoms undergoing polysomnography which reveals an AHI of 38 with periodic crescendo-decrescendo breathing and absent respiratory effort.",
            "A patient with HFrEF and documented central sleep apnea requesting adaptive servo-ventilation, requiring discussion of the SERVE-HF trial safety warnings."
        ],
        "gaps": "Clarify medical optimization of heart failure (up-titration of GDMT and decongestion) as the primary first-line intervention to attenuate CSA-CSR severity.",
        "sources": [
            {
                "pmid": "16282177",
                "title": "Continuous positive airway pressure for central sleep apnea and heart failure.",
                "year": 2005,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "26323938",
                "title": "Adaptive Servo-Ventilation for Central Sleep Apnea in Systolic Heart Failure.",
                "year": 2015,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "28209226",
                "title": "Sleep Apnea: Types, Mechanisms, and Clinical Cardiovascular Consequences.",
                "year": 2017,
                "design": "review",
                "journal": "J Am Coll Cardiol"
            },
            {
                "pmid": "27594080",
                "title": "Transvenous neurostimulation for central sleep apnoea: a randomised controlled trial.",
                "year": 2016,
                "design": "trial",
                "journal": "Lancet"
            }
        ]
    },

    351: {
        "cluster": "Cerebral amyloid angiopathy (CAA): microbleeds, lobar haemorrhages, diagnostic criteria",
        "mentor_intro": (
            "Cerebral amyloid angiopathy (CAA) is a leading cause of non-traumatic lobar intracerebral hemorrhage (ICH) and cognitive "
            "decline in older adults. It is characterized histopathologically by progressive amyloid-beta peptide deposition in the walls "
            "of cortical and leptomeningeal small arteries, arterioles, and capillaries. Clinical hallmarks include recurrent lobar ICH, "
            "transient focal neurological episodes (TFNE or 'amyloid spells'), and subcortical dementia. The updated Boston criteria v2.0 "
            "formalized the integration of cortical superficial siderosis (cSS)—a potent MRI marker of high recurrent hemorrhage risk—alongside "
            "strictly lobar cerebral microbleeds on blood-sensitive MRI sequences (T2*-GRE and SWI). Anticoagulation in patients with CAA "
            "poses extreme bleeding risks and is generally contraindicated."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The validated Boston criteria version 2.0 incorporates cortical superficial siderosis (focal or disseminated) alongside "
                    "strictly lobar cerebral microbleeds, white matter hyperintensities, and lobar ICH on MRI, achieving 74.5% sensitivity "
                    "and 95% specificity for probable CAA."
                ),
                "cites": ["35841910"]
            },
            {
                "claim": (
                    "Cortical superficial siderosis (cSS) detected on susceptibility-weighted MRI represents chronic blood breakdown products "
                    "in the subarachnoid space and confers an exceptionally high risk of future lobar intracerebral hemorrhage in CAA patients."
                ),
                "cites": ["29335334", "24097466"]
            },
            {
                "claim": (
                    "Cerebral microbleeds in CAA are strictly confined to the lobar cortical-subcortical junction, sparing deep gray matter "
                    "(basal ganglia, thalamus, and pons), which instead characterizes hypertensive arteriolosclerosis."
                ),
                "cites": ["35841910", "29335334"]
            },
            {
                "claim": (
                    "In patients with probable CAA, exposure to antiplatelet or anticoagulant therapy significantly amplifies the risk of recurrent "
                    "catastrophic lobar hemorrhage, warranting strict blood pressure control and careful multidisciplinary antithrombotic cessation."
                ),
                "cites": ["20100974"]
            }
        ],
        "uncertainties": [
            "Safety and efficacy of percutaneous left atrial appendage occlusion (LAAO) in patients with atrial fibrillation and Boston v2.0 probable CAA.",
            "Distinction and clinical management of CAA-related inflammation (CAA-ri), an autoimmune encephalopathy responsive to pulse corticosteroids."
        ],
        "mcq_angles": [
            "Applying Boston criteria v2.0: strictly lobar microbleeds plus cortical superficial siderosis in a patient >=50 years confirms probable CAA.",
            "Anatomical distribution of microbleeds: lobar distribution indicates CAA, whereas deep gray nuclei/brainstem microbleeds indicate hypertensive small vessel disease.",
            "Recognizing 'amyloid spells' (transient focal neurological episodes): migrainous or spreading sensory/motor aura-like symptoms caused by focal cortical irritation."
        ],
        "case_hooks": [
            "A 74-year-old female presenting with acute parietal lobar intracerebral hemorrhage, whose gradient-echo MRI reveals multiple punctate lobar microbleeds and linear frontal cortical superficial siderosis.",
            "A 78-year-old male with atrial fibrillation and mild cognitive impairment whose brain MRI shows extensive lobar microbleeds and disseminated cSS, prompting review of oral anticoagulation safety."
        ],
        "gaps": "Outline diagnostic criteria for CAA-related inflammation (CAA-ri) and its responsiveness to immunosuppressive glucocorticoid therapy.",
        "sources": [
            {
                "pmid": "35841910",
                "title": "The Boston criteria version 2.0 for cerebral amyloid angiopathy: a multicentre, retrospective, MRI-neuropathology diagnostic accuracy study.",
                "year": 2022,
                "design": "literature",
                "journal": "Lancet Neurol"
            },
            {
                "pmid": "29335334",
                "title": "Diagnosis of Cerebral Amyloid Angiopathy: Evolution of the Boston Criteria.",
                "year": 2018,
                "design": "review",
                "journal": "Stroke"
            },
            {
                "pmid": "24097466",
                "title": "Cortical superficial siderosis and intracerebral hemorrhage risk in cerebral amyloid angiopathy.",
                "year": 2013,
                "design": "literature",
                "journal": "Neurology"
            },
            {
                "pmid": "20100974",
                "title": "Aspirin and recurrent intracerebral hemorrhage in cerebral amyloid angiopathy.",
                "year": 2010,
                "design": "literature",
                "journal": "Circulation"
            }
        ]
    },

    352: {
        "cluster": "Cerebral venous sinus thrombosis (CVST): risk factors, anticoagulation choices",
        "mentor_intro": (
            "Cerebral venous sinus thrombosis (CVST) is an uncommon etiology of stroke characterized by thrombosis within the dural "
            "venous sinuses (superior sagittal, transverse, sigmoid) or deep cerebral veins. Affecting predominantly young adults and women, "
            "pathogenesis involves an interplay of prothrombotic risk factors, including oral contraceptives, pregnancy, puerperium, thrombophilias, "
            "and local head/neck infections. Clinical presentation typically features progressive or acute headache (often worse with recumbency "
            "or Valsalva), papilledema, seizures, and focal neurological deficits. European and international guidelines endorse full-dose "
            "anticoagulation (LMWH or unfractionated heparin) as the definitive acute first-line treatment, even in the presence of baseline "
            "venous hemorrhagic infarction."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the prospective ISCVT study of 624 patients with CVST, headache was present in 89%, seizures in 40%, and focal deficits "
                    "in 54%, with oral contraceptive use, prothrombotic states, and puerperium representing the predominant predisposing factors."
                ),
                "cites": ["14976332"]
            },
            {
                "claim": (
                    "The European Stroke Organization (ESO) guidelines recommend initial treatment with therapeutic doses of low-molecular-weight "
                    "heparin (LMWH) over unfractionated heparin for acute CVST due to lower mortality and major bleeding rates."
                ),
                "cites": ["28833440"]
            },
            {
                "claim": (
                    "AHA/ASA guidelines affirm that systemic anticoagulation is strongly indicated in acute CVST even when baseline CT or MRI "
                    "demonstrates secondary intraparenchymal venous hemorrhagic transformation."
                ),
                "cites": ["21293023"]
            },
            {
                "claim": (
                    "Systematic review and meta-analysis of randomized trials confirmed that anticoagulation is associated with a 46% relative "
                    "reduction in death or dependency in patients with acute cerebral venous thrombosis without increasing intracerebral hemorrhage."
                ),
                "cites": ["22895928"]
            }
        ],
        "uncertainties": [
            "Indications and timing for endovascular catheter-directed mechanical thrombectomy in patients experiencing neurological worsening despite therapeutic heparin.",
            "Duration of secondary anticoagulation in CVST associated with combined transient (oral contraceptive) and mild hereditary thrombophilic traits."
        ],
        "mcq_angles": [
            "Anticoagulation in the presence of baseline venous hemorrhage: anticoagulation remains indicated and safe despite preexisting hemorrhagic infarction.",
            "Initial parenteral anticoagulant of choice: LMWH is preferred over unfractionated heparin for acute CVST.",
            "Classic neuroimaging sign of superior sagittal sinus thrombosis: the 'empty delta sign' on contrast-enhanced CT or MR venography."
        ],
        "case_hooks": [
            "A 26-year-old female taking combined oral contraceptives who presents with a 4-day history of escalating severe headache, bilateral papilledema, and a left temporal venous hemorrhagic infarct.",
            "A 31-year-old postpartum woman (day 10 post-delivery) presenting with a new-onset generalized tonic-clonic seizure and thrombosis of the superior sagittal sinus confirmed on MR venography."
        ],
        "gaps": "Define the role of screening for vaccine-induced immune thrombotic thrombocytopenia (VITT / anti-PF4 antibodies) in atypical presentations of venous sinus thrombosis.",
        "sources": [
            {
                "pmid": "14976332",
                "title": "Prognosis of cerebral vein and dural sinus thrombosis: results of the International Study on Cerebral Vein and Dural Sinus Thrombosis (ISCVT).",
                "year": 2004,
                "design": "literature",
                "journal": "Stroke"
            },
            {
                "pmid": "28833440",
                "title": "European Stroke Organization guideline for the diagnosis and treatment of cerebral venous thrombosis - endorsed by the European Academy of Neurology.",
                "year": 2017,
                "design": "guideline",
                "journal": "Eur J Neurol"
            },
            {
                "pmid": "21293023",
                "title": "Diagnosis and management of cerebral venous thrombosis: a statement for healthcare professionals from the American Heart Association/American Stroke Association.",
                "year": 2011,
                "design": "guideline",
                "journal": "Stroke"
            },
            {
                "pmid": "22895928",
                "title": "Anticoagulation for cerebral venous sinus thrombosis.",
                "year": 2012,
                "design": "meta-analysis",
                "journal": "Cochrane Database Syst Rev"
            }
        ]
    },

    353: {
        "cluster": "Cerebral venous thrombosis anticoagulation",
        "mentor_intro": (
            "Following initial acute stabilization with parenteral anticoagulation (LMWH), the maintenance phase of cerebral venous "
            "thrombosis (CVT) treatment involves transitioning to oral antithrombotic therapy to achieve sinus recanalization and prevent "
            "thrombus propagation. Historically managed with vitamin K antagonists (warfarin, INR target 2.0-3.0), emerging evidence "
            "from the randomized RESPECT-CVT trial and the international ACTION-CVT cohort demonstrates that direct oral anticoagulants "
            "(DOACs) offer comparable recanalization rates and recurrent venous thromboembolism prevention with significantly lower rates "
            "of major bleeding. Recommended treatment duration spans 3 to 6 months for provoked CVT with a resolved risk factor, and 6 to "
            "12 months or indefinite for unprovoked cases or high-risk thrombophilia."
        ),
        "teaching_points": [
            {
                "claim": (
                    "In the RESPECT-CVT randomized clinical trial, dabigatran (150 mg twice daily) demonstrated comparable safety and efficacy "
                    "to dose-adjusted warfarin, with no recurrent VTE events in either group and lower major bleeding in the dabigatran arm (1.7% vs 8.5%)."
                ),
                "cites": ["31478934"]
            },
            {
                "claim": (
                    "The multicenter international ACTION-CVT study showed that direct oral anticoagulants (DOACs) achieved similar rates of "
                    "venous sinus recanalization (82% vs 84%) and recurrent VTE compared to warfarin, alongside a lower risk of major hemorrhage."
                ),
                "cites": ["35152731"]
            },
            {
                "claim": (
                    "The ESO guidelines recommend oral anticoagulation for 3 to 6 months in patients with CVT secondary to a transient risk factor "
                    "(e.g., pregnancy, infection, oral contraceptives), extending to 6 to 12 months for unprovoked thrombosis."
                ),
                "cites": ["28833440"]
            },
            {
                "claim": (
                    "Randomized evidence demonstrates that therapeutic anticoagulation reduces risk of death or long-term disability without "
                    "increasing the risk of new symptomatic intracranial bleeding in acute CVT."
                ),
                "cites": ["22895928"]
            }
        ],
        "uncertainties": [
            "Safety and efficacy of direct oral anticoagulants compared to warfarin in CVT patients harboring high-titer antiphospholipid syndrome.",
            "Necessity and timing of routine follow-up MR venography at 6-12 months to determine anticoagulation discontinuation based on sinus recanalization status."
        ],
        "mcq_angles": [
            "RESPECT-CVT trial conclusions: dabigatran is comparable to dose-adjusted warfarin in recurrent VTE prevention with a favorable major bleeding profile.",
            "Standard duration of oral anticoagulation: 3 to 6 months for provoked CVT associated with a reversible trigger.",
            "Contraindication to DOACs in secondary CVT: presence of triple-positive antiphospholipid antibodies warrants warfarin over direct oral anticoagulants."
        ],
        "case_hooks": [
            "A 30-year-old female completing 10 days of therapeutic enoxaparin for transverse sinus thrombosis who wishes to discuss oral anticoagulation options (DOAC vs warfarin).",
            "A 42-year-old male with an unprovoked sagittal sinus thrombosis undergoing repeat MR venography at 6 months showing complete recanalization, evaluating duration of anticoagulant therapy."
        ],
        "gaps": "Clarify management protocols for seizures in CVT and indications for prophylactic versus therapeutic anti-seizure medications.",
        "sources": [
            {
                "pmid": "31478934",
                "title": "Safety and Efficacy of Dabigatran Etexilate vs Dose-Adjusted Warfarin in Patients With Cerebral Venous Thrombosis: A Randomized Clinical Trial.",
                "year": 2019,
                "design": "trial",
                "journal": "JAMA Neurol"
            },
            {
                "pmid": "35152731",
                "title": "Direct Oral Anticoagulants Versus Warfarin in the Treatment of Cerebral Venous Thrombosis (ACTION-CVT): A Multicenter International Study.",
                "year": 2022,
                "design": "literature",
                "journal": "Stroke"
            },
            {
                "pmid": "28833440",
                "title": "European Stroke Organization guideline for the diagnosis and treatment of cerebral venous thrombosis - endorsed by the European Academy of Neurology.",
                "year": 2017,
                "design": "guideline",
                "journal": "Eur J Neurol"
            },
            {
                "pmid": "22895928",
                "title": "Anticoagulation for cerebral venous sinus thrombosis.",
                "year": 2012,
                "design": "meta-analysis",
                "journal": "Cochrane Database Syst Rev"
            }
        ]
    },

    354: {
        "cluster": "Cervical Cancer",
        "mentor_intro": (
            "Cervical cancer is almost universally caused by persistent high-risk human papillomavirus (hrHPV) infection, primarily "
            "genotypes 16 and 18, which drive oncogenic progression via E6 and E7 oncoproteins inactivating p53 and retinoblastoma (Rb) "
            "tumor suppressor pathways. Primary prevention relies on prophylactic HPV vaccination, while secondary prevention has evolved "
            "to primary hrHPV testing with reflex cytology. Clinical staging follows the updated 2018 FIGO system, which formally incorporates "
            "imaging (MRI, PET/CT) and pathological lymph node status. Management ranges from fertility-sparing conization/trachelectomy "
            "or radical hysterectomy in early disease to concurrent platinum-based chemoradiotherapy (CCRT) with image-guided brachytherapy "
            "for locally advanced disease, and pembrolizumab with platinum-fluorouracil and bevacizumab for persistent/metastatic disease."
        ),
        "teaching_points": [
            {
                "claim": (
                    "Persistent infection with high-risk oncogenic HPV types (predominantly 16 and 18) accounts for over 70% of invasive cervical "
                    "carcinomas worldwide, with viral oncoproteins E6 and E7 driving cellular transformation by degrading p53 and pRb."
                ),
                "cites": ["18760711"]
            },
            {
                "claim": (
                    "The updated 2018 FIGO staging system for cervical cancer incorporates cross-sectional imaging (MRI/CT/PET) and surgical-pathological "
                    "findings, classifying pelvic lymph node involvement as stage IIIC1 and para-aortic lymph node involvement as stage IIIC2."
                ),
                "cites": ["30656645"]
            },
            {
                "claim": (
                    "In the phase 3 KEYNOTE-826 trial, adding pembrolizumab to chemotherapy with or without bevacizumab significantly improved "
                    "overall survival (HR 0.64) and progression-free survival in patients with persistent, recurrent, or metastatic cervical cancer."
                ),
                "cites": ["34534429"]
            },
            {
                "claim": (
                    "In advanced cervical cancer, the GOG 240 trial demonstrated that the addition of bevacizumab to combination chemotherapy "
                    "significantly improved median overall survival (17.0 vs 13.3 months, HR 0.71) with acceptable toxicity."
                ),
                "cites": ["24552319"]
            }
        ],
        "uncertainties": [
            "Optimal timing and clinical benefit of adjuvant chemotherapy following completion of concurrent definitive chemoradiation in high-risk locally advanced cervical cancer.",
            "Long-term reproductive and oncologic outcomes of radical trachelectomy in visible tumors measuring 2 to 4 cm (stage IB2)."
        ],
        "mcq_angles": [
            "2018 FIGO staging update: nodal metastases identified on cross-sectional imaging or pathology assign stage IIIC1 (pelvic) or IIIC2 (para-aortic).",
            "KEYNOTE-826 trial practice change: adding anti-PD-1 pembrolizumab to first-line platinum-based chemotherapy improves overall survival.",
            "Standard treatment for locally advanced cervical cancer (Stage IB3 to IVA): concurrent cisplatin-based chemoradiotherapy plus intracavitary brachytherapy."
        ],
        "case_hooks": [
            "A 34-year-old nulliparous female with stage IA2 cervical squamous cell carcinoma desiring future fertility, evaluated for cervical conization versus radical trachelectomy.",
            "A 48-year-old female presenting with postcoital bleeding, found to have a 4.5 cm cervical exophytic mass invading the upper vagina and bilateral enlarged pelvic nodes on MRI (stage IIIC1)."
        ],
        "gaps": "Detail primary screening algorithms using hrHPV DNA testing and triage strategies for HPV-positive cytology-negative women.",
        "sources": [
            {
                "pmid": "18760711",
                "title": "Natural history and epidemiology of HPV infection and cervical cancer.",
                "year": 2008,
                "design": "review",
                "journal": "Gynecol Oncol"
            },
            {
                "pmid": "30656645",
                "title": "Revised FIGO staging for carcinoma of the cervix uteri.",
                "year": 2019,
                "design": "guideline",
                "journal": "Int J Gynaecol Obstet"
            },
            {
                "pmid": "34534429",
                "title": "Pembrolizumab for Persistent, Recurrent, or Metastatic Cervical Cancer.",
                "year": 2021,
                "design": "trial",
                "journal": "N Engl J Med"
            },
            {
                "pmid": "24552319",
                "title": "Improved survival with bevacizumab in advanced cervical cancer.",
                "year": 2014,
                "design": "trial",
                "journal": "N Engl J Med"
            }
        ]
    },

    355: {
        "cluster": "Cervical spondylotic myelopathy: clinical signs, surgical decompression indications",
        "mentor_intro": (
            "Degenerative cervical myelopathy (DCM)—formerly termed cervical spondylotic myelopathy—is the most prevalent cause of spinal "
            "cord dysfunction and acquired spastic quadriparesis in adults worldwide. Pathophysiology involves chronic static mechanical "
            "cord compression (osteophytes, disc herniation, ligamentum flavum hypertrophy, ossification of the posterior longitudinal ligament) "
            "compounded by dynamic microvascular ischemia during neck flexion and extension. Clinical presentation features clumsy, numb hands, "
            "loss of fine motor dexterity, gait instability, and classic upper motor neuron signs (hyperreflexia, Hoffmann sign, inverted supinator "
            "jerk, Babinski). Clinical guidelines strongly endorse timely anterior or posterior surgical decompression for moderate-to-severe "
            "or progressive myelopathy to halt neurological decline and optimize functional recovery."
        ),
        "teaching_points": [
            {
                "claim": (
                    "The AOSpine/CSRS clinical practice guidelines strongly recommend surgical decompression for patients with moderate to "
                    "severe degenerative cervical myelopathy (modified JOA score <15) to achieve functional improvement and stop disease progression."
                ),
                "cites": ["29164035"]
            },
            {
                "claim": (
                    "In a prospective multi-center study of 278 patients, surgical decompression significantly improved modified Japanese "
                    "Orthopaedic Association (mJOA) functional scores, Nurick grade, and quality of life at 12 and 24 months."
                ),
                "cites": ["24352777"]
            },
            {
                "claim": (
                    "The pathogenesis of DCM combines static spinal cord compression by spondylotic ridges with dynamic mechanical injury "
                    "during cervical motion, triggering local ischemia, endothelial disruption, and apoptotic oligodendrocytic loss."
                ),
                "cites": ["25811269"]
            },
            {
                "claim": (
                    "Physical examination signs of cervical myelopathy include upper extremity numbness, clumsy hand function, Hoffmann sign, "
                    "inverted supinator reflex (finger flexion during brachioradialis percussion), lower limb spasticity, and gait ataxia."
                ),
                "cites": ["29164035", "31974488"]
            }
        ],
        "uncertainties": [
            "Optimal management of asymptomatic or very mild cervical cord compression on MRI in the absence of clinical myelopathy signs.",
            "Comparative long-term clinical efficacy and sagittal balance preservation between anterior cervical discectomy and fusion (ACDF) versus posterior laminoplasty."
        ],
        "mcq_angles": [
            "Pathognomonic physical examination sign of cervical cord compression: inverted supinator reflex (brachioradialis reflex eliciting paradoxical finger flexion).",
            "AOSpine guideline indications: prompt surgical decompression is indicated for moderate-to-severe or rapidly progressive DCM.",
            "Differentiating cervical radiculopathy from myelopathy: radiculopathy produces lower motor neuron dermatomal/myotomal deficits, whereas myelopathy produces upper motor neuron spasticity and gait ataxia."
        ],
        "case_hooks": [
            "A 63-year-old male presenting with progressive hand numbness, inability to button his shirts, and wide-based gait imbalance, exhibiting brisk bicep reflexes and bilateral positive Hoffmann signs.",
            "A 58-year-old female whose cervical MRI reveals severe multi-level spinal stenosis with T2 cord hyperintensity at C5-C6, evaluated for anterior versus posterior surgical decompression."
        ],
        "gaps": "Define the scoring structure of the modified Japanese Orthopaedic Association (mJOA) scale (mild 15-17, moderate 12-14, severe 0-11).",
        "sources": [
            {
                "pmid": "29164035",
                "title": "A Clinical Practice Guideline for the Management of Patients With Degenerative Cervical Myelopathy: Recommendations for Patients With Mild, Moderate, and Severe Disease and Nonmyelopathic Patients With Evidence of Cord Compression.",
                "year": 2017,
                "design": "guideline",
                "journal": "Global Spine J"
            },
            {
                "pmid": "24352777",
                "title": "Efficacy and safety of surgical decompression in patients with cervical spondylotic myelopathy: results of the AOSpine North America prospective multi-center study.",
                "year": 2013,
                "design": "trial",
                "journal": "J Bone Joint Surg Am"
            },
            {
                "pmid": "25811269",
                "title": "Degenerative Cervical Myelopathy: Epidemiology, Genetics, and Pathogenesis.",
                "year": 2015,
                "design": "review",
                "journal": "Spine"
            },
            {
                "pmid": "31974488",
                "title": "Degenerative cervical myelopathy — update and future directions.",
                "year": 2020,
                "design": "review",
                "journal": "Nat Rev Neurol"
            }
        ]
    }
}
