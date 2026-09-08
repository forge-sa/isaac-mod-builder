// LuaWriter — маленький построитель текста с построчным source map
// (см. docs/SPEC.md §5.4). Каждая записанная строка получает "адрес" —
// стек текущих блоков (правило → условие/действие), из которого потом
// строится человекочитаемое сообщение "Ошибка в блоке ... предмета ...".

export class LuaWriter {
  constructor() {
    this.lines = []
    this.stack = [] // [{ blockId, label }]
    /** @type {{line:number, blockId:string|null, blockPath:string[]}[]} */
    this.map = []
  }

  get indentLevel() {
    return this._indent || 0
  }

  set indentLevel(v) {
    this._indent = v
  }

  raw(text = '') {
    const prefix = '  '.repeat(this._indent || 0)
    this.lines.push(text === '' ? '' : prefix + text)
    this._recordMap()
    return this
  }

  blank() {
    this.lines.push('')
    this._recordMap()
    return this
  }

  indent() {
    this._indent = (this._indent || 0) + 1
    return this
  }

  dedent() {
    this._indent = Math.max(0, (this._indent || 0) - 1)
    return this
  }

  /** Помечает следующие строки (до matching leave()) как принадлежащие блоку. */
  enter(blockId, label) {
    this.stack.push({ blockId, label })
    return this
  }

  leave() {
    this.stack.pop()
    return this
  }

  _recordMap() {
    const top = this.stack[this.stack.length - 1]
    this.map.push({
      line: this.lines.length, // 1-based номер строки, как в log.txt
      blockId: top ? top.blockId : null,
      blockPath: this.stack.map((s) => s.label)
    })
  }

  toString() {
    return this.lines.join('\n') + '\n'
  }
}

/**
 * Находит в source map ближайший (на этой строке или выше) блок для номера
 * строки из ошибки в log.txt. Возвращает null, если строка вне сгенерированного
 * пользователем кода (например, в служебной шапке файла).
 */
export function resolveSourceLocation(sourceMap, lineNumber) {
  let best = null
  for (const entry of sourceMap) {
    if (entry.line > lineNumber) break
    if (entry.blockId) best = entry
  }
  return best
}
