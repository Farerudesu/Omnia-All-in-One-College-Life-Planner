import type { RefObject } from 'react';
import { Sparkles, Calendar, PlusCircle, DollarSign } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Language } from '@/lib/i18n';
import type { ChatMessage, PrefilledData } from '@/types';
import { ProposalCard } from './ProposalCard';

interface AskOmniMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  lang: Language;
  onSuggestionClick: (text: string) => void;
  onClearHistory: () => void;
  onOpenPrefilledModal: (data: PrefilledData, messageId?: string) => void;
  endOfMessagesRef: RefObject<HTMLDivElement | null>;
}

export function AskOmniMessageList({
  messages,
  isTyping,
  lang,
  onSuggestionClick,
  onClearHistory,
  onOpenPrefilledModal,
  endOfMessagesRef,
}: AskOmniMessageListProps) {
  const suggestions =
    lang === 'id'
      ? [
          {
            label: 'Catat pengeluaran: 15rb beli makan siang di kantin',
            icon: <DollarSign size={16} />,
          },
          {
            label: 'Jadwalkan: Belajar kelompok kalkulus besok jam 3 sore di perpus',
            icon: <Calendar size={16} />,
          },
          {
            label: 'Tambah tugas: Laporan praktikum jaringan dikumpulkan Jumat jam 23:59',
            icon: <PlusCircle size={16} />,
          },
        ]
      : [
          { label: 'Log expense: $12 for lunch at campus diner', icon: <DollarSign size={16} /> },
          {
            label: 'Add event: Math study group tomorrow 3pm in Library',
            icon: <Calendar size={16} />,
          },
          {
            label: 'Add task: CS101 problem set due Friday at 11:59pm',
            icon: <PlusCircle size={16} />,
          },
        ];

  return (
    <div
      className={`ask-omni-chat-area${messages.length === 0 ? ' is-empty' : ''}`}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '1rem 1rem 10rem',
        display: 'flex',
        justifyContent: 'center',
        scrollPaddingBottom: '10rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 768,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              margin: '0.75rem auto 0',
              padding: '0 0.5rem',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
                color: 'white',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Sparkles size={28} />
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--on-surface)',
                marginBottom: '0.375rem',
                textAlign: 'center',
              }}
            >
              {lang === 'id'
                ? 'Tanyakan atau catat apa saja untuk perkuliahanmu'
                : 'Ask me to add anything to your college planner'}
            </h2>
            <p
              style={{
                color: 'var(--on-surface-variant)',
                marginBottom: '1.25rem',
                textAlign: 'center',
                maxWidth: 460,
                fontSize: '0.8125rem',
                lineHeight: 1.4,
              }}
            >
              {lang === 'id'
                ? 'Beri tahu saya jadwal kuliah, tugas yang perlu dikerjakan, atau pengeluaran harian. Saya akan siapkan konfirmasinya langsung!'
                : 'Tell me what to schedule, assignments to track, or expenses to log. I’ll prefill a pop-up confirmation so you can review and click Okay!'}
            </p>

            <div
              className="ask-omni-suggestions"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                width: '100%',
                maxWidth: 460,
              }}
            >
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSuggestionClick(s.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 10,
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-lowest)',
                    color: 'var(--on-surface)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition:
                      'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                    textAlign: 'left',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <span style={{ color: 'var(--primary)', flexShrink: 0 }}>{s.icon}</span>
                  <span style={{ flex: 1 }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.25rem 0.5rem' }}>
              <button
                type="button"
                onClick={onClearHistory}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.75rem',
                  color: 'var(--on-surface-variant)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '0.25rem 0.5rem',
                }}
              >
                {lang === 'id' ? 'Hapus Riwayat Chat' : 'Clear Chat History'}
              </button>
            </div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'assistant' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.375rem',
                      paddingLeft: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <Sparkles size={12} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--on-surface-variant)',
                      }}
                    >
                      Omni
                    </span>
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '85%',
                    padding: '0.875rem 1.125rem',
                    overflowWrap: 'anywhere',
                    borderRadius: 18,
                    borderTopLeftRadius: msg.role === 'assistant' ? 4 : 18,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
                    background:
                      msg.role === 'user' ? 'var(--primary)' : 'var(--surface-container-lowest)',
                    color: msg.role === 'user' ? 'white' : 'var(--on-surface)',
                    border: msg.role === 'assistant' ? '1px solid var(--outline-variant)' : 'none',
                    boxShadow: msg.role === 'assistant' ? 'var(--shadow-xs)' : 'none',
                  }}
                >
                  {msg.attachmentUrl && (
                    <img
                      src={msg.attachmentUrl}
                      alt="Attachment"
                      style={{
                        width: '100%',
                        maxWidth: 300,
                        borderRadius: 12,
                        marginBottom: msg.content ? '0.75rem' : 0,
                      }}
                    />
                  )}
                  {msg.content &&
                    (msg.role === 'assistant' ? (
                      <div className="omni-markdown">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div
                        style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.9375rem' }}
                      >
                        {msg.content}
                      </div>
                    ))}
                </div>

                {msg.prefilledData && (
                  <ProposalCard message={msg} lang={lang} onOpenModal={onOpenPrefilledModal} />
                )}
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.375rem',
                    paddingLeft: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <Sparkles size={12} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    Omni
                  </span>
                </div>
                <div
                  style={{
                    padding: '0.875rem 1.25rem',
                    borderRadius: 18,
                    borderTopLeftRadius: 4,
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                    display: 'flex',
                    gap: '0.375rem',
                    alignItems: 'center',
                    height: 44,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--on-surface-variant)',
                      animation: 'blink 1.4s infinite both',
                      animationDelay: '0s',
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--on-surface-variant)',
                      animation: 'blink 1.4s infinite both',
                      animationDelay: '0.2s',
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--on-surface-variant)',
                      animation: 'blink 1.4s infinite both',
                      animationDelay: '0.4s',
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
}
