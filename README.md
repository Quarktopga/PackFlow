# PackFlow

PWA mobile-first pour piloter un déménagement : cartons traçables (ID 4 caractères + QR), rétro-planning automatique, calcul de volume, et partage (invitation membre / lien déménageur lecture seule).

Stack : HTML/CSS/JS vanilla (aucun build), Supabase (Postgres + Auth + Edge Functions), GitHub Pages.

---

## 1. Créer le projet Supabase

1. Sur [supabase.com](https://supabase.com), crée un nouveau projet.
2. Dans **Project Settings → API**, récupère `Project URL` et `anon public key`.
3. Ouvre `js/config.js` et remplace :
   ```js
   export const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
   export const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
   ```

### Génération des QR codes

Les QR codes des cartons sont **générés par la plateforme elle-même** (librairie [`qrcode`](https://github.com/soldair/node-qrcode), chargée depuis un CDN dans `index.html`) — il n'y a rien à imprimer à l'avance ni à scanner pour "associer" un QR externe. Chaque QR encode l'URL de la fiche du carton (`#/cartons/XXXX`) ; il est régénéré à la volée depuis l'identifiant à 4 caractères, donc rien n'est stocké côté base pour le QR lui-même. L'utilisateur peut le télécharger en PNG ou l'imprimer directement depuis la fiche carton, et scanner ce QR avec n'importe quelle app appareil-photo ouvre directement PackFlow sur le bon carton.

L'identifiant à 4 caractères est lui-même toujours affiché en grand (avec bouton copier) sur l'écran de création et sur la fiche du carton, pour être noté au marqueur sur le carton même sans imprimer de QR.

## 2. Exécuter le schéma SQL

Dans **SQL Editor**, exécute les fichiers de `supabase/sql/` **dans l'ordre** :

1. `01_schema.sql` — tables et index
2. `02_rls.sql` — Row Level Security (tout est verrouillé par défaut)
3. `03_functions.sql` — triggers et RPC (`SECURITY DEFINER`)
4. `04_grants.sql` — restreint les RPC sensibles au rôle `service_role`
5. `05_seed_task_templates.sql` — bibliothèque de tâches du rétro-planning

> Si tu avais déjà exécuté une version précédente du schéma (avec une colonne `qr_code` sur `boxes`), lance aussi `06_migration_qr_generated.sql` pour la retirer proprement — le QR n'est plus stocké, il est généré à la volée depuis l'id.
>
> **Important si tu avais déjà exécuté une version précédente** : lance aussi `07_migration_fix_token_encoding.sql`. Un bug corrigé dans cette version empêchait *toute* génération de lien d'invitation ou de lien déménageur (Postgres ne supporte pas le format `'base64url'` pour `encode()` — seuls `'base64'`, `'hex'` et `'escape'` existent). Sans cette migration, les deux fonctionnalités restent cassées même avec le nouveau code JS.

## 3. Activer les connexions anonymes

Le lien d'invitation connecte automatiquement l'invité sans email/mot de passe, via une **session anonyme Supabase**. Active-la dans :
`Authentication → Providers → Anonymous sign-ins` → **Enable**.

## 4. Déployer les Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF

supabase functions deploy mover-access
supabase functions deploy check-tasks
```

### Notifications push (optionnel mais recommandé)

1. Génère une paire de clés VAPID :
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Colle la clé **publique** dans `js/config.js` (`VAPID_PUBLIC_KEY`).
3. Ajoute les secrets à la fonction planifiée :
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:toi@example.com
   ```
4. Dans le **Dashboard Supabase → Edge Functions → check-tasks → Cron**, planifie par exemple `0 8 * * *` (tous les jours à 8h) pour vérifier les échéances et notifier.

## 5. Générer l'icône (déjà fait, mais si tu veux la modifier)

Les sources vectorielles sont dans `icons/icon-source.svg` et `icons/icon-maskable-source.svg`. Toutes les tailles PNG (favicon, apple-touch-icon, icônes PWA standard + maskable Android) sont déjà générées dans `icons/`.

## 6. Déployer sur GitHub Pages

1. Pousse tout le contenu de ce dossier à la racine d'un repo GitHub.
2. **Settings → Pages** → source : branche `main`, dossier `/root`.
3. Ton app est accessible à `https://TON-USER.github.io/TON-REPO/`.

> Le fichier `manifest.json` utilise des chemins relatifs (`./`), donc ça fonctionne aussi bien à la racine d'un domaine que dans un sous-dossier GitHub Pages.

## 7. Installer l'app (PWA)

- **Android / Desktop Chrome** : une carte "Installer PackFlow" apparaît automatiquement sur l'écran d'accueil (via `beforeinstallprompt`).
- **iOS Safari** : la carte affiche l'instruction manuelle (Safari ne permet pas l'installation programmatique) → icône de partage → "Sur l'écran d'accueil".

## Interface

- **Mode clair / sombre** : réglable dans Réglages → Apparence (Clair / Sombre / Système). Le choix est mémorisé (`localStorage`) et appliqué avant le premier affichage pour éviter tout flash.
- **Modales centrées** : toutes les boîtes de dialogue (ajout d'objet, QR code, tâche, meuble, confirmation de suppression) sont des fenêtres superposées et centrées à l'écran, dans le style du site — plus de bottom-sheet.
- **Cartons supprimables** : bouton "Supprimer ce carton" sur la fiche détail, avec confirmation obligatoire.
- **Scanner à activation manuelle** : la caméra ne s'allume qu'après un appui explicite sur "Activer le scanner" (meilleure fiabilité des permissions sur mobile), et s'éteint dès qu'on quitte l'écran.

---

## Sécurité — ce qui est en place

- **RLS partout** : chaque table est verrouillée par `is_move_member()`. Sans être membre du déménagement (via `move_members`), aucune ligne n'est lisible ni modifiable — anon key ou pas.
- **Génération d'ID de carton côté serveur** (`generate_box_id` RPC) : jamais côté client, pour éviter la prédictibilité/l'énumération.
- **Contrainte d'unicité sur l'id du carton** : garantie par la génération serveur (`generate_box_id`), avec retirage en cas de collision — jamais de doublon possible.
- **Invitations et tokens déménageur** : tables `invite_tokens` / `mover_tokens` sans aucune policy RLS client → accès uniquement via RPC/Edge Function `SECURITY DEFINER`, avec expiration et statut "consommé" vérifiés côté serveur.
- **Lien déménageur** : ne crée jamais de session. Chaque lecture passe par l'Edge Function `mover-access`, qui ne renvoie que `{ box_id, destination }` et rien d'autre — aucune donnée personnelle, aucun autre carton, aucune liste d'objets.
- **Notifications push** : `push_subscriptions` n'est lisible que par `service_role` via des RPC dédiées, explicitement `REVOKE`d pour `anon`/`authenticated`.
- **Mots de passe / tokens** : jamais stockés manuellement — gérés par `supabase-js` (stockage sécurisé + refresh automatique du JWT).

## Structure du projet

```
index.html                 shell PWA (routes gérées en JS, hash-router)
manifest.json               manifeste PWA
service-worker.js           cache app shell + notifications push
css/                        design tokens, base, composants, landing
js/
  config.js                 clés Supabase, constantes (types, catégories…)
  supabaseClient.js
  data.js                   toutes les requêtes/RPC Supabase
  state.js                  store observable
  theme.js                  gestion du mode clair/sombre
  router.js                 routeur hash
  nav.js                    tabbar / topbar / icônes
  modal.js                  modales centrées + confirmation de suppression
  pwa.js                    installation PWA, push
  qr.js                     scan QR (BarcodeDetector + fallback jsQR)
  qrgen.js                   génération des QR (encodage de l'URL du carton)
  screens/                  un fichier par écran
supabase/
  sql/                      schéma, RLS, fonctions, seed — à exécuter en ordre
  functions/
    mover-access/            Edge Function (accès lecture seule déménageur)
    check-tasks/              Edge Function planifiée (rappels push)
icons/                       icônes PWA (toutes tailles + maskable)
```
