import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  StickyNote, 
  Plus, 
  Pin, 
  Trash2, 
  Edit3, 
  Check, 
  CheckCircle2, 
  Circle, 
  Copy, 
  Search, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  Filter, 
  X, 
  Save, 
  RotateCcw,
  Tag,
  Flame,
  Package,
  Truck,
  Users,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QuickNote, 
  NoteColor, 
  NoteCategory, 
  NOTE_CATEGORIES, 
  NOTE_COLORS 
} from '../services/quickNoteService';
import { useQuickNotes } from '../hooks/useQuickNotes';

interface QuickNotesManagerProps {
  onClose?: () => void;
  isDrawer?: boolean;
}

export const QuickNotesManager: React.FC<QuickNotesManagerProps> = ({ onClose, isDrawer = false }) => {
  const { notes, loading, saveNote, deleteNote, togglePin, toggleCompleted } = useQuickNotes();

  // Form states for creating / editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<NoteColor>('yellow');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>('general');
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'pinned'>('all');

  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setSelectedColor('yellow');
    setSelectedCategory('general');
    setIsPinned(false);
  };

  // Pre-fill form when editing
  const handleStartEdit = (note: QuickNote) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setSelectedColor(note.color);
    setSelectedCategory(note.category);
    setIsPinned(note.pinned);
    // Scroll form into view
    contentInputRef.current?.focus();
  };

  // Save handler (1-click or Ctrl+Enter)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !title.trim()) {
      alert('Por favor escribe un título o el contenido de la nota.');
      return;
    }

    setIsSaving(true);
    try {
      await saveNote({
        id: editingId || undefined,
        title: title.trim(),
        content: content.trim(),
        color: selectedColor,
        category: selectedCategory,
        pinned: isPinned,
        completed: false
      });
      resetForm();
    } catch (err: any) {
      console.error('Error guardando nota:', err);
      alert('No se pudo guardar la nota. ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+Enter to save immediately
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  // Copy note content
  const handleCopy = (note: QuickNote) => {
    const textToCopy = `${note.title ? `[${note.title}]\n` : ''}${note.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick preset templates for super easy creation
  const applyTemplate = (category: NoteCategory, defaultTitle: string, defaultColor: NoteColor) => {
    setSelectedCategory(category);
    setSelectedColor(defaultColor);
    setTitle(defaultTitle);
    contentInputRef.current?.focus();
  };

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        n.title.toLowerCase().includes(q) || 
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Category filter
      if (filterCategory !== 'all' && n.category !== filterCategory) {
        return false;
      }

      // Status filter
      if (filterStatus === 'pending' && n.completed) return false;
      if (filterStatus === 'completed' && !n.completed) return false;
      if (filterStatus === 'pinned' && !n.pinned) return false;

      return true;
    });
  }, [notes, searchQuery, filterCategory, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = notes.length;
    const pinned = notes.filter(n => n.pinned).length;
    const pending = notes.filter(n => !n.completed).length;
    const completed = notes.filter(n => n.completed).length;
    return { total, pinned, pending, completed };
  }, [notes]);

  // Format date helper
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Reciente';
    try {
      if (typeof timestamp === 'string') {
        const d = new Date(timestamp);
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
      if (timestamp.toDate) {
        const d = timestamp.toDate();
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
      if (timestamp.seconds) {
        const d = new Date(timestamp.seconds * 1000);
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
    } catch (_) {}
    return 'Hoy';
  };

  const currentColorConfig = NOTE_COLORS.find(c => c.id === selectedColor) || NOTE_COLORS[0];

  return (
    <div className={`flex-1 flex flex-col h-full bg-slate-50/60 overflow-hidden ${isDrawer ? 'p-4' : 'p-4 sm:p-6'}`}>
      
      {/* 1. Header con métricas rápidas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 shrink-0 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-xs">
            <StickyNote size={20} className="rotate-3" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Notas Rápidas y Recordatorios
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {stats.total} notas
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Apuntes instantáneos para el administrador: stock urgente, pedidos a proveedores o encargos de clientes.
            </p>
          </div>
        </div>

        {/* Badges de resumen */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5">
            <Clock size={12} className="text-slate-500" />
            <span>Pendientes: <strong className="text-slate-900">{stats.pending}</strong></span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-semibold border border-amber-200/60 flex items-center gap-1.5">
            <Pin size={12} className="text-amber-600" />
            <span>Fijadas: <strong>{stats.pinned}</strong></span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span>Completadas: <strong>{stats.completed}</strong></span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden min-h-0">
        
        {/* 2. Columna Izquierda: Formulario Rápido y Plantillas */}
        <div className="w-full lg:w-96 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
          
          {/* Card de Creación Ultra Rápida */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-sm ${currentColorConfig.bg} ${currentColorConfig.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {editingId ? 'Editar Nota' : 'Nueva Nota Rápida'}
                </span>
              </div>
              {editingId && (
                <button 
                  onClick={resetForm}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200 cursor-pointer"
                >
                  <X size={12} /> Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleSave} onKeyDown={handleKeyDown} className="space-y-3">
              {/* Título opcional */}
              <div>
                <input 
                  type="text"
                  placeholder="Título o asunto (opcional)..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white/90 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400 placeholder:font-normal text-slate-800 shadow-2xs"
                />
              </div>

              {/* Contenido / Nota principal */}
              <div>
                <textarea 
                  ref={contentInputRef}
                  required
                  rows={3}
                  placeholder="Escribe tu apunte aquí... (ej. Llega pedido Faber-Castell a las 4pm, consultar stock de cartulinas)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white/95 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400 text-slate-800 resize-none shadow-2xs leading-relaxed"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1">
                  <span>Presiona <strong className="font-semibold text-slate-600">Ctrl + Enter</strong> para guardar</span>
                  <span>{content.length} caracteres</span>
                </div>
              </div>

              {/* Categoría y Prioridad */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Categoría
                  </label>
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as NoteCategory)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white/90 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {NOTE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Fijar al inicio
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPinned(!isPinned)}
                    className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                      isPinned 
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs' 
                        : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <Pin size={13} className={isPinned ? 'fill-white' : ''} />
                    <span>{isPinned ? 'Fijada' : 'Normal'}</span>
                  </button>
                </div>
              </div>

              {/* Selector de Color Post-It */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Color del Apunte
                </label>
                <div className="flex items-center gap-2">
                  {NOTE_COLORS.map(c => {
                    const isSelected = selectedColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColor(c.id)}
                        className={`w-7 h-7 rounded-full transition-all flex items-center justify-center border shadow-2xs cursor-pointer ${c.bg} ${c.border} ${
                          isSelected ? `ring-2 ring-offset-2 ${c.ring} scale-110` : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        title={c.name}
                      >
                        {isSelected && <Check size={12} className="text-slate-800" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón Principal Guardar */}
              <button
                type="submit"
                disabled={isSaving || (!content.trim() && !title.trim())}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Guardando...
                  </span>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingId ? 'Actualizar Nota' : 'Guardar Nota Rápida'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Plantillas Rápidas con 1 Clic */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" />
              Plantillas de 1 Clic
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => applyTemplate('stock', 'Agotado: Reponer Stock', 'yellow')}
                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200/60 text-left transition text-xs font-semibold text-amber-900 flex items-center gap-1.5 cursor-pointer"
              >
                <Package size={13} className="text-amber-600 shrink-0" />
                <span className="truncate">Stock urgente</span>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('pedido', 'Pedido a Proveedor', 'blue')}
                className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100/70 border border-sky-200/60 text-left transition text-xs font-semibold text-sky-900 flex items-center gap-1.5 cursor-pointer"
              >
                <Truck size={13} className="text-sky-600 shrink-0" />
                <span className="truncate">Pedido proveedor</span>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('cliente', 'Llamar a Cliente', 'green')}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/60 text-left transition text-xs font-semibold text-emerald-900 flex items-center gap-1.5 cursor-pointer"
              >
                <Users size={13} className="text-emerald-600 shrink-0" />
                <span className="truncate">Llamar cliente</span>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('urgente', '¡Atención Prioritaria!', 'rose')}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100/70 border border-rose-200/60 text-left transition text-xs font-semibold text-rose-900 flex items-center gap-1.5 cursor-pointer"
              >
                <Flame size={13} className="text-rose-600 shrink-0" />
                <span className="truncate">Prioritario hoy</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Columna Derecha: Barra de Filtros y Muro de Notas */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          
          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 shrink-0 pb-3 border-b border-slate-100">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input 
                type="text"
                placeholder="Buscar en notas por palabra, cliente o stock..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-8 text-xs focus:ring-2 focus:ring-brand-teal focus:outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtros de Categoría */}
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  filterCategory === 'all' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas
              </button>
              {NOTE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    filterCategory === cat.id 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.badge}
                </button>
              ))}
            </div>

            {/* Filtro de Estado */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                  filterStatus === 'pending'
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Mostrar solo pendientes"
              >
                Pendientes
              </button>
              <button
                onClick={() => setFilterStatus(filterStatus === 'pinned' ? 'all' : 'pinned')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                  filterStatus === 'pinned'
                    ? 'bg-amber-600 text-white border-amber-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Mostrar solo notas fijadas"
              >
                <Pin size={11} className="inline mr-1" /> Fijadas
              </button>
            </div>
          </div>

          {/* Listado / Malla de Notas Rápidas */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Cargando notas rápidas...</span>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/60 text-amber-600 flex items-center justify-center mb-2">
                  <StickyNote size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No hay notas en esta sección</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {searchQuery 
                    ? `No se encontraron resultados para "${searchQuery}". Intenta otra búsqueda.` 
                    : 'Usa el formulario de la izquierda para crear tu primer apunte o recordatorio.'}
                </p>
                <button
                  onClick={() => contentInputRef.current?.focus()}
                  className="mt-3 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-amber-600 transition cursor-pointer"
                >
                  <Plus size={13} className="inline mr-1" /> Redactar apunte
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-4">
                <AnimatePresence>
                  {filteredNotes.map((note) => {
                    const colorCfg = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];
                    const catCfg = NOTE_CATEGORIES.find(c => c.id === note.category) || NOTE_CATEGORIES[0];
                    const isCopied = copiedId === note.id;

                    return (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`group relative rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-md ${colorCfg.bg} ${colorCfg.border} ${
                          note.completed ? 'opacity-70 grayscale-[30%]' : ''
                        }`}
                      >
                        {/* Cabecera de la Nota */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${catCfg.colorClass}`}>
                                {catCfg.badge}
                              </span>
                              {note.pinned && (
                                <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                                  <Pin size={9} className="fill-white" /> Fijada
                                </span>
                              )}
                            </div>

                            {/* Acciones flotantes de la nota */}
                            <div className="flex items-center gap-1 opacity-90 sm:opacity-40 group-hover:opacity-100 transition-opacity">
                              {/* Botón Fijar */}
                              <button
                                onClick={() => togglePin(note.id, note.pinned)}
                                className={`p-1 rounded-lg transition cursor-pointer ${
                                  note.pinned 
                                    ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' 
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-white/70'
                                }`}
                                title={note.pinned ? 'Desfijar' : 'Fijar arriba'}
                              >
                                <Pin size={12} className={note.pinned ? 'fill-amber-600' : ''} />
                              </button>

                              {/* Botón Copiar */}
                              <button
                                onClick={() => handleCopy(note)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70 transition cursor-pointer"
                                title="Copiar texto"
                              >
                                {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              </button>

                              {/* Botón Editar */}
                              <button
                                onClick={() => handleStartEdit(note)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70 transition cursor-pointer"
                                title="Editar nota"
                              >
                                <Edit3 size={12} />
                              </button>

                              {/* Botón Eliminar */}
                              <button
                                onClick={() => {
                                  if (confirm('¿Eliminar esta nota rápida permanentemente?')) {
                                    deleteNote(note.id);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Eliminar nota"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Título de la nota */}
                          {note.title && (
                            <h4 className={`text-xs sm:text-sm font-black text-slate-900 mb-1.5 leading-snug ${
                              note.completed ? 'line-through text-slate-500' : ''
                            }`}>
                              {note.title}
                            </h4>
                          )}

                          {/* Contenido / Cuerpo de la nota */}
                          <p className={`text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans ${
                            note.completed ? 'line-through text-slate-400' : ''
                          }`}>
                            {note.content}
                          </p>
                        </div>

                        {/* Pie de Nota: Checkbox Completado y Fecha */}
                        <div className="mt-4 pt-2 border-t border-slate-900/5 flex items-center justify-between text-[10px] text-slate-500">
                          <button
                            onClick={() => toggleCompleted(note.id, note.completed)}
                            className={`flex items-center gap-1.5 font-bold transition-all px-2 py-1 rounded-lg cursor-pointer ${
                              note.completed 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-white/70 text-slate-600 hover:bg-white'
                            }`}
                          >
                            {note.completed ? (
                              <>
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>Realizado</span>
                              </>
                            ) : (
                              <>
                                <Circle size={13} className="text-slate-400" />
                                <span>Marcar como listo</span>
                              </>
                            )}
                          </button>

                          <span className="font-mono opacity-70">
                            {formatDate(note.createdAt)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
