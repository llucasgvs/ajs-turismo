"use client";

/* Galeria e compartilhar, usados pela página de viagem E pela de combo.
 *
 * Estavam dentro de TripDetailClient. Saíram para cá quando o combo passou a
 * usar o mesmo template: duas cópias da galeria significariam dois lugares para
 * corrigir quando o zoom, o teclado ou o gesto de arrastar tivessem que mudar.
 *
 * Nada aqui foi alterado na mudança, só movido. */

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Camera, Share2, CheckCheck } from "lucide-react";
import { imgOtim } from "@/lib/imagem";

export function GalleryModal({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % images.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-white/60 text-sm font-medium">{idx + 1} / {images.length}</span>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center relative px-14 min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async" src={imgOtim(images[idx], 2048, 100)} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        {images.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors">
              <ChevronLeft size={22} />
            </button>
            <button onClick={() => setIdx(i => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors">
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0">
          {images.map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === idx ? "border-gold-400" : "border-white/20 opacity-60 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={imgOtim(img, 128, 85)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   2. Photo Grid (Airbnb-style)
═══════════════════════════════════════════ */
export function PhotoGrid({ images, onOpen }: { images: string[]; onOpen: (idx: number) => void }) {
  if (images.length === 0) return <div className="w-full h-72 sm:h-[480px] bg-navy-800 rounded-2xl" />;

  return (
    <div className="relative">
      {/* Mobile: single large image */}
      <div className="sm:hidden relative h-72 rounded-2xl overflow-hidden cursor-pointer" onClick={() => onOpen(0)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async" src={imgOtim(images[0], 828, 90)} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(0); }}
            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-navy-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow"
          >
            <Camera size={12} /> Ver {images.length} fotos
          </button>
        )}
      </div>

      {/* Desktop: 1 large + up to 4 small grid */}
      <div className="hidden sm:grid grid-cols-4 grid-rows-2 gap-2 h-[480px] rounded-2xl overflow-hidden">
        {/* Large left */}
        <div className="col-span-2 row-span-2 relative cursor-pointer overflow-hidden" onClick={() => onOpen(0)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src={imgOtim(images[0], 1200, 90)} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        </div>
        {/* 4 small right - fill with placeholders if < 5 images */}
        {[1, 2, 3, 4].map((pos) => {
          const img = images[pos];
          const isLast = pos === 4 && images.length > 5;
          return img ? (
            <div key={pos} className="relative cursor-pointer overflow-hidden" onClick={() => onOpen(pos)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={imgOtim(img, 640, 85)} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              {isLast && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">+{images.length - 5}</span>
                </div>
              )}
            </div>
          ) : (
            <div key={pos} className="bg-navy-100" />
          );
        })}
      </div>

      {/* "Ver todas as fotos" overlay button */}
      {images.length > 1 && (
        <button
          onClick={() => onOpen(0)}
          className="hidden sm:flex absolute bottom-3 right-3 items-center gap-2 bg-white text-navy-800 text-sm font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-[color,background-color,border-color,box-shadow,transform,opacity] border border-gray-200"
        >
          <Camera size={14} /> Ver todas as fotos
        </button>
      )}
    </div>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {});
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-gray-500 hover:text-navy-700 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
    >
      {copied
        ? <><CheckCheck size={15} className="text-emerald-500" /><span className="text-emerald-600">Link copiado!</span></>
        : <><Share2 size={15} /><span>Compartilhar</span></>
      }
    </button>
  );
}

