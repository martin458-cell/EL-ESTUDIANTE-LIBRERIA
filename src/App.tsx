/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  PenTool, 
  Monitor, 
  MessageCircle, 
  ChevronRight, 
  MapPin, 
  Facebook, 
  Navigation,
  CheckCircle2,
  Share2,
  Cpu,
  ShoppingBag,
  ExternalLink,
  Smartphone,
  User,
  Settings,
  LogOut,
  Loader2,
  Package,
  Search,
  Star,
  X,
  Menu,
  ChevronLeft,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { useProducts, Product } from './hooks/useProducts';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CatalogManager } from './components/CatalogManager';

// --- Components ---

const ProductDetailModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
  if (!product) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="bg-white w-full max-w-4xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative max-h-[92vh] sm:max-h-[85vh] md:max-h-none overflow-y-auto md:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 p-2.5 bg-white shadow-xl rounded-full text-slate-800 border border-slate-100 hover:bg-slate-50 transition-all active:scale-90"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        {/* Image Preview */}
        <div className="md:w-1/2 bg-slate-50 aspect-square md:aspect-auto relative overflow-hidden shrink-0">
          <img 
            src={product.imageUrl || `https://picsum.photos/seed/${product.id}/600/600`} 
            alt={product.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {product.featured && (
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-yellow-400 text-slate-900 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 border border-yellow-500">
              <Star size={10} fill="currentColor" /> Novedad
            </div>
          )}
        </div>

        {/* Content */}
        <div className="md:w-1/2 p-6 sm:p-8 md:p-12 flex flex-col bg-white min-h-0 overflow-y-auto">
          <div className="flex-1">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-teal-50 text-brand-teal text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-teal-100 mb-2">
                {product.category}
              </span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">SKU: {product.sku}</p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 leading-tight mb-2">
                {product.name}
              </h2>
              {product.authorOrBrand && (
                <p className="text-base text-slate-500 font-medium">Por: <span className="text-slate-800 font-bold">{product.authorOrBrand}</span></p>
              )}
            </div>

            <div className="space-y-4 mb-8 pt-4 border-t border-slate-50">
              {product.description && (
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción del Producto</h4>
                  <div className="text-sm sm:text-base text-slate-600 leading-relaxed max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {product.description}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponibilidad</p>
                  <p className={`font-bold text-xs sm:text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {product.stock > 0 ? `${product.stock} unidades` : 'Agotado'}
                  </p>
                </div>
                <div>
                  <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</h4>
                  <p className="text-xs sm:text-sm font-bold text-slate-700">Producto Original</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-50 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="text-left w-full sm:w-auto">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Precio Sugerido</p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-brand-orange">
                {product.price.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:flex-1">
              <a 
                href={`https://wa.me/51953366458?text=Hola,%20me%20interesa%20el%20producto:%20${product.name}%20(SKU:%20${product.sku})`}
                target="_blank"
                rel="noreferrer"
                className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1"
              >
                <Smartphone size={20} /> Solicitar WhatsApp
              </a>
              <button 
                onClick={onClose}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all sm:hidden"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Navbar = ({ user, isAdmin, onLogin, onLogout, onOpenAdmin, isLoading, activeView, onNavigate }: { 
  user: FirebaseUser | null, 
  isAdmin: boolean,
  onLogin: () => void, 
  onLogout: () => void,
  onOpenAdmin: () => void,
  isLoading: boolean,
  activeView: string,
  onNavigate: (view: 'home' | 'offers', sectionId?: string) => void
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    if (activeView !== 'home') {
      e.preventDefault();
      onNavigate('home', sectionId);
    }
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Inicio', view: 'home' as const },
    { label: 'Catálogo', href: '#catalogo', sectionId: 'catalogo' },
    { label: 'Ofertas', view: 'offers' as const, isOffer: true },
    { label: 'Beneficios', href: '#beneficios', sectionId: 'beneficios' },
    { label: 'Ubicación', href: '#ubicacion', sectionId: 'ubicacion' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || isMobileMenuOpen ? 'bg-white shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div 
            className="flex items-center gap-3 cursor-pointer relative z-[60]" 
            onClick={() => { onNavigate('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
          >
            <img 
              src="/logo.svg" 
              alt="Logo El Estudiante" 
              className="h-9 md:h-12 w-auto object-contain"
            />
            <span className="font-display font-bold text-lg md:text-xl tracking-tight hidden xs:block">
              Librería <span className="hidden sm:inline">"El Estudiante"</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-6 lg:gap-8 font-medium text-sm text-slate-600">
            {navLinks.map((link) => (
              link.view ? (
                <button 
                  key={link.label}
                  onClick={() => onNavigate(link.view)}
                  className={`flex items-center gap-1 ${activeView === link.view ? 'text-brand-teal font-bold' : 'hover:text-brand-teal'} transition-colors relative`}
                >
                  {link.label}
                  {link.isOffer && (
                    <span className="text-[9px] bg-brand-orange text-white px-1.5 py-0.5 rounded-full animate-bounce">TOP</span>
                  )}
                </button>
              ) : (
                <a 
                  key={link.label}
                  href={link.href} 
                  onClick={(e) => handleSectionClick(e, link.sectionId!)}
                  className="hover:text-brand-teal transition-colors"
                >
                  {link.label}
                </a>
              )
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 relative z-[60]">
            {isLoading ? (
              <Loader2 className="animate-spin text-slate-400" size={20} />
            ) : user ? (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-slate-900 text-white p-1 pr-3 rounded-full hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-teal flex items-center justify-center text-xs font-bold ring-2 ring-white overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="" /> : (user.displayName?.charAt(0) || user.email?.charAt(0))}
                  </div>
                  <span className="text-[10px] font-bold hidden sm:inline pr-2">{user.displayName?.split(' ')?.[0] || 'Mi cuenta'}</span>
                </button>
                
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conectado como</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                      </div>
                      <div className="p-2">
                        {isAdmin && (
                          <button 
                            onClick={() => { onOpenAdmin(); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-brand-teal font-bold hover:bg-teal-50 rounded-xl transition-colors"
                          >
                            <Settings size={18} /> Gestionar Catálogo
                          </button>
                        )}
                        <button 
                          onClick={() => { onLogout(); setShowUserMenu(false); }}
                          className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium flex items-center gap-3"
                        >
                          <LogOut size={16} /> Cerrar Sesión
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="bg-slate-900 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10 flex items-center gap-2"
              >
                <User size={18} className="hidden xs:block" /> Acceso
              </button>
            )}
            
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menú"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-t border-slate-50 overflow-hidden"
            >
              <div className="p-4 space-y-1">
                {navLinks.map((link) => (
                  link.view ? (
                    <button 
                      key={link.label}
                      onClick={() => { onNavigate(link.view); setIsMobileMenuOpen(false); }}
                      className={`w-full text-left px-6 py-4 rounded-2xl flex items-center justify-between ${activeView === link.view ? 'bg-teal-50 text-brand-teal font-bold' : 'text-slate-600 font-medium hover:bg-slate-50'}`}
                    >
                      {link.label}
                      {link.isOffer && (
                        <span className="text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded-full font-bold">TOP</span>
                      )}
                    </button>
                  ) : (
                    <a 
                      key={link.label}
                      href={link.href} 
                      onClick={(e) => handleSectionClick(e, link.sectionId!)}
                      className="block px-6 py-4 rounded-2xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                    >
                      {link.label}
                    </a>
                  )
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[40] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

const LatestNewsCarousel = ({ products }: { products: Product[] }) => {
  const [index, setIndex] = useState(0);
  const latestProducts = [...products]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 10);

  useEffect(() => {
    if (latestProducts.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % latestProducts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [latestProducts.length]);

  if (latestProducts.length === 0) {
    return (
      <div className="bg-slate-100 rounded-[2.5rem] w-full aspect-[4/3] flex items-center justify-center text-slate-400">
        <Package size={48} className="animate-pulse" />
      </div>
    );
  }

  const current = latestProducts[index];

  return (
    <div className="relative group perspective-1000">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 20, rotateY: -10 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          exit={{ opacity: 0, x: -20, rotateY: 10 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white p-4 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-slate-50">
            <img 
              src={current.imageUrl || `https://picsum.photos/seed/${current.id}/800/600`} 
              alt={current.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
            
            <div className="absolute top-4 right-4 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
              <Star size={12} fill="currentColor" /> ¡Recién Llegado!
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-left">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider mb-2 border border-white/20">
                {current.category}
              </span>
              <h3 className="text-xl md:text-2xl font-bold text-white leading-tight drop-shadow-md truncate">
                {current.name}
              </h3>
              <p className="text-white/80 text-sm mt-1 font-medium truncate">{current.authorOrBrand}</p>
            </div>
          </div>
          
          <div className="mt-8 flex gap-4 items-center px-2">
            <div className="p-4 bg-teal-50 rounded-2xl flex-1 flex flex-col items-center justify-center border border-brand-teal/10">
              <ShoppingBag className="text-brand-teal mb-1" size={24} />
              <span className="text-[10px] font-bold text-brand-teal uppercase tracking-widest">En Tienda</span>
            </div>
            <div className="flex-[1.5] text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Precio Puquio</p>
              <p className="text-2xl font-display font-bold text-slate-900">
                {current.price.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
        {latestProducts.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${index === i ? 'bg-brand-teal w-6' : 'bg-slate-300'}`}
          />
        ))}
      </div>
      
      <div className="absolute top-1/2 -left-4 -translate-y-1/2 hidden lg:flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setIndex((prev) => (prev - 1 + latestProducts.length) % latestProducts.length)}
          className="p-3 bg-white shadow-xl rounded-full text-slate-400 hover:text-brand-teal transition-colors border border-slate-50"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
      <div className="absolute top-1/2 -right-4 -translate-y-1/2 hidden lg:flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setIndex((prev) => (prev + 1) % latestProducts.length)}
          className="p-3 bg-white shadow-xl rounded-full text-slate-400 hover:text-brand-teal transition-colors border border-slate-50"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

const Hero = ({ onSearch, products }: { onSearch: (term: string) => void, products: Product[] }) => {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden bg-bg-warm">
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-full opacity-10 blur-3xl bg-brand-teal rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 -z-10 w-1/3 h-1/2 opacity-5 blur-3xl bg-brand-orange rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
      
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-brand-teal text-xs font-bold uppercase tracking-wider mb-8 border border-brand-teal/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-teal"></span>
            </span>
            Tu aliado educativo en Puquio
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.1] mb-6 text-slate-900">
            Crecemos junto a <span className="text-brand-teal">tu futuro</span> y nuestra ciudad.
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-lg leading-relaxed">
            Explora las últimas novedades que hemos traído a Puquio. Tecnología, libros y útiles para potenciar tu talento.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-brand-teal text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all flex items-center gap-2 shadow-xl shadow-brand-teal/25 hover:-translate-y-1"
            >
              Explorar Catálogo <ChevronRight size={20} />
            </button>
            <div className="relative group max-w-xs w-full">
              <input 
                type="text" 
                placeholder="Buscar en la tienda..." 
                onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-4 pl-12 focus:border-brand-teal focus:ring-0 outline-none transition-all shadow-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-teal transition-colors" size={20} />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative block"
        >
          <div className="relative">
            <LatestNewsCarousel products={products} />
            
            <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-50 flex items-center gap-3 sm:gap-4 scale-90 sm:scale-100 origin-top-left">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 text-brand-orange rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                <Calendar size={20} className="sm:hidden" />
                <Calendar size={24} className="hidden sm:block" />
              </div>
              <div className="pr-2 sm:pr-4">
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Lo Nuevo</p>
                <p className="font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">Escaparate Digital</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const ProductCatalog = ({ products, loading, searchTerm, setSearchTerm }: { products: Product[], loading: boolean, searchTerm: string, setSearchTerm: (term: string) => void }) => {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;
  
  const categories = useMemo(() => [
    { id: 'todos', name: 'Todos', icon: <ShoppingBag size={18} /> },
    { id: 'libros', name: 'Libros', icon: <BookOpen size={18} /> },
    { id: 'utiles', name: 'Útiles', icon: <PenTool size={18} /> },
    { id: 'tecnologia', name: 'Tecnología', icon: <Monitor size={18} /> }
  ], []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeCategory === 'todos' || p.category === activeCategory;
      const searchLower = searchTerm.toLowerCase();
      
      const name = p.name?.toLowerCase() || '';
      const sku = p.sku?.toLowerCase() || '';
      const brand = p.authorOrBrand?.toLowerCase() || '';
      const desc = p.description?.toLowerCase() || '';
      
      const matchesSearch = 
        name.includes(searchLower) || 
        sku.includes(searchLower) ||
        brand.includes(searchLower) ||
        desc.includes(searchLower);
        
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchTerm]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  return (
    <section id="catalogo" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <h2 className="font-display text-4xl font-bold text-slate-900 mb-4 tracking-tight">Catálogo de Productos</h2>
            <p className="text-slate-500 max-w-md">Encuentra exactamente lo que buscas con nuestra vitrina digital siempre actualizada.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeCategory === cat.id 
                    ? 'bg-white text-brand-teal shadow-md translate-y-0' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-bold text-lg">Cargando catálogo...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <Search className="mx-auto text-slate-300 mb-6" size={64} />
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Sin coincidencias</h3>
            <p className="text-slate-500">No encontramos productos que coincidan con "<span className="font-bold text-brand-teal">{searchTerm}</span>".</p>
            <button 
              onClick={() => {
                const searchInputs = document.querySelectorAll('input[placeholder*="Buscar"]');
                searchInputs.forEach(input => {
                  (input as HTMLInputElement).value = '';
                });
                setSearchTerm('');
              }}
              className="mt-6 text-brand-teal font-bold hover:underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {paginatedProducts.map((product) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-50">
                      <img 
                        src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/400`} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {product.featured && (
                          <div className="bg-yellow-400 text-slate-900 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 border border-yellow-500">
                            <Star size={8} fill="currentColor" /> Novedad
                          </div>
                        )}
                        {product.stock <= product.minStock && product.stock > 0 && (
                          <div className="bg-orange-500 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg border border-orange-600">
                            ¡Pocas!
                          </div>
                        )}
                        {product.stock === 0 && (
                          <div className="bg-slate-800 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">
                            Agotado
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                        <div className="w-full bg-brand-teal text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-teal/90 shadow-xl">
                          <ExternalLink size={16} /> Detalles
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{product.sku}</p>
                        <h3 className="font-bold text-sm text-slate-800 group-hover:text-brand-teal transition-colors leading-tight truncate">
                          {product.name}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">{product.authorOrBrand}</p>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                        <p className="text-brand-orange font-display font-bold text-lg">
                          {product.price.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                        </p>
                        <span className="bg-teal-50 text-brand-teal px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                          {product.category}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                        currentPage === page
                          ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-teal hover:text-brand-teal'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}

        <AnimatePresence>
          {selectedProduct && (
            <ProductDetailModal 
              product={selectedProduct} 
              onClose={() => setSelectedProduct(null)} 
            />
          )}
        </AnimatePresence>
        
        <div className="mt-16 text-center">
          <a 
            href="https://wa.me/51953366458"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-10 py-5 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
          >
            Ver catálogo completo en WhatsApp <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </section>
  );
};

const Benefits = () => {
  const benefits = [
    {
      title: "Precios Accesibles",
      desc: "Entendemos la economía local y ofrecemos los mejores costos en Puquio.",
      icon: <ShoppingBag className="text-brand-teal" />
    },
    {
      title: "Variedad Total",
      desc: "Desde clásicos literarios hasta las últimas laptops de alta gama.",
      icon: <Cpu className="text-brand-orange" />
    },
    {
      title: "Atención Local",
      desc: "Nuestro personal conoce tus necesidades y te asesora personalmente.",
      icon: <MessageCircle className="text-brand-green" />
    }
  ];

  return (
    <section id="beneficios" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl font-bold mb-4 tracking-tight">¿Por qué elegir "El Estudiante"?</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Más que una tienda, somos tu puerta de entrada al conocimiento.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -8 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-shadow"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
                {React.cloneElement(benefit.icon as React.ReactElement, { size: 32 })}
              </div>
              <h4 className="text-xl font-bold mb-3 text-slate-800">{benefit.title}</h4>
              <p className="text-slate-600 leading-relaxed">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const StaticMap = () => {
  return (
    <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 relative group">
      <img 
        src="https://maps.googleapis.com/maps/api/staticmap?center=-14.6935614,-74.1279769&zoom=17&size=800x450&markers=color:red%7C-14.6935614,-74.1279769&key=YOUR_API_KEY_HERE" 
        alt="Mapa de Ubicación Puquio" 
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors"></div>
      <a 
        href="https://www.google.com/maps/search/?api=1&query=-14.6935614,-74.1279769" 
        target="_blank" 
        rel="noreferrer"
        className="absolute bottom-4 right-4 bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 hover:bg-brand-teal hover:text-white transition-all transform hover:scale-105"
      >
        <Navigation size={14} /> Abrir en Google Maps
      </a>
    </div>
  );
};

const OffersPreview = ({ products, onSeeMore }: { products: Product[], onSeeMore: () => void }) => {
  const offerProducts = products.filter(p => p.isOffer).slice(0, 4);

  if (offerProducts.length === 0) return null;

  return (
    <section className="py-16 bg-brand-orange/5 border-y border-brand-orange/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest mb-4 animate-pulse">
              🚀 Ofertas Relámpago
            </div>
            <h2 className="text-3xl font-display font-bold text-slate-900">Remates que no puedes dejar pasar</h2>
          </div>
          <button 
            onClick={onSeeMore}
            className="hidden sm:flex items-center gap-2 text-brand-orange font-bold hover:underline group"
          >
            Ver todas las ofertas <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {offerProducts.map((p) => (
            <motion.div 
              key={p.id}
              whileHover={{ y: -5 }}
              className="bg-white p-4 rounded-3xl shadow-lg border border-brand-orange/10 relative overflow-hidden group"
            >
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-4 relative">
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                <div className="absolute top-2 right-2 bg-brand-orange text-white text-[9px] font-black px-2 py-1 rounded-lg">
                  -{Math.round((1 - (p.offerPrice || 0) / p.price) * 100)}%
                </div>
              </div>
              <h4 className="font-bold text-slate-800 text-sm truncate mb-1">{p.name}</h4>
              <div className="flex items-center gap-2">
                <span className="text-brand-orange font-black text-lg">S/ {p.offerPrice}</span>
                <span className="text-slate-400 text-xs line-through italic text-[10px]">S/ {p.price}</span>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-10 text-center sm:hidden">
          <button 
            onClick={onSeeMore}
            className="w-full bg-brand-orange text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand-orange/20"
          >
            Ver más ofertas <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
};

const OffersPage = ({ products }: { products: Product[] }) => {
  const offerProducts = products.filter(p => p.isOffer);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-bg-warm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-orange text-white text-xs font-black uppercase tracking-widest mb-6 shadow-lg shadow-brand-orange/30">
            🏷️ Catálogo de Remates
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-slate-900 mb-6">
            Oportunidades <span className="text-brand-orange">Especiales</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Hemos seleccionado estos productos con descuentos exclusivos para nuestra comunidad de Puquio. Tecnología, libros y útiles a precios de regalo.
          </p>
        </div>

        {offerProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] shadow-xl border border-dashed border-slate-200">
            <ShoppingBag className="mx-auto text-slate-300 mb-6" size={64} />
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Próximamente más ofertas</h3>
            <p className="text-slate-500">Estamos preparando nuevos remates para ti. ¡Vuelve pronto!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {offerProducts.map((p) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl overflow-hidden border border-brand-orange/20 relative group"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 right-4 bg-brand-orange text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-lg">
                    AHORRA S/ {(p.price - (p.offerPrice || 0)).toFixed(2)}
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md text-brand-orange px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-orange/20">
                      {p.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-slate-900 mb-2 truncate group-hover:text-brand-orange transition-colors">{p.name}</h3>
                  <p className="text-xs text-slate-500 mb-4">{p.authorOrBrand}</p>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ahora solo</p>
                      <p className="text-3xl font-display font-bold text-brand-orange">S/ {p.offerPrice}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antes</p>
                      <p className="text-sm text-slate-400 line-through">S/ {p.price}</p>
                    </div>
                  </div>
                  <a 
                    href={`https://wa.me/51953366458?text=Hola,%20deseo%20aprovechar%20la%20oferta%20en:%20${p.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-orange transition-all hover:scale-[1.02]"
                  >
                    Lo quiero ya! <ChevronRight size={18} />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const LocalPresence = () => {
  return (
    <section id="ubicacion" className="py-24 relative overflow-hidden bg-brand-teal text-white">
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[40px] border-white rounded-full"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/30">
              <MapPin size={32} />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">Visítanos en el corazón de Puquio</h2>
            <p className="text-blue-50 text-lg mb-10 leading-relaxed">
              Estamos ubicados en una zona estratégica de Puquio para servir a toda la comunidad. Ven por tus libros, útiles de oficina o lo último en tecnología.
            </p>

            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                <h4 className="font-bold text-xl mb-2 flex items-center gap-3 text-yellow-300">
                  <Navigation size={22} /> Nuestra Dirección
                </h4>
                <p className="text-white font-medium">Jr. Tacna N° 668, Puquio, Ayacucho.</p>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=-14.6935614,-74.1279769"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-sm font-bold bg-white text-brand-teal px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Abrir en Google Maps <ExternalLink size={14} />
                </a>
              </div>
              
              <div className="flex items-center gap-4 text-blue-50 text-sm">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <span>Fácil acceso desde la plaza principal</span>
              </div>
            </div>
          </motion.div>

          {/* Google Maps Integration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl overflow-hidden aspect-video lg:aspect-square relative group">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d969.0305711681363!2d-74.1279769!3d-14.6935614!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTTCsDQxJzM2LjgiUyA3NMKwMDcnNDAuNyJX!5e0!3m2!1ses!2spe!4v1713802026123!5m2!1ses!2spe" 
                className="w-full h-full rounded-[2rem] border-0"
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              <div className="absolute inset-0 bg-brand-teal/5 pointer-events-none group-hover:bg-transparent transition-colors"></div>
            </div>
            
            {/* Location Badge */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 hidden md:flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-orange/20 rounded-full flex items-center justify-center text-brand-orange font-bold">
                P
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ubícanos</p>
                <p className="font-bold text-slate-800 text-sm">Jr. Tacna 668</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const SocialShare = () => {
  const shareLinks = [
    { name: "Facebook", icon: <Facebook />, color: "bg-[#1877F2]", url: "https://www.facebook.com/profile.php?id=100083164039067" },
    { name: "WhatsApp", icon: <Smartphone />, color: "bg-[#25D366]", url: "https://wa.me/51953366458" },
    { name: "TikTok", icon: <Share2 />, color: "bg-black", url: "https://www.tiktok.com/@puquio_el_estudiante" }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h3 className="font-display text-2xl font-bold mb-8">¡Comparte nuestro negocio y ayuda a crecer a Puquio!</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {shareLinks.map((social) => (
            <a 
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noreferrer"
              className={`${social.color} text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-lg`}
            >
              {social.icon} {social.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

const AIChatPlaceholder = () => {
  return (
    <div className="fixed bottom-8 right-8 z-40 group">
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute bottom-full right-0 mb-4 w-64 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 hidden group-hover:block"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-brand-teal rounded-full flex items-center justify-center text-white text-xs font-bold">
              AI
            </div>
            <p className="font-bold text-sm">Asistente Virtual</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed italic">
            "Próximamente estaremos integrando IA para ayudarte en tiempo real con tus compras y consultas."
          </p>
        </motion.div>
      </AnimatePresence>
      
      <button className="w-16 h-16 bg-brand-teal text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all outline-none ring-4 ring-brand-teal/10 animate-pulse-slow">
        <MessageCircle size={32} />
      </button>
    </div>
  );
};

const InspirationalMarquee = () => {
  const phrases = [
    "La educación es el pasaporte hacia el futuro.",
    "Un libro es un regalo que puedes abrir una y otra vez.",
    "La tecnología es solo una herramienta, la educación es el poder.",
    "El aprendizaje es un tesoro que seguirá a su dueño a todas partes.",
    "Puquio crece con el conocimiento de su gente.",
    "No dejes de aprender, porque la vida nunca deja de enseñar.",
    "La lectura nos abre las puertas del mundo que te imaginas."
  ];

  return (
    <div className="w-full bg-brand-teal overflow-hidden py-2 border-y border-brand-teal/20 shadow-sm">
      <div className="flex whitespace-nowrap">
        <motion.div
          animate={{ x: [0, -1000] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 35,
              ease: "linear",
            },
          }}
          className="flex gap-16 items-center"
        >
          {phrases.map((phrase, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-white/50 text-[10px]">✨</span>
              <span className="text-white text-[11px] font-bold tracking-wider uppercase opacity-90">
                {phrase}
              </span>
            </div>
          ))}
          {/* Duplicate for seamless loop */}
          {phrases.map((phrase, i) => (
            <div key={`dup-${i}`} className="flex items-center gap-4">
              <span className="text-white/50 text-[10px]">✨</span>
              <span className="text-white text-[11px] font-bold tracking-wider uppercase opacity-90">
                {phrase}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

const Footer = ({ onNavigate, activeView }: { 
  onNavigate: (view: 'home' | 'offers', sectionId?: string) => void,
  activeView: string
}) => {
  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    if (activeView !== 'home') {
      e.preventDefault();
      onNavigate('home', sectionId);
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src="/logo.svg" 
              alt="Logo El Estudiante" 
              className="w-10 h-10 object-contain"
            />
            <span className="font-display font-bold text-xl text-white tracking-tight">Librería "El Estudiante"</span>
          </div>
          <p className="max-w-sm mb-6 leading-relaxed">
            Desde 1995 sirviendo a la comunidad de Puquio con los mejores productos educativos y tecnológicos. Comprometidos con el desarrollo de Ayacucho.
          </p>
          <div className="flex gap-4">
            <a href="https://www.facebook.com/profile.php?id=100083164039067" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center hover:bg-white/10 transition-colors" title="Facebook">
              <Facebook size={18} />
            </a>
            <a href="https://www.tiktok.com/@puquio_el_estudiante" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center hover:bg-white/10 transition-colors" title="TikTok">
              <Share2 size={18} />
            </a>
            <a href="https://wa.me/51953366458" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center hover:bg-white/10 transition-colors" title="WhatsApp">
              <Smartphone size={18} />
            </a>
          </div>
        </div>
        
        <div>
          <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Secciones</h4>
          <ul className="space-y-4 text-sm">
            <li>
              <a 
                href="#catalogo" 
                onClick={(e) => handleSectionClick(e, 'catalogo')}
                className="hover:text-white transition-colors"
              >
                Catálogo
              </a>
            </li>
            <li>
              <button 
                onClick={() => onNavigate('offers')} 
                className="hover:text-white transition-colors"
              >
                Ofertas Especiales
              </button>
            </li>
            <li>
              <a 
                href="#beneficios" 
                onClick={(e) => handleSectionClick(e, 'beneficios')}
                className="hover:text-white transition-colors"
              >
                Beneficios
              </a>
            </li>
            <li>
              <a 
                href="#ubicacion" 
                onClick={(e) => handleSectionClick(e, 'ubicacion')}
                className="hover:text-white transition-colors"
              >
                Ubicación
              </a>
            </li>
            <li>
              <button 
                onClick={() => onNavigate('home')} 
                className="hover:text-white transition-colors"
              >
                Inicio
              </button>
            </li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Legal</h4>
          <ul className="space-y-4 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Política de Privacidad</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Libro de Reclamaciones</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-800 text-center text-xs tracking-widest uppercase">
        <p>© 2026 Librería "El Estudiante" - Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

// --- Main App ---

export default function App() {
  const { products, loading } = useProducts();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'home' | 'offers'>('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Simple Admin Check
        const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
        if (!adminDoc.exists() && firebaseUser.email === "martinherickcahuanamendoza@gmail.com") {
          await setDoc(doc(db, 'admins', firebaseUser.uid), { email: firebaseUser.email, role: 'owner' });
          setIsAdmin(true);
        } else {
          setIsAdmin(adminDoc.exists());
        }
      } else {
        setIsAdmin(false);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavigate = (view: 'home' | 'offers', sectionId?: string) => {
    setActiveView(view);
    if (sectionId) {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300); // Increased timeout to ensure AnimatePresence finish
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar 
        user={user} 
        isAdmin={isAdmin}
        onLogin={handleLogin} 
        onLogout={handleLogout}
        onOpenAdmin={() => setShowManager(true)}
        isLoading={isAuthLoading}
        activeView={activeView}
        onNavigate={handleNavigate}
      />
      <div className="pt-24"> {/* Offset for Fixed/Sticky Navbar if needed, though Navbar has fixed positioning */}
        <InspirationalMarquee />
      </div>
      
      <AnimatePresence mode="wait">
        {activeView === 'home' ? (
          <motion.main
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Hero onSearch={setSearchTerm} products={products} />
            <OffersPreview products={products} onSeeMore={() => handleNavigate('offers')} />
            <ProductCatalog 
              products={products} 
              loading={loading} 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
            />
            <Benefits />
            <LocalPresence />
            <SocialShare />
          </motion.main>
        ) : (
          <motion.div
            key="offers"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <OffersPage products={products} />
          </motion.div>
        )}
      </AnimatePresence>

      <Footer onNavigate={handleNavigate} activeView={activeView} />
      <AIChatPlaceholder />

      <AnimatePresence>
        {showManager && isAdmin && (
          <CatalogManager 
            products={products} 
            onClose={() => setShowManager(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
