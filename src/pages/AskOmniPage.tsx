import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Paperclip,
  X,
  Calendar,
  PlusCircle,
  Check,
  DollarSign,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askOmni } from '../lib/askOmni';
import * as ds from '../lib/dataService';
import { getISODay, toDateString } from '../lib/dateUtils';
import { formatCurrency } from '../lib/currency';
import { useData } from '../lib/useData';
import {
  formatPrefilledSummary,
  isConfirmationIntent,
  type PrefilledData,
} from '../lib/aiIntentParser';
import { EXPENSE_CATEGORIES, normalizeTransactionCategory, type ExpenseCategory } from '../lib/categories';
import { Modal } from '../components/Modal';
import { useLanguage } from '../lib/useLanguage';
import type { EventType, Priority } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachmentUrl?: string | null;
  prefilledData?: PrefilledData;
  actionStatus?: 'saved' | 'cancelled' | 'replaced';
  actionError?: string;
}

interface ImageAttachment {
  dataUrl: string;
  imageBase64: string;
  mimeType: string;
  name: string;
}

function getScheduleContext() {
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
      if (exception?.type === 'no-class') return [];
      const course = courses.get(session.courseId);
      return [{
        date: dateString,
        weekday,
        kind: 'class' as const,
        title: course ? `${course.code} - ${course.name}` : 'Class',
        status: exception?.type === 'cancelled' || exception?.types?.includes('cancelled') ? 'cancelled' : undefined,
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

  // Include assignments (tasks) context
  const assignments = ds.getAssignments();
  const tasksContext = assignments.map((a) => {
    const course = a.courseId ? courses.get(a.courseId) : undefined;
    return {
      id: a.id,
      title: a.title,
      dueDate: a.dueDate,
      course: course ? `${course.code} - ${course.name}` : undefined,
      priority: a.priority,
      status: a.status,
      notes: a.notes,
    };
  });

  return {
    currentDate: firstDate,
    throughDate: lastDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dates: dates.map((date) => ({
      date: toDateString(date),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    })),
    items,
    tasks: tasksContext,
  };
}

const SESSION_CHAT_KEY = 'omnia_omni_chat_session';

function loadChatHistory(): Message[] {
  try {
    const saved = localStorage.getItem(SESSION_CHAT_KEY) || sessionStorage.getItem(SESSION_CHAT_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function AskOmniPage() {
  const lang = useLanguage();
  const courses = useData(ds.getCourses);
  const [messages, setMessages] = useState<Message[]>(loadChatHistory);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState<ImageAttachment | null>(null);
  const [requestError, setRequestError] = useState('');
  const [retryText, setRetryText] = useState('');

  // Prefilled Data Pop-up Modal State
  const [prefilledModal, setPrefilledModal] = useState<{
    data: PrefilledData;
    messageId?: string;
  } | null>(null);
  const [isSavingPrefilled, setIsSavingPrefilled] = useState(false);
  const [prefilledError, setPrefilledError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_CHAT_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;
    if (isTyping) return;

    const userText = input.trim();
    setRetryText('');

    // Check if the user is confirming a pending proposal (e.g. "tambahkan", "add", "oke", "ya")
    if (isConfirmationIntent(userText)) {
      const pendingMessage = messages.slice().reverse().find((m) => m.prefilledData && m.actionStatus !== 'saved');
      if (pendingMessage?.prefilledData) {
        setPrefilledModal({
          data: { ...pendingMessage.prefilledData },
          messageId: pendingMessage.id,
        });
        setPrefilledError('');
        setInput('');
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      attachmentUrl: attachment?.dataUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const sentAttachment = attachment;
    setAttachment(null);
    setRequestError('');
    setIsTyping(true);

    try {
      const history = messages.slice(-12).map((item) => ({
        role: item.role,
        content: item.actionStatus === 'saved' && item.prefilledData
          ? `${item.content}\n[Saved: ${item.prefilledData.type}]`
          : item.content,
      }));
      const response = await askOmni({
        message: userMessage.content,
        history,
        imageBase64: sentAttachment?.imageBase64,
        mimeType: sentAttachment?.mimeType,
        scheduleContext: getScheduleContext(),
      });

      let aiPrefilled: PrefilledData | undefined = undefined;
      if (response.proposedAction) {
        // Map proposedAction to PrefilledData
        const action = response.proposedAction;
        if (action.type === 'event') {
          aiPrefilled = {
            type: 'event',
            title: action.title,
            date: action.date,
            startTime: action.startTime,
            endTime: action.endTime,
            location: action.location,
            notes: action.notes,
            eventType: 'personal',
          };
        } else if (action.type === 'task') {
          aiPrefilled = {
            type: 'task',
            title: action.title,
            date: action.date,
            dueTime: action.dueTime,
            courseId: action.courseId,
            priority: action.priority,
            notes: action.notes,
          };
        } else if (action.type === 'expense') {
          aiPrefilled = {
            type: 'expense',
            title: action.title,
            date: action.date,
            amount: action.amount,
            category: (action.category ? normalizeTransactionCategory(action.category) : 'Food & Groceries') as ExpenseCategory,
            paymentMethod: action.paymentMethod || 'QRIS',
            notes: action.notes,
          };
        }
      }

      // Only popup if AI returned a complete proposal
      if (aiPrefilled) {
        setPrefilledModal({
          data: { ...aiPrefilled },
          messageId: (Date.now() + 1).toString(),
        });
        setPrefilledError('');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        prefilledData: aiPrefilled || undefined,
      };

      setMessages((prev) => [
        ...(aiPrefilled
          ? prev.map((item) => item.prefilledData && !item.actionStatus ? { ...item, actionStatus: 'replaced' as const } : item)
          : prev),
        aiMessage,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Omni. Try again.';
      setRequestError(message);
      setRetryText(userMessage.content);
    } finally {
      setIsTyping(false);
    }
  };

  // Confirm and save prefilled pop-up data to Omnia
  const handleConfirmPrefilled = async () => {
    if (!prefilledModal) return;
    const { data, messageId } = prefilledModal;

    if (!data.title.trim()) {
      setPrefilledError('Please provide a title or description.');
      return;
    }
    if (!data.date) {
      setPrefilledError('Please select a valid date.');
      return;
    }
    if (data.type === 'expense' && (!data.amount || data.amount <= 0)) {
      setPrefilledError('Please enter an amount greater than $0.');
      return;
    }

    setPrefilledError('');
    setIsSavingPrefilled(true);

    try {
      let confirmationText = '';

      if (data.type === 'event') {
        const savedEvent = await ds.createEvent({
          title: data.title.trim(),
          date: data.date,
          type: data.eventType || 'personal',
          startTime: data.startTime || undefined,
          endTime: data.endTime || undefined,
          location: data.location?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
          courseId: data.courseId,
        });
        const dateLabel = new Date(`${savedEvent.date}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'long', month: 'short', day: 'numeric',
        });
        confirmationText = `Added **${savedEvent.title}** to your schedule for ${dateLabel}${savedEvent.startTime ? ` at ${savedEvent.startTime}${savedEvent.endTime ? `–${savedEvent.endTime}` : ''}` : ''}.`;
      } else if (data.type === 'task') {
        const dueTime = data.dueTime || (data.startTime ? data.startTime : '23:59');
        const savedTask = await ds.addAssignment({
          title: data.title.trim(),
          dueDate: `${data.date}T${dueTime}`,
          courseId: data.courseId,
          priority: data.priority || 'medium',
          status: 'not-started',
          notes: data.notes?.trim() || undefined,
        });
        confirmationText = `Added assignment **${savedTask.title}** due on ${data.date}${dueTime ? ` at ${dueTime}` : ''}.`;
      } else if (data.type === 'expense') {
        const savedTxn = ds.addTransaction({
          merchant: data.title.trim() || 'Campus Expense',
          amount: Number(data.amount) || 0,
          type: 'expense',
          category: data.category || 'Other Discretionary',
          date: data.date,
          paymentMethod: data.paymentMethod || 'QRIS',
          notes: data.notes?.trim() || undefined,
        });
        const currency = ds.getSettings()?.currency || 'IDR';
        confirmationText = `Logged expense **${formatCurrency(savedTxn.amount, currency)}** for "${savedTxn.merchant}" under ${savedTxn.category} on ${savedTxn.date}.`;
      }

      // Mark the relevant message as saved
      if (messageId) {
        setMessages((prev) => prev.map((item) =>
          item.id === messageId || item.prefilledData?.title === data.title
            ? { ...item, actionStatus: 'saved' as const }
            : item
        ));
      }

      // Add cheerful confirmation assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✓ ${confirmationText}`,
        },
      ]);

      // Close modal
      setPrefilledModal(null);
    } catch (err) {
      setPrefilledError(err instanceof Error ? err.message : 'Unable to save. Please check fields and try again.');
    } finally {
      setIsSavingPrefilled(false);
    }
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

  const suggestions = lang === 'id' ? [
    { label: 'Catat pengeluaran: 15rb beli makan siang di kantin', icon: <DollarSign size={16} /> },
    { label: 'Jadwalkan: Belajar kelompok kalkulus besok jam 3 sore di perpus', icon: <Calendar size={16} /> },
    { label: 'Tambah tugas: Laporan praktikum jaringan dikumpulkan Jumat jam 23:59', icon: <PlusCircle size={16} /> },
  ] : [
    { label: 'Log expense: $12 for lunch at campus diner', icon: <DollarSign size={16} /> },
    { label: 'Add event: Math study group tomorrow 3pm in Library', icon: <Calendar size={16} /> },
    { label: 'Add task: CS101 problem set due Friday at 11:59pm', icon: <PlusCircle size={16} /> },
  ];

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="ask-omni-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-container-low)' }}>
      {/* Header — desktop only */}
      <div className="ask-omni-header hidden-mobile" style={{
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-lowest)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--primary-container)',
            color: 'var(--primary)',
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>
              {lang === 'id' ? 'Tanya Omni' : 'Ask Omni'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
              {lang === 'id'
                ? 'Ketik secara natural untuk mengatur jadwal, menambah tugas, atau mencatat pengeluaran.'
                : 'Type naturally to schedule classes, add tasks, or log expenses with pre-filled pop-ups.'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`ask-omni-chat-area${messages.length === 0 ? ' is-empty' : ''}`} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem 1rem 10rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 768, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', margin: '0.75rem auto 0', padding: '0 0.5rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem',
                color: 'white', boxShadow: 'var(--shadow-sm)',
              }}>
                <Sparkles size={28} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '0.375rem', textAlign: 'center' }}>
                {lang === 'id' ? 'Tanyakan atau catat apa saja untuk perkuliahanmu' : 'Ask me to add anything to your college planner'}
              </h2>
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.25rem', textAlign: 'center', maxWidth: 460, fontSize: '0.8125rem', lineHeight: 1.4 }}>
                {lang === 'id'
                  ? 'Beri tahu saya jadwal kuliah, tugas yang perlu dikerjakan, atau pengeluaran harian. Saya akan siapkan konfirmasinya langsung!'
                  : 'Tell me what to schedule, assignments to track, or expenses to log. I’ll prefill a pop-up confirmation so you can review and click Okay!'}
              </p>

              <div className="ask-omni-suggestions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 460 }}>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(s.label)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.625rem 0.875rem', borderRadius: 10,
                      border: '1px solid var(--outline-variant)',
                      background: 'var(--surface-container-lowest)',
                      color: 'var(--on-surface)',
                      fontSize: '0.8125rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
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
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', paddingLeft: '0.5rem' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                      }}>
                        <Sparkles size={12} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Omni</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div style={{
                    maxWidth: '85%',
                    padding: '0.875rem 1.125rem',
                    overflowWrap: 'anywhere',
                    borderRadius: 18,
                    borderTopLeftRadius: msg.role === 'assistant' ? 4 : 18,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-container-lowest)',
                    color: msg.role === 'user' ? 'white' : 'var(--on-surface)',
                    border: msg.role === 'assistant' ? '1px solid var(--outline-variant)' : 'none',
                    boxShadow: msg.role === 'assistant' ? 'var(--shadow-xs)' : 'none',
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

                  {/* Pre-filled Data Card & Pop-up Trigger */}
                  {msg.prefilledData && (
                    <div style={{
                      width: 'min(90%, 460px)',
                      marginTop: '0.625rem',
                      padding: '0.875rem 1rem',
                      borderRadius: 14,
                      border: '1px solid var(--outline-variant)',
                      background: 'var(--surface-container-lowest)',
                      boxShadow: 'var(--shadow-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          {msg.prefilledData.type === 'expense' ? <DollarSign size={13} /> : msg.prefilledData.type === 'task' ? <CheckSquare size={13} /> : <Calendar size={13} />}
                          {lang === 'id' ? 'Siap dikonfirmasi' : 'Ready to confirm'} {lang === 'id' ? (msg.prefilledData.type === 'expense' ? 'Pengeluaran' : msg.prefilledData.type === 'task' ? 'Tugas' : 'Acara') : (msg.prefilledData.type === 'expense' ? 'Expense' : msg.prefilledData.type === 'task' ? 'Assignment' : 'Schedule Event')}
                        </span>
                        {msg.actionStatus === 'saved' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            background: 'var(--primary-container)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 6,
                          }}>
                            <Check size={12} /> {lang === 'id' ? 'Tersimpan di' : 'Saved to'} {lang === 'id' ? (msg.prefilledData.type === 'expense' ? 'Keuangan' : msg.prefilledData.type === 'task' ? 'Tugas' : 'Jadwal') : (msg.prefilledData.type === 'expense' ? 'Finance' : msg.prefilledData.type === 'task' ? 'Tasks' : 'Schedule')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                            {lang === 'id' ? 'Siap dikonfirmasi' : 'Ready to confirm'}
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
                        {msg.prefilledData.title}
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
                        {formatPrefilledSummary(msg.prefilledData)}
                      </div>

                      {msg.actionStatus !== 'saved' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setPrefilledModal({
                                data: { ...msg.prefilledData! },
                                messageId: msg.id,
                              });
                              setPrefilledError('');
                            }}
                            className="btn-primary"
                            style={{
                              fontSize: '0.8125rem',
                              padding: '0.45rem 0.875rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                            }}
                          >
                            <Sparkles size={14} />
                            {lang === 'id' ? 'Buka Pop-up & Konfirmasi' : 'Open Pop-up & Confirm'}
                          </button>
                        </div>
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                    }}>
                      <Sparkles size={12} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Omni</span>
                  </div>
                  <div style={{
                    padding: '0.875rem 1.25rem', borderRadius: 18, borderTopLeftRadius: 4,
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                    display: 'flex', gap: '0.375rem', alignItems: 'center',
                    height: 44,
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

      {/* Input Composer Area */}
      <div
        className="ask-omni-composer"
        style={{
          padding: '1rem 1.5rem',
          background: 'var(--surface-container-lowest)',
          borderTop: '1px solid var(--outline-variant)',
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
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
          <div
            className="ask-omni-input-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 999,
              padding: '0.375rem 0.375rem 0.375rem 1rem',
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem',
                color: 'var(--on-surface-variant)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
              placeholder={lang === 'id' ? 'Contoh: Besok ada kuis 9 pagi, atau catat beli makan 15rb...' : 'e.g. Add math exam Monday 9am, or spent $15 on lunch...'}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9375rem',
                color: 'var(--on-surface)',
              }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
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
                transition: 'background-color 0.2s ease, color 0.2s ease, transform 0.2s ease',
                marginLeft: '0.5rem',
              }}
            >
              <Send size={18} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
            </button>
          </div>
          {requestError && <div role="alert" style={{ color: 'var(--error)', fontSize: '0.8125rem', paddingLeft: '0.75rem' }}>
            {requestError}
            {retryText && <button type="button" className="btn-ghost" onClick={() => { setInput(retryText); setRequestError(''); setRetryText(''); }} style={{ marginLeft: '0.5rem', color: 'inherit' }}>Coba lagi</button>}
          </div>}
        </div>
      </div>

      {/* ─── Pre-filled Pop-up Modal ─── */}
      {prefilledModal && (
        <Modal
          isOpen={!!prefilledModal}
          onClose={() => setPrefilledModal(null)}
          title={
            prefilledModal.data.type === 'expense'
              ? 'Catat pengeluaran kampus'
              : prefilledModal.data.type === 'task'
              ? 'Tambah tugas kuliah'
              : 'Tambah acara ke jadwal'
          }
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* AI Notice Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 0.875rem',
              borderRadius: 8,
              background: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}>
              <Sparkles size={16} style={{ flexShrink: 0, color: 'var(--primary)' }} />
              <span>
                Omni prefilled these details from your message. You can adjust any fields and click <strong>Okay</strong> to confirm.
              </span>
            </div>

            {/* Type Switcher Tabs */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--on-surface-variant)', marginBottom: '0.375rem' }}>
                Category Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem', background: 'var(--surface-container)', padding: '0.25rem', borderRadius: 8 }}>
                {[
                  { id: 'event' as const, label: 'Schedule Event', icon: <Calendar size={14} /> },
                  { id: 'task' as const, label: 'Task / HW', icon: <CheckSquare size={14} /> },
                  { id: 'expense' as const, label: 'Expense', icon: <DollarSign size={14} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, type: tab.id } } : null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                      padding: '0.45rem 0.5rem',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: prefilledModal.data.type === tab.id ? 'var(--surface-container-lowest)' : 'transparent',
                      color: prefilledModal.data.type === tab.id ? 'var(--primary)' : 'var(--on-surface-variant)',
                      boxShadow: prefilledModal.data.type === tab.id ? 'var(--shadow-xs)' : 'none',
                      transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                  {prefilledModal.data.type === 'expense' ? 'Description / Merchant *' : 'Title *'}
                </label>
                <input
                  type="text"
                  value={prefilledModal.data.title}
                  onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, title: e.target.value } } : null)}
                  placeholder={prefilledModal.data.type === 'expense' ? 'e.g. Lunch at Cafe' : 'e.g. CS101 Midterm Exam'}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {/* Date & Time Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={prefilledModal.data.date}
                    onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, date: e.target.value } } : null)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {prefilledModal.data.type === 'expense' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                      {lang === 'id' ? 'Nominal (Rp) *' : 'Amount (Rp) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prefilledModal.data.amount ?? ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, amount: isNaN(val) ? 0 : val } } : null);
                      }}
                      placeholder="0.00"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                ) : prefilledModal.data.type === 'task' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                      Due Time
                    </label>
                    <input
                      type="time"
                      value={prefilledModal.data.dueTime || prefilledModal.data.startTime || '23:59'}
                      onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, dueTime: e.target.value } } : null)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={prefilledModal.data.startTime || ''}
                      onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, startTime: e.target.value } } : null)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              {/* Event Specific: End Time & Location */}
              {prefilledModal.data.type === 'event' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                      End Time
                    </label>
                    <input
                      type="time"
                      value={prefilledModal.data.endTime || ''}
                      onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, endTime: e.target.value } } : null)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hall B302, Library"
                      value={prefilledModal.data.location || ''}
                      onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, location: e.target.value } } : null)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {/* Task / Expense Course or Category Selection */}
              {prefilledModal.data.type === 'task' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                      Course (Optional)
                    </label>
                    <select
                      value={prefilledModal.data.courseId || ''}
                      onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, courseId: e.target.value || undefined } } : null)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">General (No Course)</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.code} – {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                      Priority
                    </label>
                    <select
                      value={prefilledModal.data.priority || 'medium'}
                      onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, priority: e.target.value as Priority } } : null)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              ) : prefilledModal.data.type === 'expense' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                      Category
                    </label>
                    <select
                      value={prefilledModal.data.category || 'Food & Groceries'}
                      onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, category: e.target.value as PrefilledData['category'] } } : null)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                      {lang === 'id' ? 'Metode Pembayaran' : 'Payment Method'}
                    </label>
                    <select
                      value={prefilledModal.data.paymentMethod || 'QRIS'}
                      onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, paymentMethod: e.target.value } } : null)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      {ds.getPaymentMethods().map((pm) => (
                        <option key={pm} value={pm}>{pm}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                    Event Type
                  </label>
                  <select
                    value={prefilledModal.data.eventType || 'personal'}
                    onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, eventType: e.target.value as EventType } } : null)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="personal">Personal</option>
                    <option value="exam">Exam</option>
                    <option value="deadline">Deadline</option>
                    <option value="class">Class</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={prefilledModal.data.notes || ''}
                  onChange={(e) => setPrefilledModal((prev) => prev ? { ...prev, data: { ...prev.data, notes: e.target.value } } : null)}
                  placeholder="Additional information..."
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Error Message */}
            {prefilledError && (
              <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--error)', fontSize: '0.8125rem' }}>
                <AlertCircle size={15} />
                <span>{prefilledError}</span>
              </div>
            )}

            {/* Action Buttons: Cancel and Okay */}
            <div className="modal-actions-sticky">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setPrefilledModal(null)}
                disabled={isSavingPrefilled}
                style={{ padding: '0.5rem 1rem', minHeight: 40 }}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleConfirmPrefilled()}
                disabled={isSavingPrefilled}
                style={{
                  padding: '0.5rem 1.25rem',
                  minHeight: 40,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                }}
              >
                <Check size={16} aria-hidden="true" />
                {isSavingPrefilled ? (lang === 'id' ? 'Menyimpan…' : 'Saving…') : (lang === 'id' ? 'Simpan' : 'Okay')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
