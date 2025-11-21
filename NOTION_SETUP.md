# Configuration Notion pour le System Prompt

Ce projet utilise Notion pour gérer le system prompt de l'assistant IA, permettant des mises à jour dynamiques sans redéploiement.

## Prérequis

1. Un compte Notion
2. Une page Notion contenant le system prompt
3. Une intégration Notion avec accès à cette page

## Configuration de l'intégration Notion

### Étape 1 : Créer une intégration Notion

1. Allez sur [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Cliquez sur **"+ New integration"**
3. Donnez un nom à votre intégration (ex: "Impulz System Prompt")
4. Sélectionnez le workspace approprié
5. Configurez les permissions :
   - **Read content** : ✅ Activé (nécessaire pour lire le contenu)
   - **Update content** : ❌ Désactivé (non nécessaire)
   - **Insert content** : ❌ Désactivé (non nécessaire)
6. Cliquez sur **"Submit"**
7. **Copiez le "Internal Integration Token"** (commence par `secret_...`)

### Étape 2 : Créer et partager la page Notion

1. Créez une nouvelle page dans Notion pour votre system prompt
2. Rédigez votre system prompt dans cette page en utilisant :
   - Titres (Heading 1, 2, 3)
   - Paragraphes
   - Listes à puces ou numérotées
   - Citations (quotes)
   - Code blocks
   - Callouts
   - etc.

3. **Partagez la page avec votre intégration** :
   - Cliquez sur **"Share"** en haut à droite de la page
   - Cliquez sur **"Invite"**
   - Cherchez et sélectionnez votre intégration
   - Cliquez sur **"Invite"**

4. **Récupérez l'ID de la page** :
   - L'URL de votre page ressemble à : `https://www.notion.so/Mon-System-Prompt-abc123def456...`
   - L'ID est la partie après le dernier `-` : `abc123def456...`
   - Ou copiez le lien de la page et extrayez l'ID (32 caractères alphanumériques)

## Configuration des variables d'environnement

### Développement local

Créez un fichier `.env` à la racine du projet :

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# Notion Configuration
NOTION_API_KEY=secret_...
NOTION_PROMPT_PAGE_ID=abc123def456...
```

### Production (Netlify)

1. Allez dans votre projet Netlify
2. Allez dans **Site configuration** > **Environment variables**
3. Ajoutez les variables suivantes :
   - `ANTHROPIC_API_KEY` : Votre clé API Anthropic
   - `NOTION_API_KEY` : Votre token d'intégration Notion
   - `NOTION_PROMPT_PAGE_ID` : L'ID de votre page Notion

## Format du System Prompt dans Notion

Le système convertit automatiquement le contenu Notion en Markdown. Vous pouvez utiliser :

### Blocs supportés

- ✅ **Paragraphes** : Texte normal
- ✅ **Titres** : Heading 1, 2, 3 → `#`, `##`, `###`
- ✅ **Listes** : Bulleted et Numbered → `-` et `1.`
- ✅ **Citations** : Quote → `>`
- ✅ **Code** : Code blocks → ` ```language ```
- ✅ **Séparateurs** : Divider → `---`
- ✅ **Toggle** : Convertis avec leur contenu
- ✅ **Callout** : Convertis en citations avec emoji

### Formatage de texte

- ✅ **Gras** → `**texte**`
- ✅ **Italique** → `*texte*`
- ✅ **Code inline** → `` `code` ``
- ✅ **Barré** → `~~texte~~`
- ✅ **Liens** → `[texte](url)`

### Exemple de structure

```
# Role

Impulz, AI coach for early-stage founders.

## Goal

Turn vague founder requests into concrete actions.

## Workflow

### Stage 1 - Understand

Objective : Understand the founder's situation before advising.

- Ask one open question at a time
- Clarify the concept, progress, actions, and documents

### Stage 2 - Challenge & Qualify

Objective: Challenge the request to reveal the real problem.

Ask 2-3 sharp questions such as:
- "Why do you think this is your next step?"
- "Have you validated the customer need?"
```

## Cache et Performance

### Cache automatique

Le système met en cache le prompt Notion pendant **5 minutes** pour optimiser les performances et réduire les appels API.

### Forcer le rechargement

Pour forcer le rechargement du prompt sans attendre l'expiration du cache, vous pouvez :

1. Redémarrer le serveur (en développement)
2. Attendre 5 minutes (le cache expire automatiquement)
3. Modifier le code pour désactiver le cache temporairement

### Configuration du cache

Dans `nuxt.config.ts`, vous pouvez configurer le cache :

```typescript
runtimeConfig: {
  systemPromptCache: true, // false pour désactiver le cache
}
```

## Avantages de cette approche

✅ **Mises à jour dynamiques** : Modifiez le prompt dans Notion sans redéployer
✅ **Collaboration** : Plusieurs personnes peuvent éditer le prompt
✅ **Historique** : Notion garde l'historique des modifications
✅ **Interface conviviale** : Éditeur WYSIWYG au lieu de Markdown brut
✅ **Performance** : Cache intelligent pour minimiser les appels API
✅ **Pas de build** : Plus besoin de copier des fichiers lors du déploiement

## Dépannage

### Erreur : "Missing NOTION_API_KEY or NOTION_PROMPT_PAGE_ID"

- Vérifiez que les variables d'environnement sont bien configurées
- Sur Netlify, vérifiez qu'elles sont définies dans les Environment Variables
- Redéployez après avoir ajouté les variables

### Erreur : "Failed to fetch Notion page"

- Vérifiez que la page est bien partagée avec votre intégration
- Vérifiez que l'ID de la page est correct (32 caractères)
- Vérifiez que le token d'intégration est valide

### Le prompt ne se met pas à jour

- Attendez 5 minutes (expiration du cache)
- Ou redémarrez le serveur en développement
- Vérifiez les logs pour voir si Notion est bien appelé

## Support

Pour plus d'informations sur l'API Notion :
- [Documentation officielle Notion API](https://developers.notion.com/)
- [Guide des intégrations](https://www.notion.so/help/create-integrations-with-the-notion-api)

