export type RedFlagCategory =
  | 'chest_pain'
  | 'difficulty_breathing'
  | 'fainting'
  | 'stroke_symptoms'
  | 'severe_allergic_reaction'
  | 'severe_bleeding'
  | 'seizure'
  | 'self_harm'
  | 'pregnancy_emergency'
  | 'severe_abdominal_pain'
  | 'severe_dehydration'
  | 'confusion_severe_weakness'
  | 'high_fever_danger'
  | 'severe_infection'
  | 'severe_eye'
  | 'overdose_poisoning'
  | 'infant_child_emergency'
  | 'domestic_violence'
  | 'severe_sudden_pain'
  | 'worst_headache';

export type RedFlagSeverity = 'urgent' | 'emergency';

export type RedFlagDefinition = {
  category: RedFlagCategory;
  /** Short label for logs and backward-compatible match lists. */
  label: string;
  terms: string[];
  severity: RedFlagSeverity;
  selfHarm?: boolean;
  immediateSafety?: boolean;
};

export type RedFlagMatch = {
  category: RedFlagCategory;
  label: string;
  severity: RedFlagSeverity;
  selfHarm: boolean;
  immediateSafety: boolean;
  matchedTerm: string;
};

export type RedFlagDetectionResult = {
  matches: RedFlagMatch[];
  categories: RedFlagCategory[];
  hasUrgent: boolean;
  selfHarm: boolean;
  immediateSafety: boolean;
  title: string;
  body: string;
};

export const CALM_URGENT_TITLE = 'This may need urgent support.';
export const CALM_URGENT_BODY =
  'Curavon can help organize your notes, but severe, sudden, or unsafe symptoms should be handled by local emergency services or a clinician now.';
export const SELF_HARM_URGENT_TITLE = 'You deserve immediate support.';
export const SELF_HARM_URGENT_BODY =
  'If you may be in danger or might harm yourself, contact local emergency services or a trusted person now.';
export const IMMEDIATE_SAFETY_TITLE = 'Your safety comes first.';
export const IMMEDIATE_SAFETY_BODY =
  'If you are in immediate danger, contact local emergency services or a trusted person now. Curavon can help you prepare notes for a clinician afterward — not replace urgent support.';
export const EMERGENCY_URGENT_TITLE = 'This may need emergency care now.';
export const EMERGENCY_URGENT_BODY =
  'Severe or sudden symptoms like these should be evaluated by local emergency services or a clinician immediately. Curavon can help organize a doctor-ready summary — not provide diagnosis or treatment.';

/** Explicit safe negations — stripped before pattern matching. */
const SAFE_NEGATED_PHRASES = [
  'no chest pain',
  'no chest pressure',
  'do not have chest pain',
  'dont have chest pain',
  "don't have chest pain",
  'not having chest pain',
  'no trouble breathing',
  'no difficulty breathing',
  'not having trouble breathing',
  'not suicidal',
  'not feeling suicidal',
  'am not suicidal',
  'did not faint',
  'didnt faint',
  "didn't faint",
  'have not fainted',
  'have not passed out',
  'no fainting',
  'not fainting',
  'not having a seizure',
  'no seizure',
  'not suicidal thoughts',
  'no suicidal thoughts',
  'not trying to harm myself',
  'not going to harm myself',
] as const;

