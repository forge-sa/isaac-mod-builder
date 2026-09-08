import React from 'react'
import { useProjectStore } from '../../store/projectStore.js'
import SpriteWizard from '../sprite/SpriteWizard.jsx'
import StatChangesEditor from './StatChangesEditor.jsx'
import RuleAttachment from './RuleAttachment.jsx'

export default function TrinketForm({ trinket }) {
  const updateTrinket = useProjectStore((s) => s.updateTrinket)
  const addStatChange = useProjectStore((s) => s.addStatChange)
  const updateStatChange = useProjectStore((s) => s.updateStatChange)
  const removeStatChange = useProjectStore((s) => s.removeStatChange)
  const toggleTrinketRule = useProjectStore((s) => s.toggleTrinketRule)

  // Трюки хранятся в том же массиве stat-редактора, что и предметы, но
  // stat-редактор общий, поэтому оборачиваем экшены под сигнатуру item-стора.
  const wrappedAdd = () => addStatChange(trinket.id)
  const wrappedUpdate = (id, patch) => updateStatChange(trinket.id, id, patch)
  const wrappedRemove = (id) => removeStatChange(trinket.id, id)

  return (
    <div>
      <h2>Трюк (trinket)</h2>

      <div className="card">
        <label>Название</label>
        <input
          value={trinket.name}
          onChange={(e) => updateTrinket(trinket.id, { name: e.target.value })}
        />

        <label>Описание</label>
        <textarea
          rows={2}
          value={trinket.description}
          onChange={(e) => updateTrinket(trinket.id, { description: e.target.value })}
        />

        <label>Иконка</label>
        <SpriteWizard
          kind="trinket-icon"
          selectedSpriteId={trinket.iconSpriteId}
          onSelect={(spriteId) => updateTrinket(trinket.id, { iconSpriteId: spriteId })}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={trinket.goldenAllowed}
            onChange={(e) => updateTrinket(trinket.id, { goldenAllowed: e.target.checked })}
          />
          Может выпадать в золотом варианте
        </label>
      </div>

      <div className="card">
        <StatChangesEditor
          statChanges={trinket.statChanges}
          onAdd={wrappedAdd}
          onUpdate={wrappedUpdate}
          onRemove={wrappedRemove}
        />
      </div>

      <div className="card">
        <RuleAttachment ownerId={trinket.id} ruleIds={trinket.ruleIds} onToggle={toggleTrinketRule} />
      </div>
    </div>
  )
}
