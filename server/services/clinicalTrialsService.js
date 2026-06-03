/**
 * Minimal ClinicalTrials.gov parser.
 *
 * Provides a typed wrapper around the ClinicalTrials.gov API v2
 * and normalizes trial records into a consistent shape.
 */

const logger = require('../config/logger');

const CTG_BASE = 'https://clinicaltrials.gov/api/v2';
const DEFAULT_TIMEOUT = 15000;

function parseStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('recruiting')) return 'recruiting';
  if (s.includes('completed')) return 'completed';
  if (s.includes('terminated')) return 'terminated';
  if (s.includes('suspended')) return 'suspended';
  if (s.includes('withdrawn')) return 'withdrawn';
  return 'unknown';
}

function parsePhase(phase) {
  const p = String(phase || '').toLowerCase();
  if (p.includes('early phase 1')) return 'early_phase_1';
  if (p.includes('phase 4') || p.includes('phase4')) return 'phase_4';
  if (p.includes('phase 3') || p.includes('phase3')) return 'phase_3';
  if (p.includes('phase 2') || p.includes('phase2')) return 'phase_2';
  if (p.includes('phase 1') || p.includes('phase1')) return 'phase_1';
  return 'not_applicable';
}

function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

function normalizeTrial(study) {
  const protocol = study.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const status = protocol.statusModule || {};
  const design = protocol.designModule || {};
  const arms = design.armsInterventionsModule?.armGroups || [];
  const interventions = design.armsInterventionsModule?.interventions || [];
  const outcomes = protocol.outcomesModule || {};
  const sponsor = protocol.sponsorCollaboratorsModule || {};
  const contacts = protocol.contactsLocationsModule || {};
  const locations = contacts.locations || [];
  const description = protocol.descriptionModule || {};

  return {
    nctId: identification.nctId || null,
    title: identification.briefTitle || identification.officialTitle || '',
    officialTitle: identification.officialTitle || '',
    status: parseStatus(status.overallStatus),
    phase: parsePhase(design.phases?.[0]),
    studyType: design.studyType || '',
    condition: (protocol.conditionsModule?.conditions || []).join('; '),
    leadSponsor: sponsor.leadSponsor?.name || '',
    overallContact: contacts.centralContacts?.[0]?.name || '',
    overallContactEmail: contacts.centralContacts?.[0]?.email || '',
    locations: locations.map((loc) => ({
      facility: loc.facility || '',
      city: loc.city || '',
      country: loc.country || '',
    })),
    startDate: parseDate(status.startDateStruct?.date),
    completionDate: parseDate(status.completionDateStruct?.date),
    enrollmentCount: Number(design.enrollmentInfo?.count) || 0,
    arms: arms.map((a) => ({
      label: a.label || '',
      type: a.type || '',
      description: a.description || '',
    })),
    interventions: interventions.map((i) => ({
      type: i.type || '',
      name: i.name || '',
      description: i.description || '',
    })),
    primaryOutcomes: (outcomes.primaryOutcomes || []).map((o) => ({
      measure: o.measure || '',
      timeFrame: o.timeFrame || '',
    })),
    briefSummary: description.briefSummary || '',
    detailedDescription: description.detailedDescription || '',
    _source: 'clinicaltrials.gov',
  };
}

async function searchTrials(query, { pageSize = 20, fetchImpl } = {}) {
  const f = fetchImpl || global.fetch;
  const url = `${CTG_BASE}/studies?query.term=${encodeURIComponent(query)}&pageSize=${pageSize}&format=json`;
  const res = await f(url, { timeout: DEFAULT_TIMEOUT });
  if (!res.ok) throw new Error(`ClinicalTrials.gov ${res.status}`);
  const data = await res.json();
  const studies = Array.isArray(data.studies) ? data.studies : [];
  return studies.map(normalizeTrial);
}

async function getTrial(nctId, { fetchImpl } = {}) {
  const f = fetchImpl || global.fetch;
  const url = `${CTG_BASE}/studies/${encodeURIComponent(nctId)}`;
  const res = await f(url, { timeout: DEFAULT_TIMEOUT });
  if (!res.ok) throw new Error(`ClinicalTrials.gov ${res.status}`);
  const data = await res.json();
  return normalizeTrial(data);
}

module.exports = {
  searchTrials,
  getTrial,
  normalizeTrial,
  parseStatus,
  parsePhase,
  parseDate,
};
