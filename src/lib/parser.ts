import type { ParsedResult, PersonCode, Category } from "./types";

type ParserContext = {
  defaultDate?: string;
};

const DIAS_DA_SEMANA = [
  { nomes: ["domingo", "dom"], dia: 0 },
  { nomes: ["segunda", "segunda-feira", "seg"], dia: 1 },
  { nomes: ["terca", "terça", "terca-feira", "terça-feira", "ter"], dia: 2 },
  { nomes: ["quarta", "quarta-feira", "qua"], dia: 3 },
  { nomes: ["quinta", "quinta-feira", "qui"], dia: 4 },
  { nomes: ["sexta", "sexta-feira", "sex"], dia: 5 },
  { nomes: ["sabado", "sábado", "sab"], dia: 6 },
];

export function parseEventInput(input: string, context?: ParserContext): ParsedResult {
  const textoOriginal = input.trim();

  if (!textoOriginal) {
    return {
      kind: "task",
      data: {
        title: "Nova tarefa",
        category: "Casa",
        status: "pendente",
        priority: "Normal",
        sourceText: input,
      },
    };
  }

  const textoNormalizado = normalizar(textoOriginal);

  if (pareceCompra(textoNormalizado)) {
    return montarCompra(textoOriginal);
  }

  if (pareceTarefa(textoNormalizado)) {
    return montarTarefa(textoOriginal, context);
  }

  return montarEvento(textoOriginal, context);
}

/* =========================
   MONTAGEM DOS RESULTADOS
========================= */

function montarCompra(input: string): ParsedResult {
  let item = input;

  item = item
    .replace(/\bpreciso comprar\b/gi, "")
    .replace(/\bprecisa comprar\b/gi, "")
    .replace(/\btem que comprar\b/gi, "")
    .replace(/\bcomprar\b/gi, "")
    .replace(/\bcompra\b/gi, "")
    .replace(/\bmercado\b/gi, "")
    .replace(/\bsupermercado\b/gi, "")
    .replace(/\blista de compras\b/gi, "")
    .replace(/\blista de compra\b/gi, "")
    .replace(/\bcompras\b/gi, "");

  const itemLimpo = limparEspacos(item) || "Item de compra";

  return {
    kind: "shopping",
    data: {
      item: capitalizar(itemLimpo),
      quantity: null,
      category: "Geral",
      status: "pendente",
      notes: "",
      sourceText: input,
    },
  };
}

function montarTarefa(input: string, context?: ParserContext): ParsedResult {
  const baseDate = obterDataBase(context);
  const dataExtraida = extrairData(input, baseDate);

  let titulo = dataExtraida.textoSemData;
  titulo = limparTextoGeral(titulo);

  return {
    kind: "task",
    data: {
      title: capitalizar(titulo || "Tarefa"),
      date: dataExtraida.date,
      category: detectarCategoria(input),
      priority: "Normal",
      status: "pendente",
      sourceText: input,
    },
  };
}

function montarEvento(input: string, context?: ParserContext): ParsedResult {
  const baseDate = obterDataBase(context);

  const dataExtraida = extrairData(input, baseDate);
  const horarioExtraido = extrairHorario(dataExtraida.textoSemData);

  const pessoa = detectarPessoa(input);
  const categoria = detectarCategoria(input);
  const duracao = detectarDuracao(input, categoria);
  const endTime =
    horarioExtraido.startTime && duracao
      ? somarMinutos(horarioExtraido.startTime, duracao)
      : null;

  let titulo = horarioExtraido.textoSemHorario;
  titulo = limparTextoGeral(titulo);

  return {
    kind: "event",
    data: {
      personCode: pessoa,
      title: capitalizar(titulo || "Compromisso"),
      date: dataExtraida.date,
      startTime: horarioExtraido.startTime,
      endTime,
      durationMinutes: duracao,
      location: detectarLocal(input),
      category: categoria,
      priority: "Normal",
      sourceText: input,
    },
  };
}

/* =========================
   DETECÇÃO DE TIPO
========================= */

function pareceCompra(texto: string): boolean {
  return (
    texto.startsWith("comprar ") ||
    texto.startsWith("compra ") ||
    texto.includes("preciso comprar") ||
    texto.includes("tem que comprar") ||
    texto.includes("lista de compra") ||
    texto.includes("lista de compras") ||
    texto.startsWith("mercado ") ||
    texto.startsWith("supermercado ")
  );
}

