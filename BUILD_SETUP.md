# Configuration du Build pour Netlify

## Problème résolu

Le fichier `system-prompt.md` dans le dossier `prompts/` n'était pas accessible par les Netlify Functions après le build.

## Solution mise en place

### 1. Configuration `netlify.toml`

Le fichier `netlify.toml` a été configuré pour :
- Copier le fichier `system-prompt.md` dans le dossier des fonctions Netlify après le build
- Inclure les fichiers prompts dans le bundle des fonctions

```toml
[build]
  command = "npm run build && mkdir -p .netlify/functions-internal/prompts && cp prompts/system-prompt.md .netlify/functions-internal/prompts/"
  publish = "dist"

[functions]
  directory = ".netlify/functions-internal"
  included_files = ["prompts/**"]
  node_bundler = "esbuild"
```

### 2. Modifications du code API (`server/api/chat.post.ts`)

Le code a été modifié pour chercher le fichier `system-prompt.md` dans plusieurs emplacements possibles, incluant :
- Les chemins relatifs au fichier API (pour Netlify Functions)
- Les chemins standards (pour le développement local)

Les imports suivants ont été ajoutés :
```typescript
import { dirname } from 'path'
import { fileURLToPath } from 'url'
```

Et le code calcule maintenant le chemin du fichier actuel :
```typescript
const currentFilePath = fileURLToPath(import.meta.url)
const currentDir = dirname(currentFilePath)
```

### 3. Configuration Nuxt (`nuxt.config.ts`)

La configuration `serverAssets` dans `nuxt.config.ts` permet à Nitro de gérer les assets serveur :
```typescript
nitro: {
  preset: 'netlify',
  serverAssets: [
    {
      baseName: 'prompts',
      dir: './prompts'
    }
  ]
}
```

## Commandes de build

### Développement local
```bash
npm run dev
```

### Build de production
```bash
npm run build
```

Cette commande :
1. Compile l'application Nuxt
2. Crée le dossier `.netlify/functions-internal/prompts/`
3. Copie le fichier `system-prompt.md` dans ce dossier

## Vérification

Après le build, vérifiez que le fichier est bien présent :
```bash
ls -la .netlify/functions-internal/prompts/
```

Vous devriez voir :
```
system-prompt.md
```

## Variables d'environnement requises

N'oubliez pas de configurer les variables d'environnement suivantes sur Netlify :
- `ANTHROPIC_API_KEY` : Votre clé API Anthropic
- `SYSTEM_PROMPT_CACHE` (optionnel) : `true` pour activer le cache du system prompt

## Structure des fichiers

```
/vercel/sandbox/
├── prompts/
│   └── system-prompt.md          # Fichier source
├── .netlify/
│   └── functions-internal/
│       ├── prompts/
│       │   └── system-prompt.md  # Copié après le build
│       └── server/               # Fonctions Netlify
├── dist/                         # Site statique publié
├── netlify.toml                  # Configuration Netlify
└── nuxt.config.ts                # Configuration Nuxt
```

## Logs de débogage

L'API `/api/chat` affiche des logs détaillés pour le chargement du system prompt :
- `🔍 [LOAD]` : Tentatives de chargement
- `✅ [LOAD]` : Succès du chargement
- `❌ [LOAD]` : Échec du chargement

Consultez les logs Netlify Functions pour diagnostiquer les problèmes de chargement.
