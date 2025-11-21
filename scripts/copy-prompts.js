import { cpSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const source = join(rootDir, 'prompts')
const dest = join(rootDir, 'dist', 'prompts')

console.log('📋 Copying prompts folder...')
console.log('  From:', source)
console.log('  To:', dest)

try {
  // Créer le dossier dist s'il n'existe pas
  if (!existsSync(join(rootDir, 'dist'))) {
    mkdirSync(join(rootDir, 'dist'), { recursive: true })
  }
  
  // Copier le dossier prompts
  cpSync(source, dest, { recursive: true })
  console.log('✅ Prompts copied successfully!')
} catch (error) {
  console.error('❌ Error copying prompts:', error)
  process.exit(1)
}

