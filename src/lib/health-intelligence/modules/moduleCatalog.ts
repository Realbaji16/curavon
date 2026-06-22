/**
 * Module catalog — JSON seeds loaded via resolveJsonModule (see tsconfig.json).
 * Seeds stay JSON for easy content editing; TypeScript validates at import time through HealthModule.
 */
import type { HealthModule } from './moduleTypes';
import type { HealthModuleId } from './moduleIds';
import { HEALTH_MODULE_IDS } from './moduleIds';

import bloodPressure from './seeds/blood_pressure_ng_v1.json';
import bloodSugar from './seeds/blood_sugar_ng_v1.json';
import breathingDifficulty from './seeds/breathing_difficulty_ng_v1.json';
import chestPain from './seeds/chest_pain_ng_v1.json';
import childFeverIllness from './seeds/child_fever_illness_ng_v1.json';
import clinicPharmacyPrep from './seeds/clinic_pharmacy_prep_ng_v1.json';
import coughCatarrh from './seeds/cough_catarrh_ng_v1.json';
import diarrheaVomiting from './seeds/diarrhea_vomiting_ng_v1.json';
import eyeEarDental from './seeds/eye_ear_dental_ng_v1.json';
import feverMalaria from './seeds/fever_malaria_ng_v1.json';
import headache from './seeds/headache_ng_v1.json';
import injuryWoundSwelling from './seeds/injury_wound_swelling_ng_v1.json';
import labResultConfusion from './seeds/lab_result_confusion_ng_v1.json';
import medicationQuestion from './seeds/medication_question_ng_v1.json';
import menstrualReproductive from './seeds/menstrual_reproductive_ng_v1.json';
import missedMedication from './seeds/missed_medication_ng_v1.json';
import pregnancyConcern from './seeds/pregnancy_concern_ng_v1.json';
import skinRashItching from './seeds/skin_rash_itching_ng_v1.json';
import stomachPain from './seeds/stomach_pain_ng_v1.json';
import stressAnxietySleep from './seeds/stress_anxiety_sleep_ng_v1.json';

function asHealthModule(seed: unknown): HealthModule {
  return seed as HealthModule;
}

const MODULE_LIST: HealthModule[] = [
  asHealthModule(feverMalaria),
  asHealthModule(headache),
  asHealthModule(stomachPain),
  asHealthModule(diarrheaVomiting),
  asHealthModule(coughCatarrh),
  asHealthModule(breathingDifficulty),
  asHealthModule(chestPain),
  asHealthModule(bloodPressure),
  asHealthModule(bloodSugar),
  asHealthModule(medicationQuestion),
  asHealthModule(missedMedication),
  asHealthModule(labResultConfusion),
  asHealthModule(pregnancyConcern),
  asHealthModule(childFeverIllness),
  asHealthModule(menstrualReproductive),
  asHealthModule(skinRashItching),
  asHealthModule(injuryWoundSwelling),
  asHealthModule(eyeEarDental),
  asHealthModule(stressAnxietySleep),
  asHealthModule(clinicPharmacyPrep),
];

if (MODULE_LIST.length !== HEALTH_MODULE_IDS.length) {
  throw new Error(
    `Health module catalog out of sync: expected ${HEALTH_MODULE_IDS.length} modules, got ${MODULE_LIST.length}.`,
  );
}

const ids = MODULE_LIST.map((module) => module.module_id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  throw new Error('Health module catalog contains duplicate module_id values.');
}

for (const expectedId of HEALTH_MODULE_IDS) {
  if (!uniqueIds.has(expectedId)) {
    throw new Error(`Health module catalog missing seed for ${expectedId}.`);
  }
}

export const HEALTH_MODULES: readonly HealthModule[] = MODULE_LIST;

export const HEALTH_MODULE_BY_ID: Readonly<Record<HealthModuleId, HealthModule>> = Object.freeze(
  Object.fromEntries(MODULE_LIST.map((module) => [module.module_id, module])) as Record<
    HealthModuleId,
    HealthModule
  >,
);

export function getHealthModuleById(id: HealthModuleId): HealthModule {
  return HEALTH_MODULE_BY_ID[id];
}

export function listHealthModules(): HealthModule[] {
  return [...HEALTH_MODULES];
}
