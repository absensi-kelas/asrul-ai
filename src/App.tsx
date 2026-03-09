import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Image as ImageIcon, 
  User, 
  Trash2, 
  Loader2, 
  X,
  Github,
  Zap,
  Shield,
  Copy,
  Check,
  Instagram,
  Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { chatWithGemini, chatWithGeminiStream, generateImage } from './lib/gemini';
import { Typewriter } from './components/Typewriter';
import { AILogo } from './components/AILogo';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { supabase } from './lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-white/10 bg-[#1e1e1e] shadow-2xl w-full max-w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 hover:text-neon-cyan transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              COPIED
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              COPY
            </>
          )}
        </button>
      </div>
      <div className="p-0 overflow-hidden">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          PreTag="div"
          wrapLines={true}
          wrapLongLines={true}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.75rem',
            lineHeight: '1.6',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  image?: string;
  isGenerated?: boolean;
  timestamp: Date;
}

function ChatApp() {
  const { user, logout, refreshUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastImageGenTime, setLastImageGenTime] = useState<number>(0);
  const [showDevDashboard, setShowDevDashboard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (data && !error) {
          setMessages(data.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'ai',
            content: m.content,
            image: m.image,
            timestamp: new Date(m.created_at)
          })));
        }
      } catch (e) {
        console.error('Fetch messages error:', e);
      }
    };

    const cleanupImages = async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      try {
        // Remove images from messages older than 1 hour
        const { error } = await supabase
          .from('messages')
          .update({ image: null })
          .lt('created_at', oneHourAgo)
          .not('image', 'is', null);
        
        if (!error) {
          fetchMessages();
        }
      } catch (e) {
        console.error('Cleanup images error:', e);
      }
    };

    fetchMessages();
    const interval = setInterval(cleanupImages, 5 * 60 * 1000); // Check every 5 mins
    return () => clearInterval(interval);
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading || !user) return;

    const isImageGen = input.toLowerCase().startsWith('/draw ') || 
                      input.toLowerCase().startsWith('buatkan gambar ') ||
                      input.toLowerCase().startsWith('generate image ');

    if (isImageGen) {
      const now = Date.now();
      const cooldownTime = 30 * 1000;
      if (now - lastImageGenTime < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - (now - lastImageGenTime)) / 1000);
        alert(`Harap tunggu ${remaining} detik lagi sebelum membuat gambar baru.`);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage || undefined,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    // Save user message to Supabase
    try {
      await supabase.from('messages').insert({
        id: userMessage.id,
        user_id: user.id,
        role: userMessage.role,
        content: userMessage.content,
        image: userMessage.image,
        created_at: userMessage.timestamp.toISOString()
      });
    } catch (e) {
      console.error('Save user message error:', e);
    }

    if (isImageGen) {
      const aiMessageId = (Date.now() + 1).toString();
      try {
        const prompt = currentInput.replace(/^\/draw |^buatkan gambar |^generate image /i, '');
        const imageUrl = await generateImage(prompt);
        
        if (imageUrl) {
          setLastImageGenTime(Date.now());
          const aiMessage: Message = {
            id: aiMessageId,
            role: 'ai',
            content: `Berikut adalah gambar untuk: "${prompt}"`,
            image: imageUrl,
            isGenerated: true,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
          
          // Save to Supabase
          await supabase.from('messages').insert({
            id: aiMessageId,
            user_id: user.id,
            role: 'ai',
            content: aiMessage.content,
            image: aiMessage.image,
            created_at: aiMessage.timestamp.toISOString()
          });
        } else {
          throw new Error('Failed to generate image');
        }
      } catch (error) {
        console.error('Image generation error:', error);
        setMessages(prev => [...prev, {
          id: aiMessageId,
          role: 'ai',
          content: "Maaf, saya gagal membuat gambar tersebut. Silakan coba lagi nanti.",
          timestamp: new Date(),
        }]);
      }
      setIsLoading(false);
      return;
    }

    // Prepare history for Gemini
    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'ai',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);

    try {
      let fullContent = '';
      const stream = chatWithGeminiStream(userMessage.content, history, userMessage.image);
      
      setIsLoading(false); // Stop showing the loading indicator once stream starts
      setIsStreaming(true);

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId ? { ...msg, content: fullContent } : msg
        ));
        scrollToBottom();
      }
      setIsStreaming(false);

      // Save AI message to Supabase
      try {
        await supabase.from('messages').insert({
          id: aiMessageId,
          user_id: user.id,
          role: 'ai',
          content: fullContent,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.error('Save AI message error:', e);
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setIsStreaming(false);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? { ...msg, content: "Maaf, terjadi kesalahan saat memproses permintaan Anda." } : msg
      ));
    }

    // Update used_today in Supabase
    if (user.role !== 'DEVELOPER') {
      try {
        await supabase
          .from('profiles')
          .update({ used_today: user.used_today + 1 })
          .eq('id', user.id);
        
        refreshUser();
      } catch (e) {
        console.error('Update limit error:', e);
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-screen bg-[#050505] text-white font-sans selection:bg-neon-cyan/30 flex flex-col overflow-hidden">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-cyan/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple p-[1px] overflow-hidden">
            <AILogo className="w-full h-full rounded-[7px]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight neon-text">Asrul AI</h1>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[7px] px-1 rounded border font-mono uppercase",
                user?.role === 'DEVELOPER' ? "border-neon-cyan text-neon-cyan" :
                user?.role === 'PREMIUM' ? "border-neon-purple text-neon-purple" :
                "border-white/20 text-white/40"
              )}>
                {user?.role}
              </span>
              {user?.role !== 'DEVELOPER' && (
                <span className="text-[7px] text-white/30 font-mono">
                  LIMIT: {user?.used_today}/{user?.daily_limit}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {user?.role === 'DEVELOPER' && (
            <button 
              onClick={() => setShowDevDashboard(true)}
              className="p-1.5 hover:bg-neon-cyan/10 rounded-lg transition-colors text-neon-cyan"
              title="Developer Dashboard"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={clearChat}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-red-400"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={logout}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-red-400"
            title="Logout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto relative z-10 px-4 py-4 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 space-y-4"
            >
              <div className="inline-block p-3 rounded-2xl bg-white/5 border border-white/10 mb-2 overflow-hidden">
                <AILogo className="w-12 h-12 rounded-xl scale-150" />
              </div>
              <h2 className="text-3xl font-bold tracking-tighter">
                Hello, <span className="text-white/60">{user?.username}</span>
              </h2>
              <p className="text-white/60 max-w-md mx-auto text-sm">
                Saya adalah <span className="neon-text">Asrul AI</span>. 
                Bagaimana saya bisa membantu Anda hari ini?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mt-8">
                {[
                  "Siapa Asrul Alfandi?",
                  "Analisis gambar ini...",
                  "Bantu saya coding React",
                  "Apa itu SMAN 1 TARUMAJAYA?"
                ].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-3 glass-panel text-left hover:border-neon-cyan/50 transition-all group"
                  >
                    <p className="text-xs text-white/80 group-hover:text-neon-cyan transition-colors">{suggestion}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden",
                  message.role === 'user' 
                    ? "bg-neon-purple/20 border border-neon-purple/50" 
                    : "border border-neon-cyan/50"
                )}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-neon-purple" />
                  ) : (
                    <AILogo className="w-full h-full" />
                  )}
                </div>

                <div className={cn(
                  "flex flex-col max-w-[92%] sm:max-w-[85%] gap-1.5",
                  message.role === 'user' ? "items-end" : "items-start"
                )}>
                  {message.image && (
                    <div className="relative group/img rounded-xl overflow-hidden border border-white/10 shadow-xl mb-1">
                      <img src={message.image} alt={message.isGenerated ? "Generated" : "Uploaded"} className="max-w-[200px] sm:max-w-[300px] h-auto" />
                      {message.isGenerated && (
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = message.image!;
                            link.download = `asrul-ai-gen-${Date.now()}.png`;
                            link.click();
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white/70 hover:text-neon-cyan opacity-0 group-hover/img:opacity-100 transition-all"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className={cn(
                    "px-4 py-2 rounded-xl text-sm leading-relaxed",
                    message.role === 'user' 
                      ? "bg-neon-purple/10 border border-neon-purple/30 text-white" 
                      : "bg-white/5 border border-white/10 text-white/90"
                  )}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      {message.role === 'ai' && message.id === messages[messages.length - 1]?.id ? (
                        <Typewriter 
                          text={message.content} 
                          speed={10} 
                          onUpdate={scrollToBottom}
                          onComplete={scrollToBottom}
                          render={(text) => (
                            <ReactMarkdown
                              components={{
                                code({ node, inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <CodeBlock
                                      language={match[1]}
                                      value={String(children).replace(/\n$/, '')}
                                    />
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {text}
                            </ReactMarkdown>
                          )}
                        />
                      ) : (
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <CodeBlock
                                  language={match[1]}
                                  value={String(children).replace(/\n$/, '')}
                                />
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      )}
                      {message.role === 'ai' && isStreaming && message.id === messages[messages.length - 1]?.id && (
                        <div className="flex gap-1 mt-2 items-center">
                          <span className="w-1 h-1 bg-neon-cyan rounded-full animate-pulse" />
                          <span className="w-1 h-1 bg-neon-cyan rounded-full animate-pulse [animation-delay:0.2s]" />
                          <span className="w-1 h-1 bg-neon-cyan rounded-full animate-pulse [animation-delay:0.4s]" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] text-white/30 font-mono uppercase tracking-tighter">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg border border-neon-cyan/50 flex items-center justify-center shrink-0 overflow-hidden">
                <AILogo className="w-full h-full" />
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-1.5">
                <span className="w-1 h-1 bg-neon-cyan rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 bg-neon-cyan rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 bg-neon-cyan rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="relative z-10 p-4 border-t border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto space-y-3">
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative inline-block"
            >
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded-lg border border-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.3)]" 
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}

          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink rounded-xl blur opacity-10 group-focus-within:opacity-30 transition-opacity duration-500" />
            <div className="relative flex items-end gap-2 bg-[#0a0a0a] border border-white/10 rounded-xl p-1.5 focus-within:border-neon-cyan/50 transition-all">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-neon-cyan"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-1 resize-none min-h-[40px] max-h-32"
                rows={1}
              />

              <button 
                onClick={handleSend}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className={cn(
                  "p-2.5 rounded-lg transition-all duration-300",
                  (input.trim() || selectedImage) && !isLoading
                    ? "bg-neon-cyan text-black shadow-[0_0_10px_rgba(0,243,255,0.5)] hover:scale-105"
                    : "bg-white/5 text-white/20"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <p className="text-[9px] text-center text-white/20 uppercase tracking-[0.2em] font-mono">
            Powered by Asrul Alfandi
          </p>
          
          <div className="flex justify-center gap-4 mt-2">
            <a 
              href="https://www.instagram.com/asrul.jamsut?igsh=MW5yaXRpYzg3bnA3aw==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/30 hover:text-neon-cyan transition-colors"
            >
              <Instagram className="w-6 h-6" />
            </a>
            <a 
              href="https://www.tiktok.com/@rull_segoyy?_r=1&_t=ZS-94Y0yV1WBym" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/30 hover:text-neon-cyan transition-colors"
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-6 h-6"
              >
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {showDevDashboard && (
        <DeveloperDashboard onClose={() => setShowDevDashboard(false)} />
      )}
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-neon-cyan/20 blur-3xl rounded-full animate-pulse" />
          <Loader2 className="w-12 h-12 text-neon-cyan animate-spin relative z-10" />
        </div>
        <div className="text-2xl font-bold tracking-tighter font-mono relative">
          <Typewriter 
            text="ASRUL.ai" 
            speed={100}
            render={(text) => (
              <span className="bg-gradient-to-r from-neon-cyan to-white bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                {text}
              </span>
            )}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <ChatApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
