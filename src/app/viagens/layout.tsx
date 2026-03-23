import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Viagens — AJS Turismo",
  description:
    "Explore todos os pacotes de viagem da AJS Turismo. Destinos nacionais com saída de Curitiba, preços acessíveis e atendimento personalizado.",
  openGraph: {
    title: "Viagens — AJS Turismo",
    description:
      "Pacotes de viagem nacionais saindo de Curitiba. Os melhores destinos com preço justo.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function ViagensLayout({ children }: { children: React.ReactNode }) {
  return children;
}
