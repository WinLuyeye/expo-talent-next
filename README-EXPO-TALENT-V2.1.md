# EXPO TALENT ISS-KIN — Version 2.1 : sécurité et fiabilité

**Date :** 26 novembre 2026. **Base du patch :** branche `main`, dernière version vérifiée `8eba436`. Le patch ne touche pas `PublicSite.tsx`, `app/globals.css`, `lib/acceptance.ts`, aux visuels ou aux données existantes. Les fichiers modifiés ont été comparés par SHA de blob à ceux du dépôt GitHub.

## 1. État de livraison

### Déjà effectué directement sur Supabase production

- Migration `20261126120752_expo_v21_audit_and_outbox_index` appliquée avec succès sur le projet `expo-talent-next` (`yvssxbxdzljgytmjiajb`). **Ne pas la relancer sur cette base.** Elle est fournie dans le dépôt pour les futures installations et l'historique. La migration initiale `001_expo_talent.sql` avait été appliquée avant cet historique MCP : ne pas exécuter `supabase db push` aveuglément en production.
- Index `outbox_app_id_idx` ajouté. L'avertissement de clé étrangère non indexée a disparu. Les index récents n'ont pas encore de statistiques d'utilisation ; aucun index existant n'a été supprimé.
- Table `public.admin_audit` (RLS activée, accès direct refusé à anon/authenticated) ; rôle serveur limité à SELECT et INSERT sur la table, sans UPDATE ou DELETE explicite. Le propriétaire de la base conserve ses pouvoirs de maintenance.
- Fonction `expo_status_audited` réservée au rôle serveur, qui enregistre le changement de statut et le journal dans la même transaction que la mise en file de l'e-mail. Identité de l'administrateur issue de la session serveur. Pas de texte de mail, mot de passe, secret TOTP ni donnée personnelle détaillée dans le journal.
- Vérification après migration : 48 candidatures, 2 rôles administrateurs, 0 événement d'audit, RLS active, permissions anon/authenticated refusées et RPC accessible au service_role uniquement. Aucun compte, aucune candidature, aucun mot de passe, aucun paramètre Auth n'a été modifié.
- L'analyse de sécurité signale RLS sans policy sur les 8 tables (intentionnel : accès exclusivement via routes serveur) et protection contre les mots de passe compromis non activée. Vérifier la disponibilité de cette option dans le plan Supabase avant de l'activer ; aucune modification de l'Auth n'a été faite. Voir https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

### Code fourni, pas encore publié ni déployé

