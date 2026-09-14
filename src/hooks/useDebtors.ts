import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Debtor {
  id: string;
  apellidosNombres: string; // Apellidos y Nombres
  fecha: string;            // Fecha (YYYY-MM-DD)
  producto: string;         // Producto
  precio: number;           // Precio
  estado: 'Pendiente' | 'Pagado' | 'Vencido'; // Estado
  observacion?: string;     // Observación
  createdAt?: any;
  updatedAt?: any;
}

export const useDebtors = () => {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Order by date descending by default so latest tasks/credits show up first
    const q = query(collection(db, 'debtors'), orderBy('fecha', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const debtorsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Debtor[];
        setDebtors(debtorsList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching debtors:", err);
        setError("Error al cargar el listado de deudores.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { debtors, loading, error };
};