function pareceTarefa(texto: string): boolean {
  const iniciosDeTarefa = [
    "varrer",
    "passar pano",
    "lavar",
    "limpar",
    "arrumar",
    "organizar",
    "sacar",
    "pagar",
    "verificar",
    "conferir",
    "ligar",
    "mandar",
    "enviar",
    "separar",
    "buscar encomenda",
    "pegar encomenda",
  ];

  const temHorario = /\b(\d{1,2})(h|:)\d{0,2}\b/.test(texto) || /\b(as|às)\s+\d{1,2}\b/.test(texto);

  if (temHorario) return false;

  return iniciosDeTarefa.some((inicio) => texto.startsWith(inicio));
}

/* =========================
   DATA E HORÁRIO
========================= */

function extrairData(input: string, baseDate: Date): { date: string | null; textoSemData: string } {
  let texto = input;
  let date: string | null = null;

  const dataNumerica = texto.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);

  if (dataNumerica) {
    const dia = Number(dataNumerica[1]);
    const mes = Number(dataNumerica[2]);
    let ano = dataNumerica[3] ? Number(dataNumerica[3]) : baseDate.getFullYear();

    if (ano < 100) ano = 2000 + ano;

    date = toISODate(new Date(ano, mes - 1, dia));
    texto = texto.replace(dataNumerica[0], " ");
  } else {
    const normalizado = normalizar(texto);

    if (normalizado.includes("depois de amanha")) {
      date = toISODate(adicionarDias(baseDate, 2));
      texto = texto.replace(/\bdepois de amanhã\b/gi, " ");
    } else if (normalizado.includes("amanha")) {
      date = toISODate(adicionarDias(baseDate, 1));
      texto = texto.replace(/\bamanhã\b/gi, " ");
    } else if (normalizado.includes("hoje")) {
      date = toISODate(baseDate);
      texto = texto.replace(/\bhoje\b/gi, " ");
    } else {
      const diaSemana = encontrarDiaDaSemana(normalizado);

      if (diaSemana !== null) {
        date = toISODate(proximoDiaDaSemana(baseDate, diaSemana));
        texto = removerDiaDaSemana(texto);
      }
    }
  }

  return {
    date,
    textoSemData: limparEspacos(texto),
  };
}

function extrairHorario(input: string): { startTime: string | null; textoSemHorario: string } {
  let texto = input;

  const horario =
    texto.match(/\b(?:às|as)?\s*(\d{1,2})(?:h|:)(\d{2})?\b/i) ||
    texto.match(/\b(?:às|as)\s+(\d{1,2})\b/i);

  if (!horario) {
    return {
      startTime: null,
      textoSemHorario: texto,
    };
  }

  const hora = Number(horario[1]);
  const minuto = horario[2] ? Number(horario[2]) : 0;

  if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) {
    return {
      startTime: null,
      textoSemHorario: texto,
    };
  }

  const startTime = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

  texto = texto.replace(horario[0], " ");

  return {
    startTime,
    textoSemHorario: limparEspacos(texto),
  };
}

/* =========================
   PESSOA, CATEGORIA E LOCAL
========================= */

function detectarPessoa(input: string): PersonCode | null {
  const texto = normalizar(input);

  if (/\bf1\b/.test(texto) || texto.includes("felipe")) return "F1";
  if (/\bf2\b/.test(texto) || texto.includes("fabiane") || texto.includes("cliente")) return "F2";
  if (/\bff\b/.test(texto) || texto.includes("familia") || texto.includes("almoco") || texto.includes("jantar")) return "FF";
  if (/\bcl\b/.test(texto) || texto.includes("clarisse") || texto.includes("pediatra") || texto.includes("vacina")) return "CL";

  return null;
}

function detectarCategoria(input: string): Category {
  const texto = normalizar(input);

  if (
    texto.includes("turma") ||
    texto.includes("formacao") ||
    texto.includes("colegio") ||
    texto.includes("santo inacio") ||
    texto.includes("correas") ||
    texto.includes("itaici") ||
    texto.includes("mentoria") ||
    texto.includes("catequese")
  ) {
    return "Escola";
  }

  if (
    texto.includes("cliente") ||
    texto.includes("reuniao") ||
    texto.includes("trabalho") ||
    texto.includes("equipe") ||
    texto.includes("ariele") ||
    texto.includes("lais") ||
    texto.includes("lucas vinicius") ||
    texto.includes("jose")
  ) {
    return "Trabalho";
  }

  if (
    texto.includes("pediatra") ||
    texto.includes("medico") ||
    texto.includes("médico") ||
    texto.includes("consulta") ||
    texto.includes("vacina") ||
    texto.includes("exame")
  ) {
    return "Saúde";
  }

  if (
    texto.includes("familia") ||
    texto.includes("fabiane") ||
    texto.includes("clarisse") ||
    texto.includes("almoco") ||
    texto.includes("jantar") ||
    texto.includes("passeio")
  ) {
    return "Família";
  }

  if (
    texto.includes("documento") ||
    texto.includes("rg") ||
    texto.includes("cpf") ||
    texto.includes("certidao")
  ) {
    return "Documento";
  }

  if (
    texto.includes("casa") ||
    texto.includes("varrer") ||
    texto.includes("lavar") ||
    texto.includes("limpar") ||
    texto.includes("arrumar")
  ) {
    return "Casa";
  }

  return "Evento";
}

