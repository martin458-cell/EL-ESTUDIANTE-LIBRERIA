import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { PurchaseOrder } from '../hooks/usePurchaseOrders';

export const PurchaseOrderService = {
  async savePurchaseOrder(order: Partial<PurchaseOrder>) {
    const { id, createdAt, updatedAt, ...data } = order as any;
    
    const payload = {
      supplierId: data.supplierId || '',
      supplierName: data.supplierName || '',
      status: data.status || 'borrador',
      items: (data.items || []).map((item: any) => ({
        productId: item.productId || '',
        sku: item.sku || '',
        name: item.name || '',
        costPrice: Number(item.costPrice || 0),
        quantity: Number(item.quantity || 0),
        isManual: !!item.isManual
      })),
      notes: data.notes || '',
      freightCost: Number(data.freightCost || 0),
      updatedAt: serverTimestamp()
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'purchase_orders', id), payload);
      } else {
        await addDoc(collection(db, 'purchase_orders'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, id ? 'update' : 'create', 'purchase_orders');
    }
  },

  async deletePurchaseOrder(id: string) {
    try {
      await deleteDoc(doc(db, 'purchase_orders', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'purchase_orders');
    }
  }
};
