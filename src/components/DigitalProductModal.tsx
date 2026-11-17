import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ExternalLink, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  FileText, 
  Layers, 
  Printer, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { DigitalProduct, DIGITAL_CATEGORIES_METADATA } from '../services/digitalService';

interface DigitalProductModalProps {
  product: DigitalProduct | null;
  onClose: () => void;
}

export const DigitalProductModal: React.FC<DigitalProductModalProps> = ({ product, onClose }) => {
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  if (!product) return null;

  const currentPrice = product.offerPrice !== undefined && product.offerPrice !== null && product.offerPrice > 0 
    ? product.offerPrice 
    : product.price;
  const hasDiscount = Boolean(product.offerPrice && product.offerPrice < product.price);
  const meta = DIGITAL_CATEGORIES_METADATA[product.category] || {
    label: product.category,
    badge: 'Digital',
    desc: ''
  };

  const previewList = [
    product.coverUrl,
    ...(product.previewPages || [])
  ].filter(Boolean);

  const whatsappMessage = encodeURIComponent(
    `¡Hola Librería El Estudiante! 👋 Deseo adquirir el material digital original:\n\n` +
    `📘 *${product.title}*\n` +
    `📂 *Categoría:* ${meta.label}\n` +
    `💰 *Precio:* S/ ${currentPrice.toFixed(2)}\n` +
    `📄 *Formato:* ${product.format || 'PDF A4 Imprimible'}\n\n` +
    `¿Me brindan los datos de Yape, Plin o BCP para realizar el pago y recibir el enlace de descarga? ¡Muchas gracias!`
  );

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative my-auto border border-slate-100 max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón cerrar */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-slate-900/10 hover:bg-slate-900 text-slate-700 hover:text-white transition-all cursor-pointer backdrop-blur-xs"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>

          {/* Columna Izquierda: Galería y Previsualización */}
          <div className="md:w-5/12 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 p-6 flex flex-col justify-between text-white relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-brand-teal/20 text-teal-300 border border-brand-teal/30">
                  <Sparkles size={12} />
                  100% Original El Estudiante
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-white/10 px-2 py-0.5 rounded-md">
                  {product.format || 'PDF A4'}
                </span>
              </div>

              {/* Contenedor de Imagen de Muestra con Relieve de Libro */}
              <div className="relative group aspect-[3/4] max-h-80 sm:max-h-96 mx-auto rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 bg-slate-800 flex items-center justify-center">
                <img 
                  src={previewList[activePreviewIndex] || product.coverUrl} 
                  alt={product.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
                  }}
                />

                {/* Sello de agua sutil en vista previa */}
                <div className="absolute bottom-2 left-2 right-2 bg-slate-950/70 backdrop-blur-xs rounded-lg py-1 px-2 flex items-center justify-between text-[10px] text-white/80">
                  <span className="flex items-center gap-1 font-semibold">
                    <ShieldCheck size={12} className="text-teal-400" /> Vista previa segura
                  </span>
                  <span className="font-mono text-[9px]">Pág. {activePreviewIndex + 1} de {previewList.length}</span>
                </div>

                {/* Controles de cambio si hay varias páginas */}
                {previewList.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActivePreviewIndex((prev) => (prev - 1 + previewList.length) % previewList.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                      aria-label="Página previa"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => setActivePreviewIndex((prev) => (prev + 1) % previewList.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                      aria-label="Página siguiente"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>

              {/* Miniaturas de muestra */}
              {previewList.length > 1 && (
                <div className="flex gap-2 justify-center overflow-x-auto pb-1">
                  {previewList.map((imgUrl, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePreviewIndex(i)}
                      className={`w-12 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        activePreviewIndex === i ? 'border-brand-teal scale-105 shadow-md' : 'border-white/20 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Garantía inferior */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Printer size={14} className="text-teal-400" />
                Impresión A4 Ilimitada
              </span>
              <span className="font-mono text-[10px] text-teal-300">Descarga Inmediata</span>
            </div>
          </div>

          {/* Columna Derecha: Información Editorial y Proceso de Compra */}
          <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-teal-50 text-brand-teal border border-teal-200">
                    {meta.label}
                  </span>
                  {product.targetAudience && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                      🎯 {product.targetAudience}
                    </span>
                  )}
                  {hasDiscount && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
                      Oferta Especial
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {product.title}
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wide">
                  Edición Digital Oficial · Librería "El Estudiante" Puquio
                </p>
              </div>

              {/* Precio y Ahorro */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                    Inversión de Descarga
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-black text-slate-900">
                      S/ {currentPrice.toFixed(2)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm font-bold text-slate-400 line-through">
                        S/ {product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 size={13} /> Acceso de por vida
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Sin suscripciones</span>
                </div>
              </div>

              {/* Ficha Técnica */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <FileText size={13} /> Páginas
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {product.pages ? `${product.pages} pág.` : 'Completo'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Layers size={13} /> Formato
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1 truncate">
                    {product.format || 'PDF Listo A4'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Download size={13} /> Entrega
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    Directa a tu WhatsApp
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Descripción y Contenido
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-normal">
                  {product.description}
                </p>
              </div>

              {/* Beneficios clave */}
              <div className="space-y-2 bg-teal-50/50 p-3.5 rounded-2xl border border-brand-teal/20">
                <p className="text-xs font-bold text-brand-teal flex items-center gap-1.5">
                  <ShieldCheck size={16} /> ¿Por qué elegir Digitales El Estudiante?
                </p>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li><strong>Originalidad garantizada:</strong> Material didáctico elaborado y adaptado a nuestro currículo escolar.</li>
                  <li><strong>Listo para el hogar o aula:</strong> Optimizado para imprimir en hojas bond estándar sin cortar márgenes.</li>
                  <li><strong>Descarga en segundos:</strong> Paga con Yape, Plin o transferencia y recibe tu enlace de Google Drive al instante.</li>
                </ul>
              </div>
            </div>

            {/* Acciones de Compra y Ayuda */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/51953366458?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all text-sm group"
              >
                <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                Comprar por WhatsApp (S/ {currentPrice.toFixed(2)})
              </a>

              {product.downloadUrl && product.downloadUrl.includes('drive.google.com') && (
                <a
                  href={product.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Abrir enlace de muestra"
                >
                  <Eye size={16} /> Ver Demostración
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
