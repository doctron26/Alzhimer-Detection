"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, User, Activity } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", text: "Hello! I am AlzDetect AI. How can I assist you with your cognitive assessment today?", isBot: true },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    
    const newUserMessage: Message = { id: Date.now().toString(), text: userMessage, isBot: false };
    setMessages((prev) => [...prev, newUserMessage]);
    
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || "Sorry, I am having trouble connecting.",
        isBot: true,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Error communicating with the server. Please try again.",
        isBot: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="mb-4 w-[340px] sm:w-[400px] h-[550px] bg-white/80 backdrop-blur-3xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.12)] rounded-3xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 py-5 bg-gradient-to-r from-primary-600 to-indigo-500 flex justify-between items-center shrink-0 overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-lg"></div>
              
              <div className="relative flex items-center gap-3 z-10">
                <div className="relative w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-inner">
                  <Sparkles className="w-5 h-5 text-white" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-primary-600 rounded-full"></span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight drop-shadow-sm">AlzDetect AI</h3>
                  <p className="text-xs text-indigo-100 font-medium flex items-center gap-1.5 opacity-90">
                    <Activity className="w-3 h-3 text-green-300" /> Always Active
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="relative z-10 text-white/70 hover:text-white hover:bg-white/20 transition-all p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  key={msg.id}
                  className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.isBot ? "flex-row" : "flex-row-reverse"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-auto ${msg.isBot ? "bg-gradient-to-br from-primary-100 to-primary-50 border border-primary-100" : "bg-gradient-to-br from-slate-200 to-slate-100 border border-slate-200"}`}>
                      {msg.isBot ? <Sparkles className="w-4 h-4 text-primary-600" /> : <User className="w-4 h-4 text-slate-500" />}
                    </div>
                    
                    <div
                      className={`px-4 py-3 text-sm leading-relaxed ${
                        msg.isBot
                          ? "bg-white text-slate-700 rounded-2xl rounded-bl-sm shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100/50"
                          : "bg-gradient-to-r from-primary-600 to-indigo-500 text-white rounded-2xl rounded-br-sm shadow-[0_4px_14px_rgba(79,70,229,0.3)] font-medium"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 border border-primary-100 flex items-center justify-center shrink-0 shadow-sm mt-auto">
                      <Sparkles className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="px-4 py-4 rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-bl-sm border border-slate-100/50 flex gap-1.5 items-center">
                      <motion.div className="w-2 h-2 bg-primary-400 rounded-full" animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
                      <motion.div className="w-2 h-2 bg-primary-400 rounded-full" animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
                      <motion.div className="w-2 h-2 bg-primary-400 rounded-full" animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/90 border-t border-slate-100 backdrop-blur-md shrink-0">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-full pl-5 pr-12 py-3.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-1.5 w-9 h-9 rounded-full bg-primary-600 hover:bg-primary-500 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-all shadow-md shrink-0"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
              <div className="text-center mt-3">
                <span className="text-[10px] text-slate-400 font-medium">Powered by Dialogflow AI</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="group relative w-16 h-16 bg-gradient-to-r from-primary-600 to-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(79,70,229,0.4)] transition-all border-2 border-white/20"
      >
        {/* Pulse effect */}
        <span className="absolute inset-0 rounded-full bg-primary-500 opacity-20 group-hover:animate-ping"></span>
        
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <X className="w-7 h-7 relative z-10" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <MessageSquare className="w-7 h-7 relative z-10" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Notification dot */}
        {!isOpen && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-bounce"></span>
        )}
      </motion.button>
    </div>
  );
}
