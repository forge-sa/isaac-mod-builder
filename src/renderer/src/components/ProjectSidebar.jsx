import React from 'react'
import { useProjectStore } from '../store/projectStore.js'

export default function ProjectSidebar() {
  const project = useProjectStore((s) => s.project)
  const selection = useProjectStore((s) => s.selection)
  const select = useProjectStore((s) => s.select)
  const addItem = useProjectStore((s) => s.addItem)
  const addTrinket = useProjectStore((s) => s.addTrinket)
  const addRule = useProjectStore((s) => s.addRule)
  const removeItem = useProjectStore((s) => s.removeItem)
  const removeTrinket = useProjectStore((s) => s.removeTrinket)
  const removeRule = useProjectStore((s) => s.removeRule)
  const loadProject = useProjectStore((s) => s.loadProject)
  const resetProject = useProjectStore((s) => s.resetProject)

  const isActive = (type, id) => selection?.type === type && selection?.id === id

  async function handleSave() {
    if (!window.modBuilder) return
    const json = JSON.stringify(project, null, 2)
    await window.modBuilder.project.save(`${project.meta.modId || 'project'}.json`, json)
  }

  async function handleOpen() {
    if (!window.modBuilder) return
    const result = await window.modBuilder.project.open()
    if (result.canceled) return
    try {
      const parsed = JSON.parse(result.json)
      loadProject(parsed)
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`Не удалось прочитать проект: ${err.message}`)
    }
  }

  return (
    <aside className="sidebar">
      <div className="toolbar">
        <button onClick={handleOpen} title="Открыть .json проекта">
          Открыть
        </button>
        <button onClick={handleSave} title="Сохранить проект как .json">
          Сохранить
        </button>
      </div>
      <button style={{ width: '100%' }} onClick={resetProject}>
        + Новый проект
      </button>

      <div
        className={`sidebar-item ${isActive('meta') ? 'active' : ''}`}
        onClick={() => select({ type: 'meta' })}
      >
        ⚙ Настройки мода
      </div>

      <h3>
        Предметы
        <span>
          <button onClick={() => addItem('passive')} title="Добавить пассивный предмет">
            + пассивный
          </button>{' '}
          <button onClick={() => addItem('active')} title="Добавить активный предмет">
            + активный
          </button>
        </span>
      </h3>
      {project.items.map((item) => (
        <SidebarRow
          key={item.id}
          active={isActive('item', item.id)}
          label={item.name}
          sub={item.kind === 'active' ? 'активный' : 'пассивный'}
          onClick={() => select({ type: 'item', id: item.id })}
          onRemove={() => removeItem(item.id)}
        />
      ))}

      <h3>
        Трюки
        <button onClick={addTrinket}>+</button>
      </h3>
      {project.trinkets.map((trinket) => (
        <SidebarRow
          key={trinket.id}
          active={isActive('trinket', trinket.id)}
          label={trinket.name}
          sub="трюк"
          onClick={() => select({ type: 'trinket', id: trinket.id })}
          onRemove={() => removeTrinket(trinket.id)}
        />
      ))}

      <h3>
        Правила
        <button onClick={addRule}>+</button>
      </h3>
      {project.rules.map((rule) => (
        <SidebarRow
          key={rule.id}
          active={isActive('rule', rule.id)}
          label={rule.name}
          sub={rule.when?.type || 'не задано'}
          onClick={() => select({ type: 'rule', id: rule.id })}
          onRemove={() => removeRule(rule.id)}
        />
      ))}

      <h3>Тестирование</h3>
      <div
        className={`sidebar-item ${isActive('install') ? 'active' : ''}`}
        onClick={() => select({ type: 'install' })}
      >
        ▶ Установить и запустить
      </div>
    </aside>
  )
}

function SidebarRow({ active, label, sub, onClick, onRemove }) {
  return (
    <div className={`sidebar-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span>
        {label} <small>· {sub}</small>
      </span>
      <button
        className="danger"
        style={{ padding: '1px 6px' }}
        onClick={(e) => {
          e.stopPropagation()
          if (confirm(`Удалить "${label}"?`)) onRemove()
        }}
      >
        ×
      </button>
    </div>
  )
}
