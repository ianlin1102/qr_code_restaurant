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

/**
 * Resolve a quickTag with embedded bilingual content using "/" separator.
 *
 * Convention: admin enters "少冰/Less Ice" — display picks per lang.
 * Backward-compat: tags without "/" return as-is (legacy mono-language tags
 * like "少冰" still render their original string regardless of lang).
 *
 * Example:
 *   localizedQuickTag("少冰/Less Ice", "en") → "Less Ice"
 *   localizedQuickTag("少冰/Less Ice", "zh") → "少冰"
 *   localizedQuickTag("少冰", "en")          → "少冰"  (no slash → fallback)
 */
export function localizedQuickTag(tag: string, lang: string): string {
  if (!tag.includes('/')) return tag
  const parts = tag.split('/').map(s => s.trim())
  if (lang === 'en' && parts[1]) return parts[1]
  return parts[0] || tag
}
