import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade — AJS Turismo",
  description: "Saiba como a AJS Turismo coleta, usa e protege seus dados pessoais.",
};

export default function PoliticaDePrivacidade() {
  const updated = "31 de março de 2025";

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
          Política de Privacidade
        </h1>
        <p className="text-gray-400 text-sm mb-10">Última atualização: {updated}</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">1. Quem somos</h2>
            <p>
              A <strong>AJS Turismo</strong> é uma agência de viagens com sede em Curitiba – PR. Operamos o site{" "}
              <span className="text-navy-700 font-medium">ajsturismo.com.br</span> e somos responsáveis pelo tratamento
              dos dados pessoais coletados através dele.
            </p>
            <p className="mt-2">
              Para dúvidas sobre esta política, entre em contato pelo e-mail{" "}
              <a href="mailto:admin@ajsturismo.com.br" className="text-gold-600 hover:underline">
                admin@ajsturismo.com.br
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">2. Dados que coletamos</h2>
            <p className="mb-3">Ao utilizar nosso site e realizar reservas, podemos coletar os seguintes dados:</p>
            <ul className="space-y-1.5">
              {[
                "Nome completo",
                "Endereço de e-mail",
                "Número de telefone / WhatsApp",
                "CPF (Cadastro de Pessoa Física)",
                "Data de nascimento",
                "Dados de acompanhantes informados no momento da reserva",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">3. Como usamos seus dados</h2>
            <p className="mb-3">Seus dados são utilizados exclusivamente para:</p>
            <ul className="space-y-1.5">
              {[
                "Processar e gerenciar sua reserva de viagem",
                "Entrar em contato sobre sua reserva via e-mail ou WhatsApp",
                "Enviar confirmações e atualizações sobre a viagem contratada",
                "Cumprir obrigações legais e fiscais relacionadas à prestação do serviço",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              <strong>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros</strong> para fins
              de marketing ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">4. Base legal (LGPD)</h2>
            <p>
              O tratamento dos seus dados é realizado com base nas seguintes hipóteses previstas na Lei Geral de
              Proteção de Dados (Lei nº 13.709/2018):
            </p>
            <ul className="space-y-1.5 mt-3">
              {[
                "Execução de contrato — para processar e executar a reserva de viagem",
                "Consentimento — quando você nos fornece dados voluntariamente ao se cadastrar",
                "Obrigação legal — quando necessário para cumprir obrigações fiscais ou regulatórias",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">5. Armazenamento e segurança</h2>
            <p>
              Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS) e em repouso.
              Utilizamos a plataforma <strong>Supabase</strong> (hospedada na AWS — região São Paulo) para gerenciar
              autenticação e banco de dados.
            </p>
            <p className="mt-2">
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não
              autorizado, perda ou destruição.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">6. Seus direitos</h2>
            <p className="mb-3">De acordo com a LGPD, você tem direito a:</p>
            <ul className="space-y-1.5">
              {[
                "Confirmar a existência de tratamento dos seus dados",
                "Acessar os dados que temos sobre você",
                "Corrigir dados incompletos, inexatos ou desatualizados",
                "Solicitar a exclusão dos seus dados (quando não houver obrigação legal de retenção)",
                "Revogar o consentimento a qualquer momento",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Para exercer qualquer um desses direitos, entre em contato pelo e-mail{" "}
              <a href="mailto:admin@ajsturismo.com.br" className="text-gold-600 hover:underline">
                admin@ajsturismo.com.br
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">7. Cookies</h2>
            <p>
              Utilizamos cookies estritamente necessários para manter sua sessão autenticada no site. Não
              utilizamos cookies de rastreamento ou publicidade de terceiros.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-navy-800 text-lg mb-3">8. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Alterações relevantes serão comunicadas pelo e-mail
              cadastrado. A data da última atualização está sempre indicada no topo desta página.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 text-sm text-gray-400">
            AJS Turismo · Curitiba – PR · CNPJ: 28.702.277/0001-85 ·{" "}
            <a href="mailto:admin@ajsturismo.com.br" className="hover:text-gold-600 transition-colors">
              admin@ajsturismo.com.br
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
