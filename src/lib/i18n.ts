export type Language = 'en' | 'id';

export const translations = {
  en: {
    // Navigation
    nav: {
      schedule: 'Schedule',
      assignments: 'Tasks',
      calendar: 'Calendar',
      finance: 'Finance',
      askOmni: 'Omni',
      settings: 'Settings',
    },
    // Common
    common: {
      today: 'Today',
      week: 'Week',
      month: 'Month',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      all: 'All',
      search: 'Search...',
      confirm: 'Confirm',
    },
    // Finance
    finance: {
      title: 'Finance & Ledger',
      subtitle: 'Budget pacing, categorical expenses, and receipt intelligence',
      balance: 'Liquid Available Balance',
      inflow: 'Inflow',
      outflow: 'Outflow',
      budgetPacing: 'Budget Pacing',
      remaining: 'Remaining',
      dailyAllowance: 'Daily Allowance',
      addIncome: '+ Add income',
      addExpense: '+ Add expense',
      scanReceipt: 'Scan receipt via Omni',
      breakdown: 'Category Breakdown',
      allTransactions: 'All Transactions',
      searchTransactions: 'Search by merchant, category, notes...',
    },
    // Settings
    settings: {
      title: 'Settings & Preferences',
      subtitle: 'Manage interface themes, language, budget, and curriculum.',
      languageTitle: 'Language / Bahasa',
      languageDesc: 'Pilih bahasa tampilan antarmuka (English / Bahasa Indonesia).',
      themeTitle: 'Theme preference',
      themeDesc: 'Choose your interface brightness mode across all devices.',
      currencyTitle: 'Currency',
      currencyDesc: 'Choose the currency used for your budget and transactions.',
      budgetTitle: 'Monthly budget cap',
      budgetDesc: 'Target monthly spending ceiling.',
      termTitle: 'Term & reminders',
      termName: 'Term name',
      termStart: 'Start date',
      termEnd: 'End date',
      firstDay: 'Week starts on',
      reminders: 'Enable reminders',
      savePreferences: 'Save preferences',
      saved: 'Saved!',
      resetChanges: 'Reset changes',
    },
    // Proposal Validation
    proposalValidation: {
      titleRequired: 'Title or description is required.',
      invalidDateFormat: 'Date must be a valid date in YYYY-MM-DD format.',
      invalidStartTimeFormat: 'Start time must be in HH:mm format.',
      invalidEndTimeFormat: 'End time must be in HH:mm format.',
      endTimeBeforeStartTime: 'End time must be greater than or equal to start time.',
      invalidExpenseAmount: 'Expense amount must be a positive whole number.',
    },
  },
  id: {
    // Navigation
    nav: {
      schedule: 'Jadwal',
      assignments: 'Tugas',
      calendar: 'Kalender',
      finance: 'Keuangan',
      askOmni: 'Omni AI',
      settings: 'Pengaturan',
    },
    // Common
    common: {
      today: 'Hari Ini',
      week: 'Minggu',
      month: 'Bulan',
      save: 'Simpan',
      cancel: 'Batal',
      delete: 'Hapus',
      edit: 'Ubah',
      back: 'Kembali',
      all: 'Semua',
      search: 'Cari...',
      confirm: 'Konfirmasi',
    },
    // Finance
    finance: {
      title: 'Keuangan & Pembukuan',
      subtitle: 'Pelacakan anggaran, pengeluaran kategori, dan analisis struk',
      balance: 'Saldo Kas Tersedia',
      inflow: 'Pemasukan',
      outflow: 'Pengeluaran',
      budgetPacing: 'Penggunaan Anggaran',
      remaining: 'Sisa Anggaran',
      dailyAllowance: 'Batas Harian Aman',
      addIncome: '+ Tambah pemasukan',
      addExpense: '+ Tambah pengeluaran',
      scanReceipt: 'Pindai struk lewat Omni',
      breakdown: 'Rincian Kategori',
      allTransactions: 'Daftar Transaksi',
      searchTransactions: 'Cari tempat, kategori, atau catatan...',
    },
    // Settings
    settings: {
      title: 'Pengaturan & Preferensi',
      subtitle: 'Atur tema tampilan, bahasa, anggaran, dan sinkronisasi jadwal.',
      languageTitle: 'Bahasa Tampilan',
      languageDesc: 'Pilih bahasa antarmuka aplikasi Omnia.',
      themeTitle: 'Tema Tampilan',
      themeDesc: 'Pilih mode kecerahan antarmuka di perangkat Anda.',
      currencyTitle: 'Mata Uang',
      currencyDesc: 'Mata uang yang digunakan untuk anggaran dan pencatatan transaksi.',
      budgetTitle: 'Batas Anggaran Bulanan',
      budgetDesc: 'Target batas maksimal pengeluaran per bulan.',
      termTitle: 'Semester & Pengingat',
      termName: 'Nama Semester',
      termStart: 'Tanggal Mulai',
      termEnd: 'Tanggal Selesai',
      firstDay: 'Hari Pertama Mingguan',
      reminders: 'Aktifkan notifikasi pengingat',
      savePreferences: 'Simpan perubahan',
      saved: 'Tersimpan!',
      resetChanges: 'Kembalikan setelan',
    },
    // Proposal Validation
    proposalValidation: {
      titleRequired: 'Judul atau deskripsi wajib diisi.',
      invalidDateFormat: 'Tanggal harus berupa tanggal valid berformat YYYY-MM-DD.',
      invalidStartTimeFormat: 'Waktu mulai harus dalam format HH:mm.',
      invalidEndTimeFormat: 'Waktu selesai harus dalam format HH:mm.',
      endTimeBeforeStartTime: 'Waktu selesai harus lebih dari atau sama dengan waktu mulai.',
      invalidExpenseAmount: 'Nominal pengeluaran harus berupa bilangan bulat positif.',
    },
  },
} as const;

export function getLanguage(): Language {
  const stored = localStorage.getItem('omnia_language');
  if (stored === 'id' || stored === 'en') return stored;
  return 'id'; // default to Indonesian as requested
}

export function setLanguage(lang: Language): void {
  localStorage.setItem('omnia_language', lang);
  window.dispatchEvent(new CustomEvent('omnia-language-changed', { detail: lang }));
}
