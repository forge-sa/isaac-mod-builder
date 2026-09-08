// Курированное подмножество ItemConfig.Tags — см. docs/SPEC.md §7.
//
// value   — стабильный ключ в project.json (НЕ МЕНЯТЬ).
// xmlName — имя тега ровно так, как его ждёт парсер items.xml: строчными,
//           и в атрибуте tags="..." они разделяются ПРОБЕЛАМИ, не запятыми.
//
// Список намеренно содержит только теги, которые реально существуют в игре.
// Раньше здесь были SPECIAL и STAT_UP — таких тегов в Isaac нет, игра писала
// на них warning в log.txt и игнорировала весь атрибут целиком.
export const ITEM_TAGS = [
  { value: 'OFFENSIVE', xmlName: 'offensive', label: 'Наступательный' },
  { value: 'FOOD', xmlName: 'food', label: 'Еда' },
  { value: 'SUMMONABLE', xmlName: 'summonable', label: 'Можно призвать (Ящик Пандоры и т.п.)' },
  { value: 'SYRINGE', xmlName: 'syringe', label: 'Шприц' },
  { value: 'TEARS_UP', xmlName: 'tearsup', label: 'Усиление слёз' },
  { value: 'BOOK', xmlName: 'book', label: 'Книга' },
  { value: 'BATTERY', xmlName: 'battery', label: 'Батарейка' },
  { value: 'ANGEL', xmlName: 'angel', label: 'Ангельский' },
  { value: 'DEVIL', xmlName: 'devil', label: 'Дьявольский' }
]

/** Совместимость со старыми project.json: теги, которые раньше предлагал UI,
 *  но которых нет в игре. Ближайший валидный аналог или null (тег выбрасывается,
 *  чтобы не ломать весь атрибут tags). */
const LEGACY_TAG_ALIASES = {
  STAT_UP: 'TEARS_UP',
  SPECIAL: null
}

export function getItemTag(value) {
  const key = String(value ?? '').toUpperCase()
  const resolved = key in LEGACY_TAG_ALIASES ? LEGACY_TAG_ALIASES[key] : key
  if (!resolved) return null
  return ITEM_TAGS.find((t) => t.value === resolved) || null
}
