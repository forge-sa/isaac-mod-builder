import React from 'react'
import { useProjectStore } from '../../store/projectStore.js'
import { CALLBACKS } from '../../data/callbacks.js'
import { conditionsForCallback, getCondition } from '../../data/conditions.js'
import { ACTIONS, getAction } from '../../data/actions.js'
import { filterByVersion } from '../../data/versionDiffs.js'
import { makeId } from '../../model/schema.js'
import ParamField from './ParamField.jsx'

function defaultParams(schema) {
  const params = {}
  for (const field of schema) {
    if ('default' in field) params[field.key] = field.default
  }
  return params
}

export default function RuleEditor({ rule }) {
  const project = useProjectStore((s) => s.project)
  const updateRule = useProjectStore((s) => s.updateRule)
  const setRuleWhen = useProjectStore((s) => s.setRuleWhen)
  const addCondition = useProjectStore((s) => s.addCondition)
  const updateCondition = useProjectStore((s) => s.updateCondition)
  const removeCondition = useProjectStore((s) => s.removeCondition)
  const addAction = useProjectStore((s) => s.addAction)
  const updateAction = useProjectStore((s) => s.updateAction)
  const removeAction = useProjectStore((s) => s.removeAction)

  const availableCallbacks = filterByVersion(CALLBACKS, project)
  const availableConditions = rule.when?.type ? conditionsForCallback(rule.when.type) : []

  const owners = [...project.items, ...project.trinkets].filter((o) => o.ruleIds.includes(rule.id))

  function handleAddCondition() {
    const first = availableConditions[0]
    if (!first) return
    addCondition(rule.id, {
      id: makeId('cond'),
      type: first.type,
      params: defaultParams(first.paramsSchema)
    })
  }

  function handleAddAction() {
    const first = ACTIONS[0]
    addAction(rule.id, {
      id: makeId('act'),
      type: first.type,
      params: defaultParams(first.paramsSchema)
    })
  }

  return (
    <div>
      <h2>Правило</h2>

      <div className="card">
        <label>Название правила</label>
        <input value={rule.name} onChange={(e) => updateRule(rule.id, { name: e.target.value })} />
        <div className="hint">
          Привязано к: {owners.length ? owners.map((o) => o.name).join(', ') : 'ничему — откройте предмет/трюк и включите это правило в списке "Привязанные правила"'}
        </div>
      </div>

      <div className="card">
        <label>Когда</label>
        <select
          value={rule.when?.type || ''}
          onChange={(e) => setRuleWhen(rule.id, { type: e.target.value, params: {} })}
        >
          <option value="" disabled>
            Выберите событие…
          </option>
          {availableCallbacks.map((cb) => (
            <option key={cb.type} value={cb.type}>
              {cb.label}
            </option>
          ))}
        </select>
        {rule.when?.type && (
          <p className="hint">{CALLBACKS.find((c) => c.type === rule.when.type)?.description}</p>
        )}
        {rule.when?.type === 'MC_USE_ITEM' && owners.length !== 1 && (
          <p className="warning-banner">
            Это событие должно быть привязано ровно к одному активному предмету — иначе генератор
            не сможет понять, для какого предмета регистрировать обработчик.
          </p>
        )}
      </div>

      <div className="card">
        <label>Если (все условия должны выполняться)</label>
        {rule.conditions.length === 0 && <p className="hint">Условий нет — действия сработают всегда.</p>}
        {rule.conditions.map((condition) => {
          const meta = getCondition(condition.type)
          return (
            <div key={condition.id} className="rule-block">
              <div className="rule-block-header">
                <span>Условие</span>
                <button className="danger" onClick={() => removeCondition(rule.id, condition.id)}>
                  Удалить
                </button>
              </div>
              <select
                value={condition.type}
                onChange={(e) => {
                  const nextMeta = getCondition(e.target.value)
                  updateCondition(rule.id, condition.id, {
                    type: e.target.value,
                    params: defaultParams(nextMeta.paramsSchema)
                  })
                }}
              >
                {availableConditions.map((c) => (
                  <option key={c.type} value={c.type}>
                    {c.label}
                  </option>
                ))}
              </select>
              {meta?.paramsSchema.map((field) => (
                <div key={field.key} style={{ marginTop: 8 }}>
                  <label>{field.label}</label>
                  <ParamField
                    field={field}
                    value={condition.params[field.key]}
                    onChange={(value) =>
                      updateCondition(rule.id, condition.id, {
                        params: { ...condition.params, [field.key]: value }
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )
        })}
        <button onClick={handleAddCondition} disabled={!rule.when?.type}>
          + Условие
        </button>
        {!rule.when?.type && <p className="hint">Сначала выберите "Когда".</p>}
      </div>

      <div className="card">
        <label>То (выполняется по порядку)</label>
        {rule.actions.length === 0 && (
          <p className="warning-banner">У правила должно быть хотя бы одно действие.</p>
        )}
        {rule.actions.map((action) => {
          const meta = getAction(action.type)
          return (
            <div key={action.id} className="rule-block">
              <div className="rule-block-header">
                <span>Действие</span>
                <button className="danger" onClick={() => removeAction(rule.id, action.id)}>
                  Удалить
                </button>
              </div>
              <select
                value={action.type}
                onChange={(e) => {
                  const nextMeta = getAction(e.target.value)
                  updateAction(rule.id, action.id, {
                    type: e.target.value,
                    params: defaultParams(nextMeta.paramsSchema)
                  })
                }}
              >
                {ACTIONS.map((a) => (
                  <option key={a.type} value={a.type}>
                    {a.label}
                  </option>
                ))}
              </select>
              {meta?.description && <p className="hint">{meta.description}</p>}
              {meta?.paramsSchema.map((field) => (
                <div key={field.key} style={{ marginTop: 8 }}>
                  <label>{field.label}</label>
                  <ParamField
                    field={field}
                    value={action.params[field.key]}
                    onChange={(value) =>
                      updateAction(rule.id, action.id, {
                        params: { ...action.params, [field.key]: value }
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )
        })}
        <button onClick={handleAddAction}>+ Действие</button>
      </div>
    </div>
  )
}
