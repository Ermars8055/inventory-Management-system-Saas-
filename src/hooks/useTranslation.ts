import { useOrgConfig } from './useOrgConfig';
import { t } from '@/i18n';

export function useTranslation() {
  const config = useOrgConfig();
  const lang = config.language || 'en';

  return {
    t: (key: string) => t(key, lang),
    lang,
  };
}
