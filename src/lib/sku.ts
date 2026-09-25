/**
 * SKU utilities — normalization and sequential incrementing.
 * Auto-generation is handled server-side via GET /inventory/next-sku.
 */

/**
 * Normalize a SKU string: uppercase, only A-Z 0-9 and hyphens,
 * no double-hyphens, no leading/trailing hyphens.
 *
 * Example: "uni sh 001" → "UNI-SH-001"
 */
export function normalizeSku(sku: string): string {
  return sku
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Increment the trailing numeric segment of a sequential SKU.
 *
 * Example: "STP-2026-001" → "STP-2026-002"
 *          "STP-2026-009" → "STP-2026-010"
 */
export function incrementSku(sku: string): string {
  const parts = sku.split('-');
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) {
    parts[parts.length - 1] = String(parseInt(last) + 1).padStart(last.length, '0');
    return parts.join('-');
  }
  return sku;
}
