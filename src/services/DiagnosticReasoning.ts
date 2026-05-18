/**
 * Diagnostic Reasoning Service
 * Implements clinical differential diagnosis logic and risk stratification.
 */

export interface Differential {
  diagnosis: string;
  probability: 'high' | 'medium' | 'low';
  redFlags: string[];
  matchedFeatures?: string[];
}

export class DiagnosticReasoningService {
  private patterns: Record<string, { differentials: Differential[]; workup: string[] }> = {
    'chest pain': {
      differentials: [
        { diagnosis: 'ACS', probability: 'high', redFlags: ['radiating to arm', 'diaphoresis'] },
        { diagnosis: 'PE', probability: 'medium', redFlags: ['dyspnea', 'pleuritic pain'] },
        { diagnosis: 'Dissection', probability: 'low', redFlags: ['tearing pain', 'back pain'] }
      ],
      workup: ['ECG', 'Troponins', 'CXR']
    },
    'headache': {
      differentials: [
        { diagnosis: 'Migraine', probability: 'high', redFlags: ['unilateral', 'aura'] },
        { diagnosis: 'SAH', probability: 'low', redFlags: ['thunderclap', 'worst of life'] }
      ],
      workup: ['Neuro exam', 'CT Head if red flags']
    }
  };

  analyzeSymptoms(symptoms: string[], severity: 'mild' | 'moderate' | 'severe' = 'moderate') {
    const thinking: string[] = [];
    const differentials: Differential[] = [];
    const redFlags: string[] = [];
    let urgency: 'routine' | 'urgent' | 'emergent' = 'routine';

    thinking.push(`Step 1: Analyzing ${symptoms.length} symptoms.`);
    
    symptoms.forEach(s => {
      const lowerS = s.toLowerCase();
      for (const [key, pattern] of Object.entries(this.patterns)) {
        if (lowerS.includes(key)) {
          thinking.push(`Pattern match: ${key} detected.`);
          pattern.differentials.forEach(d => {
            const matches = d.redFlags.filter(rf => symptoms.some(sym => sym.toLowerCase().includes(rf)));
            if (matches.length > 0) {
              redFlags.push(...matches);
              differentials.push({ ...d, matchedFeatures: matches });
            } else {
              differentials.push(d);
            }
          });
        }
      }
    });

    if (redFlags.length > 1 || severity === 'severe') urgency = 'emergent';
    else if (redFlags.length === 1) urgency = 'urgent';

    thinking.push(`Step 2: Risk stratified as ${urgency}.`);

    return {
      thinking,
      differentials: this.deduplicate(differentials),
      urgency,
      redFlags: [...new Set(redFlags)],
      disclaimer: 'Educational purposes only. Consult a doctor.'
    };
  }

  private deduplicate(arr: Differential[]): Differential[] {
    const seen = new Set();
    return arr.filter(d => {
      if (seen.has(d.diagnosis)) return false;
      seen.add(d.diagnosis);
      return true;
    });
  }
}

export const diagnosticService = new DiagnosticReasoningService();