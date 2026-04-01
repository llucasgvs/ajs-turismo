import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso — AJS Turismo",
  description: "Termos e condições de uso do site e dos serviços da AJS Turismo.",
};

export default function TermosDeUso() {
  const updated = "31 de março de 2026";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-navy-700 transition-colors mb-8"
        >
          <ArrowLeft size={15} />
          Voltar para o início
        </Link>

        <h1 className="font-display font-black text-3xl sm:text-4xl text-navy-900 mb-2">
          Termos de Uso
        </h1>
        <p className="text-gray-400 text-sm mb-10">Última atualização: {updated}</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">1. Aceitação dos termos</h2>
            <p>
              Ao acessar e utilizar o site <span className="font-medium text-navy-700">ajsturismo.com.br</span>, você
              concorda com os presentes Termos de Uso. Caso não concorde com qualquer disposição, solicitamos que não
              utilize nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">2. Sobre a AJS Turismo</h2>
            <p>
              A AJS Turismo (CNPJ 28.702.277/0001-85) é uma agência de viagens sediada em Curitiba – PR, especializada
              em pacotes de turismo com saída de Curitiba e região. Nossos serviços incluem organização de viagens em
              grupo, reserva de hospedagem, transporte e roteiros turísticos.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">3. Cadastro e conta</h2>
            <p className="mb-3">Para realizar reservas é necessário criar uma conta. Você é responsável por:</p>
            <ul className="space-y-1.5">
              {[
                "Fornecer informações verdadeiras, completas e atualizadas",
                "Manter a confidencialidade de sua senha de acesso",
                "Todas as atividades realizadas com sua conta",
                "Notificar imediatamente em caso de uso não autorizado",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">4. Reservas e pagamentos</h2>
            <ul className="space-y-2">
              {[
                "As reservas realizadas pelo site têm caráter de interesse/solicitação e ficam sujeitas à confirmação da AJS Turismo.",
                "A confirmação da vaga ocorre após o pagamento do valor acordado, conforme combinado com nossa equipe via WhatsApp ou presencialmente.",
                "Os preços exibidos no site são por pessoa e podem ser alterados sem aviso prévio até a confirmação da reserva.",
                "Reservas confirmadas e pagas estão sujeitas à política de cancelamento descrita na seção 5.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">5. Cancelamento e reembolso</h2>
            <ul className="space-y-2">
              {[
                "Cancelamentos realizados com mais de 30 dias de antecedência: reembolso integral, descontadas taxas administrativas.",
                "Cancelamentos entre 15 e 30 dias: reembolso de 50% do valor pago.",
                "Cancelamentos com menos de 15 dias: sem reembolso, salvo casos de força maior devidamente comprovados.",
                "Em caso de cancelamento do pacote por parte da AJS Turismo, o valor pago será reembolsado integralmente.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-gray-500">
              Condições específicas de cada pacote podem variar. Consulte nossa equipe antes de confirmar.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">6. Responsabilidades</h2>
            <p className="mb-3">A AJS Turismo não se responsabiliza por:</p>
            <ul className="space-y-1.5">
              {[
                "Eventos de força maior como desastres naturais, greves ou pandemias que impeçam a realização da viagem",
                "Objetos pessoais perdidos ou danificados durante o translado",
                "Problemas de saúde do viajante não comunicados previamente à agência",
                "Alterações nos roteiros causadas por condições climáticas ou determinações de autoridades locais",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">7. Uso do site</h2>
            <p className="mb-3">É proibido utilizar este site para:</p>
            <ul className="space-y-1.5">
              {[
                "Qualquer finalidade ilegal ou não autorizada",
                "Transmitir conteúdo ofensivo, falso ou enganoso",
                "Tentar acessar sistemas ou dados que não são de sua propriedade",
                "Realizar scraping, coleta automatizada de dados ou sobrecarga dos servidores",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">8. Propriedade intelectual</h2>
            <p>
              Todo o conteúdo do site — incluindo textos, imagens, logotipos e código — é de propriedade da AJS Turismo
              ou de seus fornecedores, protegido pelas leis de propriedade intelectual. É proibida a reprodução sem
              autorização prévia e por escrito.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">9. Alterações nos termos</h2>
            <p>
              Podemos atualizar estes termos periodicamente. O uso continuado do site após as alterações implica na
              aceitação dos novos termos. A data da última atualização está sempre indicada no topo desta página.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">10. Foro e legislação</h2>
            <p>
              Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de Curitiba – PR para
              dirimir quaisquer controvérsias decorrentes deste instrumento.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 text-sm text-gray-400">
            AJS Turismo · Curitiba – PR · CNPJ: 28.702.277/0001-85 ·{" "}
            <a href="mailto:admin@ajsturismo.com.br" className="hover:text-gold-600 transition-colors">
              admin@ajsturismo.com.br
            </a>{" "}
            ·{" "}
            <Link href="/privacidade" className="hover:text-gold-600 transition-colors">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
