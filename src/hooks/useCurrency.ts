import { useOrgConfig } from './useOrgConfig';

export function useCurrency() {
  const config = useOrgConfig();
  const symbol = config.currencySymbol || '₹';

  function format(amount: number): string {
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }

  return { symbol, code: config.currencyCode || 'INR', format };
}
