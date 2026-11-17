import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  BookOpen, 
  Newspaper, 
  FileEdit, 
  Palette, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  ShieldCheck, 
  CheckCircle, 
  Eye, 
  MessageCircle,
  Clock,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { DigitalProduct, DigitalCategory, DIGITAL_CATEGORIES_METADATA } from '../services/digitalService';
import { DigitalProductModal } from './DigitalProductModal';

interface DigitalCatalogProps {
  products: DigitalProduct[];
  loading?: boolean;
}

export const DigitalCatalog: React.FC<DigitalCatalogProps> = ({ products, loading = false }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);
    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [products]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 280;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const categories = [
    { 
      id: 'todos', 
      label: 'Todo el Catálogo', 
      icon: Sparkles, 
      count: products.length,
      activeBg: 'bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600',
      iconColor: 'text-amber-300'
    },
    { 
      id: 'cuadernos_trabajo', 
      label: 'Cuadernos de Trabajo', 
      icon: FileEdit, 
      count: products.filter(p => p.category === 'cuadernos_trabajo').length,
      activeBg: 'bg-gradient-to-r from-cyan-600 to-blue-600',
      iconColor: 'text-cyan-300'
    },
    { 
      id: 'para_colorear', 
      label: 'Para Colorear', 
      icon: Palette, 
      count: products.filter(p => p.category === 'para_colorear').length,
      activeBg: 'bg-gradient-to-r from-rose-500 to-pink-600',
      iconColor: 'text-pink-300'
    },
    { 
      id: 'libros', 
      label: 'Libros Digitales', 
      icon: BookOpen, 
      count: products.filter(p => p.category === 'libros').length,
      activeBg: 'bg-gradient-to-r from-indigo-600 to-purple-600',
      iconColor: 'text-indigo-300'
    },
    { 
      id: 'revistas', 
      label: 'Revistas Educativas', 
      icon: Newspaper, 
      count: products.filter(p => p.category === 'revistas').length,
      activeBg: 'bg-gradient-to-r from-emerald-600 to-teal-600',
      iconColor: 'text-emerald-300'
    },
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const titleMatch = (item.title || '').toLowerCase().includes(term);
      const descMatch = (item.description || '').toLowerCase().includes(term);
      const audienceMatch = (item.targetAudience || '').toLowerCase().includes(term);
      const tagsMatch = item.tags?.some(tag => tag.toLowerCase().includes(term));
      return titleMatch || descMatch || audienceMatch || tagsMatch;
    });
  }, [products, selectedCategory, searchTerm]);

  return (
    <section id="digitales" className="py-16 sm:py-24 bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 text-white relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-teal/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-7xl">
        {/* Cabecera Hero de Digitales El Estudiante */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-teal/20 text-teal-300 border border-brand-teal/40 text-xs sm:text-sm font-black uppercase tracking-wider mb-4 shadow-lg shadow-teal-900/40"
          >
            <Sparkles size={16} />
            Lanzamiento Exclusivo · 100% Original
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-tight"
          >
            Digitales <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-200 to-amber-300">El Estudiante</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-300 text-sm sm:text-base lg:text-lg mt-4 leading-relaxed font-normal"
          >
            Nuestra colección propia de <strong>Libros, Revistas, Cuadernos de Trabajo y Cuadernos para Colorear</strong> en alta resolución. Adquiérelos al instante, imprímelos en casa en hojas A4 y acompaña el aprendizaje de tus hijos y alumnos.
          </motion.p>

          {/* 3 Pilares Destacados */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-8 text-left">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                <Printer size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-white">Listo para Imprimir A4</p>
                <p className="text-[11px] text-slate-400">Márgenes y trazos adaptados a cualquier impresora</p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-white">100% Autoría Original</p>
                <p className="text-[11px] text-slate-400">Contenido educativo exclusivo de Librería El Estudiante</p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Download size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-white">Descarga Inmediata</p>
                <p className="text-[11px] text-slate-400">Pagas por Yape/Plin y recibes tu enlace seguro al instante</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Filtros, Categorías y Búsqueda de Última Generación */}
        <div className="mb-10 space-y-3.5">
          {/* Fila Principal: Dock de Categorías con Controles de Desplazamiento y Búsqueda */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
            
            {/* Dock de Desplazamiento Horizontal de Categorías */}
            <div className="relative flex-1 min-w-0">
              {/* Contenedor Glassmorphism para la barra de desplazamiento */}
              <div className="relative rounded-2xl sm:rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 p-1.5 sm:p-2 shadow-2xl shadow-black/50 overflow-hidden">
                
                {/* Botón flotante de navegación izquierda con gradiente */}
                {canScrollLeft && (
                  <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pl-1.5 pr-6 bg-gradient-to-r from-slate-900 via-slate-900/95 to-transparent transition-opacity">
                    <button
                      onClick={() => handleScroll('left')}
                      title="Desplazar a la izquierda"
                      aria-label="Desplazar a la izquierda"
                      className="w-8 h-8 rounded-full bg-slate-800/90 border border-teal-500/40 text-teal-300 hover:text-white hover:bg-teal-600 hover:border-teal-400 flex items-center justify-center shadow-lg shadow-teal-950/80 transition-all cursor-pointer active:scale-95"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </div>
                )}

                {/* Lista de Categorías con Scrollbar Ultra Moderna */}
                <div
                  ref={scrollContainerRef}
                  className="flex items-center gap-2 overflow-x-auto pb-2.5 pt-1 px-1.5 digital-category-scrollbar select-none"
                >
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`group relative px-4 py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shrink-0 transition-all duration-300 cursor-pointer ${
                          isActive
                            ? `${cat.activeBg} text-white shadow-lg shadow-teal-500/25 border border-white/20 scale-[1.02]`
                            : 'bg-slate-800/60 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/60 hover:border-teal-500/40 hover:shadow-md'
                        }`}
                      >
                        <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : cat.iconColor}`}>
                          <Icon size={17} />
                        </span>
                        
                        <span className="tracking-wide whitespace-nowrap">{cat.label}</span>
                        
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                            isActive
                              ? 'bg-white/25 text-white shadow-xs ring-1 ring-white/30'
                              : 'bg-slate-700/80 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                          }`}
                        >
                          {cat.count}
                        </span>

                        {isActive && (
                          <motion.div
                            layoutId="activeGlow"
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-teal-300 shadow-[0_0_10px_#2dd4bf]"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Botón flotante de navegación derecha con gradiente */}
                {canScrollRight && (
                  <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pr-1.5 pl-6 bg-gradient-to-l from-slate-900 via-slate-900/95 to-transparent transition-opacity">
                    <button
                      onClick={() => handleScroll('right')}
                      title="Desplazar a la derecha"
                      aria-label="Desplazar a la derecha"
                      className="w-8 h-8 rounded-full bg-slate-800/90 border border-teal-500/40 text-teal-300 hover:text-white hover:bg-teal-600 hover:border-teal-400 flex items-center justify-center shadow-lg shadow-teal-950/80 transition-all cursor-pointer active:scale-95"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Input de Búsqueda Moderno */}
            <div className="relative w-full lg:w-80 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Buscar títulos, temas, grados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-3 rounded-2xl bg-slate-900/80 backdrop-blur-xl text-white placeholder-slate-400 text-xs sm:text-sm border border-white/10 hover:border-teal-500/40 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 focus:outline-none transition-all shadow-xl shadow-black/40"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Sub-barra informativa de estado del filtro activo */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-teal-300 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                {categories.find(c => c.id === selectedCategory)?.label}
              </span>
              <span>·</span>
              <span>
                Mostrando <strong className="text-white">{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'material disponible' : 'materiales disponibles'}
              </span>
              {searchTerm && (
                <span className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded-md border border-slate-700">
                  Filtro: "{searchTerm}"
                </span>
              )}
            </div>

            {(selectedCategory !== 'todos' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedCategory('todos');
                  setSearchTerm('');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 hover:underline cursor-pointer transition-colors"
              >
                <RotateCcw size={12} />
                <span>Restablecer filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid de Productos Digitales */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-96 rounded-3xl bg-slate-800/40 animate-pulse border border-slate-700/40" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700 max-w-md mx-auto">
            <BookOpen size={48} className="mx-auto text-slate-500 mb-3" />
            <h3 className="text-base font-bold text-white">No se encontraron productos digitales</h3>
            <p className="text-xs text-slate-400 mt-1">Prueba con otra palabra clave o selecciona otra categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredProducts.map((item) => {
              const currentPrice = item.offerPrice !== undefined && item.offerPrice !== null && item.offerPrice > 0 
                ? item.offerPrice 
                : item.price;
              const hasDiscount = Boolean(item.offerPrice && item.offerPrice < item.price);
              const meta = DIGITAL_CATEGORIES_METADATA[item.category] || {
                label: item.category,
                badge: 'Digital'
              };

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="group bg-slate-850/90 rounded-3xl border border-slate-700/70 hover:border-brand-teal/80 transition-all duration-300 overflow-hidden flex flex-col shadow-xl hover:shadow-2xl hover:shadow-teal-950/40 flex-1"
                >
                  {/* Portada y Preview */}
                  <div 
                    className="relative aspect-[4/3] sm:aspect-[16/11] overflow-hidden bg-slate-900 cursor-pointer"
                    onClick={() => setSelectedProduct(item)}
                  >
                    <img 
                      src={item.coverUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                    {/* Insignia de categoría y originalidad */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900/90 text-teal-300 border border-teal-500/40 backdrop-blur-xs flex items-center gap-1">
                        <Sparkles size={11} />
                        Original El Estudiante
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-black/60 text-slate-300 backdrop-blur-xs">
                        {meta.label}
                      </span>
                    </div>

                    {/* Badge de Descuento */}
                    {hasDiscount && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-lg animate-pulse">
                        Ahorra {Math.round(((item.price - currentPrice) / item.price) * 100)}%
                      </span>
                    )}

                    {/* Botón flotante Vista Previa en hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(item);
                        }}
                        className="px-4 py-2 rounded-2xl bg-brand-teal text-white font-bold text-xs flex items-center gap-2 shadow-2xl shadow-teal-900/80 hover:bg-teal-600 transition-all cursor-pointer transform hover:scale-105"
                      >
                        <Eye size={15} /> Ver Muestra & Detalles
                      </button>
                    </div>

                    {/* Ficha rápida al pie de imagen */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white/90">
                      <span className="flex items-center gap-1 font-medium bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                        <Printer size={12} className="text-teal-400" />
                        {item.pages ? `${item.pages} páginas A4` : 'Formato A4'}
                      </span>
                      {item.targetAudience && (
                        <span className="truncate max-w-[140px] text-[10px] text-slate-300 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          {item.targetAudience}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo de la tarjeta */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 
                        onClick={() => setSelectedProduct(item)}
                        className="text-base sm:text-lg font-black text-white leading-tight group-hover:text-teal-300 transition-colors cursor-pointer line-clamp-2"
                      >
                        {item.title}
                      </h3>
                      <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="text-[10px] font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Precio y CTA */}
                    <div className="pt-3 border-t border-slate-750 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Precio de Descarga
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl sm:text-2xl font-black text-white">
                            S/ {currentPrice.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-slate-500 line-through font-bold">
                              S/ {item.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedProduct(item)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-brand-teal text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer group-hover:shadow-md"
                      >
                        <span>Detalles</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Banner Informativo Inferior */}
        <div className="mt-16 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-amber-950/40 border border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <h4 className="text-lg sm:text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <Sparkles size={20} className="text-amber-400" />
              ¿Eres profesor o institución en Puquio?
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Ofrecemos paquetes de licencias para aulas completas y material escolar personalizado con el membrete de tu colegio.
            </p>
          </div>
          <a
            href="https://wa.me/51953366458?text=Hola%20Librer%C3%ADa%20El%20Estudiante,%20deseo%20consultar%20sobre%20paquetes%20de%20materiales%20digitales%20para%20mi%20colegio/aula."
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3.5 rounded-2xl bg-brand-teal hover:bg-teal-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-teal-950/60 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <MessageCircle size={18} />
            Consultar Paquetes Docentes
          </a>
        </div>
      </div>

      {/* Modal de Detalle y Vista Previa */}
      <DigitalProductModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
    </section>
  );
};
