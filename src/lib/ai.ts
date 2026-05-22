import type {
  AgendaEvent,
  AgendaTask,
  ShoppingItem,
  ParsedResult,
  PersonCode,
  Category
} from "./types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
export async function analisarRotinaComIA(
  events: AgendaEvent[],
  tasks: AgendaTask[],
  shopping: ShoppingItem[]
): Promise<string[]> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "SUA_CHAVE_API_AQUI") {
    return [
      "A chave da IA ainda não está configurada. Adicione a chave no arquivo ai.ts para ativar o Radar Inteligente."
    ];
  }

  const hoje = new Date().toISOString().split("T")[0];

  const proximosEventos = events
    .filter((evento) => evento.date && evento.date >= hoje)
    .slice(0, 20);

  const tarefasPendentes = tasks.filter((tarefa) => tarefa.status === "pendente");

  const comprasPendentes = shopping.filter((item) => item.status === "pendente");

  const prompt = `
Você é o assistente inteligente do aplicativo familiar Nossa Agenda.

Analise a rotina de Felipe, Fabiane e Clarisse.

Regras importantes:
1. Responda sempre em português do Brasil.
2. Seja direto, útil e realista.
3. Não use termos em inglês.
4. No contexto profissional, preserve a organização por Ciclo e Turma.
5. Considere a equipe de trabalho: Ariele, Laís, Lucas Vinicius e José.
6. Preserve a grafia correta de locais como Itaicí.
7. Aponte choques de horário, acúmulo de tarefas, pendências e oportunidades de organização.
8. Retorne apenas um array JSON de strings.
9. Não escreva explicações fora do JSON.

Dados para análise:

Eventos:
${JSON.stringify(proximosEventos, null, 2)}

Tarefas pendentes:
${JSON.stringify(tarefasPendentes, null, 2)}

Compras pendentes:
${JSON.stringify(comprasPendentes, null, 2)}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro da API Gemini:", data);
      return ["O Radar não conseguiu acessar a IA. Verifique se a chave está correta e ativa."];
    }

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Resposta inesperada da IA:", data);
      return ["A IA respondeu, mas em um formato inesperado."];
    }

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const inicioJson = text.indexOf("[");
    const fimJson = text.lastIndexOf("]");

    if (inicioJson === -1 || fimJson === -1) {
      return [text];
    }

    const jsonLimpo = text.slice(inicioJson, fimJson + 1);
    const resultado = JSON.parse(jsonLimpo);

    if (!Array.isArray(resultado)) {
      return ["A IA respondeu, mas não em formato de lista."];
    }

    return resultado;
  } catch (error) {
    console.error("Falha no motor de IA:", error);
    return ["O Radar está temporariamente offline. Tente novamente em instantes."];
  }
}

export async function interpretarEntradaRapidaComIA(input: string): Promise<ParsedResult | null> {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const hoje = new Date().toISOString().split("T")[0];

  const prompt = `
Você é o intérprete inteligente do aplicativo Nossa Agenda.

Sua tarefa é transformar uma frase falada ou digitada em um objeto JSON válido para agenda, tarefa ou compras.

DATA DE HOJE:
${hoje}

CÓDIGOS FIXOS:
- F1 = Felipe
- F2 = Fabiane
- CL = Clarisse
- FF = família toda

ATENÇÃO A ERROS DE ÁUDIO:
- "efe um", "f um", "fium", "felipe" = F1
- "efe dois", "f dois", "fdóis", "fabiane" = F2
- "clarice", "clarisse", "cl" = CL
- "todo mundo", "família", "todos juntos", "ff" = FF
- "sete da noite" = 19:00
- "sete da manhã" = 07:00
- "dez e meia" = 10:30
- "meio-dia" = 12:00
- "corrêas", "correas", "coreas" = Corrêas
- "itaici", "itaicí" = Itaicí
- "santo inacio", "santo inácio" = Colégio Santo Inácio

