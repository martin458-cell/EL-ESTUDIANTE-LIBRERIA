import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API endpoint for smart search interpretation
app.post("/api/smart-search", async (req, res) => {
  const { query: searchQuery } = req.body;
  if (!searchQuery || typeof searchQuery !== "string" || !searchQuery.trim()) {
    return res.json({
      correctedQuery: "",
      category: "todos",
      minPrice: null,
      maxPrice: null,
      isOffer: null,
      featured: null,
      keywords: [],
      explanation: "Búsqueda vacía"
    });
  }

  try {
    const systemPrompt = `You are an expert search query interpreter for a digital school and office store catalog in Puquio, Peru.
The store sells products categorized into three main departments:
- 'libros' (books, reading materials, dictionaries, manuals)
- 'utiles' (school and office supplies like notebooks, backpacks, calculators, pens, colors, papers)
- 'tecnologia' (computers, tablets, usb drives, headphones, smart gadgets)

Interpret the user's natural language search query and map it into structured filtering properties.
1. Correct any spelling errors (e.g. "tecnolojia" -> "tecnologia", "lebros" -> "libros", "lapicero" is a school/office supply 'utiles').
2. Identify the target category. Set category to "libros", "utiles", "tecnologia", or "todos" if not specific.
3. Identify numerical price boundaries:
   - "menos de 50" -> maxPrice: 50
   - "más de 20" -> minPrice: 20
   - "barato" or "económico" -> if price isn't specified but budget focused, you don't need to guess a number unless user is specific; look for actual numbers.
4. Detect intent/promotions:
   - If user asks for discounts, offers, clearout, or bargain ("en oferta", "descuentos", "remates", "liquidacion", "barato"), set isOffer to true.
   - If user asks for new items, latest stock, highlights ("novedades", "destacado", "nuevo", "lo último"), set featured to true.
5. Extract key search words/concepts/brands (e.g. "faber castell", "santillana", "norma", "tijera", "mochila") into the keywords array. Keep keywords in Spanish and singular or plural depending on use.

Return only a valid JSON response matching the requested schema. Do not write any markdown code blocks, just raw JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Search query to interpret: "${searchQuery}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["correctedQuery", "category", "keywords", "explanation"],
          properties: {
            correctedQuery: {
              type: Type.STRING,
              description: "The spelling-corrected text search term in Spanish"
            },
            category: {
              type: Type.STRING,
              description: "Category of products: 'libros', 'utiles', 'tecnologia', or 'todos'"
            },
            minPrice: {
              type: Type.NUMBER,
              description: "Minimum price requested, or null"
            },
            maxPrice: {
              type: Type.NUMBER,
              description: "Maximum price requested, or null"
            },
            isOffer: {
              type: Type.BOOLEAN,
              description: "True if user asked for offers, discounts, cheap, or promos"
            },
            featured: {
              type: Type.BOOLEAN,
              description: "True if user asked for newest, novelties, or featured items"
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of key brand/product types/words extracted for scanning"
            },
            explanation: {
              type: Type.STRING,
              description: "A friendly, ultra-short explanation in Spanish of what limits are being applied, max 80 characters. E.g. 'Buscando libros de menos de S/ 50'"
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsed);

  } catch (err: any) {
    console.error("Gemini interpretation failed:", err);
    return res.status(500).json({ error: "Error interpreting query with Gemini", details: err?.message });
  }
});

// Configure Vite or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Disable HMR WebSockets to prevent connection errors behind proxy environments
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
