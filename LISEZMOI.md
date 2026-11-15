# MetroHome24 : site + serveur, version complète

Un seul dossier : le site (dans `public/`) et son serveur (`server.js`, Node.js, base SQLite, **aucune dépendance à installer**).

## 0. Pour qui, pour quoi
Une application qui relie **les propriétaires** (qui publient leurs maisons, appartements, parcelles, boutiques à louer ou à vendre) et **les personnes qui cherchent** à louer ou acheter, **par commune et par quartier dans la province du Haut-Katanga**.
- Villes et territoires prévus : Lubumbashi, Likasi, Kipushi, Kasenga, Kambove, Pweto, Sakania, Mitwaba. Le serveur refuse les annonces hors de cette liste (modifiable avec la variable `VILLES`).
- Communes : celles de Lubumbashi (7) et de Likasi (4) sont pré-remplies dans `public/assets/lieux.js`, ainsi qu'une liste de quartiers suggérés. **Faites vérifier et compléter ce fichier par vos agents locaux** (quartiers par commune, autres villes) : je n'ai pas pu confirmer le découpage exact sur le terrain.

## Application sur téléphone
- **Installable tout de suite** : ouvrez le site sur Chrome (Android), menu ⋮ puis « Installer l'application » (ou le bouton du site). Sur iPhone : Safari, Partager, « Sur l'écran d'accueil ». Elle s'ouvre en plein écran avec son icône.
- **Google Play Store (Android)** : une fois le site en ligne en HTTPS sur votre domaine, utilisez gratuitement **pwabuilder.com** (ou Bubblewrap) : entrez l'adresse du site, il produit le paquet Android à envoyer sur Google Play (compte développeur Google Play : environ 25 $ une seule fois). Je n'ai pas pu fabriquer ni tester le fichier Android ici.
- Hors connexion, l'application affiche sa structure mais les annonces demandent Internet.

## 1. Essayer en 5 minutes (sur votre ordinateur)
1. Installez Node.js **22.13 ou plus** (nodejs.org).
2. Copiez `.env.example` en `.env`, puis changez `ADMIN_PHONE` et `ADMIN_PASSWORD`.
3. Dans ce dossier : `npm start`, puis ouvrez http://localhost:3000
4. Connectez-vous avec le téléphone et le mot de passe admin, puis ouvrez « Administration » (bas de page) pour valider les annonces.
5. `npm test` lance tous les tests automatiques (doit finir par « TOUT PASSE »).

## 2. Personnaliser avant le lancement (obligatoire)
- `npm run personnaliser` : pose vos informations (nom légal, adresse, RCCM, e-mail, téléphone WhatsApp) dans toutes les pages légales. `npm run personnaliser -- --verifier` liste ce qu'il reste à remplir.
- `public/confidentialite.html` : précisez vos fournisseurs (hébergeur, SMS, e-mail).
- **Faites relire les pages légales (conditions, confidentialité, anti-fraude) par un juriste de RDC.** Ce sont des modèles, pas un avis juridique.
- Remplacez les illustrations par de vraies photos dans `public/assets/photos/` si vous voulez des photos de démonstration ; les publieurs téléversent leurs propres photos.

## 3. Mettre en ligne
Il faut un hébergement qui exécute **Node.js** (un hébergement « statique » ou PHP seul ne suffit pas).
- **VPS** (Hetzner, OVH, DigitalOcean…) : installez Node 22, copiez le dossier, lancez `pm2 start server.js --name metrohome24`, puis placez Caddy ou Nginx devant pour le HTTPS et le nom de domaine. Gardez `COOKIE_SECURE=1`, `TRUST_PROXY=1` et renseignez `PUBLIC_URL`.
- **Render / Railway / Fly.io** : déployez ce dossier (un `Dockerfile` est fourni) et **ajoutez un disque persistant** monté sur `/data`, sinon base et photos disparaissent à chaque redéploiement.
- **Sauvegardes** : `npm run backup` (base + photos + clé), à planifier chaque nuit (cron). Les 14 dernières copies sont conservées. Copiez-les hors du serveur.

## 4. SMS et e-mails
- **SMS** (vérification du téléphone, mot de passe oublié, décision sur une annonce) : `SMS_PROVIDER=africastalking` ou `twilio` + vos clés dans `.env`. Dès que les SMS sont actifs, **un téléphone vérifié est obligatoire pour publier**. `console` (codes affichés dans le terminal) sert aux essais uniquement, jamais en production. `none` désactive tout.
- **E-mails** (annonce approuvée ou refusée, alertes de recherche, formulaire de contact) : renseignez `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (voir `.env.example`). Sans SMTP, aucun e-mail n'est envoyé.

## 5. Ce que le site fait
- **Visiteurs** : recherche et filtres, fiche détaillée (équipements, proximité, honoraires et frais de visite affichés), favoris, alertes, comparaison, avis, messages et demandes de visite, signalement, partage.
- **Publieurs** : compte obligatoire (pièce d'identité), téléphone vérifié par SMS, publication avec photos, modification, suspension, « loué / vendu », réactivation, demandes reçues.
- **Administrateur** : validation ou refus motivé de chaque annonce, badge d'identité contrôlée, signalements, messages de contact, comptes (bannissement), journal des actions.
- **Données personnelles** : export des données d'un compte et suppression de compte, sessions invalidées après changement de mot de passe.
- **Qualité** : pages légales, À propos, Comment ça marche, Contact, page 404, sitemap et robots.txt, application installable (manifest), sécurité (mots de passe chiffrés, limites de tentatives, contrôle des images, en-têtes de sécurité).

## 6. Ce qui n'est PAS fait (à savoir avant de promettre quoi que ce soit)
- **Paiements Mobile Money** : simulés dans l'interface. Il faut des contrats avec Airtel, M-Pesa, Orange avant d'accepter de l'argent.
- **Connexions réelles** à Africa's Talking, Twilio et à votre SMTP : testées seulement contre de faux serveurs. Faites un essai avec vos comptes et de vrais numéros congolais (Airtel, Vodacom, Orange) avant le lancement.
- **Carte interactive** : un lien vers Google Maps est proposé, pas de carte intégrée. Pas de visite virtuelle 360° intégrée ni de réalité augmentée.
- **Vérification de la pièce d'identité et du titre foncier** : faite à la main par l'administrateur. Un badge ne garantit pas la propriété légale.
- **Pages et boutons du site** : non essayés dans un navigateur réel pendant la fabrication. Parcourez-les en local (inscription, publication, validation, modification) avant de mettre en ligne.
- **SQLite** convient pour démarrer sur un seul serveur ; passez à PostgreSQL si le trafic grandit.

## 7. Liste de contrôle avant ouverture au public
1. `npm run personnaliser` fait, pages relues par un juriste.
2. Mot de passe admin fort, `COOKIE_SECURE=1`, HTTPS actif.
3. SMS et e-mails testés avec de vrais comptes.
4. Sauvegarde automatique planifiée et une restauration essayée.
5. Parcours complet testé sur téléphone Android avec une connexion lente.
