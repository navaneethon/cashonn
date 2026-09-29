import { useUIStore } from "@/stores/uiStore";
import { translations, type TranslationKey } from "./translations";

export function useTranslation() {
  const language = useUIStore((s) => s.language);

  const t = (key: TranslationKey): string => {
    return translations[language][key] ?? translations.en[key] ?? key;
  };

  return { t, language };
}