const RED_FLAG_REGISTRY: RedFlagDefinition[] = [
  {
    category: 'chest_pain',
    label: 'chest pain',
    terms: ['chest pain', 'chest pressure', 'crushing chest', 'tightness in my chest', 'pain in my chest'],
    severity: 'emergency',
  },
  {
    category: 'difficulty_breathing',
    label: 'trouble breathing',
    terms: [
      'trouble breathing',
      'difficulty breathing',
      'shortness of breath',
      'struggling to breathe',
      'gasping for air',
      'cannot breathe',
      "can't breathe",
      'cant breathe',
    ],
    severity: 'emergency',
  },
  {
    category: 'fainting',
    label: 'fainting',
    terms: [
      'fainting',
      'i fainted',
      'fainted',
      'passed out',
      'pass out',
      'loss of consciousness',
      'lost consciousness',
      'blacked out',
    ],
    severity: 'emergency',
  },
  {
    category: 'stroke_symptoms',
    label: 'face drooping',
    terms: [
      'face drooping',
      'face is drooping',
      'drooping face',
      'sudden weakness',
      'slurred speech',
      'stroke',
      'one sided weakness',
      'one-sided weakness',
      'numbness on one side',
    ],
    severity: 'emergency',
  },
  {
    category: 'severe_allergic_reaction',
    label: 'severe allergic reaction',
    terms: [
      'anaphylaxis',
      'severe allergic reaction',
      'throat swelling',
      'throat is swelling',
      'tongue swelling',
      'lips swelling',
      'swelling after eating',
    ],
    severity: 'emergency',
  },
  {
    category: 'severe_bleeding',
    label: 'heavy bleeding',
    terms: [
      'heavy bleeding',
      'severe bleeding',
      'bleeding heavily',
      "bleeding won't stop",
      'bleeding will not stop',
      'bleeding that will not stop',
    ],
    severity: 'emergency',
  },
  {
    category: 'seizure',
    label: 'seizure',
    terms: ['seizure', 'having a seizure', 'convulsion', 'convulsing', 'had a seizure'],
    severity: 'emergency',
  },
  {
    category: 'self_harm',
    label: 'suicidal',
    terms: [
      'suicidal',
      'harm myself',
      'hurt myself',
      'kill myself',
      'thoughts of harming myself',
      'self-harm',
      'self harm',
      'want to die',
      'end my life',
      'want to harm myself',
    ],
    severity: 'emergency',
    selfHarm: true,
  },
  {
    category: 'pregnancy_emergency',
    label: 'pregnancy emergency',
    terms: [
      'pregnant and bleeding',
      'bleeding heavily while pregnant',
      'pregnancy emergency',
      'severe pain while pregnant',
      'pregnant and bleeding heavily',
    ],
    severity: 'emergency',
  },
  {
    category: 'severe_abdominal_pain',
    label: 'severe abdominal pain',
    terms: ['severe abdominal pain', 'severe stomach pain', 'worst abdominal pain', 'worst stomach pain'],
    severity: 'urgent',
  },
  {
    category: 'severe_dehydration',
    label: 'severe dehydration',
    terms: [
      'severe dehydration',
      "can't keep fluids down",
      'cannot keep fluids down',
      'not urinating',
      'barely urinating',
    ],
    severity: 'urgent',
  },
  {
    category: 'confusion_severe_weakness',
    label: 'confusion or severe weakness',
    terms: [
      'suddenly confused',
      'severe weakness',
      'very weak',
      'confused and weak',
      "can't stay awake",
      'cannot stay awake',
      'extremely weak',
    ],
    severity: 'urgent',
  },
  {
    category: 'high_fever_danger',
    label: 'high fever with danger signs',
    terms: [
      'high fever and stiff neck',
      'fever and stiff neck',
      'fever and rash',
      'fever and confusion',
      'high fever and very weak',
    ],
    severity: 'urgent',
  },
  {
    category: 'severe_infection',
    label: 'severe infection signs',
    terms: [
      'signs of severe infection',
      'spreading redness',
      'red streak',
      'rapidly spreading infection',
      'severe infection',
    ],
    severity: 'urgent',
  },
  {
    category: 'severe_eye',
    label: 'severe eye pain or vision loss',
    terms: ['sudden vision loss', 'vision loss', 'severe eye pain', 'lost vision', 'cannot see'],
    severity: 'urgent',
  },
  {
    category: 'overdose_poisoning',
    label: 'overdose or poisoning',
    terms: [
      'took too many pills',
      'too many pills',
      'overdose',
      'overdosed',
      'poisoning',
      'swallowed poison',
      'poisoned',
    ],
    severity: 'emergency',
  },
  {
    category: 'infant_child_emergency',
    label: 'infant or child emergency',
    terms: [
      'my baby has',
      'baby has a high fever',
      'my infant',
      'newborn fever',
      'child has high fever',
      'young child is very weak',
      'baby is very weak',
    ],
    severity: 'emergency',
  },
  {
    category: 'domestic_violence',
    label: 'immediate safety danger',
    terms: [
      'partner is threatening',
      'threatening me right now',
      'domestic violence',
      'afraid of my partner',
      'hitting me',
      'abusing me',
      'scared for my safety',
    ],
    severity: 'emergency',
    immediateSafety: true,
  },
  {
    category: 'severe_sudden_pain',
    label: 'severe sudden pain',
    terms: ['severe sudden pain'],
    severity: 'urgent',
  },
  {
    category: 'worst_headache',
    label: 'worst headache',
    terms: ['worst headache'],
    severity: 'urgent',
  },
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[’]/g, "'");
}

