import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  User, 
  X, 
  Save, 
  Calendar, 
  Tag, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Compass,
  FileCheck2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Debtor, useDebtors } from '../hooks/useDebtors';
import { DebtorService } from '../services/debtorService';
import { Product } from '../hooks/useProducts';

interface DebtorManagerProps {
  products?: Product[];
}

export const DebtorManager: React.FC<DebtorManagerProps> = ({ products = [] }) => {
  const { debtors, loading, error } = useDebtors();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendiente' | 'Pagado' | 'Vencido'>('Todos');
  const [editingDebtor, setEditingDebtor] = useState<Partial<Debtor> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Sorting and advanced date filtering states
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount-desc' | 'amount-asc'>('newest');
  const [datePeriod, setDatePeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  // Clean products list for quick picker
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Filtered list with sorting and period constraints
  const filteredDebtors = debtors.filter(d => {
    const matchesSearch = 
      (d.apellidosNombres || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.observacion || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'Todos' || d.estado === statusFilter;

    let matchesPeriod = true;
    if (datePeriod !== 'all') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (datePeriod === 'today') {
        matchesPeriod = d.fecha === todayStr;
      } else if (datePeriod === 'week') {
        const itemTime = new Date(d.fecha).getTime();
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        matchesPeriod = itemTime >= oneWeekAgo;
      } else if (datePeriod === 'month') {
        const itemYearMonth = d.fecha.substring(0, 7); // "YYYY-MM"
        const currentYearMonth = todayStr.substring(0, 7);
        matchesPeriod = itemYearMonth === currentYearMonth;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPeriod;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return b.fecha.localeCompare(a.fecha);
    } else if (sortBy === 'oldest') {
      return a.fecha.localeCompare(b.fecha);
    } else if (sortBy === 'amount-desc') {
      return Number(b.precio || 0) - Number(a.precio || 0);
    } else if (sortBy === 'amount-asc') {
      return Number(a.precio || 0) - Number(b.precio || 0);
    }
    return 0;
  });

  // Calculate statistics
  const totalPendiente = debtors
    .filter(d => d.estado === 'Pendiente')
    .reduce((sum, d) => sum + Number(d.precio || 0), 0);

  const totalPagado = debtors
    .filter(d => d.estado === 'Pagado')
    .reduce((sum, d) => sum + Number(d.precio || 0), 0);

  const totalVencido = debtors
    .filter(d => d.estado === 'Vencido')
    .reduce((sum, d) => sum + Number(d.precio || 0), 0);

  const totalGeneral = totalPendiente + totalVencido;

  // Save or update debtor
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebtor?.apellidosNombres) {
      alert("El nombre de la persona deudora es obligatorio.");
      return;
    }
    if (!editingDebtor?.fecha) {
      alert("La fecha de entrega es obligatoria.");
      return;
    }
    if (!editingDebtor?.producto) {
      alert("El producto entregado es obligatorio.");
      return;
    }
    if (editingDebtor?.precio === undefined || editingDebtor.precio < 0) {
      alert("El precio debe ser un número igual o mayor a cero.");
      return;
    }

    setIsSaving(true);
    try {
      await DebtorService.saveDebtor(editingDebtor);
      setEditingDebtor(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el registro de deudor.");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick State change (Mark paid/pending)
  const handleQuickStatusChange = async (debtor: Debtor, newStatus: 'Pendiente' | 'Pagado' | 'Vencido') => {
    try {
      const updated = { ...debtor, estado: newStatus };
      await DebtorService.saveDebtor(updated);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el estado de la deuda.");
    }
  };

  // Delete debtor
  const handleDelete = async (id: string) => {
    if (confirm("¿Está seguro de eliminar este registro de deuda del sistema?")) {
      try {
        await DebtorService.deleteDebtor(id);
      } catch (err) {
        console.error(err);
        alert("Error al eliminar el registro.");
      }
    }
  };

  const openAddForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingDebtor({
      apellidosNombres: '',
      fecha: today,
      producto: '',
      precio: 0,
      estado: 'Pendiente',
      observacion: ''
    });
    setProductSearch('');
    setShowForm(true);
  };

  const openEditForm = (debtor: Debtor) => {
    setEditingDebtor(debtor);
    setProductSearch(debtor.producto);
    setShowForm(true);
  };

  const handleSelectProduct = (p: Product) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isOfferExpired = p.isOffer && p.offerExpiryDate ? p.offerExpiryDate < todayStr : false;
    const isOfferActive = p.isOffer && !isOfferExpired;
    setEditingDebtor(prev => ({
      ...prev,
      producto: p.name,
      precio: p.offerPrice && isOfferActive ? p.offerPrice : p.price
    }));
    setProductSearch(p.name);
    setShowProductDropdown(false);
  };

  // Safe product items filtering for autocomplete
  const filteredCatalogProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="flex-1 flex flex-col h-[60vh] md:h-[65vh] overflow-hidden">
      {/* 1. Header KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0 px-1">
        <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-600 block leading-tight uppercase tracking-wider">Por Cobrar (Pendiente)</span>
            <span className="text-sm font-black text-slate-800 font-mono">S/ {totalPendiente.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-600 block leading-tight uppercase tracking-wider">Cobrado (Pagado)</span>
            <span className="text-sm font-black text-slate-800 font-mono">S/ {totalPagado.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-rose-600 block leading-tight uppercase tracking-wider">Crédito Vencido</span>
            <span className="text-sm font-black text-slate-800 font-mono">S/ {totalVencido.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-900 rounded-2xl p-3 flex items-center gap-3 text-white">
          <div className="w-9 h-9 rounded-xl bg-white/10 text-amber-400 flex items-center justify-center shrink-0">
            <DollarSign size={16} />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block leading-tight uppercase tracking-wider">Cartera de Deuda Total</span>
            <span className="text-sm font-black font-mono">S/ {totalGeneral.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar */}
      <div className="flex flex-col xl:flex-row gap-3 py-3 border-b border-slate-100 items-start xl:items-center justify-between shrink-0 px-1">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full xl:max-w-[80%]">
          {/* Searching input */}
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              value={searchTerm}
              placeholder="Buscar deudor u observación..." 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-14 py-2 text-xs font-sans outline-none focus:border-brand-teal focus:bg-white transition-all text-slate-800"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-700 font-sans"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Estado dynamic badges switches */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-150 shrink-0">
            {(['Todos', 'Pendiente', 'Pagado', 'Vencido'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Date Period Filter */}
          <div className="shrink-0">
            <select
              value={datePeriod}
              onChange={(e) => setDatePeriod(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 outline-none focus:border-brand-teal cursor-pointer transition-all"
            >
              <option value="all">📅 Todos los períodos</option>
              <option value="today">📅 Deudores - Hoy</option>
              <option value="week">📅 Deudores - Últimos 7 días</option>
              <option value="month">📅 Deudores - Este mes</option>
            </select>
          </div>

          {/* Sorter Filter */}
          <div className="shrink-0 border-slate-200">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 outline-none focus:border-brand-teal cursor-pointer transition-all"
            >
              <option value="newest">⌛ Más nuevos primero</option>
              <option value="oldest">⌛ Más antiguos primero</option>
              <option value="amount-desc">💸 S/ Mayor deuda</option>
              <option value="amount-asc">💸 S/ Menor deuda</option>
            </select>
          </div>
        </div>

        <button
          onClick={openAddForm}
          className="w-full xl:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
        >
          <Plus size={14} />
          Entregar Mercadería
        </button>
      </div>

      {/* 3. Grid representation */}
      <div className="flex-1 overflow-y-auto py-3 min-h-0 pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 py-8">
            <div className="w-8 h-8 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-3 font-semibold font-sans">Cargando registros de créditos...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-650 p-4 rounded-2xl text-xs font-semibold text-center mt-4">
            {error}
          </div>
        ) : filteredDebtors.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 mt-2">
            <Compass size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-bold text-sm">No se encontraron deudores</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
              {searchTerm || statusFilter !== 'Todos'
                ? "Prueba cambiando el filtro de estado o la clave de búsqueda."
                : "No hay registros de mercadería entregada a crédito todavía."}
            </p>
            {!searchTerm && statusFilter === 'Todos' && (
              <button
                onClick={openAddForm}
                className="mt-4 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/15 px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-colors"
              >
                Agregar Primer Deudor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredDebtors.map((debtor) => {
              // Format date cleanly
              const parts = debtor.fecha.split('-');
              const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : debtor.fecha;

              return (
                <div 
                  key={debtor.id}
                  className={`border rounded-2xl p-3.5 bg-white transition-all flex flex-col justify-between relative shadow-xs hover:shadow-md ${
                    debtor.estado === 'Pagado'
                      ? 'border-emerald-100 hover:border-emerald-250 bg-emerald-50/10'
                      : debtor.estado === 'Vencido'
                      ? 'border-rose-100 hover:border-rose-250 bg-rose-50/10'
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 rounded">
                            {formattedDate}
                          </span>
                          {debtor.estado === 'Pagado' ? (
                            <span className="inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-sm">
                              Pagado
                            </span>
                          ) : debtor.estado === 'Vencido' ? (
                            <span className="inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 rounded-sm">
                              Vencido
                            </span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-amber-150 text-amber-800 rounded-sm">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <h4 className="text-[13px] font-black text-slate-900 tracking-tight mt-1.5 font-sans leading-snug truncate" title={debtor.apellidosNombres}>
                          {debtor.apellidosNombres}
                        </h4>
                      </div>

                      <div className="flex gap-0.5 shrink-0">
                        <button 
                          onClick={() => openEditForm(debtor)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                          title="Editar Registro"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button 
                          onClick={() => handleDelete(debtor.id)}
                          className="p-1 text-rose-450 hover:text-rose-700 hover:bg-rose-50/50 rounded-lg transition-all cursor-pointer"
                          title="Eliminar Registro"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Middle specs */}
                    <div className="mt-2.5 pb-2 border-b border-dashed border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Producto Entregado:</span>
                      <p className="text-xs font-semibold text-slate-700 truncate-two-lines mt-0.5">
                        {debtor.producto}
                      </p>
                    </div>

                    {/* Balance */}
                    <div className="flex justify-between items-center mt-2.5">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Monto a Crédito:</span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        S/ {Number(debtor.precio || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Observacion details */}
                    {debtor.observacion && (
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-medium leading-relaxed max-h-16 overflow-y-auto">
                        <span className="font-bold text-slate-700 block mb-0.5">📝 Obs:</span>
                        {debtor.observacion}
                      </div>
                    )}
                  </div>

                  {/* Body Quick Status Toggles */}
                  <div className="mt-3.5 pt-2 border-t border-slate-50 grid grid-cols-2 gap-1.5 shrink-0 w-full">
                    {debtor.estado !== 'Pagado' ? (
                      <button 
                        onClick={() => handleQuickStatusChange(debtor, 'Pagado')}
                        className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 text-emerald-850 hover:bg-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer select-none"
                      >
                        <CheckCircle size={11} />
                        Marcar como Pagado
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleQuickStatusChange(debtor, 'Pendiente')}
                        className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer select-none"
                      >
                        <RotateCcw size={11} />
                        Revertir a Pendiente
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Form Drawer Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-end p-0 bg-slate-900/40 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setShowForm(false)}></div>
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col p-6 z-10"
            >
              {/* Form Heading */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <User size={15} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingDebtor?.id ? 'Editar Registro de Créditos' : 'Registrar Mercadería a Crédito'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Input Forms */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-0 relative">
                {/* 1. Names */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                    Apellidos y Nombres *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editingDebtor?.apellidosNombres || ''} 
                    onChange={e => setEditingDebtor(prev => ({ ...prev, apellidosNombres: e.target.value }))}
                    placeholder="Ej. Quispe Rojas, Maria Isabel"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-800 font-medium"
                  />
                </div>

                {/* 2. Date */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                    Fecha de Entrega *
                  </label>
                  <div className="relative">
                    <input 
                      type="date" 
                      required
                      value={editingDebtor?.fecha || ''} 
                      onChange={e => setEditingDebtor(prev => ({ ...prev, fecha: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-brand-teal transition-colors text-slate-800"
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>

                {/* 3. Product delivery autocomplete helper */}
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                    Producto Entregado *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={productSearch} 
                    onChange={e => {
                      setProductSearch(e.target.value);
                      setEditingDebtor(prev => ({ ...prev, producto: e.target.value }));
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Buscar en inventario o escribir producto..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-850 font-medium"
                  />
                  <Tag className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />

                  {/* Autocomplete Dropdown list */}
                  {showProductDropdown && productSearch.trim().length > 0 && filteredCatalogProducts.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden text-xs max-h-48 overflow-y-auto">
                      <div className="bg-slate-50 px-3 py-1 font-bold text-[9px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Sugerencias de Inventario del Catálogo
                      </div>
                      {filteredCatalogProducts.map(p => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isOfferExpired = p.isOffer && p.offerExpiryDate ? p.offerExpiryDate < todayStr : false;
                        const isOfferActive = p.isOffer && !isOfferExpired;
                        const actualPrice = p.offerPrice && isOfferActive ? p.offerPrice : p.price;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="px-4 py-2 hover:bg-teal-50/50 cursor-pointer border-b border-slate-50 flex justify-between items-center transition-colors"
                          >
                            <span className="font-semibold text-slate-700 truncate mr-2" title={p.name}>
                              {p.name}
                            </span>
                            <span className="font-mono text-slate-900 font-bold shrink-0">
                              S/ {actualPrice.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {showProductDropdown && (
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowProductDropdown(false)}
                    ></div>
                  )}
                </div>

                {/* 4. Price */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                    Precio de Deuda S/ *
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    required
                    value={editingDebtor?.precio === 0 ? '' : editingDebtor?.precio} 
                    onChange={e => setEditingDebtor(prev => ({ ...prev, precio: Number(e.target.value) }))}
                    placeholder="0.00"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-brand-teal transition-colors text-slate-800 font-bold"
                  />
                </div>

                {/* 5. Status Badge Selection */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1.5">
                    Estado Actual *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Pendiente', 'Pagado', 'Vencido'] as const).map(badge => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => setEditingDebtor(prev => ({ ...prev, estado: badge }))}
                        className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                          editingDebtor?.estado === badge
                            ? badge === 'Pagado'
                              ? 'bg-emerald-555 border-emerald-555 text-white'
                              : badge === 'Vencido'
                              ? 'bg-rose-500 border-rose-500 text-white'
                              : 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Observaciones */}
                <div>
                  <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest block mb-1">
                    Observaciones / Comentarios Adicionales
                  </label>
                  <textarea 
                    rows={3}
                    value={editingDebtor?.observacion || ''} 
                    onChange={e => setEditingDebtor(prev => ({ ...prev, observacion: e.target.value }))}
                    placeholder="Escribe detalles del acuerdo de pago (ej: pagará este sábado, tarjeta de crédito, etc.)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-sans outline-none focus:border-brand-teal transition-colors text-slate-850 resize-none font-medium text-slate-800"
                  />
                </div>
              </form>

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-slate-900/10"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={14} />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
