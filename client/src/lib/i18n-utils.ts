/**
 * Resolve a bilingual field based on current language.
 * When lang=en, prefer nameEn; fall back to name.
 */
export function localized(
  item: { name: string; nameEn?: string },
  lang: string,
): string {
  if (lang === 'en' && item.nameEn) return item.nameEn
  return item.name
}

/** Format option label: skip "name: name" duplication for custom options. */
export function optionLabel(o: { optionName?: string; optionNameEn?: string; choiceName?: string; choiceNameEn?: string }): string {
  const opt = o.optionName || o.optionNameEn || ''
  const choice = o.choiceName || o.choiceNameEn || ''
  if (!opt || opt === choice) return choice
  return `${opt}: ${choice}`
}

export function localizedDesc(
  item: { description?: string; descriptionEn?: string },
  lang: string,
): string | undefined {
  if (lang === 'en') return item.descriptionEn || item.description
  return item.description
}
