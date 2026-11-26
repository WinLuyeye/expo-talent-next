# EXPO TALENT ISS-KIN — V2.2 : administration responsive et audience

## Résumé

- Espace Coordination : nouvelle adresse `/espace-coordination`, ancien `/admin` redirigé pour conserver les favoris. Le lien public devient « Espace Coordination ». Les routes API restent `/api/admin/...` : la protection repose sur la session, le rôle et la MFA V2.1, pas sur le nom de la page.
- Tableau de bord : sidebar avec icônes sur ordinateur, menu sélecteur sur téléphone, cartes et badges des candidatures, filtres accessibles, graphiques adaptés à la largeur, actions tactiles et fenêtre de détails défilante (Échap pour fermer). Les autres tableaux restent défilables horizontalement sur petit écran.
- Onglet « Audience du site » accessible au rôle `owner` uniquement : période 7/30/90 jours, pages vues, sessions quotidiennes estimées, pages par session, candidatures réelles, pic de fréquentation, graphique quotidien, répartition appareils/provenances, tableau journalier, exports CSV et Excel. Le XLSX comprend évolution, appareils, provenances, détails et méthode. Les exports n'incluent aucun identifiant de session ni donnée de candidat.
- Aucun compte, candidature, e-mail, document PDF, signature développeur ou paramètre MFA existant modifié. Le code V2.1 reste intact. Aucune dépendance supplémentaire ni clé API supplémentaire.

## Migration : déjà appliquée en production

Projet Supabase `expo-talent-next`, migration `20261126122120_expo_v22_traffic_analytics`. Deux nouvelles tables : `site_traffic_daily` et `site_traffic_sessions`, deux fonctions : `expo_record_traffic` et `expo_traffic_report`. RLS active, tables et fonctions non accessibles directement aux rôles `anon` et `authenticated`. Les 48 candidatures et 2 rôles administrateurs étaient inchangés après migration. Le test transactionnel a compté deux chargements pour une session, puis a été annulé ; les tables étaient vides après le test. Ne pas relancer la migration sur cette base. Pour une nouvelle base ou un environnement de test, appliquer les migrations dans l'ordre après avoir vérifié leur historique. Ne pas lancer `supabase db push` aveuglément sur la production (migration initiale historique).

## Installation locale (Git Bash)

Base de travail : V2.1 effectivement intégrée à `main` (et correctif du pied de page V3). Télécharger le patch et le garder dans Downloads, en dehors du dépôt. Ne pas copier une ancienne archive sur le code actuel.

```bash
# Dans le dépôt existant, vérifier d'abord que les changements locaux sont sauvegardés.
git status --short
git pull --ff-only origin main
# Si la première commande échoue, ne pas continuer.
git apply --check ~/Downloads/expo-talent-v2.2.patch && git apply ~/Downloads/expo-talent-v2.2.patch
# Vérifier que les fichiers source ont réellement changé.
git status --short
git diff --stat
```

Puis, avec Node 22 et npm :

```bash
npm install
npm run typecheck && npm test && npm run build
```

Uniquement si les vérifications réussissent :

```bash
git add -- app components lib next.config.ts supabase/migrations/20261126122120_expo_v22_traffic_analytics.sql tests/traffic-model.test.cjs README-V2.2.md
# Ajouter package-lock.json s'il vient d'être généré et si le contenu est normal.
git diff --cached --stat
git commit -m "feat: v2.2 administration responsive et statistiques audience"
git push origin main
```

Vérifier le déploiement Vercel de ce commit. Ne pas publier `.env.local`, `.next`, `node_modules`, ou les fichiers `.patch` eux-mêmes. Ne pas forcer le push. Si un patch est refusé, conserver les fichiers actuels et transmettre le message d'erreur, ne pas exécuter `git add .` pour masquer l'échec. L'ancien `/admin` redirige vers la nouvelle adresse; les API `/api/admin` restent inchangées.

## Comment les statistiques fonctionnent

