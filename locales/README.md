# Internationalisation (i18n)

Ce projet utilise `@nuxtjs/i18n` pour l'internationalisation.

## Langues disponibles

- **Français (fr)** - Langue par défaut
- **English (en)**

## Configuration

La configuration i18n se trouve dans `nuxt.config.ts` :

- **Langue par défaut** : Français (`fr`)
- **Détection du navigateur** : Activée
- **Stratégie** : `no_prefix` (pas de préfixe dans les URLs)
- **Cookie** : Les préférences de langue sont sauvegardées dans un cookie

## Détection automatique de la langue

Le système détecte automatiquement la langue du navigateur de l'utilisateur :
- Si le navigateur est en anglais → anglais
- Si le navigateur est en français → français
- Langue de secours : français

L'utilisateur peut toujours changer manuellement la langue avec le sélecteur dans l'en-tête.

## Ajouter des traductions

Les fichiers de traduction se trouvent dans le dossier `locales/` :
- `fr.json` - Traductions françaises
- `en.json` - Traductions anglaises

### Exemple d'utilisation dans les composants

```vue
<template>
  <h1>{{ $t('chat.title') }}</h1>
</template>

<script setup>
const { t } = useI18n()
const pageTitle = t('chat.pageTitle')
</script>
```

## Composants

### LanguageSwitcher
Un composant de changement de langue est disponible et utilisé dans l'en-tête de la page chat.

