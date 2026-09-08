import React from 'react'
import { useProjectStore } from '../../store/projectStore.js'
import { ENTITY_TYPES } from '../../data/entityTypes.js'
import { SOUND_IDS } from '../../data/soundIds.js'
import { ROOM_TYPES } from '../../data/roomTypes.js'

/**
 * Рендерит одно поле формы условия/действия по описанию из paramsSchema
 * (см. src/data/conditions.js, src/data/actions.js). Один компонент на все
 * типы полей — новый тип виджета добавляется одним case здесь.
 */
export default function ParamField({ field, value, onChange }) {
  const project = useProjectStore((s) => s.project)

  switch (field.type) {
    case 'number':
      return (
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step || 1}
          value={value ?? field.default ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )

    case 'select':
      return (
        <select value={value ?? field.default ?? ''} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )

    case 'itemPicker': {
      const candidates = project.items.filter(
        (it) => !field.filterKind || field.filterKind.includes(it.kind)
      )
      return (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Выберите предмет…
          </option>
          {candidates.map((it) => (
            <option key={it.id} value={it.id}>
              {it.name}
            </option>
          ))}
        </select>
      )
    }

    case 'entityPicker':
      return (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Выберите сущность…
          </option>
          {ENTITY_TYPES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      )

    case 'soundPicker':
      return (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {SOUND_IDS.map((snd) => (
            <option key={snd.value} value={snd.value}>
              {snd.label}
            </option>
          ))}
        </select>
      )

    case 'roomTypePicker':
      return (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {ROOM_TYPES.map((rt) => (
            <option key={rt.value} value={rt.value}>
              {rt.label}
            </option>
          ))}
        </select>
      )

    default:
      return <span className="hint">Неизвестный тип поля: {field.type}</span>
  }
}
