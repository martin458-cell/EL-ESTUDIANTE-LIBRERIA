/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { useProducts, Product } from './hooks/useProducts';
import { AdminPanel } from './components/Admin/AdminPanel';

// --- Components ---

const Navbar = ({ user, isAdmin, onLogin, onLogout, onOpenAdmin, isLoading }: { 
  user: FirebaseUser | null, 
  isAdmin: boolean, 
  onLogin: () => void, 
  onLogout: () => void,
  onOpenAdmin: () => void,
  isLoading: boolean
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.svg" 
            alt="Logo El Estudiante" 
            className="w-12 h-12 object-contain"
          />
          <span className="font-display font-bold text-xl tracking-tight">Librería "El Estudiante"</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
          <a href="#catalogo" className="hover:text-brand-teal transition-colors">Catálogo</a>
          <a href="#beneficios" className="hover:text-brand-teal transition-colors">Beneficios</a>
          <a href="#ubicacion" className="hover:text-brand-teal transition-colors">Ubicación</a>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            {isLoading ? (
              <div className="p-2">
                <Loader2 className="animate-spin text-slate-400" size={20} />
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button 
                    onClick={onOpenAdmin}
                    className="p-2.5 bg-brand-teal/10 text-brand-teal rounded-full hover:bg-brand-teal/20 transition-colors"
                    title="Panel de Administración"
                  >
                    <Settings size={20} />
                  </button>
                )}
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-white border border-slate-200 p-1 pr-3 rounded-full hover:shadow-md transition-all"
                >
                  <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full" />
                  <span className="text-xs font-bold text-slate-700 hidden sm:block">{user.displayName?.split(' ')[0]}</span>
                </button>
                
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
                    >
                      <button 
                        onClick={() => { onLogout(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} /> Cerrar Sesión
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="flex items-center gap-2 text-slate-600 font-bold text-sm hover:text-brand-teal transition-colors px-4 py-2"
              >
                <User size={18} /> Admin
              </button>
            )}
          </div>
          <button 
            onClick={() => window.open('https://wa.me/51953366458', '_blank')}
            className="bg-brand-teal text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-brand-teal/90 transition-all shadow-md shadow-brand-teal/20"
          >
            Contactar
          </button>
        </div>
      </div>
    </nav>
  );
};

