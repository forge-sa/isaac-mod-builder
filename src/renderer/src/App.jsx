import React, { useMemo } from 'react'
import { useProjectStore } from './store/projectStore.js'
import { generate } from './generator/index.js'
import ProjectSidebar from './components/ProjectSidebar.jsx'
import MetaSettings from './components/settings/MetaSettings.jsx'
import PassiveItemForm from './components/templates/PassiveItemForm.jsx'
import ActiveItemForm from './components/templates/ActiveItemForm.jsx'
import TrinketForm from './components/templates/TrinketForm.jsx'
import RuleEditor from './components/rules/RuleEditor.jsx'
import LuaPreview from './components/LuaPreview.jsx'
import InstallRunPanel from './components/install/InstallRunPanel.jsx'
import EmptyState from './components/EmptyState.jsx'

export default function App() {
  const project = useProjectStore((s) => s.project)
  const selection = useProjectStore((s) => s.selection)
  const errors = useProjectStore((s) => s.errors)

  // Пересчитывать генерацию на каждое изменение проекта — это то самое
  // "детерминированно и дёшево", о котором в docs/SPEC.md §1: генератор
  // достаточно лёгкий, чтобы гонять его на каждый чих без дебаунса.
  const generated = useMemo(() => generate(project), [project])

  return (
    <div className="app-shell">
      <ProjectSidebar />
      <main className="main-panel">
        <SelectionPanel selection={selection} />
      </main>
      <LuaPreview generated={generated} errors={errors} />
    </div>
  )
}

function SelectionPanel({ selection }) {
  const project = useProjectStore((s) => s.project)

  if (!selection) return <EmptyState />

  if (selection.type === 'meta') return <MetaSettings />
  if (selection.type === 'install') return <InstallRunPanel />

  if (selection.type === 'item') {
    const item = project.items.find((it) => it.id === selection.id)
    if (!item) return <EmptyState />
    return item.kind === 'active' ? <ActiveItemForm item={item} /> : <PassiveItemForm item={item} />
  }

  if (selection.type === 'trinket') {
    const trinket = project.trinkets.find((t) => t.id === selection.id)
    if (!trinket) return <EmptyState />
    return <TrinketForm trinket={trinket} />
  }

  if (selection.type === 'rule') {
    const rule = project.rules.find((r) => r.id === selection.id)
    if (!rule) return <EmptyState />
    return <RuleEditor rule={rule} />
  }

  return <EmptyState />
}
