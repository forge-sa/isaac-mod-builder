// Копирование сгенерированной папки мода в mods/<modId>.
// НЕ ПРОТЕСТИРОВАНО НА РЕАЛЬНОЙ УСТАНОВКЕ ИГРЫ (см. docs/SPEC.md §8, §11).

import fs from 'node:fs/promises'
import path from 'node:path'

export async function installMod({ modsFolder, modId, files }) {
  if (!modsFolder) throw new Error('Папка mods не указана')
  if (!modId) throw new Error('Не задан modId')

  const targetRoot = path.join(modsFolder, modId)

  // Полностью пересобираем папку мода при каждой установке, чтобы в ней не
  // копились файлы от предыдущих версий (например, переименованные/удалённые
  // ресурсы). disable.it, если он есть, не трогаем — это ручной флаг игрока.
  const disableFlagPath = path.join(targetRoot, 'disable.it')
  let hadDisableFlag = false
  try {
    await fs.access(disableFlagPath)
    hadDisableFlag = true
  } catch {
    // файла нет — ничего не делаем
  }

  await fs.rm(targetRoot, { recursive: true, force: true })
  await fs.mkdir(targetRoot, { recursive: true })

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(targetRoot, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    if (typeof content === 'string') {
      await fs.writeFile(fullPath, content, 'utf-8')
    } else if (content && typeof content.base64 === 'string') {
      await fs.writeFile(fullPath, Buffer.from(content.base64, 'base64'))
    }
  }

  if (hadDisableFlag) {
    await fs.writeFile(disableFlagPath, '')
  }

  // Возвращаем и флаг отключения: мод, выключенный в меню игры, ставится
  // успешно, но не грузится — со стороны это неотличимо от "установка не
  // сработала", поэтому UI обязан сказать об этом прямо.
  return { targetRoot, disabled: hadDisableFlag }
}