const Hero = ({ onSearch }: { onSearch: (term: string) => void }) => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-bg-warm">
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-full opacity-10 blur-3xl bg-brand-teal rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 -z-10 w-1/3 h-1/2 opacity-5 blur-3xl bg-brand-orange rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
      
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-brand-teal text-xs font-bold uppercase tracking-wider mb-6 border border-brand-teal/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-teal"></span>
            </span>
            Tu aliado educativo en Puquio
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.1] mb-6 text-slate-900">
            Todo lo que necesitas para <span className="text-brand-teal">estudiar</span> y <span className="text-brand-orange">trabajar</span>.
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-lg leading-relaxed">
            Impulsamos el futuro de Puquio con los mejores libros, útiles de calidad y tecnología de punta. ¡Todo a tu alcance!
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-brand-teal text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-xl shadow-brand-teal/25"
            >
              Explorar Catálogo <ChevronRight size={20} />
            </button>
            <div className="relative group max-w-xs w-full">
              <input 
                type="text" 
                placeholder="Buscar productos..." 
                onChange={(e) => onSearch(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-4 pl-12 focus:border-brand-teal outline-none transition-colors"
              />
              <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-teal transition-colors" size={20} />
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative perspective-1000 hidden md:block"
        >
          <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl overflow-hidden transform rotate-2 border border-slate-100">
            <img 
              src="https://picsum.photos/seed/libreria/800/600" 
              alt="Education and Tech" 
              className="rounded-[2rem] w-full h-auto object-cover aspect-[4/3] shadow-inner"
              referrerPolicy="no-referrer"
            />
            <div className="mt-8 flex gap-4">
              <div className="p-5 bg-teal-50 rounded-2xl flex-1 flex flex-col items-center justify-center border border-brand-teal/10">
                <BookOpen className="text-brand-teal mb-2" size={32} />
                <span className="text-sm font-bold text-slate-800 tracking-tight">Cultura</span>
              </div>
              <div className="p-5 bg-orange-50 rounded-2xl flex-1 flex flex-col items-center justify-center border border-brand-orange/10">
                <Monitor className="text-brand-orange mb-2" size={32} />
                <span className="text-sm font-bold text-slate-800 tracking-tight">Tecnología</span>
              </div>
              <div className="p-5 bg-yellow-50 rounded-2xl flex-1 flex flex-col items-center justify-center border border-brand-yellow/30">
                <PenTool className="text-brand-orange mb-2" size={32} />
                <span className="text-sm font-bold text-slate-800 tracking-tight">Útiles</span>
              </div>
            </div>
          </div>
          
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-brand-green/20 rounded-full flex items-center justify-center text-brand-green">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confianza</p>
              <p className="font-bold text-slate-800 text-sm">Empresa Puquiana</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const ProductCatalog = ({ products, loading, searchTerm, setSearchTerm }: { products: Product[], loading: boolean, searchTerm: string, setSearchTerm: (term: string) => void }) => {
  const [activeCategory, setActiveCategory] = useState('todos');
  
  const categories = [
    { id: 'todos', name: 'Todos', icon: <ShoppingBag size={18} /> },
    { id: 'libros', name: 'Libros', icon: <BookOpen size={18} /> },
    { id: 'utiles', name: 'Útiles', icon: <PenTool size={18} /> },
    { id: 'tecnologia', name: 'Tecnología', icon: <Monitor size={18} /> }
  ];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'todos' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

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
                const searchInputs = document.querySelectorAll('input[placeholder="Buscar productos..."]');
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={product.id}
                  className="group relative bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-2"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-50">
                    <img 
                      src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/400`} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    {(product.tag || product.stock < 5) && (
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {product.tag && (
                          <div className="bg-brand-orange text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                            {product.tag}
                          </div>
                        )}
                        {product.stock < 5 && product.stock > 0 && (
                          <div className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                            ¡Últimos {product.stock}!
                          </div>
                        )}
                        {product.stock === 0 && (
                          <div className="bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                            Sin Stock
                          </div>
                        )}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <a 
                        href={`https://wa.me/51953366458?text=Hola,%20me%20interesa%20el%20producto:%20${product.name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-brand-teal text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-teal/90 shadow-xl"
                      >
                        <ShoppingBag size={20} /> Solicitar Cotización
                      </a>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-800 group-hover:text-brand-teal transition-colors leading-tight">
                        {product.name}
                      </h3>
                      <span className="bg-teal-50 text-brand-teal px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                        {product.category}
                      </span>
                    </div>
                    <p className="text-brand-orange font-display font-bold text-xl">
                      {product.price.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        
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

const LocalPresence = () => {
  return (
    <section className="py-20 relative overflow-hidden bg-brand-teal text-white">
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[40px] border-white rounded-full"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-10 inline-flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 border border-white/30">
            <MapPin size={40} />
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Impulsando la educación en Puquio</h2>
          <p className="text-blue-100 text-lg max-w-3xl mx-auto">
            Estamos ubicados en el corazón de Puquio, sirviendo a nuestra comunidad con dedicación y compromiso. Visítanos y descubre todo lo que tenemos para ti.
          </p>
        </motion.div>
        
        <div className="flex flex-col md:flex-row gap-6 justify-center mt-12">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-left flex-1 max-w-sm">
            <h4 className="font-bold text-xl mb-2 flex items-center gap-2">
              <Navigation size={20} className="text-orange-300" /> Dirección
            </h4>
            <p className="text-blue-50">Jr. Tacna N° 668, Puquio, Ayacucho.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-left flex-1 max-w-sm">
            <h4 className="font-bold text-xl mb-2 flex items-center gap-2">
              <Share2 size={20} className="text-orange-300" /> Redes Locales
            </h4>
            <p className="text-blue-50">¡Únete a nuestra comunidad de más de 5,000 puquianos!</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const SocialShare = () => {
  const shareLinks = [
    { name: "Facebook", icon: <Facebook />, color: "bg-[#1877F2]", url: "#" },
    { name: "WhatsApp", icon: <Smartphone />, color: "bg-[#25D366]", url: "https://wa.me/51953366458" },
    { name: "TikTok", icon: <Share2 />, color: "bg-black", url: "#" }
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

const Footer = () => {
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
            <a href="#" className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center hover:bg-white/10 transition-colors">
              <Facebook size={18} />
            </a>
            <a href="https://wa.me/51953366458" className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center hover:bg-white/10 transition-colors">
              <Smartphone size={18} />
            </a>
          </div>
        </div>
        
        <div>
          <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Secciones</h4>
          <ul className="space-y-4 text-sm">
            <li><a href="#catalogo" className="hover:text-white transition-colors">Catálogo</a></li>
            <li><a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a></li>
            <li><a href="#ubicacion" className="hover:text-white transition-colors">Ubicación</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Inicio</a></li>
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
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check if user is admin
        const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
        
        // Bootstrap the first admin if it's the owner email and doc doesn't exist
        if (!adminDoc.exists() && firebaseUser.email === "martinherickcahuanamendoza@gmail.com") {
          await setDoc(doc(db, 'admins', firebaseUser.uid), {
            email: firebaseUser.email,
            role: 'admin'
          });
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

  return (
    <div className="min-h-screen">
      <Navbar 
        user={user} 
        isAdmin={isAdmin} 
        onLogin={handleLogin} 
        onLogout={handleLogout}
        onOpenAdmin={() => setShowAdminPanel(true)}
        isLoading={isAuthLoading}
      />
      <main>
        <Hero onSearch={setSearchTerm} />
        <ProductCatalog 
          products={products} 
          loading={loading} 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
        />
        <Benefits />
        <LocalPresence />
        <SocialShare />
      </main>
      <Footer />
      <AIChatPlaceholder />

      <AnimatePresence>
        {showAdminPanel && isAdmin && (
          <AdminPanel 
            products={products} 
            onClose={() => setShowAdminPanel(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
