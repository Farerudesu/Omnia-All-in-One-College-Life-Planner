# Omnia — All-in-One College Life Planner

Omnia adalah aplikasi perencana kehidupan kuliah terpadu (all-in-one college life planner) yang dirancang khusus untuk mahasiswa. Mengintegrasikan jadwal kelas mingguan, pelacakan tugas kuliah, kalender akademik interaktif, pencatatan keuangan kampus (termasuk multi-item scanner struk), dan asisten AI cerdas **Ask Omni**.

---

## 🚀 Fitur Utama

- **Jadwal Kuliah (Schedule)**: Tampilan grid mingguan interaktif untuk kelas dan acara kampus. Mendukung sesi kelas berulang, pengecualian jadwal (libur/pindah ruangan/jadwal pengganti), drag-and-drop, dan ekspor/impor jadwal.
- **Tugas Kuliah (Assignments / Tasks)**: Manajemen daftar tugas dan pekerjaan rumah yang terhubung langsung dengan mata kuliah, batas waktu pengumpulan (deadline), tingkat prioritas, dan filter status pengerjaan.
- **Kalender Terpadu (Calendar)**: Kalender bulanan dan harian yang menggabungkan seluruh jadwal kelas, tugas, ujian, dan acara personal ke dalam satu garis waktu komprehensif, dengan opsi sinkronisasi Google Calendar.
- **Keuangan Kampus (Finance)**: Catatan arus kas uang saku, pengeluaran kategori mahasiswa (makanan, buku/alat tulis, kos, transportasi, hiburan), ringkasan visual donut chart, dan multi-item receipt popups.
- **Ask Omni (AI College Assistant)**: Asisten cerdas berbasis natural language processing (NLP & multimodal LLM) untuk menjadwalkan kelas, menambahkan tugas, dan mencatat pengeluaran secara instan lewat obrolan teks atau foto struk belanja dengan dialog konfirmasi aman.
- **Internasionalisasi (i18n)**: Dukungan penuh dua bahasa: Bahasa Indonesia dan English.
- **Mode Tampilan**: Mode Gelap (Dark Mode) dan Mode Terang (Light Mode) dengan tipografi modern dan palet ramah mata.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Auth, Edge Functions, Storage)
- **Mobile Runtime**: Capacitor (Android native shell)
- **Linter & Test**: Oxlint, Vitest

---

## 📂 Struktur Folder Proyek

```
src/
├── app/                  # Application root, routing, dan providers
├── components/           # Komponen UI bersama (Modal, EmptyState, dll)
├── features/             # Modul domain terisolasi (< 400 baris per file)
│   ├── assignments/      # Manajemen tugas kuliah (komponen & service)
│   ├── calendar/         # Tampilan kalender & integrasi Google Calendar
│   ├── finance/          # Manajemen keuangan & analitik pengeluaran
│   ├── schedule/         # Grid jadwal kuliah & dialog pengelolaan kelas
│   ├── ask-omni/         # Chat AI, proposal parser, dan validator
│   └── settings/         # Pengaturan akun, preferensi, dan profil
├── lib/                  # Utilitas inti (Supabase client, AuthContext, i18n, tanggal)
├── styles/               # Stylesheets modular (tokens, layout, components, pages)
└── types/                # TypeScript interface dan type definitions
```

---

## ⚙️ Persyaratan Sistem

- Node.js >= 20.x
- npm >= 10.x

---

## 📦 Panduan Instalasi dan Menjalankan Lokal

1. **Clone repositori**:
   ```bash
   git clone <repo-url>
   cd Omnia
   ```

2. **Pasang dependensi**:
   ```bash
   npm ci
   ```

3. **Konfigurasi Environment**:
   Salin `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Isi variabel di file `.env`:
   ```env
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Aplikasi akan terbuka secara lokal pada `http://localhost:5173`.

---

## 🗄️ Setup Supabase

1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Terapkan database migrations yang berada di folder `supabase/migrations/` ke proyek Anda.
3. Ambil `Project URL` dan `anon / public key` dari menu **Project Settings → API**.
4. Masukkan kedua nilai tersebut ke dalam file `.env` di komputer lokal Anda.
5. Untuk fitur pemulihan kata sandi (password recovery), tambahkan URL `http://localhost:5173/reset-password` ke daftar URL Auth Redirect di pengaturan Supabase Authentication.

---

## 🧪 Skrip Pengujian dan Build

- **Type Check**: `npx tsc -b`
- **Linting**: `npm run lint`
- **Unit Test**: `npm test`
- **Production Build**: `npm run build`
- **Preview Build**: `npm run preview`

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi [MIT](LICENSE).
