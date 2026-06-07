'use strict';

const logger = require('../config/logger');
const { createBudgetForAction, runWithLlmBudget } = require('./llmRequestBudget');
const { parseStructuredOutput } = require('../utils/parseJson');

/**
 * Generates a branching clinical case scenario for medical education.
 * Cases progress through: initial presentation → investigations → management → outcome
 */

function buildCaseScenarioPrompt(topic, difficulty, userProfile = {}) {
    const difficultyMap = {
        easy: 'Common presentation, straightforward diagnosis, standard management',
        medium: 'Atypical presentation or comorbidity, requires clinical reasoning',
        hard: 'Complex multisystem case, diagnostic uncertainty, management dilemmas'
    };
    
    const trainingStage = userProfile.trainingStage || 'finals';
    const stageGuidance = {
        preclinical: 'Focus on pathophysiology and basic clinical features',
        early_clinical: 'Emphasize clinical assessment and first-line investigations',
        finals: 'Test diagnostic reasoning, management priorities, and safety',
        foundation_doctor: 'Focus on acute management, escalation criteria, and prescribing safety',
        clinician: 'Include management nuances, guideline application, and risk stratification'
    };

    return `Generate a branching clinical case scenario about "${topic}" for a ${trainingStage} learner.

DIFFICULTY: ${difficulty} — ${difficultyMap[difficulty]}
LEARNER GUIDANCE: ${stageGuidance[trainingStage] || stageGuidance.finals}

The case should have 4 decision points:
1. INITIAL PRESENTATION: Patient demographics, presenting complaint, brief history
2. EXAMINATION/INITIAL INVESTIGATION: What to check first
3. DIAGNOSIS/FURTHER WORKUP: Differential diagnosis or confirmatory tests
4. MANAGEMENT: Treatment decisions or escalation

For each decision point, provide:
- A clinical scenario update
- 3-4 options (mix of correct, suboptimal, and unsafe choices)
- Feedback for each option explaining consequences
- The clinically appropriate next step

Return ONLY valid JSON:
{
  "caseId": "unique-case-id",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "vignette": {
    "demographics": "Age, sex, relevant background",
    "presentingComplaint": "Chief complaint and key history",
    "relevantHistory": ["PMHx", "medications", "social history"],
    "clinicalQuestion": "What is your approach?"
  },
  "decisionTree": {
    "initial": {
      "stage": "initial_presentation",
      "scenario": "Full presenting scenario",
      "question": "What is your immediate priority?",
      "options": [
        {
          "id": "A",
          "text": "Option A text",
          "isAppropriate": true/false,
          "nextNode": "node_id or 'outcome_A'",
          "feedback": "Explanation of why this choice is appropriate/inappropriate",
          "clinicalConsequence": "What happens if this is chosen"
        }
      ]
    },
    "node_exam": {
      "stage": "examination",
      "scenario": "Examination findings based on previous choice",
      "question": "What investigation would you order?",
      "options": [...]
    },
    "node_diagnosis": {
      "stage": "diagnosis",
      "scenario": "Investigation results",
      "question": "What is the most likely diagnosis?",
      "options": [...]
    },
    "node_management": {
      "stage": "management",
      "scenario": "Diagnostic certainty established",
      "question": "What is your management plan?",
      "options": [...]
    }
  },
  "outcomes": {
    "outcome_optimal": {
      "terminal": true,
      "result": "Excellent clinical reasoning",
      "clinicalOutcome": "Patient improved with appropriate management",
      "teachingPoints": ["Key learning point 1", "Key learning point 2"]
    },
    "outcome_suboptimal": {
      "terminal": true,
      "result": "Acceptable but not ideal",
      "clinicalOutcome": "Patient eventually improved but with delays or complications",
      "teachingPoints": ["What could have been done better"]
    },
    "outcome_unsafe": {
      "terminal": true,
      "result": "Critical error",
      "clinicalOutcome": "Patient deteriorated due to missed diagnosis or inappropriate management",
      "teachingPoints": ["Why this approach was dangerous", "What should have been done"]
    }
  }
}`;
}

