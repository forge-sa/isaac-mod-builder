// Сборка main.lua из модели проекта — см. docs/SPEC.md §5.2–§5.4.
// Чистая функция: buildMainLua(project) -> { code, sourceMap }.
// Один и тот же project.json всегда даёт один и тот же текст.

import { LuaWriter } from './sourceMap.js'
import { getCallback } from '../data/callbacks.js'
import { getCondition } from '../data/conditions.js'
import { getAction } from '../data/actions.js'
import { getStat } from '../data/cacheFlags.js'
import { compileCondition } from './conditionGen.js'
import { compileAction } from './actionGen.js'

export function buildMainLua(project) {
  const w = new LuaWriter()
  const modVar = 'mod'

  w.raw('-- Файл сгенерирован Isaac Mod Builder. НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ —')
  w.raw('-- правки делаются в приложении, иначе они потеряются при пересборке.')
  w.raw(`-- Проект: ${luaComment(project.meta.modName)} (${luaComment(project.meta.modId)})`)
  w.blank()
  w.raw(`local ${modVar} = RegisterMod("${luaEscape(project.meta.modName)}", 1)`)
  w.blank()

  emitRuntimeHelpers(w, project)

  const itemVarFor = buildItemRegistry(w, project)

  const groups = groupRules(project)

  for (const group of groups) {
    emitCallbackGroup(w, modVar, group, itemVarFor)
  }

  emitStatChanges(w, project, itemVarFor)

  return { code: w.toString(), sourceMap: w.map }
}

// ---------------------------------------------------------------------------
// Реестр числовых ID предметов/трюков
// ---------------------------------------------------------------------------

function buildItemRegistry(w, project) {
  const hasAny = project.items.length > 0 || project.trinkets.length > 0
  if (hasAny) {
    w.raw('-- ID назначаются самой игрой при загрузке items.xml; здесь мы их')
    w.raw('-- просто читаем по имени, а не храним числа руками (см. docs/SPEC.md).')
    w.raw('local ItemId = {}')
    for (const item of project.items) {
      w.raw(`ItemId.${safeIdent(item.id)} = Isaac.GetItemIdByName("${luaEscape(item.name)}")`)
    }
    for (const trinket of project.trinkets) {
      w.raw(
        `ItemId.${safeIdent(trinket.id)} = Isaac.GetTrinketIdByName("${luaEscape(trinket.name)}")`
      )
    }
    w.blank()

    // Если items.xml не разобрался (опечатка в имени, битый файл), тут будет -1.
    // Раньше это уезжало прямо в player:HasCollectible(-1) — а это обращение
    // за границу таблицы предметов игры, то есть падение, а не Lua-ошибка.
    // Теперь причина видна в log.txt отдельной строкой сразу при загрузке мода.
    for (const owner of [...project.items, ...project.trinkets]) {
      const ref = `ItemId.${safeIdent(owner.id)}`
      w.raw(
        `if ${ref} == nil or ${ref} <= 0 then Isaac.DebugString(LOG_PREFIX .. ` +
          `"ОШИБКА: не найден в content/items.xml: ${luaEscape(owner.name)} — правила отключены") end`
      )
    }
    w.blank()
  }
  return (id) => `ItemId.${safeIdent(id)}`
}

// ---------------------------------------------------------------------------
// Рантайм-хелперы (см. docs/SPEC.md §5.2)
// ---------------------------------------------------------------------------

/**
 * Общий для всего мода префикс кода. Две задачи:
 *  1. hasItem/hasTrinket — единственное место, где проверяется валидность
 *     числового ID предмета. Isaac.GetItemIdByName возвращает -1 для
 *     ненайденного предмета, а player:HasCollectible(-1) роняет игру.
 *     Все сгенерированные проверки идут только через эти функции.
 *  2. LOG_PREFIX — по нему панель "Установить и запустить" узнаёт строки
 *     нашего мода в общем log.txt игры.
 */
