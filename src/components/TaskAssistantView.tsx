import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  FileText,
  File,
  Image,
  Table,
  Send,
  Bot,
  User,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Key,
  Paperclip,
  RefreshCw,
  Zap,
  Code2,
  Check
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
  modelUsed?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  text?: string;       // extracted text content
  base64?: string;     // for images
  mimeType?: string;   // original mime type for Gemini
}

// ─── Utility Helpers ────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(type: string, name: string = '') {
  if (type.startsWith('image/')) return <Image size={18} />;
  if (type === 'application/pdf' || name.endsWith('.pdf')) return <FileText size={18} />;
  if (type.includes('sheet') || type.includes('csv') || name.endsWith('.csv') || name.endsWith('.xlsx')) return <Table size={18} />;
  if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.py') || name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.json')) return <Code2 size={18} />;
  if (type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return <File size={18} />;
  return <FileText size={18} />;
}

function getFileColor(type: string, name: string = ''): string {
  if (type.startsWith('image/')) return '#f59e0b';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return '#ef4444';
  if (type.includes('sheet') || type.includes('csv') || name.endsWith('.csv') || name.endsWith('.xlsx')) return '#10b981';
  if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.py')) return '#06b6d4';
  if (type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return '#3b82f6';
  return '#8b5cf6';
}

// ─── PDF Raw Stream & Text Extractor Fallback ────────────────────────────────

function extractTextFromPdfArrayBuffer(buffer: ArrayBuffer, fileName: string): string {
  try {
    const bytes = new Uint8Array(buffer);
    let str = '';
    // Read printable ASCII and UTF-8 characters from binary stream
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        str += String.fromCharCode(byte);
      } else if (str.length > 0 && str[str.length - 1] !== ' ') {
        str += ' ';
      }
    }

    // Extract text chunks inside PDF parenthesis (e.g. (Incident Report) or (CHG-000162))
    const textSegments: string[] = [];
    
    // Pattern 1: (Text) Tj or TJ
    const parenMatches = str.match(/\(([^\\()]{2,150})\)/g);
    if (parenMatches) {
      for (const m of parenMatches) {
        const cleaned = m.slice(1, -1).trim();
        if (cleaned.length > 2 && !/^[0-9\s.,;:\-_/]+$/.test(cleaned) && !cleaned.startsWith('Font') && !cleaned.startsWith('Length')) {
          textSegments.push(cleaned);
        }
      }
    }

    // Pattern 2: Ticket IDs & Keywords (INC-XXXX, CHG-XXXX, PRB-XXXX, Workflow, Step, Status)
    const keywordsMatches = str.match(/\b(INC-[0-9]+|CHG-[0-9]+|PRB-[0-9]+|REQ-[0-9]+|Workflow\s*[0-9:]*|Step\s*[0-9:]*|Incident|Change|Problem|Service\s*Desk|Passed|Failed|Completed|Resolved|Assigned|Priority|Urgency|Impact)\b/gi);
    if (keywordsMatches) {
      textSegments.push(...keywordsMatches);
    }

    const uniqueText = Array.from(new Set(textSegments)).join(' ');
    if (uniqueText.length > 30) {
      return `[PDF Report Extracted: ${fileName}]\n${uniqueText}`;
    }
  } catch (err) {
    console.warn('PDF stream extraction error:', err);
  }
  return `[PDF File: ${fileName}]`;
}

// ─── Extract Text from File ──────────────────────────────────────────────────

