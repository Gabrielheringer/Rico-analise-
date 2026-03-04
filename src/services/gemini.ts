import { GoogleGenAI, Modality, Type } from "@google/genai";

export interface AnalysisResult {
  trend: "Alta" | "Baixa" | "Lateral";
  strength: number; // 0-100
  entryM1: string;
  entryM5: string;
  rationale: string;
  confidence: number;
}

export async function generateSpeech(text: string): Promise<string | null> {
  const apiKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'undefined' && process.env.GEMINI_API_KEY !== '') 
    ? process.env.GEMINI_API_KEY 
    : (process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY !== '')
      ? process.env.API_KEY
      : (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey.length < 10) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const callTts = async (retries = 2, delay = 1000): Promise<any> => {
      try {
        return await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' },
              },
            },
          },
        });
      } catch (error: any) {
        const isBusy = error.message?.includes("503") || error.message?.includes("high demand") || error.message?.includes("UNAVAILABLE");
        const isQuota = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED");
        
        if ((isBusy || isQuota) && retries > 0) {
          const waitTime = isQuota ? delay * 3 : delay;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return callTts(retries - 1, waitTime * 2);
        }
        throw error;
      }
    };

    const response = await callTts();

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Erro ao gerar voz:", error);
    return null;
  }
}

export async function analyzeChart(base64Image: string): Promise<AnalysisResult> {
  const apiKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'undefined' && process.env.GEMINI_API_KEY !== '') 
    ? process.env.GEMINI_API_KEY 
    : (process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY !== '')
      ? process.env.API_KEY
      : (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (!apiKey || apiKey.length < 10) {
    console.error("Chave de API ausente ou inválida.");
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Model strategy: Try primary, fallback to stable if busy
  const primaryModel = "gemini-3-flash-preview";
  const secondaryModel = "gemini-flash-latest";
  const tertiaryModel = "gemini-2.5-flash";
  
  // Helper for retrying with exponential backoff and fallback
  async function callWithRetry(params: any, retries = 4, delay = 2000): Promise<any> {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isBusy = error.message?.includes("503") || error.message?.includes("high demand") || error.message?.includes("UNAVAILABLE");
      const isQuotaExceeded = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED");
      
      if ((isBusy || isQuotaExceeded) && retries > 0) {
        // Model rotation logic
        if (isBusy || isQuotaExceeded) {
          if (params.model === primaryModel) {
            console.log(`Modelo primário atingiu limite ou está ocupado, alternando para secundário: ${secondaryModel}`);
            params.model = secondaryModel;
          } else if (params.model === secondaryModel) {
            console.log(`Modelo secundário atingiu limite ou está ocupado, alternando para terciário: ${tertiaryModel}`);
            params.model = tertiaryModel;
          } else {
            console.log(`Todos os modelos com limitações, aguardando para tentar novamente...`);
          }
        }

        // Try to extract retry delay from error message (e.g., "Please retry in 22s")
        let waitTime = isQuotaExceeded ? delay * 3 : delay;
        const retryMatch = error.message?.match(/retry in ([\d.]+)s/i);
        if (retryMatch && retryMatch[1]) {
          waitTime = (parseFloat(retryMatch[1]) + 1) * 1000; // Add 1s buffer
          console.log(`Aguardando tempo sugerido pela API: ${waitTime}ms`);
        }

        console.warn(`Tentando novamente em ${waitTime}ms... (Restam ${retries} tentativas)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        return callWithRetry(params, retries - 1, waitTime * 1.2);
      }
      throw error;
    }
  }

  // Consolidated Multi-Agent Prompt
  const consolidatedPrompt = `
    VOCÊ É UM SISTEMA DE INTELIGÊNCIA ARTIFICIAL MULTI-AGENTE INTEGRADO PARA ANÁLISE TÉCNICA DE TRADING.
    
    SUA TAREFA É EXECUTAR TRÊS PAPÉIS SIMULTANEAMENTE:
    1. ESPECIALISTA EM VISÃO: Analise a imagem do gráfico, identifique candles, tendências, suportes e resistências.
    2. ANALISTA TÉCNICO: Avalie a estrutura macro e o Price Action (padrões de velas, força de movimento).
    3. ESTRATEGISTA CHEFE: Consolide as informações e gere um sinal de alta precisão para M1 e M5.

    DIRETRIZES DE ANÁLISE:
    - Identifique a tendência (Alta, Baixa ou Lateral).
    - Localize pontos de entrada ideais para M1 (curto prazo) e M5 (médio prazo).
    - Forneça uma justificativa técnica (rationale) clara e concisa.
    - Atribua um nível de confiança de 0 a 100 baseado na clareza dos padrões.

    RESPOSTA OBRIGATÓRIA EM FORMATO JSON:
    {
      "trend": "Alta" | "Baixa" | "Lateral",
      "strength": number (0-100),
      "entryM1": "string (ex: 'Compra acima de 1.2345' ou 'Aguardar rompimento')",
      "entryM5": "string",
      "rationale": "string (justificativa técnica)",
      "confidence": number (0-100)
    }
  `;

  try {
    console.log("Iniciando análise consolidada (Otimização de Quota)...");
    
    const response = await callWithRetry({
      model: primaryModel,
      contents: {
        parts: [
          { text: consolidatedPrompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image.includes(",") ? base64Image.split(",")[1] : base64Image } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trend: { type: Type.STRING, description: "A tendência do gráfico: Alta, Baixa ou Lateral." },
            strength: { type: Type.NUMBER, description: "Força da tendência de 0 a 100." },
            entryM1: { type: Type.STRING, description: "Ponto de entrada para M1." },
            entryM5: { type: Type.STRING, description: "Ponto de entrada para M5." },
            rationale: { type: Type.STRING, description: "Justificativa técnica da análise." },
            confidence: { type: Type.NUMBER, description: "Nível de confiança de 0 a 100." }
          },
          required: ["trend", "strength", "entryM1", "entryM5", "rationale", "confidence"]
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("O servidor de IA não retornou uma resposta válida.");
    }

    let text = response.text;
    
    // Improved JSON extraction
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || 
                      text.match(/```\n?([\s\S]*?)\n?```/) || 
                      text.match(/\{[\s\S]*\}/);
                      
    if (jsonMatch) {
      // If it's a markdown match, take the captured group [1], otherwise take the whole match [0]
      text = jsonMatch[1] || jsonMatch[0];
    }
    
    return JSON.parse(text.trim()) as AnalysisResult;
  } catch (error: any) {
    console.error("Erro na análise de IA:", error);
    
    const isBusy = error.message?.includes("503") || error.message?.includes("high demand") || error.message?.includes("UNAVAILABLE");
    const isQuota = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED");

    if (isQuota) {
      throw new Error("Limite de uso da IA atingido (Quota Excedida). Por favor, aguarde um momento ou tente novamente mais tarde. Se o erro persistir, considere usar uma chave de API com plano pago.");
    }
    
    if (isBusy) {
      throw new Error("O servidor de IA está com alta demanda no momento. Por favor, aguarde alguns segundos e tente novamente.");
    }
    
    throw new Error(`Falha na análise: ${error.message || "Erro desconhecido"}`);
  }
}
