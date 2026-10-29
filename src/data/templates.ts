import type { SiteTemplate } from '../types';

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: 'ecommerce',
    name: 'Boutique E-commerce & WhatsApp',
    tagline: 'Vendez vos produits en ligne avec panier et commande WhatsApp / Wave',
    category: 'Commerce & Vente',
    previewImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
    color: '#0f5257',
    features: [
      'Catalogue de produits avec photos et prix en FCFA',
      'Panier d’achat en temps réel',
      'Bouton de commande direct sur WhatsApp avec message pré-rempli',
      'Bannière promotionnelle',
      'Avis clients et réassurance'
    ],
    defaultContent: {
      badge: 'Nouvelle Collection Dakar 2026',
      heroTitle: 'La mode et les tendances sénégalaises livrées chez vous.',
      heroSubtitle: 'Commandez en ligne et réglez facilement par Wave ou à la livraison partout à Dakar.',
      promoBanner: '🔥 Livraison gratuite à Dakar dès 25 000 FCFA d’achat !',
      products: [
        {
          id: 'p1',
          name: 'Boubou Moderne Brodé',
          price: 25000,
          category: 'Vêtements',
          description: 'Tissu bazin riche de haute qualité brodé à la main par nos artisans.',
          image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80',
          inStock: true
        },
        {
          id: 'p2',
          name: 'Chaussures Cuir Artisanal Ngor',
          price: 18000,
          category: 'Chaussures',
          description: 'Cuir véritable tanné localement, confort et élégance au quotidien.',
          image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',
          inStock: true
        },
        {
          id: 'p3',
          name: 'Sac à Main Cuir & Pagne Tissé',
          price: 15000,
          category: 'Accessoires',
          description: 'Design contemporain alliant maroquinerie moderne et motifs manjak authentiques.',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
          inStock: true
        },
        {
          id: 'p4',
          name: 'Parfum d’Ambiance Oud & Fleur d’Oranger',
          price: 12000,
          category: 'Maison',
          description: 'Senteur envoûtante pour parfumer délicatement vos intérieurs.',
          image: 'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=600&q=80',
          inStock: true
        }
      ],
      testimonials: [
        { name: 'Fatou Binetou S.', comment: 'Commande reçue en 2h aux Almadies. Super qualité !' },
        { name: 'Ibrahima D.', comment: 'Paiement Wave super fluide et produits impeccables.' }
      ]
    }
  },
  {
    id: 'restaurant',
    name: 'Restaurant, Traiteur & Fast-Food',
    tagline: 'Menu digital, réservation de table et commande en ligne',
    category: 'Restauration & Gastronomie',
    previewImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    color: '#d97706',
    features: [
      'Menu digital avec photos, descriptions et prix en FCFA',
      'Formulaire de réservation de table en direct',
      'Bouton de commande à emporter sur WhatsApp',
      'Horaires d’ouverture et plan d’accès',
      'Spécialités sénégalaises et internationales'
    ],
    defaultContent: {
      badge: 'Saveurs Authentiques du Teranga',
      heroTitle: 'Une expérience culinaire d’exception au cœur de Dakar.',
      heroSubtitle: 'Du véritable Thiéboudienne Penda Mbaye aux grillades de dibiterie revisitées, venez savourer le meilleur du Sénégal.',
      openingHours: 'Mardi au Dimanche : 11h30 - 23h30',
      address: 'Route des Almadies, Dakar',
      menu: [
        {
          category: 'Plats Traditionnels',
          items: [
            {
              name: 'Thiéboudienne Penda Mbaye Royal',
              price: 4500,
              desc: 'Riz rouge parfumé au thiof frais, légumes du terroir, nététou et beignets de poisson.',
              badge: 'Spécialité du Chef'
            },
            {
              name: 'Yassa Poulet Fermier au Feu de Bois',
              price: 4000,
              desc: 'Poulet mariné au citron vert de Casamance, oignons caramélisés et piment doux.',
              badge: 'Populaire'
            },
            {
              name: 'Mafé Boeuf Gourmand',
              price: 4000,
              desc: 'Sauce onctueuse à la pâte d’arachide sénégalaise, morceaux de bœuf tendres et légumes racine.'
            }
          ]
        },
        {
          category: 'Grillades & Dibiterie',
          items: [
            {
              name: 'Dibi d’Agneau Braisé au Feu de Bois',
              price: 6000,
              desc: 'Agneau mariné aux épices du Sahel, servi avec moutarde artisanale et oignons frais.'
            },
            {
              name: 'Capitaine Entier Braisé aux Almadies',
              price: 7500,
              desc: 'Poisson entier braisé, sauce chien dakaroise, alloco ou attiéké au choix.'
            }
          ]
        },
        {
          category: 'Boissons Locales & Jus Frais',
          items: [
            { name: 'Jus de Bissap Rouge à la Menthe', price: 1000, desc: 'Fleurs d’hibiscus fraîches infusées.' },
            { name: 'Jus de Bouye Crémeux', price: 1200, desc: 'Pain de singe (fruit du baobab) parfumé à la vanille.' },
            { name: 'Jus de Ditakh Frais', price: 1200, desc: 'Saveur acidulée et rafraîchissante.' }
          ]
        }
      ]
    }
  },
  {
    id: 'agency',
    name: 'Agence & Services Professionnels',
    tagline: 'Présentez vos services, vos réalisations et générez des devis',
    category: 'Business & Conseil',
    previewImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    color: '#0f5257',
    features: [
      'Présentation des offres et prestations tarifées',
      'Portfolio des réalisations récentes',
      'Formulaire de demande de devis instantané',
      'Statistiques de performance (projets livrés, clients satisfaits)',
      'Équipe et témoignages B2B'
    ],
    defaultContent: {
      badge: 'Expertise & Stratégie B2B',
      heroTitle: 'Nous propulsons la croissance de votre entreprise en Afrique de l’Ouest.',
      heroSubtitle: 'Conseil stratégique, digitalisation, marketing et développement sur mesure pour les PME et grands comptes.',
      stats: [
        { label: 'Projets Réalisés', value: '150+' },
        { label: 'Clients Satisfaits', value: '98%' },
        { label: 'Années d’Expérience', value: '8 ans' },
        { label: 'Pays Couverts', value: '5 pays' }
      ],
      services: [
        {
          title: 'Transformation Digitale & Systèmes',
          desc: 'Conception de logiciels, SaaS, automatisation des flux de travail et plateformes sur-mesure.',
          price: 'À partir de 500 000 FCFA'
        },
        {
          title: 'Stratégie Marketing & Acquisition',
          desc: 'Campagnes publicitaires ciblées, gestion des réseaux sociaux, SEO et branding mémorable.',
          price: 'À partir de 250 000 FCFA / mois'
        },
        {
          title: 'Comptabilité & Conseil Financier',
          desc: 'Tenue des comptes, fiscalité sénégalaise, audits et conformité légale.',
          price: 'Sur devis personnalisé'
        }
      ],
      portfolio: [
        { client: 'Fintech Sahel', result: '+220% de croissance utilisateur' },
        { client: 'Groupe Agro Dakar', result: 'Digitalisation complète de la logistique' },
        { client: 'Logistique Teranga', result: 'Plateforme de traçabilité en temps réel' }
      ]
    }
  },
  {
    id: 'medical',
    name: 'Cabinet Médical & Santé',
    tagline: 'Présentation de votre clinique, spécialités et prise de rendez-vous',
    category: 'Santé & Bien-être',
    previewImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    color: '#0284c7',
    features: [
      'Liste des spécialités médicales et actes',
      'Profils des médecins et praticiens',
      'Formulaire de prise de rendez-vous en ligne',
      'Horaires de consultation et astreinte urgences',
      'FAQ patients et conseils de prévention'
    ],
    defaultContent: {
      badge: 'Cabinet Médical Agréé Dakar',
      heroTitle: 'Votre santé entre les mains de spécialistes dévoués.',
      heroSubtitle: 'Consultations en cabinet et à domicile à Dakar. Prise de rendez-vous rapide et suivi personnalisé.',
      emergencyPhone: '+221 78 424 34 20',
      hours: 'Lundi au Samedi : 8h00 - 20h00 · Urgences 24h/24',
      specialties: [
        {
          name: 'Médecine Générale & Bilans',
          desc: 'Consultations adultes et enfants, bilans annuels et dépistages préventifs.'
        },
        {
          name: 'Pédiatrie & Suivi Néonatal',
          desc: 'Suivi de la croissance, calendrier vaccinal et prise en charge des pathologies infantiles.'
        },
        {
          name: 'Gynécologie & Obstétrique',
          desc: 'Suivi de grossesse, échographies obstétricales et consultations gynécologiques.'
        },
        {
          name: 'Soins Dentaires & Orthodontie',
          desc: 'Détartrage, soins des caries, prothèses et alignement esthétique du sourire.'
        }
      ],
      doctors: [
        { name: 'Dr. Mariama Diop', role: 'Médecin Généraliste · 14 ans d’expérience' },
        { name: 'Dr. Cheikh Tidiane Sow', role: 'Pédiatre Spécialiste' }
      ]
    }
  },
  {
    id: 'realestate',
    name: 'Immobilier & Résidences Dakar',
    tagline: 'Catalogue de biens immobiliers, appartements et terrains à vendre ou louer',
    category: 'Immobilier',
    previewImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    color: '#047857',
    features: [
      'Catalogue de biens avec filtres (Achat, Location, Quartiers de Dakar)',
      'Fiches de biens avec surfaces, pièces et commodités',
      'Bouton de visite guidée direct sur WhatsApp',
      'Formulaire de contact pour investisseurs',
      'Localisation Almadies, Mermoz, Plateau, Diamniadio'
    ],
    defaultContent: {
      badge: 'Agence Immobilière Agréée',
      heroTitle: 'Trouvez le bien idéal à Dakar et dans la région.',
      heroSubtitle: 'Appartements de standing, villas sécurisées et terrains viabilisés avec titres fonciers garantis.',
      properties: [
        {
          id: 'prop1',
          title: 'Appartement F4 Vue Mer Almadies',
          type: 'Location',
          price: '850 000 FCFA / mois',
          location: 'Les Almadies, Dakar',
          rooms: '3 Chambres · 3 SDB',
          surface: '180 m²',
          features: ['Climatisation', 'Piscine', 'Sécurité 24/7', 'Groupe électrogène'],
          image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'prop2',
          title: 'Villa Moderne avec Jardin Mermoz',
          type: 'Location',
          price: '1 200 000 FCFA / mois',
          location: 'Mermoz Pyrotechnie',
          rooms: '4 Chambres · 4 SDB',
          surface: '320 m²',
          features: ['Garage 2 voitures', 'Jardin privatif', 'Cuisine équipée'],
          image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'prop3',
          title: 'Terrain Viabilisé Titre Foncier Diamniadio',
          type: 'Vente',
          price: '15 000 000 FCFA',
          location: 'Diamniadio Pôle Urbain',
          rooms: 'Terrain Nu',
          surface: '300 m²',
          features: ['Titre Foncier Global', 'Eau & Électricité', 'Accès direct autoroute'],
          image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80'
        }
      ]
    }
  }
];
