// Каталог "Если" — см. docs/SPEC.md §4.2, §7.
// paramsSchema описывает поля формы в UI (RuleEditor); ключи полей совпадают
// с тем, что читает src/generator/conditionGen.js — это и есть контракт
// между UI и генератором для одного условия.

export const CONDITIONS = [
  {
    type: 'player_has_item',
    label: 'У игрока есть предмет',
    paramsSchema: [
      { key: 'itemRef', type: 'itemPicker', label: 'Предмет', filterKind: ['passive', 'active'] }
    ]
  },
  {
    type: 'chance',
    label: 'Шанс',
    paramsSchema: [
      { key: 'percent', type: 'number', label: 'Процент', min: 1, max: 100, default: 25 }
    ]
  },
  {
    type: 'hp_below',
    label: 'HP игрока меньше',
    paramsSchema: [
      { key: 'amount', type: 'number', label: 'Количество половинок сердца', min: 1, max: 24, default: 2 }
    ]
  },
  {
    type: 'room_is_boss',
    label: 'Текущая комната — комната босса',
    paramsSchema: []
  },
  {
    type: 'is_target_player',
    label: 'Цель события — игрок',
    description: 'Полезно как первое условие в правилах на "Когда сущность получает урон", чтобы не задеть врагов.',
    paramsSchema: [],
    applicableTo: ['MC_ENTITY_TAKE_DMG']
  },
  {
    type: 'frame_interval',
    label: 'Раз в N кадров',
    description: 'Ограничивает частоту срабатывания правил на "каждый кадр" (в игре 30 кадров ≈ 1 секунда).',
    paramsSchema: [
      { key: 'interval', type: 'number', label: 'Интервал (кадры)', min: 1, max: 1800, default: 30 }
    ],
    applicableTo: ['MC_POST_PLAYER_UPDATE']
  }
]

/** null/отсутствие applicableTo — условие годится для любого "Когда". */
export function conditionsForCallback(callbackType) {
  return CONDITIONS.filter((c) => !c.applicableTo || c.applicableTo.includes(callbackType))
}

export function getCondition(type) {
  return CONDITIONS.find((c) => c.type === type) || null
}
