import React from 'react'

export default function EmptyState() {
  return (
    <div>
      <h2>Ничего не выбрано</h2>
      <p className="hint">
        Выберите пункт слева, или создайте предмет, трюк или правило кнопками сверху списка.
      </p>
    </div>
  )
}