async function extractTextFromFile(file: File): Promise<{ text?: string; base64?: string; mimeType?: string }> {
  const type = file.type || '';
  const name = file.name || '';
  const nameLower = name.toLowerCase();

  // Images → base64 for Gemini Vision
  if (type.startsWith('image/') || nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.webp')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve({ base64, mimeType: type || 'image/jpeg' });
      };
      reader.onerror = () => resolve({ text: `[Error reading image: ${file.name}]` });
      reader.readAsDataURL(file);
    });
  }

  // PDF → Try PDF.js or robust binary stream text extraction
  if (type === 'application/pdf' || nameLower.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      if (pdfjsLib?.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '3.11.174'}/build/pdf.worker.min.js`;
      }
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      let fullText = `[PDF Document: ${file.name} — ${totalPages} pages]\n\n`;
      for (let i = 1; i <= Math.min(totalPages, 25); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      return { text: fullText };
    } catch (e) {
      // Fallback: binary stream parser
      const streamText = extractTextFromPdfArrayBuffer(arrayBuffer, file.name);
      return { text: `${streamText}\n\n[File Name: ${file.name}]` };
    }
  }

  // DOCX → use mammoth
  if (type.includes('word') || nameLower.endsWith('.docx')) {
    try {
      // @ts-ignore
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { text: `[Word Document: ${file.name}]\n\n${result.value}` };
    } catch (e) {
      return { text: `[Word Document: ${file.name} (${formatBytes(file.size)})]` };
    }
  }

  // Plain text, Code, JSON, CSV, Markdown, Logs
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      resolve({ text });
    };
    reader.onerror = () => resolve({ text: `[Error reading text file: ${file.name}]` });
    reader.readAsText(file);
  });
}

// ─── Built-in Smart Local AI Engine (Semantic Q&A & Document Reader) ─────────
// Reads actual file content and answers general or specific questions accurately

function runLocalSmartAI(files: UploadedFile[], question: string): string {
  const q = question.toLowerCase().trim();
  const isUrdu = /kya|kiya|kaam|sahi|hai|batao|karo|kesa|mujhe|hain|aur|mein|shukriya|theek|galti|kami|test|flow|report|solve|doc|work|kahan|kaun|kitna|summary|khulasa/i.test(question);

  if (files.length === 0) {
    if (q.includes('hello') || q.includes('hi') || q.includes('salam') || q.includes('aoa') || q.includes('hey')) {
      return isUrdu
        ? `👋 **Walaikum Assalam! Main aapka AI Task & Document Assistant hoon.**\n\nApni file (PDF, Word, Code, Image) baayi taraf upload karein aur phir jo chahein poochein — main document ko parh kar aapke har sawaal ka sahi jawab doonga! 🚀`
        : `👋 **Hello! I am your AI Document & Task Assistant.**\n\nUpload your document (PDF, Word, Code, Excel) on the left panel, and I will read the content and answer any specific question you have! 🚀`;
    }

    return isUrdu
      ? `💡 **Document Assistant Ready!**\n\nAapne poocha: *"${question}"*\n\nIs sawaal ka exact jawab dene ke liye **baayein taraf apni file upload karein** (Word, PDF, Code, Text). Main document ke andar se exact maloomat nikaal kar jawab doonga.`
      : `💡 **AI Assistant Ready!**\n\nYou asked: *"${question}"*\n\nPlease **upload your file** on the left panel so I can extract and answer your question directly from the document.`;
  }

  // Combine text from all uploaded files
  const combinedDocs = files.map(f => ({
    name: f.name,
    text: f.text || '',
    lines: (f.text || '').split('\n').filter(l => l.trim().length > 0),
  }));

  const allLines = combinedDocs.flatMap(d => d.lines);

  // ─── 1. Cross-Verification Intent (e.g. 1 Test Flow + Multiple Reports) ────
  const isComparisonQuery = /solve|test\s*flow|report|cross|verify|cover|match|kya\s*solve/i.test(q) && files.length > 1;
  if (isComparisonQuery) {
    const testFile = files.find(f => /workflow|flow|test|task|spec|req|guide|three/i.test(f.name) && !f.name.toLowerCase().includes('report')) || files[0];
    const reportFiles = files.filter(f => f.id !== testFile.id);
    const testText = testFile.text || '';

    interface WorkflowItem {
      title: string;
      keywords: string[];
      ticketPattern?: RegExp;
      description: string;
    }

    const detectedWorkflows: WorkflowItem[] = [];

    if (/workflow\s*0?1|incident/i.test(testText) || /incident/i.test(testFile.name)) {
      detectedWorkflows.push({
        title: 'Workflow 01: Incident Management (ITSM Core)',
        keywords: ['incident', 'inc', 'inc-', 'outage', 'service desk', 'priority', 'ticket'],
        ticketPattern: /INC-[0-9]+/i,
        description: 'Staff cannot access business service → Service Desk creates Incident ticket → Resolution.',
      });
    }

    if (/workflow\s*0?2|change/i.test(testText) || /change/i.test(testFile.name)) {
      detectedWorkflows.push({
        title: 'Workflow 02: Change Management (CHG)',
        keywords: ['change', 'chg', 'chg-', 'assessment', 'approval', 'cab', 'implementation'],
        ticketPattern: /CHG-[0-9]+/i,
        description: 'Standard/Normal Change request → Risk assessment & Approval → Execution & Review.',
      });
    }

    if (/workflow\s*0?3|problem|service\s*request/i.test(testText)) {
      detectedWorkflows.push({
        title: 'Workflow 03: Problem / Service Request Management',
        keywords: ['problem', 'prb', 'service request', 'req', 'root cause', 'workaround'],
        ticketPattern: /PRB-[0-9]+|REQ-[0-9]+/i,
        description: 'Recurring incident analysis or Service Catalog request fulfillment.',
      });
    }

    if (detectedWorkflows.length === 0) {
      testText.split('\n').filter(l => l.trim().length > 10 && !l.startsWith('[Word')).slice(0, 3).forEach((l, i) => {
        detectedWorkflows.push({
          title: `Task Step ${i + 1}: ${l.slice(0, 60)}`,
          keywords: l.toLowerCase().split(/\s+/).filter(w => w.length > 3),
          description: l.slice(0, 100),
        });
      });
    }

    interface VerificationResult {
      workflow: WorkflowItem;
      status: 'SOLVED' | 'MISSING';
      matchedReport?: string;
      ticketFound?: string;
    }

    const verificationResults: VerificationResult[] = [];
    detectedWorkflows.forEach(wf => {
      let matchedReport = '';
      let matchedTicket = '';
      let isMatched = false;

      for (const rep of reportFiles) {
        const combined = `${rep.name} ${rep.text || ''}`.toLowerCase();
        if (wf.ticketPattern) {
          const m = combined.match(wf.ticketPattern) || rep.name.match(wf.ticketPattern);
          if (m) {
            matchedTicket = m[0].toUpperCase();
            matchedReport = rep.name;
            isMatched = true;
            break;
          }
        }
        const kwMatches = wf.keywords.filter(k => combined.includes(k)).length;
        if (kwMatches >= 2 || (kwMatches >= 1 && wf.keywords.some(k => rep.name.toLowerCase().includes(k)))) {
          matchedReport = rep.name;
          isMatched = true;
          break;
        }
      }

      if (isMatched) {
        verificationResults.push({ workflow: wf, status: 'SOLVED', matchedReport, ticketFound: matchedTicket });
      } else {
        verificationResults.push({ workflow: wf, status: 'MISSING' });
      }
    });

    const solved = verificationResults.filter(r => r.status === 'SOLVED').length;
    const total = verificationResults.length || 1;
    const pct = Math.round((solved / total) * 100);

    return isUrdu
      ? `### 📊 ITSM Test Flow vs Reports Cross-Verification Report

📑 **Test Flow Document:** \`${testFile.name}\`
📑 **Checked Reports (${reportFiles.length}):** ${reportFiles.map(r => `\`${r.name}\``).join(', ')}

