import React, { useEffect, useRef, useState } from 'react';
import { streamChat } from '../streamChat';
import './FloatingChat.css';

const SUGGESTIONS = [
  'Check my balance',
  'How can I save more?',
  'Explain compound interest',
];

const FloatingChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm your ITUS Bank AI assistant. How can I help?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [open, messages, loading]);

  const send = async (text) => {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: 'user', text }, { role: 'bot', text: '' }]);
    setInput('');
    setLoading(true);

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

  return (
    <>
      <button
        className={`fc-fab ${open ? 'fc-fab-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="AI Assistant"
      >
        <span className="fc-fab-icon">{open ? '×' : '✦'}</span>
        {!open && <span className="fc-fab-pulse" />}
      </button>

      {open && (
        <div className="fc-panel" role="dialog">
          <div className="fc-header">
            <div className="fc-header-avatar">IB</div>
            <div>
              <div className="fc-header-title">ITUS AI</div>
              <div className="fc-header-status">
                <span className="fc-status-dot" /> Online
              </div>
            </div>
            <button className="fc-header-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div ref={scrollRef} className="fc-messages">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const isStreaming = loading && isLast && m.role === 'bot';
              return (
                <div key={i} className={`fc-msg fc-${m.role}`}>
                  {m.role === 'bot' && <div className="fc-msg-avatar">IB</div>}
                  <div className={`fc-bubble ${m.error ? 'fc-error' : ''}`}>
                    {m.text || (isStreaming && (
                      <span className="fc-typing"><span></span><span></span><span></span></span>
                    ))}
                    {m.text && isStreaming && <span className="fc-cursor">▍</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {messages.length <= 1 && (
            <div className="fc-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="fc-suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="fc-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingChat;
