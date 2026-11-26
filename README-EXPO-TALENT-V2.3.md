# EXPO TALENT ISS-KIN — V2.3 : tableau de bord épuré

Mise à jour visuelle ciblée à partir de la V2.2 (commit de référence `d2483337acc036abaf9852c268782af0643918bf`). La maquette approuvée est interprétée avec une navigation textuelle, moins d’icônes, le véritable logo existant et les couleurs bleu nuit / jaune / violet. Aucun portrait ni chiffre fictif supplémentaire.

## Nouveautés

- Menu latéral en trois groupes : Pilotage, Gestion, Administration. Sur mobile : sélecteur de rubrique, recherche et commandes tactiles.
- Quatre cartes d’indicateurs : candidatures, acceptées/confirmées, en attente, pages vues (ou refusées pour un gestionnaire). Les trois premières couvrent toutes les candidatures, y compris les démos identifiées. L’audience utilise une période de 7, 30 ou 90 jours.
- Courbes réelles des pages vues et des inscriptions non fictives ; anneau de répartition des pages vues par appareil. Les états vide, chargement et erreur sont distincts. Pas de pourcentage de conversion trompeur : les inscriptions et les visites mesurées ne portent pas sur la même population.
- Cinq dernières candidatures cliquables, actions rapides, recherche par nom, matricule ou référence. Exports et graphiques détaillés de V2.2 conservés ; les anciens graphiques s’affichent à la demande.
- Aucun changement des routes API, de la MFA, des rôles, de la mesure d’audience, de la base, des utilisateurs, des candidatures ni du site public. L’audience reste réservée au rôle owner. La messagerie reste à configurer.

## Installation

Télécharger `expo-talent-v2.3.patch` dans Downloads. Dans Git Bash, à la racine du projet, vérifier `git status --short` (aucune modification locale non sauvegardée), puis exécuter :

```bash
git pull --ff-only origin main && git apply --check ~/Downloads/expo-talent-v2.3.patch && git apply --index ~/Downloads/expo-talent-v2.3.patch && git diff --cached --stat
```

La liste doit inclure `components/AdminOverview.tsx`, `components/Dashboard.tsx`, `components/AdminTraffic.tsx`, `app/admin-ui.css` et `README-V2.3.md`. Ne pas seulement commiter le fichier patch. Ensuite :

```bash
npm install && npm run typecheck && npm test && npm run build && git commit -m "feat: tableau de bord coordination epure v2.3" && git push origin main
```

Si une commande échoue, arrêter et consulter son erreur. Ne pas forcer l’application du patch. Le fichier package-lock.json produit par npm install peut être ajouté séparément après vérification. Ne jamais ajouter `.env.local`.

## Recette après le déploiement

1. Ouvrir `/espace-coordination` et vérifier que la MFA se comporte comme en V2.2. Vérifier qu’un gestionnaire ne voit pas l’audience ni les rubriques owner.
2. Vérifier les cartes, le graphique et l’anneau avec une période de 7, 30 et 90 jours. Aucun historique inventé en absence de données. Tester un clic sur une candidature récente et la fermeture de sa fiche. Tester la recherche et les actions rapides.
3. Vérifier les exports CSV/XLSX dans les onglets Candidatures et Audience. Ouvrir les graphiques détaillés. Tester la mise à jour des chiffres par Actualiser.
4. Tester à 360, 390, 768, 1024 et 1440 px, en portrait et paysage ; vérifier la navigation clavier, le débordement des tableaux et des noms longs, les boutons et les formulaires.
5. Vérifier la page publique, les liens WhatsApp et Espace Coordination et la redirection depuis `/admin`.

## Vérifications de livraison

Les quatre fichiers source de référence ont été comparés aux empreintes GitHub. Les trois composants TSX modifiés/ajoutés passent la transpilation TypeScript sans diagnostic ; les 24 tests unitaires existants passent. Le patch a été vérifié avec `git apply --check` sur la base V2.2. La compilation Next.js complète et le rendu authentifié dans un navigateur restent à valider après installation des dépendances. Aucune modification de production effectuée par cette livraison.
