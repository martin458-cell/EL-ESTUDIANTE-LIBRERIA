import React, { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Package, 
  AlertCircle,
  Link as LinkIcon,
  Tag as TagIcon,
  DollarSign,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../../lib/firebase';
import { Product } from '../../hooks/useProducts';

interface AdminPanelProps {
  products: Product[];
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ products, onClose }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: 0,
    stock: 0,
    category: 'libros',
    description: '',
    imageUrl: '',
    tag: ''
  });

  const categories = ['libros', 'utiles', 'tecnologia'];

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData(product);
    setIsAdding(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      stock: 0,
      category: 'libros',
      description: '',
      imageUrl: '',
      tag: ''
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), data);
      } else {
        await addDoc(collection(db, 'products'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? 'update' : 'create', 'products');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        handleFirestoreError(error, 'delete', `products/${id}`);
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-bg-warm">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Package className="text-brand-teal" size={32} /> Gestión de Inventario
            </h2>
            <p className="text-slate-500">Actualiza stock, precios y productos de Librería "El Estudiante"</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-8 bg-slate-50 border-b border-slate-100">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 text-brand-teal rounded-xl flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Productos</p>
              <p className="text-2xl font-bold text-slate-900">{products.length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin Stock</p>
              <p className="text-2xl font-bold text-slate-900">{products.filter(p => p.stock === 0).length}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Inventario</p>
              <p className="text-2xl font-bold text-slate-900">
                {products.reduce((acc, p) => acc + (p.price * p.stock), 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
              <Layers size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categorías</p>
              <p className="text-2xl font-bold text-slate-900">{new Set(products.map(p => p.category)).size}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* List Section */}
          <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100">
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-12 pr-4 focus:border-brand-teal outline-none transition-colors font-medium"
                />
              </div>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-brand-teal text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-teal/90 shadow-lg shadow-brand-teal/20"
              >
                <Plus size={20} /> Nuevo
              </button>
            </div>

            <div className="space-y-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Package className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-500 font-medium">No hay productos que coincidan.</p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <div 
                    key={product.id}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-brand-teal/30 hover:bg-teal-50/30 transition-all group"
                  >
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{product.name}</h4>
                      <div className="flex gap-3 text-xs font-semibold uppercase tracking-wider mt-1">
                        <span className="text-brand-teal">{product.category}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-brand-orange">{product.price.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}</span>
                        <span className="text-slate-400">•</span>
                        <span className={`${product.stock < 5 ? 'text-red-500' : 'text-slate-500'}`}>Stock: {product.stock}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-2 hover:bg-white rounded-lg text-slate-600 shadow-sm border border-slate-100"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500 shadow-sm border border-slate-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Form Section */}
          <AnimatePresence>
            {(isAdding || editingId) && (
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="w-full md:w-96 bg-slate-50 p-8 overflow-y-auto shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.1)] z-10"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                  </h3>
                  <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nombre</label>
                    <div className="relative">
                      <TagIcon className="absolute left-3 top-3 text-slate-300" size={18} />
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:border-brand-teal outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Precio (S/)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 text-slate-300" size={18} />
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          value={formData.price}
                          onChange={e => setFormData({...formData, price: e.target.value as any})}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:border-brand-teal outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Stock</label>
                      <div className="relative">
                        <Layers className="absolute left-3 top-3 text-slate-300" size={18} />
                        <input 
                          required
                          type="number" 
                          value={formData.stock}
                          onChange={e => setFormData({...formData, stock: e.target.value as any})}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:border-brand-teal outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Categoría</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({...formData, category: cat})}
                          className={`px-4 py-2 rounded-lg text-xs font-bold capitalize border transition-all ${
                            formData.category === cat 
                              ? 'bg-brand-teal text-white border-brand-teal shadow-md' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-teal/50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">URL Imagen</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 text-slate-300" size={18} />
                      <input 
                        type="url" 
                        value={formData.imageUrl}
                        onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 focus:border-brand-teal outline-none transition-colors"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Etiqueta (Opcional)</label>
                    <input 
                      type="text" 
                      value={formData.tag}
                      onChange={e => setFormData({...formData, tag: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 focus:border-brand-teal outline-none transition-colors"
                      placeholder="Oferta, Nuevo, etc."
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-brand-teal text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-teal/90 shadow-xl shadow-brand-teal/20 mt-8"
                  >
                    <Save size={20} /> {editingId ? 'Actualizar Producto' : 'Guardar Producto'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="p-6 bg-slate-900 text-white flex items-center gap-3">
          <AlertCircle className="text-brand-yellow" size={20} />
          <p className="text-xs text-slate-400">
            Los cambios en el stock y precios se reflejan instantáneamente para todos los clientes en la web.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
