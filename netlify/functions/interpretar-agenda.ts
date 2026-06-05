function hojeISO(): string {
    const partes = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
  
    const dia = partes.find((parte) => parte.type === "day")?.value;
    const mes = partes.find((parte) => parte.type === "month")?.value;
    const ano = partes.find((parte) => parte.type === "year")?.value;
  
    return `${ano}-${mes}-${dia}`;
  }
  
  function limparRespostaJson(texto: string): string {
    return texto
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
  }
  
  function formatarHora(hora: number, minuto: number = 0): string {
    return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
  }
  
  function minutosDoDia(horario: string): number {
    const [hora, minuto] = horario.split(":").map(Number);
    return hora * 60 + minuto;
  }
  
  function calcularDuracao(startTime: string, endTime: string): number | null {
    const inicio = minutosDoDia(startTime);
    const fim = minutosDoDia(endTime);
  
    if (fim <= inicio) return null;
  
    return fim - inicio;
  }
  
  function extrairIntervaloHorario(input: string): {
    startTime: string;
    endTime: string;
    durationMinutes: number;
  } | null {
    const texto = input.toLowerCase();
  
    const padrao =
      texto.match(
        /\b(?:das|de)?\s*(\d{1,2})(?:h|:)?(\d{2})?\s*(?:às|as|a|-)\s*(\d{1,2})(?:h|:)?(\d{2})?\b/i
      );
  
    if (!padrao) return null;
  
    const horaInicio = Number(padrao[1]);
    const minutoInicio = padrao[2] ? Number(padrao[2]) : 0;
    const horaFim = Number(padrao[3]);
    const minutoFim = padrao[4] ? Number(padrao[4]) : 0;
  
    if (
      horaInicio < 0 ||
      horaInicio > 23 ||
      horaFim < 0 ||
      horaFim > 23 ||
      minutoInicio < 0 ||
      minutoInicio > 59 ||
      minutoFim < 0 ||
      minutoFim > 59
    ) {
      return null;
    }
  
    const startTime = formatarHora(horaInicio, minutoInicio);
    const endTime = formatarHora(horaFim, minutoFim);
    const durationMinutes = calcularDuracao(startTime, endTime);
  
    if (!durationMinutes) return null;
  
    return {
      startTime,
      endTime,
      durationMinutes,
    };
  }
  
  function aplicarIntervaloHorarioOriginal(input: string, objeto: any) {
    if (!objeto || objeto.kind !== "event" || !objeto.data) {
      return objeto;
    }
  
    const intervalo = extrairIntervaloHorario(input);
  
    if (!intervalo) {
      return objeto;
    }
  
    return {
      ...objeto,
      data: {
        ...objeto.data,
        startTime: intervalo.startTime,
        endTime: intervalo.endTime,
        durationMinutes: intervalo.durationMinutes,
        isAllDay: false,
      },
    };
  }

  function formatarHora(hora: number, minuto: number = 0): string {
    return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
  }
  
  function minutosDoDia(horario: string): number {
    const [hora, minuto] = horario.split(":").map(Number);
    return hora * 60 + minuto;
  }
  
  function calcularDuracao(startTime: string, endTime: string): number | null {
    const inicio = minutosDoDia(startTime);
    const fim = minutosDoDia(endTime);
  
    if (fim <= inicio) return null;
  
    return fim - inicio;
  }
  
  function extrairIntervaloHorario(input: string): {
    startTime: string;
    endTime: string;
    durationMinutes: number;
  } | null {
    const texto = input.toLowerCase();
  
    const padrao = texto.match(
      /\b(?:das|de)?\s*(\d{1,2})(?:h|:)?(\d{2})?\s*(?:às|as|a|-)\s*(\d{1,2})(?:h|:)?(\d{2})?\b/i
    );
  
    if (!padrao) return null;
  
    const horaInicio = Number(padrao[1]);
    const minutoInicio = padrao[2] ? Number(padrao[2]) : 0;
    const horaFim = Number(padrao[3]);
    const minutoFim = padrao[4] ? Number(padrao[4]) : 0;
  
    if (
      horaInicio < 0 ||
      horaInicio > 23 ||
      horaFim < 0 ||
      horaFim > 23 ||
      minutoInicio < 0 ||
      minutoInicio > 59 ||
      minutoFim < 0 ||
      minutoFim > 59
    ) {
      return null;
    }
  
    const startTime = formatarHora(horaInicio, minutoInicio);
    const endTime = formatarHora(horaFim, minutoFim);
    const durationMinutes = calcularDuracao(startTime, endTime);
  
    if (!durationMinutes) return null;
  
    return {
      startTime,
      endTime,
      durationMinutes,
    };
  }
  
  function aplicarIntervaloHorarioOriginal(input: string, objeto: any) {
    if (!objeto || objeto.kind !== "event" || !objeto.data) {
      return objeto;
    }
  
    const intervalo = extrairIntervaloHorario(input);
  
    if (!intervalo) {
      return objeto;
    }
  
    return {
      ...objeto,
      data: {
        ...objeto.data,
        startTime: intervalo.startTime,
        endTime: intervalo.endTime,
        durationMinutes: intervalo.durationMinutes,
      },
    };
  }

  export async function handler(event: any) {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Método não permitido." }),
      };
    }
  
    const apiKey = process.env.GEMINI_API_KEY;
  
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Chave GEMINI_API_KEY não configurada no Netlify.",
        }),
      };
    }
  
    let input = "";
  
    try {
      const body = JSON.parse(event.body || "{}");
      input = String(body.input || "").trim();
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Corpo da requisição inválido." }),
      };
    }
  
    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Texto vazio." }),
      };
    }
  
    const hoje = hojeISO();
  
    const prompt = `
  Você é o intérprete inteligente do aplicativo familiar Agenda FF.
  
  Sua tarefa é transformar UMA frase digitada ou falada em UM objeto JSON válido.
  
  DATA DE HOJE:
  ${hoje}
  
  PESSOAS:
  - F1 = Felipe
  - F2 = Fabiane
  - CL = Clarisse
  - FF = Família toda
  
  CATEGORIAS VÁLIDAS:
  "Saúde", "Trabalho", "Escola", "Casa", "Família", "Evento", "Documento", "Outro"
  
  PRIORIDADES VÁLIDAS:
  "Baixa", "Normal", "Alta"
  
  REGRAS IMPORTANTES:
  1. Responda apenas JSON puro.
  2. Nunca use markdown.
  3. Se a frase tiver compra, retorne kind "shopping".
  4. Se a frase for tarefa sem horário, retorne kind "task".
  5. Se tiver data, horário, cliente, reunião, consulta, catequese, formação, turma ou local, retorne kind "event".
  6. Se a frase tiver várias coisas separadas por vírgula, interprete apenas a primeira coisa principal.
  7. "cliente" normalmente é F2, categoria "Trabalho", duração 60 minutos.
  8. "pediatra", "vacina", "consulta da Clarisse" normalmente é CL, categoria "Saúde".
  9. "almoço", "jantar", "passeio em família" normalmente é FF, categoria "Família".
  10. "dia de formação", "manhã de formação", "catequese", "mentoria", "turma", "Corrêas" e "Colégio Santo Inácio" são categoria "Escola".
  11. Preserve "Corrêas, Petrópolis", "Itaicí" e "Colégio Santo Inácio" com grafia correta.
  12. Datas devem estar em formato YYYY-MM-DD.
  13. Horários devem estar em formato HH:mm.
  14. Se não houver data, use null.
  15. Se não houver horário, use null.
  16. Use sourceText com uma versão limpa e fiel da frase original.
  17. Se a frase tiver intervalo de horário, como "das 8 às 18", "de 8h às 18h", "8h-18h" ou "8 às 18", use o primeiro horário como startTime e o segundo como endTime.
18. Quando houver intervalo explícito, não use duração padrão de 60 minutos.
19. Calcule durationMinutes pela diferença entre startTime e endTime.
20. Exemplos:
- "das 8 às 18" = startTime "08:00", endTime "18:00", durationMinutes 600
- "de 14h às 16h" = startTime "14:00", endTime "16:00", durationMinutes 120
- "das 7h30 às 11h30" = startTime "07:30", endTime "11:30", durationMinutes 240 
FORMATO PARA EVENTO:
  {
    "kind": "event",
    "data": {
      "personCode": "F1" | "F2" | "CL" | "FF" | null,
      "title": string,
      "date": string | null,
      "startTime": string | null,
      "endTime": string | null,
      "durationMinutes": number | null,
      "location": string | null,
      "category": "Saúde" | "Trabalho" | "Escola" | "Casa" | "Família" | "Evento" | "Documento" | "Outro",
      "priority": "Baixa" | "Normal" | "Alta",
      "sourceText": string
    }
  }
  
  FORMATO PARA TAREFA:
  {
    "kind": "task",
    "data": {
      "personCode": "F1" | "F2" | "CL" | "FF" | null,
      "title": string,
      "date": string | null,
      "category": "Saúde" | "Trabalho" | "Escola" | "Casa" | "Família" | "Evento" | "Documento" | "Outro",
      "priority": "Baixa" | "Normal" | "Alta",
      "status": "pendente",
      "sourceText": string
    }
  }
  
  FORMATO PARA COMPRA:
  {
    "kind": "shopping",
    "data": {
      "item": string,
      "quantity": string | null,
      "category": string,
      "status": "pendente",
      "notes": "",
      "sourceText": string
    }
  }
  
  FRASE A INTERPRETAR:
  "${input}"
  `;
  
    try {
      const resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );
  
      const data = await resposta.json();
  
      if (!resposta.ok) {
        return {
          statusCode: resposta.status,
          body: JSON.stringify({
            error: "Erro ao chamar Gemini.",
            details: data,
          }),
        };
      }
  
      const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
      if (!texto) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: "Resposta vazia da IA.",
            details: data,
          }),
        };
      }
  
      const jsonLimpo = limparRespostaJson(texto);
      const objeto = JSON.parse(jsonLimpo);
      const objetoCorrigido = aplicarIntervaloHorarioOriginal(input, objeto);
      
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(objetoCorrigido),
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Falha ao interpretar com IA.",
          details: error?.message || String(error),
        }),
      };
    }
  }