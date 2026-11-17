import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  FileText, 
  CheckCircle2, 
  X, 
  Save, 
  AlertCircle, 
  Loader2, 
  Tag, 
  Star, 
  RotateCcw
} from 'lucide-react';
import { DigitalProduct, DigitalCategory, DIGITAL_CATEGORIES_METADATA, DigitalService } from '../services/digitalService';

interface DigitalManagerProps {
  products: DigitalProduct[];
  loading?: boolean;
}

export const DigitalManager: React.FC<DigitalManagerProps> = ({ products, loading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [editingItem, setEditingItem] = useState<Partial<DigitalProduct> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewPageInput, setPreviewPageInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Delete confirmation modal state (replaces window.confirm)
  const [deleteModalItem, setDeleteModalItem] = useState<DigitalProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Restore sample state
  const [isRestoringSamples, setIsRestoringSamples] = useState(false);

  // In-app notifications banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  const filtered = products.filter((item) => {
    const matchesCat = selectedCategory === 'todos' || item.category === selectedCategory;
    if (!matchesCat) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      (item.targetAudience && item.targetAudience.toLowerCase().includes(term)) ||
      (item.format && item.format.toLowerCase().includes(term)) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(term)))
    );
  });

  const handleStartCreate = () => {
    setEditingItem({
      title: '',
      description: '',
      category: 'cuadernos_trabajo',
      price: 15,
      offerPrice: null,
      pages: 40,
      format: 'PDF de Alta Resolución (A4)',
      fileSize: '15 MB',
      targetAudience: 'Inicial / Primaria',
      coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800',
      previewPages: [],
      downloadUrl: '',
      isOriginal: true,
      featured: false,
      tags: ['Original', 'Imprimible']
    });
    setPreviewPageInput('');
    setTagInput('');
  };

  const handleStartEdit = (item: DigitalProduct) => {
    setEditingItem({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price,
      offerPrice: item.offerPrice ?? null,
      pages: item.pages ?? 0,
      format: item.format || 'PDF de Alta Resolución (A4)',
      fileSize: item.fileSize || '15 MB',
      targetAudience: item.targetAudience || 'Educación Básica Regular',
      coverUrl: item.coverUrl,
      previewPages: item.previewPages ? [...item.previewPages] : [],
      downloadUrl: item.downloadUrl || '',
      isOriginal: item.isOriginal !== false,
      featured: Boolean(item.featured),
      tags: item.tags ? [...item.tags] : []
    });
    setPreviewPageInput('');
    setTagInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editingItem.title?.trim()) {
      showToast('error', 'Por favor ingresa un título para el producto digital.');
      return;
    }

    if (editingItem.price === undefined || editingItem.price === null || isNaN(editingItem.price) || editingItem.price < 0) {
      showToast('error', 'Por favor ingresa un precio válido (mayor o igual a cero).');
      return;
    }

    if (!editingItem.coverUrl?.trim()) {
      showToast('error', 'Por favor ingresa la URL de la portada del producto.');
      return;
    }

    setIsSaving(true);
    try {
      await DigitalService.saveDigitalProduct(editingItem);
      const savedTitle = editingItem.title;
      const isEdit = Boolean(editingItem.id);
      setEditingItem(null);
      showToast(
        'success', 
        isEdit 
          ? `¡Producto "${savedTitle}" actualizado correctamente!` 
          : `¡Producto "${savedTitle}" registrado con éxito!`
      );
    } catch (err: any) {
      console.error('Error al guardar producto digital:', err);
      let errorMsg = 'No se pudo guardar el producto digital.';
      const rawText = String(err?.message || err || '');
      if (rawText.toLowerCase().includes('permission') || rawText.toLowerCase().includes('insufficient')) {
        errorMsg = 'Permiso denegado: Necesitas iniciar sesión como Administrador en Firebase para guardar cambios.';
      } else if (err?.message) {
        errorMsg += ` Detalle: ${err.message}`;
      }
      showToast('error', errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModalItem) return;

    setIsDeleting(true);
    try {
      await DigitalService.deleteDigitalProduct(deleteModalItem.id);
      
      // If we are currently editing the deleted item, clear form
      if (editingItem?.id === deleteModalItem.id) {
        setEditingItem(null);
      }

      const deletedTitle = deleteModalItem.title;
      setDeleteModalItem(null);
      showToast('success', `El producto "${deletedTitle}" fue eliminado del catálogo digital.`);
    } catch (err: any) {
      console.error('Error al eliminar producto digital:', err);
      let errorMsg = 'No se pudo eliminar el producto digital.';
      const rawText = String(err?.message || err || '');
      if (rawText.toLowerCase().includes('permission') || rawText.toLowerCase().includes('insufficient')) {
        errorMsg = 'Permiso denegado: Tu usuario no cuenta con privilegios de Administrador para eliminar registros.';
      } else if (err?.message) {
        errorMsg += ` Detalle: ${err.message}`;
      }
      showToast('error', errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreSamples = async () => {
    setIsRestoringSamples(true);
    try {
      await DigitalService.restoreSampleProducts();
      showToast('success', '¡Catálogo de muestra original restaurado con éxito!');
    } catch (err: any) {
      console.error('Error restaurando muestras:', err);
      showToast('error', 'No se pudieron restaurar las muestras: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsRestoringSamples(false);
    }
  };

  const addPreviewPage = () => {
    if (!previewPageInput.trim() || !editingItem) return;
    const currentList = editingItem.previewPages || [];
    setEditingItem({
      ...editingItem,
      previewPages: [...currentList, previewPageInput.trim()]
    });
    setPreviewPageInput('');
  };

  const removePreviewPage = (index: number) => {
    if (!editingItem) return;
    const currentList = [...(editingItem.previewPages || [])];
    currentList.splice(index, 1);
    setEditingItem({ ...editingItem, previewPages: currentList });
  };

  const addTag = () => {
    if (!tagInput.trim() || !editingItem) return;
    const cleanTag = tagInput.trim();
    const currentTags = editingItem.tags || [];
    if (!currentTags.includes(cleanTag)) {
      setEditingItem({
        ...editingItem,
        tags: [...currentTags, cleanTag]
      });
    }
    setTagInput('');
  };

  const removeTag = (index: number) => {
    if (!editingItem) return;
    const currentTags = [...(editingItem.tags || [])];
    currentTags.splice(index, 1);
    setEditingItem({ ...editingItem, tags: currentTags });
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 relative">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-[200] max-w-lg w-[90%] sm:w-auto px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/20'
                : 'bg-rose-600 text-white border-rose-500 shadow-rose-950/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-200" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-rose-200" />
            )}
            <span className="text-xs font-bold leading-snug flex-1">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Deleting Products (replaces window.confirm) */}
      <AnimatePresence>
        {deleteModalItem && (
          <div className="fixed inset-0 z-[220] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ¿Eliminar producto digital?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Esta acción borrará de manera definitiva el registro en la base de datos de <strong>Firestore</strong>. No podrá deshacerse.
                  </p>
                </div>
              </div>

              {/* Product preview box */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3">
                <img
                  src={deleteModalItem.coverUrl}
                  alt=""
                  className="w-12 h-14 object-cover rounded-xl border border-slate-200 bg-white shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
                  }}
                />
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase text-brand-teal tracking-wider block">
                    {DIGITAL_CATEGORIES_METADATA[deleteModalItem.category]?.label || deleteModalItem.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 truncate">
                    {deleteModalItem.title}
                  </h4>
                  <p className="text-[11px] font-black text-slate-600 font-mono mt-0.5">
                    S/ {Number(deleteModalItem.offerPrice || deleteModalItem.price).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalItem(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Sí, Eliminar</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Columna Izquierda: Tabla y Lista de Productos Digitales */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 min-h-0 border-r border-slate-200/80 bg-white">
        {/* Cabecera del Módulo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-50 text-brand-teal">
                <Sparkles size={18} />
              </span>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                Digitales El Estudiante
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de Libros, Revistas, Cuadernos de Trabajo y Cuadernos para Colorear originales.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartCreate}
              className="px-4 py-2.5 bg-brand-teal hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-900/10 cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span>Nuevo Producto Digital</span>
            </button>
          </div>
        </div>

        {/* Filtros rápidos con scroll moderno */}
        <div className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 digital-category-scrollbar">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'todos' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setSelectedCategory('cuadernos_trabajo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'cuadernos_trabajo' 
                  ? 'bg-brand-teal text-white shadow-sm shadow-teal-500/30' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Cuadernos de Trabajo ({products.filter(p => p.category === 'cuadernos_trabajo').length})
            </button>
            <button
              onClick={() => setSelectedCategory('para_colorear')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'para_colorear' 
                  ? 'bg-brand-teal text-white shadow-sm shadow-teal-500/30' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Para Colorear ({products.filter(p => p.category === 'para_colorear').length})
            </button>
            <button
              onClick={() => setSelectedCategory('libros')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'libros' 
                  ? 'bg-brand-teal text-white shadow-sm shadow-teal-500/30' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Libros ({products.filter(p => p.category === 'libros').length})
            </button>
            <button
              onClick={() => setSelectedCategory('revistas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'revistas' 
                  ? 'bg-brand-teal text-white shadow-sm shadow-teal-500/30' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Revistas ({products.filter(p => p.category === 'revistas').length})
            </button>
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título, tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 border border-slate-200 focus:bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Lista / Grid de Elementos */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-brand-teal" />
              <span>Cargando catálogo digital...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="p-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand-teal flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">El catálogo digital está vacío</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                  Puedes registrar nuevos productos manualmente o cargar el catálogo de muestra original con 6 títulos listos.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleStartCreate}
                  className="px-4 py-2 bg-brand-teal hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus size={14} /> Crear Primer Producto
                </button>
                <button
                  onClick={handleRestoreSamples}
                  disabled={isRestoringSamples}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isRestoringSamples ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Cargando muestras...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} />
                      Cargar 6 Muestras
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              <FileText size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">No hay productos que coincidan con la búsqueda</p>
              <button
                onClick={() => { setSelectedCategory('todos'); setSearchTerm(''); }}
                className="mt-2 text-xs font-bold text-brand-teal hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            filtered.map((item) => {
              const meta = DIGITAL_CATEGORIES_METADATA[item.category] || { label: item.category };
              const isSelected = editingItem?.id === item.id;
              const price = item.offerPrice || item.price;

              return (
                <div
                  key={item.id}
                  onClick={() => handleStartEdit(item)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer group ${
                    isSelected 
                      ? 'border-brand-teal bg-teal-50/50 shadow-sm ring-1 ring-brand-teal/30' 
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60 relative">
                      <img 
                        src={item.coverUrl} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                      {item.featured && (
                        <div className="absolute top-1 left-1 bg-amber-400 text-slate-900 rounded-full p-0.5 shadow-xs">
                          <Star size={10} fill="currentColor" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {meta.label}
                        </span>
                        {item.offerPrice && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-700">
                            Oferta S/ {item.offerPrice.toFixed(2)}
                          </span>
                        )}
                        {item.targetAudience && (
                          <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[150px]">
                            · {item.targetAudience}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.pages ? `${item.pages} págs.` : 'Digital'} · {item.format || 'PDF'}
                        {item.fileSize ? ` · ${item.fileSize}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-slate-900 block font-mono">
                        S/ {price.toFixed(2)}
                      </span>
                      {item.offerPrice && (
                        <span className="text-[10px] text-slate-400 line-through font-mono">
                          S/ {item.price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(item);
                        }}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-brand-teal text-white shadow-xs' 
                            : 'text-slate-500 hover:text-brand-teal hover:bg-slate-100'
                        }`}
                        title="Editar producto"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModalItem(item);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Columna Derecha: Formulario de Edición / Creación */}
      <div className="w-full md:w-[460px] lg:w-[500px] bg-slate-50 p-4 sm:p-6 overflow-y-auto shrink-0 flex flex-col justify-between border-l border-slate-200 custom-scrollbar">
        {editingItem ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-brand-teal tracking-wider block">
                  {editingItem.id ? 'Modificar Registro' : 'Nuevo Registro'}
                </span>
                <h3 className="text-sm font-bold text-slate-800 truncate flex items-center gap-2">
                  <Edit3 size={15} className="text-brand-teal shrink-0" />
                  <span className="truncate">{editingItem.id ? editingItem.title || 'Editar Producto' : 'Crear Producto Digital'}</span>
                </h3>
                {editingItem.id && (
                  <span className="text-[9px] font-mono text-slate-400 block mt-0.5 truncate">
                    ID: {editingItem.id}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {editingItem.id && (
                  <button
                    type="button"
                    onClick={() => {
                      const fullItem = products.find(p => p.id === editingItem.id);
                      if (fullItem) {
                        setDeleteModalItem(fullItem);
                      }
                    }}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-100/70 transition-colors cursor-pointer"
                    title="Eliminar este producto"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Cerrar editor"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Categoría y Título */}
            <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Información Básica
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Categoría Digital *
                </label>
                <select
                  value={editingItem.category || 'cuadernos_trabajo'}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as DigitalCategory })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-semibold focus:border-brand-teal focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="cuadernos_trabajo">Cuadernos de Trabajo (Workbooks)</option>
                  <option value="para_colorear">Cuadernos para Colorear (Arte / Motricidad)</option>
                  <option value="libros">Libros Digitales (Compendios / Guías)</option>
                  <option value="revistas">Revistas Educativas & Boletines</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Título del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Cuaderno de Grafomotricidad y Caligrafía"
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Descripción Pedagógica *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalla contenidos, número de fichas, destrezas trabajadas, etc..."
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editingItem.featured)}
                    onChange={(e) => setEditingItem({ ...editingItem, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-teal border-slate-300 focus:ring-brand-teal"
                  />
                  <span>Destacar en Portada ⭐</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingItem.isOriginal !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isOriginal: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-teal border-slate-300 focus:ring-brand-teal"
                  />
                  <span>Original de El Estudiante ✨</span>
                </label>
              </div>
            </div>

            {/* Precios y Especificaciones */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Precios y Especificaciones
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Precio Regular (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    required
                    value={editingItem.price ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Precio Oferta (S/)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    placeholder="Opcional"
                    value={editingItem.offerPrice ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, offerPrice: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    N° de Páginas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.pages ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, pages: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Edad / Nivel Escolar
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Inicial 4-5 años"
                    value={editingItem.targetAudience || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, targetAudience: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Formato Digital
                  </label>
                  <input
                    type="text"
                    placeholder="ej. PDF Alta Resolución A4"
                    value={editingItem.format || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, format: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Tamaño de Archivo
                  </label>
                  <input
                    type="text"
                    placeholder="ej. 15 MB"
                    value={editingItem.fileSize || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, fileSize: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Enlaces y Portada */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Archivos y Portada
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  URL de Portada (Imagen) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={editingItem.coverUrl || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, coverUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none"
                />
                {editingItem.coverUrl && (
                  <div className="mt-2 h-24 w-20 rounded-xl overflow-hidden border border-slate-200 shadow-xs relative">
                    <img 
                      src={editingItem.coverUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Enlace Seguro de Descarga (Google Drive / Nube)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={editingItem.downloadUrl || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, downloadUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-teal focus:outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Este link se envía automáticamente al cliente por WhatsApp al procesar la venta.
                </p>
              </div>

              {/* Páginas de muestra para visor */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Páginas de Muestra para el Visor (Imágenes)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="https://imagen-hoja-muestra.jpg"
                    value={previewPageInput}
                    onChange={(e) => setPreviewPageInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={addPreviewPage}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
                {editingItem.previewPages && editingItem.previewPages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {editingItem.previewPages.map((url, i) => (
                      <div key={i} className="relative group w-12 h-14 rounded-lg overflow-hidden border border-slate-300 shadow-xs">
                        <img 
                          src={url} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removePreviewPage(i)}
                          className="absolute inset-0 bg-rose-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Eliminar esta página de muestra"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Etiquetas / Tags */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Etiquetas (Palabras Clave)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="ej. Primaria, Caligrafía..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Añadir
                  </button>
                </div>
                {editingItem.tags && editingItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editingItem.tags.map((t, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-50 text-brand-teal border border-teal-200/60"
                      >
                        <Tag size={10} />
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(i)}
                          className="hover:text-rose-600 ml-0.5 cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Botón de Guardado y Acciones */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-brand-teal hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Guardando en Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>{editingItem.id ? 'Guardar Cambios' : 'Registrar Producto'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
              </div>

              {editingItem.id && (
                <button
                  type="button"
                  onClick={() => {
                    const fullItem = products.find(p => p.id === editingItem.id);
                    if (fullItem) {
                      setDeleteModalItem(fullItem);
                    }
                  }}
                  className="w-full py-2 px-3 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200/80"
                >
                  <Trash2 size={13} />
                  <span>Eliminar definitivamente este producto del catálogo</span>
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-brand-teal flex items-center justify-center">
              <Sparkles size={28} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-700">Editor de Material Digital</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Selecciona cualquier producto de la lista izquierda para <strong>editarlo</strong> o <strong>eliminarlo</strong>, o haz clic en "Nuevo Producto Digital".
              </p>
            </div>
            <button
              onClick={handleStartCreate}
              className="mt-2 px-4 py-2 bg-brand-teal hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              Crear Nuevo Producto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
