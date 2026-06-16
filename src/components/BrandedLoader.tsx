import Image from "next/image";

/**
 * Loader padrão da marca: overlay full-screen com a logo da AJS pulsando + spinner
 * dourado. Usado em transições/carregamentos relevantes (login, abrir reserva,
 * carregar checkout) para uma experiência consistente em vez de spinners genéricos.
 */
export function BrandedLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ backgroundColor: "rgba(15, 23, 60, 0.55)", backdropFilter: "blur(4px)" }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Logo animada */}
        <div className="relative w-16 h-16 animate-pulse">
          <Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" priority />
        </div>

        {/* Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gold-400 animate-spin" />
        </div>

        {label && <p className="text-white/80 text-sm font-medium tracking-wide">{label}</p>}
      </div>
    </div>
  );
}
