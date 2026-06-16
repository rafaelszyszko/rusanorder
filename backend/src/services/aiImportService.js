import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = 'gemini-2.5-flash';

// Gemini usa schema no formato OpenAPI 3.0 (parecido com JSON Schema, mas com
// `Type.STRING`, `Type.OBJECT`, etc.). Não suporta `additionalProperties`.
const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    client_match: {
      type: Type.OBJECT,
      properties: {
        suggested_client_id: { type: Type.INTEGER, nullable: true },
        suggested_client_name: { type: Type.STRING, nullable: true },
        suggested_client_cnpj: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['alta', 'media', 'baixa'] },
        reasoning: { type: Type.STRING },
      },
      required: ['suggested_client_id', 'confidence', 'reasoning'],
    },
    purchase_order: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['alta', 'media', 'baixa'] },
      },
      required: ['value', 'confidence'],
    },
    notes: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING, nullable: true },
        confidence: { type: Type.STRING, enum: ['alta', 'media', 'baixa'] },
      },
      required: ['value', 'confidence'],
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          unit: { type: Type.STRING, enum: ['m²', 'un', 'kg', 'm', 'pc'] },
          quantity: { type: Type.NUMBER },
          unit_price: { type: Type.NUMBER },
          confidence: { type: Type.STRING, enum: ['alta', 'media', 'baixa'] },
        },
        required: ['description', 'unit', 'quantity', 'unit_price', 'confidence'],
      },
    },
    extracted_total: { type: Type.NUMBER, nullable: true },
    overall_confidence: { type: Type.NUMBER },
  },
  required: ['client_match', 'purchase_order', 'notes', 'items', 'extracted_total', 'overall_confidence'],
};

function buildSystemPrompt(clients) {
  const clientList = clients
    .map((c) => `  - id=${c.id} | nome="${c.name}" | cnpj="${c.cnpj || ''}" | código="${c.code}"`)
    .join('\n');

  return `Você é um assistente especializado em extrair dados estruturados de ordens de compra (OCs) em PDF do setor de couro/curtume.

Sua tarefa: analisar o PDF anexado e extrair os dados necessários para criar um pedido no sistema RusanOrder.

REGRAS DE EXTRAÇÃO:

1. **Cliente:** identifique a empresa que está EMITINDO a ordem de compra (não o curtume/destinatário). Procure por CNPJ, razão social, nome fantasia. Compare com a lista de clientes cadastrados abaixo e sugira o melhor match.
   - Confiança "alta": match exato por CNPJ.
   - Confiança "media": match por nome (com variações ortográficas razoáveis).
   - Confiança "baixa": match parcial ou inferido.
   - Se nenhum match razoável, retorne suggested_client_id=null com reasoning explicando.

2. **Ordem de Compra (purchase_order):** número do documento. Geralmente rotulado como "OC", "Pedido", "PO", "Nº", "Number".

3. **Itens:** cada linha da OC com produto + quantidade + preço unitário. Para cada item:
   - description: descrição limpa, sem códigos internos do cliente (ex: "Couro Acabado Preto 1.2mm").
   - unit: normalize para uma das opções: m² (metros quadrados — padrão para couro), un (unidades), kg (quilos), m (metros lineares), pc (peças).
   - quantity e unit_price: valores numéricos brasileiros (vírgula como decimal, ponto como milhar) — converta para float com ponto.
   - confidence: nível de certeza da extração de cada item.

4. **Total extraído:** se houver um valor total no documento, retorne-o em extracted_total. NÃO recalcule — o backend recalcula a partir dos itens. Use null se não houver.

5. **Observações:** texto livre relevante que apareça (condições de pagamento, prazo, observações). Use null se não houver.

6. **Confiança geral (overall_confidence):** valor entre 0 e 1 indicando quão confiante você está na extração completa.

CLIENTES CADASTRADOS NO SISTEMA:
${clientList}

Sempre responda com o JSON estruturado conforme o schema. Não inclua texto fora do JSON.`;
}

export async function extractOrderFromPdf(pdfPath, clients) {
  const pdfBuffer = await fs.promises.readFile(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            text: 'Extraia os dados desta ordem de compra conforme o schema.',
          },
        ],
      },
    ],
    config: {
      systemInstruction: buildSystemPrompt(clients),
      responseMimeType: 'application/json',
      responseSchema: extractionSchema,
      maxOutputTokens: 8000,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Resposta da IA sem conteúdo');
  }

  let extracted;
  try {
    extracted = JSON.parse(text);
  } catch {
    throw new Error('Resposta da IA não é JSON válido');
  }

  return {
    extracted,
    usage: response.usageMetadata,
    model: MODEL,
  };
}
