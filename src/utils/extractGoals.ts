export type GoalDefinition = {
  label: string;
  patterns: RegExp[];
};

export const GOAL_DEFINITIONS: GoalDefinition[] = [
  {
    label: 'Better sleep',
    patterns: [
      /\bsleep\b/i,
      /\binsomnia\b/i,
      /\brestless\b/i,
      /\bwake up\b/i,
      /\bwaking up\b/i,
      /\bcan'?t fall asleep\b/i,
      /\btired in the morning\b/i,
      /\bpoor sleep\b/i,
    ],
  },
  {
    label: 'More energy',
    patterns: [
      /\benergy\b/i,
      /\bexhausted\b/i,
      /\bfatigue\b/i,
      /\bfatigued\b/i,
      /\bsluggish\b/i,
      /\bdrained\b/i,
      /\blow energy\b/i,
      /\bno energy\b/i,
      /\bwiped out\b/i,
    ],
  },
  {
    label: 'Less stress',
    patterns: [
      /\bstress\b/i,
      /\bstressed\b/i,
      /\banxious\b/i,
      /\banxiety\b/i,
      /\boverwhelmed\b/i,
      /\bburnout\b/i,
      /\bworry\b/i,
      /\bworried\b/i,
      /\btense\b/i,
      /\bon edge\b/i,
    ],
  },
  {
    label: 'Balanced eating',
    patterns: [
      /\beat(ing)?\b/i,
      /\bdiet\b/i,
      /\bnutrition\b/i,
      /\bmeal\b/i,
      /\bsugar\b/i,
      /\bappetite\b/i,
      /\bfood\b/i,
      /\bcravings?\b/i,
      /\bsnack(ing)?\b/i,
    ],
  },
  {
    label: 'Move more',
    patterns: [
      /\bexercise\b/i,
      /\bworkout\b/i,
      /\bmovement\b/i,
      /\bwalk(ing)?\b/i,
      /\bactive\b/i,
      /\bgym\b/i,
      /\bfitness\b/i,
      /\bstretch(ing)?\b/i,
      /\bsteps\b/i,
    ],
  },
  {
    label: 'Mental clarity',
    patterns: [
      /\bfocus\b/i,
      /\bfoggy\b/i,
      /\bbrain fog\b/i,
      /\bconcentrat(e|ion)\b/i,
      /\bclarity\b/i,
      /\bforgetful\b/i,
      /\bscatterbrained\b/i,
      /\bproductive\b/i,
    ],
  },
  {
    label: 'Mood balance',
    patterns: [
      /\bmood\b/i,
      /\birritable\b/i,
      /\bemotional\b/i,
      /\blow mood\b/i,
      /\bfeel(ing)? down\b/i,
      /\bups and downs\b/i,
      /\bcalm(er)?\b/i,
    ],
  },
  {
    label: 'Gut comfort',
    patterns: [
      /\bgut\b/i,
      /\bstomach\b/i,
      /\bdigest(ion|ive)?\b/i,
      /\bbloat(ing)?\b/i,
      /\bnausea\b/i,
      /\bheartburn\b/i,
      /\bibs\b/i,
      /\bbowel\b/i,
    ],
  },
  {
    label: 'Pain relief',
    patterns: [
      /\bpain\b/i,
      /\bache\b/i,
      /\bsore\b/i,
      /\bheadache\b/i,
      /\bmigraine\b/i,
      /\bchronic pain\b/i,
      /\bdiscomfort\b/i,
    ],
  },
  {
    label: 'Healthy weight',
    patterns: [
      /\bweight\b/i,
      /\blose weight\b/i,
      /\bgain weight\b/i,
      /\bbody composition\b/i,
      /\boverweight\b/i,
    ],
  },
];

export const GOAL_QUICK_PICKS = GOAL_DEFINITIONS.map((goal) => goal.label);

const INTENT_PATTERN =
  /(?:want to|need to|hope to|trying to|help with|struggling with|improve my|feel more|feel less|get more|get less|work on my|better)\s+([^.,;\n]+)/gi;

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'my',
  'me',
  'i',
  'to',
  'and',
  'or',
  'with',
  'for',
  'of',
  'in',
  'on',
  'at',
  'is',
  'it',
  'be',
  'am',
  'are',
  'was',
  'were',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'just',
  'really',
  'very',
  'so',
  'too',
  'also',
  'that',
  'this',
  'but',
  'not',
  'no',
  'yes',
  'all',
  'some',
  'more',
  'less',
  'much',
  'many',
  'lot',
  'lots',
  'bit',
  'little',
  'always',
  'never',
  'often',
  'sometimes',
  'lately',
  'recently',
  'again',
  'still',
  'been',
  'being',
  'get',
  'got',
  'getting',
  'feel',
  'feeling',
  'felt',
  'like',
  'want',
  'need',
  'help',
  'better',
  'worse',
  'good',
  'bad',
  'well',
  'hard',
  'easy',
  'try',
  'trying',
  'make',
  'making',
  'keep',
  'keeping',
  'about',
  'because',
  'when',
  'while',
  'than',
  'then',
  'there',
  'here',
  'what',
  'how',
  'why',
  'who',
  'which',
]);

function titleCasePhrase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

function isUsefulCustomGoal(value: string): boolean {
  const words = value.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) return false;
  if (value.length < 6 || value.length > 48) return false;
  const meaningful = words.filter((word) => !STOP_WORDS.has(word.replace(/[^a-z]/g, '')));
  return meaningful.length >= 2;
}

function extractCustomGoals(text: string, catalogMatches: Set<string>): string[] {
  const custom: string[] = [];
  const seen = new Set<string>();

  for (const segment of text.split(/[,;\n]+/)) {
    const trimmed = segment.trim();
    if (!trimmed || trimmed.length < 8) continue;

    const intentMatches = [...trimmed.matchAll(INTENT_PATTERN)];
    for (const match of intentMatches) {
      const phrase = titleCasePhrase(match[1] ?? '');
      const key = phrase.toLowerCase();
      if (!phrase || seen.has(key) || catalogMatches.has(phrase)) continue;
      if (!isUsefulCustomGoal(phrase)) continue;
      seen.add(key);
      custom.push(phrase);
    }
  }

  if (custom.length === 0 && text.trim().length >= 12) {
    const fallback = titleCasePhrase(
      text
        .trim()
        .replace(/^(i am|i'm|i feel|i have been|i have|i want|i need)\s+/i, '')
        .slice(0, 48),
    );
    const key = fallback.toLowerCase();
    if (
      fallback &&
      !seen.has(key) &&
      !catalogMatches.has(fallback) &&
      isUsefulCustomGoal(fallback)
    ) {
      custom.push(fallback);
    }
  }

  return custom.slice(0, 3);
}

export function extractGoalsFromText(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const catalogMatches = new Set<string>();

  for (const definition of GOAL_DEFINITIONS) {
    if (definition.patterns.some((pattern) => pattern.test(normalized))) {
      catalogMatches.add(definition.label);
    }
  }

  const customGoals = extractCustomGoals(normalized, catalogMatches);
  return [...catalogMatches, ...customGoals];
}
