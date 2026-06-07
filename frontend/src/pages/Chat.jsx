import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import { streamChat } from '../streamChat';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency } from '../utils';

const SUGGESTIONS = [
  'What is my balance?',
  'Show me my last few transactions',
  'How can I save more money?',
  'Transfer 500 to alice',
];

const SpeechRec = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const recRef = useRef(null);
  const scrollRef = useRef(null);
  const toast = useToast();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();

  useEffect(() => {
    api.get('/chat/history').then(({ data }) => {
      const msgs = (data || []).map((m) => ({ role: m.role, text: m.content }));
      if (msgs.length === 0) {
        setMessages([{ role: 'bot', text: "Hi! I'm your ITUS Bank AI assistant. Ask me anything." }]);
      } else {
        setMessages(msgs);
      }
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: 'user', text }, { role: 'bot', text: '' }]);
    setInput('');
    setLoading(true);
    setPendingAction(null);

    let botText = '';
    await streamChat(text, {
      onToken: (tok) => {
        botText += tok;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'bot', text: botText };
          return copy;
        });
      },
      onDone: (meta) => {
        if (meta?.suggestedAction) setPendingAction(meta.suggestedAction);
      },
      onError: () => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'bot', text: 'Sorry, the assistant is unavailable right now.', error: true };
          return copy;
        });
      },
    });
    setLoading(false);
  };

  const clearHistory = async () => {
    if (!window.confirm('Clear conversation history?')) return;
    await api.delete('/chat/history');
    setMessages([{ role: 'bot', text: 'History cleared. Ask me anything.' }]);
    setPendingAction(null);
  };

  const startListening = () => {
    if (!SpeechRec) {
      toast.error('Voice input is not supported in this browser');
      return;
    }
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setInput(text);
    };
    rec.onerror = () => toast.error('Could not capture audio');
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stopListening = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const executeAction = (action) => {
    const { type, params, prompt } = action;
    if (type === 'TRANSFER') {
      confirm({
        title: prompt || 'Send money',
        summary: [
          { label: 'To', value: '@' + params.recipientUsername },
          { label: 'Amount', value: formatCurrency(params.amount) },
        ],
        confirmLabel: 'Send',
        onConfirm: async (pin) => {
          const { data } = await api.post('/bank/transfer', {
            recipientUsername: params.recipientUsername,
            amount: parseFloat(params.amount),
            description: 'Sent via AI assistant',
            pin,
          });
          if (!data.success) throw new Error(data.message);
          toast.success('Sent');
          setMessages((m) => [...m, { role: 'bot', text: `Done — sent ₹${params.amount} to @${params.recipientUsername}.` }]);
          setPendingAction(null);
          refreshProfile();
        },
      });
    } else if (type === 'DEPOSIT') {
      confirm({
        title: prompt || 'Deposit',
        summary: [{ label: 'Amount', value: formatCurrency(params.amount) }],
        confirmLabel: 'Deposit',
        onConfirm: async (pin) => {
          const { data } = await api.post('/bank/deposit', { amount: parseFloat(params.amount), pin });
          if (!data.success) throw new Error(data.message);
          toast.success('Deposited');
          setMessages((m) => [...m, { role: 'bot', text: `Done — deposited ₹${params.amount}.` }]);
          setPendingAction(null);
          refreshProfile();
        },
      });
    } else if (type === 'WITHDRAW') {
      confirm({
        title: prompt || 'Withdraw',
        summary: [{ label: 'Amount', value: formatCurrency(params.amount) }],
        confirmLabel: 'Withdraw',
        onConfirm: async (pin) => {
          const { data } = await api.post('/bank/withdraw', { amount: parseFloat(params.amount), pin });
          if (!data.success) throw new Error(data.message);
          toast.success('Withdrew');
          setMessages((m) => [...m, { role: 'bot', text: `Done — withdrew ₹${params.amount}.` }]);
          setPendingAction(null);
          refreshProfile();
        },
      });
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">AI Assistant</div>
          <div className="page-subtitle">Banking help · I remember our chat</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={clearHistory}>Clear history</button>
      </div>

      <div className="card chat-card">
        <div ref={scrollRef} className="chat-scroll">
          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            const isStreaming = loading && isLast && m.role === 'bot';
            return (
              <div key={i} className={`chat-msg chat-${m.role}`}>
                {m.role === 'bot' && <div className="chat-avatar">IB</div>}
                <div className={`chat-bubble ${m.error ? 'chat-error' : ''}`}>
                  {m.text || (isStreaming && (
                    <span className="chat-typing"><span></span><span></span><span></span></span>
                  ))}
                  {m.text && isStreaming && <span className="chat-cursor">▍</span>}
                </div>
              </div>
            );
          })}
          {pendingAction && (
            <div className="chat-action">
              <div className="chat-action-icon">⚡</div>
              <div style={{ flex: 1 }}>
                <div className="chat-action-title">{pendingAction.prompt || 'Action available'}</div>
                <div className="chat-action-meta">
                  {pendingAction.type} · {JSON.stringify(pendingAction.params)}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => executeAction(pendingAction)}>
                Review & Execute
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPendingAction(null)}>×</button>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chat-suggestion" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        <form
          className="chat-input-row"
          onSubmit={(e) => { e.preventDefault(); send(input); }}
        >
          {SpeechRec && (
            <button type="button"
                    className={`btn ${listening ? 'btn-danger' : 'btn-ghost'} btn-sm`}
                    onClick={listening ? stopListening : startListening}
                    title={listening ? 'Stop' : 'Speak'}>
              {listening ? '■' : '🎤'}
            </button>
          )}
          <input type="text" className="form-control"
                 placeholder={listening ? 'Listening…' : 'Ask anything about banking…'}
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 disabled={loading} />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>Send</button>
        </form>
      </div>

      <style>{`
        .chat-card {
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
          height: calc(100vh - 220px);
          min-height: 480px;
        }
        .chat-scroll { flex: 1; overflow-y: auto; padding: 22px; display: flex; flex-direction: column; gap: 14px; }
        .chat-msg { display: flex; gap: 10px; align-items: flex-end; }
        .chat-user { justify-content: flex-end; }
        .chat-bot .chat-bubble {
          background: rgba(10, 61, 98, 0.05);
          color: var(--itus-text);
          border-radius: 14px 14px 14px 4px;
        }
        .chat-user .chat-bubble {
          background: var(--itus-gradient);
          color: #fff;
          border-radius: 14px 14px 4px 14px;
        }
        .chat-bubble {
          max-width: 70%;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .chat-error { background: #fef2f2 !important; color: #991b1b !important; }
        .chat-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: var(--itus-gradient-accent);
          color: var(--itus-primary-dark);
          font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .chat-cursor {
          display: inline-block;
          margin-left: 2px;
          animation: cursor-blink 1s steps(2) infinite;
          color: var(--itus-primary);
        }
        @keyframes cursor-blink { to { opacity: 0; } }
        .chat-typing { display: inline-flex; gap: 4px; padding: 14px 18px; }
        .chat-typing span {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--itus-muted);
          animation: bounce 1s infinite;
        }
        .chat-typing span:nth-child(2) { animation-delay: 0.15s; }
        .chat-typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        .chat-action {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: rgba(241, 177, 23, 0.12);
          border: 1px solid rgba(241, 177, 23, 0.4);
          border-radius: 12px;
        }
        .chat-action-icon {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: var(--itus-gradient-accent);
          color: var(--itus-primary-dark);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700;
        }
        .chat-action-title { font-weight: 700; font-size: 13.5px; }
        .chat-action-meta { font-size: 11px; color: var(--itus-muted); font-family: monospace; }
        .chat-suggestions { padding: 0 22px 14px; display: flex; flex-wrap: wrap; gap: 8px; }
        .chat-suggestion {
          padding: 7px 14px;
          background: #fff;
          border: 1px solid var(--itus-border);
          border-radius: 999px;
          font-size: 12.5px;
          color: var(--itus-primary);
          cursor: pointer;
        }
        .chat-input-row {
          display: flex; gap: 8px;
          padding: 16px 22px;
          border-top: 1px solid var(--itus-border);
          background: var(--itus-surface);
        }
        .chat-input-row .form-control { flex: 1; }
      `}</style>
    </>
  );
};

export default Chat;
