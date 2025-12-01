# 🚀 Quick Start - Configuration Notion

Guide rapide pour configurer Notion en 5 minutes.

## 📝 Étape 1 : Créer l'intégration Notion

1. Allez sur https://www.notion.so/my-integrations
2. Cliquez sur **"+ New integration"**
3. Nom : `Impulz System Prompt`
4. Permissions : **Read content** uniquement
5. Cliquez sur **"Submit"**
6. **Copiez le token** (commence par `secret_...`)

## 📄 Étape 2 : Créer la page Notion

1. Créez une nouvelle page dans votre workspace Notion
2. Titre : `System Prompt - Impulz`
3. Collez votre system prompt actuel (depuis `prompts/system-prompt.md`)
4. Formatez-le comme vous voulez avec l'éditeur Notion

## 🔗 Étape 3 : Partager la page

1. Sur la page, cliquez sur **"Share"** (en haut à droite)
2. Cliquez sur **"Invite"**
3. Cherchez votre intégration : `Impulz System Prompt`
4. Cliquez sur **"Invite"**

## 🔑 Étape 4 : Récupérer l'ID de la page

**Option A - Depuis l'URL** :
```
https://www.notion.so/Mon-System-Prompt-abc123def456789...
                                        ^^^^^^^^^^^^^^^^
                                        C'est l'ID !
```

**Option B - Copier le lien** :
1. Cliquez sur les 3 points `...` en haut à droite
2. Cliquez sur **"Copy link"**
3. L'ID est après le dernier `-` dans l'URL

## ⚙️ Étape 5 : Configuration locale

Créez un fichier `.env` à la racine du projet :

```env
ANTHROPIC_API_KEY=sk-ant-...
NOTION_API_KEY=secret_...
NOTION_CACHE_SECONDS=300  # Optionnel, 300 secondes (5 min) par défaut
```

## 🧪 Étape 6 : Tester

```bash
npm run dev
```

Visitez http://localhost:3000/chat et envoyez un message.

Vérifiez les logs dans la console :
```
🔍 [NOTION] Fetching page content from Notion...
✅ [NOTION] Received X blocks
✅ [NOTION] Content converted, length: XXXX
```

## ☁️ Étape 7 : Déployer sur Netlify

1. Allez dans votre projet Netlify
2. **Site settings** → **Environment variables**
3. Ajoutez les 2 variables :
   - `ANTHROPIC_API_KEY`
   - `NOTION_API_KEY`
4. Redéployez (ou push sur Git)

## ✅ C'est terminé !

Maintenant vous pouvez :
- ✏️ Modifier le prompt directement dans Notion
- 🔄 Les changements sont pris en compte après max 300 secondes (5 minutes)
- 👥 Collaborer avec votre équipe sur le prompt
- 📜 Garder l'historique des versions

## 🆘 Problème ?

### Erreur : "Missing NOTION_API_KEY"
→ Vérifiez que les variables d'environnement sont bien définies dans votre fichier .env

### Erreur : "Failed to fetch Notion page"
→ Vérifiez que la page est bien partagée avec l'intégration

### Le prompt ne se met pas à jour
→ Attendez la durée du cache (défaut: 300 secondes = 5 minutes) ou redémarrez le serveur
→ Vous pouvez réduire `NOTION_CACHE_SECONDS` pour le dev (ex: 60 = 1 minute)

---

**Besoin de plus de détails ?** Consultez [NOTION_SETUP.md](./NOTION_SETUP.md)

