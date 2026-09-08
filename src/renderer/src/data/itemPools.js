// Курированное (не исчерпывающее) подмножество пулов предметов — см. docs/SPEC.md §7.
//
// value   — стабильный ключ, который лежит в project.json (НЕ МЕНЯТЬ: сломает
//           уже сохранённые проекты).
// xmlName — имя пула ровно так, как его пишет игра в content/itempools.xml.
//           Регистр важен: парсер игры сравнивает имена пулов посимвольно,
//           поэтому "goldenChest" — с большой C, а "treasure" — целиком строчными.
//
// ВАЖНО: пулы НЕ являются атрибутом items.xml (раньше генератор писал туда
// Pools="TREASURE,SHOP", и игра это молча игнорировала — предмет не попадал
// ни в один пул и не мог выпасть). Пулы объявляются отдельным файлом
// content/itempools.xml — см. generator/xmlGen.js:buildItemPoolsXml.
export const ITEM_POOLS = [
  { value: 'TREASURE', xmlName: 'treasure', label: 'Сокровищница' },
  { value: 'SHOP', xmlName: 'shop', label: 'Магазин' },
  { value: 'BOSS', xmlName: 'boss', label: 'Босс' },
  { value: 'DEVIL', xmlName: 'devil', label: 'Комната дьявола' },
  { value: 'ANGEL', xmlName: 'angel', label: 'Комната ангела' },
  { value: 'SECRET', xmlName: 'secret', label: 'Секретная комната' },
  { value: 'LIBRARY', xmlName: 'library', label: 'Библиотека' },
  { value: 'CURSE', xmlName: 'curse', label: 'Комната проклятия' },
  { value: 'BATTERY', xmlName: 'batteryBum', label: 'Батарейный попрошайка' }
]

/** Пул по ключу из project.json. Регистр ключа не важен — старые проекты
 *  могли хранить "treasure" строчными (см. createPassiveItem в schema.js). */
export function getItemPool(value) {
  const key = String(value ?? '').toUpperCase()
  return ITEM_POOLS.find((p) => p.value === key) || null
}
