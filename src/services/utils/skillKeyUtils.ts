export function normalizeSkillKey(input: any): string {
  if (!input) return '';

  if (typeof input === 'string') {
    return input;
  }

  if (typeof input === 'object' && typeof input.skillKey === 'string') {
    return input.skillKey;
  }

  console.warn('[SkillKey] Invalid input:', input);
  return '';
}

export function isValidSkillKey(skillKey: string): boolean {
  if (!skillKey) return false;

  if (skillKey.startsWith('multiplication.table')) {
    const parts = skillKey.split('.');
    if (parts.length >= 3) {
      const table = parseInt(parts[2], 10);
      return table >= 2 && table <= 12;
    }
  }

  if (skillKey.startsWith('skipcount.step')) {
    const parts = skillKey.split('.');
    const step = parseInt(parts.pop() || '0', 10);
    return step >= 2 && step <= 12;
  }

  return true;
}
