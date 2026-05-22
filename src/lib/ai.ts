import type { AgendaEvent, AgendaTask, ShoppingItem, ParsedResult } from "./types";

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

Sua função é transformar uma frase falada ou digitada em um registro organizado para agenda, tarefa ou compras.

Data de hoje: ${hoje}

Contexto:
- F1 = Felipe
- F2 = Fabiane
- FF = família toda
- CL = Clarisse
- Trabalho do Felipe: Colégio Santo Inácio
- Equipe de trabalho: Ariele, Laís, Lucas Vinicius e José
- Locais importantes: Botafogo, Corrêas, Itaicí, Guadalupe
- Preserve a grafia correta de Itaicí.
- No trabalho, mantenha formações organizadas por Ciclo e Turma.

Regras:
1. Corrija erros comuns de transcrição de áudio.
2. Organize maiúsculas e minúsculas.
3. "efe um", "f um", "F um" devem virar F1.
4. "efe dois", "f dois", "F dois" devem virar F2.
5. "sete da noite" deve virar 19:00.
6. "sete da manhã" deve virar 07:00.
7. "meio-dia" deve virar 12:00.
8. "amanhã", "hoje" e dias da semana devem virar data no formato YYYY-MM-DD.
9. Se for compra, use kind = "shopping".
10. Se for tarefa simples, use kind = "task".
11. Se tiver data, horário, cliente, reunião, turma, formação, consulta ou evento, use kind = "event".
12. Retorne apenas JSON puro, sem markdown e sem explicação.

Formato para compromisso:
{
  "kind": "event",
  "data": {
    "personCode": "F1 ou F2 ou FF ou CL ou null",
    "title": "Título corrigido",
    "date": "YYYY-MM-DD ou null",
    "startTime": "HH:mm ou null",
    "endTime": "HH:mm ou null",
    "durationMinutes": número ou null,
    "location": "local/endereço ou null",
    "category": "Saúde ou Trabalho ou Escola ou Casa ou Família ou Evento ou Documento ou Outro",
    "priority": "Normal",
    "sourceText": "frase corrigida e organizada"
  }
}

Formato para tarefa:
{
  "kind": "task",
  "data": {
    "personCode": "F1 ou F2 ou FF ou CL ou null",
    "title": "Tarefa corrigida",
    "date": "YYYY-MM-DD ou null",
    "category": "Saúde ou Trabalho ou Escola ou Casa ou Família ou Evento ou Documento ou Outro",
    "priority": "Normal",
    "status": "pendente",
    "sourceText": "frase corrigida e organizada"
  }
}

Formato para compra:
{
  "kind": "shopping",
  "data": {
    "item": "Item corrigido",
    "quantity": "quantidade ou null",
    "category": "Geral",
    "status": "pendente",
    "notes": "",
    "sourceText": "frase corrigida e organizada"
  }
}

Frase recebida:
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
      console.error("Erro ao interpretar entrada com IA:", data);
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
  data.sourceText = data.sourceText || textoOriginal;

  if (resultado.kind === "event") {
    return {
      kind: "event",
      data: {
        personCode: data.personCode ?? null,
        title: data.title ?? "Compromisso",
        date: data.date ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        durationMinutes: data.durationMinutes ?? null,
        location: data.location ?? null,
        category: data.category ?? "Evento",
        priority: data.priority ?? "Normal",
        sourceText: data.sourceText,
      },
    };
  }

  if (resultado.kind === "task") {
    return {
      kind: "task",
      data: {
        personCode: data.personCode ?? null,
        title: data.title ?? "Tarefa",
        date: data.date ?? null,
        category: data.category ?? "Casa",
        priority: data.priority ?? "Normal",
        status: data.status ?? "pendente",
        sourceText: data.sourceText,
      },
    };
  }

  if (resultado.kind === "shopping") {
    return {
      kind: "shopping",
      data: {
        item: data.item ?? "Item de compra",
        quantity: data.quantity ?? null,
        category: data.category ?? "Geral",
        status: data.status ?? "pendente",
        notes: data.notes ?? "",
        sourceText: data.sourceText,
      },
    };
  }

  return null;
}

function limparNulos(data: Record<string, any>) {
  const novo: Record<string, any> = {};

  for (const chave of Object.keys(data)) {
    const valor = data[chave];

    if (valor === "" || valor === "null" || valor === "undefined") {
      novo[chave] = null;
    } else {
      novo[chave] = valor;
    }
  }

  return novo;
}