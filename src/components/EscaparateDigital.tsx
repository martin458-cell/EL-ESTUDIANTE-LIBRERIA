import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Package,
  Pause,
  Play,
  Shuffle,
  ShoppingBag,
  Smartphone,
  Star,
  Calendar,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../hooks/useProducts';
import { normalizeProductImageUrl, handleImageError } from '../utils/imageUtils';

const CATEGORY_LABELS: Record<string, string> = {
  libros: 'Libros',
  utiles: 'Útiles',
  tecnologia: 'Tecnología'
};

function formatCategoryLabel(category?: string): string {
  const key = (category || '').toLowerCase().trim();
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  if (!key) return 'Catálogo';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Construye una lista con TODOS los productos alternando de forma aleatoria
 * entre las tres categorías principales (libros, utiles, tecnologia) y
 * cualquier otra categoría existente para que nunca falte un producto ni se
 * repita la misma categoría de forma consecutiva mientras haya variedad.
 */
function buildAlternatingRandomPlaylist(products: Product[]): Product[] {
  if (!products || products.length === 0) return [];

  const buckets: Record<string, Product[]> = {};
  for (const product of products) {
    const catKey = (product.category || 'otros').toLowerCase().trim() || 'otros';
    if (!buckets[catKey]) {
      buckets[catKey] = [];
    }
    buckets[catKey].push(product);
  }

  for (const key of Object.keys(buckets)) {
    buckets[key] = shuffleArray(buckets[key]);
  }

  const result: Product[] = [];
  let lastCategory: string | null = null;

  while (true) {
    const activeCategories = Object.keys(buckets).filter((k) => buckets[k].length > 0);
    if (activeCategories.length === 0) break;

    const roundOrder = shuffleArray(activeCategories);

    // Evita que la primera categoría de la nueva ronda coincida con la última de la ronda anterior
    if (roundOrder.length > 1 && lastCategory && roundOrder[0] === lastCategory) {
      const swapIndex = 1 + Math.floor(Math.random() * (roundOrder.length - 1));
      [roundOrder[0], roundOrder[swapIndex]] = [roundOrder[swapIndex], roundOrder[0]];
    }

    for (const cat of roundOrder) {
      const nextItem = buckets[cat].pop();
      if (nextItem) {
        result.push(nextItem);
        lastCategory = cat;
      }
    }
  }

  return result;
}

function isProductOfferValid(product: Product): boolean {
  if (!product.isOffer || !product.offerPrice || product.offerPrice <= 0 || product.offerPrice >= product.price) {
    return false;
  }
  if (!product.offerExpiryDate) return true;
  const todayStr = new Date().toISOString().split('T')[0];
  return product.offerExpiryDate >= todayStr;
}

interface EscaparateDigitalProps {
  products: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const EscaparateDigital: React.FC<EscaparateDigitalProps> = ({ products, onSelectProduct }) => {
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Construye el orden aleatorio alternado por categoría con TODOS los productos
  const playlist = useMemo(() => {
    return buildAlternatingRandomPlaylist(products);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, shuffleSeed]);

  // Ajustar índice si cambia el tamaño de la lista
  useEffect(() => {
    if (playlist.length > 0 && index >= playlist.length) {
      setIndex(0);
    }
  }, [playlist.length, index]);

  const handleNext = useCallback(() => {
    if (playlist.length <= 1) return;
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= playlist.length) {
        // Al completar todos los productos, vuelve a mezclar aleatoriamente alternando categorías
        setShuffleSeed((s) => s + 1);
        return 0;
      }
      return next;
    });
  }, [playlist.length]);

  const handlePrev = useCallback(() => {
    if (playlist.length <= 1) return;
    setIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  const handleReshuffle = useCallback(() => {
    setShuffleSeed((s) => s + 1);
    setIndex(0);
  }, []);

  // Rotación automática
  useEffect(() => {
    if (!isPlaying || playlist.length <= 1) return;
    const intervalMs = isFullscreen ? 6500 : 5000;
    const timer = setInterval(handleNext, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, isFullscreen, playlist.length, handleNext]);

  // Bloqueo de scroll en body y atajos de teclado cuando está en pantalla completa
  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, handleNext, handlePrev]);

  // Sincronización opcional con la Fullscreen API nativa del navegador
  const enterFullscreen = async () => {
    setIsFullscreen(true);
    try {
      const target = document.documentElement;
      if (target && target.requestFullscreen && !document.fullscreenElement) {
        await target.requestFullscreen();
      }
    } catch {
      // Fallback silencioso cuando se ejecuta dentro de iframe con permisos restringidos
    }
  };

  const exitFullscreen = async () => {
    setIsFullscreen(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignorar si ya no está en fullscreen nativo
    }
  };

  useEffect(() => {
    const onNativeFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // Si el navegador salió de fullscreen nativo mediante Esc, cerramos también el modo
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onNativeFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onNativeFullscreenChange);
  }, [isFullscreen]);

  if (playlist.length === 0) {
    return (
      <div className="bg-slate-100 rounded-[2.5rem] w-full aspect-[4/3] flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-200">
        <Package size={48} className="animate-pulse text-brand-teal/60" />
        <p className="text-xs font-medium text-slate-500">Cargando Escaparate Digital...</p>
      </div>
    );
  }

  const current = playlist[index] || playlist[0];
  const hasValidOffer = isProductOfferValid(current);
  const displayPrice = hasValidOffer ? current.offerPrice! : current.price;
  const discountPct = hasValidOffer
    ? Math.round((1 - current.offerPrice! / current.price) * 100)
    : 0;
  const categoryLabel = formatCategoryLabel(current.category);
  const progressPct = ((index + 1) / playlist.length) * 100;

  // Próximos 4 productos para la tira inferior en pantalla completa
  const upcomingItems = Array.from({ length: Math.min(4, Math.max(0, playlist.length - 1)) }, (_, offset) => {
    const targetIdx = (index + 1 + offset) % playlist.length;
    return { item: playlist[targetIdx], targetIdx };
  });

  return (
    <>
      {/* Tarjeta Inline del Escaparate Digital en el Hero */}
      <div className="relative group perspective-1000">
        <div className="bg-white p-4 sm:p-5 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
          {/* Barra superior de control del Escaparate */}
          <div className="flex items-center justify-between gap-2 px-1 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center shrink-0">
                <Calendar size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap truncate">
                  Escaparate Digital
                </p>
                <p className="text-[11px] text-slate-500 font-medium tabular-nums whitespace-nowrap">
                  {index + 1} / {playlist.length} · {categoryLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleReshuffle}
                title="Mezclar orden aleatorio"
                aria-label="Mezclar productos aleatoriamente"
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-brand-teal border border-slate-200/80 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Shuffle size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                title={isPlaying ? 'Pausar rotación' : 'Reanudar rotación'}
                aria-label={isPlaying ? 'Pausar rotación' : 'Reanudar rotación'}
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-brand-teal border border-slate-200/80 flex items-center justify-center transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button
                type="button"
                onClick={enterFullscreen}
                title="Ver Escaparate Digital en Pantalla Completa"
                aria-label="Ver en pantalla completa"
                className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-brand-teal text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              >
                <Maximize2 size={14} />
                <span className="hidden sm:inline">Pantalla completa</span>
              </button>
            </div>
          </div>

          {/* Escenario del Producto Actual */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${current.id}-${index}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div
                onClick={() => onSelectProduct?.(current)}
                className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-slate-50 cursor-pointer group/stage"
              >
                <img
                  src={normalizeProductImageUrl(current.imageUrl, current.category, current.id)}
                  alt={current.name}
                  className="w-full h-full object-contain p-5 transition-transform duration-500 group-hover/stage:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, current.category, current.id)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Etiqueta única superior derecha */}
                {hasValidOffer ? (
                  <div className="absolute top-3.5 right-3.5 bg-brand-orange text-white text-[11px] font-bold px-3 py-1 rounded-lg shadow-md tabular-nums">
                    -{discountPct}% Oferta
                  </div>
                ) : current.featured ? (
                  <div className="absolute top-3.5 right-3.5 bg-amber-400 text-slate-900 text-[11px] font-bold px-3 py-1 rounded-lg shadow-md flex items-center gap-1.5">
                    <Star size={12} fill="currentColor" /> Novedad
                  </div>
                ) : null}

                {/* Información sobre gradiente inferior */}
                <div className="absolute bottom-4 left-5 right-5 text-left">
                  <p className="text-teal-300 text-xs font-semibold tracking-wide mb-1">
                    {categoryLabel}
                    {current.authorOrBrand ? ` · ${current.authorOrBrand}` : ''}
                  </p>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-white leading-snug line-clamp-2 drop-shadow-sm">
                    {current.name}
                  </h3>
                </div>
              </div>

              {/* Pie de precio y acción */}
              <div className="mt-4 flex gap-3 items-center justify-between px-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Producto anterior"
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-brand-teal flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Siguiente producto"
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-brand-teal flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <ChevronRight size={18} />
                  </button>
                  {onSelectProduct && (
                    <button
                      type="button"
                      onClick={() => onSelectProduct(current)}
                      className="h-9 px-3 rounded-xl bg-teal-50 hover:bg-brand-teal text-brand-teal hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Eye size={14} />
                      <span className="hidden xs:inline">Ver detalle</span>
                    </button>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[11px] font-semibold text-slate-400">
                    {current.stock > 0 ? `${current.stock} disponibles` : 'Consultar stock'}
                  </p>
                  <div className="flex items-baseline justify-end gap-2 tabular-nums">
                    {hasValidOffer && (
                      <span className="text-xs text-slate-400 line-through">
                        S/ {current.price.toFixed(2)}
                      </span>
                    )}
                    <p className="text-2xl font-display font-bold text-slate-900">
                      {displayPrice.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Barra de progreso del catálogo completo */}
          <div className="mt-4 px-1">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-teal rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vista Inmersiva en Pantalla Completa */}
      {isFullscreen &&
        createPortal(
          <div
            ref={fullscreenContainerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Escaparate Digital en Pantalla Completa"
            className="fixed inset-0 z-[120] bg-slate-950 text-white flex flex-col justify-between overflow-y-auto"
          >
            {/* Zona Superior: Barra de 3 zonas */}
            <header className="flex flex-wrap items-center justify-between gap-4 px-5 sm:px-8 py-4 border-b border-white/10 bg-slate-950/90 backdrop-blur-md shrink-0">
              {/* Zona 1: Marca */}
              <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
                <img src="/logo.svg" alt="Librería El Estudiante" className="h-8 w-auto object-contain" />
                <span className="font-display font-bold text-base sm:text-lg tracking-tight text-white">
                  Escaparate Digital
                </span>
              </div>

              {/* Zona 2: Progreso e información de alternancia */}
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 tabular-nums whitespace-nowrap">
                <span className="font-semibold text-white">
                  {index + 1} / {playlist.length}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="hidden md:inline text-slate-400">
                  Alternancia aleatoria: Libros · Útiles · Tecnología
                </span>
                <span className="md:hidden text-teal-300 font-medium">{categoryLabel}</span>
              </div>

              {/* Zona 3: Controles de reproducción y salida */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleReshuffle}
                  className="h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Shuffle size={15} />
                  <span className="hidden sm:inline">Mezclar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                  <span className="hidden sm:inline">{isPlaying ? 'Pausar' : 'Reanudar'}</span>
                </button>
                <button
                  type="button"
                  onClick={exitFullscreen}
                  className="h-10 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Minimize2 size={15} />
                  <span>Salir</span>
                </button>
              </div>
            </header>

            {/* Zona Central: Escenario de Producto en 2 Columnas */}
            <main className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-6 min-h-0">
              <div className="w-full max-w-6xl mx-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`fs-${current.id}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch"
                  >
                    {/* Columna Imagen */}
                    <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-10 flex items-center justify-center relative min-h-[280px] sm:min-h-[380px] lg:min-h-[460px] shadow-2xl">
                      <img
                        src={normalizeProductImageUrl(current.imageUrl, current.category, current.id)}
                        alt={current.name}
                        className="w-full h-full max-h-[420px] object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageError(e, current.category, current.id)}
                      />

                      {hasValidOffer ? (
                        <div className="absolute top-5 left-5 bg-brand-orange text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-xl shadow-md tabular-nums">
                          -{discountPct}% Descuento
                        </div>
                      ) : current.featured ? (
                        <div className="absolute top-5 left-5 bg-amber-400 text-slate-900 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
                          <Star size={14} fill="currentColor" /> Novedad destacada
                        </div>
                      ) : null}
                    </div>

                    {/* Columna Detalles */}
                    <div className="lg:col-span-6 flex flex-col justify-between bg-slate-900/70 border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10">
                      <div>
                        {/* Metadatos limpios sin pills */}
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-teal-300 font-semibold mb-4">
                          <span>{categoryLabel}</span>
                          {current.sku && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className="text-slate-400 font-mono tabular-nums">SKU {current.sku}</span>
                            </>
                          )}
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className={current.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {current.stock > 0 ? `${current.stock} disponibles` : 'Agotado'}
                          </span>
                        </div>

                        <h2
                          className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4"
                          style={{ textWrap: 'balance' }}
                        >
                          {current.name}
                        </h2>

                        {current.authorOrBrand && (
                          <p className="text-slate-300 text-sm sm:text-base font-medium mb-5">
                            Marca / Autor: <span className="text-white font-semibold">{current.authorOrBrand}</span>
                          </p>
                        )}

                        {current.description && (
                          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-h-36 overflow-y-auto pr-2">
                            {current.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/10 space-y-6">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-400 mb-1">
                              {hasValidOffer ? 'Precio especial de oferta' : 'Precio en tienda Puquio'}
                            </p>
                            <div className="flex items-baseline gap-3 tabular-nums">
                              <span className="text-4xl sm:text-5xl font-display font-bold text-white">
                                {displayPrice.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                              </span>
                              {hasValidOffer && (
                                <span className="text-lg sm:text-xl text-slate-400 line-through">
                                  {current.price.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handlePrev}
                              aria-label="Producto anterior"
                              className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <ChevronLeft size={20} />
                            </button>
                            <button
                              type="button"
                              onClick={handleNext}
                              aria-label="Siguiente producto"
                              className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <a
                            href={`https://wa.me/51953366458?text=Hola,%20me%20interesa%20el%20producto%20del%20Escaparate%20Digital:%20${encodeURIComponent(current.name)}%20(SKU:%20${encodeURIComponent(current.sku || '')})`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 h-12 px-6 rounded-2xl bg-brand-teal hover:bg-teal-600 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-colors shadow-lg shadow-teal-950/60 whitespace-nowrap"
                          >
                            <Smartphone size={18} />
                            <span>Solicitar por WhatsApp</span>
                          </a>
                          {onSelectProduct && (
                            <button
                              type="button"
                              onClick={() => {
                                exitFullscreen();
                                onSelectProduct(current);
                              }}
                              className="h-12 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-colors border border-white/10 cursor-pointer whitespace-nowrap"
                            >
                              <ShoppingBag size={17} />
                              <span>Ver ficha completa</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>

            {/* Zona Inferior: Siguientes productos y barra de progreso */}
            <footer className="px-5 sm:px-8 py-4 border-t border-white/10 bg-slate-950/95 shrink-0">
              <div className="max-w-6xl mx-auto space-y-3">
                {upcomingItems.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {upcomingItems.map(({ item, targetIdx }) => (
                      <button
                        key={`${item.id}-${targetIdx}`}
                        type="button"
                        onClick={() => setIndex(targetIdx)}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-teal-500/40 text-left transition-colors cursor-pointer min-w-0"
                      >
                        <div className="w-11 h-11 rounded-xl bg-white p-1 shrink-0 overflow-hidden">
                          <img
                            src={normalizeProductImageUrl(item.imageUrl, item.category, item.id)}
                            alt={item.name}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => handleImageError(e, item.category, item.id)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-teal-300 truncate">
                            {formatCategoryLabel(item.category)}
                          </p>
                          <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-teal rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                    Atajos: ← → navegar · Espacio pausar · Esc salir
                  </span>
                </div>
              </div>
            </footer>
          </div>,
          document.body
        )}
    </>
  );
};
