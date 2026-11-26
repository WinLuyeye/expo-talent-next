# EXPO TALENT — ISS-KIN | Version Next.js

« Révélons aujourd’hui les talents qui façonneront demain ! »

Application en français, reprenant les photographies, le logo, les portraits extraits de l'affiche et la feuille de style de la première version (fond nuit, jaune, bleu royal et fuchsia). Les composants sont réécrits en React/TypeScript, avec Tailwind CSS pour les utilitaires, Framer Motion pour les animations, Lucide pour les icônes et Recharts pour les statistiques. Aucun serveur Python ou SQLite n'est nécessaire.

## Architecture

- Next.js App Router : `/` (site public), `/admin` (connexion et gestion), `/api/...` (routes serveur Node.js).
- Supabase PostgreSQL : tables, contraintes uniques, fonctions transactionnelles, RLS, Auth et Storage. Pas de données de démonstration ni de compte préconfiguré.
- Resend : confirmation, décisions, notifications personnalisées et codes de suivi. Une file persistante conserve les messages de candidature à réessayer. « Envoyé » signifie accepté par Resend, non preuve de remise en boîte de réception.
- PDF-Lib et QRCode : récépissé; jsQR : lecture d'une photo de QR dans l'administration; ExcelJS : export XLSX; CSV protégé contre les formules.
- Photos optimisées WebP, CSS responsive, contrôle de réduction des animations.

## Installation locale

Prérequis : Node.js 20.9+ (22 LTS recommandé), npm, un projet Supabase et un compte Resend.

```bash
npm install
cp .env.example .env.local
```

Sous Windows PowerShell : `Copy-Item .env.example .env.local`.

### 1. Supabase

1. Créer un projet sur https://supabase.com/dashboard.
2. Ouvrir SQL Editor, exécuter intégralement `supabase/migrations/001_expo_talent.sql` **une seule fois sur un projet neuf**. Le script crée aussi deux buckets (privé et galerie publique), et interdit l'accès direct aux tables pour les rôles anon et authenticated. Les routes serveur sont la seule passerelle.
3. Dans Authentication > Providers / Sign In, désactiver les inscriptions publiques (les étudiants ne créent pas de comptes Auth). Dans Authentication > Users, créer le premier utilisateur administrateur avec une adresse réelle et un mot de passe fort (12 caractères minimum), puis le confirmer. Copier son UUID.
4. Dans SQL Editor, attribuer le rôle à cet UUID réel :

```sql
insert into public.admin_roles(id,role)
values ('REMPLACER_PAR_UUID_UTILISATEUR'::uuid,'owner');
```

5. Renseigner `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé anon historique ou publishable key) et `SUPABASE_SERVICE_ROLE_KEY` (clé service_role serveur) dans `.env.local`. Ne jamais préfixer la clé privée par `NEXT_PUBLIC_`, ni la commiter. Le serveur utilise cette clé après validation et contrôle des permissions.

### 2. Resend

1. Créer un compte sur https://resend.com, ajouter un domaine que la coordination contrôle et faire vérifier ses enregistrements DNS. L'envoi à des étudiants nécessite un domaine expéditeur autorisé par Resend.
2. Générer une clé API d'envoi et renseigner `RESEND_API_KEY` et `EMAIL_FROM` dans `.env.local`. Le domaine de l'expéditeur doit être vérifié. Aucune adresse officielle n'est fournie ou inventée.
3. Générer un secret de suivi aléatoire : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Placer le résultat dans `TRACKING_SECRET` (au moins 32 caractères). Configurer `APP_ORIGIN=http://localhost:3000`.

### 3. Démarrer

```bash
npm run dev
```

- Site : http://localhost:3000
- Administration : http://localhost:3000/admin
- Vérification TypeScript : `npm run typecheck`
- Build : `npm run build` puis `npm start`

Les pages publiques affichent les visuels sans configuration mais ne permettent pas d'inscriptions hors connexion à Supabase. Les inscriptions sont **fermées par défaut**, volontairement : l'administrateur doit renseigner promotions, filières, départements, règlement, politique de confidentialité et durée de conservation avant ouverture. La date de l'événement, les contacts, la date limite et le programme sont facultatifs et affichés « À venir » lorsqu'ils sont absents. Exemple de date ISO : `2026-12-20T14:00:00+01:00` (format seulement, pas une date officielle).

## Déploiement Vercel

1. Après installation réussie, conserver `package-lock.json` et pousser ce dossier dans un dépôt Git privé, sans `.env.local` ni données sensibles.
2. Importer le dépôt dans https://vercel.com/new, choisir Next.js, configurer les variables d'environnement listées dans `.env.example` pour Production. Régler `APP_ORIGIN` à l'origine HTTPS exacte du domaine final (sans chemin), et utiliser ce domaine pour le site. Pour une prévisualisation distincte, configurer son origine séparément et de préférence une base de test distincte.
3. Déployer. Les routes utilisent le runtime Node.js. La limite de fichier est 3 Mo pour rester sous la limite de taille de requête des fonctions Vercel. Aucun stockage local persistant n'est nécessaire.
4. Connecter le domaine, tester le parcours de bout en bout ci-dessous, puis publier le lien. Le projet n'est pas déployé automatiquement par cette archive.

