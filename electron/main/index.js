import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { findSteamModsFolder } from './steamLocator.js'
import { installMod } from './installMod.js'
import { tailLogFile, findIsaacLogPath, getIsaacLogCandidates } from './logTail.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'Isaac Mod Builder',
    webPreferences: {
      // electron-vite собирает preload в ESM (.mjs) при "type": "module" в
      // package.json — путь ниже должен совпадать с реальным именем файла
      // в out/preload/ (см. вывод `npm run build`).
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---------------------------------------------------------------------------
// IPC: файловый ввод-вывод для project.json
// ---------------------------------------------------------------------------

ipcMain.handle('project:save', async (_evt, { suggestedName, json }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Сохранить проект',
    defaultPath: suggestedName || 'project.json',
    filters: [{ name: 'Isaac Mod Builder Project', extensions: ['json'] }]
  })
  if (canceled || !filePath) return { canceled: true }
  await fs.writeFile(filePath, json, 'utf-8')
  return { canceled: false, filePath }
})

ipcMain.handle('project:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Открыть проект',
    filters: [{ name: 'Isaac Mod Builder Project', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return { canceled: true }
  const json = await fs.readFile(filePaths[0], 'utf-8')
  return { canceled: false, filePath: filePaths[0], json }
})

ipcMain.handle('project:pickImage', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Выбрать изображение',
    filters: [{ name: 'PNG', extensions: ['png'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return { canceled: true }
  const buffer = await fs.readFile(filePaths[0])
  return {
    canceled: false,
    filePath: filePaths[0],
    fileName: path.basename(filePaths[0]),
    dataUrl: `data:image/png;base64,${buffer.toString('base64')}`
  }
})

// ---------------------------------------------------------------------------
// IPC: экспорт собранного мода (файлы уже сгенерированы в renderer)
// ---------------------------------------------------------------------------

ipcMain.handle('mod:exportToFolder', async (_evt, { modId, files }) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Куда сохранить папку мода',
    properties: ['openDirectory', 'createDirectory']
  })
  if (canceled || filePaths.length === 0) return { canceled: true }
  const targetRoot = path.join(filePaths[0], modId)
  await writeFileMap(targetRoot, files)
  return { canceled: false, targetRoot }
})

async function writeFileMap(rootDir, files) {
  // files: { "main.lua": "...", "resources/gfx/x.png": { base64: "..." }, ... }
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    if (typeof content === 'string') {
      await fs.writeFile(fullPath, content, 'utf-8')
    } else if (content && typeof content.base64 === 'string') {
      await fs.writeFile(fullPath, Buffer.from(content.base64, 'base64'))
    }
  }
}

// ---------------------------------------------------------------------------
// IPC: «Установить и запустить» — см. docs/SPEC.md §8.
// НЕ ПРОТЕСТИРОВАНО в этой сессии: нет доступа к Steam/игре в песочнице.
// Логика реализована по документации модящего сообщества и требует проверки
// на реальной машине (см. docs/SPEC.md §11).
// ---------------------------------------------------------------------------

ipcMain.handle('game:locateModsFolder', async () => {
  try {
    const found = await findSteamModsFolder()
    return { ok: true, ...found }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) }
  }
})

ipcMain.handle('game:pickModsFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Укажите папку mods The Binding of Isaac: Rebirth вручную',
    properties: ['openDirectory']
  })
  if (canceled || filePaths.length === 0) return { canceled: true }
  return { canceled: false, modsFolder: filePaths[0] }
})

ipcMain.handle('game:installAndRun', async (_evt, { modsFolder, modId, files }) => {
  try {
    const { targetRoot, disabled } = await installMod({ modsFolder, modId, files })
    // 250900 — Steam AppID The Binding of Isaac: Rebirth.
    await shell.openExternal('steam://rungameid/250900')
    return { ok: true, targetRoot, disabled }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) }
  }
})

ipcMain.handle('game:findLogPath', async () => {
  try {
    const logPath = await findIsaacLogPath()
    return { ok: true, logPath }
  } catch (err) {
    // Отдаём и список проверенных путей: без него пользователю, у которого
    // автоопределение не сработало, негде подсмотреть, куда игра пишет лог.
    let checked = []
    try {
      checked = await getIsaacLogCandidates()
    } catch {
      // список путей — вспомогательная информация, его отсутствие не важно
    }
    return { ok: false, error: String(err && err.message ? err.message : err), checked }
  }
})

ipcMain.handle('game:pickLogFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Укажите log.txt игры',
    filters: [
      { name: 'Лог игры', extensions: ['txt'] },
      { name: 'Все файлы', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return { canceled: true }
  return { canceled: false, logPath: filePaths[0] }
})

let activeLogWatcher = null

ipcMain.handle('game:watchLog', async (evt, { logPath }) => {
  if (activeLogWatcher) {
    activeLogWatcher.stop()
    activeLogWatcher = null
  }
  if (!logPath) return { ok: false, error: 'Путь к log.txt не задан' }

  // Проверяем доступность файла здесь, а не молча внутри поллинга: иначе
  // опечатка в пути выглядит для пользователя ровно как "лог пустой".
  try {
    await fs.access(logPath)
  } catch {
    return { ok: false, error: `Файл не найден или недоступен: ${logPath}` }
  }

  activeLogWatcher = tailLogFile(logPath, (line) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('game:logLine', line)
    }
  })
  return { ok: true }
})

ipcMain.handle('game:stopWatchLog', async () => {
  if (activeLogWatcher) {
    activeLogWatcher.stop()
    activeLogWatcher = null
  }
  return { ok: true }
})
