import React from 'react'
import { useProjectStore } from '../../store/projectStore.js'
import { ITEM_POOLS } from '../../data/itemPools.js'
import { ITEM_TAGS } from '../../data/itemTags.js'
import SpriteWizard from '../sprite/SpriteWizard.jsx'
import StatChangesEditor from './StatChangesEditor.jsx'
import RuleAttachment from './RuleAttachment.jsx'

export default function PassiveItemForm({ item }) {
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

  return (
    <div>
      <h2>Пассивный предмет</h2>

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
