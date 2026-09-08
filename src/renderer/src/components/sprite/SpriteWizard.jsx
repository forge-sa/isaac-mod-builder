import React, { useState } from 'react'
import { useProjectStore } from '../../store/projectStore.js'
import { getSpriteSpec } from '../../generator/spriteSpecs.js'
import { makeId } from '../../model/schema.js'

/**
 * Мастер импорта спрайта (см. docs/SPEC.md §6): выбрать PNG → проверить
 * размер под нужный `kind` → положить в модель как sprite-ресурс → (для
 * иконок предметов/трюков) сразу создать .anm2 из пресета, чтобы предмет
 * корректно отображался на полу, а не только в инвентаре.
 */
export default function SpriteWizard({ kind, selectedSpriteId, onSelect }) {
  const project = useProjectStore((s) => s.project)
  const addSprite = useProjectStore((s) => s.addSprite)
  const addAnm2 = useProjectStore((s) => s.addAnm2)
  const [warning, setWarning] = useState(null)

  const spec = getSpriteSpec(kind)
  const selectedSprite = project.resources.sprites.find((s) => s.id === selectedSpriteId) || null

  async function handlePick() {
    if (!window.modBuilder) {
      setWarning('Выбор файла доступен только внутри Electron-приложения.')
      return
    }
    const picked = await window.modBuilder.project.pickImage()
    if (picked.canceled) return

    setWarning(null)
    const dims = await readImageDimensions(picked.dataUrl)

    if (spec?.strict && (dims.width !== spec.width || dims.height !== spec.height)) {
      setWarning(
        `Изображение ${dims.width}×${dims.height}px, а для "${spec.label}" нужно ровно ` +
          `${spec.width}×${spec.height}px. Файл всё равно можно использовать, но в игре он ` +
          'скорее всего съедет/обрежется — пересохраните картинку с нужным размером.'
      )
    }

    const spriteId = makeId('spr')
    addSprite({ id: spriteId, kind, fileName: picked.fileName, dataUrl: picked.dataUrl })

    if (kind === 'collectible-icon' || kind === 'trinket-icon') {
      addAnm2({
        id: makeId('anm2'),
        kind: kind === 'trinket-icon' ? 'trinket' : 'collectible',
        preset: 'default-collectible',
        spriteRefs: { icon: spriteId }
      })
    }

    onSelect(spriteId)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {selectedSprite ? (
          <img className="sprite-preview" src={selectedSprite.dataUrl} alt={selectedSprite.fileName} />
        ) : (
          <div className="sprite-preview" />
        )}
        <div>
          <button onClick={handlePick}>{selectedSprite ? 'Заменить изображение' : 'Загрузить PNG'}</button>
          {selectedSprite && <div className="hint">{selectedSprite.fileName}</div>}
          {spec && (
            <div className="hint">
              {spec.strict
                ? `Требуемый размер: ${spec.width}×${spec.height}px`
                : 'Размер зависит от анимации — на MVP не проверяется автоматически'}
            </div>
          )}
        </div>
      </div>
      {warning && <div className="warning-banner">{warning}</div>}
    </div>
  )
}

function readImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = dataUrl
  })
}
