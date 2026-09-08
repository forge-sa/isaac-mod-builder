// Каталог "Когда" — человекочитаемая обёртка над ModCallbacks игры.
// См. docs/SPEC.md §4.2, §7. На MVP — 6 колбэков, достаточных для пассивных
// и активных предметов с типовой логикой; расширяется добавлением записи
// сюда + case в src/generator/luaGen.js.
//
// availableFrom: минимальная версия, где колбэк существует.
// repentogonOnly: колбэк добавлен REPENTOGON поверх ванильного API.
// signature.args: имена параметров функции-обработчика, как в Lua API игры
//   (первый параметр `_` — таблица мода, передаётся автоматически).
// signature.playerExpr: готовое Lua-выражение, дающее EntityPlayer в этом
//   контексте, либо null, если его сначала нужно получить через
//   Isaac.GetPlayer(0) (это генератор делает сам, см. luaGen.js).
// signature.targetExpr: выражение для "цели события", если применимо
//   (используется условием is_target_player и действиями "на месте цели").

export const CALLBACKS = [
  {
    type: 'MC_POST_NEW_ROOM',
    label: 'При входе в новую комнату',
    description: 'Срабатывает один раз при заходе в любую комнату (включая повторный).',
    luaConstant: 'ModCallbacks.MC_POST_NEW_ROOM',
    signature: { args: [], playerExpr: null, targetExpr: null },
    availableFrom: 'afterbirth-plus',
    repentogonOnly: false
  },
  {
    type: 'MC_ENTITY_TAKE_DMG',
    label: 'Когда сущность получает урон',
    description: 'Срабатывает перед применением урона к любой сущности (игроку, врагу и т.д.).',
    luaConstant: 'ModCallbacks.MC_ENTITY_TAKE_DMG',
    signature: {
      args: ['target', 'amount', 'flags', 'source', 'countdownFrames'],
      playerExpr: 'target:ToPlayer()',
      targetExpr: 'target'
    },
    availableFrom: 'afterbirth-plus',
    repentogonOnly: false
  },
  {
    type: 'MC_USE_ITEM',
    label: 'При использовании активного предмета',
    description:
      'Срабатывает, когда игрок использует активный предмет. Регистрируется отдельно для каждого активного предмета, к которому привязано правило.',
    luaConstant: 'ModCallbacks.MC_USE_ITEM',
    signature: {
      args: ['collectibleType', 'rng', 'player', 'useFlags', 'activeSlot', 'customVarData'],
      playerExpr: 'player',
      targetExpr: 'player'
    },
    availableFrom: 'afterbirth-plus',
    repentogonOnly: false,
    requiresItemContext: true,
    // Обработчик обязан вернуть true, иначе игра не проиграет анимацию
    // использования предмета (см. luaGen.js:emitCallbackGroup).
    returnsTrue: true
  },
  {
    type: 'MC_POST_PLAYER_UPDATE',
    label: 'Каждый кадр, для каждого игрока',
    description:
      'Срабатывает ~30 раз в секунду для каждого активного игрока. Используйте условие "Раз в N кадров", чтобы не спамить эффектом.',
    luaConstant: 'ModCallbacks.MC_POST_PLAYER_UPDATE',
    signature: { args: ['player'], playerExpr: 'player', targetExpr: 'player' },
    availableFrom: 'afterbirth-plus',
    repentogonOnly: false
  },
  {
    type: 'MC_POST_PLAYER_INIT',
    label: 'При появлении игрока на сцене',
    description: 'Срабатывает один раз при инициализации игрока (начало забега/продолжение).',
    luaConstant: 'ModCallbacks.MC_POST_PLAYER_INIT',
    signature: { args: ['player'], playerExpr: 'player', targetExpr: 'player' },
    availableFrom: 'afterbirth-plus',
    repentogonOnly: false
  },
  {
    type: 'MC_POST_PICKUP_INIT',
    label: 'При появлении подбираемого предмета на полу',
    description:
      'Срабатывает, когда в комнате создаётся подбираемый объект (сердце, монета, предмет и т.д.).',
    luaConstant: 'ModCallbacks.MC_POST_PICKUP_INIT',
    signature: { args: ['pickup'], playerExpr: null, targetExpr: 'pickup' },
    availableFrom: 'repentance',
    repentogonOnly: false
  }
]

export function getCallback(type) {
  return CALLBACKS.find((c) => c.type === type) || null
}
