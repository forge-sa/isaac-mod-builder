import React, { useState } from 'react'
import { useProjectStore } from '../store/projectStore.js'

/**
 * Правая панель: сгенерированный код в режиме "только чтение" (см. docs/SPEC.md §9)
 * плюс диагностика валидации и экспорт готового мода в папку.
 */
export default function LuaPreview({ generated, errors }) {
  const project = useProjectStore((s) => s.project)
  const [activeFile, setActiveFile] = useState('main.lua')
  const [exportMessage, setExportMessage] = useState(null)

  const fileNames = Object.keys(generated.files)
  const content =
    typeof generated.files[activeFile] === 'string'
      ? generated.files[activeFile]
      : '(двоичный файл — изображение)'

  const canExport = errors.length === 0

  async function handleExport() {
    if (!window.modBuilder) {
      setExportMessage('Экспорт доступен только внутри Electron-приложения.')
      return
    }
    const result = await window.modBuilder.mod.exportToFolder(project.meta.modId, generated.files)
    if (result.canceled) return
    setExportMessage(`Мод сохранён в: ${result.targetRoot}`)
  }

  return (
    <aside className="preview-panel">
      <div className="preview-header">
        <select value={activeFile} onChange={(e) => setActiveFile(e.target.value)}>
          {fileNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button className="primary" onClick={handleExport} disabled={!canExport}>
          Экспортировать мод
        </button>
      </div>
      <pre>{content}</pre>
      <div className="diagnostics">
        {errors.length === 0 ? (
          <div className="ok-row">✓ Проект валиден, мод готов к экспорту</div>
        ) : (
          errors.map((err, i) => (
            <div key={i} className="error-row">
              {err.path}: {err.message}
            </div>
          ))
        )}
        {exportMessage && <div className="hint" style={{ marginTop: 6 }}>{exportMessage}</div>}
      </div>
    </aside>
  )
}
