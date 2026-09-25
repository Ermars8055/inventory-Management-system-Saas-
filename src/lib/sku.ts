/**
 * SKU utilities — auto-generation and normalization.
 */

/**
 * Generate a SKU from a product name and optional variant label.
 *
 * Examples:
 *   generateSku("Uniform Shirt")              → "UNI-SHI-342"
 *   generateSku("Uniform Shirt", "Size 32")   → "UNI-SHI-SIZE32"
 *   generateSku("Paracetamol", "500mg")        → "PAR-500MG"
 *   generateSku("School Book", "Grade 5")      → "SCH-BOO-GRADE5"
 */
export function generateSku(name: string, variantLabel?: string): string {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const words = name.trim().split(/\s+/).filter(Boolean);

  const part1 = clean(words[0] ?? '').slice(0, 3) || 'ITM';
  const part2 = words[1] ? clean(words[1]).slice(0, 3) : '';
  const base = part2 ? `${part1}-${part2}` : part1;

  if (variantLabel) {
    const labelPart = clean(variantLabel).slice(0, 6) || 'VAR';
    return `${base}-${labelPart}`;
  }

  // Standalone: 3-digit random suffix for uniqueness
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `${base}-${suffix}`;
}

/**
 * Normalize a SKU string: uppercase, only A-Z 0-9 and hyphens,
 * no double-hyphens, no leading/trailing hyphens.
 */
export function normalizeSku(sku: string): string {
  return sku
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}
