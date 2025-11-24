import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const cacheDirs = [
  '.nuxt',
  '.output',
  'dist',
  '.netlify',
  join('node_modules', '.cache'),
  join('node_modules', '.vite'),
];

async function cleanCache() {
  console.log('🧹 Cleaning deployment cached files...\n');
  
  let cleaned = 0;
  let skipped = 0;
  
  for (const dir of cacheDirs) {
    const fullPath = join(rootDir, dir);
    
    if (existsSync(fullPath)) {
      try {
        await rm(fullPath, { recursive: true, force: true });
        console.log(`✅ Removed: ${dir}`);
        cleaned++;
      } catch (error) {
        console.error(`❌ Failed to remove ${dir}:`, error.message);
      }
    } else {
      console.log(`⏭️  Skipped: ${dir} (not found)`);
      skipped++;
    }
  }
  
  console.log(`\n✨ Cache cleaning complete!`);
  console.log(`   Cleaned: ${cleaned} directories`);
  console.log(`   Skipped: ${skipped} directories`);
  console.log('\n💡 Run "npm install" if you need to reinstall dependencies.');
}

cleanCache().catch((error) => {
  console.error('Error during cache cleaning:', error);
  process.exit(1);
});

