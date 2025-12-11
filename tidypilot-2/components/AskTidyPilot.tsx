import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, User, Bot, MessageSquare } from 'lucide-react';
import { DatasetStats, ChatMessage } from '../types';
import { askDataQuestion } from '../services/geminiService';

interface AskTidyPilotProps {
  stats: DatasetStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AskTidyPilot: React.FC<AskTidyPilotProps> = ({ stats, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SUGGESTED_QUESTIONS = [
    "What are the biggest issues?",
    "Which columns are critical?",
    "Suggest KPIs for this data"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading || !stats) return;

    const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const responseText = await askDataQuestion(content, stats);
      const botMsg: ChatMessage = { role: 'assistant', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = { 
        role: 'assistant', 
        content: "I encountered an error connecting to TidyPilot. Please try again.", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // If no stats yet, render nothing (or could render locked state)
  if (!stats) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity" 
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <img 
                src="https://i.postimg.cc/1Xj5f9RC/Gemini-Generated-Image-cegydwcegydwcegy-2.png" 
                alt="TidyPilot Logo" 
                className="h-7 w-auto object-contain" 
            />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Ask TidyPilot</h3>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Data Assistant</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
              <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                 <Bot className="text-indigo-600 w-8 h-8" />
              </div>
              <h4 className="text-slate-800 font-semibold mb-2">How can I help?</h4>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                I can analyze issues, explain cleaning steps, or suggest BI models based on your {stats.rowCount.toLocaleString()} rows.
              </p>
              
              <div className="flex flex-col gap-2 w-full">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-left text-xs bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm text-slate-600 px-4 py-3 rounded-xl transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Bot size={16} className="text-indigo-600" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-sm' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm whitespace-pre-wrap'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex gap-3 justify-start animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Bot size={16} className="text-indigo-600" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-5 py-4 flex items-center gap-2 shadow-sm">
                       <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                       <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                       <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                    </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
              placeholder="Ask about your data with TidyPilot..."
              disabled={isLoading}
              className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 text-sm"
            />
            <button 
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};