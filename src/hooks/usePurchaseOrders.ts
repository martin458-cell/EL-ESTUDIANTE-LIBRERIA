import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';

export interface PurchaseOrderItem {
  productId: string;
  sku: string;
  name: string;
  costPrice: number;
  quantity: number;
  isManual?: boolean;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: 'borrador' | 'enviado' | 'recibido';
  items: PurchaseOrderItem[];
  notes?: string;
  freightCost?: number;
  createdAt?: any;
  updatedAt?: any;
}

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'purchase_orders'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const orderList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PurchaseOrder[];
        setPurchaseOrders(orderList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching purchase orders:", err);
        setError("Error al cargar los pedidos de compra.");
        setLoading(false);
        try {
          handleFirestoreError(err, 'list', 'purchase_orders');
        } catch (e) {
          // Keep failure safe
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return { purchaseOrders, loading, error };
};
