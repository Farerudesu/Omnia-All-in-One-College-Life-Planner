/* Hallmark · genre: modern-minimal · macrostructure: Workbench · theme: Terminal · nav: N1a · footer: Ft2 */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bug,
  Send,
  Terminal,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Database,
  Code,
  Sparkles,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Wallet,
  MessageSquare,
  Search,
  PlusCircle,
  Calendar,
  FileText,
  User,
} from 'lucide-react';
import { testAskOmniRaw, type RawApiResult } from '../lib/askOmni';
import { useAuth } from '../lib/AuthContext';
import { supabase, supabaseUrl } from '../lib/supabase';

interface PresetItem {
  id: string;
  name: string;
  desc: string;
  message: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  includeSchedule?: boolean;
  debugFlag?: boolean;
}

const PRESETS: PresetItem[] = [
  {
    id: 'chat',
    name: 'Chat Santai',
    desc: 'Uji respons percakapan ramah standar Omni',
    message: 'Halo Omni, apa kabar? Lagi ngapain?',
    icon: MessageSquare,
  },
  {
    id: 'discovery',
    name: 'Discovery Model',
    desc: 'Cek daftar model aktif Gemini & Groq langsung dari cloud',
    message: 'ping',
    icon: Search,
    debugFlag: true,
  },
  {
    id: 'expense',
    name: 'Catat Pengeluaran',
    desc: 'Uji parser tool pengeluaran & metode bayar QRIS',
    message: 'Catat pengeluaran makan siang ayam geprek 25rb bayar via qris',
    icon: Wallet,
  },
  {
    id: 'task',
    name: 'Buat Tugas',
    desc: 'Uji parser tool penugasan kuliah & deadline',
    message: 'Ingatkan tugas Laporan Fisika Dasar deadline besok jam 23:59 prioritas tinggi',
    icon: PlusCircle,
  },
  {
    id: 'schedule',
    name: 'Cek Jadwal Kuliah',
    desc: 'Uji query jadwal dengan mock scheduleContext',
    message: 'Ada kelas apa saja saya hari ini?',
    icon: Calendar,
    includeSchedule: true,
  },
  {
    id: 'receipt',
    name: 'Struk Belanja',
    desc: 'Uji multi-item receipt parser dari teks struk',
    message: 'Masukkan struk belanja ini: Indomaret, Air Mineral 4.000, Roti Cokelat 8.500, Kopi Kaleng 9.500, total Rp22.000 tunai',
    icon: FileText,
  },
];

