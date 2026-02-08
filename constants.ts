
import { Category, Video } from './types';

export const MOCK_VIDEOS: Video[] = [
  {
    id: 'z2h-1',
    title: "Les Techniques d'Intensification",
    description: "Apprenez les méthodes avancées pour maximiser votre intensité d'entraînement et briser vos plateaux. Une masterclass sur le dépassement de soi.",
    thumbnail_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80', // Gym intense
    video_key: '4pvdbj19xv02', 
    source_type: 'vidmoly',
    duration: 3600,
    year: 2024,
    slug: 'techniques-intensification-zero-to-hero',
    rating: 'G',
    genre: ['Entraînement', 'Musculation'],
  },
  {
    id: 'z2h-2',
    title: "Santé, Hormones, Énergie",
    description: "Comprendre le fonctionnement hormonal pour optimiser votre énergie quotidienne et votre santé globale. L'équilibre est la clé du succès.",
    thumbnail_url: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80', // Healthy Lifestyle / Yoga vibe
    video_key: 'g5vww3teqwu3', 
    source_type: 'vidmoly',
    duration: 4200,
    year: 2024,
    slug: 'sante-hormones-energie-equilibre',
    rating: 'G',
    genre: ['Santé', 'Hormones'],
  },
  {
    id: 'z2h-3',
    title: "FAQs - Nutrition Zero to Hero",
    description: "Toutes les réponses à vos questions les plus fréquentes sur l'alimentation, les compléments et la gestion des macros.",
    thumbnail_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80', // Interview / Meeting
    video_key: 'o8aswxwhbgdd', 
    source_type: 'vidmoly',
    duration: 2800,
    year: 2024,
    slug: 'faqs-nutrition-zero-to-hero',
    rating: 'G',
    genre: ['Nutrition', 'FAQ'],
  },
  {
    id: 'z2h-4',
    title: "La Diète la Plus Agréable",
    description: "Comment structurer votre alimentation pour qu'elle soit durable, efficace et surtout plaisante au quotidien.",
    thumbnail_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80', // Healthy Food Bowl
    video_key: 'a7k4i9dgyp2j', 
    source_type: 'vidmoly',
    duration: 3100,
    year: 2024,
    slug: 'diete-agreable-votre-vie-1',
    rating: 'G',
    genre: ['Nutrition', 'Lifestyle'],
  },
  {
    id: 'z2h-5',
    title: "Comprendre la Nutrition et l'Entraînement",
    description: "Les fondamentaux théoriques indispensables pour lier intelligemment vos efforts en cuisine et à la salle.",
    thumbnail_url: 'https://images.unsplash.com/photo-1532029837062-47194a8ce4df?auto=format&fit=crop&w=800&q=80', // Books / Learning / Gym theory
    video_key: '06gus5xbza9c', 
    source_type: 'vidmoly',
    duration: 4500,
    year: 2023,
    slug: 'comprendre-nutrition-entrainement-vimeo',
    rating: 'G',
    genre: ['Théorie', 'Fondamentaux'],
  },
  {
    id: 'z2h-6',
    title: "Le Jeûne Intermittent",
    description: "Exploration complète des bénéfices du jeûne intermittent pour la perte de gras et la clarté mentale.",
    thumbnail_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80', // Body / Health / Science
    video_key: 'xfobjhrsxzzw', 
    source_type: 'vidmoly',
    duration: 3900,
    year: 2024,
    slug: 'jeune-intermittent-atout-vimeo',
    rating: 'G',
    genre: ['Nutrition', 'Santé'],
  },
  {
    id: 'z2h-7',
    title: '02 Umar Faruq Hd',
    description: 'Vidéo ajoutée depuis Vidmoly.',
    thumbnail_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    video_key: 'njq5pdzx5998',
    source_type: 'vidmoly',
    duration: 3600,
    year: 2024,
    slug: '02-umar-faruq-hd',
    rating: 'G',
    genre: ['Programme'],
  },
  {
    id: 'z2h-8',
    title: 'Vidmoly - Session 1',
    description: 'Vidéo ajoutée depuis Vidmoly.',
    thumbnail_url: 'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=800&q=80',
    video_key: 'https://vidmoly.net/embed-w10v3zrn2t9n.html',
    source_type: 'vidmoly',
    duration: 3600,
    year: 2024,
    slug: 'vidmoly-session-1',
    rating: 'G',
    genre: ['Programme'],
  },
  {
    id: 'z2h-9',
    title: 'Vidmoly - Session 2',
    description: 'Vidéo ajoutée depuis Vidmoly.',
    thumbnail_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    video_key: 'https://vidmoly.net/embed-mmnsj1ct6xet.html',
    source_type: 'vidmoly',
    duration: 3600,
    year: 2024,
    slug: 'vidmoly-session-2',
    rating: 'G',
    genre: ['Programme'],
  },
  {
    id: 'z2h-10',
    title: 'Vidmoly - Session 3',
    description: 'Vidéo ajoutée depuis Vidmoly.',
    thumbnail_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    video_key: 'https://vidmoly.net/embed-bhb88lyw6f0a.html',
    source_type: 'vidmoly',
    duration: 3600,
    year: 2024,
    slug: 'vidmoly-session-3',
    rating: 'G',
    genre: ['Programme'],
  },
  {
    id: 'z2h-11',
    title: 'Vidmoly - Session 4',
    description: 'Vidéo ajoutée depuis Vidmoly.',
    thumbnail_url: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=800&q=80',
    video_key: 'https://vidmoly.net/embed-cljegri9l4dn.html',
    source_type: 'vidmoly',
    duration: 3600,
    year: 2024,
    slug: 'vidmoly-session-4',
    rating: 'G',
    genre: ['Programme'],
  }
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-featured',
    title: 'Programme Zero to Hero',
    slug: 'featured',
    videos: [
      MOCK_VIDEOS[0],
      MOCK_VIDEOS[2],
      MOCK_VIDEOS[3],
      MOCK_VIDEOS[6],
      MOCK_VIDEOS[7],
      MOCK_VIDEOS[8],
      MOCK_VIDEOS[9],
      MOCK_VIDEOS[10]
    ]
  },
  {
    id: 'cat-nutrition',
    title: 'Nutrition & Diététique',
    slug: 'nutrition',
    videos: [MOCK_VIDEOS[3], MOCK_VIDEOS[2], MOCK_VIDEOS[5]]
  },
  {
    id: 'cat-training',
    title: 'Entraînement & Théorie',
    slug: 'training',
    videos: [MOCK_VIDEOS[0], MOCK_VIDEOS[4]]
  },
  {
    id: 'cat-health',
    title: 'Santé & Équilibre Hormonal',
    slug: 'health',
    videos: [MOCK_VIDEOS[1]]
  }
];
