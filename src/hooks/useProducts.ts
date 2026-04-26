import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Product {
  id: string;
  sku: string;         // Código de barras o SKU interno
  name: string;
  authorOrBrand: string; // Autor para libros, Marca para útiles
  category: string;
  description?: string;
  price: number;        // Precio de venta
  costPrice: number;    // Precio de costo
  stock: number;
  minStock: number;     // Umbral para alertas
  imageUrl?: string;
  featured: boolean;    // Si es destacado o novedad
  isOffer?: boolean;    // Si está en oferta/remate
  offerPrice?: number;  // Precio en oferta
  createdAt?: any;
  updatedAt?: any;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const productsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching products:", err);
        setError("Error al cargar los productos.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { products, loading, error };
};
