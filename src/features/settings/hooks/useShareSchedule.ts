import { useState } from 'react';
import type { SharePreview } from '@/lib/dataService';
import * as ds from '@/lib/dataService';

export function useShareSchedule() {
  const [shareCode, setShareCode] = useState('');
  const [isCreatingShareCode, setIsCreatingShareCode] = useState(false);
  const [isShareCodeCopied, setIsShareCodeCopied] = useState(false);
  const [shareCreateError, setShareCreateError] = useState('');
  const [importCode, setImportCode] = useState('');
  const [previewData, setPreviewData] = useState<SharePreview | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isPreviewingShare, setIsPreviewingShare] = useState(false);
  const [isImportingShare, setIsImportingShare] = useState(false);

  const handleCreateShareCode = async () => {
    setShareCreateError('');
    setShareCode('');
    setIsShareCodeCopied(false);
    setIsCreatingShareCode(true);
    try {
      setShareCode(await ds.createShareCode());
    } catch (error: unknown) {
      setShareCreateError(
        error instanceof Error ? error.message : 'Unable to create a share code.'
      );
    } finally {
      setIsCreatingShareCode(false);
    }
  };

  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setIsShareCodeCopied(true);
      window.setTimeout(() => setIsShareCodeCopied(false), 1800);
    } catch {
      setShareCreateError('Clipboard access is unavailable. Select and copy the code.');
    }
  };

  const handlePreviewShareCode = async () => {
    setImportError('');
    setImportSuccess('');
    setIsPreviewingShare(true);
    try {
      const preview = await ds.previewShareCode(importCode);
      setPreviewData(preview);
      setShowImportModal(true);
    } catch (error: unknown) {
      setImportError(error instanceof Error ? error.message : 'Invalid or expired code.');
    } finally {
      setIsPreviewingShare(false);
    }
  };

  const handleImportShareCode = async () => {
    setImportError('');
    setIsImportingShare(true);
    try {
      const result = await ds.redeemShareCode(importCode);
      setImportSuccess(
        `Copied ${result.classes} ${result.classes === 1 ? 'class' : 'classes'} and ${result.assignments} ${result.assignments === 1 ? 'assignment' : 'assignments'}.`
      );
      setImportCode('');
      setShowImportModal(false);
      setPreviewData(null);
    } catch (error: unknown) {
      setImportError(error instanceof Error ? error.message : 'Invalid or expired code.');
      setShowImportModal(false);
    } finally {
      setIsImportingShare(false);
    }
  };

  return {
    shareCode,
    isCreatingShareCode,
    isShareCodeCopied,
    shareCreateError,
    importCode,
    setImportCode,
    previewData,
    showImportModal,
    setShowImportModal,
    importError,
    importSuccess,
    isPreviewingShare,
    isImportingShare,
    handleCreateShareCode,
    handleCopyShareCode,
    handlePreviewShareCode,
    handleImportShareCode,
  };
}
