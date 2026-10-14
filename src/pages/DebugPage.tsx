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
} from 'lucide-react';
import { testAskOmniRaw, type RawApiResult } from '../lib/askOmni';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase.js';

interface PresetItem {
  id: string;
  name: string;
  desc: string;
  message: string;
  includeSchedule?: boolean;
  debugFlag?: boolean;
}

const PRESETS: PresetItem[] = [
  {
    id: 'chat',
    name: '💬 Chat Santai',
    desc: 'Uji percakapan ramah standar Omni',
    message: 'Halo Omni, apa kabar? Lagi ngapain?',
  },
  {
    id: 'discovery',
    name: '🔍 Model Discovery (debug: true)',
    desc: 'Cek daftar model aktif Gemini & Groq langsung dari cloud',
    message: 'ping',
    debugFlag: true,
  },
  {
    id: 'expense',
    name: '💰 Catat Pengeluaran (Expense Tool)',
    desc: 'Uji parser tool pengeluaran & metode bayar QRIS',
    message: 'Catat pengeluaran makan siang ayam geprek 25rb bayar via qris',
  },
  {
    id: 'task',
    name: '📝 Buat Tugas (Task Tool)',
    desc: 'Uji parser tool penugasan kuliah & deadline',
    message: 'Ingatkan tugas Laporan Fisika Dasar deadline besok jam 23:59 prioritas tinggi',
  },
  {
    id: 'schedule',
    name: '📅 Cek Jadwal Kuliah',
    desc: 'Uji query jadwal dengan scheduleContext mock',
    message: 'Ada kelas apa saja saya hari ini?',
    includeSchedule: true,
  },
  {
    id: 'receipt',
    name: '🧾 Struk Belanja (Receipt Tool)',
    desc: 'Uji multi-item receipt parser dari teks struk',
    message: 'Masukkan struk belanja ini: Indomaret, Air Mineral 4.000, Roti Cokelat 8.500, Kopi Kaleng 9.500, total Rp22.000 tunai',
  },
];

