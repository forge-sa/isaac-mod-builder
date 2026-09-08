// Поиск и построчное чтение log.txt игры для панели "Установить и запустить".
// См. docs/SPEC.md §8, §11.
//
// Главная тонкость — Linux. Repentance/Repentance+ не имеют нативной
// Linux-сборки и запускаются через Proton, поэтому игра пишет log.txt не в
// ~/.local/share, а внутрь Wine-префикса:
//   <steam library>/steamapps/compatdata/250900/pfx/drive_c/users/steamuser/
//     Documents/My Games/Binding of Isaac Repentance+/log.txt
// Раньше эта ветка не проверялась вовсе: findIsaacLogPath сразу бросал
// исключение, а ручного выбора файла в UI не было — панель лога оставалась
// пустой навсегда. Теперь префиксы Proton перебираются явно.

import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'

import { getSteamLibraryRoots, STEAM_APP_ID } from './steamLocator.js'

/** Папки сохранений игры, от самой новой версии к самой старой. */
const SAVE_DIR_NAMES = [
  'Binding of Isaac Repentance+',
  'Binding of Isaac Repentance',
  'Binding of Isaac Afterbirth+',
  'Binding of Isaac Rebirth'
]

/** Те же папки в нижнем регистре — так их называет нативная Linux-сборка. */
const LINUX_NATIVE_DIR_NAMES = SAVE_DIR_NAMES.map((n) => n.toLowerCase())

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Возвращает вероятный путь к log.txt игры для текущей ОС.
 * Бросает исключение, если ничего не нашлось — вызывающий код обязан в этом
 * случае предложить выбрать файл вручную (game:pickLogFile в main/index.js).
 */
export async function findIsaacLogPath() {
  for (const candidate of await getIsaacLogCandidates()) {
    if (await pathExists(candidate)) return candidate
  }

  throw new Error(
    'Не удалось автоматически найти log.txt. Укажите файл вручную — ' +
      'кнопка «Указать log.txt» рядом. Игра создаёт его при первом запуске, ' +
      'так что запустите её хотя бы раз.'
  )
}

/**
 * Полный список путей-кандидатов, в порядке проверки.
 * Вынесен отдельно, чтобы UI мог показать его пользователю, когда
 * автоопределение не сработало, — иначе искать файл руками не по чему.
 */
export async function getIsaacLogCandidates() {
  const platform = process.platform
  const home = os.homedir()
  const candidates = []

  if (platform === 'win32') {
    for (const dir of SAVE_DIR_NAMES) {
      candidates.push(path.join(home, 'Documents', 'My Games', dir, 'log.txt'))
      // OneDrive перенаправляет "Документы" к себе, и игра пишет уже туда.
      candidates.push(path.join(home, 'OneDrive', 'Documents', 'My Games', dir, 'log.txt'))
    }
  } else if (platform === 'darwin') {
    for (const dir of SAVE_DIR_NAMES) {
      candidates.push(path.join(home, 'Library', 'Application Support', dir, 'log.txt'))
    }
  } else {
    // Нативная Linux-сборка (только Rebirth/Afterbirth+).
    for (const dir of LINUX_NATIVE_DIR_NAMES) {
      candidates.push(path.join(home, '.local', 'share', dir, 'log.txt'))
    }
    // Proton — основной путь для Repentance/Repentance+ на Linux.
    candidates.push(...(await getProtonLogCandidates()))
  }

  return candidates
}

/**
 * Пути к log.txt внутри Wine-префикса Proton, по всем библиотекам Steam.
 * Внутри префикса домашняя папка пользователя называется steamuser, а
 * "Мои документы" в разных версиях Proton зовутся то Documents, то
 * "My Documents" — проверяем оба варианта.
 */
async function getProtonLogCandidates() {
  const candidates = []
  const documentsDirNames = ['Documents', 'My Documents']

  for (const libRoot of await getSteamLibraryRoots()) {
    const prefixHome = path.join(
      libRoot,
      'steamapps',
      'compatdata',
      STEAM_APP_ID,
      'pfx',
      'drive_c',
      'users',
      'steamuser'
    )
    for (const documents of documentsDirNames) {
      for (const dir of SAVE_DIR_NAMES) {
        candidates.push(path.join(prefixHome, documents, 'My Games', dir, 'log.txt'))
      }
    }
  }

  return candidates
}

/** Сколько последних байт уже существующего лога показать при старте слежения. */
const INITIAL_TAIL_BYTES = 64 * 1024

/**
 * Поллинг лога (без fs.watch — на сетевых/эмулированных ФС и при ротации
 * файла watch ведёт себя нестабильно между ОС, а под Proton файл лежит как
 * раз на эмулированной ФС). Раз в 500мс проверяем размер и дочитываем хвост.
 *
 * При старте отдаём последние INITIAL_TAIL_BYTES уже накопленного лога.
 * Раньше слежение начиналось строго с текущего конца файла: если игра успела
 * запуститься и упасть до того, как пользователь нажал кнопку, — а именно так
 * обычно и происходит, — панель не показывала ровно ничего.
 *
 * @returns {{stop: () => void}} — управление подпиской. Функция синхронная,
 *   чтобы вызывающий код не мог потерять ссылку на watcher.
 */
export function tailLogFile(logPath, onLine) {
  let lastSize = 0
  let stopped = false
  let reading = false

  const emitChunk = (text) => {
    for (const line of text.split(/\r?\n/)) {
      if (line.length > 0) onLine(line)
    }
  }

  const readRange = async (start, end) => {
    if (end <= start) return
    const stream = fsSync.createReadStream(logPath, { start, end: end - 1 })
    let buffer = ''
    for await (const chunk of stream) buffer += chunk.toString('utf-8')
    emitChunk(buffer)
  }

  const poll = async () => {
    // Тик может прийти, пока предыдущий ещё читает файл (медленная ФС под
    // Proton). Без этого флага два чтения гонятся за lastSize и дублируют строки.
    if (stopped || reading) return
    reading = true
    try {
      const stat = await fs.stat(logPath)
      if (stat.size < lastSize) {
        // Файл обрезан/пересоздан — игра перезапустилась, читаем с начала.
        lastSize = 0
      }
      if (stat.size > lastSize) {
        const from = lastSize
        lastSize = stat.size
        await readRange(from, stat.size)
      }
    } catch {
      // файла ещё нет / временно недоступен — просто ждём следующий тик
    } finally {
      reading = false
    }
  }

  // Первое чтение — синхронно по отношению к таймеру: интервал стартует
  // только после него, иначе первый тик мог обогнать инициализацию lastSize
  // и выдать весь файл целиком (а следом ещё раз — его хвост).
  const primed = (async () => {
    try {
      const stat = await fs.stat(logPath)
      const from = Math.max(0, stat.size - INITIAL_TAIL_BYTES)
      lastSize = stat.size
      await readRange(from, stat.size)
    } catch {
      lastSize = 0
    }
  })()

  let interval = null
  primed.then(() => {
    if (!stopped) interval = setInterval(poll, 500)
  })

  return {
    stop() {
      stopped = true
      if (interval) clearInterval(interval)
    }
  }
}
