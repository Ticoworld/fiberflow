import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    ...(mode === 'development' ? [devtools()] : []),
    tailwindcss(),
    tanstackStart(),
    nitro({ preset: 'node-server' }),
    viteReact(),
  ],
}))
