"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDbInstance } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Language, TranslationKey, InterpolationValues } from "@/i18n/types";
import { DEFAULT_LANGUAGE } from "@/i18n/types";
import en from "@/i18n/en.json";
import it from "@/i18n/it.json";

const translations: Record<Language, typeof en> = { en, it };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, values?: InterpolationValues) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);
export { LanguageContext };

function resolve(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(str: string, values?: InterpolationValues): string {
  if (!values) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(values[name] ?? `{{${name}}}`),
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const stored = localStorage.getItem("language") as Language | null;
    return stored === "it" ? "it" : DEFAULT_LANGUAGE;
  });

  // Update HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Read preference from Firestore when user becomes available
  useEffect(() => {
    if (!user) return;

    async function loadPreference() {
      try {
        const docRef = doc(getDbInstance(), "users", user!.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.language === "it" || data.language === "en") {
            setLanguageState(data.language);
            localStorage.setItem("language", data.language);
          }
        }
      } catch {
        // Firestore read failed — keep localStorage/default value
      }
    }

    loadPreference();
  }, [user]);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      localStorage.setItem("language", lang);

      if (user) {
        const docRef = doc(getDbInstance(), "users", user.uid);
        setDoc(docRef, { language: lang, updatedAt: serverTimestamp() }, { merge: true }).catch(
          () => {},
        );
      }
    },
    [user],
  );

  const t = useCallback(
    (key: TranslationKey, values?: InterpolationValues): string => {
      // Try current language
      const result = resolve(translations[language], key);
      if (result !== undefined) return interpolate(result, values);

      // Fallback to English
      if (language !== "en") {
        const fallback = resolve(translations.en, key);
        if (fallback !== undefined) return interpolate(fallback, values);
      }

      // Ultimate fallback: return the key itself
      return key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
