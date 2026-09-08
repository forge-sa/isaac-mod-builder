import React from 'react'
import { useProjectStore } from '../../store/projectStore.js'
import { ITEM_POOLS } from '../../data/itemPools.js'
import { ITEM_TAGS } from '../../data/itemTags.js'
import SpriteWizard from '../sprite/SpriteWizard.jsx'
import StatChangesEditor from './StatChangesEditor.jsx'
import RuleAttachment from './RuleAttachment.jsx'

export default function ActiveItemForm({ item }) {
  const updateItem = useProjectStore((s) => s.updateItem)
  const addStatChange = useProjectStore((s) => s.addStatChange)
  const updateStatChange = useProjectStore((s) => s.updateStatChange)
  const removeStatChange = useProjectStore((s) => s.removeStatChange)
  const toggleItemRule = useProjectStore((s) => s.toggleItemRule)

  const togglePool = (pool) => {
    const has = item.pools.includes(pool)
    updateItem(item.id, { pools: has ? item.pools.filter((p) => p !== pool) : [...item.pools, pool] })
  }
  const toggleTag = (tag) => {
    const has = item.itemTags.includes(tag)
    updateItem(item.id, {
      itemTags: has ? item.itemTags.filter((t) => t !== tag) : [...item.itemTags, tag]
    })
  }

  const useRules = item.ruleIds.filter((id) => {
    const rule = useProjectStore.getState().project.rules.find((r) => r.id === id)
    return rule?.when?.type === 'MC_USE_ITEM'
  })

  return (
    <div>
      <h2>Активный предмет</h2>

      <div className="card">
        <label>Название</label>
        <input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} />

        <label>Описание (подсказка в игре)</label>
        <textarea
          rows={2}
          value={item.description}
          onChange={(e) => updateItem(item.id, { description: e.target.value })}
        />

        <label>Иконка</label>
        <SpriteWizard
          kind="collectible-icon"
          selectedSpriteId={item.iconSpriteId}
          onSelect={(spriteId) => updateItem(item.id, { iconSpriteId: spriteId })}
        />
      </div>

      <div className="card">
        <div className="field-row">
          <div>
            <label>Тип зарядки</label>
            <select
              value={item.active?.chargeType || 'normal'}
              onChange={(e) =>
                updateItem(item.id, { active: { ...item.active, chargeType: e.target.value } })
              }
            >
              <option value="normal">Обычная</option>
              <option value="special">Особая (батарейки/двойные заряды считает игра сама)</option>
            </select>
          </div>
          <div>
            <label>Максимум зарядов</label>
            <input
              type="number"
              min={1}
              max={12}
              value={item.active?.maxCharges ?? 3}
              onChange={(e) =>
                updateItem(item.id, {
                  active: { ...item.active, maxCharges: Number(e.target.value) }
                })
              }
            />
          </div>
        </div>
        {useRules.length === 0 && (
          <p className="warning-banner" style={{ marginTop: 10 }}>
            У активного предмета пока нет правила "При использовании" — при нажатии кнопки
            использования в игре ничего не произойдёт. Добавьте правило ниже и выберите для него
            событие "При использовании активного предмета".
          </p>
        )}
      </div>

      <div className="card">
        <label>Пулы предметов</label>
        <div className="chip-list">
          {ITEM_POOLS.map((p) => (
            <span
              key={p.value}
              className={`chip ${item.pools.includes(p.value) ? 'selected' : ''}`}
              onClick={() => togglePool(p.value)}
            >
              {p.label}
            </span>
          ))}
        </div>

        <label>Теги</label>
        <div className="chip-list">
          {ITEM_TAGS.map((t) => (
            <span
              key={t.value}
              className={`chip ${item.itemTags.includes(t.value) ? 'selected' : ''}`}
              onClick={() => toggleTag(t.value)}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <StatChangesEditor
          statChanges={item.statChanges}
          onAdd={() => addStatChange(item.id)}
          onUpdate={(id, patch) => updateStatChange(item.id, id, patch)}
          onRemove={(id) => removeStatChange(item.id, id)}
        />
      </div>

      <div className="card">
        <RuleAttachment ownerId={item.id} ruleIds={item.ruleIds} onToggle={toggleItemRule} />
      </div>
    </div>
  )
}
