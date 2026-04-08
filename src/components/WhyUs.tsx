import { Shield, Headphones, CreditCard, Award, Map, Heart } from "lucide-react";

const reasons = [
  {
    icon: Shield,
    title: "Segurança Garantida",
    description: "Empresa registrada e regularizada com mais de 10 anos no mercado. Sua viagem está em boas mãos.",
    color: "text-navy-600",
    bg: "bg-navy-50",
  },
  {
    icon: Headphones,
    title: "Suporte 24h",
    description: "Nossa equipe está disponível durante toda a sua viagem para qualquer emergência ou dúvida.",
    color: "text-gold-600",
    bg: "bg-gold-50",
  },
  {
    icon: CreditCard,
    title: "Melhores Preços",
    description: "Parcelamos em até 12x sem juros. Aceitamos PIX, cartão de crédito e débito. Desconto no boleto.",
    color: "text-navy-600",
    bg: "bg-navy-50",
  },
  {
    icon: Award,
    title: "Qualidade Comprovada",
    description: "Nota 4.9/5 nas avaliações de clientes. Mais de 16.000 famílias atendidas com excelência.",
    color: "text-gold-600",
    bg: "bg-gold-50",
  },
  {
    icon: Map,
    title: "Roteiros Exclusivos",
    description: "Roteiros cuidadosamente planejados para você aproveitar cada momento sem preocupações.",
    color: "text-navy-600",
    bg: "bg-navy-50",
  },
  {
    icon: Heart,
    title: "Atendimento Humano",
    description: "Nada de robôs! Nossos consultores reais entendem o que você precisa e criam a viagem perfeita.",
    color: "text-gold-600",
    bg: "bg-gold-50",
  },
];

export default function WhyUs() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container-custom">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="badge mb-4">Por que a AJS?</div>
            <h2 className="section-title mb-4 lg:mx-0">
              Viajar Bem é{" "}
              <span className="text-gold-500">Nossa Missão</span>
            </h2>
            <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Não somos apenas uma agência de viagens. Somos apaixonados por proporcionar
              experiências únicas e inesquecíveis para cada cliente. Desde 2016 transformando
              sonhos em realidade.
            </p>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto lg:mx-0">
              {[
                { value: "10+", label: "Anos de mercado" },
                { value: "5k+", label: "Viajantes" },
                { value: "4.9★", label: "Avaliação" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center lg:text-left">
                  <p className="font-display font-black text-2xl text-navy-700">{value}</p>
                  <p className="text-gray-500 text-xs">{label}</p>
                </div>
              ))}
            </div>

            <a
              href="https://wa.me/5541998348766?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20AJS%20Turismo%20e%20gostaria%20de%20falar%20com%20um%20especialista%20em%20viagens."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              Falar com um Especialista
            </a>
          </div>

          {/* Right grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {reasons.map(({ icon: Icon, title, description, color, bg }) => (
              <div
                key={title}
                className="group p-5 rounded-2xl border border-gray-100 hover:border-navy-200 hover:shadow-card transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={20} className={color} />
                </div>
                <h3 className="font-bold text-navy-700 text-sm mb-1.5">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
