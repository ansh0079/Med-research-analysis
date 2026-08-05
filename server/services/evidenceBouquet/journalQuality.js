// Tier 1 — flagship general medical journals (+18 pts)
const TIER1_JOURNALS = new Set([
    'new england journal of medicine', 'nejm', 'n engl j med',
    'the lancet', 'lancet',
    'jama', 'journal of the american medical association',
    'bmj', 'british medical journal',
    'annals of internal medicine',
    'nature medicine',
    'nature',
    'science',
    'plos medicine',
    'the bmj',
]);

// Tier 2 — high-impact specialty journals (+12 pts)
const TIER2_JOURNALS = new Set([
    'circulation', 'journal of the american college of cardiology', 'jacc',
    'european heart journal', 'heart',
    'journal of clinical oncology', 'cancer', 'lancet oncology',
    'gut', 'gastroenterology', 'hepatology',
    'american journal of respiratory and critical care medicine',
    'chest', 'thorax', 'lancet respiratory medicine',
    'diabetes care', 'diabetologia', 'lancet diabetes endocrinology',
    'lancet diabetes & endocrinology',
    'blood', 'haematologica', 'journal of hematology oncology',
    'neurology', 'brain', 'lancet neurology', 'jama neurology',
    'kidney international', 'journal of the american society of nephrology',
    'clinical infectious diseases', 'journal of infectious diseases',
    'lancet infectious diseases',
    'annals of surgery', 'annals of oncology',
    'jama internal medicine', 'jama cardiology', 'jama oncology',
    'jama pediatrics', 'jama psychiatry', 'jama dermatology',
    'lancet psychiatry', 'american journal of psychiatry',
    'american journal of medicine',
    'archives of internal medicine',
    'journal of allergy and clinical immunology',
    'arthritis & rheumatology', 'annals of the rheumatic diseases',
    'endocrine reviews', 'journal of clinical endocrinology & metabolism',
]);

// Tier 3 — solid reputable journals (+6 pts)
const TIER3_JOURNALS = new Set([
    'medicine', 'plos one', 'scientific reports',
    'bmc medicine', 'bmj open', 'journal of general internal medicine',
    'american journal of epidemiology', 'epidemiology',
    'journal of hospital medicine', 'academic emergency medicine',
    'critical care medicine', 'intensive care medicine',
    'european journal of cardiology', 'clinical cardiology',
    'journal of hepatology', 'alimentary pharmacology & therapeutics',
    'journal of neurology', 'european journal of neurology',
    'diabetes', 'journal of diabetes', 'metabolism',
    'cancer medicine', 'oncologist', 'supportive care in cancer',
    'pediatrics', 'archives of disease in childhood',
    'obstetrics & gynecology', 'american journal of obstetrics and gynecology',
    'journal of urology', 'european urology',
    'dermatology', 'journal of the american academy of dermatology',
    'rheumatology', 'clinical rheumatology',
    'journal of pain', 'pain',
    'age and ageing', 'journal of the american geriatrics society',
    'stroke', 'cerebrovascular diseases',
    'world journal of gastroenterology',
]);

// Known predatory publishers / journals — exclude entirely
const PREDATORY_PATTERNS = /\b(omics (international|group|publishing)|hikari|science publishing group|scirp|scientific research publishing|iomcworld|medcrave|crimson publishers|openventio|lupine publishers|austin publishing|jscimedcentral|remedy publications|symbiosis online|longdom|peertechz|annex publishers|gavin publishers|sryahwa|innovationinfo|auctores|herdin|scholar's press|lambert academic|lap lambert|altasciences|global journals inc|international journal of innovative research|ijir|ijser|international journal of scientific.*engineering.*research|world academy of science.*engineering.*technology|waset)\b/i;

function getJournalName(article) {
    const raw = article.journal || article.source || article.journalName || '';
    return String(raw).toLowerCase().trim();
}

function getJournalBonus(article) {
    const name = getJournalName(article);
    if (!name || name === 'semantic scholar' || name === 'pubmed') return 0;
    if (TIER1_JOURNALS.has(name)) return 18;
    // Partial match for tier 1 (e.g. "The New England Journal of Medicine")
    for (const j of TIER1_JOURNALS) {
        if (name.includes(j) || j.includes(name)) return 18;
    }
    if (TIER2_JOURNALS.has(name)) return 12;
    for (const j of TIER2_JOURNALS) {
        if (name.includes(j) || j.includes(name)) return 12;
    }
    if (TIER3_JOURNALS.has(name)) return 6;
    for (const j of TIER3_JOURNALS) {
        if (name.includes(j) || j.includes(name)) return 6;
    }
    return 0;
}

function isPredatoryJournal(article) {
    const name = getJournalName(article);
    if (!name) return false;
    return PREDATORY_PATTERNS.test(name);
}

module.exports = {
    getJournalName,
    getJournalBonus,
    isPredatoryJournal,
};
