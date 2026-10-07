import React, { useState, useEffect, useRef } from 'react';
import { Send, Minimize2, Maximize2, X, Bot } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  text: string;
  timestamp: string;
  emoji?: string;
}

interface MoodChatbotProps {
  dominantEmotion: string;
  emotionEmoji: string;
  confidenceScore: number;
  isActive: boolean; // camera is running
}

// Mood-contextual responses
const MOOD_RESPONSES: Record<string, {
  greeting: string;
  suggestions: string[];
  affirmations: string[];
  musicRecommendation: string;
}> = {
  happy: {
    greeting: "😊 Wah! Aap bahut khush lagte hain! Yeh positive energy amazing hai!",
    suggestions: [
      "Abhi productivity high hogi — koi mushkil kaam tackle karein!",
      "Apni khushi share karein — kisi doost ko message karein.",
      "Ek naya goal set karein — enthusiasm peak par hai!",
    ],
    affirmations: [
      "Aapki smile poore din ko roshan karti hai! ✨",
      "Khushi contagious hoti hai — keep smiling! 🌟",
      "Yeh mood productive kaam ke liye perfect hai!",
    ],
    musicRecommendation: "Upbeat & Energetic",
  },
  sad: {
    greeting: "💙 Lagta hai aap thode udaas hain. Koi baat nahi — main yahaan hoon.",
    suggestions: [
      "Thoda pani piyein aur 5 deep breaths lein.",
      "Bahar jaayein — thodi taaza hawa mood theek karti hai.",
      "Kisi apne ko call karein aur baat karein.",
    ],
    affirmations: [
      "Yeh waqt guzar jayega — aap strong hain! 💪",
      "Udaas hona normal hai, aap akele nahi hain. 🤝",
      "Kal ek naya din hoga — hope mat chorein! 🌅",
    ],
    musicRecommendation: "Soothing & Relaxing",
  },
  angry: {
    greeting: "😤 Lagta hai kuch gussa hai — chalo mujhe batao kya hua?",
    suggestions: [
      "3 deep breaths lein — phir decide karein.",
      "Thodi der ke liye screen se door ho jayein.",
      "Kuch likhen — feelings express karna gussa kam karta hai.",
    ],
    affirmations: [
      "Gusse mein bade faislay mat karein — chill karein pehle! ❄️",
      "Aap handle kar sakte hain — aap capable hain! 💯",
      "Gussa energy hai — ise positive direction mein lagayein! 🔥",
    ],
    musicRecommendation: "Calming & Meditative",
  },
  surprised: {
    greeting: "😲 Oh! Kuch unexpected hua lagta hai? Kya baat hai?",
    suggestions: [
      "Jo bhi surprise hua — isko note karein!",
      "Naye opportunities aksar unexpected hoti hain.",
      "Aaj ka din exciting lag raha hai!",
    ],
    affirmations: [
      "Zindagi ke surprises hi isko interesting banate hain! 🎁",
      "Alert rehna acha hai — sharp mind! 🎯",
      "Curiosity aur surprise — innovation ki jad hain! 💡",
    ],
    musicRecommendation: "Uplifting & Motivational",
  },
  fearful: {
    greeting: "😨 Kuch anxiety feel ho rahi hai? Bilkul normal hai — relax karein.",
    suggestions: [
      "Box breathing try karein: 4 saans lo, 4 rok, 4 chhor.",
      "Ek kaam ek waqt — overwhelm mat lein.",
      "Jo control mein hai us par focus karein.",
    ],
    affirmations: [
      "Dar feel karna bhi courage ka pehla qadam hai! 🦁",
      "Aap pehle bhi mushkilon se niptay hain — ab bhi niptenge! 🏆",
      "Ek choti qadam hi kaafi hai — shuru karein! 👣",
    ],
    musicRecommendation: "Calming & Meditative",
  },
  disgusted: {
    greeting: "🤢 Kuch achi nahi laga? Chalo baat karte hain.",
    suggestions: [
      "Jo bura laga usay ignore karna bhi ek skill hai.",
      "Koi acha kaam karein — mood shift hoga.",
      "Apni boundaries set karein — jo nahi chahiye usay door karein.",
    ],
    affirmations: [
      "Aapka reaction natural hai — trust your instincts! 🧠",
      "Boundaries important hain — respect them! 🛡️",
      "Negative se door rehna wisdom hai! ✅",
    ],
    musicRecommendation: "Refreshing & Upbeat",
  },
  neutral: {
    greeting: "😐 Aap calm aur focused lagte hain — perfect state hai productive kaam ke liye!",
    suggestions: [
      "Yeh focused state mein deep work karein.",
      "Planning ke liye yeh best time hai.",
      "Koi naya skill seekhna shuru karein!",
    ],
    affirmations: [
      "Calm mind = clear decisions! 🧘",
      "Balance aur composure — yeh strength hai! ⚖️",
      "Focused rehna ek superpower hai! 🎯",
    ],
    musicRecommendation: "Focus & Concentration",
  },
};

