// Порядок версий игры для сравнения "доступно с X" — см. docs/SPEC.md §7, §9.
// Repentance+ полностью совместим по API с Repentance для целей этого
// приложения (изменения Rep+ в основном графические/QoL), поэтому в каталоге
// используется одна отметка "repentance" для обеих, если не понадобится
// более тонкое разделение в будущем.
const VERSION_ORDER = ['afterbirth-plus', 'repentance', 'repentance-plus']

export function isVersionAtLeast(targetVersion, minVersion) {
  const targetIdx = VERSION_ORDER.indexOf(targetVersion)
  const minIdx = VERSION_ORDER.indexOf(minVersion)
  if (targetIdx === -1 || minIdx === -1) return true
  return targetIdx >= minIdx
}

/** Фильтрует каталог (колбэков/действий/условий) по выбранной версии проекта. */
export function filterByVersion(catalog, project) {
  const targetVersion = project?.meta?.targetVersion || 'repentance-plus'
  const repentogon = !!project?.meta?.repentogon
  return catalog.filter((entry) => {
    if (entry.repentogonOnly && !repentogon) return false
    if (entry.availableFrom && !isVersionAtLeast(targetVersion, entry.availableFrom)) return false
    return true
  })
}