async function generateCaseScenario(ai, { topic, difficulty, userProfile, provider = 'gemini', model }) {
    return runWithLlmBudget(createBudgetForAction('case_generation'), async () => {
        const prompt = buildCaseScenarioPrompt(topic, difficulty, userProfile);
        
        let parsed;
        if (provider === 'gemini' && ai.callGeminiStructured) {
            parsed = await ai.callGeminiStructured(prompt, model, {
                temperature: 0.5,  // Slightly higher for creative case generation
                maxOutputTokens: 3500,
                usage: { operation: 'case_generation', topic, difficulty }
            });
        } else if (ai.callMistralStructured) {
            parsed = await ai.callMistralStructured(prompt, model, {
                temperature: 0.5,
                maxOutputTokens: 3500,
                usage: { operation: 'case_generation', topic, difficulty }
            });
        } else {
            throw new Error('No AI provider configured for case generation');
        }
        
        const caseScenario = parseStructuredOutput(String(parsed || '{}'));
        
        // Validate structure
        if (!caseScenario.vignette || !caseScenario.decisionTree || !caseScenario.outcomes) {
            throw new Error('Invalid case scenario structure from AI');
        }
        
        return {
            ...caseScenario,
            generatedAt: new Date().toISOString(),
            provider,
            model
        };
    });
}

async function saveCaseScenario(db, userId, caseScenario) {
    const caseId = `case_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    await db.run(
        `INSERT INTO case_scenarios (
            case_id, user_id, topic, difficulty, vignette, decision_tree, outcomes,
            current_node, choices_made, created_at, provider, model
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            caseId,
            userId,
            caseScenario.topic,
            caseScenario.difficulty,
            JSON.stringify(caseScenario.vignette),
            JSON.stringify(caseScenario.decisionTree),
            JSON.stringify(caseScenario.outcomes),
            'initial',  // Start at initial node
            JSON.stringify([]),
            new Date().toISOString(),
            caseScenario.provider,
            caseScenario.model
        ]
    );
    
    return { caseId, ...caseScenario };
}

async function getCaseScenario(db, caseId, userId) {
    const row = await db.get(
        `SELECT * FROM case_scenarios WHERE case_id = ? AND user_id = ?`,
        [caseId, userId]
    );
    
    if (!row) return null;
    
    return {
        caseId: row.case_id,
        topic: row.topic,
        difficulty: row.difficulty,
        vignette: JSON.parse(row.vignette || '{}'),
        decisionTree: JSON.parse(row.decision_tree || '{}'),
        outcomes: JSON.parse(row.outcomes || '{}'),
        currentNode: row.current_node,
        choicesMade: JSON.parse(row.choices_made || '[]'),
        createdAt: row.created_at,
        completedAt: row.completed_at
    };
}

async function recordCaseChoice(db, caseId, userId, nodeId, choiceId) {
    const caseScenario = await getCaseScenario(db, caseId, userId);
    if (!caseScenario) throw new Error('Case scenario not found');
    
    const currentNode = caseScenario.decisionTree[nodeId];
    if (!currentNode) throw new Error('Invalid node ID');
    
    const selectedOption = currentNode.options.find(opt => opt.id === choiceId);
    if (!selectedOption) throw new Error('Invalid choice ID');
    
    const choicesMade = [
        ...caseScenario.choicesMade,
        {
            nodeId,
            choiceId,
            isAppropriate: selectedOption.isAppropriate,
            timestamp: new Date().toISOString()
        }
    ];
    
    const nextNode = selectedOption.nextNode;
    const isTerminal = nextNode.startsWith('outcome_');
    
    // Update case state
    await db.run(
        `UPDATE case_scenarios 
         SET current_node = ?, choices_made = ?, completed_at = ?, updated_at = ?
         WHERE case_id = ? AND user_id = ?`,
        [
            nextNode,
            JSON.stringify(choicesMade),
            isTerminal ? new Date().toISOString() : null,
            new Date().toISOString(),
            caseId,
            userId
        ]
    );
    
    // Record attempt for mastery tracking
    if (isTerminal) {
        const outcome = caseScenario.outcomes[nextNode];
        const appropriateChoices = choicesMade.filter(c => c.isAppropriate).length;
        const totalChoices = choicesMade.length;
        const scorePercentage = Math.round((appropriateChoices / totalChoices) * 100);
        
        await db.run(
            `INSERT INTO case_scenario_attempts (
                user_id, case_id, topic, normalized_topic, difficulty,
                score_percentage, appropriate_choices, total_choices,
                outcome_type, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                caseId,
                caseScenario.topic,
                db.normalizeTopic(caseScenario.topic),
                caseScenario.difficulty,
                scorePercentage,
                appropriateChoices,
                totalChoices,
                nextNode.replace('outcome_', ''),
                new Date().toISOString()
            ]
        );
    }
    
    return {
        nextNode,
        isTerminal,
        feedback: selectedOption.feedback,
        clinicalConsequence: selectedOption.clinicalConsequence,
        nextScenario: isTerminal 
            ? caseScenario.outcomes[nextNode]
            : caseScenario.decisionTree[nextNode]
    };
}

module.exports = {
    generateCaseScenario,
    saveCaseScenario,
    getCaseScenario,
    recordCaseChoice,
    buildCaseScenarioPrompt
};
