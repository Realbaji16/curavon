export function buildPlanPrompt(userInput: string, context: Record<string, unknown> = {}): string {
  return [
    'Task: compress a plan explanation into one concise neutral sentence.',
    'Rules: no diagnosis, no treatment plan, no medication advice.',
    'Output JSON only:',
    '{ "refinedConcern": "", "missingQuestions": [], "severityGuess": "unknown", "tags": [] }',
    `Input: ${userInput}`,
    `Context: ${JSON.stringify(context)}`,
  ].join('\n');
}
