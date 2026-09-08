// Статы игрока, доступные для изменения через MC_EVALUATE_CACHE
// (см. docs/SPEC.md §5.3). Каждая запись знает и константу CacheFlag, и то,
// какое Lua-поле EntityPlayer менять, и как применить операцию —
// это единственное место, которое нужно трогать, чтобы добавить новый стат.
export const STATS = [
  {
    value: 'damage',
    label: 'Урон',
    cacheFlag: 'CacheFlag.CACHE_DAMAGE',
    playerField: 'Damage'
  },
  {
    value: 'firedelay',
    label: 'Скорость выстрелов (задержка, меньше = быстрее)',
    cacheFlag: 'CacheFlag.CACHE_FIREDELAY',
    playerField: 'MaxFireDelay'
  },
  {
    value: 'shotspeed',
    label: 'Скорость полёта слёз',
    cacheFlag: 'CacheFlag.CACHE_SHOTSPEED',
    playerField: 'ShotSpeed'
  },
  {
    value: 'range',
    label: 'Дальность слёз',
    cacheFlag: 'CacheFlag.CACHE_RANGE',
    playerField: 'TearRange'
  },
  {
    value: 'speed',
    label: 'Скорость передвижения',
    cacheFlag: 'CacheFlag.CACHE_SPEED',
    playerField: 'MoveSpeed'
  },
  {
    value: 'luck',
    label: 'Удача',
    cacheFlag: 'CacheFlag.CACHE_LUCK',
    playerField: 'Luck'
  }
]

export function getStat(value) {
  return STATS.find((s) => s.value === value) || null
}
