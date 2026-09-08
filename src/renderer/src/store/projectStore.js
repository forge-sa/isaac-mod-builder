// Zustand-хранилище — тонкая обёртка вокруг model/schema.js (см. docs/SPEC.md §3).
// Компоненты никогда не мутируют project напрямую — только через эти экшены,
// чтобы структура project.json оставалась предсказуемой и валидируемой.

import { create } from 'zustand'
import {
  createEmptyProject,
  createPassiveItem,
  createActiveItem,
  createTrinket,
  createRule,
  createStatChange,
  validateProject
} from '../model/schema.js'

function withRevalidation(project) {
  return { project, errors: validateProject(project) }
}

export const useProjectStore = create((set, get) => ({
  project: createEmptyProject(),
  errors: [],
  selection: null, // { type: 'item'|'trinket'|'rule'|'meta'|'install', id?: string }

  // -- проект целиком ------------------------------------------------------
  loadProject(project) {
    set({ ...withRevalidation(project), selection: null })
  },
  resetProject() {
    set({ ...withRevalidation(createEmptyProject()), selection: null })
  },
  select(selection) {
    set({ selection })
  },
  updateMeta(patch) {
    set((s) => withRevalidation({ ...s.project, meta: { ...s.project.meta, ...patch } }))
  },

  // -- ресурсы ---------------------------------------------------------------
  addSprite(sprite) {
    set((s) => withRevalidation({
      ...s.project,
      resources: { ...s.project.resources, sprites: [...s.project.resources.sprites, sprite] }
    }))
    return sprite.id
  },
  removeSprite(spriteId) {
    set((s) => withRevalidation({
      ...s.project,
      resources: {
        ...s.project.resources,
        sprites: s.project.resources.sprites.filter((sp) => sp.id !== spriteId)
      }
    }))
  },
  addAnm2(entry) {
    set((s) => withRevalidation({
      ...s.project,
      resources: { ...s.project.resources, anm2: [...s.project.resources.anm2, entry] }
    }))
  },

  // -- предметы ---------------------------------------------------------------
  addItem(kind) {
    const item = kind === 'active' ? createActiveItem() : createPassiveItem()
    set((s) => withRevalidation({ ...s.project, items: [...s.project.items, item] }))
    set({ selection: { type: 'item', id: item.id } })
    return item.id
  },
  updateItem(id, patch) {
    set((s) => withRevalidation({
      ...s.project,
      items: s.project.items.map((it) => (it.id === id ? { ...it, ...patch } : it))
    }))
  },
  removeItem(id) {
    set((s) => withRevalidation({ ...s.project, items: s.project.items.filter((it) => it.id !== id) }))
    if (get().selection?.id === id) set({ selection: null })
  },
  // ownerId может принадлежать как project.items, так и project.trinkets —
  // statChanges/EvaluateCache устроены одинаково для обоих (см. docs/SPEC.md §5.3),
  // поэтому редактор статов (StatChangesEditor) один на оба случая.
  addStatChange(ownerId) {
    const sc = createStatChange()
    set((s) => withRevalidation({
      ...s.project,
      items: s.project.items.map((it) =>
        it.id === ownerId ? { ...it, statChanges: [...it.statChanges, sc] } : it
      ),
      trinkets: s.project.trinkets.map((t) =>
        t.id === ownerId ? { ...t, statChanges: [...t.statChanges, sc] } : t
      )
    }))
  },
  updateStatChange(ownerId, statId, patch) {
    set((s) => withRevalidation({
      ...s.project,
      items: s.project.items.map((it) =>
        it.id !== ownerId
          ? it
          : { ...it, statChanges: it.statChanges.map((sc) => (sc.id === statId ? { ...sc, ...patch } : sc)) }
      ),
      trinkets: s.project.trinkets.map((t) =>
        t.id !== ownerId
          ? t
          : { ...t, statChanges: t.statChanges.map((sc) => (sc.id === statId ? { ...sc, ...patch } : sc)) }
      )
    }))
  },
  removeStatChange(ownerId, statId) {
    set((s) => withRevalidation({
      ...s.project,
      items: s.project.items.map((it) =>
        it.id !== ownerId ? it : { ...it, statChanges: it.statChanges.filter((sc) => sc.id !== statId) }
      ),
      trinkets: s.project.trinkets.map((t) =>
        t.id !== ownerId ? t : { ...t, statChanges: t.statChanges.filter((sc) => sc.id !== statId) }
      )
    }))
  },
  toggleItemRule(itemId, ruleId) {
    set((s) => withRevalidation({
      ...s.project,
      items: s.project.items.map((it) => {
        if (it.id !== itemId) return it
        const has = it.ruleIds.includes(ruleId)
        return { ...it, ruleIds: has ? it.ruleIds.filter((r) => r !== ruleId) : [...it.ruleIds, ruleId] }
      })
    }))
  },

  // -- трюки -------------------------------------------------------------------
  addTrinket() {
    const trinket = createTrinket()
    set((s) => withRevalidation({ ...s.project, trinkets: [...s.project.trinkets, trinket] }))
    set({ selection: { type: 'trinket', id: trinket.id } })
    return trinket.id
  },
  updateTrinket(id, patch) {
    set((s) => withRevalidation({
      ...s.project,
      trinkets: s.project.trinkets.map((t) => (t.id === id ? { ...t, ...patch } : t))
    }))
  },
  removeTrinket(id) {
    set((s) => withRevalidation({ ...s.project, trinkets: s.project.trinkets.filter((t) => t.id !== id) }))
    if (get().selection?.id === id) set({ selection: null })
  },
  toggleTrinketRule(trinketId, ruleId) {
    set((s) => withRevalidation({
      ...s.project,
      trinkets: s.project.trinkets.map((t) => {
        if (t.id !== trinketId) return t
        const has = t.ruleIds.includes(ruleId)
        return { ...t, ruleIds: has ? t.ruleIds.filter((r) => r !== ruleId) : [...t.ruleIds, ruleId] }
      })
    }))
  },

  // -- правила ------------------------------------------------------------------
  addRule() {
    const rule = createRule()
    set((s) => withRevalidation({ ...s.project, rules: [...s.project.rules, rule] }))
    set({ selection: { type: 'rule', id: rule.id } })
    return rule.id
  },
  updateRule(id, patch) {
    set((s) => withRevalidation({
      ...s.project,
      rules: s.project.rules.map((r) => (r.id === id ? { ...r, ...patch } : r))
    }))
  },
  removeRule(id) {
    set((s) => withRevalidation({
      ...s.project,
      rules: s.project.rules.filter((r) => r.id !== id),
      items: s.project.items.map((it) => ({ ...it, ruleIds: it.ruleIds.filter((r) => r !== id) })),
      trinkets: s.project.trinkets.map((t) => ({ ...t, ruleIds: t.ruleIds.filter((r) => r !== id) }))
    }))
    if (get().selection?.id === id) set({ selection: null })
  },
  setRuleWhen(ruleId, when) {
    set((s) => withRevalidation({
      ...s.project,
      rules: s.project.rules.map((r) =>
        r.id === ruleId ? { ...r, when, conditions: [], actions: r.actions } : r
      )
    }))
  },
  addCondition(ruleId, condition) {
    set((s) => withRevalidation({
      ...s.project,
      rules: s.project.rules.map((r) =>
        r.id === ruleId ? { ...r, conditions: [...r.conditions, condition] } : r
      )
    }))
  },
  updateCondition(ruleId, conditionId, patch) {
    set((s) => withRevalidation({
      ...s.project,
      rules: s.project.rules.map((r) =>
        r.id !== ruleId
          ? r
          : {
              ...r,
              conditions: r.conditions.map((c) => (c.id === conditionId ? { ...c, ...patch } : c))
            }
      )
    }))
  },
  removeCondition(ruleId, conditionId) {
    set((s) => withRevalidation({
      ...s.project,
      rules: s.project.rules.map((r) =>
        r.id !== ruleId ? r : { ...r, conditions: r.conditions.filter((c) => c.id !== conditionId) }
      )
    }))
  },
  addAction(ruleId, action) {
    set((s) => withRevalidation({
      ...s.project,
      rules: s.project.rules.map((r) => (r.id === ruleId ? { ...r, actions: [...r.actions, action] } : r))
    }))
  },
  updateAction(ruleId, actionId, patch) {
    set((s) => withRevalidation({
      ...s.project,
      rules: s.project.rules.map((r) =>
        r.id !== ruleId
          ? r
          : { ...r, actions: r.actions.map((a) => (a.id === actionId ? { ...a, ...patch } : a)) }
      )
    }))
  },
  removeAction(ruleId, actionId) {
    set((s) => withRevalidation({
      ...s.project,
      rules: s.project.rules.map((r) =>
        r.id !== ruleId ? r : { ...r, actions: r.actions.filter((a) => a.id !== actionId) }
      )
    }))
  }
}))
