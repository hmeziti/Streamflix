# Thumbnails Vidmoly

Ce dossier est prévu pour stocker des miniatures locales nommées avec l'ID Vidmoly.

> Exemple : `public/thumbnails/4pvdbj19xv02.jpg`

**Note :** Dans ce dépôt, les miniatures sont actuellement intégrées en Base64
(dans `constants.ts`) afin d'éviter le blocage des fichiers binaires sur la plateforme.
Si vous déployez ailleurs, vous pouvez régénérer les fichiers locaux avec :

```bash
npm run restore:thumbnails
```

Ensuite, remplacez les `thumbnail_url` par des chemins locaux dans ce dossier.
