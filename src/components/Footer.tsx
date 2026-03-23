import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Mail, Instagram, Facebook, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10">
                <Image src="/icon_ajs.png" alt="AJS Turismo" fill className="object-contain" />
              </div>
              <div>
                <span className="font-display font-black text-white text-xl">AJS</span>
                <span className="text-gold-400 text-xs block font-semibold tracking-[0.2em] uppercase -mt-1">Turismo</span>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-5">
              Transformando sonhos em viagens inesquecíveis desde 2016. Confiança,
              qualidade e o melhor preço do mercado.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {[
                { Icon: Instagram, href: "https://instagram.com/ajsturismooficial", label: "Instagram" },
                { Icon: Facebook, href: "https://www.facebook.com/ajsturismo", label: "Facebook" },
                { Icon: Youtube, href: "https://www.youtube.com/@ajsturismo", label: "YouTube" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 bg-white/10 hover:bg-gold-500 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Navegação</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Destinos", href: "#destinos" },
                { label: "Pacotes", href: "#pacotes" },
                { label: "Como Funciona", href: "#como-funciona" },
                { label: "Depoimentos", href: "#depoimentos" },
                { label: "Contato", href: "#contato" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-white/50 hover:text-gold-400 text-sm transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Minha Conta</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Criar conta", href: "/cadastro" },
                { label: "Fazer login", href: "/login" },
                { label: "Minhas viagens", href: "/dashboard" },
                { label: "Minhas reservas", href: "/dashboard/reservas" },
                { label: "Política de privacidade", href: "/privacidade" },
                { label: "Termos de uso", href: "/termos" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-white/50 hover:text-gold-400 text-sm transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin size={15} className="text-gold-400 flex-shrink-0 mt-0.5" />
                <span className="text-white/50 text-sm">
                  Rua Pedro Spisla Filho, 215 — Santa Cândida<br />
                  Curitiba, PR
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="text-gold-400 flex-shrink-0" />
                <a href="https://wa.me/5541998348766?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20AJS%20Turismo%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida." target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-gold-400 text-sm transition-colors">
                  (41) 99834-8766
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={15} className="text-gold-400 flex-shrink-0" />
                <a href="mailto:ajsturismooficial@gmail.com" className="text-white/50 hover:text-gold-400 text-sm transition-colors">
                  ajsturismooficial@gmail.com
                </a>
              </li>
            </ul>

            <div className="mt-5 p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-white/40 mb-0.5">Horário de atendimento</p>
              <p className="text-sm text-white/70 font-medium">Seg–Sáb: 8h às 20h</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs text-center md:text-left">
            © {new Date().getFullYear()} AJS Turismo. Todos os direitos reservados.
            CNPJ: 28.702.277/0001-85
          </p>
          <div className="flex items-center gap-4 text-white/30 text-xs">
            <span>Cadastur: 28.702.277/0001-85</span>
            <span>·</span>
            <Link href="/privacidade" className="hover:text-gold-400 transition-colors">
              Privacidade
            </Link>
            <span>·</span>
            <Link href="/termos" className="hover:text-gold-400 transition-colors">
              Termos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
