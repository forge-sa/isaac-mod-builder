import React from 'react'
import { STATS } from '../../data/cacheFlags.js'

const OPS = [
  { value: 'add', label: 'прибавить' },
  { value: 'multiply', label: 'умножить на' },
  { value: 'set', label: 'установить в' }
]

/**
 * Общий редактор statChanges — используется и предметами, и трюками.
 * Реальная арифметика/EvaluateCache собирается генератором
 * (см. src/generator/luaGen.js emitStatChanges) — здесь только форма.
 */
export default function StatChangesEditor({ statChanges, onAdd, onUpdate, onRemove }) {
  return (
    <div>
      <label>Изменение статов игрока (пока предмет надет/трюк в наличии)</label>
      {statChanges.length === 0 && <p className="hint">Статы не меняются.</p>}
      {statChanges.map((sc) => (
        <div key={sc.id} className="field-row" style={{ marginBottom: 6, alignItems: 'center' }}>
          <select value={sc.stat} onChange={(e) => onUpdate(sc.id, { stat: e.target.value })}>
            {STATS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={sc.op} onChange={(e) => onUpdate(sc.id, { op: e.target.value })}>
            {OPS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={sc.value}
            onChange={(e) => onUpdate(sc.id, { value: Number(e.target.value) })}
          />
          <button className="danger" onClick={() => onRemove(sc.id)}>
            Удалить
          </button>
        </div>
      ))}
      <button onClick={onAdd}>+ Изменение стата</button>
    </div>
  )
}
