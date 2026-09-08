import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// electron-vite собирает три независимых бандла: main-процесс, preload-скрипт
// и renderer (React-приложение). Держим main/preload максимально тонкими —
// вся бизнес-логика (модель проекта, генератор) живёт в renderer/src и не
// зависит от Electron API, поэтому её же можно гонять в unit-тестах через
// обычный Node (см. scripts/test-generator.mjs).
//
// Входные точки заданы АБСОЛЮТНЫМИ путями: electron-vite по умолчанию
// исключает из бандла всё, что похоже на импорт "electron/..." (регэксп
// /^electron\/.+/ в списке externals) — с относительным путём вида
// "electron/main/index.js" под это же правило по ошибке попадает сама точка
// входа. Абсолютный путь с этим паттерном не совпадает.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: { index: path.resolve(__dirname, 'electron/main/index.js') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: { index: path.resolve(__dirname, 'electron/preload/index.js') }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    build: {
      outDir: 'out/renderer'
    }
  }
})
