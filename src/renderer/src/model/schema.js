// Модель проекта — единственный источник правды (см. docs/SPEC.md §3).
// Чистый JS, без зависимости от React/Electron/Zustand — можно
// импортировать из генератора, из UI и из тестов одинаково.

export const SCHEMA_VERSION = 1

export const TARGET_VERSIONS = [
  { id: 'afterbirth-plus', label: 'Afterbirth+' },
  { id: 'repentance', label: 'Repentance' },
  { id: 'repentance-plus', label: 'Repentance+' }
]

let counter = 0
/** Короткий читаемый уникальный id: префикс + монотонный счётчик + случайный хвост.
 * Не используем crypto.randomUUID() напрямую, чтобы id оставались короткими
 * и человекочитаемыми в source map ("rule_a3f-2"), а не UUID-простынёй. */
export function makeId(prefix) {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 6)
  return `${prefix}_${rand}${counter}`
}

export function createEmptyProject() {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      modName: 'Мой мод',
      modId: 'my-mod',
      author: '',
      description: '',
      targetVersion: 'repentance-plus',
      repentogon: false,
      allocatedIds: {
        // itemId -> числовой игровой ID предмета, выделяется генератором
        // при первой сборке и больше не меняется (см. docs/SPEC.md §3).
        items: {},
        trinkets: {}
      }
    },
    resources: {
      sprites: [],
      anm2: []
    },
    items: [],
    trinkets: [],
    rules: []
  }
}

export function createPassiveItem(overrides = {}) {
  return {
    id: makeId('item'),
    kind: 'passive',
    name: 'Новый предмет',
    description: '',
    // Ключ ровно как в ITEM_POOLS (data/itemPools.js) — иначе чип пула в форме
    // не подсветится выбранным, а клик по нему добавит дубликат того же пула.
    pools: ['TREASURE'],
    itemTags: [],
    iconSpriteId: null,
    costumeAnm2Id: null,
    active: null,
    statChanges: [],
    ruleIds: [],
    ...overrides
  }
}

export function createActiveItem(overrides = {}) {
  return {
    id: makeId('item'),
    kind: 'active',
    name: 'Новый активный предмет',
    description: '',
    // Ключ ровно как в ITEM_POOLS (data/itemPools.js) — иначе чип пула в форме
    // не подсветится выбранным, а клик по нему добавит дубликат того же пула.
    pools: ['TREASURE'],
    itemTags: [],
    iconSpriteId: null,
    costumeAnm2Id: null,
    active: {
      chargeType: 'normal', // "normal" | "special" (батарейки/двойная зарядка учитываются игрой автоматически)
      maxCharges: 3
    },
    statChanges: [],
    ruleIds: [],
    ...overrides
  }
}

export function createTrinket(overrides = {}) {
  return {
    id: makeId('trinket'),
    kind: 'trinket',
    name: 'Новый трюк',
    description: '',
    iconSpriteId: null,
    goldenAllowed: true,
    statChanges: [],
    ruleIds: [],
    ...overrides
  }
}

export function createRule(overrides = {}) {
  return {
    id: makeId('rule'),
    name: 'Новое правило',
    when: { type: null, params: {} },
    conditions: [],
    actions: [],
    ...overrides
  }
}

export function createStatChange(overrides = {}) {
  return {
    id: makeId('stat'),
    stat: 'damage',
    op: 'add', // "add" | "multiply" | "set"
    value: 1,
    ...overrides
  }
}

/**
 * Базовая структурная валидация модели перед генерацией.
 * Возвращает список ошибок вида { path, message } — UI показывает их
 * рядом с полем, а не как Lua-стектрейс (см. docs/SPEC.md §5.1).
 */
export function validateProject(project) {
  const errors = []
  const push = (path, message) => errors.push({ path, message })

  if (!project.meta.modName?.trim()) push('meta.modName', 'Укажите название мода')
  if (!/^[a-z0-9-]+$/.test(project.meta.modId || '')) {
    push('meta.modId', 'ID мода — латиница, цифры и дефис, например my-cool-mod')
  }

  const itemIds = new Set()
  for (const item of project.items) {
    if (itemIds.has(item.id)) push(`items.${item.id}`, 'Дублирующийся ID предмета')
    itemIds.add(item.id)
    if (!item.name?.trim()) push(`items.${item.id}.name`, 'У предмета должно быть имя')
    if (!item.iconSpriteId) push(`items.${item.id}.iconSpriteId`, 'Не выбрана иконка предмета')
    else if (!project.resources.sprites.some((s) => s.id === item.iconSpriteId)) {
      push(`items.${item.id}.iconSpriteId`, 'Иконка ссылается на несуществующий спрайт')
    }
    for (const ruleId of item.ruleIds) {
      if (!project.rules.some((r) => r.id === ruleId)) {
        push(`items.${item.id}.ruleIds`, `Правило ${ruleId} не найдено`)
      }
    }
  }

  const owningItemsByRuleId = new Map()
  for (const item of [...project.items, ...project.trinkets]) {
    for (const ruleId of item.ruleIds || []) {
      if (!owningItemsByRuleId.has(ruleId)) owningItemsByRuleId.set(ruleId, [])
      owningItemsByRuleId.get(ruleId).push(item)
    }
  }

  for (const rule of project.rules) {
    if (!rule.when?.type) push(`rules.${rule.id}.when`, 'Не выбрано событие "Когда"')
    if (rule.actions.length === 0) {
      push(`rules.${rule.id}.actions`, 'У правила должно быть хотя бы одно действие "То"')
    }
    // MC_USE_ITEM (и любой другой колбэк с requiresItemContext) должен
    // регистрироваться на конкретный предмет — см. docs/SPEC.md §5.2.
    if (rule.when?.type === 'MC_USE_ITEM') {
      const owners = owningItemsByRuleId.get(rule.id) || []
      if (owners.length === 0) {
        push(
          `rules.${rule.id}`,
          'Правило "При использовании активного предмета" должно быть привязано к активному предмету'
        )
      } else if (owners.length > 1) {
        push(
          `rules.${rule.id}`,
          'Правило "При использовании активного предмета" не может быть привязано больше чем к одному предмету'
        )
      } else if (owners[0].kind !== 'active') {
        push(
          `rules.${rule.id}`,
          'Правило "При использовании активного предмета" привязано к предмету, который не является активным'
        )
      }
    }
  }

  return errors
}
