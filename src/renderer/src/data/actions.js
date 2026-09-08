// Каталог "То" — см. docs/SPEC.md §4.2, §7.

export const ACTIONS = [
  {
    type: 'give_hearts',
    label: 'Дать сердца',
    paramsSchema: [
      { key: 'amount', type: 'number', label: 'Количество половинок', min: 1, max: 24, default: 1 },
      {
        key: 'heartType',
        type: 'select',
        label: 'Тип сердца',
        options: [
          { value: 'red', label: 'Красное' },
          { value: 'soul', label: 'Синее (душа)' },
          { value: 'black', label: 'Чёрное' },
          { value: 'eternal', label: 'Вечное' },
          { value: 'half_red', label: 'Половина красного' }
        ],
        default: 'red'
      }
    ]
  },
  {
    type: 'give_coins',
    label: 'Дать монеты',
    paramsSchema: [
      { key: 'amount', type: 'number', label: 'Количество', min: 1, max: 99, default: 5 }
    ]
  },
  {
    type: 'spawn_entity',
    label: 'Заспавнить сущность',
    paramsSchema: [
      { key: 'entityRef', type: 'entityPicker', label: 'Сущность' },
      {
        key: 'at',
        type: 'select',
        label: 'Позиция',
        options: [
          { value: 'target_position', label: 'На месте цели события' },
          { value: 'player_position', label: 'На месте игрока' },
          { value: 'random_room_position', label: 'Случайно в комнате' }
        ],
        default: 'target_position'
      }
    ]
  },
  {
    type: 'play_sound',
    label: 'Сыграть звук',
    paramsSchema: [
      { key: 'soundRef', type: 'soundPicker', label: 'Звук' },
      { key: 'volume', type: 'number', label: 'Громкость (0–1)', min: 0, max: 1, step: 0.1, default: 1 }
    ]
  },
  {
    type: 'teleport_to_room_type',
    label: 'Телепортировать игрока в комнату типа',
    paramsSchema: [{ key: 'roomTypeRef', type: 'roomTypePicker', label: 'Тип комнаты' }]
  },
  {
    type: 'add_collectible_charge',
    label: 'Добавить заряд активному предмету',
    description: 'Добавляет заряд активному предмету в текущем слоте игрока.',
    paramsSchema: [
      { key: 'amount', type: 'number', label: 'Количество зарядов', min: 1, max: 12, default: 1 }
    ]
  }
]

export function getAction(type) {
  return ACTIONS.find((a) => a.type === type) || null
}