---

### 🔍 Verification Results:
${verificationResults.map(r => {
  if (r.status === 'SOLVED') {
    return `#### ✅ **${r.workflow.title}** → **SOLVED**
- **Matching Report:** 📄 \`${r.matchedReport}\`
- **Ticket / Evidence:** ${r.ticketFound ? `\`${r.ticketFound}\` ✅` : 'Verified in report ✅'}
- **Details:** ${r.workflow.description}`;
  } else {
    return `#### ⚠️ **${r.workflow.title}** → **MISSING**
- **Requirement:** ${r.workflow.description}
- **Action:** Is workflow ka execution report PDF shamil karein.`;
  }
}).join('\n\n')}

---
🎯 **Coverage Score:** \`${pct}%\` (${solved} of ${total} Workflows Verified) ⭐`
      : `### 📊 Cross-Verification Report: ${pct}% Solved (${solved}/${total})`;
  }

  // ─── 2. Summary / Overview Intent ──────────────────────────────────────────
  const isSummaryQuery = /summary|khulasa|overview|about|kya\s*hai|kya\s*likha|main\s*points|explain/i.test(q);
  if (isSummaryQuery) {
    const mainHeadings = allLines.filter(l => l.startsWith('#') || /^(workflow|step|scenario|use case|chapter|section|module|\d+\.)/i.test(l.trim())).slice(0, 8);
    const notableParagraphs = allLines.filter(l => l.length > 40 && !l.startsWith('[') && !l.startsWith('#')).slice(0, 5);

    return isUrdu
      ? `### 📄 Document Summary & Overview: \`${files.map(f => f.name).join(', ')}\`

📌 **Document Ka Main Maqsad:**
${notableParagraphs.length > 0 ? notableParagraphs.slice(0, 2).map(p => `- ${p}`).join('\n') : '- Document mein standard procedures aur guidelines shamil hain.'}

🔑 **Ahem Sections & Headings:**
${mainHeadings.length > 0 ? mainHeadings.map(h => `- **${h.replace(/^[#\d.]+\s*/, '')}**`).join('\n') : '- Core workflows aur functional steps.'}

📋 **Key Takeaways:**
${notableParagraphs.slice(2, 5).map(p => `- ${p.slice(0, 150)}...`).join('\n')}

---
💡 *Tip: Agar aap kisi specific topic (jaise koi ticket number, step, ya procedure) ke baare mein poochenge to main uski exact lines nikaal kar bataonga!*`
      : `### 📄 Document Summary: \`${files.map(f => f.name).join(', ')}\`

📌 **Overview & Core Content:**
${notableParagraphs.slice(0, 3).map(p => `- ${p}`).join('\n')}

🔑 **Key Sections Identified:**
${mainHeadings.map(h => `- ${h}`).join('\n')}`;
  }

  // ─── 3. Keyword / Specific Topic Search in Document Content ─────────────────
  // Extract user search words
  const stopWords = new Set(['kya', 'hai', 'batao', 'ka', 'ki', 'ke', 'mein', 'se', 'ko', 'aur', 'the', 'is', 'in', 'of', 'and', 'what', 'how', 'why', 'who', 'where', 'when', 'does', 'this', 'that', 'with', 'for', 'about']);
  const queryKeywords = q.replace(/[^\w\s-]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  // Search for lines matching query keywords
  const matchedLines: { docName: string; line: string; score: number }[] = [];

  for (const doc of combinedDocs) {
    for (let i = 0; i < doc.lines.length; i++) {
      const line = doc.lines[i];
      const lineLower = line.toLowerCase();
      
      let matchCount = 0;
      for (const kw of queryKeywords) {
        if (lineLower.includes(kw)) matchCount += 1;
      }

      if (matchCount > 0) {
        // Grab context (surrounding lines if helpful)
        const contextLine = doc.lines.slice(Math.max(0, i - 1), Math.min(doc.lines.length, i + 2)).join(' ');
        matchedLines.push({
          docName: doc.name,
          line: contextLine.length < 300 ? contextLine : line,
          score: matchCount,
        });
      }
    }
  }

  // Sort matches by relevance score
  matchedLines.sort((a, b) => b.score - a.score);

  // If specific keyword matches were found in the document
  if (matchedLines.length > 0 && queryKeywords.length > 0) {
    const topMatches = Array.from(new Set(matchedLines.map(m => m.line))).slice(0, 4);

    return isUrdu
      ? `### 🔍 Document Search Results for: *"${question}"*

Aapke sawaal ke mutabiq document \`${files.map(f => f.name).join(', ')}\` mein yeh exact maloomat mojood hai:

${topMatches.map((m, idx) => `**${idx + 1}.** ${m}`).join('\n\n')}

---
📌 **Direct Answer:** Document mein is topic ke hawalay se upar diye gaye steps aur details clear likhi hui hain.`
      : `### 🔍 Direct Answer from Document:

Based on your question, here are the exact excerpts found in \`${files.map(f => f.name).join(', ')}\`:

${topMatches.map((m, idx) => `**${idx + 1}.** ${m}`).join('\n\n')}`;
  }

  // ─── 4. General Fallback Q&A (Analyze File Structure & Content) ──────────────
  const sampleText = allLines.filter(l => !l.startsWith('[') && l.length > 20).slice(0, 4);

  return isUrdu
    ? `### 📄 Document Analysis & Response to: *"${question}"*

Main ne aapki uploaded file(s) **\`${files.map(f => f.name).join(', ')}\`** ko scan kiya hai.

📝 **Document Content Highlights:**
${sampleText.length > 0 ? sampleText.map(s => `- ${s}`).join('\n') : '- File successfully loaded.'}

💡 **Aap is document ke baray mein mazeed yeh pooch saktay hain:**
- *"Is document ka khulasa (summary) kya hai?"*
- *"Is file mein kon kon se steps ya workflows hain?"*
- *"Kya is document mein koi mistakes ya kami hai?"*`
    : `### 📄 Analysis for: *"${question}"*

Document **\`${files.map(f => f.name).join(', ')}\`** scanned:
${sampleText.map(s => `- ${s}`).join('\n')}`;
}

// ─── Suggested Prompts ───────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  'Is document ka khulasa (summary) kya hai?',
  'Kiya meri reports ne test flow ke saray steps solve kiye hain?',
  'Is file mein kya main points aur steps hain?',
  'Kiya is document mein koi mistake ya kami hai?',
  'Overall quality score aur coverage kya hai?',
];

import { KanbanBoard } from './KanbanBoard';
import { api } from '../services/api';

// ─── Main Component ──────────────────────────────────────────────────────────

export const TaskAssistantView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'kanban' | 'ai-verifier'>('kanban');

  // AI Provider Selection: 'ollama' (default) | 'gemini' | 'builtin'
  const [aiProvider, setAiProvider] = useState<'ollama' | 'gemini' | 'builtin'>('gemini');
  const [ollamaStatus, setOllamaStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [geminiBackendConfigured, setGeminiBackendConfigured] = useState<boolean>(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>(['llama3.2:latest', 'deepseek-r1:1.5b', 'phi3:latest', 'gemma3:270m']);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>('llama3.2:latest');

  // Check localStorage or Vite ENV for API key
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_task_key') || envKey || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiSetup, setShowApiSetup] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      text: `👋 **Khushamdeed! Main aapka AI Task & Document Assistant hoon.**\n\nApni file (Word doc, PDF, Excel, Code, Image) baayi taraf drop karein aur jo chahein poochein — backend AI (.env Gemini & Local Ollama) document ko parh kar aapke har sawaal ka sahi aur tafseeli jawab dega! 🚀`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Backend AI Engine (Active)',
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Check AI Service status on mount
  const checkAiStatus = useCallback(async () => {
    setOllamaStatus('checking');
    try {
      const data = await api.getAiStatus();
      if (data.gemini?.configured) {
        setGeminiBackendConfigured(true);
        setAiProvider('gemini');
      }

      if (data.ollama?.online && Array.isArray(data.ollama.models) && data.ollama.models.length > 0) {
        setOllamaModels(data.ollama.models);
        setOllamaStatus('online');
        if (!data.ollama.models.includes(selectedOllamaModel)) {
          setSelectedOllamaModel(data.ollama.models[0]);
        }
      } else {
        setOllamaStatus('offline');
      }
    } catch {
      setOllamaStatus('offline');
    }
  }, [selectedOllamaModel]);

  useEffect(() => {
    checkAiStatus();
  }, [checkAiStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // ─── API Key Save / Remove ─────────────────────────────────────────────────

  const saveApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    localStorage.setItem('gemini_task_key', key);
    setApiKey(key);
    setShowApiSetup(false);
    setApiKeyInput('');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const clearApiKey = () => {
    localStorage.removeItem('gemini_task_key');
    setApiKey('');
    setShowApiSetup(false);
  };

  // ─── File Upload Handler ───────────────────────────────────────────────────

  const handleFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    setIsProcessingFile(true);
    const newFiles: UploadedFile[] = [];
    for (const file of files) {
      try {
        const { text, base64, mimeType } = await extractTextFromFile(file);
        newFiles.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          text,
          base64,
          mimeType,
        });
      } catch (err) {
        console.error('File parsing error:', err);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsProcessingFile(false);

    if (newFiles.length > 0) {
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          text: `📁 **${newFiles.length} file(s) successfully load ho gayi hain:**\n${newFiles.map(f => `• 📄 **${f.name}** (${formatBytes(f.size)})`).join('\n')}\n\nAb aap document ke baare mein koi bhi sawaal pooch saktay hain!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  // ─── Send Message (Ollama Local AI -> Gemini -> Built-in Fallback) ──────────

  const sendMessage = async (text: string = inputText) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    let assistantResponse = '';
    let modelUsed = '';

    // 1. If Local Ollama is selected (or as primary default)
    if (aiProvider === 'ollama') {
      try {
        const systemInstruction = `You are an expert AI Task, ITSM & Document Assistant.
Your job is to:
1. Carefully analyze the uploaded files and documents provided in the prompt.
2. Directly answer the user's specific or general questions with accurate facts, quotes, workflows, step-by-step points, or discrepancy analysis from the files.
3. If the user asks whether their test flow / deliverables were solved in reports, cross-verify each step against the report files and provide a clear status (✅ Solved, ⚠️ Missing/Pending).
4. ALWAYS reply in English or Roman Urdu (Urdu written in English alphabet). NEVER use Hindi, Devanagari script, or any other script. Keep responses clean and professional.`;

        let promptContent = trimmed;
        if (uploadedFiles.length > 0) {
          const filesSummary = uploadedFiles.map(f => {
            const content = f.text ? f.text.slice(0, 35000) : `[Binary/Image file: ${f.name}]`;
            return `=== DOCUMENT: ${f.name} (${formatBytes(f.size)}) ===\n${content}\n=== END DOCUMENT ===`;
          }).join('\n\n');

          promptContent = `Uploaded Documents for Review:\n\n${filesSummary}\n\nUser Question:\n${trimmed}`;
        }

        const res = await fetch('http://localhost:5000/api/ollama/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedOllamaModel,
            system: systemInstruction,
            messages: [{ role: 'user', content: promptContent }]
          })
        });

        if (!res.ok) {
          throw new Error(`Ollama API error: ${res.statusText}`);
        }

        const data = await res.json();
        if (data.message?.content) {
          assistantResponse = data.message.content.trim();
          modelUsed = `Ollama: ${selectedOllamaModel} (Localhost)`;
        } else {
          throw new Error('Empty response from Ollama');
        }
      } catch (ollamaErr: any) {
        console.warn('Ollama error, falling back to Smart Local Reader:', ollamaErr);
        const fallbackText = runLocalSmartAI(uploadedFiles, trimmed);
        assistantResponse = `⚠️ *Note: Local Ollama (${selectedOllamaModel}) respond nahi kar raha tha (${ollamaErr?.message || 'timeout'}). Built-in Smart Reader se answer kiya gaya hai:*\n\n${fallbackText}`;
        modelUsed = 'Smart Local Reader (Fallback)';
      }
    } else if (aiProvider === 'gemini') {
      // 2. Cloud Gemini Model (Routed via Backend .env API or custom client key)
      try {
        let promptContent = trimmed;
        if (uploadedFiles.length > 0) {
          const filesSummary = uploadedFiles.map(f => {
            const content = f.text ? f.text.slice(0, 35000) : `[Binary/Image file: ${f.name}]`;
            return `=== DOCUMENT: ${f.name} (${formatBytes(f.size)}) ===\n${content}\n=== END DOCUMENT ===`;
          }).join('\n\n');
          promptContent = `Uploaded Documents for Review:\n\n${filesSummary}\n\nUser Question:\n${trimmed}`;
        }

        const res = await api.aiChat({
          provider: 'gemini',
          model: 'gemini-3.8-flash',
          system: `You are an expert AI Task, ITSM & Document Assistant for the Apex Enterprise Platform.
ALWAYS reply in English or Roman Urdu (Urdu written in English alphabet). NEVER use Hindi or Devanagari script.
Analyze any uploaded documents carefully and extract relevant action items, issues, and answers.`,
          prompt: promptContent,
          apiKey: apiKey || undefined,
        });

        assistantResponse = res.text;
        modelUsed = `${res.model || 'gemini-3.8-flash'} (Cloud Gemini AI)`;
      } catch (geminiErr: any) {
        console.warn('Gemini backend request failed, trying Ollama fallback:', geminiErr?.message);
        // Try Ollama as fallback before Smart Local Reader
        try {
          const systemInstruction = `You are an expert AI Task, ITSM & Document Assistant for the Apex Enterprise Platform.
ALWAYS reply in English or Roman Urdu (Urdu written in English alphabet). NEVER use Hindi or Devanagari script.
Analyze any uploaded documents carefully and extract relevant action items, issues, and answers.`;

          let ollamaPrompt = trimmed;
          if (uploadedFiles.length > 0) {
            const filesSummary = uploadedFiles.map(f => {
              const content = f.text ? f.text.slice(0, 35000) : `[Binary/Image file: ${f.name}]`;
              return `=== DOCUMENT: ${f.name} (${formatBytes(f.size)}) ===\n${content}\n=== END DOCUMENT ===`;
            }).join('\n\n');
            ollamaPrompt = `Uploaded Documents for Review:\n\n${filesSummary}\n\nUser Question:\n${trimmed}`;
          }

          const ollamaRes = await fetch('http://localhost:5000/api/ollama/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: selectedOllamaModel,
              system: systemInstruction,
              messages: [{ role: 'user', content: ollamaPrompt }]
            })
          });

          if (!ollamaRes.ok) throw new Error(`Ollama fallback error: ${ollamaRes.statusText}`);
          const ollamaData = await ollamaRes.json();

          if (ollamaData.message?.content) {
            assistantResponse = ollamaData.message.content.trim();
            modelUsed = `Ollama: ${selectedOllamaModel} (Gemini Fallback)`;
          } else {
            throw new Error('Empty response from Ollama fallback');
          }
        } catch (ollamaErr: any) {
          console.warn('Ollama fallback also failed:', ollamaErr?.message);
          const localAnalysis = runLocalSmartAI(uploadedFiles, trimmed);
          assistantResponse = `⚠️ *Note: Gemini aur Ollama dono respond nahi kar rahay. Built-in Smart Reader se answer:*\n\n${localAnalysis}`;
          modelUsed = 'Smart Local Reader (Last Resort)';
        }
      }
    } else {
      // 3. Free / Built-in semantic reader
      await new Promise(resolve => setTimeout(resolve, 300));
      assistantResponse = runLocalSmartAI(uploadedFiles, trimmed);
      modelUsed = 'Built-in Smart Reader';
    }

    setMessages(prev => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: assistantResponse,
        modelUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setIsThinking(false);
  };

  // ─── Render Markdown-like Text ─────────────────────────────────────────────

  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('```')) return <div key={i} style={{ height: '0.4rem' }} />;
      if (line.startsWith('### ')) return <h4 key={i} style={{ margin: '0.65rem 0 0.3rem', color: '#38bdf8', fontSize: '0.92rem', fontWeight: 800 }}>{line.slice(4)}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ margin: '0.75rem 0 0.35rem', color: '#c084fc', fontSize: '1rem', fontWeight: 800 }}>{line.slice(3)}</h3>;
      if (line.startsWith('# ')) return <h2 key={i} style={{ margin: '0.8rem 0 0.4rem', color: 'var(--accent-purple)', fontSize: '1.1rem', fontWeight: 800 }}>{line.slice(2)}</h2>;
      
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const content = line.slice(2);
        return (
          <div key={i} style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.25rem', paddingLeft: '0.2rem' }}>
            <span style={{ color: 'var(--accent-purple)', flexShrink: 0, marginTop: '2px' }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code style="background:rgba(139,92,246,0.18);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em;color:#38bdf8">$1</code>') }} />
          </div>
        );
      }
      
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)/);
        if (match) {
          return (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem', paddingLeft: '0.2rem' }}>
              <span style={{ color: '#38bdf8', fontWeight: 700, flexShrink: 0, minWidth: '20px' }}>{match[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: match[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code style="background:rgba(139,92,246,0.18);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em;color:#38bdf8">$1</code>') }} />
            </div>
          );
        }
      }

      if (line.startsWith('---')) {
        return <hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.75rem 0' }} />;
      }

      if (!line.trim()) return <div key={i} style={{ height: '0.35rem' }} />;

      return (
        <p key={i} style={{ margin: '0.15rem 0', lineHeight: 1.6 }} dangerouslySetInnerHTML={{
          __html: line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code style="background:rgba(139,92,246,0.18);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em;color:#38bdf8">$1</code>')
        }} />
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Header Banner with Sub-Tab Switcher ─────────────────────────── */}
      <div
        className="welcome-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(6,182,212,0.15) 50%, rgba(16,185,129,0.1) 100%)',
          borderColor: 'rgba(139,92,246,0.35)',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div className="welcome-text" style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{
                background: ollamaStatus === 'online' ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.2)',
                color: ollamaStatus === 'online' ? '#34d399' : 'var(--accent-purple)',
                border: `1px solid ${ollamaStatus === 'online' ? 'rgba(16,185,129,0.4)' : 'rgba(139,92,246,0.4)'}`,
                fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem'
              }}>
                <Zap size={13} />
                {ollamaStatus === 'online' ? `Ollama Localhost Active (${selectedOllamaModel})` : 'Smart Engine Active'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Zero Cloud API Cost • 100% Offline • Word & PDF Cross-Verification
              </span>
            </div>
            <h1>Task Kanban & AI Hub</h1>
            <p>Local Ollama AI Assistant & Kanban Board jo aapki deliverables aur test flows ko cross-check karta hai.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Ollama Engine Selector */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(15,23,42,0.8)', padding: '0.3rem 0.6rem',
              borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>AI Engine:</span>
              <select
                value={aiProvider}
                onChange={e => setAiProvider(e.target.value as any)}
                style={{
                  background: 'transparent', border: 'none', color: '#fff',
                  fontSize: '0.78rem', fontWeight: 600, outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="ollama" style={{ background: '#1e293b' }}>🦙 Local Ollama (Recommended)</option>
                <option value="builtin" style={{ background: '#1e293b' }}>⚡ Smart Built-in Reader</option>
                <option value="gemini" style={{ background: '#1e293b' }}>✨ Cloud Gemini AI</option>
              </select>
            </div>

            {aiProvider === 'ollama' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'rgba(15,23,42,0.8)', padding: '0.3rem 0.6rem',
                borderRadius: '10px', border: '1px solid rgba(6,182,212,0.3)',
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: ollamaStatus === 'online' ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
                <select
                  value={selectedOllamaModel}
                  onChange={e => setSelectedOllamaModel(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none', color: '#38bdf8',
                    fontSize: '0.78rem', fontWeight: 700, outline: 'none', cursor: 'pointer'
                  }}
                >
                  {ollamaModels.map(m => (
                    <option key={m} value={m} style={{ background: '#1e293b' }}>{m}</option>
                  ))}
                </select>
                <button
                  onClick={checkAiStatus}
                  title="Refresh AI Status & Models"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '1px' }}
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            )}

            {aiProvider === 'gemini' && (
              <button
                className="btn-secondary"
                onClick={() => setShowApiSetup(s => !s)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}
              >
                <Key size={14} /> {apiKey || geminiBackendConfigured ? 'Gemini AI Ready ✓' : 'Add Gemini Key'}
              </button>
            )}
          </div>
        </div>

        {/* ── Sub-Tab Navigation Pill Switcher ─────────────────────────── */}
        <div style={{
          display: 'flex', gap: '0.5rem', marginTop: '1rem',
          padding: '0.35rem', borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)',
          width: 'fit-content',
        }}>
          <button
            onClick={() => setActiveSubTab('kanban')}
            style={{
              padding: '0.45rem 1.1rem', borderRadius: '9px',
              border: activeSubTab === 'kanban' ? '1px solid rgba(139, 92, 246, 0.5)' : 'none',
              background: activeSubTab === 'kanban'
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.2))'
                : 'transparent',
              color: activeSubTab === 'kanban' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.82rem', fontWeight: activeSubTab === 'kanban' ? 800 : 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Table size={15} color={activeSubTab === 'kanban' ? '#c084fc' : 'currentColor'} />
            Kanban Task Board
          </button>

          <button
            onClick={() => setActiveSubTab('ai-verifier')}
            style={{
              padding: '0.45rem 1.1rem', borderRadius: '9px',
              border: activeSubTab === 'ai-verifier' ? '1px solid rgba(6, 182, 212, 0.5)' : 'none',
              background: activeSubTab === 'ai-verifier'
                ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(139, 92, 246, 0.2))'
                : 'transparent',
              color: activeSubTab === 'ai-verifier' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.82rem', fontWeight: activeSubTab === 'ai-verifier' ? 800 : 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Bot size={15} color={activeSubTab === 'ai-verifier' ? '#38bdf8' : 'currentColor'} />
            AI Document & Test Flow Verifier
            {uploadedFiles.length > 0 && (
              <span style={{
                fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px',
                background: '#06b6d4', color: '#fff', fontWeight: 800,
              }}>
                {uploadedFiles.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── SUB-TAB 1: KANBAN BOARD VIEW ─────────────────────────────────── */}
      {activeSubTab === 'kanban' && (
        <KanbanBoard onOpenAiAssistant={() => setActiveSubTab('ai-verifier')} />
      )}

      {/* ── SUB-TAB 2: AI DOCUMENT & TEST FLOW VERIFIER VIEW ─────────────── */}
      {activeSubTab === 'ai-verifier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── API Key Setup Panel ─────────────────────────────────────────── */}
      {showApiSetup && (
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))',
            border: '1px solid rgba(139,92,246,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={18} color="var(--accent-purple)" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Google Gemini Cloud AI Key</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Free key banayein: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>aistudio.google.com/apikey</a> (Key optional hai, Built-in engine baghair key ke bhi chalta hai)
                </div>
              </div>
            </div>
            {apiKey && (
              <button
                onClick={clearApiKey}
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.35rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Remove Key
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveApiKey(); }}
              placeholder={apiKey ? "New API Key paste karein..." : "AIzaSy... key paste karein"}
              style={{
                flex: 1, padding: '0.6rem 0.9rem', borderRadius: '10px',
                border: '1px solid rgba(139,92,246,0.35)', background: 'rgba(31,41,55,0.8)',
                color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
              }}
            />
            <button
              className="btn-primary"
              onClick={saveApiKey}
              disabled={!apiKeyInput.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Check size={14} /> Save Key
            </button>
            <button className="btn-secondary" onClick={() => setShowApiSetup(false)}>Close</button>
          </div>
          {copiedKey && (
            <p style={{ fontSize: '0.74rem', color: '#34d399', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={13} /> Gemini API Key saved successfully!
            </p>
          )}
        </div>
      )}

      {/* ── Main Layout: Upload + Chat ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── LEFT: File Upload & Quick Tools ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Drop Zone */}
          <div
            className="glass-panel"
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessingFile && fileInputRef.current?.click()}
            style={{
              padding: '1.75rem 1.25rem',
              textAlign: 'center',
              cursor: 'pointer',
              border: `2px dashed ${dragOver ? 'var(--accent-purple)' : 'rgba(139,92,246,0.25)'}`,
              background: dragOver ? 'rgba(139,92,246,0.08)' : 'transparent',
              transition: 'all 0.2s ease',
              position: 'relative',
              borderRadius: '16px',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.py,.js,.jsx,.ts,.tsx,.json,.html,.css,.png,.jpg,.jpeg,.gif,.webp,.md,.sql"
              style={{ display: 'none' }}
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />

            {isProcessingFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <Loader2 size={34} color="var(--accent-purple)" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>File process ho rahi hai...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '54px', height: '54px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))',
                  border: '1px solid rgba(139,92,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '0.2rem',
                }}>
                  <Upload size={24} color="var(--accent-purple)" />
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    Task File Yahan Drop Karein
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    ya click karein browse karne ke liye
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center', marginTop: '0.2rem' }}>
                  {['Code', 'PDF', 'Word', 'Excel', 'Image', 'Text'].map(t => (
                    <span key={t} style={{
                      fontSize: '0.65rem', padding: '2px 7px', borderRadius: '8px',
                      background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                      color: 'var(--text-muted)', fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Paperclip size={14} color="var(--accent-purple)" />
                  Uploaded ({uploadedFiles.length})
                </span>
                <button
                  onClick={() => setUploadedFiles([])}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {uploadedFiles.map(f => (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.5rem 0.65rem', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                      background: `${getFileColor(f.type, f.name)}18`,
                      border: `1px solid ${getFileColor(f.type, f.name)}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: getFileColor(f.type, f.name),
                    }}>
                      {getFileIcon(f.type, f.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {formatBytes(f.size)} {f.text ? `• ${f.text.length.toLocaleString()} chars` : f.base64 ? '• Image' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', flexShrink: 0 }}
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Prompts */}
          <div className="glass-panel" style={{ padding: '1rem', borderRadius: '16px' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={13} color="var(--accent-purple)" /> Quick Actions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p)}
                  disabled={isThinking}
                  style={{
                    textAlign: 'left', padding: '0.5rem 0.7rem',
                    borderRadius: '9px', border: '1px solid rgba(139,92,246,0.2)',
                    background: 'rgba(139,92,246,0.06)', color: 'var(--text-secondary)',
                    fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500,
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.15)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                >
                  <Sparkles size={11} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Interactive Chat Interface ──────────────────────────── */}
        <div
          className="glass-panel"
          style={{
            display: 'flex', flexDirection: 'column',
            height: '640px',
            padding: 0, overflow: 'hidden',
            borderRadius: '16px',
          }}
        >
          {/* Chat Header */}
          <div style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'linear-gradient(90deg, rgba(139,92,246,0.12), rgba(6,182,212,0.06))',
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0,
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>AI Task Reviewer</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                {uploadedFiles.length > 0
                  ? `${uploadedFiles.length} file(s) loaded — ready to inspect`
                  : 'Ready • Sawaal poochein ya file upload karein'}
              </div>
            </div>
            {messages.length > 1 && (
              <button
                className="btn-icon"
                onClick={() => setMessages(messages.slice(0, 1))}
                title="Reset conversation"
                style={{ width: '30px', height: '30px' }}
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '1rem',
          }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: '0.65rem',
                  alignItems: 'flex-start',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                    : 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: '2px',
                }}>
                  {msg.role === 'user' ? <User size={15} color="white" /> : <Bot size={15} color="white" />}
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth: '84%',
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(109,40,217,0.3))'
                    : msg.isError
                    ? 'rgba(239,68,68,0.1)'
                    : 'rgba(31,41,55,0.85)',
                  border: msg.role === 'assistant' ? `1px solid ${msg.isError ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}` : 'none',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  position: 'relative',
                }}>
                  {msg.role === 'assistant' ? renderMessageText(msg.text) : <p style={{ margin: 0 }}>{msg.text}</p>}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.45rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.35)' }}>{msg.timestamp}</span>
                      {msg.modelUsed && (
                        <span style={{ fontSize: '0.62rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => navigator.clipboard.writeText(msg.text)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '2px' }}
                        title="Copy response"
                      >
                        <Copy size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking animation */}
            {isThinking && (
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={15} color="white" />
                </div>
                <div style={{
                  padding: '0.65rem 0.95rem', borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(31,41,55,0.85)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <Sparkles size={14} color="var(--accent-purple)" style={{ animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Analyzing Task</span>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-purple)',
                      display: 'inline-block', animation: `bounce-dot 1.2s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '0.8rem 1rem',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(11,15,25,0.6)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
              <textarea
                ref={chatInputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder={
                  uploadedFiles.length === 0
                    ? 'Poochein: "Kiya sahi kaam kiya? Koi kami?" ya file drop karein...'
                    : `Poochein: "${uploadedFiles[0].name} mein kya mistake hai?" (Enter = Send)`
                }
                disabled={isThinking}
                rows={2}
                style={{
                  flex: 1, padding: '0.6rem 0.85rem', borderRadius: '12px',
                  border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(31,41,55,0.8)',
                  color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none',
                  resize: 'none', lineHeight: 1.5, fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputText.trim() || isThinking}
                style={{
                  width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                  background: inputText.trim() && !isThinking
                    ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
                    : 'rgba(31,41,55,0.8)',
                  border: 'none', cursor: inputText.trim() && !isThinking ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title="Send message"
              >
                {isThinking ? <Loader2 size={16} color="white" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} color="white" />}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.66rem', color: 'var(--text-muted)' }}>
              <span>
                {aiProvider === 'ollama'
                  ? `Powered by Local Ollama (${selectedOllamaModel}) • 100% Free & Offline`
                  : aiProvider === 'gemini'
                  ? 'Powered by Google Gemini Cloud AI'
                  : 'Powered by Smart Local Reader Engine'}
              </span>
              <span>Enter to send • Shift+Enter for newline</span>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

