import type { FormInsightProductContext } from '../../form-insights/formInsightContextTypes';
import { enrichNigerianHealthLanguageNormalization } from '../../form-insights/formInsightContextService';
import { resolveFormInsightContext } from '../../form-insights/runtime/productContextProvider';
import type { HealthModuleId } from '../modules/moduleIds';
import { maskBlockedPhraseRegions } from '../nigeria/blockers';
import { NIGERIAN_HEALTH_PHRASES, type PhraseMatch } from '../nigeria/healthPhrases';

export type NigerianHealthLanguageNormalization = {
  normalizedTerms: Record<string, string>;
  moduleHints: HealthModuleId[];
  riskCheckNeeded: boolean;
  tags: string[];
};

export type NormalizeNigerianHealthLanguageOptions = {
  formInsightContext?: FormInsightProductContext;
};

type SourceEntry = {
  source: string;
  definition: (typeof NIGERIAN_HEALTH_PHRASES)[number];
};

function normalizeInput(value: string): string {
  return value.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
}

function buildSourceIndex(): SourceEntry[] {
  const entries: SourceEntry[] = [];
  for (const definition of NIGERIAN_HEALTH_PHRASES) {
    for (const source of definition.sources) {
      entries.push({ source: normalizeInput(source), definition });
    }
  }
  return entries.sort((a, b) => b.source.length - a.source.length);
}

const SOURCE_INDEX = buildSourceIndex();

function findNonOverlappingMatches(maskedText: string): PhraseMatch[] {
  const matches: PhraseMatch[] = [];
  const occupied: Array<{ start: number; end: number }> = [];

  const overlaps = (start: number, end: number) =>
    occupied.some((span) => start < span.end && end > span.start);

  for (const { source, definition } of SOURCE_INDEX) {
    if (!source) continue;
    let index = maskedText.indexOf(source);
    while (index >= 0) {
      const end = index + source.length;
      const region = maskedText.slice(index, end);
      if (!region.trim() || /\S/.test(region) === false) {
        index = maskedText.indexOf(source, index + 1);
        continue;
      }
      if (!overlaps(index, end)) {
        matches.push({
          phraseId: definition.id,
          matchedSource: source,
          definition,
          start: index,
          end,
        });
        occupied.push({ start: index, end });
      }
      index = maskedText.indexOf(source, index + 1);
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

function uniqueModuleHints(matches: PhraseMatch[]): HealthModuleId[] {
  const seen = new Set<HealthModuleId>();
  const ordered: HealthModuleId[] = [];
  for (const match of matches) {
    for (const moduleId of match.definition.moduleHints) {
      if (!seen.has(moduleId)) {
        seen.add(moduleId);
        ordered.push(moduleId);
      }
    }
  }
  return ordered;
}

function uniqueTags(matches: PhraseMatch[]): string[] {
  const tags = new Set<string>();
  for (const match of matches) {
    for (const tag of match.definition.tags) {
      tags.add(tag);
    }
  }
  return [...tags].sort();
}

/** Deterministic Nigerian English / Pidgin health phrase normalization. No AI. */
export function normalizeNigerianHealthLanguage(
  input: string,
  options: NormalizeNigerianHealthLanguageOptions = {},
): NigerianHealthLanguageNormalization {
  const normalized = normalizeInput(input);
  const masked = maskBlockedPhraseRegions(normalized);
  const matches = findNonOverlappingMatches(masked);

  const normalizedTerms: Record<string, string> = {};
  for (const match of matches) {
    normalizedTerms[match.matchedSource] = match.definition.normalizedTerm;
  }

  const base = {
    normalizedTerms,
    moduleHints: uniqueModuleHints(matches),
    riskCheckNeeded: matches.some((match) => match.definition.riskCheckNeeded),
    tags: uniqueTags(matches),
  };

  const context = resolveFormInsightContext(options.formInsightContext);
  if (context.routingTriggers.length === 0) {
    return base;
  }

  return enrichNigerianHealthLanguageNormalization(input, base, context);
}
