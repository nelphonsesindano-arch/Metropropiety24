# Guide de mise en ligne, pas à pas (GitHub + Render + votre nom de domaine)

Durée : environ 1 heure. Coût : un nom de domaine (environ 10 à 15 $ par an) et l'offre payante d'hébergeur (vérifiez le tarif actuel sur render.com/pricing, disque compris).

## Étape 1. Préparer sur votre ordinateur
1. Décompressez `metrohome24-complet.zip`.
2. Installez Node.js 22.13 ou plus (nodejs.org, version LTS).
3. Ouvrez un terminal dans le dossier, tapez `npm run personnaliser` et répondez aux questions (nom de la société, adresse, RCCM, e-mail, téléphone WhatsApp).
4. Facultatif mais conseillé : `npm start`, ouvrez http://localhost:3000 et essayez (voir LISEZMOI.md). Créez d'abord un fichier `.env` (copie de `.env.example`).

## Étape 2. Mettre le code sur GitHub
1. Créez un compte sur github.com.
2. Bouton « New repository » : nom `metrohome24`, choisissez **Private**, créez.
3. « uploading an existing file » : glissez tout le CONTENU du dossier décompressé (pas le fichier `.env`, ni les dossiers `data` et `backups`).
4. « Commit changes ».

## Étape 3. Créer le service sur Render
1. Créez un compte sur render.com et connectez votre GitHub.
2. « New + » puis « Blueprint », choisissez le dépôt `metrohome24`.
3. Render lit `render.yaml` et demande 4 valeurs :
   - `ADMIN_PHONE` : votre numéro (ex. 0990000000)
   - `ADMIN_EMAIL` : votre e-mail
   - `ADMIN_PASSWORD` : mot de passe long et unique (10 caractères minimum), gardez-le précieusement
   - `PUBLIC_URL` : laissez provisoirement l'adresse donnée par Render, vous la changerez à l'étape 4
4. « Apply ». Attendez la fin du déploiement (quelques minutes), puis ouvrez l'adresse en `.onrender.com`.

## Étape 4. Votre nom de domaine
1. Achetez un domaine (Namecheap, OVH, Gandi…), par exemple `metrohome24.com`.
2. Render : votre service, Settings, « Custom Domains », ajoutez votre domaine. Render affiche l'enregistrement DNS à créer.
3. Chez le vendeur de domaine, créez cet enregistrement (zone DNS). Attendez la propagation (de quelques minutes à quelques heures). Le HTTPS est mis en place automatiquement.
4. Render, Environment : changez `PUBLIC_URL` en `https://votredomaine.com`.

## Étape 5. Premier contrôle
1. Ouvrez votre site, connectez-vous avec `ADMIN_PHONE` et `ADMIN_PASSWORD`, puis « Administration ».
2. Créez un compte de test, publiez une annonce avec photo, approuvez-la en administrateur, vérifiez qu'elle apparaît.
3. Installez l'application sur votre téléphone (Chrome, menu ⋮, Installer l'application).

## Étape 6. SMS (obligatoire pour une vraie vérification des téléphones)
1. Créez un compte Africa's Talking (ou Twilio) et notez vos clés.
2. Render, Environment : `SMS_PROVIDER=africastalking`, `AT_USERNAME`, `AT_API_KEY` (et `AT_SENDER` si vous avez un nom d'expéditeur). Sauvegardez : le service redémarre.
3. Testez avec un vrai numéro congolais (Airtel, Vodacom, Orange). Dès lors, le téléphone vérifié devient obligatoire pour publier.

## Étape 7. E-mails (facultatif)
Render, Environment : `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (fournis par votre service d'e-mail).

## Étape 8. Sauvegardes (ne sautez pas cette étape)
Le disque contient la base, les photos et la clé de session. Activez et vérifiez les sauvegardes (snapshots) du disque dans Render, et testez une restauration. Gardez aussi une copie hors de Render.

## Mises à jour
Modifiez un fichier sur GitHub : Render redéploie tout seul. Les données du disque sont conservées.

## Avant d'ouvrir au public
Pages légales relues par un juriste de RDC, mot de passe admin fort, SMS testés, parcours complet essayé sur téléphone Android. Les paiements Mobile Money restent simulés.

## Autre option : un VPS
Pour plus de contrôle et souvent un coût plus bas : un petit serveur (Hetzner, OVH, DigitalOcean), Node 22, `pm2 start server.js`, Caddy pour le HTTPS. Voir LISEZMOI.md, section « Mettre en ligne ».
