import type { AgendaEvent, AgendaTask, ShoppingItem } from "./types";

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