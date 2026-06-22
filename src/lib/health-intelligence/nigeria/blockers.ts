/**
 * Masks negated or historical phrases before Nigerian health phrase matching
 * to reduce false positives (mirrors red-flag negation patterns, phrase-specific).
 */

const SAFE_NEGATED_PHRASES = [
  'no body hot',
  'not body hot',
  'no hot body',
  'not hot body',
  'no belle pain',
  'not belle pain',
  'no stooling',
  'not stooling',
  'no catarrh',
  'not catarrh',
  'no headache',
  'not headache',
  'head not banging',
  'head is not banging',
  'head no dey bang',
  'not pregnant',
  'not pregnant and bleeding',
  'no bleeding',
  'not bleeding',
  'no fever',
  'no temperature',
  'bp is fine',
  'bp not disturbing',
  'not itching',
  'no itching',
  'did not take',
  "didn't take",
  'have not taken',
  'no change is good',
] as const;

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Replace blocked phrase spans with spaces so substring matchers skip them. */
export function maskBlockedPhraseRegions(text: string): string {
  let masked = normalizeForMatch(text);
  for (const phrase of SAFE_NEGATED_PHRASES) {
    const normalizedPhrase = normalizeForMatch(phrase);
    let index = masked.indexOf(normalizedPhrase);
    while (index >= 0) {
      masked = `${masked.slice(0, index)}${' '.repeat(normalizedPhrase.length)}${masked.slice(index + normalizedPhrase.length)}`;
      index = masked.indexOf(normalizedPhrase, index + normalizedPhrase.length);
    }
  }
  return masked;
}
