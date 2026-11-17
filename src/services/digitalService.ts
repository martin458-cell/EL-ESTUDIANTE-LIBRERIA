import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';

export type DigitalCategory = 'libros' | 'revistas' | 'cuadernos_trabajo' | 'para_colorear';

export interface DigitalProduct {
  id: string;
  title: string;
  description: string;
  category: DigitalCategory;
  price: number;
  offerPrice?: number | null;
  pages?: number;
  format?: string; // ej. "PDF Alta Resolución A4"
  fileSize?: string; // ej. "18 MB"
  targetAudience?: string; // ej. "Inicial 3, 4 y 5 años", "Primaria 1° a 6°"
  coverUrl: string;
  previewPages?: string[]; // URLs de imágenes de páginas de muestra
  downloadUrl?: string; // Enlace Drive o nube seguro
  isOriginal?: boolean; // Siempre true para material propio de El Estudiante
  featured?: boolean;
  tags?: string[];
  createdAt?: Timestamp | { seconds: number; nanoseconds: number };
  updatedAt?: Timestamp | { seconds: number; nanoseconds: number };
}

export const DIGITAL_CATEGORIES_METADATA: Record<DigitalCategory, { label: string; badge: string; icon: string; desc: string }> = {
  libros: {
    label: 'Libros Digitales',
    badge: 'Lecturas & Compendios',
    icon: 'BookOpen',
    desc: 'Obras literarias, guías académicas y compendios teóricos originales de Puquio.'
  },
  revistas: {
    label: 'Revistas Educativas',
    badge: 'Pedagógico & Trimestral',
    icon: 'Newspaper',
    desc: 'Artículos didácticos, boletines de ciencia y cultura escolar para docentes y alumnos.'
  },
  cuadernos_trabajo: {
    label: 'Cuadernos de Trabajo',
    badge: 'Workbooks Imprimibles',
    icon: 'FileEdit',
    desc: 'Fichas de caligrafía, ortografía, matemáticas y razonamiento listos para practicar.'
  },
  para_colorear: {
    label: 'Cuadernos para Colorear',
    badge: 'Estimulación & Creatividad',
    icon: 'Palette',
    desc: 'Dibujos pedagógicos, motricidad fina, mandalas y figuras infantiles para imprimir en A4.'
  }
};

export const INITIAL_ORIGINAL_DIGITALS: Omit<DigitalProduct, 'id'>[] = [
  {
    title: 'Cuaderno de Caligrafía y Grafomotricidad "Trazo Firme"',
    description: 'Material exclusivo diseñado por Librería El Estudiante. Contiene ejercicios progresivos para niños de 4 a 7 años para mejorar la postura de la mano, trazos rectos, curvos y soltura al escribir. Formato A4 listo para imprimir las veces que desees.',
    category: 'cuadernos_trabajo',
    price: 15,
    offerPrice: 9.90,
    pages: 64,
    format: 'PDF Alta Calidad (Listo para Imprimir A4)',
    fileSize: '18 MB',
    targetAudience: 'Inicial 4-5 años y 1° Primaria',
    coverUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800',
    previewPages: [
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800'
    ],
    downloadUrl: 'https://drive.google.com/',
    isOriginal: true,
    featured: true,
    tags: ['Caligrafía', 'Grafomotricidad', 'Inicial', 'Imprimible']
  },
  {
    title: 'Mundo Mágico de los Animales Andinos: Cuaderno para Colorear',
    description: 'Edición original ilustrada inspirada en la fauna de los Andes peruanos (Vicugna, Cóndor, Zorro Andino, Colibrí). Incluye datos curiosos educativos en cada lámina para que los pequeños aprendan mientras colorean.',
    category: 'para_colorear',
    price: 12,
    offerPrice: 8.50,
    pages: 48,
    format: 'PDF Vectorial Imprimible A4',
    fileSize: '14 MB',
    targetAudience: '3 a 10 años / Educación Inicial y Primaria',
    coverUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800',
    previewPages: [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800'
    ],
    downloadUrl: 'https://drive.google.com/',
    isOriginal: true,
    featured: true,
    tags: ['Colorear', 'Animales Andinos', 'Creatividad', 'Arte Infantil']
  },
  {
    title: 'Compendio Esencial de Razonamiento Matemático Escolar',
    description: 'Guía práctica y didáctica con más de 200 ejercicios resueltos y propuestos clasificados por nivel: problemas de cuatro operaciones, sucesiones, criptoaritmética y lógica recreativa. Editorial El Estudiante.',
    category: 'libros',
    price: 25,
    offerPrice: 16.90,
    pages: 140,
    format: 'PDF Interactivo con Índice Digital',
    fileSize: '24 MB',
    targetAudience: '4° a 6° de Primaria y 1° a 3° de Secundaria',
    coverUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800',
    previewPages: [
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800'
    ],
    downloadUrl: 'https://drive.google.com/',
    isOriginal: true,
    featured: true,
    tags: ['Matemáticas', 'Razonamiento', 'Compendio', 'Secundaria']
  },
  {
    title: 'Revista Pedagógica "Voces del Saber" - Edición Bilingüe y Escolar',
    description: 'Boletín y revista cultural con metodologías activas para el aula, dinámicas de lectura comprensiva, relatos orales de Lucanas y proyectos de ciencia escolar para docentes y padres de familia.',
    category: 'revistas',
    price: 18,
    offerPrice: 12.00,
    pages: 52,
    format: 'PDF Editorial Color A4',
    fileSize: '22 MB',
    targetAudience: 'Docentes, Padres de Familia y Estudiantes',
    coverUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800',
    previewPages: [
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800'
    ],
    downloadUrl: 'https://drive.google.com/',
    isOriginal: true,
    featured: false,
    tags: ['Revista', 'Pedagogía', 'Docentes', 'Lectura']
  },
  {
    title: 'Cuaderno de Refuerzo Ortográfico y Redacción Creativa',
    description: 'Domina el uso de la B y V, C, S y Z, acentuación gráfica, conectores lógicos y reglas prácticas mediante micro-historias y crucigramas ortográficos. Formato original listo para imprimir.',
    category: 'cuadernos_trabajo',
    price: 14,
    offerPrice: 9.90,
    pages: 72,
    format: 'PDF Imprimible A4',
    fileSize: '16 MB',
    targetAudience: 'Primaria (3° a 6°) y 1° Secundaria',
    coverUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800',
    previewPages: [
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800'
    ],
    downloadUrl: 'https://drive.google.com/',
    isOriginal: true,
    featured: false,
    tags: ['Ortografía', 'Gramática', 'Primaria', 'Redacción']
  },
  {
    title: 'Fantasía Espacial & Robots: Cuaderno para Colorear y Trazar',
    description: 'Cuaderno con 50 páginas de aventuras interestelares, astronautas, naves y laberintos espaciales que estimulan la creatividad, la concentración y la relajación infantil.',
    category: 'para_colorear',
    price: 12,
    offerPrice: 7.90,
    pages: 50,
    format: 'PDF Vectorial Imprimible A4',
    fileSize: '12 MB',
    targetAudience: 'Todas las edades (Infantil y Estimulación)',
    coverUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800',
    previewPages: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800'
    ],
    downloadUrl: 'https://drive.google.com/',
    isOriginal: true,
    featured: false,
    tags: ['Colorear', 'Espacio', 'Laberintos', 'Creatividad']
  }
];