function emitRuntimeHelpers(w, project) {
  w.raw(`local LOG_PREFIX = "[IMB:${luaEscape(project.meta.modId)}] "`)
  w.raw('Isaac.DebugString(LOG_PREFIX .. "мод загружен")')
  w.blank()
  w.raw('-- Isaac.GetItemIdByName возвращает -1, если предмета нет в items.xml.')
  w.raw('-- Обращение к предмету с таким id роняет игру, поэтому проверяем.')
  w.raw('local function hasItem(player, itemId)')
  w.indent()
  w.raw('if player == nil or type(itemId) ~= "number" or itemId <= 0 then return false end')
  w.raw('return player:HasCollectible(itemId)')
  w.dedent()
  w.raw('end')
  w.blank()
  w.raw('local function hasTrinket(player, trinketId)')
  w.indent()
  w.raw('if player == nil or type(trinketId) ~= "number" or trinketId <= 0 then return false end')
  w.raw('return player:HasTrinket(trinketId)')
  w.dedent()
  w.raw('end')
  w.blank()
}

// ---------------------------------------------------------------------------
// Группировка правил по колбэкам (см. docs/SPEC.md §5.2)
// ---------------------------------------------------------------------------

function groupRules(project) {
  const owningItemsByRuleId = new Map()
  for (const item of [...project.items, ...project.trinkets]) {
    for (const ruleId of item.ruleIds || []) {
      if (!owningItemsByRuleId.has(ruleId)) owningItemsByRuleId.set(ruleId, [])
      owningItemsByRuleId.get(ruleId).push(item)
    }
  }

  const groupsByKey = new Map()
  for (const rule of project.rules) {
    if (!rule.when?.type) continue
    const callback = getCallback(rule.when.type)
    if (!callback) continue

    if (callback.requiresItemContext) {
      // MC_USE_ITEM и подобные обязаны регистрироваться отдельно на каждый
      // предмет (иначе сработают на использование ЛЮБОГО активного предмета).
      const owners = owningItemsByRuleId.get(rule.id) || []
      const owner = owners[0]
      if (!owner) continue // должно быть отловлено validateProject
      const key = `${rule.when.type}::${owner.id}`
      if (!groupsByKey.has(key)) {
        groupsByKey.set(key, { callback, itemFilter: owner.id, rules: [] })
      }
      groupsByKey.get(key).rules.push(rule)
    } else {
      const key = rule.when.type
      if (!groupsByKey.has(key)) {
        groupsByKey.set(key, { callback, itemFilter: null, rules: [] })
      }
      groupsByKey.get(key).rules.push(rule)
    }
  }

  return [...groupsByKey.values()]
}

function emitCallbackGroup(w, modVar, group, itemVarFor) {
  const { callback, itemFilter, rules } = group
  const handlerArgs = ['_', ...callback.signature.args].join(', ')

  // Колбэк с фильтром по предмету регистрируем, только если игра реально
  // выдала предмету ID. AddCallback(..., -1) вешает обработчик на
  // несуществующий предмет — игра падает при первой же попытке его сматчить.
  const filterRef = itemFilter ? itemVarFor(itemFilter) : null
  if (filterRef) {
    w.raw(`if ${filterRef} ~= nil and ${filterRef} > 0 then`)
    w.indent()
  }

  w.raw(`${modVar}:AddCallback(${callback.luaConstant}, function(${handlerArgs})`)
  w.indent()

  // Игрока всегда кладём в локальную переменную. Раньше playerExpr
  // подставлялся в код как выражение, и, например, target:ToPlayer() из
  // MC_ENTITY_TAKE_DMG вычислялся заново в каждом условии и каждом действии —
  // до пяти раз на одно попадание, на каждом кадре урона.
  const rawPlayerExpr = callback.signature.playerExpr
  if (rawPlayerExpr === null) {
    w.raw('local player = Isaac.GetPlayer(0)')
  } else if (rawPlayerExpr !== 'player') {
    w.raw(`local player = ${rawPlayerExpr}`)
  }

  const ctx = {
    playerExpr: 'player',
    targetExpr: callback.signature.targetExpr ?? 'player',
    itemVarFor
  }

  for (const rule of rules) {
    emitRule(w, rule, ctx)
  }

  // MC_USE_ITEM обязан вернуть true, иначе игра не проигрывает анимацию
  // использования предмета и не тратит заряд ожидаемым образом.
  if (callback.returnsTrue) w.raw('return true')

  w.dedent()
  w.raw(filterRef ? `end, ${filterRef})` : 'end)')

  if (filterRef) {
    w.dedent()
    w.raw('end')
  }
  w.blank()
}

