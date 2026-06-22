/**
 * Nigeria care-route hints keyed by normalization tags.
 * Informational only — not medical routing advice.
 */

export type NigeriaCareRoute =
  | 'chemist_pharmacy'
  | 'primary_clinic'
  | 'general_hospital'
  | 'antenatal_clinic'
  | 'emergency_services'
  | 'laboratory';

export type CareRouteHint = {
  route: NigeriaCareRoute;
  label: string;
  description: string;
};

export const CARE_ROUTE_HINTS: Record<NigeriaCareRoute, CareRouteHint> = {
  chemist_pharmacy: {
    route: 'chemist_pharmacy',
    label: 'Chemist / pharmacy',
    description: 'Licensed pharmacist for medicine questions, not diagnosis.',
  },
  primary_clinic: {
    route: 'primary_clinic',
    label: 'Primary clinic',
    description: 'Local clinic or PHC for assessment and follow-up.',
  },
  general_hospital: {
    route: 'general_hospital',
    label: 'General hospital',
    description: 'Hospital visit when symptoms are persistent or worsening.',
  },
  antenatal_clinic: {
    route: 'antenatal_clinic',
    label: 'Antenatal clinic',
    description: 'Pregnancy-related concerns should involve antenatal or obstetric care.',
  },
  emergency_services: {
    route: 'emergency_services',
    label: 'Emergency services',
    description: 'Severe, sudden, or unsafe symptoms need urgent in-person care.',
  },
  laboratory: {
    route: 'laboratory',
    label: 'Laboratory',
    description: 'Tests are ordered and interpreted with a clinician — slips alone are not conclusions.',
  },
};

/** Tags from healthPhrases → suggested care routes for downstream copy. */
export const CARE_ROUTES_BY_TAG: Partial<Record<string, NigeriaCareRoute[]>> = {
  fever: ['primary_clinic', 'general_hospital'],
  pediatric: ['primary_clinic', 'emergency_services'],
  pregnancy: ['antenatal_clinic', 'emergency_services'],
  medication: ['chemist_pharmacy', 'primary_clinic'],
  lab: ['laboratory', 'primary_clinic'],
  blood_pressure: ['primary_clinic', 'general_hospital'],
  gi: ['primary_clinic'],
  respiratory: ['primary_clinic'],
  skin: ['chemist_pharmacy', 'primary_clinic'],
  headache: ['primary_clinic'],
};

export function careRoutesForTags(tags: string[]): NigeriaCareRoute[] {
  const routes = new Set<NigeriaCareRoute>();
  for (const tag of tags) {
    for (const route of CARE_ROUTES_BY_TAG[tag] ?? []) {
      routes.add(route);
    }
  }
  return [...routes];
}