- Une mesure d'audience facultative est proposée aux visiteurs sur la page publique. Le choix peut être changé au pied du site. Les signaux DNT et Global Privacy Control sont respectés. Le refus n'empêche jamais l'inscription. Le choix est conservé localement ; un identifiant aléatoire est stocké uniquement dans `sessionStorage` de l'onglet si accepté. Aucun service publicitaire, cookie de suivi, IP brute, URL référente complète, email, matricule ou nom n'est envoyé dans les statistiques. Le serveur utilise le mécanisme de limitation de requêtes existant (clé HMAC dérivée de l'IP) et classe le navigateur par type d'appareil sans enregistrer son user-agent. Le canal général est déterminé sur le client, à partir du référent, avant l'envoi.
- Une page vue correspond à un chargement mesuré. Les « sessions estimées » sont des onglets quotidiens (le même onglet rechargé dans la journée est dédupliqué), et non des visiteurs uniques ni des personnes identifiées. Ouvrir plusieurs onglets, changer de navigateur, ou vider le stockage peut modifier cette estimation. Le hachage du token inclut la date de Kinshasa, empêchant la corrélation entre journées au niveau des tables. La table des tokens est nettoyée des jours précédents lors du prochain événement accepté. Si aucun nouvel événement n'arrive, le dernier lot reste jusqu'à la prochaine visite/maintenance; prévoir une purge planifiée si nécessaire. Les compteurs journaliers agrégés restent conservés jusqu'à décision de la coordination. Le navigateur peut masquer l'origine de visite : WhatsApp est souvent classé dans « Direct / non identifié ». Les robots connus sont filtrés, mais les chiffres ne sont ni exhaustifs ni invulnérables à la fraude. Le rapport ne compte pas les personnes ayant refusé, les bloqueurs ou les échecs réseau. L'application ne trace ni le temps passé ni la localisation exacte.
- Les inscriptions réelles excluent les lignes `data.synthetic=true`; ce chiffre est indépendant des visites consenties, donc il ne faut pas en déduire un taux de conversion. Aucune visite antérieure à l'activation ne peut être reconstituée. La période utilise le fuseau Africa/Kinshasa. Un rapport vide signifie que la mesure n'a pas encore produit de données.
- L'API publique valide l'origine et limite les requêtes, ne reçoit que l'identifiant d'onglet et un canal parmi cinq valeurs. Les API JSON/CSV/XLSX sont réservées au rôle owner, après contrôle MFA V2.1. Les routes admin sont non indexables et non mises en cache. Aucun changement à la configuration MFA ou aux identifiants Vercel n'est nécessaire.
- La coordination doit valider la mention de confidentialité et sa politique de rétention des statistiques, le choix de collecte et le processus de sauvegarde; vérifier également les conditions du plan d'hébergement pour la capacité. Le consentement a été choisi par prudence et les chiffres sont donc partiels.

## Recette après déploiement

1. Ouvrir `/espace-coordination`, vérifier la redirection `/admin`, et le lien « Espace Coordination » en bas de page. Vérifier l'accès par mot de passe et MFA si activée.
2. En navigation privée, refuser le consentement : l'inscription reste utilisable, aucune page vue ne doit être comptée. Tester l'accord et deux rechargements du même onglet : le nombre de pages vues progresse, une seule session pour ce jour et cet onglet. Tester un nouvel onglet indépendant; tester le retrait du consentement. Faire de préférence ces tests sur un environnement de test séparé ou identifier leur impact sur les agrégats de production. Ne pas créer de faux candidats sur la production.
3. Administrateur principal : ouvrir Audience du site; vérifier les périodes, les zéros, la cohérence des totaux, les graphiques et les exports. Gestionnaire et visiteur non connecté : vérifier que l'URL `/api/admin/traffic?days=30&format=xlsx` est refusée. Ne pas assouplir la sécurité pour faciliter les tests.
4. Tester l'interface à 320, 375, 768 et 1440 px, clavier, zoom 200 %, tableaux, filtres, détail et déconnexion. Vérifier la V2.1, les candidatures, notifications et QR existants.
5. Vérifier la réponse des routes, les logs Vercel et les métriques Supabase. Les exports audience ne dépendent pas de la messagerie. Resend et la configuration officielle restent à traiter séparément.

## Vérifications effectuées lors de cette livraison

- 24 tests unitaires passés (9 MFA + 15 modèle audience), transpilation TS/TSX sans erreur de syntaxe, SQL de comptage testé en transaction annulée, migration et permissions vérifiées. Les fichiers modifiés ont été comparés à GitHub par empreinte de blob, sauf le pied de page qui utilise un contexte de hunk vérifié directement dans le fichier distant. Le patch a été vérifié sur une copie locale de la V2.1 avec ce contexte de pied de page. L'installation des dépendances, la compilation Next.js complète, les tests HTTP avec compte authentifié, le contrôle visuel multi-écran et les exports réels restent à faire localement et après déploiement. Le connecteur GitHub ne permet pas de pousser les fichiers directement. Les statistiques ne sont pas encore actives en ligne par la seule migration SQL.
