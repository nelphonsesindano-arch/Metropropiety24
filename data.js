/* ============================================================
   MetroHome24 - FICHIER À MODIFIER
   1) Vos coordonnées  2) Vos annonces
   Gardez la syntaxe : guillemets ', virgules entre les champs.
   ============================================================ */
window.CONFIG={
  payments:false,                  // true = affiche le paiement simulé (démonstration uniquement)
  services:false,                  // true = affiche la page Services (devis simulés)
  agencies:false,                  // true = affiche la page Agences (exemples fictifs)
  api:'',                          // '' = le serveur MetroHome24 sert aussi le site. Sans serveur, le site reste en mode prototype.
  phone:'243000000000',            // format international, sans + ni espaces
  email:'contact@metrohome24.example',
  adminCode:'metro2026',           // À CHANGER. Contrôle côté navigateur : non sécurisé, le vrai contrôle exige le back-end
  heroImages:[],                   // ex. ['photos/maison1.jpg','photos/maison2.jpg'] (3 à 5 vraies photos pour le bandeau d’accueil)
  /* Photo réelle d’une annonce : ajoutez img:'photos/ma-maison.jpg' (déposez les images dans un dossier photos/) */
  /* Une annonce = un bloc {...}. Copiez-collez un bloc pour en ajouter.
     tr: Location | Vente    pub: Propriétaire | Commissionnaire | Agence
     v: badges de vérification (Non vérifié, Identité vérifiée, Propriétaire vérifié, Mandat vérifié, Bien inspecté)
     Optionnel par annonce : tour:'lien visite 360', video:'lien', plan:'lien plan', am:['équipements'], near:['à proximité']
   d: ordre de date (plus grand = plus récent)   st: Active */
  listings:[
{id:1,t:'Maison 3 chambres clôturée',type:'Maison',tr:'Location',vi:'Lubumbashi',q:'Golf',prix:450,dev:'USD',per:'/mois',ch:3,bain:2,m2:140,pub:'Propriétaire',v:['Identité vérifiée','Propriétaire vérifié'],cond:'Caution 1 mois, avance 3 mois',fv:'Aucun',hon:'Aucun',desc:'Maison avec cour, eau et électricité, parking pour 2 véhicules.',st:'Active',d:9},
{id:2,t:'Appartement meublé centre-ville',type:'Appartement',tr:'Location',vi:'Lubumbashi',q:'Centre-ville',prix:700,dev:'USD',per:'/mois',ch:2,bain:1,m2:85,pub:'Agence',v:['Identité vérifiée','Mandat vérifié'],cond:'Caution 2 mois, avance 1 mois',fv:'Aucun',hon:'1 mois de loyer, payé par le locataire à la signature du bail',desc:'Deuxième étage, climatisation, groupe électrogène.',st:'Active',d:8},
{id:3,t:'Parcelle 20×30 avec titre',type:'Parcelle',tr:'Vente',vi:'Lubumbashi',q:'Kenya',prix:18000,dev:'USD',per:'',ch:0,bain:0,m2:600,pub:'Commissionnaire',v:['Mandat vérifié'],cond:'Paiement échelonné négociable',fv:'Aucun',hon:'5 % du prix, payés par l’acheteur à la signature',desc:'Parcelle plane, accès route principale. Vérification foncière à effectuer avant tout paiement.',st:'Active',d:7},
{id:4,t:'Studio près de l’université',type:'Studio',tr:'Location',vi:'Lubumbashi',q:'Lubumbashi-Université',prix:150,dev:'USD',per:'/mois',ch:1,bain:1,m2:28,pub:'Propriétaire',v:['Non vérifié'],cond:'Caution 1 mois',fv:'Aucun',hon:'Aucun',desc:'Studio indépendant, eau courante.',st:'Active',d:6},
{id:5,t:'Villa avec jardin et piscine',type:'Villa',tr:'Vente',vi:'Lubumbashi',q:'Golf',prix:240000,dev:'USD',per:'',ch:5,bain:4,m2:420,pub:'Agence',v:['Identité vérifiée','Bien inspecté'],cond:'Prix négociable',fv:'Aucun',hon:'3 % du prix, payés par le vendeur',desc:'Villa de 5 chambres, jardin, piscine, gardien.',st:'Active',d:5},
{id:6,t:'Boutique sur avenue commerçante',type:'Boutique',tr:'Location',vi:'Kipushi',q:'Centre',prix:350,dev:'USD',per:'/mois',ch:0,bain:1,m2:40,pub:'Commissionnaire',v:['Identité vérifiée'],cond:'Caution 2 mois',fv:'Oui : 10 USD, annoncés à l’avance',hon:'½ mois de loyer, payé par le locataire',desc:'Local avec rideau métallique.',st:'Active',d:4},
{id:7,t:'Entrepôt 300 m²',type:'Entrepôt',tr:'Location',vi:'Likasi',q:'Zone industrielle',prix:900,dev:'USD',per:'/mois',ch:0,bain:1,m2:300,pub:'Propriétaire',v:['Identité vérifiée','Propriétaire vérifié'],cond:'Caution 2 mois, avance 6 mois',fv:'Aucun',hon:'Aucun',desc:'Accès camions, courant triphasé.',st:'Active',d:3},
{id:8,t:'Maison 2 chambres',type:'Maison',tr:'Location',vi:'Lubumbashi',q:'Kenya',prix:280,dev:'USD',per:'/mois',ch:2,bain:1,m2:90,pub:'Propriétaire',v:['Identité vérifiée'],cond:'Caution 1 mois, avance 2 mois',fv:'Aucun',hon:'Aucun',desc:'Maison simple, cour partagée, eau et électricité.',st:'Active',d:2}]
};
