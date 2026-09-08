import React from 'react'
import { useProjectStore } from '../../store/projectStore.js'
import { TARGET_VERSIONS } from '../../model/schema.js'

export default function MetaSettings() {
  const meta = useProjectStore((s) => s.project.meta)
  const updateMeta = useProjectStore((s) => s.updateMeta)

  return (
    <div>
      <h2>Настройки мода</h2>

      <div className="card">
        <label>Название мода</label>
        <input value={meta.modName} onChange={(e) => updateMeta({ modName: e.target.value })} />

        <label>ID мода (папка, латиница/цифры/дефис)</label>
        <input
          value={meta.modId}
          onChange={(e) => updateMeta({ modId: e.target.value.toLowerCase() })}
        />

        <label>Автор</label>
        <input value={meta.author} onChange={(e) => updateMeta({ author: e.target.value })} />

        <label>Описание</label>
        <textarea
          rows={3}
          value={meta.description}
          onChange={(e) => updateMeta({ description: e.target.value })}
        />
      </div>

      <div className="card">
        <label>Целевая версия игры</label>
        <select
          value={meta.targetVersion}
          onChange={(e) => updateMeta({ targetVersion: e.target.value })}
        >
          {TARGET_VERSIONS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        <p className="hint">
          От версии зависит, какие события/действия доступны в конструкторе правил — недоступные
          для выбранной версии просто не будут предложены.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={meta.repentogon}
            onChange={(e) => updateMeta({ repentogon: e.target.checked })}
          />
          Использовать REPENTOGON
        </label>
        <p className="hint">
          Включает дополнительные колбэки и действия, доступные только с установленным REPENTOGON.
          Игрокам без REPENTOGON такой мод работать не будет.
        </p>
      </div>
    </div>
  )
}
