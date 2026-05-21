import type { AgendaEvent, AgendaTask, ShoppingItem } from "./types";

// Nota de Segurança: Em produção, esta chave ficaria num servidor (backend).
// Como o aplicativo é de uso estritamente privado da família e roda no seu celular, 
// podemos injetar a chave aqui para testes. Você pode gerar uma gratuita no Google AI Studio.
const GEMINI_API_KEY = "SUA_CHAVE_API_AQUI"; 

export async function analisarRotinaComIA(
  events: AgendaEvent[], 
  tasks: AgendaTask[], 
  shopping: ShoppingItem[]
): Promise<string[]> {
  
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "SUA_CHAVE_API_AQUI") {
    return ["A chave da IA não está configurada. Adicione a chave no ficheiro ai.ts para ativar o Assistente Premium."];
  }

  const hoje = new Date().toISOString().split('T')[0];
  const proximosEventos = events.filter(e => e.date && e.date >= hoje).slice(0, 10);
  const pendencias = tasks.filter(t => t.status === "pendente");

  const prompt = `
    Atue como um assistente executivo e familiar sênior. Analise a seguinte agenda.
    
    Diretrizes cruciais:
    1. No contexto de trabalho, a organização das formações deve ser rigorosamente analisada mantendo a preservação por ciclo e por turma.
    2. Avalie a carga horária e alocação da equipe (Ariele, Laís, Lucas Vinicius e José).
    3. Verifique choques de horário entre a rotina doméstica e os eventos de trabalho.
    4. Seja conciso, direto e profissional. Retorne APENAS um array JSON de strings, onde cada string é um insight ou alerta valioso. NENHUM texto adicional.

    Dados:
    Eventos: ${JSON.stringify(proximosEventos)}
    Tarefas Pendentes: ${JSON.stringify(pendencias)}
    Itens de Compra: ${shopping.length} itens pendentes.
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    let text = data.candidates[0].content.parts[0].text;
    
    // Limpar formatação Markdown caso a IA retorne
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);

  } catch (error) {
    console.error("Falha no motor de IA:", error);
    return ["O Radar está temporariamente offline ou a chave da IA é inválida."];
  }
}