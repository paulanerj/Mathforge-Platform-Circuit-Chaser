/**
 * MathForge — Answer Order Normalization
 * Presents answer options in a consistent, predictable order.
 */

const USE_SORTED_OPTIONS = true;

/**
 * detective detection for boolean logic problems
 */
function isBooleanSet(options: any[]): boolean {
  return options.includes(true) || options.includes(false) || 
         options.some(o => typeof o === 'string' && (o.toLowerCase() === 'true' || o.toLowerCase() === 'false'));
}

/**
 * Normalizes answer options based on type and value.
 * Row 1: left -> right
 * Row 2: left -> right
 * 
 * @param options Array of raw answer options
 * @returns Sorted or normalized array of options
 */
export function normalizeOptions(options: any[]): any[] {
  if (!USE_SORTED_OPTIONS || !options || options.length === 0) {
    return options;
  }

  // Handle True/False special case
  if (isBooleanSet(options)) {
    // TRUE must always be LEFT, FALSE must always be RIGHT
    const result = [];
    if (options.some(o => o === true || (typeof o === 'string' && o.toLowerCase() === 'true'))) {
      result.push(true);
    }
    if (options.some(o => o === false || (typeof o === 'string' && o.toLowerCase() === 'false'))) {
      result.push(false);
    }
    
    // Fallback if somehow they aren't explicit booleans but boolean-like
    if (result.length === 0) return [...options].sort();
    return result;
  }

  // Default: Numeric sort (Smallest -> Largest)
  return [...options].sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    
    if (isNaN(numA) || isNaN(numB)) {
      return String(a).localeCompare(String(b));
    }
    
    return numA - numB;
  });
}
