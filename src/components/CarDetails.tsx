import { useVehicle360 } from '../hooks/useVehicle360';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Calendar, Gauge, Settings, Fuel, 
  Check, Send, CheckCircle2, MapPin, Sparkles, MessageCircle,
  Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Info,
  X, Maximize2, ZoomIn, ZoomOut, AlertTriangle, XCircle,
  ShieldCheck, FileText, ChevronDown, ChevronUp, Camera, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, LeadMessage, } from '../types';
import { vehicle360Service } from '../services/vehicle360.service';
import { ClientPoiPanel } from './ClientPoiPanel';

const HOTSPOT_VISIBLE_RANGE = 2;

function isMarkerVisibleOnFrame(markerFrameIndex: number, currentFrame: number): boolean {
  const diff = Math.abs(currentFrame - markerFrameIndex);
  return diff <= HOTSPOT_VISIBLE_RANGE;
}

interface CarDetailsProps {
  car: Car;
  onBack: () => void;
  onSubmitLead: (lead: Omit<LeadMessage, 'id' | 'createdAt' | 'status'>) => void;
}


export default function CarDetails({ car, onBack, onSubmitLead }: CarDetailsProps) {
  const exterior360 = useVehicle360(car.id, 'public', 'exterior');
  const interior360 = useVehicle360(car.id, 'public', 'interior');
  const [activeImage, setActiveImage] = useState(car.images[0] || '');
  const galleryItems = [
    ...(exterior360.project?.status === 'completed' && exterior360.totalFrames > 0 ? [{ id: '360-exterior', type: '360', viewType: 'exterior' as const, label: '360° Externo', thumb: exterior360.project.frames![0].imageUrl }] : []),
    ...(interior360.project?.status === 'completed' && interior360.totalFrames > 0 ? [{ id: '360-interior', type: '360', viewType: 'interior' as const, label: '360° Interno', thumb: interior360.project.frames![0].imageUrl }] : []),
    ...car.images.map((img, idx) => ({ id: img, type: 'image', url: img, thumb: img }))
  ];
  const currentItem = galleryItems.find(item => item.id === activeImage) || galleryItems[0];
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadMessage, setLeadMessage] = useState(`Olá, tenho interesse neste ${car.brand} ${car.model} ${car.year}. Gostaria de receber um orçamento.`);
  
  const [activePoiTab, setActivePoiTab] = useState<'pois' | 'avarias'>('pois');

  // Lightbox for full-resolution photo inspection
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxPan, setLightboxPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingLightbox, setIsDraggingLightbox] = useState<boolean>(false);
  const lightboxDragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Car Photo Gallery Fullscreen Lightbox states
  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState<number | null>(null);
  const [galleryZoom, setGalleryZoom] = useState<number>(1);
  const [galleryPan, setGalleryPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingGallery, setIsDraggingGallery] = useState<boolean>(false);
  const galleryDragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartX = useRef<number | null>(null);

  

  // Global Keyboard listener to close modals/lightboxes and navigate gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
          setLightboxZoom(1);
          setLightboxPan({ x: 0, y: 0 });
        } else if (galleryLightboxIndex !== null) {
          setGalleryLightboxIndex(null);
          setGalleryZoom(1);
          setGalleryPan({ x: 0, y: 0 });
        }
      } else if (galleryLightboxIndex !== null && car.images && car.images.length > 0) {
        if (e.key === 'ArrowLeft') {
          setGalleryLightboxIndex(prev => prev !== null ? (prev - 1 + car.images.length) % car.images.length : 0);
          setGalleryZoom(1);
          setGalleryPan({ x: 0, y: 0 });
        } else if (e.key === 'ArrowRight') {
          setGalleryLightboxIndex(prev => prev !== null ? (prev + 1) % car.images.length : 0);
          setGalleryZoom(1);
          setGalleryPan({ x: 0, y: 0 });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, galleryLightboxIndex, car.images]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadPhone) return;

    onSubmitLead({
      carId: car.id,
      carTitle: `${car.brand} ${car.model}`,
      name: leadName,
      phone: leadPhone,
      email: leadEmail,
      message: leadMessage
    });

    setFormSubmitted(true);
    setTimeout(() => {
      setLeadName('');
      setLeadPhone('');
      setLeadEmail('');
      setFormSubmitted(false);
    }, 5000);
  };

  const handleWhatsAppInquiry = () => {
    // Analytics tracking counter simulation is handled in parent state
    const text = encodeURIComponent(`Olá Dourado Veículos! Vi o anúncio do ${car.brand} ${car.model} (${car.year}) no site e gostaria de solicitar um orçamento.`);
    window.open(`https://wa.me/5511987654321?text=${text}`, '_blank');
  };

  // Hotspots definitions
  const hotspots = [
    {
      id: 'motor',
      top: '32%',
      left: '26%',
      title: 'Motorização Turbo',
      desc: 'Motor Turbo de alta eficiência que combina excelente torque com baixo consumo de combustível.',
    },
    {
      id: 'farol',
      top: '44%',
      left: '12%',
      title: 'Faróis Full LED',
      desc: 'Conjunto óptico em LED com projetores originais para máxima visibilidade e estilo moderno.',
    },
    {
      id: 'interior',
      top: '38%',
      left: '52%',
      title: 'Interior Premium',
      desc: 'Acabamento requintado, central multimídia flutuante integrada e bancos com costura dupla.',
    },
    {
      id: 'roda',
      top: '72%',
      left: '22%',
      title: 'Rodas de Liga Leve',
      desc: 'Rodas esportivas de liga leve diamantadas, sem riscos ou amassados, com pneus excelentes.',
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      
      {/* Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-red-600 font-semibold transition-colors text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Estoque</span>
          </button>
          <div className="text-xs text-slate-400">
            Estoque &gt; {car.brand} &gt; <span className="text-slate-600 font-medium">{car.model}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        
        {/* Core Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Images and Gallery */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Primary Display image with Fullscreen Lightbox trigger */}
            <div 
              onClick={() => {
                const idx = car.images.indexOf(activeImage);
                setGalleryLightboxIndex(idx >= 0 ? idx : 0);
                setGalleryZoom(1);
                setGalleryPan({ x: 0, y: 0 });
              }}
              className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 shadow-md aspect-video relative flex items-center justify-center cursor-pointer group select-none"
            >
              
              <AnimatePresence mode="wait">
                {currentItem?.type === '360' ? (
                  <motion.div
                    key={currentItem.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0"
                  >
                    <ClientPoiPanel vehicleId={car.id} viewType={(currentItem as any).viewType} embedded={true} />
                  </motion.div>
                ) : (
                  <motion.img
                    key={currentItem?.id || 'default'}
                    src={(currentItem as any)?.url || car.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'}
                    alt={car.model}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    referrerPolicy="no-referrer"
                  />
                )}
              </AnimatePresence>


              {/* Hover overlay prompt */}
              <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 text-white font-bold text-xs border border-slate-700/60 shadow-2xl">
                  <Maximize2 className="w-4 h-4 text-red-500" />
                  <span>Clique para ampliar em Tela Cheia</span>
                </div>
              </div>
              
              {car.isSold && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                  <div className="bg-slate-900 text-white font-extrabold px-6 py-3 rounded-2xl text-xl uppercase tracking-widest shadow-lg">
                    Veículo Reservado / Vendido
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail collection */}
            {car.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {galleryItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (item.type === 'image') { setGalleryLightboxIndex(car.images.indexOf((item as any).url!)); } setActiveImage(item.id);
                      setGalleryZoom(1);
                      setGalleryPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 group ${
                      activeImage === item.id ? 'border-red-600 shadow-md ring-2 ring-red-600/30' : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={item.thumb} alt={`Thumb ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Primary purchase and actions card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              {/* Titles */}
              <div>
                <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  {car.category}
                </span>
                <h1 className="font-extrabold text-3xl text-slate-900 tracking-tight mt-2.5">
                  {car.brand} {car.model}
                </h1>
                <p className="text-slate-500 font-medium text-sm mt-1">{car.version}</p>
              </div>

              {/* Price display replaced with quote request callout */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Disponível para Orçamento
                </span>
                <span className="text-2xl font-black text-slate-900 tracking-tight block">
                  Preço sob Consulta
                </span>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  Entrada facilitada e financiamento sob medida. Solicite sua cotação personalizada hoje mesmo.
                </p>
              </div>

              {/* Quick Specs parameters */}
              <div className="grid grid-cols-2 gap-4 text-sm font-medium text-slate-700">
                <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Calendar className="w-4 h-4 text-red-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold leading-none mb-0.5">Ano</span>
                    <span>{car.year}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Gauge className="w-4 h-4 text-red-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold leading-none mb-0.5">Quilometragem</span>
                    <span>{car.km === 0 ? 'Zero km' : car.km.toLocaleString('pt-BR') + ' km'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Settings className="w-4 h-4 text-red-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold leading-none mb-0.5">Câmbio</span>
                    <span>{car.gearbox}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Fuel className="w-4 h-4 text-red-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold leading-none mb-0.5">Combustível</span>
                    <span>{car.fuel}</span>
                  </div>
                </div>
              </div>

              {/* Instant CTAs */}
              <div className="space-y-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleWhatsAppInquiry}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>Negociar no WhatsApp</span>
                </motion.button>

                <a
                  href="#proposta-form"
                  className="w-full py-3.5 border-2 border-slate-200 hover:border-slate-800 text-slate-800 hover:text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center transition-all cursor-pointer text-center bg-white"
                >
                  Enviar Proposta por E-mail
                </a>
              </div>
            </div>
          </div>
        </div>

        

        {/* Content sections: About, Features & Technical Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: About & Itens de Serie */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Description Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-xl text-slate-900">Sobre este Veículo</h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {car.description}
              </p>
            </div>

            {/* Features (Itens de serie) */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-extrabold text-xl text-slate-900">Itens de Série &amp; Acessórios</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {car.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-slate-700 text-sm">
                    <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span className="font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Ficha tecnica & Proposal Form */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Technical spec card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
              <h3 className="font-extrabold text-lg text-slate-900">Ficha Técnica</h3>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Cor</span>
                  <span className="font-bold text-slate-800">{car.color}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Final da Placa</span>
                  <span className="font-bold text-slate-800">{car.plateEnd}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Motor</span>
                  <span className="font-bold text-slate-800">1.0 / 2.0 Turbo</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Portas</span>
                  <span className="font-bold text-slate-800">4 Portas</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Procedência</span>
                  <span className="font-bold text-emerald-600">Laudo Cautelar Aprovado</span>
                </div>
              </div>
            </div>

            {/* Lead contact proposal form */}
            <div id="proposta-form" className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
              
              <h3 className="font-bold text-lg text-white mb-2">Simular Financiamento ou Proposta</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Envie seus dados e nossos especialistas entrarão em contato para simular parcelas ou agendar o test-drive.
              </p>

              {formSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-800/80 p-6 rounded-xl border border-emerald-500/20 text-center space-y-4"
                >
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Proposta Recebida!</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Obrigado. Salvamos sua proposta com sucesso no painel administrativo e um consultor entrará em contato via WhatsApp/E-mail em breve.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-semibold">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 font-semibold">WhatsApp / Telefone</label>
                      <input
                        type="tel"
                        required
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 font-semibold">E-mail</label>
                      <input
                        type="email"
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-semibold">Sua Mensagem</label>
                    <textarea
                      rows={3}
                      value={leadMessage}
                      onChange={(e) => setLeadMessage(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all resize-none"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Proposta</span>
                  </motion.button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX WITH ZOOM & PAN */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            className="fixed inset-0 z-60 bg-black/95 backdrop-blur-2xl flex items-center justify-center select-none"
            onClick={() => {
              setLightboxImage(null);
              setLightboxZoom(1);
              setLightboxPan({ x: 0, y: 0 });
            }}
          >
            {/* Top Toolbar */}
            <div 
              className="absolute top-4 right-4 z-70 flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxZoom(prev => Math.min(prev + 0.5, 3))}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightboxZoom(prev => {
                    const n = Math.max(prev - 0.5, 1);
                    if (n === 1) setLightboxPan({ x: 0, y: 0 });
                    return n;
                  });
                }}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Reduzir Zoom"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightboxZoom(1);
                  setLightboxPan({ x: 0, y: 0 });
                }}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Resetar Zoom"
              >
                100%
              </button>
              <div className="w-px h-5 bg-slate-800 my-auto" />
              <button
                type="button"
                onClick={() => {
                  setLightboxImage(null);
                  setLightboxZoom(1);
                  setLightboxPan({ x: 0, y: 0 });
                }}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Fechar (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Stage */}
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4"
              onWheel={(e) => {
                e.stopPropagation();
                if (e.deltaY < 0) {
                  setLightboxZoom(prev => Math.min(prev + 0.25, 3));
                } else {
                  setLightboxZoom(prev => {
                    const n = Math.max(prev - 0.25, 1);
                    if (n === 1) setLightboxPan({ x: 0, y: 0 });
                    return n;
                  });
                }
              }}
              onMouseDown={(e) => {
                if (lightboxZoom > 1) {
                  e.stopPropagation();
                  setIsDraggingLightbox(true);
                  lightboxDragStart.current = { x: e.clientX - lightboxPan.x, y: e.clientY - lightboxPan.y };
                }
              }}
              onMouseMove={(e) => {
                if (isDraggingLightbox && lightboxZoom > 1) {
                  e.stopPropagation();
                  setLightboxPan({
                    x: e.clientX - lightboxDragStart.current.x,
                    y: e.clientY - lightboxDragStart.current.y
                  });
                }
              }}
              onMouseUp={() => setIsDraggingLightbox(false)}
              onMouseLeave={() => setIsDraggingLightbox(false)}
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={lightboxImage} 
                alt="Detalhe em Tela Cheia"
                style={{
                  transform: `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`,
                  transition: isDraggingLightbox ? 'none' : 'transform 0.15s ease-out'
                }}
                className="max-w-full max-h-full object-contain select-none pointer-events-auto shadow-2xl rounded-lg"
                draggable={false}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN VEHICLE GALLERY LIGHTBOX */}
      <AnimatePresence>
        {galleryLightboxIndex !== null && car.images && car.images.length > 0 && (
          <div 
            className="fixed inset-0 z-60 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-3 sm:p-6 select-none"
            onClick={() => {
              setGalleryLightboxIndex(null);
              setGalleryZoom(1);
              setGalleryPan({ x: 0, y: 0 });
            }}
          >
            {/* Top Toolbar */}
            <div 
              className="w-full flex items-center justify-between z-70 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 px-4 py-2.5 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Counter */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                  {car.brand} {car.model}
                </span>
                <span className="text-xs font-mono font-bold text-red-500 bg-red-950/80 border border-red-800/60 px-2.5 py-0.5 rounded-full">
                  {galleryLightboxIndex + 1} / {car.images.length}
                </span>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setGalleryZoom(prev => Math.min(prev + 0.5, 3))}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGalleryZoom(prev => {
                      const n = Math.max(prev - 0.5, 1);
                      if (n === 1) setGalleryPan({ x: 0, y: 0 });
                      return n;
                    });
                  }}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Reduzir Zoom"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGalleryZoom(1);
                    setGalleryPan({ x: 0, y: 0 });
                  }}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer hidden sm:block"
                  title="Resetar Zoom"
                >
                  100%
                </button>
                <div className="w-px h-5 bg-slate-800 my-auto" />
                <button
                  type="button"
                  onClick={() => {
                    setGalleryLightboxIndex(null);
                    setGalleryZoom(1);
                    setGalleryPan({ x: 0, y: 0 });
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Fechar (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Stage with Navigation Chevrons */}
            <div className="relative flex-1 w-full flex items-center justify-center my-2 overflow-hidden">
              {/* Previous Image Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryLightboxIndex(prev => prev !== null ? (prev - 1 + car.images.length) % car.images.length : 0);
                  setGalleryZoom(1);
                  setGalleryPan({ x: 0, y: 0 });
                }}
                className="absolute left-2 sm:left-4 z-70 p-3.5 bg-slate-900/80 hover:bg-red-600 text-white border border-slate-700/80 rounded-2xl shadow-2xl transition-all cursor-pointer active:scale-95"
                title="Imagem Anterior (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Main Image Stage */}
              <div 
                className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-2"
                onTouchStart={(e) => {
                  touchStartX.current = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  if (touchStartX.current !== null) {
                    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
                    if (deltaX > 50) {
                      setGalleryLightboxIndex(prev => prev !== null ? (prev - 1 + car.images.length) % car.images.length : 0);
                      setGalleryZoom(1);
                      setGalleryPan({ x: 0, y: 0 });
                    } else if (deltaX < -50) {
                      setGalleryLightboxIndex(prev => prev !== null ? (prev + 1) % car.images.length : 0);
                      setGalleryZoom(1);
                      setGalleryPan({ x: 0, y: 0 });
                    }
                    touchStartX.current = null;
                  }
                }}
                onWheel={(e) => {
                  e.stopPropagation();
                  if (e.deltaY < 0) {
                    setGalleryZoom(prev => Math.min(prev + 0.25, 3));
                  } else {
                    setGalleryZoom(prev => {
                      const n = Math.max(prev - 0.25, 1);
                      if (n === 1) setGalleryPan({ x: 0, y: 0 });
                      return n;
                    });
                  }
                }}
                onMouseDown={(e) => {
                  if (galleryZoom > 1) {
                    e.stopPropagation();
                    setIsDraggingGallery(true);
                    galleryDragStart.current = { x: e.clientX - galleryPan.x, y: e.clientY - galleryPan.y };
                  }
                }}
                onMouseMove={(e) => {
                  if (isDraggingGallery && galleryZoom > 1) {
                    e.stopPropagation();
                    setGalleryPan({
                      x: e.clientX - galleryDragStart.current.x,
                      y: e.clientY - galleryDragStart.current.y
                    });
                  }
                }}
                onMouseUp={() => setIsDraggingGallery(false)}
                onMouseLeave={() => setIsDraggingGallery(false)}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.img 
                  key={galleryLightboxIndex}
                  src={car.images[galleryLightboxIndex]} 
                  alt={`${car.brand} ${car.model} - foto ${galleryLightboxIndex + 1}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    transform: `translate(${galleryPan.x}px, ${galleryPan.y}px) scale(${galleryZoom})`,
                    transition: isDraggingGallery ? 'none' : 'transform 0.15s ease-out'
                  }}
                  className="max-w-full max-h-full object-contain select-none pointer-events-auto shadow-2xl rounded-2xl"
                  draggable={false}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Next Image Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryLightboxIndex(prev => prev !== null ? (prev + 1) % car.images.length : 0);
                  setGalleryZoom(1);
                  setGalleryPan({ x: 0, y: 0 });
                }}
                className="absolute right-2 sm:right-4 z-70 p-3.5 bg-slate-900/80 hover:bg-red-600 text-white border border-slate-700/80 rounded-2xl shadow-2xl transition-all cursor-pointer active:scale-95"
                title="Próxima Imagem (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Thumbnails Strip */}
            <div 
              className="w-full max-w-4xl mx-auto z-70 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-2 sm:p-3 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin py-0.5 px-1">
                {galleryItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (item.type === 'image') { setGalleryLightboxIndex(car.images.indexOf((item as any).url)); }
                      setActiveImage(item.id);
                      setGalleryZoom(1);
                      setGalleryPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-16 sm:w-20 aspect-video rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeImage === item.id || (!activeImage && idx === 0) ? 'border-red-500 scale-105 shadow-lg ring-2 ring-red-500/50' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={item.thumb} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {item.type === '360' && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><RotateCcw className="w-5 h-5 text-white" /></div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* POI High-Resolution Photo Viewer Modal */}
    </div>
  );
}