export const DigitalService = {
  subscribeDigitalProducts(callback: (products: DigitalProduct[]) => void) {
    const q = query(collection(db, 'digital_products'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as DigitalProduct[];
        callback(items);
      },
      (error) => {
        console.error('Error al escuchar productos digitales:', error);
        handleFirestoreError(error, 'list', 'digital_products');
      }
    );
  },

  async saveDigitalProduct(item: Partial<DigitalProduct>) {
    const cleanId = item.id ? String(item.id).trim() : null;
    
    // Explicit sanitization of fields conforming strictly to firestore rules
    const payload = {
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      category: (item.category && ['libros', 'revistas', 'cuadernos_trabajo', 'para_colorear'].includes(item.category))
        ? item.category 
        : 'cuadernos_trabajo',
      price: !isNaN(Number(item.price)) && Number(item.price) >= 0 ? Number(item.price) : 0,
      offerPrice: item.offerPrice !== undefined && item.offerPrice !== null && !isNaN(Number(item.offerPrice))
        ? Number(item.offerPrice) 
        : null,
      pages: !isNaN(Number(item.pages)) && Number(item.pages) >= 0 ? Number(item.pages) : 0,
      format: String(item.format || 'PDF de Alta Resolución (A4)').trim(),
      fileSize: String(item.fileSize || 'Descarga Digital Inmediata').trim(),
      targetAudience: String(item.targetAudience || 'Educación Básica Regular').trim(),
      coverUrl: String(item.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800').trim(),
      previewPages: Array.isArray(item.previewPages) 
        ? item.previewPages.map((url: string) => String(url || '').trim()).filter(Boolean) 
        : [],
      downloadUrl: String(item.downloadUrl || '').trim(),
      isOriginal: item.isOriginal !== false,
      featured: Boolean(item.featured),
      tags: Array.isArray(item.tags) 
        ? item.tags.map((t: string) => String(t || '').trim()).filter(Boolean) 
        : [],
      updatedAt: serverTimestamp()
    };

    try {
      if (cleanId) {
        // Edit existing product
        await updateDoc(doc(db, 'digital_products', cleanId), payload);
        return cleanId;
      } else {
        // Create new product
        const newDoc = await addDoc(collection(db, 'digital_products'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        return newDoc.id;
      }
    } catch (err) {
      console.error('Error in saveDigitalProduct:', err);
      handleFirestoreError(err, cleanId ? 'update' : 'create', cleanId ? `digital_products/${cleanId}` : 'digital_products');
      throw err;
    }
  },

  async deleteDigitalProduct(id: string) {
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      throw new Error('ID no válido para eliminar el producto digital');
    }
    try {
      await deleteDoc(doc(db, 'digital_products', cleanId));
    } catch (err) {
      console.error('Error in deleteDigitalProduct:', err);
      handleFirestoreError(err, 'delete', `digital_products/${cleanId}`);
      throw err;
    }
  },

  async restoreSampleProducts() {
    const results = [];
    for (const item of INITIAL_ORIGINAL_DIGITALS) {
      try {
        const id = await this.saveDigitalProduct(item);
        results.push(id);
      } catch (err) {
        console.warn('Skipping item in restoreSampleProducts:', err);
      }
    }
    return results;
  }
};
