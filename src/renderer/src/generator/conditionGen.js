// Компиляция одного условия ("Если") в Lua-булево выражение.
// См. docs/SPEC.md §4.2, §5.2. Каждое условие компилируется отдельно и
// оборачивается вызывающим кодом (luaGen.js) в свой `if ... then`, а не
// склеивается через `and` — так у каждого условия своя строка в source map.

/**
 * @param {object} condition - { type, params }
 * @param {object} ctx - { playerExpr, targetExpr, itemVarFor(itemId) }
 * @returns {string} готовое Lua-выражение (без "if"/"then")
 */
export function compileCondition(condition, ctx) {
  switch (condition.type) {
    case 'player_has_item': {
      const itemRef = ctx.itemVarFor(condition.params.itemRef)
      // hasItem объявлен в шапке main.lua (luaGen.js:emitRuntimeHelpers) и
      // сам проверяет и player == nil, и id <= 0. Прямой вызов
      // player:HasCollectible(id) с id = -1 (предмет не найден в items.xml)
      // роняет игру, поэтому в сгенерированном коде его быть не должно.
      return `hasItem(${ctx.playerExpr}, ${itemRef})`
    }
    case 'chance': {
      const percent = clampNumber(condition.params.percent, 1, 100, 25)
      return `(math.random(1, 100) <= ${percent})`
    }
    case 'hp_below': {
      const amount = clampNumber(condition.params.amount, 1, 24, 2)
      const player = ctx.playerExpr
      return `(${player} ~= nil and ${player}:GetHearts() + ${player}:GetSoulHearts() < ${amount})`
    }
    case 'room_is_boss': {
      return `(Game():GetRoom():GetType() == RoomType.ROOM_BOSS)`
    }
    case 'is_target_player': {
      return `(${ctx.targetExpr} ~= nil and ${ctx.targetExpr}:ToPlayer() ~= nil)`
    }
    case 'frame_interval': {
      const interval = clampNumber(condition.params.interval, 1, 1800, 30)
      return `(Game():GetFrameCount() % ${interval} == 0)`
    }
    default:
      throw new Error(`Неизвестный тип условия: ${condition.type}`)
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
