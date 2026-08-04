/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Endereços do SITE ANTIGO que continuam indexados no Google e caíam em 404.
 * Medido no Search Console em 04/08/2026: 205 impressões e 3 cliques por semana
 * indo para erro.
 *
 * Cada um aponta para o equivalente mais próximo de hoje, nunca para a home por
 * preguiça: redirecionamento irrelevante é tratado pelo Google como página
 * inexistente e joga fora o valor de posicionamento já conquistado.
 *
 * O destino de cada linha foi verificado respondendo 200 antes de entrar aqui.
 * `permanent: true` devolve 308, que o Google trata igual a 301.
 */
const redirecionamentosSiteAntigo = [
  // Reservas antigas -> o roteiro equivalente de hoje
  { de: "/reservas/parque-aquatico-cascaneia/:resto*", para: "/viagens/cascaneia-sc" },
  { de: "/reservas/poco-de-caldas-mg/:resto*", para: "/viagens/pocos-de-caldas-mg" },
  { de: "/reservas/thermas-de-jurema/:resto*", para: "/viagens/jurema-aguas-quentes-resort-pr" },
  { de: "/reservas/thermas-de-maestro-francisco-beltrao/:resto*", para: "/viagens/termas-de-maestro-pr" },
  { de: "/reservas/parque-beto-carreiro/:resto*", para: "/viagens/beto-carrero-world-sc" },
  { de: "/reservas/hotel-fazzenda-park-gaspar-all-inclusive/:resto*", para: "/viagens/hotel-fazzenda-park-gaspar-sc" },

  // Páginas institucionais antigas
  { de: "/page/privacy", para: "/privacidade" },
  { de: "/contato", para: "/#contato" },
  { de: "/excursoes", para: "/viagens" },
  // MAPEADO: hoje vai para a home, que tem o conteúdo institucional (10 anos,
  // desde 2016, por que reservar). São 117 impressões/semana, a maior de todas:
  // se um dia existir uma página "Quem somos" de verdade, trocar o destino aqui.
  { de: "/page/quemsomos", para: "/" },

  // Varredura para o que não está mapeado acima (a exportação só traz as URLs
  // com impressão na semana). Nenhuma rota atual começa com /reservas ou /page,
  // então não há risco de capturar endereço válido.
  { de: "/reservas/:resto*", para: "/viagens" },
  { de: "/page/:resto*", para: "/" },
];

const nextConfig = {
  async redirects() {
    return redirecionamentosSiteAntigo.map(({ de, para }) => ({
      source: de,
      destination: para,
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
