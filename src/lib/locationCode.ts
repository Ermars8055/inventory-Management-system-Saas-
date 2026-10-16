/**
 * Smart Location Code Generator
 * Converts human-friendly room and storage names into standardized uppercase codes.
 * Examples:
 *   "Chemistry Lab"             -> "CHEM-LAB-01"
 *   "Main Store - Rack U1"      -> "MS-RU1-01"
 *   "Auditorium"                -> "AUD-01"
 *   "Room 204B"                 -> "RM-204B-01"
 *   "Cold Storage Deep Freeze"  -> "CSDF-01"
 */

const COMMON_ABBREVIATIONS: Record<string, string> = {
  laboratory: 'LAB',
  laboratories: 'LAB',
  lab: 'LAB',
  labs: 'LAB',
  store: 'STR',
  stores: 'STR',
  storeroom: 'STR',
  storage: 'STR',
  warehouse: 'WH',
  room: 'RM',
  rooms: 'RM',
  shelf: 'SHF',
  shelves: 'SHF',
  rack: 'RCK',
  racks: 'RCK',
  library: 'LIB',
  office: 'OFC',
  cabinet: 'CAB',
  chemistry: 'CHEM',
  physics: 'PHY',
  biology: 'BIO',
  computer: 'COMP',
  medical: 'MED',
  medicine: 'MED',
  medicines: 'MED',
  pharmacy: 'PHAR',
  reception: 'RCP',
  auditorium: 'AUD',
  auditoria: 'AUD',
  block: 'BLK',
  wing: 'WNG',
  hall: 'HLL',
  center: 'CTR',
  centre: 'CTR',
  department: 'DEPT',
  dispensary: 'DISP',
  inventory: 'INV',
  supply: 'SPLY',
  supplies: 'SPLY',
};

const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'at', 'to', 'by', 'on', 'with', 'from']);

/**
 * Generate a smart, concise, alphanumeric location code from a location name.
 * Checks against existing codes in the organization to ensure uniqueness.
 */
export function generateLocationCode(name: string, existingCodes: string[] = []): string {
  if (!name || !name.trim()) return '';

  // 1. Clean and tokenize
  // Split on spaces, dashes, slashes, underscores, and commas
  const rawTokens = name
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s\-_/,]+/)
    .filter(Boolean);

  if (rawTokens.length === 0) return 'LOC-01';

  // 2. Filter out stop words unless that's all we have
  const meaningfulTokens = rawTokens.filter(t => !STOP_WORDS.has(t.toLowerCase()));
  const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

  let base = '';

  if (tokens.length === 1) {
    // Single word: e.g. "Auditorium" -> "AUD" or abbreviation
    const lower = tokens[0].toLowerCase();
    if (COMMON_ABBREVIATIONS[lower]) {
      base = COMMON_ABBREVIATIONS[lower];
    } else if (tokens[0].length <= 4) {
      base = tokens[0].toUpperCase();
    } else {
      base = tokens[0].substring(0, 4).toUpperCase();
    }
  } else if (tokens.length === 2) {
    // Two words: e.g. "Chemistry Lab" -> "CHEM-LAB", "Room 101" -> "RM-101"
    const part1 = formatToken(tokens[0]);
    const part2 = formatToken(tokens[1]);
    base = `${part1}-${part2}`;
  } else {
    // 3 or more words: e.g. "Main Store - Rack U1" -> "MS-RU1", "Cold Storage Deep Freeze" -> "CSDF"
    // Check if the last token is a number or alphanumeric rack/shelf label (e.g. "U1", "101", "B2")
    const last = tokens[tokens.length - 1];
    const isAlphanumericCode = /\d/.test(last) || last.length <= 3;

    if (isAlphanumericCode) {
      // Initials of prior words + full last token
      const priorInitials = tokens
        .slice(0, tokens.length - 1)
        .map(t => {
          const lower = t.toLowerCase();
          return COMMON_ABBREVIATIONS[lower] ? COMMON_ABBREVIATIONS[lower][0] : t[0].toUpperCase();
        })
        .join('');
      base = `${priorInitials}-${last.toUpperCase()}`;
    } else {
      // Acronym of all words
      base = tokens.map(t => t[0].toUpperCase()).join('');
    }
  }

  // Fallback sanity check on base
  base = base.replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!base) base = 'LOC';

  // 3. Find unique suffix number (e.g. -01, -02, etc.)
  const upperExisting = new Set(existingCodes.map(c => (c || '').toUpperCase().trim()));

  // Pattern to match BASE-01 or BASE-1
  const regex = new RegExp(`^${escapeRegex(base)}-(\\d+)$`);
  let maxNum = 0;
  let hasExactBaseWithNumber = false;

  for (const code of upperExisting) {
    const match = code.match(regex);
    if (match) {
      hasExactBaseWithNumber = true;
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  // Next sequential number
  const nextNum = maxNum + 1;
  const suffix = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;

  // If BASE-01 already in use (or matched prefix), append incremented suffix
  let candidate = `${base}-${suffix}`;

  // Extra safety: keep incrementing if candidate collision
  let counter = nextNum;
  while (upperExisting.has(candidate)) {
    counter++;
    const s = counter < 10 ? `0${counter}` : `${counter}`;
    candidate = `${base}-${s}`;
  }

  return candidate;
}

function formatToken(token: string): string {
  const lower = token.toLowerCase();
  if (COMMON_ABBREVIATIONS[lower]) {
    return COMMON_ABBREVIATIONS[lower];
  }
  if (token.length <= 4) {
    return token.toUpperCase();
  }
  return token.substring(0, 4).toUpperCase();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
