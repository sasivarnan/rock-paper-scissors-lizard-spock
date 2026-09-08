import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/',
  plugins: [tailwindcss(), react(), babel({ presets: [reactCompilerPreset()] })],
})
