// Автономный тест генератора без Electron/React/Vite — гоняет чистую логику
// из src/renderer/src/{model,generator,data} через обычный Node.
// Запуск: npm run test:generator
// Проверяет: генератор не падает на реалистичном примере проекта, source map
// действительно резолвит номера строк в блоки, XML не содержит явных дыр.

import assert from 'node:assert/strict'
import {
  createEmptyProject,
  createPassiveItem,
  createActiveItem,
  createRule,
  createStatChange,
  validateProject
} from '../src/renderer/src/model/schema.js'
import { generate, resolveSourceLocation } from '../src/renderer/src/generator/index.js'

function buildSampleProject() {
  const project = createEmptyProject()
  project.meta.modName = 'Кровавый амулет'
  project.meta.modId = 'bloody-amulet-demo'
  project.meta.targetVersion = 'repentance-plus'

  project.resources.sprites.push({
    id: 'spr_icon',
    kind: 'collectible-icon',
    fileName: 'bloodyamulet.png',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  })

  const rule = createRule({
    name: 'Шанс сердца при получении урона',
    when: { type: 'MC_ENTITY_TAKE_DMG', params: {} },
    conditions: [
      { id: 'cond_1', type: 'is_target_player', params: {} },
      { id: 'cond_2', type: 'player_has_item', params: { itemRef: null } }, // заполним ниже
      { id: 'cond_3', type: 'chance', params: { percent: 25 } }
    ],
    actions: [{ id: 'act_1', type: 'give_hearts', params: { amount: 1, heartType: 'half_red' } }]
  })

  const passive = createPassiveItem({
    name: 'Кровавый амулет',
    description: 'При получении урона иногда выпадает сердце',
    iconSpriteId: 'spr_icon',
    itemTags: ['OFFENSIVE'],
    pools: ['TREASURE', 'SHOP'],
    statChanges: [createStatChange({ stat: 'damage', op: 'add', value: 1 })],
    ruleIds: [rule.id]
  })
  rule.conditions[1].params.itemRef = passive.id
  project.items.push(passive)
  project.rules.push(rule)

  const useRule = createRule({
    name: 'Даёт сердце при использовании',
    when: { type: 'MC_USE_ITEM', params: {} },
    conditions: [],
    actions: [{ id: 'act_2', type: 'give_hearts', params: { amount: 2, heartType: 'soul' } }]
  })
  const active = createActiveItem({
    name: 'Флакон душ',
    iconSpriteId: 'spr_icon',
    ruleIds: [useRule.id]
  })
  project.items.push(active)
  project.rules.push(useRule)

  return project
}

function main() {
  const project = buildSampleProject()

  const errors = validateProject(project)
  assert.equal(errors.length, 0, `validateProject должен пройти без ошибок, получено: ${JSON.stringify(errors, null, 2)}`)

  const { files, sourceMap, diagnostics } = generate(project)
  assert.equal(diagnostics.length, 0, `generate() дал диагностику: ${JSON.stringify(diagnostics)}`)

  assert.ok(files['main.lua'], 'main.lua должен быть сгенерирован')
  assert.ok(files['metadata.xml'], 'metadata.xml должен быть сгенерирован')
  assert.ok(files['content/items.xml'], 'content/items.xml должен быть сгенерирован')
  assert.ok(
    Object.keys(files).some((f) => f.startsWith('resources/gfx/items/collectibles/')),
    'иконка предмета должна попасть в resources/gfx'
  )

  const lua = files['main.lua']
  assert.ok(lua.includes('RegisterMod("Кровавый амулет"'), 'заголовок мода должен содержать имя')
  assert.ok(lua.includes('Isaac.GetItemIdByName("Кровавый амулет")'), 'реестр ID должен резолвить предмет по имени')
  assert.ok(lua.includes('ModCallbacks.MC_ENTITY_TAKE_DMG'), 'должен быть обработчик урона')
  assert.ok(lua.includes('ModCallbacks.MC_USE_ITEM'), 'должен быть обработчик использования предмета')
  assert.ok(lua.includes('MC_EVALUATE_CACHE'), 'изменение урона должно идти через EvaluateCache')
  assert.ok(lua.includes('math.random(1, 100) <= 25'), 'условие шанса должно попасть в код')
  assert.ok(!lua.includes('undefined'), 'в сгенерированном коде не должно быть "undefined"')

  // Проверяем, что source map реально резолвит номера строк в понятные блоки.
  const lines = lua.split('\n')
  const heartLineIdx = lines.findIndex((l) => l.includes(':AddHearts('))
  assert.ok(heartLineIdx !== -1, 'должна быть строка с AddHearts')
  const located = resolveSourceLocation(sourceMap, heartLineIdx + 1)
  assert.ok(located, 'source map должен находить блок для строки с AddHearts')
  assert.ok(located.blockPath.length > 0, 'у найденного блока должен быть человекочитаемый путь')

  console.log('OK: сгенерированный main.lua ------------------------------------')
  console.log(lua)
  console.log('OK: content/items.xml -------------------------------------------')
  console.log(files['content/items.xml'])
  console.log('OK: metadata.xml -------------------------------------------------')
  console.log(files['metadata.xml'])
  console.log(`OK: source map содержит ${sourceMap.length} записей, пример резолва строки ${heartLineIdx + 1}:`)
  console.log(located)
  console.log('\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ')
}

main()
