const CURRENT_YEAR = new Date().getFullYear();

const GRADE_ORDER = { A: 4, B: 3, C: 2, D: 1 };

const LANDMARK_CITATION_THRESHOLD = 300;
const RECENT_YEARS = 3;

// Terms that indicate preclinical / basic science work
const PRECLINICAL_PATTERNS = /\b(in vitro|in vivo|mouse model|murine|rat model|cell line|knockout|knock-out|transgenic|zebrafish|drosophila|animal model|cell culture|cell culture|xenograft|organoid|ex vivo|recombinant protein|western blot|pcr|rna-seq|gene expression|mrna|sirna|crispr|plasmid|transfection|cytokine storm)\b/i;

// Terms that indicate clinical work (patient-facing)
const CLINICAL_PATTERNS = /\b(patients?|clinical trial|randomized|randomised|cohort|outcomes?|treatment|therapy|diagnosis|prognosis|survival|mortality|morbidity|hospitali[sz]ation|emergency|ward|clinic|physician|nurse|hospital|disease management|quality of life|symptom|comorbid)\b/i;

// Terms that suggest the user wants mechanistic / basic science info
const MECHANISM_QUERY_PATTERNS = /\b(mechanism|pathophysiology|pathogenesis|molecular|gene|protein|receptor|signaling|signalling|pathway|mutation|variant|expression|biomarker discovery)\b/i;

// Terms that indicate a basic science paper has clear clinical translation / implications,
// or has been cited in guidelines / clinical recommendations
const CLINICAL_TRANSLATION_PATTERNS = /\b(clinical(ly)?( relevant| significance| implication| application| translation)?|therapeutic target|translational|treatment implication|may inform|clinical relevance|clinical significance|clinical practice|implications? for (treatment|therapy|clinical|management)|drug target|therapeutic potential|clinical application|clinical utility|clinical impact|in (patients?|humans?)|human (subjects?|disease|trials?)|has implications|future (clinical|therapeutic)|pathway to clinic|novel therapeutic|phase [i1]+ (trial|study)|first-in-human|cited in (guidelines?|recommendations?)|incorporated into (guidelines?|practice|recommendations?)|basis for (guidelines?|recommendations?|current (treatment|therapy|practice))|underpins|underpin(ned|s) (current|clinical|guideline))\b/i;

const STOPWORDS = new Set([
    'with', 'from', 'this', 'that', 'they', 'were', 'been', 'have', 'will',
    'which', 'their', 'more', 'than', 'also', 'after', 'other', 'some', 'when',
    'what', 'each', 'most', 'such', 'into', 'over', 'both', 'very', 'using',
    'used', 'among', 'based', 'associated', 'study', 'trial', 'patients',
    'analysis', 'results', 'effect', 'effects', 'review',
]);

const ARCHETYPE_PATTERNS = {
    definition: /\b(definition|classifications?|criteria|diagnostic criteria|consensus|nomenclature|terminology)\b/i,
    management_trial: /\b(management|treatment|therapy|intervention|therapeutic|efficacy|effectiveness|outcomes?)\b/i,
    mechanism: /\b(mechanism|pathophysiology|pathogenesis|molecular|cellular|biomarker|genetics?)\b/i,
};

module.exports = {
    CURRENT_YEAR,
    GRADE_ORDER,
    LANDMARK_CITATION_THRESHOLD,
    RECENT_YEARS,
    PRECLINICAL_PATTERNS,
    CLINICAL_PATTERNS,
    MECHANISM_QUERY_PATTERNS,
    CLINICAL_TRANSLATION_PATTERNS,
    STOPWORDS,
    ARCHETYPE_PATTERNS,
};