REGRAS DE DOMÍNIO:
- Eventos de turma, formação, manhã de formação, dia de formação, catequese ou mentoria pertencem à categoria "Escola".
- Cliente da Fabiane normalmente é F2 e categoria "Trabalho".
- Consulta, pediatra, vacina ou exame da Clarisse normalmente é CL e categoria "Saúde".
- Almoço, jantar, passeio ou compromisso de todos normalmente é FF e categoria "Família".
- Compras vão para kind "shopping".
- Tarefas simples sem horário vão para kind "task".
- Compromissos com data, horário, local, reunião, cliente, turma ou formação vão para kind "event".
- No contexto do Colégio Santo Inácio, preserve organização por Ciclo e Turma quando aparecer.
- Preserve a grafia correta de Itaicí.

EXEMPLOS:
Frase: "efe dois cliente terça sete da noite"
Resposta:
{
  "kind": "event",
  "data": {
    "personCode": "F2",
    "title": "Cliente",
    "date": "YYYY-MM-DD",
    "startTime": "19:00",
    "endTime": "20:00",
    "durationMinutes": 60,
    "location": null,
    "category": "Trabalho",
    "priority": "Normal",
    "sourceText": "F2 cliente terça às 19h"
  }
}

Frase: "f um correas turma quarenta e três doze do seis sete horas"
Resposta:
{
  "kind": "event",
  "data": {
    "personCode": "F1",
    "title": "Corrêas turma 43",
    "date": "YYYY-MM-DD",
    "startTime": "07:00",
    "endTime": null,
    "durationMinutes": null,
    "location": "Corrêas",
    "category": "Escola",
    "priority": "Normal",
    "sourceText": "F1 Corrêas turma 43 12/06 às 7h"
  }
}

Frase: "clarisse pediatra amanhã dez e meia em botafogo"
Resposta:
{
  "kind": "event",
  "data": {
    "personCode": "CL",
    "title": "Pediatra da Clarisse",
    "date": "YYYY-MM-DD",
    "startTime": "10:30",
    "endTime": "11:30",
    "durationMinutes": 60,
    "location": "Botafogo",
    "category": "Saúde",
    "priority": "Normal",
    "sourceText": "CL pediatra amanhã às 10h30 em Botafogo"
  }
}

FORMATO OBRIGATÓRIO PARA EVENTO:
{
  "kind": "event",
  "data": {
    "personCode": "F1 ou F2 ou CL ou FF ou null",
    "title": "Título corrigido",
    "date": "YYYY-MM-DD ou null",
    "startTime": "HH:mm ou null",
    "endTime": "HH:mm ou null",
    "durationMinutes": número ou null,
    "location": "local/endereço ou null",
    "category": "Saúde ou Trabalho ou Escola ou Casa ou Família ou Evento ou Documento ou Outro",
    "priority": "Normal",
    "sourceText": "frase corrigida"
  }
}

FORMATO OBRIGATÓRIO PARA TAREFA:
{
  "kind": "task",
  "data": {
    "personCode": "F1 ou F2 ou CL ou FF ou null",
    "title": "Tarefa corrigida",
    "date": "YYYY-MM-DD ou null",
    "category": "Saúde ou Trabalho ou Escola ou Casa ou Família ou Evento ou Documento ou Outro",
    "priority": "Normal",
    "status": "pendente",
    "sourceText": "frase corrigida"
  }
}

FORMATO OBRIGATÓRIO PARA COMPRA:
{
  "kind": "shopping",
  "data": {
    "item": "Item corrigido",
    "quantity": "quantidade ou null",
    "category": "Geral",
    "status": "pendente",
    "notes": "",
    "sourceText": "frase corrigida"
  }
}

Responda apenas com JSON puro. Não use markdown. Não explique.

FRASE RECEBIDA:
"${input}"
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.1
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro ao interpretar entrada rápida com IA:", data);
      return null;
    }

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return null;
    }

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const inicio = text.indexOf("{");
    const fim = text.lastIndexOf("}");

    if (inicio === -1 || fim === -1) {
      return null;
    }

    const jsonLimpo = text.slice(inicio, fim + 1);
    const resultado = JSON.parse(jsonLimpo);

    return normalizarResultadoDaIA(resultado, input);
  } catch (error) {
    console.error("Falha ao interpretar entrada rápida com IA:", error);
    return null;
  }
}