## Gestion et sécurité

- Deux rôles : `owner` (configuration, galerie, comptes, candidatures), `reviewer` (candidatures, notifications, vérification, exports). Les contrôles se font à chaque route et les sessions passent par Supabase Auth avec cookies HttpOnly et SameSite.
- Les candidatures sont persistées avec leur confirmation dans la même transaction PostgreSQL; la contrainte unique sur le matricule normalisé empêche les doubles inscriptions. Un échec de Resend ne supprime pas une inscription. Les notifications peuvent être relancées depuis l'onglet Notifications; un envoi abandonné en état sending est relançable après dix minutes. Les tentatives d'envoi utilisent une clé d'idempotence Resend (sa fenêtre de déduplication est limitée par le fournisseur).
- Suivi par référence + e-mail + code à usage unique, haché avec HMAC, valable 10 minutes, au plus cinq tentatives par code; réponse de demande générique pour éviter l'énumération. Les QR ne contiennent que la référence. La vérification administrative est réservée aux personnes authentifiées.
- Fichiers : JPEG, PNG, WebP ou PDF (candidatures uniquement), 3 Mo maximum, signatures de format contrôlées. Pièces jointes privées et téléchargement via URL temporaire de 60 secondes. Galerie publique seulement pour contenus autorisés. La validation de signature ne remplace pas un antivirus : prévoir une analyse des fichiers avant déploiement à grande échelle.
- Contrôle d'origine des POST et limites persistantes de demandes. Sur Vercel le code utilise les en-têtes d'IP du proxy; si déployé ailleurs, configurer le proxy de confiance pour supprimer les en-têtes d'IP fournis par le client. À défaut d'IP fiable la limite s'applique globalement. Prévoir CAPTCHA et MFA administrateur selon les besoins, ainsi qu'un audit avant production.
- La politique de conservation est configurable; la purge des candidatures et des pièces jointes à l'échéance doit être organisée par la coordination (pas de purge automatique arbitraire). Prévoir sauvegardes, restrictions d'accès aux exports et procédure de suppression/anonymisation. Les photos d'événement ne doivent être publiées qu'avec autorisation.
- Le tableau de bord charge les candidatures dans la session du gestionnaire autorisé; pour un volume très important, ajouter pagination serveur et agrégations SQL. Les comptes et rôles doivent être administrés par un responsable habilité.

## Recette avant ouverture

Effectuer ces tests dans un projet Supabase de test et avec une adresse e-mail contrôlée :

1. Sans session, `/api/admin/data`, `/api/admin/export.csv` et `/api/admin/export.xlsx` doivent renvoyer 401/403. Via une clé anon, les tables de candidatures doivent être inaccessibles.
2. Créer un owner et un reviewer. Vérifier que le reviewer ne peut pas changer les paramètres, publier dans la galerie ni créer des comptes, y compris par appel API direct.
3. Remplir la configuration, ouvrir les inscriptions, choisir une catégorie, parcourir les quatre étapes, tester participation individuelle et en groupe, joindre un fichier permis. Vérifier le récapitulatif, les consentements et le récépissé PDF. Tester un fichier trop volumineux ou de type invalide.
4. Vérifier la ligne dans PostgreSQL, le message de confirmation et l'outbox. Ressoumettre le même matricule (avec variantes de casse et espaces) : rejet et aucune nouvelle candidature. Vérifier le QR via une photo ou la référence.
5. Tester un code de suivi erroné, expiré, correct puis déjà utilisé. La référence seule ne doit jamais donner de données personnelles.
6. Accepter/refuser une candidature, vérifier l'e-mail de décision; tester un échec Resend avec une configuration de test, puis rétablir la clé et relancer. Vérifier graphiques et exports, filtres, recherche, liens de téléchargement temporaires.
7. Publier et retirer un média autorisé, modifier les annonces et le programme, fermer les inscriptions et vérifier le compte à rebours.
8. Tester navigation clavier, écran mobile, connexion faible, et audit de sécurité avant publication.

## État de vérification de cette livraison

Le code est fourni comme projet source complet, avec migration et configuration d'exemple. La syntaxe TS/TSX a été contrôlée par transpilation locale. L'environnement de création ne pouvait pas récupérer les dépendances npm; le build Next.js, la vérification complète des types et les tests intégrés avec Supabase et Resend n'ont donc pas été exécutés. Aucun envoi d'e-mail, déploiement Vercel ou enregistrement sur une base distante n'est revendiqué. La recette ci-dessus est nécessaire avant une mise en production. Les données officielles de la coordination restent à renseigner.