function detectarLocal(input: string): string | null {
  const texto = normalizar(input);

  if (texto.includes("correas")) return "Corrêas";
  if (texto.includes("itaici")) return "Itaicí";
  if (texto.includes("santo inacio")) return "Colégio Santo Inácio";
  if (texto.includes("botafogo")) return "Botafogo";
  if (texto.includes("guadalupe")) return "Guadalupe";

  return null;
}

function detectarDuracao(input: string, categoria: Category): number | null {
  const texto = normalizar(input);

  if (texto.includes("cliente")) return 60;
  if (texto.includes("reuniao")) return 60;
  if (texto.includes("consulta")) return 60;
  if (texto.includes("manha de formacao")) return 120;
  if (texto.includes("dia de formacao")) return 300;
  if (categoria === "Escola" && texto.includes("turma")) return 60;

  return null;
}

/* =========================
   LIMPEZA DE TEXTO
========================= */

function limparTextoGeral(input: string): string {
  let texto = input;

  texto = texto
    .replace(/\bf1\b/gi, " ")
    .replace(/\bf2\b/gi, " ")
    .replace(/\bff\b/gi, " ")
    .replace(/\bcl\b/gi, " ")
    .replace(/\bagendar\b/gi, " ")
    .replace(/\bmarcar\b/gi, " ")
    .replace(/\bcompromisso\b/gi, " ")
    .replace(/\bevento\b/gi, " ")
    .replace(/\blembrete\b/gi, " ")
    .replace(/\btarefa\b/gi, " ");

  texto = removerDiaDaSemana(texto);
  texto = texto.replace(/\bhoje\b/gi, " ");
  texto = texto.replace(/\bamanhã\b/gi, " ");
  texto = texto.replace(/\bdepois de amanhã\b/gi, " ");

  return limparEspacos(texto);
}

function removerDiaDaSemana(input: string): string {
  let texto = input;

  texto = texto
    .replace(/\bdomingo\b/gi, " ")
    .replace(/\bsegunda-feira\b/gi, " ")
    .replace(/\bsegunda\b/gi, " ")
    .replace(/\bterça-feira\b/gi, " ")
    .replace(/\bterca-feira\b/gi, " ")
    .replace(/\bterça\b/gi, " ")
    .replace(/\bterca\b/gi, " ")
    .replace(/\bquarta-feira\b/gi, " ")
    .replace(/\bquarta\b/gi, " ")
    .replace(/\bquinta-feira\b/gi, " ")
    .replace(/\bquinta\b/gi, " ")
    .replace(/\bsexta-feira\b/gi, " ")
    .replace(/\bsexta\b/gi, " ")
    .replace(/\bsábado\b/gi, " ")
    .replace(/\bsabado\b/gi, " ");

  return limparEspacos(texto);
}

function limparEspacos(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/^[,.;:\-\s]+/, "")
    .replace(/[,.;:\-\s]+$/, "")
    .trim();
}

function capitalizar(input: string): string {
  const texto = limparEspacos(input);
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function normalizar(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/* =========================
   FUNÇÕES DE DATA
========================= */

function obterDataBase(context?: ParserContext): Date {
  if (context?.defaultDate) {
    return parseISODate(context.defaultDate);
  }

  return new Date();
}

function parseISODate(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function adicionarDias(date: Date, quantidade: number): Date {
  const nova = new Date(date);
  nova.setDate(nova.getDate() + quantidade);
  return nova;
}

function encontrarDiaDaSemana(textoNormalizado: string): number | null {
  for (const item of DIAS_DA_SEMANA) {
    if (item.nomes.some((nome) => textoNormalizado.includes(nome))) {
      return item.dia;
    }
  }

  return null;
}

function proximoDiaDaSemana(baseDate: Date, diaDesejado: number): Date {
  const atual = baseDate.getDay();
  let diferenca = diaDesejado - atual;

  if (diferenca <= 0) {
    diferenca += 7;
  }

  return adicionarDias(baseDate, diferenca);
}

function somarMinutos(time: string, minutos: number): string {
  const [hora, minuto] = time.split(":").map(Number);

  const data = new Date();
  data.setHours(hora);
  data.setMinutes(minuto + minutos);

  return `${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;
}