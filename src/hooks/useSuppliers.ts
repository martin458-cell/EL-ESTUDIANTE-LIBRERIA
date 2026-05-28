import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Supplier {
  id: string;
  name: string;        // Nombre o Razón Social del proveedor
  ruc?: string;        // RUC (11 dígitos, Sunat)
  phone: string;       // Teléfono de contacto
  email?: string;      // Correo electrónico
  address?: string;    // Dirección de almacén u oficina
  contactName?: string;// Nombre del asesor o persona de contacto
  category?: string;   // Tipo de material que provee (ej: Papelería, Oficinal, Libros, etc.)
  notes?: string;      // Notas sobre crédito, tiempo de envío, cuentas bancarias, etc.
  createdAt?: any;
  updatedAt?: any;
}

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const suppliersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Supplier[];
        setSuppliers(suppliersList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching suppliers:", err);
        setError("Error al cargar los proveedores.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { suppliers, loading, error };
};
