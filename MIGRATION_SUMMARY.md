# Migration vers Notion - Résumé

## 🎯 Objectif

Remplacer le system prompt statique (fichier `prompts/system-prompt.md` copié lors du build) par un système dynamique qui récupère le prompt depuis Notion.

## ✅ Changements effectués

### 1. Installation des dépendances

```bash
npm install @notionhq/client
```

### 2. Nouveau fichier : `server/utils/notion.ts`

Utilitaire pour récupérer et convertir le contenu Notion en Markdown :

- **Fonctions principales** : `getBasePromptFromNotion()`, `getStagePromptFromNotion(stageNumber)`
- **Cache intelligent** : 5 minutes de cache pour optimiser les performances
- **Conversion Markdown** : Supporte tous les types de blocs Notion (titres, listes, code, etc.)
- **Gestion d'erreurs** : Logs détaillés et messages d'erreur explicites

### 3. Modification : `server/api/chat.post.ts`

**Avant** :
- Chargement du prompt depuis le système de fichiers
- Multiples tentatives de chemins (useStorage, filesystem, etc.)
- ~110 lignes de code de chargement complexe

**Après** :
- Simple import de `getBasePromptFromNotion` et `getStagePromptFromNotion`
- Quelques lignes de code pour charger les prompts
- Plus propre et maintenable

### 4. Modification : `netlify.toml`

**Avant** :
```toml
[build]
  command = "npmrunbuild&&xcopypromptsdist\prompts/E/I/Y"
  
[functions]
  included_files = ["prompts/**"]
```

**Après** :
```toml
[build]
  command = "npm run build"
  
[functions]
  directory = "netlify/functions"
```

### 5. Modification : `package.json`

**Avant** :
```json
"build": "nuxt build && node scripts/copy-prompts.js"
```

**Après** :
```json
"build": "nuxt build"
```

### 6. Documentation

- **NOTION_SETUP.md** : Guide complet de configuration Notion
- **env.example** : Template des variables d'environnement
- **README.md** : Mise à jour avec les nouvelles instructions

## 🔧 Configuration requise

### Variables d'environnement

```env
# Existant
ANTHROPIC_API_KEY=sk-ant-...

# Nouveau
NOTION_API_KEY=secret_...
NOTION_BASEPROMPT=xxx  # Optionnel, pour le base prompt
NOTION_STAGEPROMPT_1=xxx  # Optionnel, pour les stage prompts
NOTION_CACHE_SECONDS=300  # Optionnel, 300 secondes (5 min) par défaut
```

### Netlify

Ajouter la nouvelle variable dans **Site settings → Environment variables** :
- `NOTION_API_KEY`
- Optionnellement : `NOTION_BASEPROMPT`, `NOTION_STAGEPROMPT_1`, etc.

## 📋 Étapes de configuration Notion

1. **Créer une intégration** sur https://www.notion.so/my-integrations
2. **Copier le token** (commence par `secret_`)
3. **Créer des pages** pour les prompts (base prompt et stage prompts)
4. **Partager les pages** avec l'intégration
5. **Copier les IDs** des pages (depuis les URLs)
6. **Configurer les variables** d'environnement

Voir [NOTION_SETUP.md](./NOTION_SETUP.md) pour les détails complets.

## ✨ Avantages

| Avant | Après |
|-------|-------|
| ❌ Prompt dans un fichier statique | ✅ Prompt dynamique dans Notion |
| ❌ Redéploiement pour chaque modification | ✅ Modification instantanée |
| ❌ Édition en Markdown brut | ✅ Éditeur WYSIWYG convivial |
| ❌ Pas d'historique des versions | ✅ Historique Notion automatique |
| ❌ Édition solo | ✅ Collaboration possible |
| ❌ Build complexe avec copie de fichiers | ✅ Build simple et propre |

## 🚀 Performance

- **Cache configurable** : Défaut 300 secondes (5 minutes) via `NOTION_CACHE_SECONDS`
- **Pas d'impact sur le build** : Plus de copie de fichiers
- **Même vitesse de réponse** : Le cache évite les latences

## 🧪 Test

### En développement

1. Configurer le `.env` avec les variables nécessaires
2. Lancer `npm run dev`
3. Tester le chat sur http://localhost:3000/chat

### En production (Netlify)

1. Configurer les variables d'environnement
2. Déployer normalement
3. Le prompt sera récupéré depuis Notion automatiquement

## 📝 Fichiers à supprimer (optionnel)

Ces fichiers ne sont plus utilisés mais peuvent être conservés comme backup :

- `prompts/system-prompt.md` (ancien prompt statique)
- `scripts/copy-prompts.js` (script de copie)
- `dist/prompts/system-prompt.md` (copie dans le build)

## 🔍 Logs de débogage

Le système affiche des logs détaillés :

```
🔍 [NOTION] Fetching page content from Notion...
✅ [NOTION] Received 15 blocks
✅ [NOTION] Content converted, length: 1234
✅ [NOTION] Using cached prompt (age: 45 seconds)
```

## ⚠️ Points d'attention

1. **Première requête** : Peut prendre 1-2 secondes (appel Notion)
2. **Requêtes suivantes** : Instantanées (cache de 300 secondes par défaut)
3. **Expiration du cache** : Le prompt se recharge automatiquement après expiration
4. **Erreur de configuration** : Vérifier les logs si le prompt ne charge pas

## 🆘 Dépannage

### Le prompt ne se charge pas

1. Vérifier que les variables d'environnement sont définies
2. Vérifier que la page Notion est partagée avec l'intégration
3. Vérifier les logs serveur pour voir l'erreur exacte

### Le prompt ne se met pas à jour

1. Attendre l'expiration du cache (défaut: 300 secondes)
2. Réduire `NOTION_CACHE_SECONDS` pour le dev (ex: 60 secondes)
3. Ou redémarrer le serveur en dev
4. Vérifier les logs pour confirmer le rechargement

## 📚 Ressources

- [Documentation Notion API](https://developers.notion.com/)
- [Guide des intégrations Notion](https://www.notion.so/help/create-integrations-with-the-notion-api)
- [Anthropic Claude API](https://docs.anthropic.com/)

