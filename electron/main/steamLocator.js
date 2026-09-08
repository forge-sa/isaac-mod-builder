// Автоопределение папки mods The Binding of Isaac: Rebirth внутри Steam.
//
// НЕ ПРОТЕСТИРОВАНО НА РЕАЛЬНОЙ МАШИНЕ (см. docs/SPEC.md §8, §11) — логика
// написана по документации Steam/сообщества модов и обязательно требует
// проверки хотя бы на одной установке каждой ОС перед тем, как полагаться
// на автоопределение в релизе. Везде, где автоопределение не срабатывает,
// UI обязан предлагать ручной выбор папки (см. game:pickModsFolder в main).

import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'

const APP_ID = '250900' // The Binding of Isaac: Rebirth
const GAME_DIR_NAME = 'The Binding of Isaac Rebirth'

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Пытается найти папку `.../steamapps/common/The Binding of Isaac Rebirth/mods`.
 * Порядок:
 *  1. Стандартный путь установки Steam для текущей ОС.
 *  2. Чтение libraryfolders.vdf, если игра стоит в другой Steam-библиотеке
 *     (пользователь указал папку не на системном диске).
 * Бросает исключение с понятным сообщением, если ничего не нашлось —
 * вызывающий код (main/index.js) в этом случае просит пользователя указать
 * папку вручную.
 */
export async function findSteamModsFolder() {
  const candidateSteamRoots = getDefaultSteamRoots()

  for (const steamRoot of candidateSteamRoots) {
    const direct = path.join(steamRoot, 'steamapps', 'common', GAME_DIR_NAME)
    if (await pathExists(direct)) {
      return await ensureModsFolder(direct)
    }

    const libraryFolders = await readLibraryFolders(steamRoot)
    for (const libRoot of libraryFolders) {
      const candidate = path.join(libRoot, 'steamapps', 'common', GAME_DIR_NAME)
      if (await pathExists(candidate)) {
        return await ensureModsFolder(candidate)
      }
    }
  }

  throw new Error(
    'Не удалось автоматически найти папку установки The Binding of Isaac: Rebirth. ' +
      'Укажите папку mods вручную.'
  )
}

function getDefaultSteamRoots() {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'win32') {
    // Реальный путь чаще всего в реестре HKCU\Software\Valve\Steam (SteamPath).
    // Чтение реестра из чистого Node без нативных модулей ненадёжно, поэтому
    // на MVP полагаемся на стандартные пути установки + libraryfolders.vdf,
    // а точное чтение реестра — предложение для доработки (см. docs/SPEC.md §11).
    return [
      'C:/Program Files (x86)/Steam',
      'C:/Program Files/Steam',
      path.join(home, 'Steam')
    ]
  }

  if (platform === 'darwin') {
    return [path.join(home, 'Library/Application Support/Steam')]
  }

  // Linux (нативный Steam) — Proton-путь к самой игре такой же,
  // но log.txt в Proton лежит в compatdata (см. logTail.js).
  return [
    path.join(home, '.local/share/Steam'),
    path.join(home, '.steam/steam'),
    path.join(home, '.var/app/com.valvesoftware.Steam/.local/share/Steam') // Flatpak
  ]
}

/**
 * Все корни Steam-библиотек: стандартные пути установки Steam плюс
 * дополнительные библиотеки из libraryfolders.vdf. Внутри каждого лежит
 * steamapps/ — а значит и common/ (игра), и compatdata/ (префикс Proton).
 */
export async function getSteamLibraryRoots() {
  const roots = []
  const add = (root) => {
    if (root && !roots.includes(root)) roots.push(root)
  }

  for (const steamRoot of getDefaultSteamRoots()) {
    if (!(await pathExists(path.join(steamRoot, 'steamapps')))) continue
    add(steamRoot)
    for (const libRoot of await readLibraryFolders(steamRoot)) add(libRoot)
  }

  return roots
}

async function readLibraryFolders(steamRoot) {
  const vdfPath = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf')
  if (!(await pathExists(vdfPath))) return []

  try {
    const content = await fs.readFile(vdfPath, 'utf-8')
    // Очень упрощённый парсер VDF: нам нужны только строки вида "path" "D:\\SteamLibrary".
    const matches = [...content.matchAll(/"path"\s+"([^"]+)"/g)]
    return matches.map((m) => m[1].replace(/\\\\/g, '/'))
  } catch {
    return []
  }
}

async function ensureModsFolder(gameInstallDir) {
  const modsFolder = path.join(gameInstallDir, 'mods')
  const exists = await pathExists(modsFolder)
  if (!exists) {
    // Папки mods может не быть, если пользователь никогда не включал моды
    // в игре — создаём её, это безопасно и ожидаемо игрой.
    await fs.mkdir(modsFolder, { recursive: true })
  }
  return { gameInstallDir, modsFolder }
}

export const STEAM_APP_ID = APP_ID
