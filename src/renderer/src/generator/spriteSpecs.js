// Требования к размеру спрайтов по типу ресурса — см. docs/SPEC.md §6.
// ВАЖНО: 32×32 для иконки предмета — устоявшийся, хорошо задокументированный
// размер в моддинге Rebirth. Размеры для костюмов/спрайтшитов сильно зависят
// от типа сущности и разметки анимации — на MVP они не валидируются жёстко,
// мастер только предупреждает и просит проверить вручную (см. docs/SPEC.md §11).

/** Корень путей к графике в items.xml (атрибут gfxroot у <items>).
 *  Всё, что стоит в gfx="..." у конкретного предмета, игра склеивает с ним:
 *  gfxroot + gfx = путь внутри resources/ папки мода. */
export const ITEMS_XML_GFX_ROOT = 'gfx/items/'

export const SPRITE_SPECS = {
  'collectible-icon': {
    label: 'Иконка предмета (инвентарь/HUD)',
    width: 32,
    height: 32,
    strict: true,
    // Куда файл кладётся в папке мода...
    gfxPathPrefix: 'resources/gfx/items/collectibles/',
    // ...и как на него ссылается items.xml относительно ITEMS_XML_GFX_ROOT.
    gfxRefPrefix: 'collectibles/'
  },
  'trinket-icon': {
    label: 'Иконка трюка',
    width: 32,
    height: 32,
    strict: true,
    gfxPathPrefix: 'resources/gfx/items/trinkets/',
    gfxRefPrefix: 'trinkets/'
  },
  'pickup-spritesheet': {
    label: 'Спрайтшит предмета на полу (для .anm2)',
    width: null,
    height: null,
    strict: false,
    gfxPathPrefix: 'resources/gfx/items/collectibles/',
    gfxRefPrefix: 'collectibles/'
  }
}

export function getSpriteSpec(kind) {
  return SPRITE_SPECS[kind] || null
}

const FALLBACK_SPEC = SPRITE_SPECS['collectible-icon']

/** Путь файла спрайта внутри папки мода: "resources/gfx/items/collectibles/x.png". */
export function spriteOutputPath(sprite) {
  const spec = getSpriteSpec(sprite?.kind) || FALLBACK_SPEC
  return `${spec.gfxPathPrefix}${sprite.fileName}`
}

/** Значение атрибута gfx="..." в items.xml: "collectibles/x.png".
 *  Раньше сюда шло голое имя файла, а у <items> не было gfxroot — игра искала
 *  спрайт в resources/gfx/x.png, не находила и падала при загрузке мода. */
export function spriteGfxRef(sprite) {
  const spec = getSpriteSpec(sprite?.kind) || FALLBACK_SPEC
  return `${spec.gfxRefPrefix}${sprite.fileName}`
}
