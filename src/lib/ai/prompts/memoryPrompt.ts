export function buildMemoryPrompt(userInput: string, context: Record<string, unknown> = {}): string {
  return [
    'Task: Compress recent activity into a non-diagnostic pattern summary.',
    'Rules:',
    '- Patterns only.',
    '- No medical labels.',
    '- No diagnosis.',
    '- No unnecessary sensitive details.',
    `Activity input: ${userInput}`,
    `Context: ${JSON.stringify(context)}`,
    'Output format:',
    'Pattern summary: <1-2 lines>',
    'Focus note: <non-medical focus>',
    'Footer: This does not diagnose.',
  ].join('\n');
}
