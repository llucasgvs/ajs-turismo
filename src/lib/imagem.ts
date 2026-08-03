/**
 * Passa a foto pelo otimizador da Vercel, mantendo a mesma tag <img>.
 *
 * Só o texto do src muda: nenhuma classe, contêiner ou dimensão é tocada, então
 * o layout não tem como mudar. O ganho é duplo: a Vercel entrega WebP/AVIF no
 * tamanho em que a foto realmente aparece, e responde com cache de 1 ano, que é
 * o cabeçalho que o Supabase se recusa a mandar.
 *
 * Regra de segurança: só reescreve host que já está liberado no next.config
 * (remotePatterns). Qualquer outra coisa volta intacta, porque o /_next/image
 * responde 400 para host não liberado e a foto quebraria na tela.
 */

// Larguras aceitas pelo Next (imageSizes + deviceSizes padrão). Pedir outra
// dá 400 e a foto some da tela, por isso a lista é fechada. Testadas uma a uma
// contra o otimizador em produção.
const LARGURAS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

// Precisa bater com o remotePatterns do next.config.js.
const HOSTS_LIBERADOS = /(^|\.)supabase\.co$|(^|\.)unsplash\.com$/i;

export function imgOtim(url?: string | null, largura = 828, qualidade = 85): string {
  const u = (url ?? "").trim();
  if (!u) return u;
  try {
    // Relativa, data: ou blob: não passam pelo otimizador.
    if (!/^https?:\/\//i.test(u)) return u;
    if (!HOSTS_LIBERADOS.test(new URL(u).hostname)) return u;
  } catch {
    return u; // URL malformada: devolve como veio, nunca quebra a renderização
  }
  const w = LARGURAS.find((x) => x >= largura) ?? LARGURAS[LARGURAS.length - 1];
  const q = Math.min(100, Math.max(1, Math.round(qualidade)));
  return `/_next/image?url=${encodeURIComponent(u)}&w=${w}&q=${q}`;
}
