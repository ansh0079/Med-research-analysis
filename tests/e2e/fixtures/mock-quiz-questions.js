/**
 * Deterministic mock quiz questions for E2E tests.
 * These are returned by page.route() interceptors so tests don't need real LLM calls.
 */

const sepsisEasy = [
  {
    id: 'mock_sepsis_1',
    type: 'multiple_choice',
    questionType: 'recall',
    question: 'What is the first-line vasopressor recommended in the Surviving Sepsis Campaign guidelines for adult septic shock?',
    options: [
      'A: Dopamine',
      'B: Norepinephrine',
      'C: Epinephrine',
      'D: Phenylephrine',
    ],
    correctAnswer: 'B',
    explanation: 'Norepinephrine is the recommended first-line vasopressor for septic shock per SSC guidelines.',
    whyOthersWrong: 'Dopamine is no longer recommended due to arrhythmia risk; epinephrine is second-line; phenylephrine is not recommended due to concern for decreased stroke volume.',
    difficulty: 'easy',
    sourceArticle: 'Surviving Sepsis Campaign Guidelines',
    sourceReference: 'Evans et al. CCM 2021',
    outlineNodeId: 'sepsis.vasopressors.first_line',
  },
  {
    id: 'mock_sepsis_2',
    type: 'multiple_choice',
    questionType: 'clinical_application',
    question: 'A 68-year-old patient with suspected sepsis has a lactate of 4.2 mmol/L and MAP 58 mmHg. What is the most appropriate initial fluid resuscitation strategy?',
    options: [
      'A: 500 mL crystalloid bolus and reassess',
      'B: 1 L colloid bolus over 1 hour',
      'C: 30 mL/kg crystalloid within 3 hours',
      'D: Fluid restriction and early vasopressors',
    ],
    correctAnswer: 'C',
    explanation: 'The SSC recommends at least 30 mL/kg of IV crystalloid for initial resuscitation within the first 3 hours.',
    whyOthersWrong: '500 mL may be insufficient; colloids are not first-line; fluid restriction is inappropriate in hypoperfusion.',
    difficulty: 'easy',
    sourceArticle: 'SSC Bundle',
    sourceReference: 'Levy et al. ICM 2018',
    outlineNodeId: 'sepsis.resuscitation.fluids',
  },
  {
    id: 'mock_sepsis_3',
    type: 'multiple_choice',
    questionType: 'trial_interpretation',
    question: 'In the ProCESS trial, what was the primary conclusion regarding protocolized care versus usual care in sepsis?',
    options: [
      'A: Protocolized care reduced 60-day mortality',
      'B: Protocolized care increased ICU-free days',
      'C: No significant difference in 60-day mortality',
      'D: Usual care was associated with higher organ failure rates',
    ],
    correctAnswer: 'C',
    explanation: 'ProCESS found no significant difference in 60-day mortality between protocolized EGDT, protocolized standard therapy, and usual care.',
    whyOthersWrong: 'EGDT did not show mortality benefit in this modern-era trial; secondary outcomes were similar across arms.',
    difficulty: 'easy',
    sourceArticle: 'ProCESS Trial',
    sourceReference: 'Yealy et al. NEJM 2014',
    outlineNodeId: 'sepsis.trials.process',
  },
];

module.exports = { sepsisEasy };
