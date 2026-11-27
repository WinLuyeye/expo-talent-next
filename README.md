# EXPO TALENT — ISS-KIN

> Révélons aujourd’hui les talents qui façonneront demain !

Plateforme francophone de gestion des inscriptions et des candidatures à EXPO TALENT, organisée par la coordination estudiantine de l’Institut Supérieur de Statistique de Kinshasa (ISS-KIN).

**Édition du logiciel :** V2.7.1 — correctifs de dépendances et sécurité (inclut les versions précédentes). Documentation actualisée le 27 novembre 2026 ; publication après recette. Les fichiers de mise à jour temporaires ne sont pas nécessaires au fonctionnement du projet.

- [Site public](https://expo-talent-next.vercel.app)
- [Espace Coordination](https://expo-talent-next.vercel.app/espace-coordination)
- [Dépôt GitHub](https://github.com/WinLuyeye/expo-talent-next)
- [Déploiements Vercel](https://vercel.com/winluyeyes-projects/expo-talent-next/deployments)
- [Projet Supabase](https://supabase.com/dashboard/project/yvssxbxdzljgytmjiajb)

## Correctif V2.7.1 — dépendances

Le build V2.7 a échoué sur l'audit npm (PostCSS, Zod, UUID). Cibles du correctif : Next.js 16.4.6, React/React DOM 19.3.1, PostCSS 8.5.32, Zod 4.6.7 et ExcelJS 4.4.0 avec UUID 11.1.1. Webpack est conservé explicitement pour limiter les changements de compilation. `proxy.ts` remplace `middleware.ts` sans retirer la CSP à nonce. Les schémas Zod sont centralisés ; le défaut des filtres est parsé avec `prefault` pour conserver les valeurs vides. Les protections et l'audit npm bloquant restent obligatoires. Aucun changement Supabase ni nouvelle migration.

Utiliser Node.js LTS 22 ou 24. À la racine, générer le vrai lockfile puis installer :

```powershell
npm install --package-lock-only --ignore-scripts
npm ci
npm run security:check
npm run build
```

Le script `verify-lock.mjs` exige un lockfile cohérent avec le manifeste et les versions de sécurité ciblées. Ne pas inventer le lockfile, ne pas lancer `npm audit fix --force`, ne pas contourner `prebuild`. Si l'audit ou les tests échouent, ne pas publier. Ajouter explicitement `package-lock.json` au commit avec les fichiers modifiés du correctif. Vérifier les logs Vercel : installation, tests, audit, compilation puis READY sur le bon commit. Après déploiement, exécuter `npm run test:smoke` avec `SMOKE_BASE_URL` pointant vers le site et effectuer les tests navigateur/authentifiés : formulaire et Turnstile, MFA, recherche, exports Excel/PDF, scanner et alertes. Les tests ajoutés portent sur les vrais schémas et générateurs avec des données fictives, sans accès à la production.

Les dépendances ont été choisies à partir des alertes npm et des versions publiées ; l'installation réelle, l'audit actualisé et la compilation doivent encore être exécutés. La CSP reste en observation tant que `CSP_NONCE_ENFORCE` n'est pas activée ; scanner, sauvegardes réelles et webhooks restent à configurer conformément à la section V2.7. Pas de désactivation de ces garde-fous pour faire passer le build.

**Stabilisation PDF (27 novembre 2026).** Le build V2.7.1 a révélé une erreur intermittente `SOI not found in JPEG` : 56 tests réussis au premier passage, 55 au second. Les deux générateurs passent désormais une copie `Uint8Array` du logo JPEG à pdf-lib afin de ne pas dépendre du décalage d'un Buffer dans son allocation sous-jacente. Les tests répètent la génération et la relecture des rapports PDF et fiches d'acceptation, soit 57 tests attendus au total. La recette complète et l'audit restent obligatoires. Générer et publier `package-lock.json` avec `npm install --package-lock-only --ignore-scripts --package-lock=true` puis `npm ci`, vérifier avec `node scripts/verify-lock.mjs`, lancer deux fois `npm test`, puis `npm run build`. Ne publier que si tous ces contrôles passent. Pour éviter le double passage de tests sur Vercel, la commande de build recommandée est `npm run build` (le script `prebuild` exécute toujours le contrôle du lockfile, TypeScript, les tests et l'audit npm). Utiliser `npm ci` comme commande d'installation une fois le lockfile publié. Aucun test ni contrôle ne doit être désactivé.

Références : https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 ; https://github.com/advisories/GHSA-w5hq-g745-h8pq ; https://github.com/advisories/GHSA-r28c-9q8g-f849 ; https://nextjs.org/docs/app/guides/upgrading/version-16

## 1. Fonctionnalités

### Site public

- Présentation de l’événement, catégories de talents, programme, communiqués, galerie, règlement et confidentialité.
- Formulaire d’inscription en quatre étapes : identité, informations académiques, talent, récapitulatif et consentements. Participation individuelle ou en groupe ; pièce jointe facultative.
- Référence d’inscription unique, contrôle des doublons de matricule, récépissé PDF et QR code.
- Suivi de candidature par référence, e-mail et code temporaire (nécessite la messagerie configurée).
- Interface responsive, animations respectant la préférence de réduction des mouvements, signature développeur avec lien WhatsApp et mesure d’audience facultative.

### Espace Coordination

- Tableau de bord bleu nuit, jaune et violet, navigation textuelle, recherche et filtres, cartes responsive, candidatures récentes, actions rapides, graphiques et statistiques détaillées.
- Gestion des candidatures et de leurs statuts, lecture du QR à partir d’une image ou vérification par référence, exports Excel/PDF et liste des participants retenus.
- Notifications et relance manuelle des envois échoués ; confirmation et décision par e-mail, fiche d’acceptation PDF avec QR code (service Resend nécessaire).
- Configuration de l’événement, publication des médias, comptes administrateurs et rôles.
- Double authentification TOTP, journal des changements de statut et statistiques d’audience réservées au rôle `owner`.
- `/admin` redirige vers `/espace-coordination`. Les routes serveur restent sous `/api/admin/` ; la sécurité repose sur les contrôles de session, de rôle et de MFA, non sur le nom de la page.

## 2. Architecture

| Élément | Technologie |
| --- | --- |
| Application et API | Next.js 15, App Router, React 19, TypeScript |
| Interface | CSS global, Tailwind CSS, Framer Motion, Lucide |
| Graphiques | Recharts |
| Base de données et comptes | Supabase PostgreSQL, Auth et Storage |
| Documents et exports | pdf-lib, qrcode, jsQR, ExcelJS |
| Validation | Zod |
| Messagerie | Resend |
| Hébergement et versionnement | Vercel, GitHub |

```text
app/                        Pages, routes API, styles globaux et admin
components/                 Interface publique, tableau de bord, MFA, audience
lib/                        Logique serveur, modèles, PDF et utilitaires
public/                     Logos, images et autres ressources statiques
scripts/                    Tests HTTP en lecture seule
tests/                      Tests unitaires
supabase/migrations/        Historique SQL (à conserver)
.github/workflows/          Intégration continue
.env.example                Modèle des variables d’environnement, sans secrets
README.md                   Documentation unique du projet
```

L’interface utilise les API Next.js pour accéder aux données. Les clés privées Supabase restent exclusivement côté serveur. Les fichiers `.patch` servent uniquement au transfert de modifications ; ne pas les versionner après application. Conserver les migrations SQL, les tests, les scripts, les fichiers source et le lockfile npm s’il est généré.

## 3. Installation et développement local

Prérequis : Node.js 20.9 ou supérieur (Node 22 recommandé), npm, Git et un projet Supabase de test. Utiliser les versions réellement compatibles avec les dépendances verrouillées.

Dans PowerShell, depuis un clone existant :

```powershell
git pull --ff-only origin main
npm install
```

Pour un premier clone :

```powershell
git clone https://github.com/WinLuyeye/expo-talent-next.git
cd expo-talent-next
npm install
```

Créer `.env.local` uniquement s’il n’existe pas déjà :

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Renseigner les valeurs du projet de test. Ne pas utiliser les données réelles de production pour les essais de mutation.

| Variable | Usage |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique anon ou publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur privilégiée, strictement confidentielle |
| `TRACKING_SECRET` | Secret aléatoire d’au moins 32 caractères pour le suivi et les protections dérivées |
| `APP_ORIGIN` | Origine exacte du site, sans chemin (`http://localhost:3000` en local) |
| `RESEND_API_KEY` | Clé d’envoi Resend, confidentielle |
| `EMAIL_FROM` | Adresse d’envoi sur un domaine autorisé et vérifié |
| `TURNSTILE_SITE_KEY` | Clé publique du widget, fournie par Cloudflare |
| `TURNSTILE_SECRET_KEY` | Clé privée du contrôle serveur, ne jamais exposer |
| `TURNSTILE_REQUIRED` | `true` pour rendre la configuration obligatoire |
| `ADMIN_MFA_REQUIRED` | `false` pour activation progressive ; `true` après validation de tous les administrateurs |

Générer un secret localement si nécessaire et le conserver uniquement dans l’environnement :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ne jamais publier de clé privée, mot de passe, clé TOTP, fichier `.env.local`, dump de base ou export de candidatures.

```powershell
npm run dev
```

Site local : `http://localhost:3000` ; administration : `http://localhost:3000/espace-coordination`.

## 4. Base Supabase

### Projet de production existant

La base est déjà installée. **Ne pas réexécuter les migrations sur la production, ne pas réinitialiser les comptes, ne pas lancer `supabase db push` aveuglément.** La migration initiale avait été exécutée avant l’enregistrement des migrations ultérieures dans l’historique distant.

Les dix tables publiques sont protégées par RLS, avec accès direct refusé aux rôles `anon` et `authenticated`. L’absence de politiques publiques sur ces tables est intentionnelle : les opérations passent par les routes serveur. Les fonctions métier sont réservées au rôle serveur. Le bucket `expo-private` contient les pièces jointes privées ; `expo-gallery` est réservé aux médias publiables.

### Installation sur un nouveau projet vierge

Appliquer les fichiers SQL dans l’ordre, après vérification de l’historique :

1. `001_expo_talent.sql` — schéma initial, contraintes, fonctions et buckets.
2. `20261126120752_expo_v21_audit_and_outbox_index.sql` — journal des changements de statut, fonction transactionnelle et index de la file d’e-mails.
3. `20261126122120_expo_v22_traffic_analytics.sql` — agrégats d’audience et déduplication quotidienne des sessions.
4. `20261126133114_expo_v25_security_and_bulk.sql` — maintenance transactionnelle, audit étendu, actions groupées.

Désactiver l’inscription publique à Supabase Auth : les étudiants n’ont pas de compte Auth. Créer et confirmer un compte administrateur dans la console Auth, avec une adresse autorisée et un mot de passe fort. Puis, **uniquement pour une nouvelle installation**, attribuer le rôle à son UUID réel :

```sql
insert into public.admin_roles(id,role)
values ('REMPLACER_PAR_UUID_UTILISATEUR'::uuid,'owner');
```

Ne pas exécuter cet exemple tel quel ni utiliser cette procédure pour modifier les comptes de production existants. Renseigner ensuite la configuration de l’événement.

## 5. Sécurité et fonctionnement des inscriptions

- `owner` : accès complet, configuration, galerie, comptes, audience et journal d’audit. `reviewer` : traitement des candidatures, notifications, vérification QR et exports de candidatures. Les droits sont vérifiés côté serveur.
- Cookies de session HttpOnly, SameSite et sécurisés en production. Contrôle d’origine des requêtes de mutation et limitation persistante des requêtes. Ne pas affaiblir les contrôles pour faciliter un test.
- La normalisation et l’unicité du matricule empêchent les inscriptions en double. La candidature et son message sont enregistrés dans une transaction ; un échec d’envoi n’annule pas l’inscription.
- Suivi étudiant : code à usage unique, HMAC, durée de 10 minutes et cinq tentatives maximum par code. La demande de code ne confirme pas publiquement l’existence d’une candidature.
- Pièces jointes JPEG, PNG, WebP ou PDF, maximum 3 Mo. Contrôle de signature de fichier et liens privés temporaires de 60 secondes. Ce contrôle ne remplace pas un antivirus. Le QR ne contient que la référence ; ce n’est pas une preuve d’identité ni un contrôle de présence.
- Le journal enregistre les changements de statut et la configuration dans la même transaction, ainsi que les demandes d’opérations sensibles (voir section 11). Il ne reconstitue pas le passé et n’est pas inaltérable vis-à-vis du propriétaire PostgreSQL.
- Respecter la politique de confidentialité, limiter les exports aux personnes habilitées et prévoir une procédure de suppression/anonymisation, y compris des objets Storage. La purge des candidatures n’est pas automatisée.

### Double authentification (sans e-mail)

1. Vérifier que TOTP est autorisé dans Supabase Auth. Laisser `ADMIN_MFA_REQUIRED=false` (ou absent) tant que le déploiement progressif n’est pas validé. Un compte disposant déjà d’un facteur vérifié doit néanmoins atteindre le niveau AAL2.
2. Se connecter à l’Espace Coordination, rubrique **Sécurité**, puis **Configurer mon authentificateur**.
3. Scanner le QR confidentiel dans Google Authenticator, Microsoft Authenticator, Aegis ou un équivalent TOTP. Entrer le code à six chiffres. Ne jamais partager le QR, la clé ou le code.
4. Ajouter et vérifier un second appareil de confiance conservé séparément. Supabase ne fournit pas de codes de récupération natifs pour cette méthode.
5. Tester déconnexion/reconnexion, code invalide, code correct, second facteur de secours et les droits de chaque administrateur. Une session AAL1 d’un compte enrôlé ne doit pas accéder aux API sensibles.
6. Après validation de tous les comptes et d’une procédure de récupération, le responsable peut définir `ADMIN_MFA_REQUIRED=true` dans Vercel Production, puis redéployer et retester.

En cas de perte du téléphone, utiliser l’appareil de secours. Sans celui-ci, faire vérifier l’identité hors bande par un responsable habilité Supabase, suivre la procédure officielle de récupération des facteurs, révoquer les sessions concernées et superviser un nouvel enrôlement. Ne pas contourner la MFA, supprimer le compte ou modifier le mot de passe par SQL.

Documentation : https://supabase.com/docs/guides/auth/auth-mfa

## 6. Messagerie et documents

Le code utilise Resend. La dernière vérification de configuration a montré que `RESEND_API_KEY` et `EMAIL_FROM` n’étaient pas encore renseignées sur Vercel. Le suivi étudiant et les notifications ne doivent pas être considérés comme opérationnels tant que les essais de réception ne sont pas réussis.

1. Vérifier un domaine expéditeur contrôlé par la coordination dans Resend, avec les enregistrements DNS demandés.
2. Générer une clé d’envoi de portée adaptée et la renseigner dans les variables Vercel Production, avec une adresse `EMAIL_FROM` autorisée.
3. Tester en staging la confirmation, le code de suivi, l’acceptation avec PDF, le refus et la relance d’un envoi échoué. Redéployer après changement d’environnement.

Le statut « envoyé » signifie que Resend a accepté la demande, pas que le message a été remis au destinataire. La file d’attente conserve les échecs ; un état `sending` bloqué est relançable après dix minutes. Les tentatives utilisent l’idempotence du fournisseur, dont la fenêtre de déduplication est limitée. Une alternative SMTP demanderait une adaptation du code ; elle n’est pas configurée actuellement.

## 7. Audience du site

L’onglet **Audience du site** et la vue d’ensemble utilisent les agrégats Supabase, avec des périodes de 7, 30 ou 90 jours, en fuseau `Africa/Kinshasa`.

- Pages vues, sessions quotidiennes estimées, pages par session, pic de fréquentation, inscriptions réelles et distributions par appareil et canal.
- Export Excel et PDF (évolution quotidienne, appareils, provenances, données détaillées et méthode). Les exports d’audience sont réservés au propriétaire et ne contiennent pas de données personnelles des candidats ni d’identifiant de session.
- La mesure est facultative ; le consentement est modifiable dans la fenêtre Confidentialité. Les signaux DNT/GPC sont respectés. Refuser n’empêche pas l’inscription.
- Une session estimée représente un onglet par jour, pas une personne unique. Le jeton aléatoire de session est stocké dans `sessionStorage` après accord ; son hachage journalier est conservé côté serveur pour la déduplication. Les jetons des jours précédents sont nettoyés à la prochaine collecte acceptée ; une purge planifiée reste à prévoir si nécessaire.
- Les statistiques ne contiennent pas d’IP brute, de référent complet, de user-agent brut, de nom, d’e-mail ou de matricule. La limitation de requêtes utilise séparément une clé HMAC dérivée de l’IP. La mesure est partielle (refus, bloqueurs, référents masqués, robots non détectés et erreurs réseau).
- Les inscriptions fictives (`data.synthetic=true`) sont exclues des inscriptions réelles de l’audience, mais restent dans les compteurs généraux de candidatures. Ne pas calculer un taux de conversion en divisant des inscriptions totales par des visites consenties : populations différentes. Aucun historique antérieur à l’activation n’est reconstitué.
- La coordination doit valider les mentions de confidentialité et la rétention des agrégats ; aucune durée officielle ne doit être inventée.

## 8. Tests, déploiement et maintenance

Avant tout push, vérifier que les modifications sont voulues :

```powershell
git status
npm run typecheck
npm test
npm run build
```

Les tests unitaires existants couvrent la politique MFA et le modèle d’audience (35 cas dans la livraison V2.5, dont 11 nouveaux tests de sécurité). Ils ne remplacent pas les tests d’intégration ni les essais visuels authentifiés.

Pour les tests HTTP en lecture seule, démarrer l’application locale après compilation (`npm start`), puis dans un autre terminal :

```powershell
$env:SMOKE_BASE_URL = 'http://localhost:3000'
npm run test:smoke
```

Ou, pour vérifier les routes publiques et le refus d’accès anonyme en production :

```powershell
$env:SMOKE_BASE_URL = 'https://expo-talent-next.vercel.app'
npm run test:smoke
```

Recette complète en staging avec comptes et adresses de test :

- Accès owner/reviewer, MFA, refus des routes sensibles sans session et sans second facteur requis, journal d’audit et restrictions de rôle.
- Formulaire individuel/groupe, doublons, consentements, pièces jointes invalides, PDF, QR, codes de suivi, décisions et notifications après configuration de la messagerie.
- Audience : refus/accord/retrait de consentement, deux chargements du même onglet, nouvel onglet, rapports 7/30/90 jours et exports. Ne pas injecter de fausses données dans les statistiques de production.
- Tableau de bord : recherche, filtres, candidatures récentes, détails, graphiques, exports et déconnexion. Tester 320 à 1440 px, clavier, zoom 200 %, tableaux, fenêtres et barres de défilement.
- Site public, lien Espace Coordination et redirection de `/admin`.

### Publication

Versionner les fichiers source et le lockfile npm s’il est généré. Ne pas publier les fichiers `.patch`, archives de livraison, secrets ou exports. Contrôler les fichiers ajoutés avant commit :

```powershell
git diff --cached --stat
git diff --cached --check
git commit -m "description de la modification"
git push origin main
```

Le dépôt est relié à Vercel : les pushes sur `main` déclenchent un déploiement de production. Vérifier le commit déployé, le statut `READY`, le site public et l’espace authentifié. La CI GitHub Actions ne constitue pas automatiquement un verrou de publication ; configurer les protections de branche et de déploiement si nécessaire. Ne pas forcer un push. En cas de régression, privilégier une correction ou un `git revert` du commit concerné après analyse ; ne pas restaurer une version qui contourne la MFA pour un compte déjà enrôlé. Conserver les migrations et données.

### Sauvegardes et surveillance

- Vérifier le plan Supabase, organiser des sauvegardes chiffrées de PostgreSQL et une copie séparée des objets Storage ; tester une restauration isolée. Aucune sauvegarde automatique supplémentaire n’a été confirmée.
- Surveiller les builds, réponses 5xx, logs Vercel et quotas Supabase. L’accès aux logs d’exécution avait été refusé lors d’un audit ; les alertes externes ne sont pas configurées. Ne pas journaliser de données personnelles ou secrets.
- Maintenir les dépendances et examiner `npm audit` sans correction forcée non revue. Prévoir pagination/agrégations pour les gros volumes, analyse antivirus, validation réelle de Turnstile, CSP avec nonce et environnement de test séparé.

## 9. Situation et préparation du lancement

Le projet était déjà déployé en V2.3/V2.4. Cette livraison V2.5 prépare les modifications de code et ne confirme pas encore leur déploiement. La migration V2.5 a été appliquée le 26 novembre 2026. La dernière vérification Supabase V2.5 a confirmé 48 candidatures, deux administrateurs, zéro notification en file et les permissions serveur des nouvelles fonctions. Les dix tables restent protégées. Ces chiffres sont un constat historique, pas des indicateurs actualisés. Les premiers compteurs de visites sont alimentés. Les inscriptions étaient fermées au dernier contrôle ; consulter la configuration actuelle avant ouverture.

Avant le lancement officiel :

- [ ] Valider date, lieu, échéance d’inscription, programme, auditions et répétitions, contacts officiels.
- [ ] Faire valider règlement, confidentialité et durée de conservation par la coordination.
- [ ] Configurer et tester la messagerie, le suivi étudiant et le PDF d’acceptation.
- [ ] Tester les accès administrateurs, facteurs de secours et exports réels.
- [ ] Isoler ou retirer les candidatures fictives après accord, sans toucher aux utilisateurs ni aux dossiers réels.
- [ ] Organiser sauvegardes, restauration, surveillance, sécurité renforcée et formation de la coordination.
- [ ] Valider la recette de bout en bout, puis ouvrir les inscriptions.

## 10. Historique synthétique

| Version | Évolution |
| --- | --- |
| V2.0 | Application Next.js, Supabase, site public, inscriptions et administration |
| V2.1 | MFA TOTP progressive, journal des statuts, index SQL, tests et CI |
| V2.2 | Administration responsive, Espace Coordination, audience et exports |
| V2.3 | Dashboard premium épuré, graphiques et accès rapides |
| V2.4 | UI/UX, réglage d’audience dans Confidentialité |
| V2.5 | Validations, brouillon facultatif, Turnstile, inactivité, audit, lots, maintenance et CSP |
| Correctifs visuels | Signature développeur, boutons d’inscription et scrollbars globales |

Le détail des changements techniques reste disponible dans l’historique Git. Les anciens README et patches peuvent être archivés hors du dépôt après vérification de leur intégration.

## 11. Exploitation de la V2.5

### Installation de la mise à jour (PowerShell)

La migration `20261126133114_expo_v25_security_and_bulk` est déjà appliquée sur la production. **Ne pas relancer le SQL.** Les 48 candidatures et les deux administrateurs sont inchangés. Les inscriptions restent fermées ; aucun e-mail ni changement de statut réel n’a été effectué. Les tests de maintenance, de statut groupé, de journal et de statut obsolète ont été exécutés dans une transaction annulée, sans laisser de ligne de test.

Garder le patch hors du dépôt (par exemple Downloads). Depuis le dépôt local propre, synchronisé avec `main`, exécuter les commandes séparément ; arrêter dès qu’une échoue :

```powershell
git status --short
git pull --ff-only origin main
git apply --check --index "$env:USERPROFILE\Downloads\expo-talent-v2.5.patch"
git apply --index "$env:USERPROFILE\Downloads\expo-talent-v2.5.patch"
git diff --cached --stat
npm install
npm run typecheck
npm test
npm run build
git diff --cached --check
git commit -m "feat: v2.5 securite et fiabilite"
git push origin main
```

Le patch modifie le README existant, pas un README de version. Ne pas utiliser `git add .` pour masquer un échec d’application. Conserver les secrets et archives hors Git. Si le README local ou le code a été modifié, conserver ces changements et adapter les hunks ; ne pas forcer le patch. Le lien Espace Coordination est retiré du pied de page, mais `/espace-coordination` et l’ancienne redirection restent utilisables.

### Formulaire et brouillons

- Validation par étape et vérification finale : numéro de téléphone (7 à 15 chiffres), matricule de 2 à 80 caractères significatifs, champs obligatoires, valeurs académiques autorisées, taille des champs, HTTPS sans identifiants, nombre de participants et consentements. Le serveur valide indépendamment du navigateur. Le format du matricule n’est pas une vérification de la scolarité : seule une liste officielle permettrait de confirmer l’identité étudiante. Ne pas collecter une telle liste sans autorisation.
- Limite de cinq tentatives d’inscription par combinaison IP/matricule et par heure, en plus de la limite IP existante. Le matricule unique est maintenu. Les pièces jointes restent limitées à 3 Mo et contrôlées par signature. Aucun antivirus n’est installé. Les contrôles MIME côté navigateur sont seulement une aide.
- Sauvegarde **facultative**, désactivée initialement, sur appareil personnel : localStorage avec durée de reprise de 24 heures depuis la dernière modification. Pas de fichier, jeton CAPTCHA, case de consentement ou récépissé dans le brouillon. Les champs personnels restent lisibles dans le navigateur local ; éviter les appareils partagés. Effacement manuel, sur réussite ou à la prochaine ouverture si expiré. Pas de synchronisation serveur. Après restauration, vérifier à nouveau les données et joindre le fichier.
- Les champs restent en mémoire lors d’une coupure ; pas d’envoi automatique. Le bouton de confirmation est bloqué hors connexion et pendant la requête. Si la réponse a été perdue après validation côté serveur, ne pas contourner l’unicité : demander à la coordination de vérifier le dossier. Le service de suivi par e-mail n’est pas encore opérationnel.

### Cloudflare Turnstile

Créer un widget de type Managed dans https://dash.cloudflare.com/ (Turnstile), autoriser `expo-talent-next.vercel.app` et utiliser un widget séparé en test. Renseigner dans Vercel Production les variables `TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET_KEY`, puis `TURNSTILE_REQUIRED=true` et redéployer. Ne jamais afficher la clé secrète. Aucun changement DNS n’est nécessaire pour utiliser Turnstile avec ce site.

Sans les deux clés, la protection existante continue uniquement si aucune clé n’est définie et que le mode obligatoire n’est pas activé. Une configuration partielle ou obligatoire sans clés bloque les inscriptions (fail-closed). Avec les deux clés, le serveur valide chaque token via Siteverify, son hostname et l’action `registration`, avant dépôt de fichier ou insertion. Les jetons sont à usage unique et expirent. Un échec oblige à refaire la vérification. Les clés réelles ne sont pas encore configurées. Tester sur staging avant ouverture des inscriptions. Référence : https://developers.cloudflare.com/turnstile/get-started/server-side-validation/.

### Inactivité et journal

L’administration verrouille localement son interface après 15 minutes sans interaction ; les API exigent un cookie d’activité signé et lié au compte ainsi qu’à l’identifiant de session Supabase, valable 20 minutes depuis le dernier accès autorisé. Une requête d’activité est envoyée au plus une fois toutes les deux minutes lors d’une interaction réelle. Le mot de passe puis le TOTP (si requis) restent nécessaires. Le contrôle est propre à l’application et ne remplace pas la révocation de toutes les sessions Supabase. Les anciennes sessions doivent se reconnecter une fois après déploiement. Une expiration peut perdre une modification de configuration non enregistrée. Le mode MFA obligatoire reste progressif : ne pas activer sans valider les deux comptes et facteurs de secours.

Le journal owner montre les 100 dernières actions. Les statuts et la configuration sont journalisés dans leurs transactions. La connexion correspond à l’acceptation du mot de passe, éventuellement avant le second facteur. Les exports de candidats et d’audience, documents, notifications, galerie et comptes enregistrent des **demandes**, non des preuves de réussite. Le logout est journalisé au mieux sans bloquer la déconnexion. Aucune clé, mot de passe, corps d’e-mail ou détail personnel n’est inscrit. Les traces antérieures ne sont pas reconstituées.

### Actions groupées et maintenance

Le rôle owner peut sélectionner jusqu’à 20 candidatures réelles à la fois dans Candidatures. Les démos et participations confirmées sont exclues. Les statuts autorisés sont en examen, acceptée et refusée. Un dossier modifié entre lecture et exécution annule tout le lot. La transaction enregistre statuts, audit et notifications ; les notifications sont **en attente** dans l’onglet Notifications et ne partent pas automatiquement par le lot. Une confirmation explicite précède chaque opération. Ne pas traiter de vrais dossiers pour tester.

Dans Configuration, le mode maintenance suspend inscriptions et suivi sans rendre le site public illisible ni bloquer l’administration. Le contrôle d’inscription est également transactionnel dans PostgreSQL ; l’état d’ouverture initial est conservé. Le désactiver rétablit le fonctionnement en fonction du réglage d’ouverture et de la date limite. Il n’est pas activé automatiquement par cette livraison.

### En-têtes HTTP

CSP appliquée (scripts et connexions autorisés vers Turnstile, frames limitées, object-src none, form-action self, frame-ancestors none). Les scripts inline Next.js et styles inline sont encore autorisés pour préserver le rendu actuel ; ce n’est pas une CSP stricte à nonce. Eval n’est pas autorisé en production. HSTS, no-store/noindex des pages et API admin, anti-framing et protections existantes conservés. Vérifier l’absence de violations CSP et le rendu/animations/galerie/CAPTCHA sur les navigateurs réels avant lancement.

### Sauvegardes : procédure à mettre en service

1. Consulter Database > Backups dans la console Supabase et vérifier la fréquence, rétention et coût de l’offre. En complément, organiser un export PostgreSQL chiffré, avec un outil PostgreSQL compatible ou le CLI officiel, en utilisant une connexion et un compte de sauvegarde autorisés. Ne jamais commiter la chaîne de connexion ni la copier dans les logs. La sauvegarde doit inclure les schémas et données requis, les rôles applicatifs, les fonctions et les données Auth selon la procédure officielle.
2. Copier séparément les objets des buckets `expo-private` et `expo-gallery`, avec accès limité et métadonnées ; les sauvegardes PostgreSQL ne contiennent pas nécessairement leurs fichiers. Conserver les clés et variables dans un gestionnaire de secrets distinct. Chiffrer et conserver hors du dépôt, avec accès restreint, durée validée par la coordination, et une copie indépendante.
3. Restaurer dans un projet isolé, jamais sur la production pour un essai. Comparer les comptes, les dossiers, les index, les règles RLS, les objets et le journal ; vérifier connexion et lecture des pièces jointes sans envoyer de mail. Définir fréquence (quotidienne pendant la campagne recommandée), responsable, objectifs de perte de données et délai de reprise. Aucune sauvegarde, tâche automatique ou restauration réelle n’a été effectuée par cette livraison. Documentation : https://supabase.com/docs/guides/platform/backups.

### Recette V2.5 et limitations

- 35 tests unitaires exécutés ; les 11 nouveaux cas couvrent les règles pures. Les tests SQL ont réussi en transaction annulée. Contrôler le patch sur le dépôt local, le typecheck, le build et les tests HTTP avant déploiement. Les tests unitaires ne remplacent pas une vérification des contrôles Auth, du CAPTCHA et de la CSP dans un navigateur.
- En staging : vérifier les champs avec des données invalides et valides, brouillon et effacement, coupure/rétablissement, double soumission, captcha absent/faux/expiré/valide, accès owner/reviewer, expiration avec requêtes API directes, réauthentification MFA, audit d’export et configuration, lot périmé et lot valable, maintenance avec formulaire ouvert, retour au mode normal. Vérifier exports, PDF/QR et notifications séparément. Utiliser un compte de test et des données fictives hors production.
- Le connecteur GitHub ne permet pas de pousser les sources (403 constaté lors des précédentes mises à jour). Le dépôt de production doit recevoir le patch par Git puis Vercel doit compiler. L’environnement de préparation ne dispose pas des dépendances npm complètes : compilation intégrale et tests intégrés à effectuer localement. Les changements PublicSite sont des hunks ciblés, fondés sur les extraits de la version GitHub ; les autres fichiers de référence ont été comparés par empreinte.
- Restent : clés Turnstile, messagerie, sauvegardes réelles et restauration, audit des dépendances, alertes, liste officielle des étudiants, antivirus, CSP stricte avec nonce après test, recette authentifiée. Aucun achat, modification d’utilisateur ni ouverture des inscriptions.

---

**Conçu avec ♥ par [Winner Luyeye](https://wa.me/243818897032).**


## V2.6 — Coordination : ergonomie, candidatures et rapports

- Navigation fixe sous l’en-tête : seule la liste des rubriques défile si nécessaire ; compte et déconnexion en pied de sidebar. Sur mobile, sélecteur de rubrique et déconnexion compacts. Actualiser est contextuel, recherche dans Candidatures uniquement. Le contour blanc permanent de la classe Tailwind `outline` est neutralisé côté administration, le focus clavier est conservé.
- Candidatures : recherche insensible aux accents et à la casse, filtres par population/promotion/filière/catégorie/statut, pagination locale 15/25/50, résultats et états vides explicites. Le tableau de bord charge toujours les données côté serveur ; la pagination visuelle n’est pas une pagination SQL. Les dossiers fictifs restent consultables mais les opérations groupées ne les modifient jamais. La sélection en lot ignore les statuts modifiés depuis la sélection et le serveur conserve les contrôles de concurrence et de rôles V2.5.
- Statistiques détaillées : effectifs et pourcentages avec libellés complets, statut, promotion, catégorie, filière, département, vacation, type et évolution quotidienne. Population toutes/réelles/démo. Les zéros sont conservés pour les statuts. La mesure d’audience n’est pas modifiée.
- Exports **Excel (.xlsx) et PDF (.pdf) uniquement** : dossiers filtrés, participants retenus filtrés, statistiques, audience. Les fichiers reprennent le logo et l’identité bleu nuit / jaune EXPO TALENT ; Excel utilise des feuilles thématiques, filtres, lignes alternées, en-tête figé ; PDF utilise un fond clair pour la lecture/impression, pagination, en-tête et mention confidentielle. Le PDF détaillé est limité à 300 dossiers par export ; utiliser Excel ou affiner les filtres. Les caractères hors du jeu de la police PDF standard sont remplacés par `?` ; Excel conserve les caractères d’origine. Les pièces jointes ne sont pas incluses dans les rapports, seul leur nom est exporté. Les exports de candidatures contiennent des données personnelles : ne pas les partager ni les versionner. Les exports filtrés utilisent POST pour ne pas exposer les recherches dans les URL. Les anciennes routes CSV ne sont plus proposées et renvoient une erreur aux utilisateurs authentifiés. Les contrôles d’accès et le journal des demandes d’export sont conservés.
- Aucun changement de Supabase, de comptes, de candidatures ni de configuration de messagerie. Les inscriptions et Turnstile restent tels qu’ils sont configurés.

### Recette V2.6

Exécuter `npm run typecheck`, `npm test` et `npm run build`, puis vérifier le déploiement. Dans un environnement de test, vérifier le menu sticky et le focus clavier à 320, 390, 768, 1024 et 1440 px, la sidebar sur une faible hauteur, le zoom 200 %, la fiche et son retour de focus, les filtres et le lot avec données réelles de test ; les données démo ne sont pas éligibles. Tester l’export Excel/PDF avec des libellés longs, listes vides, caractères accentués et plusieurs pages ; vérifier les populations, les totaux, les permissions owner/reviewer, et le refus d’accès sans session. Les exports d’audience restent réservés au propriétaire. Ne pas créer de candidature fictive ni envoyer d’e-mails en production pour la recette.

## V2.7 — Durcissement sécurité (à mettre en production après recette)

Cette version conserve le design, les comptes, les candidatures, la MFA progressive et Turnstile. La migration `20261126155533_expo_v27_security_incidents.sql` a déjà été appliquée au projet de production le 26/11/2026. Ne pas la rejouer manuellement sur ce projet. Aucune autre modification de données n'est nécessaire.

### 1. Dépendances et déploiements bloquants

- `package-lock.json` doit être créé à partir du `package.json` V2.7 par npm et commité. Ne pas fabriquer le lockfile ni utiliser un fichier d'une version antérieure. Le registre npm était inaccessible dans l'environnement de préparation ; l'audit réel n'a donc pas pu être terminé. Sur un poste connecté :

```powershell
npm install --package-lock-only --ignore-scripts
npm ci
npm audit --audit-level=high
npm run build
```

`prebuild` lance systématiquement `npm run typecheck`, `npm test` puis `npm audit --audit-level=high`. Une vulnérabilité haute/critique ou un audit indisponible bloque la compilation et évite une promotion non contrôlée sur Vercel. Les avertissements modérés/faibles doivent également être examinés ; ne pas appliquer `npm audit fix --force` sans examiner les changements et tester. Ne jamais ignorer une erreur de build. Le CI utilise `npm ci` sans fallback et `npm run build`. Dans Vercel Settings > Build and Deployment, vérifier que le build appelle bien `npm run build` (le réglage `npm run typecheck && npm test && npm run build` a aussi été demandé par API, mais la lecture du réglage n'était pas disponible). L'étape prebuild assure le blocage même avec la commande par défaut. Vérifier le résultat du CI avant tout merge ; dans GitHub Settings > Rules > Rulesets, si disponible, exiger la réussite du job `check` avant mise à jour de main, avec PR obligatoire si souhaité. Cela change le workflow direct de push : ne l'activer qu'après le premier push et le succès de ce CI.

`.github/dependabot.yml` active les mises à jour hebdomadaires npm et Actions à partir du commit sur la branche par défaut. Dans GitHub Settings > Advanced Security (ou Code security), vérifier Dependency graph, Dependabot alerts et Dependabot security updates. Ces interrupteurs ne sont pas accessibles depuis le connecteur actuel. Examiner les PR et leurs tests avant merge. Documentation : https://docs.github.com/en/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file

### 2. Antivirus : blocage des fichiers non analysés

`lib/scan-file.ts` impose une analyse du contenu avant l'écriture dans les buckets (inscriptions et galerie). La taille et le format restent contrôlés. Le scanner répond `clean` uniquement si ClamAV renvoie un résultat concluant et le SHA-256 correspond ; un résultat infecté, inconnu, une panne, un timeout ou une configuration manquante empêchent le dépôt. **Tant que le scanner n'est pas opérationnel, les nouvelles pièces jointes et images de galerie seront refusées.** Les inscriptions sans pièce jointe et les liens vidéo restent utilisables. Les fichiers historiques ne sont pas rétroactivement analysés.

Le service fourni dans `tools/antivirus` nécessite un hôte de confiance avec Docker et un reverse proxy HTTPS. Ne jamais exposer le port TCP 3310 de clamd sur Internet (protocole non authentifié). Le service HTTP écoute uniquement sur 127.0.0.1:8787 côté hôte ; limiter la taille à 3 Mo et le débit dans le proxy TLS, ne pas logger les contenus ou l'en-tête Authorization, utiliser un certificat valide. Générer un jeton aléatoire >= 32 caractères sur ton poste, le conserver dans le fichier `.env` privé de l'hôte, non commité. Sur l'hôte : `docker compose up -d` dans le dossier `tools/antivirus`. Attendre que les signatures ClamAV soient à jour ; épingler les images à des digests vérifiés lors du déploiement et organiser les mises à jour. Configurer la même valeur dans Vercel (Secret) `FILE_SCAN_TOKEN` et `FILE_SCAN_URL=https://<ton-hote>/scan` (Config) puis redéployer. Aucun fichier étudiant ne doit être transféré à un service public d'analyse. Le service est préparé mais n'a pas été hébergé ou connecté ; aucun hébergeur ni coût n'a été engagé.

Recette sur un environnement isolé : tester fichier PDF/image sain, fichier de test antivirus EICAR officiel (sans le placer en production), panne du scanner et verdict/hash invalide. Vérifier aucun objet écrit en cas de refus. Un antivirus n'offre pas une garantie d'absence de malware. Documentation ClamAV : https://docs.clamav.net/manual/Usage/Scanning.html

### 3. CSP avec nonce : phase d'observation puis application

`middleware.ts` génère un nonce aléatoire par requête HTML, le transmet à Next.js via l'en-tête CSP de requête et prépare une politique `script-src` à nonce + `strict-dynamic` sans `unsafe-inline` pour les scripts. Le layout est dynamique. Les styles inline restent autorisés pour les animations et graphiques. Au premier déploiement, la CSP à nonce est en `Report-Only` tandis que l'ancienne politique continue à protéger le site. Tester la console navigateur (Chrome, Firefox, téléphone), le chargement/hydratation des pages, les formulaires et Turnstile, la galerie, la connexion et la MFA, le dashboard et les exports. Vérifier deux rechargements avec des nonces distincts. Après validation, ajouter sur Vercel `CSP_NONCE_ENFORCE=true` (Config, Production), redéployer et répéter les tests ; le header `Content-Security-Policy` doit contenir le nonce et ne plus autoriser les scripts inline. Retour arrière si régression : `CSP_NONCE_ENFORCE=false` puis redéployer. Ne pas mettre le nonce en cache. Les API ont une CSP restrictive distincte. Le mode strict n'a pas été activé en production pendant la préparation.

### 4. Sauvegardes chiffrées et restauration

Le projet Supabase est sur le plan Free : ne pas compter sur un téléchargement de sauvegardes quotidiennes gérées. Une sauvegarde PostgreSQL ne contient pas les objets Storage. Installer les clients PostgreSQL compatibles avec la version serveur (17 ou supérieure compatible), `age`, `tar`, et Node/npm sur une machine de confiance avec stockage **chiffré** (y compris le dossier temporaire du système). Conserver la clé privée age hors du dépôt, dans un coffre séparé ; `age-keygen -o <chemin-prive>` génère une identité et son destinataire public `age1...`.

Créer un fichier d'environnement **hors du projet**, avec droits d'accès restreints à ton compte Windows. Utiliser les paramètres de connexion directe ou session pooler Supabase (port 5432, pas le pooler transactionnel) du bouton Connect, le certificat racine Supabase, et la clé privée du projet. Ne jamais les envoyer dans un chat, GitHub, un artefact CI ou des logs. Exemple de noms (remplacer les valeurs sur ton poste) :

```dotenv
PGHOST=
PGPORT=5432
PGUSER=
PGPASSWORD=
PGDATABASE=postgres
PGSSLROOTCERT=C:/chemin-prive/certificat.crt
BACKUP_SUPABASE_URL=https://yvssxbxdzljgytmjiajb.supabase.co
BACKUP_SERVICE_KEY=
BACKUP_AGE_RECIPIENT=age1...
BACKUP_DIRECTORY=C:/chemin-prive/expo-backups
```

Faire la première sauvegarde pendant une fenêtre sans écriture (fermer les inscriptions et convenir d'une pause des modifications admin). Le script `scripts/backup.mjs` utilise TLS verify-full, archive logique des schémas public/auth/storage et télécharge les objets des deux buckets via Storage. Le manifeste contient les chemins, tailles et SHA-256 ; sortie `expo-...tar.age` chiffrée avec age. Les données intermédiaires sont supprimées à la fin, mais un arrêt brutal peut laisser des fichiers temporaires : utiliser un disque chiffré, contrôler le dossier temporaire et ne jamais le synchroniser. L'archive ne constitue pas un snapshot complet de la plateforme : les secrets Vercel, réglages Auth, extensions et rôles du cluster doivent être documentés/sauvegardés séparément via leurs procédures officielles. Garder une seconde copie chiffrée sur un support hors site sécurisé.

```powershell
node --env-file="C:\chemin-prive\expo-backup.env" scripts/backup.mjs
$env:BACKUP_AGE_IDENTITY_FILE="C:\chemin-prive\identite-age.txt"
npm run backup:verify -- "C:\chemin-prive\expo-backups\expo-AAAA-MM-JJ.tar.age"
Remove-Item Env:BACKUP_AGE_IDENTITY_FILE
```

Le contrôle vérifie le déchiffrement, le manifeste, les empreintes des objets et l'inventaire pg_restore. **Ce n'est pas une restauration réelle.** Une fois la première sauvegarde vérifiée, installer la tâche quotidienne Windows (session ouverte ; machine allumée) avec `powershell -File scripts/register-backup-task.ps1 -ConfigFile "C:\chemin-prive\expo-backup.env" -At 02:00`. Vérifier le Planificateur de tâches, le résultat de chaque exécution et la présence d'archives récentes. Ne pas effacer automatiquement les anciennes sauvegardes avant d'avoir défini une durée de conservation et vérifié les copies.

Exercice de restauration obligatoire : sur un projet/local stack **isolé** de la production (sans mail, webhooks ni secrets de production), utiliser le guide officiel Supabase Backup and Restore. Inspecter le dump logique et rétablir les extensions/roles/managés selon la version de la plateforme ; ne pas exécuter de `--clean` ni restaurer sur la base de production. Les schémas gérés Auth/Storage ne doivent pas être écrasés aveuglément. Restaurer les objets depuis le manifeste en respectant les buckets et politiques privés ; vérifier les comptes (nouvelle session/MFA si nécessaire), les comptages, les statuts, les pièces jointes et les empreintes, les permissions et la recette de l'application. Documenter le temps de reprise et les écarts. Les scripts ont été vérifiés syntaxiquement mais ni sauvegarde réelle, ni restauration réelle, ni tâche quotidienne n'ont été exécutées sur ton poste. Guides : https://supabase.com/docs/guides/platform/backups et https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

### 5. Surveillance des incidents

Deux tables serveur-only et une fonction transactionnelle ajoutées à Supabase. Les comptes et les sources réseau sont représentés par des HMAC à domaines séparés (pas d'e-mail ni d'IP brute dans ces tables). Seuils par fenêtre fixe de 15 min : 10 échecs/blocages pour un compte depuis au moins 3 sources, 10 échecs/blocages depuis une source, 5 erreurs serveur, 3 fichiers détectés infectés. Les seuils sont des signaux et ne constituent pas une preuve d'attaque. Déduplication par fenêtre/type/cible ; conservation 14 jours des agrégats et 30 jours des alertes, purge lors de l'enregistrement de nouveaux événements. Le code limite aussi les essais de connexion par compte globalement. La surveillance n'est pas un SIEM : seules les routes instrumentées sont suivies et une panne de Supabase peut empêcher l'enregistrement. Aucun mot de passe, OTP, corps de requête, document ni clé n'est enregistré.

Dans l'espace Coordination > Sécurité > Alertes de sécurité, le principal consulte les alertes récentes. Il peut les actualiser manuellement sans polling continu qui maintiendrait artificiellement la session. En option, `SECURITY_WEBHOOK_URL` (HTTPS d'un récepteur de confiance) et `SECURITY_WEBHOOK_TOKEN` (Secret >=32 caractères) envoient une notification JSON sans compte ni IP au premier seuil franchi. Livraison best effort, pas de retry automatique ; aucun récepteur n'a été configuré. Le workflow `.github/workflows/availability.yml` teste la disponibilité et les protections publiques toutes les heures et peut déclencher les notifications d'échec GitHub Actions selon les réglages de compte (vérifier que les workflows programmés et les notifications sont autorisés). Il ne fait pas de tentative de connexion ni d'inscription. Vérifier également les erreurs Vercel Observability ; les logs seuls ne constituent pas un système d'alertes complet.

### 6. Recette et état de préparation

La migration et le test SQL de déduplication/détection multi-sources ont réussi avec rollback ; 48 candidatures et deux administrateurs conservés. Le test ne génère pas de faux incidents en production. Les tests unitaires couvrent aussi la CSP et le contrat scanner. L'analyse npm réelle, le lockfile, la compilation intégrale, le scanner ClamAV opérationnel, l'application stricte de la CSP, les sauvegardes réelles/restauration et la réception des alertes doivent être confirmés avant ouverture. Aucun secret ni donnée étudiante ne doit être publié. La messagerie et l'ouverture des inscriptions restent inchangées.
