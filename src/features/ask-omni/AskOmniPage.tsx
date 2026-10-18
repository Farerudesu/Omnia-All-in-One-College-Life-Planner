import { useState, useRef, useEffect } from 'react';
import * as ds from '@/lib/dataService';
import { formatCurrency } from '@/lib/currency';
import { useData } from '@/lib/useData';
import { useLanguage } from '@/lib/useLanguage';
import type { ChatMessage, PrefilledData } from '@/types';
import { askOmni } from './askOmni';
import { getScheduleContext } from './utils/scheduleContext';
import { saveProposalToOmnia } from './utils/proposalSaver';
import {
  isConfirmationIntent,
  validateProposal,
  extractProposalFromResponse,
} from './aiIntentParser';
import type { ImageAttachment } from './types';
import { AskOmniHeader } from './components/AskOmniHeader';
import { AskOmniMessageList } from './components/AskOmniMessageList';
import { AskOmniComposer } from './components/AskOmniComposer';
import { PrefilledProposalModal } from './components/PrefilledProposalModal';

type Message = ChatMessage;

function loadChatHistory(): Message[] {
  try {
    const history = ds.getSavedChatHistory();
    return history.filter(
      (message: Message) =>
        !(
          message.role === 'assistant' &&
          /having trouble replying|unable to reach|failed to send request|try again in a moment/i.test(message.content)
        )
    );
  } catch {
    return [];
  }
}

