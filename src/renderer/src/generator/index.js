// Точка входа генератора — см. docs/SPEC.md §5.
// generate(project) -> { files, sourceMap, diagnostics }
// Чистая функция: не трогает диск (это делает electron/main через IPC),
// не имеет побочных эффектов и детерминирована для одинакового project.json.

import { validateProject } from '../model/schema.js'
import { buildMainLua } from './luaGen.js'
import { buildMetadataXml, buildItemsXml, buildItemPoolsXml } from './xmlGen.js'
import { buildAnm2Files } from './anm2Gen.js'
import { spriteOutputPath } from './spriteSpecs.js'

export function generate(project) {
  const diagnostics = validateProject(project)

  const { code: mainLua, sourceMap } = buildMainLua(project)

  const files = {
    'main.lua': mainLua,
    'metadata.xml': buildMetadataXml(project),
    'content/items.xml': buildItemsXml(project),
    ...buildAnm2Files(project),
    ...spriteFiles(project)
  }

  // Пулы — отдельный файл, и он нужен только если хоть один предмет в пул
  // положили. Пустой content/itempools.xml игра разбирает как "очистить пулы".
  const itemPoolsXml = buildItemPoolsXml(project)
  if (itemPoolsXml) files['content/itempools.xml'] = itemPoolsXml

  return { files, sourceMap, diagnostics }
}

function spriteFiles(project) {
  const files = {}
  for (const sprite of project.resources.sprites || []) {
    if (!sprite.dataUrl) continue
    const base64 = sprite.dataUrl.split(',')[1]
    if (!base64) continue
    // Путь берётся из spriteSpecs — того же места, откуда items.xml берёт
    // значение gfx="...". Иначе эти два легко разъезжаются, и игра падает,
    // не найдя спрайт по пути из XML.
    files[spriteOutputPath(sprite)] = { base64 }
  }
  return files
}

export { resolveSourceLocation } from './sourceMap.js'
