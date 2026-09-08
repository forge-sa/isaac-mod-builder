// Сборка metadata.xml, content/items.xml и content/itempools.xml —
// см. docs/SPEC.md §5.1, §11.
//
// ВАЖНО ПРО РЕГИСТР АТРИБУТОВ. Парсер XML в Isaac сравнивает имена атрибутов
// посимвольно и ждёт их строчными: name/description/gfx/cache/tags/
// chargetype/maxcharges. Раньше генератор писал Name=/Gfx=/CacheFlags=/
// ChargeType= — игра молча игнорировала КАЖДЫЙ такой атрибут, предмет
// регистрировался без имени и без спрайта. Отсюда шли обе главные поломки:
//   * Isaac.GetItemIdByName в main.lua не находил предмет и возвращал -1;
//   * у предмета не было графики, и игра падала при попытке её отрисовать.
// Любое новое поле здесь добавлять ТОЛЬКО строчными.

import { ITEMS_XML_GFX_ROOT, spriteGfxRef } from './spriteSpecs.js'
import { getItemPool } from '../data/itemPools.js'
import { getItemTag } from '../data/itemTags.js'
import { getStat } from '../data/cacheFlags.js'

export function buildMetadataXml(project) {
  const { modName, description } = project.meta

  // Состав элементов строго по формату игры. Элемента <tags> в metadata.xml
  // не существует — раньше он сюда писался и был мусором в файле.
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<metadata>',
    `\t<name>${xmlEscape(modName)}</name>`,
    `\t<directory>${xmlEscape(project.meta.modId)}</directory>`,
    `\t<description>${xmlEscape(description || '')}</description>`,
    '\t<version>1.0</version>',
    '\t<visibility>Public</visibility>',
    '</metadata>',
    ''
  ].join('\n')
}

export function buildItemsXml(project) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<items gfxroot="${ITEMS_XML_GFX_ROOT}" version="1">`
  ]

  for (const item of project.items) {
    const tag = item.kind === 'active' ? 'active' : 'passive'
    // Атрибут id намеренно НЕ пишем: игра назначает числовой ID сама при
    // загрузке items.xml, а Lua получает его через Isaac.GetItemIdByName.
    // Пустое id="" раньше писалось всегда и является невалидным значением.
    const attrs = {
      name: item.name,
      description: item.description || '',
      gfx: gfxRefFor(project, item.iconSpriteId),
      cache: cacheAttr(item.statChanges),
      tags: tagsAttr(item.itemTags)
    }
    if (item.kind === 'active' && item.active) {
      attrs.chargetype = item.active.chargeType || 'normal'
      attrs.maxcharges = String(item.active.maxCharges ?? 3)
    }
    lines.push(buildSelfClosingTag(tag, attrs, 1))
  }

  for (const trinket of project.trinkets) {
    lines.push(
      buildSelfClosingTag(
        'trinket',
        {
          name: trinket.name,
          description: trinket.description || '',
          gfx: gfxRefFor(project, trinket.iconSpriteId),
          cache: cacheAttr(trinket.statChanges)
        },
        1
      )
    )
  }

  lines.push('</items>')
  lines.push('')
  return lines.join('\n')
}

/**
 * content/itempools.xml — единственный способ положить предмет в пул.
 * Возвращает null, если ни у одного предмета не выбран ни один пул: пустой
 * файл игре отдавать не нужно (и он же — лишний повод для warning в логе).
 *
 * Трюки (trinkets) в пулах не участвуют — у них своя механика выпадения,
 * поэтому здесь только project.items.
 */
export function buildItemPoolsXml(project) {
  const byPool = new Map()

  for (const item of project.items) {
    if (!item.name?.trim()) continue
    for (const rawPool of item.pools || []) {
      const pool = getItemPool(rawPool)
      if (!pool) continue
      if (!byPool.has(pool.xmlName)) byPool.set(pool.xmlName, new Set())
      // Set, а не массив: в старых project.json один и тот же пул мог лежать
      // дважды под разными ключами ("treasure" и "TREASURE"), а два одинаковых
      // <Item> в одном <Pool> удваивают шанс выпадения предмета.
      byPool.get(pool.xmlName).add(item)
    }
  }

  if (byPool.size === 0) return null

  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<ItemPools>']
  for (const [poolName, items] of byPool) {
    lines.push(`\t<Pool Name="${xmlEscape(poolName)}">`)
    for (const item of items) {
      // Weight/DecreaseBy/RemoveOn — значения по умолчанию, как у большинства
      // ванильных предметов: обычный шанс, предмет исчезает из пула после выпадения.
      lines.push(
        `\t\t<Item Name="${xmlEscape(item.name)}" Weight="1" DecreaseBy="1" RemoveOn="0.1" />`
      )
    }
    lines.push('\t</Pool>')
  }
  lines.push('</ItemPools>')
  lines.push('')
  return lines.join('\n')
}

/** cache="damage firedelay" — имена статов через ПРОБЕЛ, не через запятую:
 *  запятая ломает разбор всего атрибута и стат просто не применяется. */
function cacheAttr(statChanges) {
  const names = []
  for (const sc of statChanges || []) {
    const stat = getStat(sc.stat)
    if (stat && !names.includes(stat.value)) names.push(stat.value)
  }
  return names.join(' ')
}

/** tags="offensive food" — тоже через пробел и строчными. */
function tagsAttr(itemTags) {
  const names = []
  for (const raw of itemTags || []) {
    const tag = getItemTag(raw)
    if (tag && !names.includes(tag.xmlName)) names.push(tag.xmlName)
  }
  return names.join(' ')
}

function gfxRefFor(project, spriteId) {
  const sprite = project.resources.sprites.find((s) => s.id === spriteId)
  return sprite ? spriteGfxRef(sprite) : ''
}

function buildSelfClosingTag(tag, attrs, indentLevel) {
  const indent = '\t'.repeat(indentLevel)
  const attrString = Object.entries(attrs)
    // Пустые атрибуты не пишем вовсе: для игры отсутствие атрибута — это
    // "значение по умолчанию", а пустая строка местами разбирается как
    // осмысленное пустое значение (например пустой gfx="" = нет спрайта).
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .map(([key, value]) => `${key}="${xmlEscape(String(value))}"`)
    .join(' ')
  return `${indent}<${tag} ${attrString} />`
}

export function xmlEscape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