function normalizarResultadoDaIA(resultado: any, textoOriginal: string): ParsedResult | null {
  if (!resultado || !resultado.kind || !resultado.data) {
    return null;
  }

  const data = limparNulos(resultado.data);

  if (resultado.kind === "event") {
    return {
      kind: "event",
      data: {
        personCode: normalizarCodigoPessoa(data.personCode),
        title: normalizarTitulo(data.title || "Compromisso"),
        date: data.date ?? null,
        startTime: normalizarHorario(data.startTime),
        endTime: normalizarHorario(data.endTime),
        durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : null,
        location: normalizarLocal(data.location),
        category: normalizarCategoria(data.category),
        priority: "Normal",
        sourceText: normalizarFonte(data.sourceText || textoOriginal),
      },
    };
  }

  if (resultado.kind === "task") {
    return {
      kind: "task",
      data: {
        personCode: normalizarCodigoPessoa(data.personCode),
        title: normalizarTitulo(data.title || "Tarefa"),
        date: data.date ?? null,
        category: normalizarCategoria(data.category || "Casa"),
        priority: "Normal",
        status: "pendente",
        sourceText: normalizarFonte(data.sourceText || textoOriginal),
      },
    };
  }

  if (resultado.kind === "shopping") {
    return {
      kind: "shopping",
      data: {
        item: normalizarTitulo(data.item || "Item de compra"),
        quantity: data.quantity ?? null,
        category: data.category || "Geral",
        status: "pendente",
        notes: data.notes || "",
        sourceText: normalizarFonte(data.sourceText || textoOriginal),
      },
    };
  }

  return null;
}

function limparNulos(data: Record<string, any>) {
  const novo: Record<string, any> = {};

  for (const chave of Object.keys(data)) {
    const valor = data[chave];

    if (
      valor === "" ||
      valor === "null" ||
      valor === "undefined" ||
      valor === undefined
    ) {
      novo[chave] = null;
    } else {
      novo[chave] = valor;
    }
  }

  return novo;
}

function normalizarCodigoPessoa(valor: any): PersonCode | null {
  const texto = normalizarTexto(String(valor ?? ""));

  if (!texto || texto === "null") return null;

  if (["f1", "f um", "efe um", "felipe"].includes(texto)) return "F1";
  if (["f2", "f dois", "efe dois", "fabiane"].includes(texto)) return "F2";
  if (["cl", "clarisse", "clarice"].includes(texto)) return "CL";
  if (["ff", "familia", "família", "todos", "todo mundo"].includes(texto)) return "FF";

  return null;
}

function normalizarCategoria(valor: any): Category {
  const texto = String(valor ?? "").trim();

  const categorias: Category[] = [
    "Saúde",
    "Trabalho",
    "Escola",
    "Casa",
    "Família",
    "Evento",
    "Documento",
    "Outro",
  ];

  if (categorias.includes(texto as Category)) {
    return texto as Category;
  }

  const normalizado = normalizarTexto(texto);

  if (normalizado.includes("saude")) return "Saúde";
  if (normalizado.includes("trabalho")) return "Trabalho";
  if (normalizado.includes("escola")) return "Escola";
  if (normalizado.includes("casa")) return "Casa";
  if (normalizado.includes("familia")) return "Família";
  if (normalizado.includes("documento")) return "Documento";

  return "Evento";
}

function normalizarHorario(valor: any): string | null {
  if (!valor) return null;

  const texto = String(valor).trim();

  const match = texto.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hora = Number(match[1]);
    const minuto = Number(match[2]);

    if (hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59) {
      return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
    }
  }

  return null;
}

function normalizarLocal(valor: any): string | null {
  if (!valor) return null;

  const texto = String(valor).trim();
  const normalizado = normalizarTexto(texto);

  if (!texto || normalizado === "null") return null;
  if (normalizado.includes("correas") || normalizado.includes("coreas")) return "Corrêas";
  if (normalizado.includes("itaici")) return "Itaicí";
  if (normalizado.includes("santo inacio")) return "Colégio Santo Inácio";
  if (normalizado.includes("botafogo")) return "Botafogo";
  if (normalizado.includes("guadalupe")) return "Guadalupe";

  return normalizarTitulo(texto);
}

function normalizarTitulo(valor: string): string {
  const texto = String(valor || "").replace(/\s+/g, " ").trim();

  if (!texto) return "";

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function normalizarFonte(valor: string): string {
  return String(valor || "").replace(/\s+/g, " ").trim();
}

function normalizarTexto(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}