// Preset Quick Replies
const QUICK_REPLIES = [
  "Aaj kaisa din hai?",
  "Koi activity suggest karo",
  "Music recommend karo",
  "Motivate karo mujhe",
  "Kuch funny bolo",
];

// Extended bot response generator
function generateBotResponse(userInput: string, emotion: string): string {
  const lower = userInput.toLowerCase();
  const meta = MOOD_RESPONSES[emotion] || MOOD_RESPONSES.neutral;
  
  if (lower.includes('music') || lower.includes('song') || lower.includes('gaana')) {
    return `🎵 Aapke ${emotion} mood ke liye "${meta.musicRecommendation}" music perfect hai! Neeche Playlist section mein YouTube links dekh sakte hain!`;
  }
  if (lower.includes('motivat') || lower.includes('inspire')) {
    const aff = meta.affirmations[Math.floor(Math.random() * meta.affirmations.length)];
    return `💪 ${aff}`;
  }
  if (lower.includes('activity') || lower.includes('kaam') || lower.includes('suggest')) {
    const sug = meta.suggestions[Math.floor(Math.random() * meta.suggestions.length)];
    return `💡 Suggestion: ${sug}`;
  }
  if (lower.includes('funny') || lower.includes('joke') || lower.includes('hasao')) {
    const jokes = [
      "Programmer ki biwi ne kaha: 'Jao market se ek litre doodh lo, agar anday milein to 6 lo.' Programmer 6 litre doodh laya. 🥛",
      "Google ne sab answers diye... lekin meri homework tabs alag hain! 😂",
      "CSS mein center karna duniya ka mushkil kaam hai... yaqeen mano! 🤣",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (lower.includes('din') || lower.includes('day') || lower.includes('kaisa')) {
    return `📅 Aapka din ${emotion === 'happy' ? 'bohat acha lag raha hai!' : emotion === 'sad' ? 'thoda mushkil lag raha hai, par better hoga!' : 'productive aur focused lag raha hai!'} Main yahaan hoon agar kuch chahiye! 😊`;
  }

  // Default contextual response
  const randomAff = meta.affirmations[Math.floor(Math.random() * meta.affirmations.length)];
  const randomSug = meta.suggestions[Math.floor(Math.random() * meta.suggestions.length)];
  return `${randomAff}\n\n💡 Tip: ${randomSug}`;
}

export const MoodChatbot: React.FC<MoodChatbotProps> = ({ dominantEmotion, emotionEmoji, confidenceScore, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastGreetedEmotion, setLastGreetedEmotion] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-greet when emotion changes significantly
  useEffect(() => {
    if (!isActive || !dominantEmotion || dominantEmotion === lastGreetedEmotion || confidenceScore < 0.3) return;
    
    if (isOpen && dominantEmotion !== lastGreetedEmotion) {
      const meta = MOOD_RESPONSES[dominantEmotion] || MOOD_RESPONSES.neutral;
      setLastGreetedEmotion(dominantEmotion);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-mood-${Date.now()}`,
          role: 'bot',
          text: `${emotionEmoji} Mood change detected! ${meta.greeting}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      }, 500);
    }
  }, [dominantEmotion, isOpen, confidenceScore]);

  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
    if (messages.length === 0) {
      // Initial greeting based on current mood
      const meta = MOOD_RESPONSES[dominantEmotion] || MOOD_RESPONSES.neutral;
      setLastGreetedEmotion(dominantEmotion);
      setTimeout(() => {
        setMessages([{
          id: 'welcome',
          role: 'bot',
          text: `👋 Assalam-o-Alaikum! Main aapka AI Mood Assistant hoon.\n\n${meta.greeting}\n\nKuch bhi poochh sakte hain ya neeche quick replies use karein! 🤖`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      }, 300);
    }
    setTimeout(() => inputRef.current?.focus(), 400);
  };

  const sendMessage = (text: string = inputText) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate bot thinking delay
    const delay = 800 + Math.random() * 600;
    setTimeout(() => {
      const botText = generateBotResponse(trimmed, dominantEmotion);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, delay);
  };



  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={openChat}
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.5)',
            zIndex: 9999,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            animation: 'pulse-ring 2s infinite',
          }}
          title="Open AI Mood Chatbot"
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{emotionEmoji || '🤖'}</span>
          {isActive && (
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #0b0f19',
            }} />
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            width: '380px',
            height: isMinimized ? '56px' : '520px',
            borderRadius: '16px',
            background: 'rgba(17, 24, 39, 0.97)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '0.85rem 1rem',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexShrink: 0,
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', flexShrink: 0,
            }}>
              {emotionEmoji || '🤖'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f9fafb' }}>AI Mood Assistant</div>
              <div style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                {isActive ? `${dominantEmotion} detected — ${Math.round(confidenceScore * 100)}% confidence` : 'Ready to help'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px', borderRadius: '6px' }}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px', borderRadius: '6px' }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: '0.5rem',
                    }}
                  >
                    {msg.role === 'bot' && (
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', flexShrink: 0,
                      }}>
                        <Bot size={14} color="white" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '75%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                        : 'rgba(31, 41, 55, 0.9)',
                      border: msg.role === 'bot' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      color: '#f9fafb',
                      fontSize: '0.8rem',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.text}
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Bot size={14} color="white" />
                    </div>
                    <div style={{
                      padding: '0.5rem 0.85rem',
                      background: 'rgba(31, 41, 55, 0.9)',
                      borderRadius: '14px 14px 14px 4px',
                      border: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', gap: '4px', alignItems: 'center',
                    }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6',
                          animation: `bounce-dot 1.2s ${i * 0.2}s infinite`,
                          display: 'inline-block',
                        }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              <div style={{
                padding: '0.5rem 0.75rem 0.25rem',
                display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                {QUICK_REPLIES.map(qr => (
                  <button
                    key={qr}
                    onClick={() => sendMessage(qr)}
                    style={{
                      padding: '0.28rem 0.6rem',
                      borderRadius: '20px',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      background: 'rgba(139, 92, 246, 0.08)',
                      color: '#c4b5fd',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'; }}
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div style={{
                padding: '0.6rem 0.75rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder="Kuch poochhen..."
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.85rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    background: 'rgba(31, 41, 55, 0.8)',
                    color: '#f9fafb',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!inputText.trim()}
                  style={{
                    width: '36px', height: '36px',
                    borderRadius: '50%',
                    background: inputText.trim() ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : 'rgba(31,41,55,0.8)',
                    border: 'none',
                    cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <Send size={15} color="white" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 4px 20px rgba(139, 92, 246, 0.5); }
          50% { box-shadow: 0 4px 30px rgba(139, 92, 246, 0.8), 0 0 0 8px rgba(139, 92, 246, 0.1); }
        }
      `}</style>
    </>
  );
};
