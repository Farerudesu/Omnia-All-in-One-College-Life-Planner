import { describe, it, expect } from 'vitest';
import {
  parseProposalFromText,
  isConfirmationIntent,
  validateProposal,
  extractProposalFromResponse,
} from '../aiIntentParser';
import type { PrefilledData, ChatMessage } from '../../types';
import type { AskOmniResponse } from '../askOmni';

describe('aiIntentParser Unit Tests', () => {
  // 1. ISO Date parsing
  it('case 1: parseProposalFromText parses ISO date (YYYY-MM-DD)', () => {
    const text = 'Proposal event: Title: Seminar Skripsi Date: 2026-11-20 Start: 13:00 End: 15:00 Location: Lab Komputer';
    const result = parseProposalFromText(text);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Seminar Skripsi');
    expect(result?.date).toBe('2026-11-20');
    expect(result?.startTime).toBe('13:00');
    expect(result?.endTime).toBe('15:00');
    expect(result?.location).toBe('Lab Komputer');
  });

  // 2. English date parsing
  it('case 2: parseProposalFromText parses English formatted date', () => {
    const text = 'Proposal calendar event: Title: Team Meeting Date: Tuesday, October 6, 2026 Start: 09:30 End: 10:30 Location: Room 302';
    const result = parseProposalFromText(text);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Team Meeting');
    expect(result?.date).toBe('2026-10-06');
    expect(result?.startTime).toBe('09:30');
    expect(result?.endTime).toBe('10:30');
    expect(result?.location).toBe('Room 302');
  });

  // 3. Indonesian date parsing
  it('case 3: parseProposalFromText parses Indonesian formatted date', () => {
    const text = 'Jadwal diusulkan: Judul: Ujian Algoritma Tanggal: 6 Oktober 2026 Jam: 08:00 Selesai: 10:00 Lokasi: Gedung A';
    const result = parseProposalFromText(text);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Ujian Algoritma');
    expect(result?.date).toBe('2026-10-06');
    expect(result?.startTime).toBe('08:00');
    expect(result?.endTime).toBe('10:00');
    expect(result?.location).toBe('Gedung A');
  });

  // 4. Malformed/non-proposal input returns null
  it('case 4: parseProposalFromText returns null for random conversation', () => {
    const text = 'Halo Omni, bagaimana cara mengatur jadwal kuliah yang padat semester ini?';
    expect(parseProposalFromText(text)).toBeNull();
  });

  // 5. Malformed proposal input with missing title uses fallback title
  it('case 5: parseProposalFromText handles proposal with missing title safely', () => {
    const text = 'Proposal event: Date: 2026-12-01 Start: 14:00';
    const result = parseProposalFromText(text);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Upcoming Event');
    expect(result?.date).toBe('2026-12-01');
    expect(result?.startTime).toBe('14:00');
    expect(result?.endTime).toBe('15:00'); // default 1 hour later
  });

  // 6. Confirmation intent in Indonesian
  it('case 6: isConfirmationIntent correctly identifies Indonesian confirmation words', () => {
    expect(isConfirmationIntent('gas')).toBe(true);
    expect(isConfirmationIntent('bisa')).toBe(true);
    expect(isConfirmationIntent('oke')).toBe(true);
    expect(isConfirmationIntent('ya')).toBe(true);
    expect(isConfirmationIntent('tambahkan')).toBe(true);
    expect(isConfirmationIntent('tambahkan jadwal')).toBe(true);
  });

  // 7. Confirmation intent in English
  it('case 7: isConfirmationIntent correctly identifies English confirmation words', () => {
    expect(isConfirmationIntent('ok')).toBe(true);
    expect(isConfirmationIntent('add')).toBe(true);
    expect(isConfirmationIntent('yes')).toBe(true);
    expect(isConfirmationIntent('confirm')).toBe(true);
    expect(isConfirmationIntent('deal')).toBe(true);
  });

  // 8. Rejects normal chat messages as confirmation intent
  it('case 8: isConfirmationIntent returns false for general chat', () => {
    expect(isConfirmationIntent('saya mau makan siang dulu')).toBe(false);
    expect(isConfirmationIntent('apakah ada tugas besok?')).toBe(false);
    expect(isConfirmationIntent('tidak jadi')).toBe(false);
    expect(isConfirmationIntent('batalkan acara ini')).toBe(false);
  });

  // 9. Confirmation handling logic with pending vs without pending proposal
  it('case 9: confirmation with pending proposal vs without pending proposal', () => {
    const messagesWithoutPending: ChatMessage[] = [
      { id: '1', role: 'user', content: 'halo' },
      { id: '2', role: 'assistant', content: 'halo ada yang bisa dibantu?' },
    ];
    const messagesWithPending: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Saya usulkan jadwal berikut',
        prefilledData: {
          type: 'event',
          title: 'Konsultasi Dosen',
          date: '2026-10-25',
        },
      },
    ];

    const findPending = (msgs: ChatMessage[]) =>
      msgs.slice().reverse().find((m) => m.prefilledData && !m.actionStatus);

    const userInput = 'gas';

    // Without pending proposal: confirmation must NOT trigger modal
    const pending1 = findPending(messagesWithoutPending);
    const shouldOpenModal1 = Boolean(pending1?.prefilledData && isConfirmationIntent(userInput));
    expect(shouldOpenModal1).toBe(false);

    // With pending proposal: confirmation triggers modal
    const pending2 = findPending(messagesWithPending);
    const shouldOpenModal2 = Boolean(pending2?.prefilledData && isConfirmationIntent(userInput));
    expect(shouldOpenModal2).toBe(true);
  });

  // 10. Structured extraction precedence over text regex
  it('case 10: extractProposalFromResponse prioritizes structured proposedAction over reply text', () => {
    const response: AskOmniResponse = {
      reply: 'Proposal event: Title: Fake Event Date: 2026-01-01 Start: 00:00 End: 01:00',
      proposedAction: {
        type: 'task',
        title: 'Tugas Kalkulus',
        date: '2026-10-22',
        dueTime: '23:59',
        priority: 'high',
      },
    };

    const extracted = extractProposalFromResponse(response);
    expect(extracted).not.toBeNull();
    expect(extracted?.type).toBe('task');
    expect(extracted?.title).toBe('Tugas Kalkulus');
    expect(extracted?.date).toBe('2026-10-22');
  });

  // 11. extractProposalFromResponse falls back to parseProposalFromText only when no structured object exists
  it('case 11: extractProposalFromResponse uses parseProposalFromText fallback when structured object is absent', () => {
    const response: AskOmniResponse = {
      reply: 'Proposal event: Title: Diskusi Kelompok Date: 2026-11-05 Start: 14:00 End: 16:00',
    };

    const extracted = extractProposalFromResponse(response);
    expect(extracted).not.toBeNull();
    expect(extracted?.type).toBe('event');
    expect(extracted?.title).toBe('Diskusi Kelompok');
    expect(extracted?.date).toBe('2026-11-05');
  });

  // 12. validateProposal - complete validation checks
  describe('validateProposal client-side validation', () => {
    it('case 12: accepts valid event proposal', () => {
      const proposal: PrefilledData = {
        type: 'event',
        title: 'Praktikum Jaringan',
        date: '2026-10-25',
        startTime: '10:00',
        endTime: '12:00',
      };
      expect(validateProposal(proposal, 'id').valid).toBe(true);
      expect(validateProposal(proposal, 'en').valid).toBe(true);
    });

    it('case 13: rejects empty title with i18n message', () => {
      const proposal: PrefilledData = {
        type: 'event',
        title: '   ',
        date: '2026-10-25',
      };
      const resId = validateProposal(proposal, 'id');
      expect(resId.valid).toBe(false);
      expect(resId.error).toBe('Judul atau deskripsi wajib diisi.');

      const resEn = validateProposal(proposal, 'en');
      expect(resEn.valid).toBe(false);
      expect(resEn.error).toBe('Title or description is required.');
    });

    it('case 14: rejects invalid date formats and calendar dates', () => {
      const invalidFormat: PrefilledData = {
        type: 'event',
        title: 'Event',
        date: '25-10-2026',
      };
      expect(validateProposal(invalidFormat, 'id').valid).toBe(false);

      const impossibleDate: PrefilledData = {
        type: 'event',
        title: 'Event',
        date: '2026-02-31',
      };
      expect(validateProposal(impossibleDate, 'id').valid).toBe(false);
    });

    it('case 15: rejects invalid time formats', () => {
      const invalidTime: PrefilledData = {
        type: 'event',
        title: 'Event',
        date: '2026-10-25',
        startTime: '25:70',
      };
      expect(validateProposal(invalidTime, 'id').valid).toBe(false);
    });

    it('case 16: rejects endTime earlier than startTime', () => {
      const backwardTime: PrefilledData = {
        type: 'event',
        title: 'Event',
        date: '2026-10-25',
        startTime: '14:00',
        endTime: '13:00',
      };
      const res = validateProposal(backwardTime, 'id');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Waktu selesai harus lebih dari atau sama dengan waktu mulai.');
    });

    it('case 17: validates expense amount to be a positive integer', () => {
      const negativeExpense: PrefilledData = {
        type: 'expense',
        title: 'Makan Siang',
        date: '2026-10-25',
        amount: -15000,
      };
      expect(validateProposal(negativeExpense, 'id').valid).toBe(false);

      const zeroExpense: PrefilledData = {
        type: 'expense',
        title: 'Makan Siang',
        date: '2026-10-25',
        amount: 0,
      };
      expect(validateProposal(zeroExpense, 'id').valid).toBe(false);

      const decimalExpense: PrefilledData = {
        type: 'expense',
        title: 'Makan Siang',
        date: '2026-10-25',
        amount: 15000.75,
      };
      expect(validateProposal(decimalExpense, 'id').valid).toBe(false);

      const validExpense: PrefilledData = {
        type: 'expense',
        title: 'Makan Siang',
        date: '2026-10-25',
        amount: 25000,
      };
      expect(validateProposal(validExpense, 'id').valid).toBe(true);
    });
  });
});
