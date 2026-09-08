import { buildDefaultCollectibleAnm2 } from './anm2Presets/defaultCollectible.js'

const PRESETS = {
  'default-collectible': buildDefaultCollectibleAnm2
}

/**
 * Строит содержимое .anm2 файлов для всех записей project.resources.anm2.
 * Возвращает { "resources/gfx/items/collectibles/foo.anm2": "<xml>" }.
 */
export function buildAnm2Files(project) {
  const files = {}
  for (const entry of project.resources.anm2 || []) {
    const builder = PRESETS[entry.preset]
    if (!builder) continue
    const iconSprite = project.resources.sprites.find((s) => s.id === entry.spriteRefs?.icon)
    if (!iconSprite) continue
    const spriteSheetPath = `gfx/items/collectibles/${iconSprite.fileName}`
    const xml = builder({ spriteSheetPath, width: 32, height: 32 })
    const outPath = `resources/gfx/items/collectibles/${stripExt(iconSprite.fileName)}.anm2`
    files[outPath] = xml
  }
  return files
}

function stripExt(fileName) {
  return fileName.replace(/\.[^.]+$/, '')
}
