// Курированное подмножество EntityType/EntityVariant — см. docs/SPEC.md §7, §11.
//
// ВАЖНО (риск, см. docs/SPEC.md §11): значения ниже — общеизвестные имена
// констант из Lua API игры, взятые по памяти/документации сообщества.
// Перед релизом стоит сверить точное написание с актуальным дампом
// EntityType/EntityVariant (например через `Isaac.DebugString` в игре или
// официальную wiki на момент сборки) — числовые значения генератор не
// хардкодит, а подставляет имена констант как есть, так что опечатка здесь
// даст явную ошибку в логе игры, а не тихо неверное поведение.
export const ENTITY_TYPES = [
  {
    id: 'gaper',
    label: 'Гейпер (Gaper)',
    entityType: 'EntityType.ENTITY_GAPER',
    variant: '0'
  },
  {
    id: 'pooter',
    label: 'Путер (Pooter)',
    entityType: 'EntityType.ENTITY_POOTER',
    variant: '0'
  },
  {
    id: 'host',
    label: 'Хост (Host)',
    entityType: 'EntityType.ENTITY_HOST',
    variant: '0'
  },
  {
    id: 'pickup_heart',
    label: 'Подбираемое: сердце',
    entityType: 'EntityType.ENTITY_PICKUP',
    variant: 'PickupVariant.PICKUP_HEART'
  },
  {
    id: 'pickup_coin',
    label: 'Подбираемое: монета',
    entityType: 'EntityType.ENTITY_PICKUP',
    variant: 'PickupVariant.PICKUP_COIN'
  },
  {
    id: 'pickup_key',
    label: 'Подбираемое: ключ',
    entityType: 'EntityType.ENTITY_PICKUP',
    variant: 'PickupVariant.PICKUP_KEY'
  },
  {
    id: 'pickup_bomb',
    label: 'Подбираемое: бомба',
    entityType: 'EntityType.ENTITY_PICKUP',
    variant: 'PickupVariant.PICKUP_BOMB'
  },
  {
    id: 'pickup_chest',
    label: 'Подбираемое: сундук',
    entityType: 'EntityType.ENTITY_PICKUP',
    variant: 'PickupVariant.PICKUP_CHEST'
  }
]

export function getEntity(id) {
  return ENTITY_TYPES.find((e) => e.id === id) || null
}
