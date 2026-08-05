/**
 * Esqueletos de carregamento do painel.
 *
 * Por que não uma rodinha: a rodinha não tem forma, então o conteúdo some e
 * reaparece, e a página inteira dá um pulo quando os dados chegam. O esqueleto
 * ocupa o mesmo espaço do que vai entrar ali, então a tela nasce montada e só
 * troca cinza por número. Também comunica melhor: dá para ver que vem uma
 * lista de cinco linhas antes mesmo de ela existir.
 *
 * Regra ao usar: a altura do esqueleto tem que bater com a do conteúdo real,
 * senão o pulo continua, só que mais discreto.
 */

export function Skel({ className = "" }: { className?: string }) {
  return <span className={`block rounded-md bg-gray-200/70 animate-pulse ${className}`} aria-hidden="true" />;
}

/** Linhas de uma lista (ranking, alertas, agenda). */
export function SkelLinhas({ n = 5, altura = "h-11" }: { n?: number; altura?: string }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        // Larguras alternadas: bloco uniforme parece tabela travada, não carga.
        <Skel key={i} className={`${altura} ${i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-11/12" : "w-10/12"}`} />
      ))}
    </div>
  );
}

/** Barras de gráfico, com alturas variadas para não parecer um bloco só. */
export function SkelGrafico({ n = 12, altura = "h-40" }: { n?: number; altura?: string }) {
  const alturas = ["45%", "70%", "35%", "85%", "55%", "95%", "40%", "75%", "60%", "50%", "80%", "65%"];
  return (
    <div className={`flex items-end gap-1.5 ${altura}`} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-md bg-gray-200/70 animate-pulse"
          style={{ height: alturas[i % alturas.length] }}
        />
      ))}
    </div>
  );
}
