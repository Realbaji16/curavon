export function buildSummaryPrompt(userInput: string, context: Record<string, unknown> = {}): string {
  return [
    'Task: compress notes for doctor summary readability only.',
    'Rules: no diagnosis, no interpretation certainty, no treatment recommendation.',
    'Output JSON only:',
    '{ "refinedConcern": "", "missingQuestions": [], "severityGuess": "unknown", "tags": [] }',
    `Input: ${userInput}`,
    `Context: ${JSON.stringify(context)}`,
  ].join('\n');
}
