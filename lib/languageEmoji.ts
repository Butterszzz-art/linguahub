// Short badge code shown on classroom avatars. Deliberately plain 2-letter
// codes (not flag emoji) — flag emoji render as literal "ES"/"JP" letter
// pairs on Windows (no compiled flag glyphs in the system emoji font), so a
// designed letter badge is more consistent than fighting that per-OS.
const CODES: Record<string, string> = {
  Spanish: "ES",
  Japanese: "JP",
  French: "FR",
  Portuguese: "PT",
  English: "EN",
  German: "DE",
  Italian: "IT",
  Mandarin: "ZH",
  Chinese: "ZH",
  Korean: "KO",
  Russian: "RU",
  Arabic: "AR",
  Dutch: "NL",
  Greek: "EL",
  Polish: "PL",
  Swedish: "SV",
  Turkish: "TR",
  Vietnamese: "VI",
  Hindi: "HI",
};

export function languageEmoji(language: string): string {
  return CODES[language] ?? language.slice(0, 2).toUpperCase();
}
