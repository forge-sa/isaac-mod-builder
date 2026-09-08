import React from 'react'
import { useProjectStore } from '../../store/projectStore.js'

/**
 * Список чекбоксов "какие правила привязаны к этому предмету/трюку".
 * Реальная связь item↔rule хранится как item.ruleIds (см. docs/SPEC.md §3);
 * MC_USE_ITEM-правила при этом обязаны быть привязаны ровно к одному
 * активному предмету — это проверяет model/schema.js validateProject.
 */
export default function RuleAttachment({ ownerId, ruleIds, onToggle }) {
  const rules = useProjectStore((s) => s.project.rules)
  const select = useProjectStore((s) => s.select)
  const addRule = useProjectStore((s) => s.addRule)

  return (
    <div>
      <label>Привязанные правила (Когда → Если → То)</label>
      {rules.length === 0 && <p className="hint">Правил ещё нет.</p>}
      <div className="chip-list">
        {rules.map((rule) => (
          <span
            key={rule.id}
            className={`chip ${ruleIds.includes(rule.id) ? 'selected' : ''}`}
            onClick={() => onToggle(ownerId, rule.id)}
            title={rule.when?.type || 'событие не задано'}
          >
            {rule.name}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => addRule()}>+ Новое правило</button>
        {ruleIds.length > 0 && (
          <button onClick={() => select({ type: 'rule', id: ruleIds[0] })}>
            Открыть первое привязанное правило
          </button>
        )}
      </div>
    </div>
  )
}