export function DebugPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('Halo Omni, apa kabar?');
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://idrraytmjdbcgerdahkj.supabase.co';
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
    } catch (err: any) {
      setResult({
        endpoint: `${supabaseUrl}/functions/v1/ask-omni`,
        status: 0,
        statusText: 'Client Exception',
        durationMs: elapsedMs,
        requestHeaders: {},
        requestBody: {},
        responseHeaders: {},
        rawResponseText: '',
        parsedJson: null,
        error: err?.message || String(err),
      });
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const generateFullReport = () => {
    if (!result) return 'Belum ada hasil test untuk disalin.';

    const report = [
      '# OMNIA API & ENGINE DEBUG REPORT',
      `Waktu: ${new Date().toISOString()}`,
      `Supabase URL: ${supabaseUrl}`,
      `Anon Key Present: ${hasAnonKey ? 'YES' : 'NO'}`,
      `User Session Present: ${sessionTokenPresent ? 'YES' : 'NO'}`,
      `User ID: ${user?.id || 'anonymous'}`,
      '',
      '## 1. HTTP REQUEST',
      `- Endpoint: ${result.endpoint}`,
      `- Request Duration: ${result.durationMs}ms`,
      '```json',
      JSON.stringify(result.requestBody, null, 2),
      '```',
      '',
      '## 2. HTTP RESPONSE',
      `- Status: ${result.status} ${result.statusText}`,
      `- Error: ${result.error || 'none'}`,
      '```json',
      result.rawResponseText || JSON.stringify(result.parsedJson, null, 2) || '{}',
      '```',
      '',
      '## 3. DIAGNOSTICS & PROVIDERS',
      result.parsedJson?.diagnostics ? JSON.stringify(result.parsedJson.diagnostics, null, 2) : 'No diagnostics object',
    ].join('\n');

    return report;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ─── Top Bar / Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Bug className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Omnia API Debug Console
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Live Diagnostics
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Inspeksi menyeluruh request, response, provider fallback, dan raw API messages Ask-Omni Edge Function.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/ask-omni"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Chat Omni
            </Link>
            <Link
              to="/schedule"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </Link>
          </div>
        </div>

        {/* ─── System & Auth Health Overview ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Supabase Endpoint</div>
              <div className="text-xs font-mono text-slate-200 truncate" title={supabaseUrl}>
                {supabaseUrl.replace(/^https?:\/\//, '')}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Configured" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Client Anon Key</div>
              <div className="text-xs font-mono text-slate-200">
                {hasAnonKey ? 'Loaded (VITE_SUPABASE_ANON_KEY)' : 'Missing (.env)'}
              </div>
            </div>
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${hasAnonKey ? 'bg-emerald-400' : 'bg-red-500'}`}
              title={hasAnonKey ? 'Key Present' : 'Key Missing'}
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Auth Session</div>
              <div className="text-xs font-mono text-slate-200 truncate">
                {user ? `Logged in: ${user.email || user.id.slice(0, 8)}` : 'Anonymous / Guest'}
              </div>
            </div>
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${user ? 'bg-emerald-400' : 'bg-amber-400'}`}
              title={user ? 'Authenticated user' : 'Anonymous/Guest'}
            />
          </div>
        </div>

        {/* ─── Interactive Test Form ─── */}
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Kirim Test Request ke Edge Function
            </span>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setRawJsonMode(!rawJsonMode)}
                className="text-slate-400 hover:text-white underline decoration-slate-600 transition-colors"
              >
                {rawJsonMode ? 'Mode Textarea Biasa' : 'Mode Raw JSON Payload'}
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <div className="text-xs text-slate-400 font-medium">Pilih Preset Cepat:</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-xs text-slate-200 transition-all text-left flex items-center gap-1.5 active:scale-95"
                  title={preset.desc}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          {rawJsonMode ? (
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">Custom JSON Request Body:</label>
              <textarea
                value={customJsonInput || JSON.stringify({ message, debug: includeDebugFlag }, null, 2)}
                onChange={(e) => setCustomJsonInput(e.target.value)}
                rows={6}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder='{"message": "Halo", "debug": true}'
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Pesan / Prompt Uji:</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Ketik pesan untuk diuji..."
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeSchedule}
                    onChange={(e) => setIncludeSchedule(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Sertakan Mock Jadwal Kuliah (scheduleContext)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeDebugFlag}
                    onChange={(e) => setIncludeDebugFlag(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Flag Discovery (`debug: true`)</span>
                </label>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              {loading && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Mengirim request... ({elapsedMs}ms)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || (!rawJsonMode && !message.trim())}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? 'Menunggu Jawaban...' : 'Eksekusi Request'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Result Section ─── */}
        {result && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Status Summary Banner */}
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              result.status === 200 && !result.parsedJson?.error
                ? 'bg-emerald-950/30 border-emerald-800/60'
                : 'bg-red-950/30 border-red-800/60'
            }`}>
              <div className="flex items-start md:items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  result.status === 200 && !result.parsedJson?.error
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {result.status === 200 && !result.parsedJson?.error ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-white">
                      HTTP {result.status} {result.statusText}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {result.durationMs}ms
                    </span>
                    {result.parsedJson?.diagnostics?.providerUsed && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-blue-950 text-blue-300 border border-blue-800">
                        Provider: {result.parsedJson.diagnostics.providerUsed}
                      </span>
                    )}
                    {result.parsedJson?.diagnostics?.modelUsed && (
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-950 text-purple-300 border border-purple-800">
                        Model: {result.parsedJson.diagnostics.modelUsed}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {result.error
                      ? `Error: ${result.error}`
                      : result.parsedJson?.error
                      ? `Provider Error: ${result.parsedJson.error}`
                      : 'Request sukses diterima dan diproses Edge Function.'}
                  </div>
                </div>
              </div>

              {/* Copy Full Report Button */}
              <button
                type="button"
                onClick={() => handleCopy(generateFullReport(), 'report')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors shrink-0"
              >
                {copiedKey === 'report' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'report' ? 'Laporan Tersalin!' : 'Salin Laporan Debug Lengkap'}
              </button>
            </div>

            {/* Omni Reply Display */}
            {result.parsedJson?.reply && (
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Jawaban Omni (Rendered):
                </div>
                <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  {result.parsedJson.reply}
                </div>
              </div>
            )}

            {/* Proposed Action Card (if any tool call was triggered) */}
            {(result.parsedJson?.proposedAction || result.parsedJson?.proposedActions) && (
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-amber-800/50 space-y-3">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Tool Action Terdeteksi:
                </div>

                {result.parsedJson.proposedAction && (
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Tipe Action</span>
                      <span className="font-semibold text-white uppercase">{result.parsedJson.proposedAction.type}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Judul / Title</span>
                      <span className="font-medium text-slate-200">{result.parsedJson.proposedAction.title}</span>
                    </div>
                    {result.parsedJson.proposedAction.amount !== undefined && (
                      <div>
                        <span className="text-slate-500 block">Nominal (Rp)</span>
                        <span className="font-semibold text-emerald-400">
                          Rp{result.parsedJson.proposedAction.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                    {result.parsedJson.proposedAction.category && (
                      <div>
                        <span className="text-slate-500 block">Kategori</span>
                        <span className="text-slate-200">{result.parsedJson.proposedAction.category}</span>
                      </div>
                    )}
                    {result.parsedJson.proposedAction.paymentMethod && (
                      <div>
                        <span className="text-slate-500 block">Metode Pembayaran</span>
                        <span className="text-blue-300 font-medium">{result.parsedJson.proposedAction.paymentMethod}</span>
                      </div>
                    )}
                    {result.parsedJson.proposedAction.date && (
                      <div>
                        <span className="text-slate-500 block">Tanggal</span>
                        <span className="text-slate-200">{result.parsedJson.proposedAction.date}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Multiple Actions (e.g. Receipt) */}
                {result.parsedJson.proposedActions && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-300 font-medium">
                      Item Struk ({result.parsedJson.proposedActions.length} item)
                      {result.parsedJson.receiptTotal && ` • Total Rp${result.parsedJson.receiptTotal.toLocaleString('id-ID')}`}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.parsedJson.proposedActions.map((action, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-medium text-white">{action.title}</span>
                            <span className="text-slate-500 block text-[11px]">{action.category} • {action.paymentMethod || 'Cash'}</span>
                          </div>
                          <span className="font-semibold text-emerald-400">
                            Rp{action.amount?.toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Provider Attempt History Table */}
            {result.parsedJson?.diagnostics?.attempts && result.parsedJson.diagnostics.attempts.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Riwayat Percobaan Model (Attempt Log):
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="py-2 px-3 font-medium">Provider</th>
                        <th className="py-2 px-3 font-medium">Model</th>
                        <th className="py-2 px-3 font-medium">HTTP Status</th>
                        <th className="py-2 px-3 font-medium">Latency</th>
                        <th className="py-2 px-3 font-medium">Tools</th>
                        <th className="py-2 px-3 font-medium">Catatan / Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {result.parsedJson.diagnostics.attempts.map((attempt, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-semibold uppercase text-slate-200">{attempt.provider}</td>
                          <td className="py-2 px-3 font-mono text-purple-300">{attempt.model}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                              attempt.status === 200 ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                            }`}>
                              {attempt.status || 'Err'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400">{attempt.durationMs ? `${attempt.durationMs}ms` : '-'}</td>
                          <td className="py-2 px-3 text-slate-400">{attempt.withTools ? 'Ya' : 'Tidak'}</td>
                          <td className="py-2 px-3 text-slate-400 max-w-xs truncate" title={attempt.error || ''}>
                            {attempt.error ? <span className="text-red-400">{attempt.error}</span> : <span className="text-emerald-400">OK</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Model Discovery Output (if debug flag was sent) */}
            {result.parsedJson?.debug && (
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-blue-800/60 space-y-3">
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Model Cloud Aktif yang Ditemukan (Discovery Results):
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="font-semibold text-slate-200 flex items-center justify-between">
                      <span>Gemini Models ({((result.parsedJson.debug as any)?.geminiModels || []).length}):</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-slate-400 text-[11px]">
                      {((result.parsedJson.debug as any)?.geminiModels || []).map((m: string) => (
                        <div key={m} className="px-1.5 py-0.5 rounded bg-slate-800/60 text-emerald-300 truncate">
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="font-semibold text-slate-200 flex items-center justify-between">
                      <span>Groq Models ({((result.parsedJson.debug as any)?.groqModels || []).length}):</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-slate-400 text-[11px]">
                      {((result.parsedJson.debug as any)?.groqModels || []).map((m: string) => (
                        <div key={m} className="px-1.5 py-0.5 rounded bg-slate-800/60 text-purple-300 truncate">
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Raw HTTP Request Inspector ─── */}
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700 overflow-hidden">
              <div className="p-3.5 bg-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExpandReq(!expandReq)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  <Code className="w-4 h-4 text-slate-400" />
                  Raw HTTP Request Payload & Headers
                  {expandReq ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(result.requestBody, null, 2), 'req')}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900/60"
                >
                  {copiedKey === 'req' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Salin Body
                </button>
              </div>

              {expandReq && (
                <div className="p-4 space-y-3 bg-slate-900/90 text-xs font-mono border-t border-slate-800">
                  <div>
                    <span className="text-slate-500 block">POST Endpoint:</span>
                    <span className="text-slate-300 break-all">{result.endpoint}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Request Headers:</span>
                    <pre className="p-2.5 rounded bg-slate-950 text-slate-400 overflow-x-auto text-[11px]">
                      {JSON.stringify(result.requestHeaders, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Request Body JSON:</span>
                    <pre className="p-2.5 rounded bg-slate-950 text-emerald-300 overflow-x-auto text-[11px]">
                      {JSON.stringify(result.requestBody, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Raw HTTP Response Inspector ─── */}
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700 overflow-hidden space-y-0">
              <div className="p-3.5 bg-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Raw HTTP Response Body (Full & Unaltered)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandResHeaders(!expandResHeaders)}
                    className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900/60"
                  >
                    {expandResHeaders ? 'Sembunyikan Headers' : 'Lihat Response Headers'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(result.rawResponseText || JSON.stringify(result.parsedJson, null, 2), 'res')}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900/60"
                  >
                    {copiedKey === 'res' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Salin Response
                  </button>
                </div>
              </div>

              {expandResHeaders && (
                <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs font-mono">
                  <span className="text-slate-500 block mb-1">Response Headers:</span>
                  <pre className="p-2.5 rounded bg-slate-900 text-slate-400 overflow-x-auto text-[11px]">
                    {JSON.stringify(result.responseHeaders, null, 2)}
                  </pre>
                </div>
              )}

              <div className="p-4 bg-slate-950 border-t border-slate-800">
                <pre className="text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed select-all">
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

      </div>
    </div>
  );
}
