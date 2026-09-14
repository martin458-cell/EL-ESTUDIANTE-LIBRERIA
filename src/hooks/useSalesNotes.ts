import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SalesNoteItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface SalesNote {
  id: string;
  number: string;
  clientName: string;
  clientDoc?: string;
  date: string;
  items: SalesNoteItem[];
  subtotal: number;
  discount: number;
  igv: number;
  total: number;
  paymentMethod: 'Efectivo' | 'Yape' | 'Plin' | 'Transferencia' | 'Tarjeta';
  status: 'Cancelado' | 'Pendiente' | 'Parcial';
  paidAmount: number;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const useSalesNotes = () => {
  const [salesNotes, setSalesNotes] = useState<SalesNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'sales_notes'), orderBy('number', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SalesNote[];
        setSalesNotes(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching sales notes:", err);
        setError("Error al cargar el listado de notas de venta.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { salesNotes, loading, error };
};
