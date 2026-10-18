import { Maximize2, X } from 'lucide-react';
import * as ds from '@/lib/dataService';
import { useOmniChat } from '../hooks/useOmniChat';
import { AskOmniHeader } from './AskOmniHeader';
import { AskOmniMessageList } from './AskOmniMessageList';
import { AskOmniComposer } from './AskOmniComposer';
import { PrefilledProposalModal } from './PrefilledProposalModal';

export interface OmniChatProps {
  pageContext?: { route: string; noteId?: string };
  showHeader?: boolean;
  isSheet?: boolean;
  onClose?: () => void;
  onExpandFullScreen?: () => void;
}

export function OmniChat({
  pageContext,
  showHeader = true,
  isSheet = false,
  onClose,
  onExpandFullScreen,
}: OmniChatProps) {
  const {
    messages,
    input,
    setInput,
    isTyping,
    attachment,
    setAttachment,
    requestError,
    retryText,
    setRequestError,
    setRetryText,
    prefilledModal,
    setPrefilledModal,
    isSavingPrefilled,
    prefilledError,
    setPrefilledError,
    receiptQueue,
    setReceiptQueue,
    setReceiptTotal,
    receiptSavedAmounts,
    setReceiptSavedAmounts,
    courses,
    lang,
    endOfMessagesRef,
    handleSend,
    handleConfirmPrefilled,
    handleFileChange,
    handleClearHistory,
  } = useOmniChat({ pageContext });

  return (
    <div
      className="omni-chat-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--surface-container-low)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      {showHeader && !isSheet && (
        <AskOmniHeader
          lang={lang}
          hasMessages={messages.length > 0}
          onClearHistory={handleClearHistory}
        />
      )}

      {/* Sheet Custom Header */}
      {isSheet && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--outline-variant)',
            background: 'var(--surface-container)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)' }}>
              Omni AI
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {onExpandFullScreen && (
              <button
                type="button"
                className="btn-ghost"
                onClick={onExpandFullScreen}
                title={lang === 'id' ? 'Buka layar penuh' : 'Open full screen'}
                aria-label={lang === 'id' ? 'Buka layar penuh' : 'Open full screen'}
                style={{ padding: '0.375rem', height: 'auto' }}
              >
                <Maximize2 size={16} />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                title={lang === 'id' ? 'Tutup' : 'Close'}
                aria-label={lang === 'id' ? 'Tutup' : 'Close'}
                style={{ padding: '0.375rem', height: 'auto' }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message List */}
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

      {/* Composer Input Bar */}
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

      {/* Modal Proposal */}
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