export function AskOmniPage() {
  const lang = useLanguage();
  const courses = useData(ds.getCourses);
  const settings = useData(ds.getSettings);
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

  // Receipt queue: sequential popup flow for multi-item receipts
  const [receiptQueue, setReceiptQueue] = useState<PrefilledData[]>([]);
  const [receiptTotal, setReceiptTotal] = useState<number | null>(null);
  const [receiptSavedAmounts, setReceiptSavedAmounts] = useState<number[]>([]);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length === 0 && settings.chatHistory && settings.chatHistory.length > 0) {
      setMessages(settings.chatHistory);
    }
  }, [settings.chatHistory]);

  useEffect(() => {
    ds.saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;
    if (isTyping) return;

    const userText = input.trim();
    setRetryText('');

    const pendingMessage = messages.slice().reverse().find((m) => m.prefilledData && !m.actionStatus);
    if (pendingMessage?.prefilledData && isConfirmationIntent(userText)) {
      setPrefilledModal({
        data: { ...pendingMessage.prefilledData },
        messageId: pendingMessage.id,
      });
      setPrefilledError('');
      setInput('');
      return;
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
        content:
          item.actionStatus === 'saved' && item.prefilledData
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

      if (response.proposedActions && response.proposedActions.length > 0) {
        const mapped = response.proposedActions
          .map((action) => extractProposalFromResponse({ ...response, proposedActions: [action] }))
          .filter((x): x is PrefilledData => !!x);
        if (mapped.length > 0) {
          const [first, ...rest] = mapped;
          setReceiptQueue(rest);
          setReceiptTotal(response.receiptTotal ?? null);
          setReceiptSavedAmounts([]);
          aiPrefilled = first;
        }
      } else {
        const extracted = extractProposalFromResponse(response);
        if (extracted) {
          aiPrefilled = extracted;
        }
      }

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
          ? prev.map((item) =>
              item.prefilledData && !item.actionStatus ? { ...item, actionStatus: 'replaced' as const } : item
            )
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

  const handleConfirmPrefilled = async () => {
    if (!prefilledModal) return;
    const { data, messageId } = prefilledModal;

    const validation = validateProposal(data, lang);
    if (!validation.valid) {
      setPrefilledError(validation.error || 'Data proposal tidak valid.');
      return;
    }

    setPrefilledError('');
    setIsSavingPrefilled(true);

    try {
      const { confirmationText, savedAmount } = await saveProposalToOmnia(data);

      if (messageId) {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === messageId || item.prefilledData?.title === data.title
              ? { ...item, actionStatus: 'saved' as const }
              : item
          )
        );
      }

      if (receiptQueue.length > 0) {
        const newSavedAmounts = [...receiptSavedAmounts, savedAmount];
        const [next, ...remaining] = receiptQueue;
        setReceiptQueue(remaining);
        setReceiptSavedAmounts(newSavedAmounts);
        setPrefilledModal({ data: { ...next } });
        setPrefilledError('');
        if (messageId) {
          setMessages((prev) =>
            prev.map((item) =>
              item.id === messageId || item.prefilledData?.title === data.title
                ? { ...item, actionStatus: 'saved' as const }
                : item
            )
          );
        }
        setIsSavingPrefilled(false);
        return;
      }

      const finalSavedAmounts = [...receiptSavedAmounts, savedAmount];
      const isReceiptFlow = receiptSavedAmounts.length > 0;

      let summaryMessage = `✓ ${confirmationText}`;
      if (isReceiptFlow) {
        const n = finalSavedAmounts.length;
        const savedTotal = finalSavedAmounts.reduce((a, b) => a + b, 0);
        const currency = ds.getSettings()?.currency || 'IDR';
        summaryMessage = `✓ ${n} item tercatat, total ${formatCurrency(savedTotal, currency)}`;
        if (receiptTotal !== null && Math.abs(savedTotal - receiptTotal) > 1) {
          summaryMessage += `\n\n⚠️ Peringatan: total item (${formatCurrency(savedTotal, currency)}) berbeda dengan total struk (${formatCurrency(receiptTotal, currency)}). Periksa kembali.`;
        }
        setReceiptTotal(null);
        setReceiptSavedAmounts([]);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: summaryMessage,
        },
      ]);

      setPrefilledModal(null);
    } catch (err) {
      setPrefilledError(err instanceof Error ? err.message : 'Unable to save. Please check fields and try again.');
    } finally {
      setIsSavingPrefilled(false);
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

  const handleClearHistory = () => {
    if (window.confirm(lang === 'id' ? 'Hapus semua riwayat percakapan Omni?' : 'Clear all Omni chat history?')) {
      setMessages([]);
      ds.saveChatHistory([]);
    }
  };

  return (
    <div
      className="ask-omni-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface-container-low)',
      }}
    >
      <AskOmniHeader
        lang={lang}
        hasMessages={messages.length > 0}
        onClearHistory={handleClearHistory}
      />

      <AskOmniMessageList
        messages={messages}
        isTyping={isTyping}
        lang={lang}
        onSuggestionClick={(text) => setInput(text)}
        onClearHistory={handleClearHistory}
        onOpenPrefilledModal={(data, messageId) => {
          setPrefilledModal({ data: { ...data }, messageId });
          setPrefilledError('');
        }}
        endOfMessagesRef={endOfMessagesRef}
      />

      <AskOmniComposer
        input={input}
        isTyping={isTyping}
        attachment={attachment}
        requestError={requestError}
        retryText={retryText}
        lang={lang}
        onInputChange={setInput}
        onSend={() => void handleSend()}
        onFileChange={handleFileChange}
        onRemoveAttachment={() => setAttachment(null)}
        onRetry={() => {
          setInput(retryText);
          setRequestError('');
          setRetryText('');
        }}
      />

      <PrefilledProposalModal
        prefilledModal={prefilledModal}
        receiptSavedAmounts={receiptSavedAmounts}
        receiptQueue={receiptQueue}
        prefilledError={prefilledError}
        isSavingPrefilled={isSavingPrefilled}
        courses={courses}
        paymentMethods={ds.getPaymentMethods()}
        lang={lang}
        onClose={() => {
          setPrefilledModal(null);
          setReceiptQueue([]);
          setReceiptTotal(null);
          setReceiptSavedAmounts([]);
        }}
        onConfirm={() => void handleConfirmPrefilled()}
        onChangeData={(updater) =>
          setPrefilledModal((prev) => (prev ? { ...prev, data: updater(prev.data) } : null))
        }
      />
    </div>
  );
}

export default AskOmniPage;