function emitRule(w, rule, ctx) {
  w.enter(rule.id, rule.name)
  w.raw(`-- Правило: ${luaComment(rule.name)}`)
  w.raw('do')
  w.indent()

  let openIfs = 0
  for (const condition of rule.conditions) {
    const meta = getCondition(condition.type)
    w.enter(condition.id, describeCondition(meta, condition))
    const expr = compileCondition(condition, ctx)
    w.raw(`if ${expr} then`)
    w.indent()
    openIfs += 1
    w.leave()
  }

  for (const action of rule.actions) {
    const meta = getAction(action.type)
    w.enter(action.id, describeAction(meta, action))
    const lines = compileAction(action, ctx)
    for (const line of lines) w.raw(line)
    w.leave()
  }

  for (let i = 0; i < openIfs; i += 1) {
    w.dedent()
    w.raw('end')
  }

  w.dedent()
  w.raw('end')
  w.leave()
}

// ---------------------------------------------------------------------------
// Статы через MC_EVALUATE_CACHE (см. docs/SPEC.md §5.3)
// ---------------------------------------------------------------------------

function emitStatChanges(w, project, itemVarFor) {
  const entries = []
  for (const item of project.items) {
    for (const sc of item.statChanges || []) {
      const stat = getStat(sc.stat)
      if (stat) entries.push({ owner: item, sc, stat, hasFn: 'hasItem' })
    }
  }
  for (const trinket of project.trinkets) {
    for (const sc of trinket.statChanges || []) {
      const stat = getStat(sc.stat)
      if (stat) entries.push({ owner: trinket, sc, stat, hasFn: 'hasTrinket' })
    }
  }
  if (entries.length === 0) return

  const byFlag = new Map()
  for (const entry of entries) {
    if (!byFlag.has(entry.stat.cacheFlag)) byFlag.set(entry.stat.cacheFlag, [])
    byFlag.get(entry.stat.cacheFlag).push(entry)
  }

  w.raw('mod:AddCallback(ModCallbacks.MC_EVALUATE_CACHE, function(_, player, cacheFlag)')
  w.indent()
  // Намеренно не передаём третьим аргументом фильтр CacheFlag: нужно
  // несколько разных флагов в одном обработчике, а AddCallback фильтрует
  // только по одному значению — поэтому фильтруем сами через if/elseif.
  for (const [flag, group] of byFlag) {
    w.raw(`if cacheFlag == ${flag} then`)
    w.indent()
    for (const { owner, sc, stat, hasFn } of group) {
      w.enter(owner.id, `Стат "${stat.label}" предмета "${owner.name}"`)
      const itemRef = itemVarFor(owner.id)
      w.raw(`if ${hasFn}(player, ${itemRef}) then`)
      w.indent()
      w.raw(compileStatAssignment(stat, sc))
      w.dedent()
      w.raw('end')
      w.leave()
    }
    w.dedent()
    w.raw('end')
  }
  w.dedent()
  w.raw('end)')
  w.blank()
}

function compileStatAssignment(stat, statChange) {
  const field = `player.${stat.playerField}`
  const value = Number(statChange.value) || 0
  switch (statChange.op) {
    case 'multiply':
      return `${field} = ${field} * ${value}`
    case 'set':
      return `${field} = ${value}`
    case 'add':
    default:
      return `${field} = ${field} + ${value}`
  }
}

// ---------------------------------------------------------------------------
// Человекочитаемые подписи для source map
// ---------------------------------------------------------------------------

function describeCondition(meta, condition) {
  if (!meta) return condition.type
  if (condition.type === 'chance') return `${meta.label} ${condition.params.percent ?? 25}%`
  return meta.label
}

function describeAction(meta, action) {
  if (!meta) return action.type
  return meta.label
}

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------

export function safeIdent(id) {
  return String(id).replace(/[^a-zA-Z0-9_]/g, '_')
}

export function luaEscape(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    // Перевод строки внутри "..." — синтаксическая ошибка Lua: мод просто не
    // загрузится. Имя мода/предмета приходит из свободного поля ввода.
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
}

/** Текст, безопасный для вставки в Lua-комментарий "-- ...": всё в одну строку. */
export function luaComment(str) {
  return String(str ?? '').replace(/\r?\n/g, ' ')
}
