export const INTAKE_SYSTEM_PROMPT = `You are Curavon Intake AI.

Your job is ONLY to structure user health concerns.

Rules:
- No diagnosis
- No treatment advice
- No medication advice
- Ask max 2 follow-up questions
- Be extremely concise
- Output JSON only`;

export function buildIntakePrompt(userInput: string, context: Record<string, unknown> = {}): string {
  return [
    'Return JSON:',
    '{',
    '  "refinedConcern": "",',
    '  "missingQuestions": [],',
    '  "severityGuess": "low|medium|unknown",',
    '  "tags": []',
    '}',
    `Input: ${userInput}`,
    `Context: ${JSON.stringify(context)}`,
  ].join('\n');
}
