/**
 * Guias de "Dicas de viagem" (/dicas/ilha-do-mel...).
 *
 * O guia é LEITURA, não catálogo: responde quem pesquisa "como chegar na Ilha
 * do Mel" e leva para a página da viagem, onde está o que se compra. Regras do
 * dono, para o guia nunca ficar velho nem contradizer a viagem:
 *   - sem preço, data, horário ou valor de terceiros (balsa, taxa...);
 *   - sem ano, temporada ou evento datado;
 *   - nada sobre o que a excursão inclui: isso mora no cadastro da viagem.
 * Um guia por destino, completo, em vez de vários artigos pequenos.
 */

export type Foto = {
  url: string;
  alt: string;
  /** Ponto da foto que fica à vista no recorte deitado (CSS object-position).
   *  Útil em foto vertical, para não cortar o que importa. */
  enquadramento?: string;
  /** Foto em pé: aparece inteira, num quadro vertical, em vez de recortada. */
  vertical?: boolean;
  /** Texto curto embaixo da foto. */
  legenda?: string;
};

export type Secao = {
  titulo: string;
  paragrafos: string[];
  lista?: string[];
  /** Como a AJS faz na prática: vira um quadro destacado na seção. */
  experiencia?: string;
  foto?: Foto;
};

export type Dica = {
  slug: string;
  destino: string;
  /** Título e descrição no Google. */
  tituloGoogle: string;
  descricaoGoogle: string;
  titulo: string;
  subtitulo: string;
  /** Resposta direta logo no topo: é o trecho que o Google e as IAs recortam. */
  resumo: string;
  capa: Foto;
  secoes: Secao[];
  perguntas: { pergunta: string; resposta: string }[];
  /** Roteiros que levam a este destino. O primeiro é o destino do botão
   *  "Ver datas e preços"; todos ganham o link para o guia na página. */
  roteiros: string[];
  /** Linha discreta na página da viagem, logo depois das perguntas. */
  chamadaNaViagem: string;
  /** Datas só nos dados para o Google (não aparecem na tela, para o guia
   *  não parecer velho). AAAA-MM-DD. */
  escritoEm: string;
  atualizadoEm: string;
};

const FOTO = "https://nyshdnbacdtztjvptfkf.supabase.co/storage/v1/object/public/viagens/trips/";