export function DebugPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('Halo Omni, apa kabar? Lagi ngapain?');
  const [includeSchedule, setIncludeSchedule] = useState(false);
  const [includeDebugFlag, setIncludeDebugFlag] = useState(false);
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [customJsonInput, setCustomJsonInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<RawApiResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [expandReq, setExpandReq] = useState(false);
  const [expandResHeaders, setExpandResHeaders] = useState(false);

  // Environment checks
  const hasAnonKey = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const [sessionTokenPresent, setSessionTokenPresent] = useState<boolean | null>(null);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      setSessionTokenPresent(Boolean(data?.session?.access_token));
    }).catch(() => {
      setSessionTokenPresent(false);
    });
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyPreset = (preset: PresetItem) => {
    setMessage(preset.message);
    setIncludeSchedule(Boolean(preset.includeSchedule));
    setIncludeDebugFlag(Boolean(preset.debugFlag));
    if (rawJsonMode) {
      setRawJsonMode(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setResult(null);
    setElapsedMs(0);

    const timer = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);

    try {
      let payload: Record<string, unknown>;

      if (rawJsonMode && customJsonInput.trim()) {
        payload = JSON.parse(customJsonInput);
      } else {
        payload = {
          message: message.trim(),
        };

        if (includeDebugFlag) {
          payload.debug = true;
        }

        if (includeSchedule) {
          const today = new Date().toISOString().slice(0, 10);
          payload.scheduleContext = {
            currentDate: today,
            throughDate: today,
            timezone: 'Asia/Jakarta',
            dates: [{ date: today, weekday: 'Senin' }],
            items: [
              {
                date: today,
                weekday: 'Senin',
                kind: 'class',
                title: 'Struktur Data & Algoritma',
                startTime: '08:00',
                endTime: '09:40',
                location: 'Lab Komputer 3',
                note: 'Bawa laptop terisi VS Code',
              },
              {
                date: today,
                weekday: 'Senin',
                kind: 'class',
                title: 'Kalkulus Lanjut',
                startTime: '10:00',
                endTime: '11:40',
                location: 'Gedung A R.204',
                note: 'Kuis bab 3',
              },
            ],
            tasks: [
              {
                id: 'task-1',
                title: 'Tugas Kalkulus Lanjut Bab 3',
                dueDate: today,
                course: 'Kalkulus Lanjut',
                priority: 'high',
                status: 'pending',
              },
            ],
          };
        }
      }

      const res = await testAskOmniRaw(payload);
      setResult(res);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setResult({
        endpoint: `${supabaseUrl || ''}/functions/v1/ask-omni`,
        status: 0,
        statusText: 'Client Exception',
        durationMs: elapsedMs,
        requestHeaders: {},
        requestBody: {},
        responseHeaders: {},
        rawResponseText: '',
        parsedJson: null,
        error: errorMsg,
      });
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const generateFullReport = () => {
    if (!result) return 'Belum ada hasil test untuk disalin.';

    return [
      '# OMNIA ENGINE & API DEBUG REPORT',
      `Timestamp: ${new Date().toISOString()}`,
      `Supabase Endpoint: ${supabaseUrl || 'NOT SET'}`,
      `Anon Key: ${hasAnonKey ? 'LOADED' : 'MISSING'}`,
      `User Session: ${sessionTokenPresent ? 'ACTIVE' : 'ANONYMOUS'}`,
      `User ID: ${user?.id || 'anonymous'}`,
      '',
      '## 1. HTTP REQUEST METRICS',
      `- Endpoint: ${result.endpoint}`,
      `- Duration: ${result.durationMs}ms`,
      '```json',
      JSON.stringify(result.requestBody, null, 2),
      '```',
      '',
      '## 2. HTTP RESPONSE METRICS',
      `- Status: ${result.status} ${result.statusText}`,
      `- Provider: ${result.parsedJson?.diagnostics?.providerUsed || 'none'}`,
      `- Model: ${result.parsedJson?.diagnostics?.modelUsed || 'none'}`,
      `- Error: ${result.error || result.parsedJson?.error || 'none'}`,
      '```json',
      result.rawResponseText || JSON.stringify(result.parsedJson, null, 2) || '{}',
      '```',
      '',
      '## 3. ATTEMPTS WATERFALL',
      result.parsedJson?.diagnostics?.attempts
        ? JSON.stringify(result.parsedJson.diagnostics.attempts, null, 2)
        : 'No attempt logs',
    ].join('\n');
  };

  return (
    <div className="min-h-screen bg-[#0d1310] text-[#e3ebe6] font-sans antialiased overflow-x-clip selection:bg-[#1b4332] selection:text-white">
      {/* ─── Top Bar: Minimal Architectural Header ─── */}
      <header className="border-b border-[#1c2922] bg-[#090d0b]/90 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#15231b] border border-[#23382c] flex items-center justify-center text-[#4ade80] shrink-0">
              <Bug size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-white">Omnia Debug Workbench</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#15231b] text-[#4ade80] border border-[#23382c]">
                  v1.7.2 · Edge Live
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/ask-omni"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#23382c] bg-[#121a15] hover:bg-[#18241e] text-xs font-medium text-[#c0cfc6] transition-colors focus-visible:outline-2 focus-visible:outline-[#4ade80]"
            >
              <Sparkles size={13} className="text-[#4ade80]" />
              <span className="hidden sm:inline">Kembali ke</span> Chat Omni
            </Link>
            <Link
              to="/schedule"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#23382c] bg-[#121a15] hover:bg-[#18241e] text-xs font-medium text-[#c0cfc6] transition-colors focus-visible:outline-2 focus-visible:outline-[#4ade80]"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Aplikasi</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Workbench Body ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ─── Telemetry Bar: System & Connection Status ─── */}
        <section aria-label="Status Koneksi" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#101713] border border-[#1d2b23] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-[#15231b] text-[#4ade80] flex items-center justify-center shrink-0">
                <Database size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#7e9487]">Supabase Endpoint</div>
                <div className="text-xs font-mono text-white truncate" title={supabaseUrl || ''}>
                  {(supabaseUrl || 'NOT SET').replace(/^https?:\/\//, '')}
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#4ade80] shrink-0" title="Online" />
          </div>

          <div className="p-3 rounded-xl bg-[#101713] border border-[#1d2b23] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-[#15231b] text-[#4ade80] flex items-center justify-center shrink-0">
                <Cpu size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#7e9487]">Anon Key Protocol</div>
                <div className="text-xs font-mono text-white">
                  {hasAnonKey ? 'Verified (Client Auth)' : 'Missing (.env)'}
                </div>
              </div>
            </div>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${hasAnonKey ? 'bg-[#4ade80]' : 'bg-[#ef4444]'}`}
              title={hasAnonKey ? 'Configured' : 'Missing'}
            />
          </div>

          <div className="p-3 rounded-xl bg-[#101713] border border-[#1d2b23] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-[#15231b] text-[#4ade80] flex items-center justify-center shrink-0">
                <User size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#7e9487]">Auth Context</div>
                <div className="text-xs font-mono text-white truncate">
                  {user ? (user.email || user.id.slice(0, 8)) : 'Anonymous / Guest'}
                </div>
              </div>
            </div>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${user ? 'bg-[#4ade80]' : 'bg-[#eab308]'}`}
              title={user ? 'Authenticated user' : 'Guest mode'}
            />
          </div>
        </section>

        {/* ─── Two-Column Workstation Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ─── Left Column: Request Dispatcher (5 Cols) ─── */}
          <section className="lg:col-span-5 space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#101713] border border-[#1d2b23] space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-[#1d2b23] pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
                  <Terminal size={14} className="text-[#4ade80]" />
                  Dispatcher Pengujian
                </div>
                <button
                  type="button"
                  onClick={() => setRawJsonMode(!rawJsonMode)}
                  className="text-[11px] font-mono text-[#7e9487] hover:text-[#4ade80] transition-colors cursor-pointer"
                >
                  {rawJsonMode ? '← Mode Prompt' : 'Mode Raw JSON →'}
                </button>
              </div>

              {/* Presets Grid */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#7e9487]">
                  Pilih Preset Skenario:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((preset) => {
                    const IconComponent = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="p-2.5 rounded-xl border border-[#1d2b23] bg-[#141d18] hover:bg-[#1a2720] hover:border-[#2b4034] text-left transition-all active:translate-y-[1px] focus-visible:outline-2 focus-visible:outline-[#4ade80] cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                          <span className="text-xs font-medium text-white group-hover:text-[#4ade80] transition-colors truncate">
                            {preset.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#7e9487] mt-1 line-clamp-1">
                          {preset.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Form */}
              {rawJsonMode ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#7e9487]">
                    Payload Request Mentah (JSON):
                  </label>
                  <textarea
                    value={customJsonInput || JSON.stringify({ message, debug: includeDebugFlag }, null, 2)}
                    onChange={(e) => setCustomJsonInput(e.target.value)}
                    rows={7}
                    className="w-full rounded-xl bg-[#090d0b] border border-[#1d2b23] p-3 text-xs font-mono text-[#c0cfc6] focus:outline-none focus:border-[#4ade80] transition-colors leading-relaxed"
                    placeholder='{"message": "Halo Omni"}'
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-[#7e9487]">
                      Prompt Pesan Uji:
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl bg-[#090d0b] border border-[#1d2b23] p-3 text-xs text-white placeholder:text-[#52645a] focus:outline-none focus:border-[#4ade80] transition-colors leading-relaxed resize-none"
                      placeholder="Ketik instruksi atau pertanyaan untuk Omni..."
                    />
                  </div>

                  {/* Context Toggles */}
                  <div className="space-y-2 pt-1 border-t border-[#1d2b23]/80">
                    <label className="flex items-center gap-2.5 text-xs text-[#a3b8ad] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeSchedule}
                        onChange={(e) => setIncludeSchedule(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#090d0b] border-[#2b4034] text-[#1b4332] accent-[#4ade80] focus:ring-0"
                      />
                      <span>Sertakan Mock Data Jadwal Kuliah</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-[#a3b8ad] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeDebugFlag}
                        onChange={(e) => setIncludeDebugFlag(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#090d0b] border-[#2b4034] text-[#1b4332] accent-[#4ade80] focus:ring-0"
                      />
                      <span>Flag Model Discovery (`debug: true`)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Execution Action */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="text-xs font-mono text-[#7e9487] tabular-nums">
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-[#4ade80]">
                      <RefreshCw size={12} className="animate-spin" />
                      Berjalan: {elapsedMs}ms
                    </span>
                  ) : (
                    <span>Siap kirim</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading || (!rawJsonMode && !message.trim())}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1b4332] hover:bg-[#235841] disabled:bg-[#16201b] disabled:text-[#52645a] disabled:cursor-not-allowed text-white font-medium text-xs tracking-tight transition-all active:translate-y-[1px] focus-visible:outline-2 focus-visible:outline-[#4ade80] cursor-pointer shadow-sm"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{loading ? 'Mengirim...' : 'Eksekusi Request'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* ─── Right Column: Telemetry & Inspector (7 Cols) ─── */}
          <section className="lg:col-span-7 space-y-4">
            {!result ? (
              /* Standby State */
              <div className="p-8 rounded-2xl bg-[#101713] border border-[#1d2b23] text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#15231b] border border-[#23382c] flex items-center justify-center text-[#4ade80] mx-auto">
                  <Terminal size={22} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h2 className="text-sm font-semibold text-white">Konsol Siap Diuji</h2>
                  <p className="text-xs text-[#7e9487] leading-relaxed">
                    Pilih salah satu preset skenario di sebelah kiri atau ketik prompt Anda sendiri, lalu tekan{' '}
                    <span className="text-[#c0cfc6] font-medium">"Eksekusi Request"</span> untuk menginspeksi rincian
                    komunikasi Edge Function, latency, model fallback, dan payload mentah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleApplyPreset(PRESETS[0]);
                    setTimeout(handleSend, 100);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#23382c] bg-[#141d18] hover:bg-[#1a2720] text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  <Sparkles size={13} className="text-[#4ade80]" />
                  Jalankan Uji Coba Cepat (Chat Santai)
                </button>
              </div>
            ) : (
              /* Live Results Inspector */
              <div className="space-y-4">
                {/* Status Bar */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  result.status === 200 && !result.parsedJson?.error
                    ? 'bg-[#101c15] border-[#1d3d2a]'
                    : 'bg-[#1f1212] border-[#421d1d]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      result.status === 200 && !result.parsedJson?.error
                        ? 'bg-[#1b4332] text-[#4ade80]'
                        : 'bg-[#4a1818] text-[#ef4444]'
                    }`}>
                      {result.status === 200 && !result.parsedJson?.error ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          HTTP {result.status} {result.statusText}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono tabular-nums bg-[#141d18] text-[#a3b8ad] border border-[#23382c]">
                          {result.durationMs}ms
                        </span>
                        {result.parsedJson?.diagnostics?.providerUsed && (
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-[#141d18] text-[#4ade80] border border-[#23382c]">
                            {result.parsedJson.diagnostics.providerUsed}
                          </span>
                        )}
                        {result.parsedJson?.diagnostics?.modelUsed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141d18] text-[#c0cfc6] border border-[#23382c]">
                            {result.parsedJson.diagnostics.modelUsed}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#7e9487] mt-0.5">
                        {result.error
                          ? `Error: ${result.error}`
                          : result.parsedJson?.error
                          ? `Provider Error: ${result.parsedJson.error}`
                          : 'Respons berhasil diterima dari Supabase Edge Function.'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(generateFullReport(), 'report')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#23382c] bg-[#141d18] hover:bg-[#1a2720] text-xs font-medium text-white transition-colors shrink-0 cursor-pointer self-start sm:self-center"
                  >
                    {copiedKey === 'report' ? <Check size={13} className="text-[#4ade80]" /> : <Copy size={13} />}
                    {copiedKey === 'report' ? 'Tersalin' : 'Salin Laporan Lengkap'}
                  </button>
                </div>

                {/* Omni Rendered Output */}
                {result.parsedJson?.reply && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#101713] border border-[#1d2b23] space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#4ade80] flex items-center gap-1.5">
                      <Sparkles size={13} />
                      Jawaban Terstruktur Omni
                    </div>
                    <div className="text-xs sm:text-sm text-[#e3ebe6] whitespace-pre-wrap leading-relaxed bg-[#090d0b] p-3.5 rounded-xl border border-[#1d2b23]">
                      {result.parsedJson.reply}
                    </div>
                  </div>
                )}

                {/* Proposed Tool Proposal Card */}
                {(result.parsedJson?.proposedAction || result.parsedJson?.proposedActions) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#101713] border border-[#3b3117] space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#eab308] flex items-center gap-2">
                      <Wallet size={14} />
                      Tool Proposal Diterima
                    </div>

                    {result.parsedJson.proposedAction && (
                      <div className="p-3.5 rounded-xl bg-[#090d0b] border border-[#2b2413] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[#7e9487] block text-[10px] uppercase font-mono">Tipe Action</span>
                          <span className="font-semibold text-white uppercase">{result.parsedJson.proposedAction.type}</span>
                        </div>
                        <div>
                          <span className="text-[#7e9487] block text-[10px] uppercase font-mono">Judul</span>
                          <span className="font-medium text-white">{result.parsedJson.proposedAction.title}</span>
                        </div>
                        {result.parsedJson.proposedAction.amount !== undefined && (
                          <div>
                            <span className="text-[#7e9487] block text-[10px] uppercase font-mono">Nominal</span>
                            <span className="font-semibold text-[#4ade80] font-mono tabular-nums">
                              Rp{result.parsedJson.proposedAction.amount.toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                        {result.parsedJson.proposedAction.category && (
                          <div>
                            <span className="text-[#7e9487] block text-[10px] uppercase font-mono">Kategori</span>
                            <span className="text-white">{result.parsedJson.proposedAction.category}</span>
                          </div>
                        )}
                        {result.parsedJson.proposedAction.paymentMethod && (
                          <div>
                            <span className="text-[#7e9487] block text-[10px] uppercase font-mono">Metode Bayar</span>
                            <span className="text-[#93c5fd] font-medium">{result.parsedJson.proposedAction.paymentMethod}</span>
                          </div>
                        )}
                        {result.parsedJson.proposedAction.date && (
                          <div>
                            <span className="text-[#7e9487] block text-[10px] uppercase font-mono">Tanggal</span>
                            <span className="font-mono text-white">{result.parsedJson.proposedAction.date}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Multi-item actions (receipt) */}
                    {result.parsedJson.proposedActions && (
                      <div className="space-y-2">
                        <div className="text-xs text-white font-medium flex items-center justify-between">
                          <span>Item Rincian Struk ({result.parsedJson.proposedActions.length} item)</span>
                          {result.parsedJson.receiptTotal && (
                            <span className="font-mono tabular-nums text-[#4ade80]">
                              Total: Rp{result.parsedJson.receiptTotal.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {result.parsedJson.proposedActions.map((action, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-[#090d0b] border border-[#23382c] text-xs flex justify-between items-center">
                              <div>
                                <span className="font-medium text-white">{action.title}</span>
                                <span className="text-[#7e9487] block text-[10px]">{action.category} • {action.paymentMethod || 'Cash'}</span>
                              </div>
                              <span className="font-semibold text-[#4ade80] font-mono tabular-nums">
                                Rp{action.amount?.toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Attempt Waterfall Table */}
                {result.parsedJson?.diagnostics?.attempts && result.parsedJson.diagnostics.attempts.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#101713] border border-[#1d2b23] space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#7e9487] flex items-center gap-2">
                      <Clock size={13} className="text-[#4ade80]" />
                      Waterfall Percobaan Model (Attempt Log)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#1d2b23] text-[#7e9487] font-mono text-[11px]">
                            <th className="py-2 px-2.5 font-medium">Provider</th>
                            <th className="py-2 px-2.5 font-medium">Model</th>
                            <th className="py-2 px-2.5 font-medium">Status</th>
                            <th className="py-2 px-2.5 font-medium">Latency</th>
                            <th className="py-2 px-2.5 font-medium">Tools</th>
                            <th className="py-2 px-2.5 font-medium">Catatan / Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#17221b] text-[#c0cfc6] font-mono text-xs">
                          {result.parsedJson.diagnostics.attempts.map((attempt, idx) => (
                            <tr key={idx} className="hover:bg-[#141d18]">
                              <td className="py-2 px-2.5 uppercase font-semibold text-white">{attempt.provider}</td>
                              <td className="py-2 px-2.5 text-[#93c5fd]">{attempt.model}</td>
                              <td className="py-2 px-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                                  attempt.status === 200 ? 'bg-[#152e20] text-[#4ade80]' : 'bg-[#3b1818] text-[#f87171]'
                                }`}>
                                  {attempt.status || 'Err'}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 tabular-nums text-[#7e9487]">{attempt.durationMs ? `${attempt.durationMs}ms` : '-'}</td>
                              <td className="py-2 px-2.5 text-[#7e9487]">{attempt.withTools ? 'Ya' : 'Tidak'}</td>
                              <td className="py-2 px-2.5 max-w-xs truncate text-[11px]" title={attempt.error || ''}>
                                {attempt.error ? <span className="text-[#f87171]">{attempt.error}</span> : <span className="text-[#4ade80]">OK</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Cloud Model Discovery Output */}
                {result.parsedJson?.debug && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#101713] border border-[#1d2b23] space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#4ade80] flex items-center gap-2">
                      <Cpu size={14} />
                      Model Cloud Aktif Terverifikasi
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#090d0b] border border-[#1d2b23] space-y-1.5">
                        <div className="text-[11px] font-mono font-semibold text-white">
                          Gemini ({((result.parsedJson.debug as any)?.geminiModels || []).length} model)
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[10px] text-[#7e9487]">
                          {((result.parsedJson.debug as any)?.geminiModels || []).map((m: string) => (
                            <div key={m} className="px-2 py-0.5 rounded bg-[#101713] text-[#4ade80] truncate">
                              {m}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#090d0b] border border-[#1d2b23] space-y-1.5">
                        <div className="text-[11px] font-mono font-semibold text-white">
                          Groq ({((result.parsedJson.debug as any)?.groqModels || []).length} model)
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[10px] text-[#7e9487]">
                          {((result.parsedJson.debug as any)?.groqModels || []).map((m: string) => (
                            <div key={m} className="px-2 py-0.5 rounded bg-[#101713] text-[#93c5fd] truncate">
                              {m}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw HTTP Request Drawer */}
                <div className="rounded-2xl bg-[#101713] border border-[#1d2b23] overflow-hidden">
                  <div className="p-3 bg-[#141d18] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setExpandReq(!expandReq)}
                      className="flex items-center gap-2 text-xs font-semibold text-[#c0cfc6] hover:text-white cursor-pointer"
                    >
                      <Code size={14} className="text-[#4ade80]" />
                      <span>HTTP Request Payload &amp; Headers</span>
                      {expandReq ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(result.requestBody, null, 2), 'req')}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#7e9487] hover:text-white px-2 py-0.5 rounded bg-[#090d0b] border border-[#23382c] cursor-pointer"
                    >
                      {copiedKey === 'req' ? <Check size={11} className="text-[#4ade80]" /> : <Copy size={11} />}
                      Salin Body
                    </button>
                  </div>

                  {expandReq && (
                    <div className="p-4 space-y-3 bg-[#090d0b] text-xs font-mono border-t border-[#1d2b23]">
                      <div>
                        <span className="text-[#7e9487] block text-[10px] uppercase">Endpoint Target:</span>
                        <span className="text-[#c0cfc6] break-all">{result.endpoint}</span>
                      </div>
                      <div>
                        <span className="text-[#7e9487] block text-[10px] uppercase mb-1">Request Headers:</span>
                        <pre className="p-2.5 rounded bg-[#040605] text-[#7e9487] overflow-x-auto text-[11px]">
                          {JSON.stringify(result.requestHeaders, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[#7e9487] block text-[10px] uppercase mb-1">Request Body JSON:</span>
                        <pre className="p-2.5 rounded bg-[#040605] text-[#4ade80] overflow-x-auto text-[11px]">
                          {JSON.stringify(result.requestBody, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Raw HTTP Response Drawer */}
                <div className="rounded-2xl bg-[#101713] border border-[#1d2b23] overflow-hidden">
                  <div className="p-3 bg-[#141d18] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#c0cfc6] flex items-center gap-2">
                      <Terminal size={14} className="text-[#4ade80]" />
                      HTTP Response Mentah (Full Unaltered)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandResHeaders(!expandResHeaders)}
                        className="text-[11px] font-mono text-[#7e9487] hover:text-white px-2 py-0.5 rounded bg-[#090d0b] border border-[#23382c] cursor-pointer"
                      >
                        {expandResHeaders ? 'Tutup Headers' : 'Lihat Headers'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.rawResponseText || JSON.stringify(result.parsedJson, null, 2), 'res')}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[#7e9487] hover:text-white px-2 py-0.5 rounded bg-[#090d0b] border border-[#23382c] cursor-pointer"
                      >
                        {copiedKey === 'res' ? <Check size={11} className="text-[#4ade80]" /> : <Copy size={11} />}
                        Salin JSON
                      </button>
                    </div>
                  </div>

                  {expandResHeaders && (
                    <div className="p-4 bg-[#090d0b] border-t border-[#1d2b23] text-xs font-mono">
                      <span className="text-[#7e9487] block text-[10px] uppercase mb-1">Response Headers:</span>
                      <pre className="p-2.5 rounded bg-[#040605] text-[#7e9487] overflow-x-auto text-[11px]">
                        {JSON.stringify(result.responseHeaders, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="p-4 bg-[#040605] border-t border-[#1d2b23]">
                    <pre className="text-xs font-mono text-[#c0cfc6] overflow-x-auto max-h-[420px] leading-relaxed select-all">
                      {result.rawResponseText
                        ? (function () {
                            try {
                              return JSON.stringify(JSON.parse(result.rawResponseText), null, 2);
                            } catch {
                              return result.rawResponseText;
                            }
                          })()
                        : JSON.stringify(result.parsedJson, null, 2)}
                    </pre>
                  </div>
                </div>

              </div>
            )}
          </section>

        </div>
      </main>

      {/* ─── Minimal Footnote ─── */}
      <footer className="border-t border-[#1c2922] py-4 mt-12 bg-[#090d0b] text-center text-xs font-mono text-[#7e9487]">
        Omnia Engine Diagnostics · Preserving Scholar Editorial System · No Slop
      </footer>
    </div>
  );
}
