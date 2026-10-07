import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export function getGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  ).trim();
}

export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
}

// Check AI providers status
export async function getAiServiceStatus() {
  const geminiKey = getGeminiApiKey();
  const ollamaUrl = getOllamaBaseUrl();

  let ollamaOnline = false;
  let ollamaModels: string[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json() as any;
      ollamaOnline = true;
      ollamaModels = (data.models || []).map((m: any) => m.name || m.model);
    }
  } catch {
    ollamaOnline = false;
  }

  return {
    gemini: {
      configured: !!geminiKey,
      keyMasked: geminiKey ? `${geminiKey.substring(0, 6)}...${geminiKey.substring(geminiKey.length - 4)}` : null,
      supportedModels: ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    },
    ollama: {
      online: ollamaOnline,
      baseUrl: ollamaUrl,
      models: ollamaModels,
    },
    defaultProvider: geminiKey ? 'gemini' : ollamaOnline ? 'ollama' : 'none',
  };
}

// Generate completion via Gemini with model fallback
export async function generateGeminiCompletion(
  prompt: string,
  systemInstruction?: string,
  userApiKey?: string,
  modelName: string = 'gemini-3.8-flash'
): Promise<{ text: string; model: string }> {
  const keyToUse = userApiKey?.trim() || getGeminiApiKey();
  if (!keyToUse) {
    throw new Error('Gemini API key is not configured in .env (GEMINI_API_KEY).');
  }

  const genAI = new GoogleGenerativeAI(keyToUse);
  const candidateModels = [modelName, 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
  const uniqueModels = Array.from(new Set(candidateModels));

  let lastError: any = null;

  for (const m of uniqueModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        systemInstruction: systemInstruction || undefined,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return { text, model: m };
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini model ${m} failed:`, err?.message || err);
    }
  }

  throw lastError || new Error('Failed to generate response with Gemini');
}

// Generate completion via Ollama
export async function generateOllamaCompletion(
  messages: Array<{ role: string; content: string }>,
  model: string = 'llama3.2:latest',
  system?: string
): Promise<{ text: string; model: string }> {
  const baseUrl = getOllamaBaseUrl();
  const formattedMessages = [...messages];
  if (system && !formattedMessages.some((m) => m.role === 'system')) {
    formattedMessages.unshift({ role: 'system', content: system });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  const resp = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      stream: false,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Ollama error (${resp.status}): ${errText}`);
  }

  const data = await resp.json() as any;
  return {
    text: data.message?.content || '',
    model: data.model || model,
  };
}

// Extract Tasks from text or requirements using AI (Gemini → Ollama → Fallback)
export async function parseTasksFromText(
  rawText: string,
  userApiKey?: string,
  preferredProvider?: 'gemini' | 'ollama'
): Promise<Array<{
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  column: 'todo' | 'in_progress' | 'review' | 'done';
  tags: string[];
  subtasks: Array<{ title: string; completed: boolean }>;
}>> {
  const systemPrompt = `You are an expert Agile Scrum master and ITSM Task breakdown engine.
Analyze the user's input, document, or requirements and return a clean JSON array of actionable Kanban tasks.
Each task item MUST have this exact JSON structure:
{
  "title": "Short descriptive title",
  "description": "Comprehensive description of task goals and steps",
  "priority": "urgent" | "high" | "medium" | "low",
  "column": "todo" | "in_progress" | "review" | "done",
  "tags": ["Tag1", "Tag2"],
  "subtasks": [{"title": "Subtask title", "completed": false}]
}
IMPORTANT: Write all task titles and descriptions in English or Roman Urdu ONLY. NEVER use Hindi, Devanagari, or any non-Latin script.
Respond ONLY with a valid JSON array. Do not include markdown code block backticks or commentary.`;

  const userPrompt = `Please extract actionable tasks from the following text:\n\n${rawText}`;

  // Helper to parse AI response text into tasks array
  function parseAiResponse(text: string) {
    // Strip markdown fences, <think> blocks, and leading/trailing noise
    let cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Find the JSON array in the response (handles leading text before `[`)
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      cleaned = cleaned.substring(arrStart, arrEnd + 1);
    }

    return JSON.parse(cleaned);
  }

  const geminiKey = userApiKey?.trim() || getGeminiApiKey();
  const useGeminiFirst = preferredProvider !== 'ollama' && !!geminiKey;

  // --- Strategy 1: Try Gemini first (if key exists and not forced to ollama) ---
  if (useGeminiFirst) {
    try {
      const { text } = await generateGeminiCompletion(userPrompt, systemPrompt, userApiKey);
      return parseAiResponse(text);
    } catch (err) {
      console.warn('Gemini task extraction failed, trying Ollama fallback:', (err as any)?.message || err);
    }
  }

  // --- Strategy 2: Try Ollama (local) ---
  try {
    const ollamaStatus = await getAiServiceStatus();
    if (ollamaStatus.ollama.online && ollamaStatus.ollama.models.length > 0) {
      // Pick the best available model (prefer llama3.2, then phi3, then first available)
      const preferredModels = ['llama3.2:latest', 'phi3:latest'];
      const ollamaModel = preferredModels.find(m => ollamaStatus.ollama.models.includes(m))
        || ollamaStatus.ollama.models[0];

      console.log(`Using Ollama model "${ollamaModel}" for task extraction...`);

      const { text } = await generateOllamaCompletion(
        [{ role: 'user', content: userPrompt }],
        ollamaModel,
        systemPrompt
      );

      return parseAiResponse(text);
    } else {
      console.warn('Ollama is offline or has no models — skipping Ollama task extraction.');
    }
  } catch (err) {
    console.warn('Ollama task extraction also failed:', (err as any)?.message || err);
  }

  // --- Strategy 3: Try Gemini as last resort (if we skipped it earlier) ---
  if (!useGeminiFirst && geminiKey) {
    try {
      const { text } = await generateGeminiCompletion(userPrompt, systemPrompt, userApiKey);
      return parseAiResponse(text);
    } catch (err) {
      console.warn('Gemini last-resort also failed:', (err as any)?.message || err);
    }
  }

  // --- Strategy 4: Basic fallback (no AI available) ---
  console.warn('All AI providers failed — returning basic fallback task.');
  return [
    {
      title: rawText.slice(0, 50).trim() || 'New Extracted Task',
      description: rawText,
      priority: 'medium',
      column: 'todo',
      tags: ['General', 'Imported'],
      subtasks: [{ title: 'Initial review', completed: false }],
    },
  ];
}
