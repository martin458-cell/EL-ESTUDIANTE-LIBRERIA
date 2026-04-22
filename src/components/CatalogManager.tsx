import React, { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Save, Search, Package, Check, FileDown, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../hooks/useProducts';
import { CatalogService } from '../services/catalogService';
import * as XLSX from 'xlsx';

interface CatalogManagerProps {
  products: Product[];
  onClose: () => void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({ products, onClose }) => {
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['libros', 'utiles', 'tecnologia'];

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

        // Skip header row and map data
        // Format: [SKU, Name, Price, Stock, ImageURL, Category]
        const productsToImport: Partial<Product>[] = data.slice(1).map(row => ({
          sku: String(row[0] || '').trim(),
          name: String(row[1] || '').trim(),
          price: parseFloat(row[2]) || 0,
          stock: parseInt(row[3]) || 0,
          imageUrl: String(row[4] || '').trim(),
          category: String(row[5] || 'utiles').toLowerCase().trim(),
          authorOrBrand: ''
        })).filter(p => p.sku && p.name);

        if (productsToImport.length === 0) {
          alert("No se encontraron productos válidos en el Excel.");
          return;
        }

        if (confirm(`¿Importar ${productsToImport.length} productos?`)) {
          setIsSaving(true);
          await CatalogService.bulkSaveProducts(productsToImport);
          alert("Importación exitosa");
        }
      } catch (err) {
        console.error(err);
        alert("Error al procesar el Excel. Asegúrate de seguir el formato correcto.");
      } finally {
        setIsSaving(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.sku) {
      alert("Nombre y Código son obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      await CatalogService.saveProduct(editingProduct);
      setEditingProduct(null);
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este producto?")) {
      await CatalogService.deleteProduct(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-teal text-white rounded-xl flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Catálogo Maestro</h2>
              <p className="text-xs text-slate-500 font-medium">Libros · Útiles · Tecnología</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* List Section */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-slate-50">
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o SKU..."
                  className="w-full bg-slate-100 border-none rounded-xl py-2 px-10 text-sm focus:ring-2 ring-brand-teal outline-none transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleExcelImport} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-700 transition-all shadow-lg"
                title="Importar desde Excel"
              >
                <UploadCloud size={18} /> <span className="hidden sm:inline">Excel</span>
              </button>
              <button 
                onClick={() => setEditingProduct({ category: 'libros', featured: false, minStock: 5, stock: 0, price: 0, costPrice: 0 })}
                className="bg-brand-teal text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand-teal/90 transition-all shadow-lg shadow-brand-teal/20"
              >
                <Plus size={18} /> Nuevo
              </button>
            </div>

            <div className="space-y-2">
              {filtered.map(p => (
                <div key={p.id} className="group flex items-center justify-between p-3 rounded-2xl border border-slate-50 hover:border-brand-teal/20 hover:bg-teal-50/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                      {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Search size={14} /></div>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 leading-tight">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.sku} · {p.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingProduct(p)} className="p-2 hover:bg-white rounded-lg text-slate-500 shadow-sm border border-slate-100"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 shadow-sm border border-slate-100"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Section */}
          <AnimatePresence>
            {editingProduct && (
              <motion.div 
                initial={{ x: 200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 200, opacity: 0 }}
                className="w-full md:w-80 bg-slate-50 p-6 border-l border-slate-100 overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800">{editingProduct.id ? 'Editar' : 'Nuevo'}</h3>
                  <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Código SKU</label>
                    <input 
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none"
                      value={editingProduct.sku || ''}
                      onChange={e => setEditingProduct({...editingProduct, sku: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Nombre</label>
                    <input 
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none"
                      value={editingProduct.name || ''}
                      onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Precio S/</label>
                      <input 
                        type="number"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none"
                        value={editingProduct.price || ''}
                        onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Stock</label>
                      <input 
                        type="number"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none"
                        value={editingProduct.stock || ''}
                        onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Foto URL (u opcional)</label>
                    <input 
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none"
                      value={editingProduct.imageUrl || ''}
                      onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Categoría</label>
                    <select 
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-teal outline-none capitalize"
                      value={editingProduct.category || 'libros'}
                      onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <button 
                    disabled={isSaving}
                    type="submit" 
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <X className="animate-spin" size={16} /> : <Save size={16} />}
                    {editingProduct.id ? 'Actualizar' : 'Guardar'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 bg-slate-900 text-slate-400 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Sistema de Gestión Sincronizado v2.0</span>
        </div>
      </motion.div>
    </div>
  );
};
