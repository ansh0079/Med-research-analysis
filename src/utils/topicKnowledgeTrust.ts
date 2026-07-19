/** Detect landmark/curriculum stub mentor knowledge that is not yet fully enriched. */
export function isLandmarkSeedKnowledge(guidance: {
  seededFrom?: string | null;
  mentorMessage?: string | null;
} | null | undefined): boolean {
  if (!guidance) return false;
  const from = String(guidance.seededFrom || '');
  if (from === 'flagshipTopics.json' || from === 'curriculumSeedService') return true;
  const msg = String(guidance.mentorMessage || '').toLowerCase();
  return msg.includes('pending fuller') || msg.includes('curated landmark seed');
}
