import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, CheckCheck, Loader2 } from 'lucide-react';
import type { Message } from '../types';

export const SupportWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(() => {
    return localStorage.getItem('tekki_support_conv_id');
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState(() => localStorage.getItem('tekki_user_name') || '');
  const [userPhone, setUserPhone] = useState(() => localStorage.getItem('tekki_user_phone') || '');
  const [inputContent, setInputContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les messages si conversation active
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/support/messages/${conversationId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          if (!isOpen && data.conversation?.unread_user_count) {
            setUnreadCount(data.conversation.unread_user_count);
          }
        }
      } catch {
        // Ignorer
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 4000); // Polling temps réel
    return () => clearInterval(interval);
  }, [conversationId, isOpen]);

  // Scroll automatique vers le bas
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || !userName.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: userName.trim(),
          userPhone: userPhone.trim() || undefined,
          content: inputContent.trim(),
          conversationId: conversationId || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.conversationId) {
          setConversationId(data.conversationId);
          localStorage.setItem('tekki_support_conv_id', data.conversationId);
          localStorage.setItem('tekki_user_name', userName.trim());
          if (userPhone.trim()) {
            localStorage.setItem('tekki_user_phone', userPhone.trim());
          }
        }

        // Ajouter immédiatement le message dans la liste
        const newMsg: Message = {
          id: data.messageId,
          conversation_id: data.conversationId,
          sender_type: 'user',
          sender_id: userPhone || 'client',
          sender_name: userName.trim(),
          content: inputContent.trim(),
          is_read: 0,
          created_at: data.createdAt
        };

        setMessages((prev) => [...prev, newMsg]);
        setInputContent('');
      }
    } catch (err) {
      console.error('Erreur envoi message support:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Bouton déclencheur */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center gap-2.5 rounded-full bg-[#0f5257] text-[#f6f1e7] px-4 py-3.5 shadow-xl hover:bg-[#14a38b] transition-all hover:scale-105"
          aria-label="Contacter le support Tekki Services"
        >
          <MessageCircle className="size-5" />
          <span className="font-bold text-sm hidden sm:inline">Besoin d'aide ?</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid place-items-center size-5 bg-[#f2a541] text-[#0d1b1e] rounded-full text-xs font-black ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Fenêtre de messagerie */}
      {isOpen && (
        <div className="w-[calc(100vw-2.5rem)] sm:w-96 rounded-3xl bg-white shadow-2xl border border-[#0d1b1e]/15 flex flex-col overflow-hidden max-h-[540px] animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Entête */}
          <div className="bg-[#0f5257] text-[#f6f1e7] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center size-8 rounded-lg bg-[#14a38b] text-[#f6f1e7] font-bold text-sm">
                T
              </span>
              <div>
                <p className="font-bold text-sm">Support Tekki Services</p>
                <p className="text-[11px] text-[#f6f1e7]/75">Almamy Diakhité · Dakar, Sénégal</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-[#f6f1e7]/80 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Formulaire initial si pas encore de nom */}
          {!userName && messages.length === 0 ? (
            <div className="p-5 space-y-4">
              <p className="text-sm text-[#3b4a4d]">
                Posez vos questions concernant nos abonnements ou vos paiements Wave & Orange Money.
              </p>
              <div>
                <label className="block text-xs font-bold text-[#0d1b1e] mb-1">Votre nom complet</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ex: Awa Ndiaye"
                  className="w-full rounded-xl border border-[#0d1b1e]/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0d1b1e] mb-1">Numéro Wave ou Orange Money (optionnel)</label>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="77 123 45 67"
                  className="w-full rounded-xl border border-[#0d1b1e]/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                />
              </div>
              <p className="text-[11px] text-[#3b4a4d]">Vous pourrez ensuite discuter directement avec l'administrateur.</p>
            </div>
          ) : (
            // Zone des messages
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[240px] max-h-[340px] bg-[#f6f1e7]/40 text-sm">
              <div className="text-center text-xs text-[#3b4a4d]/75 py-1">
                Discussion avec l'administration de Tekki Services
              </div>

              {messages.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#3b4a4d]">
                  Aucun message. Écrivez ci-dessous pour démarrer l'échange.
                </div>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender_type === 'admin';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm ${
                          isAdmin
                            ? 'bg-[#0f5257] text-[#f6f1e7] rounded-tl-sm'
                            : 'bg-white text-[#0d1b1e] border border-[#0d1b1e]/10 rounded-tr-sm'
                        }`}
                      >
                        <p className="text-[10px] font-bold opacity-75 mb-0.5">
                          {isAdmin ? 'Almamy (Admin)' : 'Vous'}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                      <span className="text-[10px] text-[#3b4a4d]/60 mt-1 flex items-center gap-1">
                        {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {!isAdmin && <CheckCheck className="size-3 text-[#14a38b]" />}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Saisie de message */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#0d1b1e]/10 flex gap-2">
            <input
              type="text"
              required
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder="Écrivez votre message…"
              disabled={isSending}
              className="flex-1 rounded-xl border border-[#0d1b1e]/20 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
            />
            <button
              type="submit"
              disabled={isSending || !inputContent.trim() || !userName.trim()}
              className="grid place-items-center size-10 rounded-xl bg-[#0f5257] text-[#f6f1e7] hover:bg-[#14a38b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