export const DICAS: Dica[] = [
  {
    slug: "ilha-do-mel",
    destino: "Ilha do Mel",
    tituloGoogle: "Ilha do Mel: como chegar, o que levar e melhores praias",
    descricaoGoogle:
      "Guia da Ilha do Mel saindo de Curitiba: como chegar, Encantadas ou Nova Brasília, o que ver, o que levar e a melhor época para ir.",
    titulo: "Guia da Ilha do Mel",
    subtitulo: "Como chegar, qual vila escolher, o que ver e o que levar para aproveitar a ilha mais famosa do Paraná.",
    resumo:
      "A Ilha do Mel fica no litoral do Paraná, na entrada da Baía de Paranaguá. Não tem carros nem ruas asfaltadas: o acesso é só de barco, saindo de Pontal do Sul, e dentro da ilha tudo se faz a pé, pela areia e por trilhas. É o destino de praia e natureza mais procurado por quem sai de Curitiba.",
    capa: { url: `${FOTO}ec086c55-efcc-4651-938b-dfa070058f9c.webp`, alt: "Farol das Conchas no alto do morro, com a praia e o mar da Ilha do Mel ao fundo" },
    secoes: [
      {
        titulo: "Onde fica a Ilha do Mel",
        paragrafos: [
          "A ilha pertence ao município de Paranaguá e fica bem na entrada da baía, de frente para o mar aberto. A maior parte do território é área de preservação ambiental, e é isso que mantém a ilha do jeito que ela é: mata nativa, praias sem prédios e vilarejos pequenos.",
          "Como os carros não circulam, o ritmo é outro. Você anda descalço na areia, cruza trilhas no meio da Mata Atlântica e escolhe a praia pelo caminho.",
        ],
        foto: { url: `${FOTO}7aa62c62-a408-46d6-9c25-dce56e3c437b.jpg`, alt: "Vista aérea da Ilha do Mel com o Farol das Conchas, praias e a mata da ilha" },
      },
      {
        titulo: "Como chegar saindo de Curitiba",
        paragrafos: [
          "O caminho tem duas partes. Primeiro, a estrada de Curitiba até Pontal do Sul, no município de Pontal do Paraná, em torno de duas horas dependendo do trânsito. Depois, uma travessia curta de barco até a ilha.",
          "Os barcos saem de Pontal do Sul para as duas vilas da ilha, Nova Brasília e Encantadas. Também há barcos saindo de Paranaguá, mas a viagem pela baía é mais longa.",
          "Indo em excursão, você não precisa se preocupar com estrada, estacionamento nem travessia: o grupo chega junto e volta junto.",
        ],
      },
      {
        titulo: "Encantadas ou Nova Brasília?",
        paragrafos: [
          "A ilha tem duas vilas principais, cada uma com o seu jeito. Elas ficam distantes uma da outra a pé, então vale saber o que tem em cada lado.",
        ],
        lista: [
          "Encantadas: no sul da ilha, com mais estrutura e restaurantes à beira-mar. É onde ficam a famosa Gruta das Encantadas, a Praia de Fora e a Praia do Miguel.",
          "Nova Brasília: o lado das aventuras. Fica perto do Farol das Conchas, da Praia do Farol e da Praia Grande, e é o ponto de partida para a caminhada até a Fortaleza.",
          "Entre as duas: dá para atravessar pela trilha da costa, uma caminhada de algumas horas por praias e costões, ou de barco.",
        ],
        experiencia:
          "Com o grupo da AJS, a gente conhece os dois lados da ilha. Primeiro Encantadas, que tem mais estrutura, para ver a famosa Gruta e almoçar à beira-mar. Depois Nova Brasília, o lado das aventuras, com a subida ao Farol das Conchas.",
      },
      {
        titulo: "O que ver na Ilha do Mel",
        paragrafos: [
          "Mesmo em um dia dá para conhecer os pontos mais famosos, principalmente se você se programar por vila.",
        ],
        lista: [
          "Farol das Conchas: construído no tempo do Império, no alto de um morro perto de Nova Brasília. A subida é curta, por escadaria, e a vista mostra a ilha inteira e o mar aberto.",
          "Gruta das Encantadas: uma caverna de pedra à beira-mar, em Encantadas, cercada pela lenda das sereias que deu nome à vila. O acesso é por uma passarela de madeira junto ao costão.",
          "Fortaleza de Nossa Senhora dos Prazeres: construção colonial que protegia a entrada da baía. Fica no norte da ilha, depois de uma caminhada longa pela praia e por trilha a partir de Nova Brasília.",
          "Praia Grande: de mar aberto e ondas fortes, a preferida de quem surfa.",
          "Praia do Farol e Praia de Fora: as mais procuradas para passar o dia, uma de cada lado da ilha.",
        ],
        foto: { url: `${FOTO}1c2c7635-f223-49a6-b280-4fd99a73c224.jpeg`, alt: "Passarela de madeira junto ao costão, com o mar e a praia da Ilha do Mel" },
      },
      {
        titulo: "O que levar",
        paragrafos: [
          "Como tudo é feito a pé, a regra é viajar leve. Uma mochila é muito melhor do que mala ou bolsa de mão.",
        ],
        lista: [
          "Protetor solar, boné ou chapéu e óculos de sol",
          "Repelente, principalmente para o fim da tarde",
          "Roupa de banho e uma muda de roupa seca",
          "Toalha leve ou canga",
          "Chinelo para a areia e tênis para as trilhas",
          "Garrafa de água",
          "Um pouco de dinheiro em espécie, porque o sinal de celular e as máquinas de cartão podem falhar",
          "Saco para trazer o seu lixo de volta",
        ],
      },
      {
        titulo: "Melhor época para ir",
        paragrafos: [
          "A ilha é bonita o ano inteiro, e cada época tem a sua vantagem.",
        ],
        lista: [
          "Verão: dias mais quentes e mar bom para banho, com as praias e as vilas mais movimentadas.",
          "Primavera e outono: temperatura agradável e ilha mais tranquila. Para muita gente, é a melhor combinação.",
          "Inverno: água fria e mais vento, mas dias bons para caminhar, fazer as trilhas e aproveitar a ilha com pouca gente.",
        ],
      },
      {
        titulo: "Dicas para aproveitar melhor",
        paragrafos: [],
        lista: [
          "Escolha uma vila como base e explore o entorno com calma, em vez de tentar ver tudo correndo.",
          "Em dia de chuva, as trilhas ficam escorregadias: vá com tênis e sem pressa.",
          "Nas praias de mar aberto, como a Praia Grande, as ondas e as correntes são fortes. Prefira nadar onde o mar está calmo e siga as orientações do local.",
          "A ilha é área de preservação: não alimente os animais, não leve plantas nem conchas e traga o seu lixo de volta.",
          "Aproveite os restaurantes das vilas, famosos pelos frutos do mar.",
        ],
      },
    ],
    perguntas: [
      {
        pergunta: "Precisa de carro na Ilha do Mel?",
        resposta: "Não. Carros não circulam na ilha. O acesso é de barco e, lá dentro, tudo se faz a pé, pela areia e pelas trilhas.",
      },
      {
        pergunta: "Dá para conhecer a Ilha do Mel em um dia?",
        resposta: "Sim. Saindo cedo de Curitiba, dá para conhecer os dois lados da ilha e voltar no mesmo dia. Com o grupo da AJS, a visita começa por Encantadas, com a Gruta das Encantadas e o almoço à beira-mar, e segue para Nova Brasília, com o Farol das Conchas.",
      },
      {
        pergunta: "De onde sai o barco para a Ilha do Mel?",
        resposta: "O embarque principal é em Pontal do Sul, no município de Pontal do Paraná, com barcos para Nova Brasília e para Encantadas. Também há barcos saindo de Paranaguá, com uma travessia mais longa.",
      },
      {
        pergunta: "Qual a diferença entre Encantadas e Nova Brasília?",
        resposta: "Encantadas fica no sul da ilha, tem mais estrutura e restaurantes à beira-mar, além da Gruta das Encantadas e da Praia de Fora. Nova Brasília é o lado das aventuras, perto do Farol das Conchas, da Praia Grande e do caminho para a Fortaleza.",
      },
      {
        pergunta: "A Ilha do Mel é boa para ir com crianças?",
        resposta: "Sim. Sem carros, as crianças andam com mais liberdade, e há praias de mar mais calmo. Vale levar pouca bagagem, porque todo o deslocamento é a pé.",
      },
      {
        pergunta: "Tem onde comer na Ilha do Mel?",
        resposta: "Sim. As vilas têm restaurantes e quiosques, muitos de frente para o mar, conhecidos pelos frutos do mar. Leve um pouco de dinheiro em espécie, porque o cartão pode falhar.",
      },
    ],
    roteiros: ["ilha-do-mel-pr"],
    chamadaNaViagem: "Primeira vez na Ilha do Mel? Veja nossas dicas: como chegar, o que levar e as melhores praias",
    escritoEm: "2026-10-14",
    atualizadoEm: "2026-10-14",
  },
  {
    slug: "foz-do-iguacu",
    destino: "Foz do Iguaçu",
    tituloGoogle: "Foz do Iguaçu: o que fazer, Cataratas e como chegar",
    descricaoGoogle:
      "Guia de Foz do Iguaçu saindo de Curitiba: Cataratas do lado brasileiro e argentino, Itaipu, Marco das Três Fronteiras, o que levar e a melhor época.",
    titulo: "Guia de Foz do Iguaçu",
    subtitulo: "Cataratas dos dois lados, o que mais fazer na Tríplice Fronteira, o que levar e quando ir.",
    resumo:
      "Foz do Iguaçu fica no extremo oeste do Paraná, na Tríplice Fronteira entre Brasil, Argentina e Paraguai. É a cidade das Cataratas do Iguaçu, que podem ser vistas pelos dois lados da fronteira, e também da usina de Itaipu, do Marco das Três Fronteiras e das compras no Paraguai.",
    capa: { url: `${FOTO}362f0b76-b941-458e-b528-20d330033064.jpeg`, alt: "Quedas das Cataratas do Iguaçu cercadas de mata, com a névoa subindo das águas" },
    secoes: [
      {
        titulo: "Onde fica Foz do Iguaçu",
        paragrafos: [
          "A cidade fica no ponto em que o Rio Iguaçu encontra o Rio Paraná, bem na divisa com a Argentina e o Paraguai. Do lado argentino está Puerto Iguazú, e do lado paraguaio, Ciudad del Este. As três cidades são ligadas por pontes, e a travessia faz parte do passeio.",
          "É essa mistura que torna a viagem tão completa: natureza, uma das maiores usinas hidrelétricas do mundo e três países em poucos quilômetros.",
        ],
      },
      {
        titulo: "Como chegar saindo de Curitiba",
        paragrafos: [
          "Por terra, são cerca de 640 km pela BR-277, cruzando o Paraná de leste a oeste. De ônibus, a viagem costuma ser feita durante a noite, para chegar cedo e já aproveitar o primeiro dia.",
          "De avião, o voo é curto e chega ao aeroporto internacional da cidade, que fica no caminho das Cataratas.",
          "Indo em excursão, você não precisa se preocupar com estrada, hotel nem deslocamento entre os passeios: o grupo vai junto, com quem conhece a região.",
        ],
      },
      {
        titulo: "Cataratas: lado brasileiro ou argentino?",
        paragrafos: [
          "As Cataratas do Iguaçu ficam entre dois parques nacionais, um em cada país, e os dois são Patrimônio Natural da Humanidade. São centenas de quedas, que mudam de volume conforme as chuvas. Cada lado mostra as quedas de um jeito, e o ideal é conhecer os dois.",
        ],
        lista: [
          "Lado brasileiro: no Parque Nacional do Iguaçu, uma trilha à beira do rio mostra a vista panorâmica, aquela da foto de cartão-postal. O caminho termina numa passarela sobre o rio, de frente para a Garganta do Diabo. É um passeio de algumas horas.",
          "Lado argentino: no Parque Nacional Iguazú, as passarelas passam por cima e por baixo das quedas, e um trem leva até a Garganta do Diabo vista do alto. Tem bem mais caminhada e pede o dia inteiro.",
        ],
        experiencia:
          "Com o grupo da AJS, a visita às Cataratas é pelo lado brasileiro, com guia local e o ingresso do parque já incluso. Os passeios para a Argentina e o Paraguai aparecem na página de cada viagem, como opcional ou já incluídos, e dá para somar um combo com as atrações temáticas da cidade.",
        foto: { url: `${FOTO}685e4076-c5e4-4442-b18c-c9b9be4549d8.jpeg`, alt: "Vista panorâmica das Cataratas do Iguaçu com arco-íris sobre o rio", enquadramento: "50% 45%" },
      },
      {
        titulo: "O que mais fazer em Foz do Iguaçu",
        paragrafos: [],
        lista: [
          "Itaipu Binacional: uma das maiores hidrelétricas do mundo, construída por Brasil e Paraguai. A visita mostra a barragem de perto e impressiona pelo tamanho.",
          "Marco das Três Fronteiras: o mirante no encontro dos rios Iguaçu e Paraná, de onde se vê o Brasil, a Argentina e o Paraguai ao mesmo tempo. O fim de tarde lá é muito bonito.",
          "Parque das Aves: ao lado da entrada das Cataratas, com aves da Mata Atlântica em viveiros por onde você caminha.",
          "Atrações temáticas: Museu de Cera, Bar de Gelo, Vale dos Dinossauros, Maravilhas do Mundo e Show de Motos. Agradam a família inteira e são uma ótima opção para dias de chuva.",
          "Puerto Iguazú, na Argentina: a feirinha é famosa pelos queijos, vinhos, alfajores, artesanato e produtos regionais.",
          "Ciudad del Este, no Paraguai: conhecida pelas lojas e pela variedade de produtos para compras.",
        ],
        foto: {
          url: `${FOTO}ecf02a15-3d7b-43e5-aa3a-f488c0506bc4.jpeg`,
          alt: "Andreia Castilho, da AJS Turismo, no Marco das Três Fronteiras, entre os marcos do Brasil, da Argentina e do Paraguai",
          vertical: true,
          legenda: "Andreia Castilho, da AJS Turismo, no Marco das Três Fronteiras em uma das viagens com o grupo.",
        },
      },
      {
        titulo: "Documentos para atravessar a fronteira",
        paragrafos: [
          "Para ir à Argentina e ao Paraguai, você passa pela aduana e precisa apresentar documento original. As regras são mais rígidas do que nas viagens dentro do Brasil, principalmente para menores de idade.",
          "A lista exata do que levar está na página de cada viagem, no item de documentos. Confira antes de sair de casa: sem o documento certo, não dá para atravessar.",
        ],
      },
      {
        titulo: "O que levar",
        paragrafos: [],
        lista: [
          "Documento original com foto, conforme a lista da viagem",
          "Capa de chuva ou roupa que possa molhar: perto da Garganta do Diabo, a névoa das quedas molha de verdade",
          "Capinha ou saco à prova d'água para o celular",
          "Tênis confortável para as trilhas e passarelas",
          "Protetor solar, boné e óculos de sol",
          "Repelente",
          "Garrafa de água",
          "Roupa leve no verão e agasalho no inverno, quando as noites são frias",
        ],
      },
      {
        titulo: "Melhor época para ir",
        paragrafos: [
          "Foz do Iguaçu vale a viagem o ano inteiro. O que muda é o clima e o volume das quedas.",
        ],
        lista: [
          "Verão: calor forte e chuvas frequentes, que deixam as Cataratas mais cheias e impressionantes.",
          "Inverno: dias mais secos e frescos, céu limpo e noites frias. Bom para caminhar sem calor.",
          "Primavera e outono: temperatura agradável, um equilíbrio entre os dois.",
          "Depois de períodos de muita chuva, a água fica mais volumosa e barrenta. Na seca, fica mais clara e as quedas aparecem mais separadas.",
        ],
      },
      {
        titulo: "Dicas para aproveitar melhor",
        paragrafos: [],
        lista: [
          "Chegue cedo aos parques: tem menos fila, menos gente nas passarelas e menos calor.",
          "Não alimente os quatis. Eles parecem mansos, mas podem morder e arranhar, e a comida faz mal a eles. Guarde lanches e sacolas fechados.",
          "Reserve um dia para cada lado das Cataratas, se puder. O lado argentino pede mais tempo e mais caminhada.",
          "Em feriados, a travessia das pontes para a Argentina e o Paraguai pode ter fila. Saia cedo.",
        ],
        foto: { url: `${FOTO}b537447f-38dd-4da3-9c25-66a7fd640dbf.jpeg`, alt: "Quati na grade do mirante com as Cataratas do Iguaçu ao fundo", enquadramento: "50% 78%" },
      },
    ],
    perguntas: [
      {
        pergunta: "Vale mais a pena o lado brasileiro ou o argentino das Cataratas?",
        resposta: "Os dois valem e se completam. O lado brasileiro mostra a vista panorâmica das quedas e é um passeio mais curto. O argentino leva você para perto das quedas, por cima e por baixo, e pede o dia inteiro.",
      },
      {
        pergunta: "Precisa de passaporte para ir à Argentina e ao Paraguai?",
        resposta: "Não necessariamente. Brasileiros podem atravessar com documento de identidade aceito no Mercosul ou com passaporte, mas as regras são mais rígidas do que dentro do Brasil, principalmente para menores. A lista exata está na página da viagem.",
      },
      {
        pergunta: "A passarela da Garganta do Diabo molha?",
        resposta: "Sim. A névoa das quedas molha bastante, ainda mais quando o rio está cheio. Vá com capa de chuva ou roupa que possa molhar e proteja o celular.",
      },
      {
        pergunta: "Onde dá para ver os três países ao mesmo tempo?",
        resposta: "No Marco das Três Fronteiras, no encontro dos rios Iguaçu e Paraná. De lá se vê o Brasil, a Argentina e o Paraguai.",
      },
      {
        pergunta: "Foz do Iguaçu é boa para ir com crianças?",
        resposta: "Sim. A trilha do lado brasileiro é tranquila, o Parque das Aves agrada muito as crianças e a viagem mistura natureza e passeios curtos. Para atravessar a fronteira, menores de idade têm regras próprias de documento.",
      },
      {
        pergunta: "Quando as Cataratas estão mais cheias?",
        resposta: "Depois de períodos de chuva, que são mais comuns no verão. Nessa época, as quedas ficam mais volumosas e a água fica barrenta.",
      },
    ],
    roteiros: [
      "foz-do-iguacu-opcionais-paraguai-e-argentina",
      "foz-do-iguacu-opcionais-paraguai-e-argentina-2",
      "reveillon-2027-em-foz-do-iguacu-pr",
    ],
    chamadaNaViagem: "Primeira vez em Foz do Iguaçu? Veja nossas dicas: Cataratas dos dois lados, o que fazer e o que levar",
    escritoEm: "2026-10-14",
    atualizadoEm: "2026-10-14",
  },
];

/** Âncora de cada parte do guia, para o sumário (#como-chegar-saindo-de-curitiba). */
export function ancora(titulo: string): string {
  return titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function dicaPorSlug(slug: string): Dica | undefined {
  return DICAS.find((d) => d.slug === slug);
}

/** Guia ligado a um roteiro, para o link discreto na página da viagem. */
export function dicaDoRoteiro(slugRoteiro?: string | null): Dica | undefined {
  if (!slugRoteiro) return undefined;
  return DICAS.find((d) => d.roteiros.includes(slugRoteiro));
}
