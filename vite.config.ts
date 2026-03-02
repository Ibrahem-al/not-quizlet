import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseDotenv } from 'dotenv'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Resolve project root: dir that has both package.json and .env */
function findEnvDir(): string | null {
  const candidates = [
    __dirname,
    process.cwd(),
    path.resolve(__dirname, '..'),
    path.resolve(process.cwd(), '..'),
  ]
  const seen = new Set<string>()
  for (const dir of candidates) {
    const normalized = path.resolve(dir)
    if (seen.has(normalized)) continue
    seen.add(normalized)
    const envPath = path.join(normalized, '.env')
    const pkgPath = path.join(normalized, 'package.json')
    if (fs.existsSync(envPath) && fs.existsSync(pkgPath)) return normalized
  }
  return null
}

/** Load .env with dotenv parser; try UTF-8 then UTF-16 so encoding is never wrong */
function readEnv(): {
  supabaseUrl: string
  supabaseAnonKey: string
  ollamaEnabled: string
  ollamaModel: string
} {
  const envDir = findEnvDir()
  if (!envDir) return { supabaseUrl: '', supabaseAnonKey: '', ollamaEnabled: 'false', ollamaModel: 'llama3.2' }
  const envPath = path.join(envDir, '.env')
  let raw: string
  try {
    raw = fs.readFileSync(envPath, 'utf-8')
  } catch {
    return { supabaseUrl: '', supabaseAnonKey: '', ollamaEnabled: 'false', ollamaModel: 'llama3.2' }
  }
  if (!raw.includes('VITE_')) {
    try {
      raw = fs.readFileSync(envPath, 'utf16le')
    } catch {
      return { supabaseUrl: '', supabaseAnonKey: '', ollamaEnabled: 'false', ollamaModel: 'llama3.2' }
    }
  }
  const parsed = parseDotenv(raw)
  const trim = (s: string) => (s ?? '').trim()
  return {
    supabaseUrl: trim(parsed.VITE_SUPABASE_URL),
    supabaseAnonKey: trim(parsed.VITE_SUPABASE_ANON_KEY),
    ollamaEnabled: /^(true|1)$/i.test(trim(parsed.VITE_OLLAMA_ENABLED)) ? 'true' : 'false',
    ollamaModel: trim(parsed.VITE_OLLAMA_MODEL) || 'llama3.2',
  }
}

export default defineConfig(({ mode }) => {
  const env = readEnv()
  if (mode === 'development' && (!env.supabaseUrl || !env.supabaseAnonKey)) {
    console.warn('[Vite] Supabase env missing. Sign in will not work. Check .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  }
  const injectEnv = {
    name: 'inject-env',
    transformIndexHtml(html: string) {
      const script = `<script>
window.__SUPABASE_URL__=${JSON.stringify(env.supabaseUrl)};
window.__SUPABASE_ANON_KEY__=${JSON.stringify(env.supabaseAnonKey)};
window.__VITE_OLLAMA_ENABLED__=${JSON.stringify(env.ollamaEnabled)};
window.__VITE_OLLAMA_MODEL__=${JSON.stringify(env.ollamaModel)};
</script>`
      return html.replace('</head>', `${script}\n  </head>`)
    },
  }

  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.supabaseAnonKey),
      'import.meta.env.VITE_OLLAMA_ENABLED': JSON.stringify(env.ollamaEnabled),
      'import.meta.env.VITE_OLLAMA_MODEL': JSON.stringify(env.ollamaModel),
    },
    plugins: [
    injectEnv,
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'StudyFlow',
        short_name: 'StudyFlow',
        description: 'Local-first study app – flashcards, learn, match, test',
        theme_color: '#4255FF',
        background_color: '#F6F7FB',
        display: 'standalone',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [],
      },
    }),
  ],
}
})
