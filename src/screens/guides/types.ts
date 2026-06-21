export type FilterId = 'all' | 'flows' | 'mind' | 'symptoms' | 'doctor-prep' | 'basics';

export type ViewMode =
  | 'browse'
  | 'flowDetail'
  | 'flowRunner'
  | 'flowResult'
  | 'flowSafetyTerminal'
  | 'guideDetail';

export const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'flows', label: 'Flows' },
  { id: 'mind', label: 'Mind' },
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'doctor-prep', label: 'Doctor Prep' },
  { id: 'basics', label: 'Basics' },
];

export function includesSearch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}