- TOTP Supabase Auth (enrôlement, QR, code, annulation d'un enrôlement incomplet, second appareil de secours). Les routes administratives sensibles vérifient l'identité et le niveau AAL2 côté serveur lorsqu'un facteur est enregistré ou que le mode obligatoire est activé. Aucun e-mail ni SMS nécessaire pour TOTP.
- Onglet Sécurité pour owner et reviewer ; page de vérification à la connexion si nécessaire ; onglet Journal d'audit réservé aux owner (100 dernières modifications de statut). L'historique commence avec le nouveau code ; il ne reconstitue pas les événements anciens, ne couvre pas encore les autres actions et ne constitue pas une preuve d'inaltérabilité face au propriétaire PostgreSQL.
- Tests unitaires de la politique MFA (9 cas), script de tests HTTP en lecture seule, CI GitHub Actions (types, tests, build), sitemap et robots, version 2.1.0 dans package.json.

### Non réalisé / à valider

- Le connecteur GitHub ne peut pas publier de commits (403 constaté précédemment). Le patch est préparé pour application locale. Le réseau de cet environnement ne permet pas de télécharger les dépendances npm : syntaxe TS/TSX et 9 tests unitaires OK, **typecheck complet, build Next.js, tests TOTP réels et test de l'audit avec un changement de statut restent nécessaires**. Aucun test de bout en bout n'a été exécuté sur la production.
- Lecture des logs Vercel refusée (403). Aucun outil CLI Vercel authentifié disponible ici. Aucun service externe de monitoring ni alerte configuré ; pas de sauvegarde créée. Les quotas/plans et l'accès aux journaux sont à vérifier dans les consoles.
- Resend toujours non configuré (RESEND_API_KEY et EMAIL_FROM manquants lors du dernier audit). Les inscriptions peuvent être enregistrées mais la messagerie et le suivi étudiant ne fonctionnent pas pleinement. Le nouveau code ne modifie pas la messagerie ni le PDF d'acceptation.
- Turnstile, Sentry, sauvegardes automatiques, politique CSP, antivirus des pièces jointes, pagination et environnement de staging restent des travaux distincts. Ils nécessitent des décisions, accès ou tests supplémentaires ; aucun abonnement payant souscrit. Aucun envoi de mail ni suppression des 48 candidatures de démonstration effectué.

## 2. Appliquer le patch dans le dépôt local

Utiliser Git Bash dans le dossier du projet existant. Conserver `.git`, `.env.local`, la configuration Vercel et les données Supabase. Ne pas utiliser `git init`, `git push --force` ou `git reset --hard`. Télécharger `expo-talent-v2.1.patch`, par exemple dans `Downloads`, et le garder hors du dépôt. Si le dossier de travail contient des changements locaux, les sauvegarder avant toute fusion et ne pas les écraser.

```bash
git status
git branch --show-current
git fetch origin
git status -sb
```

Si `main` est propre et à jour, continuer. Si tu es simplement en retard sur origin/main, utiliser `git pull --ff-only origin main`. Si les historiques divergent ou le dossier contient des modifications, arrêter et intégrer ces changements avant de poursuivre.

```bash
git apply --check ~/Downloads/expo-talent-v2.1.patch && git apply ~/Downloads/expo-talent-v2.1.patch
```

Si le contrôle échoue, ne pas forcer : le dépôt a peut-être changé. Le patch est basé sur les fichiers vérifiés de GitHub le 26 novembre 2026. Vérifier les différences et adapter le patch à la nouvelle version.

```bash
npm install
npm run typecheck && npm test && npm run build
```

Si une commande échoue, ne pas pousser. Conserver le `package-lock.json` créé par npm ; inspecter les vulnérabilités avec `npm audit` (ne pas faire `npm audit fix --force` sans revue). Après validation :

```bash
git add -- .env.example README.md README-V2.1.md package.json package-lock.json .github/workflows/ci.yml app/robots.ts app/sitemap.ts 'app/api/[...path]/route.ts' components/AdminMfa.tsx components/Dashboard.tsx lib/mfa-policy.ts lib/server.ts scripts/smoke.mjs tests/mfa-policy.test.cjs supabase/migrations/20261126120752_expo_v21_audit_and_outbox_index.sql
git diff --cached --stat
git diff --cached --check
git commit -m "feat: v2.1 MFA TOTP, audit administratif et fiabilite"
git push origin main
```

Surveiller le déploiement : https://vercel.com/winluyeyes-projects/expo-talent-next/deployments. Le workflow CI est ajouté mais n'est pas un verrou de déploiement tant que les protections de branche et Deployment Checks ne sont pas configurés. Vérifier les résultats avant toute diffusion du lien. Ne jamais publier `.env.local`.

## 3. Activation progressive du TOTP (sans e-mail)

1. Le mode initial est `ADMIN_MFA_REQUIRED=false` (ou variable absente). Les administrateurs sans facteur peuvent encore entrer. Les comptes ayant déjà un facteur vérifié doivent fournir AAL2. **Ne pas activer le mode obligatoire avant d'avoir testé tous les administrateurs.** Vérifier que le TOTP Supabase est autorisé dans les réglages Auth du projet ; la configuration n'a pas été changée à distance.
2. Après le déploiement, ouvrir `/admin` et se connecter normalement. Aller dans **Sécurité**, cliquer sur **Configurer mon authentificateur**.
3. Scanner le QR confidentiel avec Google Authenticator, Microsoft Authenticator, Aegis ou un autre outil TOTP. Si nécessaire, saisir la clé affichée manuellement. Ne jamais partager le QR ni la clé ; aucune capture dans les tickets ou conversations. Entrer le code à six chiffres. Le serveur crée puis vérifie le challenge Supabase ; après succès, session AAL2.
4. Enrôler un second appareil de secours de confiance dans le même onglet, idéalement conservé séparément. Supabase ne fournit pas de codes de secours natifs pour TOTP ; prévoir un autre facteur et une procédure de récupération supervisée. L'ajout d'un facteur nécessite AAL2 si un facteur est déjà vérifié. L'annulation ne supprime que les enrôlements incomplets.
5. Se déconnecter puis se reconnecter. Mot de passe puis code TOTP ; une tentative avec code invalide ne doit pas ouvrir le tableau de bord. Tester les deux administrateurs et les facteurs de secours. Les étudiants n'utilisent pas ce système.
6. En environnement de test, vérifier que les routes de données, exports, pièces jointes, audit et mutations refusent les sessions AAL1 d'un compte enrôlé. Les routes session/logout/MFA restent disponibles pour compléter la connexion.
7. Quand les comptes ont tous été testés, ajouter `ADMIN_MFA_REQUIRED=true` dans les variables **Production** Vercel puis redéployer. Tester de nouveau les deux comptes. Cette dernière opération est volontairement laissée à la validation du responsable.

### Perte du téléphone / récupération

- Utiliser le second facteur préalablement vérifié. Ne pas envoyer le code à un tiers.
- Sans facteur de secours, le responsable habilité Supabase doit vérifier l'identité du demandeur hors bande, gérer la récupération/réinitialisation des facteurs depuis Supabase Auth par le processus officiel, révoquer les sessions concernées et superviser un nouvel enrôlement. Ne pas supprimer de compte ou changer les mots de passe par SQL. Ne pas désactiver globalement la MFA pour contourner un compte déjà enrôlé. Le mode progressif ne contourne pas les facteurs vérifiés.
- Documentation : https://supabase.com/docs/guides/auth/auth-mfa ; https://supabase.com/docs/reference/javascript/auth-mfa.

## 4. Journal d'audit

Dans l'espace administrateur principal, ouvrir **Journal d'audit**. Une modification réelle du statut d'une candidature via le nouveau code crée une ligne avec date, UUID du gestionnaire, référence, ancien et nouveau statut. Enregistrer deux fois le même statut ne crée pas de nouvelle ligne. Le rôle reviewer peut modifier une candidature mais ne peut pas accéder au journal. Aucun historique antérieur n'est inventé.

La table et la fonction sont prêtes en production ; l'ancienne version reste compatible jusqu'au déploiement. Pour tester les mutations, utiliser une base de staging et une candidature de test. Ne pas accepter/refuser de vraie candidature pour effectuer un test et ne pas relancer d'e-mail de démonstration en production.

## 5. Tests et vérification de production

```bash
npm run typecheck
npm test
npm run build
```

Dans un terminal, lancer `npm start` après le build avec une configuration locale de test complète. Dans un second terminal Git Bash :

```bash
SMOKE_BASE_URL=http://localhost:3000 npm run test:smoke
# Après déploiement, tests GET sans session, sans modification ni envoi d'e-mail :
SMOKE_BASE_URL=https://expo-talent-next.vercel.app npm run test:smoke
```

Les 7 vérifications HTTP testent la page publique, la configuration et le refus d'accès anonyme à l'administration, à l'audit et aux exports. Les 9 tests unitaires couvrent la politique MFA, pas l'intégration réelle Supabase. Les tests authentifiés et le parcours d'inscription doivent être réalisés séparément en staging : owner/reviewer, activation TOTP, code erroné, code correct, reconnexion, accès direct aux API, second appareil, mutation et entrée d'audit, export, inscription, PDF, QR et réception des emails une fois configurés.

## 6. Exploitation et sauvegardes

- Vercel : contrôler les builds et les Runtime Logs ; si les droits le permettent, configurer une alerte d'erreur et surveiller les réponses 5xx. Vérifier aussi l'accès à `/api/config`. Ne pas enregistrer de secrets, codes MFA, données personnelles ou pièces jointes dans les logs.
- Supabase : vérifier les sauvegardes disponibles selon le plan et préparer une sauvegarde chiffrée de PostgreSQL et une copie distincte des objets `expo-private`/`expo-gallery`. Les sauvegardes de la base ne contiennent pas nécessairement les fichiers Storage eux-mêmes. Tester la restauration sur un projet isolé, avec contrôle d'accès et durée de conservation. Ne jamais déposer de dump, fichier `.env`, clé ou export de candidats sur GitHub.
- Vérifier Auth (inscriptions publiques désactivées, mots de passe forts, politique de mots de passe compromis si disponible), mettre en place une politique de récupération et un responsable de sécurité.
- Avant le lancement : valider date, lieu, date limite, programme, coordonnées officielles et politique de conservation ; retirer ou isoler les 48 données fictives après accord ; configurer la messagerie et tester les flux de bout en bout. En attendant, envisager de suspendre les inscriptions avec la coordination. Cette livraison ne les ferme pas automatiquement.

## 7. Retour arrière

En cas d'échec de la compilation, ne pas pousser. En cas de régression après publication, restaurer le commit précédent via `git revert <commit-de-la-v2.1>` puis push, ou choisir une version antérieure dans Vercel après validation. Attention : revenir à un code antérieur à la MFA supprimerait les contrôles MFA propres à l'application ; si des administrateurs ont déjà enrôlé leur facteur, préférer une correction de l'avant plutôt qu'une régression de la sécurité. Conserver la table d'audit et ses données ; ne pas la supprimer. La migration additive ne bloque pas l'ancien code. Ne pas réinitialiser les utilisateurs, supprimer les données ou relancer la migration initiale.
