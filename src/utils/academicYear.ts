/**
 * Generates academic year options in YYYY-YY format.
 * Range: 2 years before current to 3 years ahead.
 * e.g. ["2024-25", "2025-26", "2026-27", "2027-28", "2028-29"]
 */
export function getAcademicYearOptions(): string[] {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current - 2; y <= current + 3; y++) {
    years.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  return years;
}
