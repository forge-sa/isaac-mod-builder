// Компиляция одного действия ("То") в одну или несколько строк Lua.
// См. docs/SPEC.md §4.2, §5.2.

import { getEntity } from '../data/entityTypes.js'

/**
 * @param {object} action - { type, params }
 * @param {object} ctx - { playerExpr, targetExpr }
 * @returns {string[]} строки Lua-кода (без переносов), уже без общего отступа
 */
export function compileAction(action, ctx) {
  switch (action.type) {
    case 'give_hearts':
      return compileGiveHearts(action.params, ctx)

    case 'give_coins': {
      const amount = clampNumber(action.params.amount, 1, 99, 5)
      return [`if ${ctx.playerExpr} ~= nil then ${ctx.playerExpr}:AddCoins(${amount}) end`]
    }

    case 'spawn_entity': {
      const entity = getEntity(action.params.entityRef)
      if (!entity) throw new Error('Не выбрана сущность для спавна')
      const positionExpr = resolveSpawnPosition(action.params.at, ctx)
      // Vector(0, 0), а не Vector.Zero: в Afterbirth+ статического Vector.Zero
      // ещё нет, и обращение к нему даёт ошибку "attempt to index a nil value".
      return [
        `Isaac.Spawn(${entity.entityType}, ${entity.variant}, 0, ${positionExpr}, Vector(0, 0), nil)`
      ]
    }

    case 'play_sound': {
      const sound = action.params.soundRef || 'THUMBSUP'
      const volume = clampNumber(action.params.volume, 0, 1, 1)
      return [`SFXManager():Play(SoundEffect.SOUND_${sound}, ${volume})`]
    }

    case 'teleport_to_room_type': {
      const roomType = action.params.roomTypeRef || 'DEFAULT'
      // RNG() создаётся с нулевым посевом, а RNG с seed = 0 роняет игру при
      // первом же обращении к следующему числу — QueryRoomTypeIndex именно это
      // и делает. Поэтому сеем явно и гарантируем ненулевое значение.
      return [
        `if ${ctx.playerExpr} ~= nil then`,
        `  local level = Game():GetLevel()`,
        `  local rng = RNG()`,
        `  local seed = Random()`,
        `  if seed == 0 then seed = 1 end`,
        `  rng:SetSeed(seed, 35)`,
        `  local targetRoomIdx = level:QueryRoomTypeIndex(RoomType.ROOM_${roomType}, true, rng)`,
        `  if targetRoomIdx and targetRoomIdx ~= -1 then Game():StartRoomTransition(targetRoomIdx, Direction.NO_DIRECTION, RoomTransitionAnim.TELEPORT) end`,
        `end`
      ]
    }

    case 'add_collectible_charge': {
      const amount = clampNumber(action.params.amount, 1, 12, 1)
      return [
        `if ${ctx.playerExpr} ~= nil then ${ctx.playerExpr}:AddActiveCharge(${amount}, ActiveSlot.SLOT_PRIMARY) end`
      ]
    }

    default:
      throw new Error(`Неизвестный тип действия: ${action.type}`)
  }
}

function compileGiveHearts(params, ctx) {
  const amount = clampNumber(params.amount, 1, 24, 1)
  const player = ctx.playerExpr
  const methodByType = {
    red: 'AddHearts',
    half_red: 'AddHearts',
    soul: 'AddSoulHearts',
    black: 'AddBlackHearts',
    eternal: 'AddEternalHearts'
  }
  const method = methodByType[params.heartType] || 'AddHearts'
  return [`if ${player} ~= nil then ${player}:${method}(${amount}) end`]
}

function resolveSpawnPosition(at, ctx) {
  switch (at) {
    case 'player_position':
      return `(${ctx.playerExpr} ~= nil and ${ctx.playerExpr}.Position or Isaac.GetPlayer(0).Position)`
    case 'random_room_position':
      return `Game():GetRoom():GetRandomPosition(1)`
    case 'target_position':
    default:
      return `(${ctx.targetExpr} ~= nil and ${ctx.targetExpr}.Position or Isaac.GetPlayer(0).Position)`
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