function stripSafeNegatedPhrases(text: string): string {
  let masked = text;
  for (const phrase of SAFE_NEGATED_PHRASES) {
    const normalizedPhrase = normalizeText(phrase);
    let index = masked.indexOf(normalizedPhrase);
    while (index >= 0) {
      masked = `${masked.slice(0, index)}${' '.repeat(normalizedPhrase.length)}${masked.slice(index + normalizedPhrase.length)}`;
      index = masked.indexOf(normalizedPhrase, index + normalizedPhrase.length);
    }
  }
  return masked;
}

function isNegatedAtIndex(text: string, termIndex: number): boolean {
  const windowStart = Math.max(0, termIndex - 60);
  const before = text.slice(windowStart, termIndex);
  return /\b(no|not|without|never|neither|don't|dont|do not|did not|didn't|not having|not experiencing|am not|are not|is not|was not|were not)(\s+\w+){0,5}$/.test(
    before,
  );
}

function isHistoricalNonCurrentRisk(text: string, termIndex: number, termLength: number): boolean {
  const before = text.slice(Math.max(0, termIndex - 24), termIndex);
  const after = text.slice(termIndex, termIndex + termLength + 80);
  const pastNear =
    /\b(had|was|were)\b/.test(before) ||
    /\b(last year|years ago|months ago|weeks ago|previously|in the past)\b/.test(after);
  const currentNegated = /\b(but not now|not now|not currently|no longer|not anymore|anymore)\b/.test(after);
  return pastNear && currentNegated;
}

function resolveEscalationCopy(result: Pick<RedFlagDetectionResult, 'selfHarm' | 'immediateSafety' | 'matches'>) {
  if (result.selfHarm) {
    return { title: SELF_HARM_URGENT_TITLE, body: SELF_HARM_URGENT_BODY };
  }
  if (result.immediateSafety) {
    return { title: IMMEDIATE_SAFETY_TITLE, body: IMMEDIATE_SAFETY_BODY };
  }
  if (result.matches.some((match) => match.severity === 'emergency')) {
    return { title: EMERGENCY_URGENT_TITLE, body: EMERGENCY_URGENT_BODY };
  }
  return { title: CALM_URGENT_TITLE, body: CALM_URGENT_BODY };
}

export function getRedFlagRegistry(): readonly RedFlagDefinition[] {
  return RED_FLAG_REGISTRY;
}

export function getEscalationCopyForCategory(category: RedFlagCategory): { title: string; body: string } {
  const definition = RED_FLAG_REGISTRY.find((entry) => entry.category === category);
  if (!definition) {
    return { title: CALM_URGENT_TITLE, body: CALM_URGENT_BODY };
  }
  return resolveEscalationCopy({
    selfHarm: Boolean(definition.selfHarm),
    immediateSafety: Boolean(definition.immediateSafety),
    matches: [
      {
        category: definition.category,
        label: definition.label,
        severity: definition.severity,
        selfHarm: Boolean(definition.selfHarm),
        immediateSafety: Boolean(definition.immediateSafety),
        matchedTerm: definition.terms[0] ?? definition.label,
      },
    ],
  });
}

export function detectRedFlags(input: string): RedFlagDetectionResult {
  const normalized = normalizeText(input);
  const masked = stripSafeNegatedPhrases(normalized);
  const matches: RedFlagMatch[] = [];

  for (const definition of RED_FLAG_REGISTRY) {
    for (const term of definition.terms) {
      const normalizedTerm = normalizeText(term);
      let index = masked.indexOf(normalizedTerm);
      while (index >= 0) {
        if (
          !isNegatedAtIndex(masked, index) &&
          !isHistoricalNonCurrentRisk(masked, index, normalizedTerm.length)
        ) {
          matches.push({
            category: definition.category,
            label: definition.label,
            severity: definition.severity,
            selfHarm: Boolean(definition.selfHarm),
            immediateSafety: Boolean(definition.immediateSafety),
            matchedTerm: term,
          });
          break;
        }
        index = masked.indexOf(normalizedTerm, index + normalizedTerm.length);
      }
    }
  }

  const selfHarm = matches.some((match) => match.selfHarm);
  const immediateSafety = matches.some((match) => match.immediateSafety);
  const partial = { matches, selfHarm, immediateSafety };
  const copy = resolveEscalationCopy(partial);

  return {
    matches,
    categories: matches.map((match) => match.category),
    hasUrgent: matches.length > 0,
    selfHarm,
    immediateSafety,
    title: copy.title,
    body: copy.body,
  };
}

export function hasUrgentRedFlag(input: string): boolean {
  return detectRedFlags(input).hasUrgent;
}
