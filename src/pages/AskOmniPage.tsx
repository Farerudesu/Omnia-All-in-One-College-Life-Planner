import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Paperclip, X, Briefcase, Calendar, PlusCircle, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askOmni } from '../lib/askOmni';
import type { ProposedCalendarEvent } from '../lib/askOmni';
import * as ds from '../lib/dataService';
import { getISODay, toDateString } from '../lib/dateUtils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachmentUrl?: string | null;
  proposedEvent?: ProposedCalendarEvent;
  actionStatus?: 'saved' | 'cancelled' | 'replaced';
  actionError?: string;
}

interface ImageAttachment {
  dataUrl: string;
  imageBase64: string;
  mimeType: string;
  name: string;
}

function getScheduleContext(message: string) {
  if (!/\b(schedule|calendar|class(?:es)?|event|today|tomorrow|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jadwal|besok|kuliah|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(message)) {
    return undefined;
  }

  const today = new Date();
  const dates = Array.from({ length: 8 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return date;
  });
  const firstDate = toDateString(dates[0]);
  const lastDate = toDateString(dates[dates.length - 1]);
  const courses = new Map(ds.getCourses().map((course) => [course.id, course]));
  const sessions = ds.getClassSessions();
  const exceptions = ds.getSessionExceptions();
  const items = dates.flatMap((date) => {
    const dateString = toDateString(date);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const classes = sessions.flatMap((session) => {
      if (!session.daysOfWeek.includes(getISODay(date))) return [];
      const exception = exceptions.find((item) => item.classSessionId === session.id && item.date === dateString);
      if (exception?.type === 'cancelled' || exception?.type === 'no-class') return [];
      const course = courses.get(session.courseId);
      return [{
        date: dateString,
        weekday,
        kind: 'class' as const,
        title: course ? `${course.code} - ${course.name}` : 'Class',
        startTime: exception?.newStartTime || session.startTime,
        endTime: exception?.newEndTime || session.endTime,
        location: exception?.newRoom || session.room || course?.room,
        note: exception?.note,
      }];
    });
    const events = ds.getEvents()
      .filter((event) => event.date === dateString)
      .map((event) => ({
        date: dateString,
        weekday,
        kind: 'event' as const,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        note: event.notes,
      }));
    return [...classes, ...events];
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''));

  return {
    currentDate: firstDate,
    throughDate: lastDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dates: dates.map((date) => ({
      date: toDateString(date),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    })),
    items,
  };
}

export function AskOmniPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState<ImageAttachment | null>(null);
  const [requestError, setRequestError] = useState('');
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;
    if (isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      attachmentUrl: attachment?.dataUrl,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const sentAttachment = attachment;
    setAttachment(null);
    setRequestError('');
    setIsTyping(true);

    try {
      const history = messages.slice(-12).map((item) => ({
        role: item.role,
        content: item.proposedEvent && !item.actionStatus
          ? `${item.content}\nPending event proposal (not saved): ${JSON.stringify(item.proposedEvent)}`
          : item.content,
      }));
      const response = await askOmni({
        message: userMessage.content,
        history,
        imageBase64: sentAttachment?.imageBase64,
        mimeType: sentAttachment?.mimeType,
        scheduleContext: getScheduleContext([...history.map((item) => item.content), userMessage.content].join('\n')),
      });
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        proposedEvent: response.proposedEvent,
      };
      setMessages((prev) => [
        ...(response.proposedEvent
          ? prev.map((item) => item.proposedEvent && !item.actionStatus ? { ...item, actionStatus: 'replaced' as const } : item)
          : prev),
        aiMessage,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Omni. Try again.';
      setRequestError(message);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Omni could not reply just now. Please try again in a moment.',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const updateProposedEvent = (messageId: string, field: keyof ProposedCalendarEvent, value: string) => {
    setMessages((prev) => prev.map((item) => item.id === messageId && item.proposedEvent
      ? { ...item, proposedEvent: { ...item.proposedEvent, [field]: value }, actionError: undefined }
      : item));
  };

  const confirmEvent = async (messageId: string) => {
    const message = messages.find((item) => item.id === messageId);
    const event = message?.proposedEvent;
    if (!event || message.actionStatus || savingEventId) return;
    if (!event.title.trim() || !event.date || (event.endTime && !event.startTime) || (event.startTime && event.endTime && event.endTime <= event.startTime)) {
      setMessages((prev) => prev.map((item) => item.id === messageId
        ? { ...item, actionError: 'Check the title, date, and time range before saving.' }
        : item));
      return;
    }

    setSavingEventId(messageId);
    try {
      const savedEvent = await ds.createEvent({
        title: event.title.trim(),
        date: event.date,
        type: 'personal',
        startTime: event.startTime || undefined,
        endTime: event.endTime || undefined,
        location: event.location?.trim() || undefined,
        notes: event.notes?.trim() || undefined,
      });
      const dateLabel = new Date(`${savedEvent.date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      });
      setMessages((prev) => [
        ...prev.map((item) => item.id === messageId ? { ...item, actionStatus: 'saved' as const, actionError: undefined } : item),
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `Added ${savedEvent.title} to your schedule for ${dateLabel}${savedEvent.startTime ? ` at ${savedEvent.startTime}${savedEvent.endTime ? `–${savedEvent.endTime}` : ''}` : ''}.`,
        },
      ]);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unable to save this event.';
      setMessages((prev) => prev.map((item) => item.id === messageId ? { ...item, actionError: messageText } : item));
    } finally {
      setSavingEventId(null);
    }
  };

  const cancelEvent = (messageId: string) => {
    setMessages((prev) => [
      ...prev.map((item) => item.id === messageId ? { ...item, actionStatus: 'cancelled' as const } : item),
      { id: (Date.now() + 3).toString(), role: 'assistant', content: 'Canceled. Nothing was saved.' },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setRequestError('Choose a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setRequestError('Choose an image under 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setRequestError('Unable to read that image. Choose another file.');
        return;
      }
      const separator = reader.result.indexOf(',');
      if (separator < 0) {
        setRequestError('Unable to read that image. Choose another file.');
        return;
      }
      setRequestError('');
      setAttachment({
        dataUrl: reader.result,
        imageBase64: reader.result.slice(separator + 1),
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.onerror = () => setRequestError('Unable to read that image. Choose another file.');
    reader.readAsDataURL(file);
  };

  const suggestions = [
    { label: 'Log an expense', icon: <Briefcase size={16} /> },
    { label: "What's my schedule tomorrow?", icon: <Calendar size={16} /> },
    { label: 'Add an assignment', icon: <PlusCircle size={16} /> },
  ];

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-container-low)' }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem 2rem',
        borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-lowest)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          background: 'var(--primary-container)',
          color: 'var(--primary)',
          width: 40,
          height: 40,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Sparkles size={20} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>Ask Omni</h1>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 768, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '4rem' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
                color: 'white'
              }}>
                <Sparkles size={40} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '0.5rem', textAlign: 'center' }}>
                Ask me anything about your schedule, money, or tasks
              </h2>
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: '2.5rem', textAlign: 'center' }}>
                I can help you organize your life. Try one of these:
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(s.label)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.625rem 1rem', borderRadius: 999,
                      border: '1px solid var(--outline-variant)',
                      background: 'var(--surface-container-lowest)',
                      color: 'var(--on-surface)',
                      fontSize: '0.875rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ color: 'var(--on-surface-variant)' }}>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', paddingLeft: '0.5rem' }}>
                       <div style={{
                          width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                       }}>
                         <Sparkles size={12} />
                       </div>
                       <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Omni</span>
                    </div>
                  )}
                  <div style={{
                    maxWidth: '80%',
                    padding: '1rem',
                    borderRadius: 20,
                    borderTopLeftRadius: msg.role === 'assistant' ? 4 : 20,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 20,
                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-container-lowest)',
                    color: msg.role === 'user' ? 'white' : 'var(--on-surface)',
                    border: msg.role === 'assistant' ? '1px solid var(--outline-variant)' : 'none',
                    boxShadow: msg.role === 'assistant' ? '0 2px 8px rgba(0,0,0,0.02)' : 'none'
                  }}>
                    {msg.attachmentUrl && (
                       <img 
                         src={msg.attachmentUrl} 
                         alt="Attachment" 
                         style={{ width: '100%', maxWidth: 300, borderRadius: 12, marginBottom: msg.content ? '0.75rem' : 0 }} 
                       />
                    )}
                    {msg.content && (msg.role === 'assistant' ? (
                      <div className="omni-markdown">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.9375rem' }}>{msg.content}</div>
                    ))}
                  </div>
                  {msg.proposedEvent && (
                    <div style={{
                      width: 'min(80%, 420px)',
                      marginTop: '0.5rem',
                      padding: '0.875rem',
                      border: '1px solid var(--outline-variant)',
                      borderRadius: 10,
                      background: 'var(--surface-container-lowest)',
                    }}>
                      {msg.actionStatus ? (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                          {msg.actionStatus === 'saved' ? 'Event saved to your schedule.' : msg.actionStatus === 'cancelled' ? 'Event canceled.' : 'This proposal was replaced.'}
                        </div>
                      ) : (
                        <>
                          <p style={{ marginBottom: '0.625rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                            Review or edit the event. It will only be saved after you confirm.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem' }}>
                            <label style={{ gridColumn: '1 / -1', fontSize: '0.75rem', fontWeight: 600 }}>
                              Title
                              <input aria-label="Event title" value={msg.proposedEvent.title} onChange={(event) => updateProposedEvent(msg.id, 'title', event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
                            </label>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              Date
                              <input type="date" aria-label="Event date" value={msg.proposedEvent.date} onChange={(event) => updateProposedEvent(msg.id, 'date', event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
                            </label>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              Location
                              <input aria-label="Event location" value={msg.proposedEvent.location || ''} onChange={(event) => updateProposedEvent(msg.id, 'location', event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
                            </label>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              Start time
                              <input type="time" aria-label="Event start time" value={msg.proposedEvent.startTime || ''} onChange={(event) => updateProposedEvent(msg.id, 'startTime', event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
                            </label>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              End time
                              <input type="time" aria-label="Event end time" value={msg.proposedEvent.endTime || ''} onChange={(event) => updateProposedEvent(msg.id, 'endTime', event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
                            </label>
                            <label style={{ gridColumn: '1 / -1', fontSize: '0.75rem', fontWeight: 600 }}>
                              Note
                              <input aria-label="Event note" value={msg.proposedEvent.notes || ''} onChange={(event) => updateProposedEvent(msg.id, 'notes', event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem' }} />
                            </label>
                          </div>
                          {msg.actionError && <p role="alert" style={{ marginTop: '0.5rem', color: 'var(--error)', fontSize: '0.75rem' }}>{msg.actionError}</p>}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <button type="button" onClick={() => void confirmEvent(msg.id)} disabled={savingEventId === msg.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                              <Check size={15} aria-hidden="true" />
                              {savingEventId === msg.id ? 'Saving…' : 'Confirm event'}
                            </button>
                            <button type="button" onClick={() => cancelEvent(msg.id)} disabled={savingEventId === msg.id} style={{ padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid var(--outline-variant)', fontSize: '0.8125rem', fontWeight: 600 }}>
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', paddingLeft: '0.5rem' }}>
                       <div style={{
                          width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                       }}>
                         <Sparkles size={12} />
                       </div>
                       <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Omni</span>
                  </div>
                  <div style={{
                    padding: '1rem', borderRadius: 20, borderTopLeftRadius: 4,
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                    display: 'flex', gap: '0.375rem', alignItems: 'center',
                    height: 48
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--on-surface-variant)', animation: 'blink 1.4s infinite both', animationDelay: '0s' }}></span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--on-surface-variant)', animation: 'blink 1.4s infinite both', animationDelay: '0.2s' }}></span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--on-surface-variant)', animation: 'blink 1.4s infinite both', animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      {/* Input Area */}
      <div style={{
        padding: '1.5rem',
        background: 'var(--surface-container-lowest)',
        borderTop: '1px solid var(--outline-variant)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: 768, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {attachment && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', padding: '0.5rem', borderRadius: 12, width: 'max-content' }}>
              <img src={attachment.dataUrl} alt="Attached preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>{attachment.name}</div>
              <button 
                type="button" 
                onClick={() => setAttachment(null)}
                aria-label="Remove attached image"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 999,
            padding: '0.375rem 0.375rem 0.375rem 1rem',
          }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem',
                color: 'var(--on-surface-variant)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Attach image"
              aria-label="Attach image"
            >
              <Paperclip size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              tabIndex={-1}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder="Message Omni..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9375rem',
                color: 'var(--on-surface)'
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isTyping || (!input.trim() && !attachment)}
              style={{
                background: (input.trim() || attachment) ? 'var(--primary)' : 'var(--outline-variant)',
                color: (input.trim() || attachment) ? 'white' : 'var(--on-surface-variant)',
                border: 'none',
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (input.trim() || attachment) ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                marginLeft: '0.5rem'
              }}
            >
              <Send size={18} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
            </button>
          </div>
          {requestError && <div role="alert" style={{ color: 'var(--error)', fontSize: '0.8125rem', paddingLeft: '0.75rem' }}>{requestError}</div>}
        </div>
      </div>
    </div>
  );
}
