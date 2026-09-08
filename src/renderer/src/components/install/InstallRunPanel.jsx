import React, { useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '../../store/projectStore.js'
import { generate, resolveSourceLocation } from '../../generator/index.js'

/**
 * Панель "Установить и запустить" (см. docs/SPEC.md §8).
 *
 * НЕ ПРОТЕСТИРОВАНО В ЭТОЙ СЕССИИ: здесь нет доступа к Steam/игре, поэтому
 * весь цикл ниже — автоопределение папки mods, копирование, запуск через
 * steam://rungameid, чтение log.txt — реализован по документации сообщества
 * модов и должен быть перепроверен на реальной машине с игрой (см. docs/SPEC.md §11)
 * прежде чем полагаться на него в релизе.
 */
export default function InstallRunPanel() {
  const project = useProjectStore((s) => s.project)
  const errors = useProjectStore((s) => s.errors)
  const generated = useMemo(() => generate(project), [project])

  const [modsFolder, setModsFolder] = useState(null)
  const [locateStatus, setLocateStatus] = useState(null)
  const [logPath, setLogPath] = useState(null)
  const [logLines, setLogLines] = useState([])
  const [isWatching, setIsWatching] = useState(false)
  const [runStatus, setRunStatus] = useState(null)
  const [logStatus, setLogStatus] = useState(null)
  const [checkedLogPaths, setCheckedLogPaths] = useState([])
  const hasBridge = typeof window !== 'undefined' && !!window.modBuilder

  useEffect(() => {
    if (!hasBridge) return undefined
    const unsubscribe = window.modBuilder.game.onLogLine((line) => {
      setLogLines((prev) => [...prev.slice(-500), line])
    })
    return unsubscribe
  }, [hasBridge])

  async function handleLocate() {
    setLocateStatus('Ищу папку установки игры…')
    const result = await window.modBuilder.game.locateModsFolder()
    if (result.ok) {
      setModsFolder(result.modsFolder)
      setLocateStatus(`Найдено: ${result.modsFolder}`)
    } else {
      setLocateStatus(`Не найдено автоматически: ${result.error}`)
    }
  }

  async function handlePickManually() {
    const result = await window.modBuilder.game.pickModsFolder()
    if (!result.canceled) {
      setModsFolder(result.modsFolder)
      setLocateStatus(`Папка указана вручную: ${result.modsFolder}`)
    }
  }

  async function handleInstallAndRun() {
    setRunStatus('Копирую мод и запускаю игру…')
    const result = await window.modBuilder.game.installAndRun(
      modsFolder,
      project.meta.modId,
      generated.files
    )
    if (!result.ok) {
      setRunStatus(`Ошибка установки: ${result.error}`)
      return
    }
    setRunStatus(
      `Мод установлен в ${result.targetRoot}. Steam должен был открыть игру.` +
        (result.disabled
          ? ' ВНИМАНИЕ: в папке мода лежит disable.it — мод выключен в меню модов самой игры ' +
            'и загружен не будет. Включите его в игре: Mods → выбрать мод → Enable.'
          : '')
    )

    await handleStartWatching()
  }

  /** Включает слежение за логом. Работает и само по себе, без установки мода:
   *  игра может быть уже запущена, а лог — уже содержать нужную ошибку. */
  async function handleStartWatching() {
    setLogStatus('Ищу log.txt…')
    setCheckedLogPaths([])

    let targetPath = logPath
    if (!targetPath) {
      const logResult = await window.modBuilder.game.findLogPath()
      if (!logResult.ok) {
        setLogStatus(logResult.error)
        setCheckedLogPaths(logResult.checked || [])
        return
      }
      targetPath = logResult.logPath
    }

    await startWatching(targetPath)
  }

  async function handlePickLogFile() {
    const result = await window.modBuilder.game.pickLogFile()
    if (result.canceled) return
    await startWatching(result.logPath)
  }

  async function startWatching(targetPath) {
    const watchResult = await window.modBuilder.game.watchLog(targetPath)
    if (!watchResult.ok) {
      setLogStatus(watchResult.error)
      setIsWatching(false)
      return
    }
    setLogPath(targetPath)
    setLogStatus(null)
    setCheckedLogPaths([])
    setIsWatching(true)
  }

  async function handleStopWatching() {
    await window.modBuilder.game.stopWatchLog()
    setIsWatching(false)
  }

  const canInstall = errors.length === 0 && !!modsFolder

  return (
    <div>
      <h2>Установить и запустить</h2>
      <div className="warning-banner">
        Этот блок реализован в коде, но не проверен вживую в среде, где собиралось приложение —
        нет доступа к Steam/игре. Перед тем как полагаться на него, прогоните весь цикл руками на
        своей машине хотя бы раз (см. docs/SPEC.md §8, §11).
      </div>

      {!hasBridge && (
        <p className="warning-banner">
          Эта панель работает только внутри собранного Electron-приложения (npm run dev / build) —
          в браузерном превью нет доступа к файловой системе и Steam.
        </p>
      )}

      <div className="card">
        <label>Папка mods игры</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleLocate} disabled={!hasBridge}>
            Найти автоматически
          </button>
          <button onClick={handlePickManually} disabled={!hasBridge}>
            Указать вручную
          </button>
        </div>
        {locateStatus && <p className="hint">{locateStatus}</p>}
        {modsFolder && <p className="hint">Текущая папка: {modsFolder}</p>}
      </div>

      <div className="card">
        {errors.length > 0 && (
          <p className="warning-banner">
            Сначала исправьте {errors.length} {errors.length === 1 ? 'ошибку' : 'ошибки'} проекта
            (см. панель справа) — до этого экспорт и установка недоступны.
          </p>
        )}
        <button className="primary" onClick={handleInstallAndRun} disabled={!canInstall || !hasBridge}>
          ▶ Установить и запустить игру
        </button>
        {runStatus && <p className="hint">{runStatus}</p>}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ margin: 0 }}>Лог игры</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {isWatching ? (
              <button onClick={handleStopWatching} disabled={!hasBridge}>
                Остановить слежение
              </button>
            ) : (
              <button onClick={handleStartWatching} disabled={!hasBridge}>
                Следить за логом
              </button>
            )}
            <button onClick={handlePickLogFile} disabled={!hasBridge}>
              Указать log.txt
            </button>
          </div>
        </div>

        {logPath && <p className="hint">Файл: {logPath}</p>}
        {logStatus && <p className="warning-banner">{logStatus}</p>}
        {checkedLogPaths.length > 0 && (
          <details>
            <summary className="hint">Где искали log.txt ({checkedLogPaths.length} путей)</summary>
            <pre style={{ fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {checkedLogPaths.join('\n')}
            </pre>
          </details>
        )}

        <LogView lines={logLines} sourceMap={generated.sourceMap} />
      </div>
    </div>
  )
}

const LUA_ERROR_RE = /main\.lua:(\d+):/

function LogView({ lines, sourceMap }) {
  if (lines.length === 0) {
    return <p className="hint">Пока нет строк лога — они появятся здесь после запуска игры.</p>
  }
  return (
    <div style={{ maxHeight: 260, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
      {lines.map((line, i) => {
        const match = line.match(LUA_ERROR_RE)
        const located = match ? resolveSourceLocation(sourceMap, Number(match[1])) : null
        return (
          <div key={i} style={{ marginBottom: 4 }}>
            <div style={{ color: located ? '#d34a4a' : 'inherit' }}>{line}</div>
            {located && (
              <div className="hint">
                → Похоже, это блок «{located.blockPath.join(' → ')}» (main.lua:{match[1]})
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
