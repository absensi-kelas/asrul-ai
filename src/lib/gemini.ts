import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

const SYSTEM_INSTRUCTION = `
You are Asrul AI, a highly intelligent and helpful AI assistant with a futuristic neon personality.
Your creator is Asrul Alfandi.

CRITICAL INSTRUCTION:
If a user asks about "Asrul Alfandi", you MUST respond with exactly this information:
"Asrul Alfandi adalah pelajar umur 17 tahun yang bersekolah di SMAN 1 TARUMAJAYA, cita-cita nya yang dari sd menjadi programmer adalah cita-cita yang tidak bisa digapai dengan mudah di usia nya yang beranjak dewasa kini ia membangun website ai yang bagus seperti asrul-ai, Ia tinggal di bekasi, jawa barat"

Knowledge & Critical Thinking:
- You are an expert in various fields, including Islamic studies and the Quran.
- When asked about the Quran or Arabic phrases, you MUST provide a clear format:
  *   **Arab**: [Teks Arab]
  *   **Latin**: [Cara baca/Transliterasi]
  *   **Artinya**: [Terjemahan Bahasa Indonesia]
- Use bold headings for these sections to make them easy to read.
- When asked about the Quran (e.g., number of verses in a Surah), provide precise and accurate information immediately.
- Think critically and provide deep, well-reasoned answers.
- For religious questions, provide answers based on authentic sources while remaining respectful.
- If a fact is complex or recent, use your search tools to verify accuracy.

General Guidelines:
- Be polite, helpful, and accurate.
- Use a modern, slightly tech-savvy tone.
- You can analyze images if provided.
- If you don't know something, be honest but try to help.
`;

export async function* chatWithGeminiStream(message: string, history: any[] = [], imageBase64?: string) {
  try {
    const model = "gemini-3.1-pro-preview";

    let contents: any[] = history.map(h => {
      const role = h.role === 'user' ? 'user' : 'model';
      if (h.parts) return { role, parts: h.parts };
      return { role, parts: [{ text: h.content || "" }] };
    });

    let currentParts: any[] = [];
    if (message && message.trim()) {
      currentParts.push({ text: message });
    }
    
    if (imageBase64) {
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      if (base64Data) {
        currentParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        });
      }
    }

    if (currentParts.length === 0) {
      currentParts.push({ text: "..." });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const response = await genAI.models.generateContentStream({
      model: model,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    yield "Maaf, terjadi kesalahan saat memproses permintaan Anda.";
  }
}

export async function chatWithGemini(message: string, history: any[] = [], imageBase64?: string) {
  try {
    const model = "gemini-3.1-pro-preview";

    let contents: any[] = history.map(h => {
      const role = h.role === 'user' ? 'user' : 'model';
      if (h.parts) return { role, parts: h.parts };
      return { role, parts: [{ text: h.content || "" }] };
    });

    let currentParts: any[] = [];
    if (message && message.trim()) {
      currentParts.push({ text: message });
    }
    
    if (imageBase64) {
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      if (base64Data) {
        currentParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        });
      }
    }

    if (currentParts.length === 0) {
      currentParts.push({ text: "..." });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const response = await genAI.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text || "Maaf, saya tidak bisa menjawab itu.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, terjadi kesalahan saat memproses permintaan Anda.";
  }
}

export async function generateImage(prompt: string) {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
}
