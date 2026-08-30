import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-3df25961`;

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      detectSessionInUrl: !Capacitor.isNativePlatform(),
      experimental: { appendPkceFlowIdToRedirects: true },
    },
  },
);

// ── localStorage KV ───────────────────────────────────────────────────────────
// All app data is stored in localStorage under a single key per user.
// Supabase is used only for authentication.

const STORE_KEY = 'lifeos_data';

function loadStore(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}'); } catch { return {}; }
}

function saveStore(store: Record<string, any>): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function kvSet(key: string, value: unknown): void {
  const store = loadStore();
  store[key] = value;
  saveStore(store);
}

function kvGet(key: string): any {
  return loadStore()[key] ?? null;
}

function kvGetByPrefix(prefix: string): any[] {
  const store = loadStore();
  return Object.entries(store)
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v);
}

function kvDel(key: string): void {
  const store = loadStore();
  delete store[key];
  saveStore(store);
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  let session = (await supabase.auth.getSession()).data.session;
  if (!session) {
    const raw = localStorage.getItem('lifeos_session');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token && parsed?.refresh_token) {
          const { data } = await supabase.auth.setSession(parsed);
          session = data.session;
        }
      } catch { /* ignore */ }
    }
  }
  const id = session?.user?.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}

const now = () => new Date().toISOString();
const today = () => now().split('T')[0];
const uid = () => crypto.randomUUID();

// ── Route dispatcher ──────────────────────────────────────────────────────────

async function dispatch(method: string, path: string, body: any): Promise<any> {
  const userId = await requireUserId();
  const segs = path.replace(/^\//, '').split('/');
  const [entity, id, action] = segs;

  // ── tasks ──────────────────────────────────────────────────────────────────
  if (entity === 'tasks') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`tasks:${userId}:`);
      if (method === 'POST') {
        const taskId = uid();
        const task = { id: taskId, userId, ...body, createdAt: now(), completions: [] };
        kvSet(`tasks:${userId}:${taskId}`, task);
        return task;
      }
    } else if (action === 'complete') {
      const t = kvGet(`tasks:${userId}:${id}`);
      if (!t) throw new Error('Task not found');
      const d = today();
      const updated = { ...t, completions: [...(t.completions ?? []).filter((c: any) => c.date !== d), { date: d, time: now(), status: 'completed' }] };
      kvSet(`tasks:${userId}:${id}`, updated);
      return updated;
    } else if (action === 'incomplete') {
      const t = kvGet(`tasks:${userId}:${id}`);
      if (!t) throw new Error('Task not found');
      const d = today();
      const updated = { ...t, completions: [...(t.completions ?? []).filter((c: any) => c.date !== d), { date: d, time: now(), status: 'incomplete', reason: body?.reason }] };
      kvSet(`tasks:${userId}:${id}`, updated);
      return updated;
    } else {
      if (method === 'PUT') {
        const t = kvGet(`tasks:${userId}:${id}`);
        if (!t) throw new Error('Task not found');
        const updated = { ...t, ...body, updatedAt: now() };
        kvSet(`tasks:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`tasks:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── habits ─────────────────────────────────────────────────────────────────
  if (entity === 'habits') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`habits:${userId}:`);
      if (method === 'POST') {
        const hid = uid();
        const h = { id: hid, userId, ...body, createdAt: now(), logs: [] };
        kvSet(`habits:${userId}:${hid}`, h);
        return h;
      }
    } else if (action === 'log') {
      const h = kvGet(`habits:${userId}:${id}`);
      if (!h) throw new Error('Habit not found');
      const logEntry = { date: body.date, completed: body.completed, status: body.status, time: now(), note: body.note };
      const updated = { ...h, logs: [...(h.logs ?? []).filter((l: any) => l.date !== body.date), logEntry] };
      kvSet(`habits:${userId}:${id}`, updated);
      return updated;
    } else {
      if (method === 'PUT') {
        const h = kvGet(`habits:${userId}:${id}`);
        if (!h) throw new Error('Habit not found');
        const updated = { ...h, ...body };
        kvSet(`habits:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`habits:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── habitCategories ────────────────────────────────────────────────────────
  if (entity === 'habitCategories') {
    if (!id) {
      if (method === 'GET') return kvGet(`habitCats:${userId}`) ?? [];
      if (method === 'POST') {
        const existing = kvGet(`habitCats:${userId}`) ?? [];
        const cid = uid();
        const cat = { id: cid, ...body };
        kvSet(`habitCats:${userId}`, [...existing, cat]);
        return cat;
      }
    } else {
      if (method === 'PUT') {
        const existing = kvGet(`habitCats:${userId}`) ?? [];
        const updated = existing.map((c: any) => c.id === id ? { ...c, ...body } : c);
        kvSet(`habitCats:${userId}`, updated);
        return updated.find((c: any) => c.id === id);
      }
      if (method === 'DELETE') {
        const existing = kvGet(`habitCats:${userId}`) ?? [];
        kvSet(`habitCats:${userId}`, existing.filter((c: any) => c.id !== id));
        return { success: true };
      }
    }
  }

  // ── dhikr ──────────────────────────────────────────────────────────────────
  if (entity === 'dhikr') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`dhikr:${userId}:`);
      if (method === 'POST') {
        const did = uid();
        const item = { id: did, userId, ...body, count: 0, history: [], createdAt: now() };
        kvSet(`dhikr:${userId}:${did}`, item);
        return item;
      }
    } else if (action === 'increment' || action === 'decrement' || action === 'reset') {
      const item = kvGet(`dhikr:${userId}:${id}`);
      if (!item) throw new Error('Dhikr not found');
      const d = today();
      const history = item.history ?? [];
      const entry = history.find((h: any) => h.date === d) ?? { date: d, count: 0 };
      let count = item.count ?? 0;
      let entryCount = entry.count;
      if (action === 'increment') { count++; entryCount++; }
      else if (action === 'decrement') { count = Math.max(0, count - 1); entryCount = Math.max(0, entryCount - 1); }
      else { count = 0; }
      const updated = { ...item, count, history: [...history.filter((h: any) => h.date !== d), { ...entry, count: entryCount }] };
      kvSet(`dhikr:${userId}:${id}`, updated);
      return updated;
    } else {
      if (method === 'PUT') {
        const item = kvGet(`dhikr:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body };
        kvSet(`dhikr:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`dhikr:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── quran ──────────────────────────────────────────────────────────────────
  if (entity === 'quran') {
    if (method === 'GET' && !id) {
      return kvGet(`quran:${userId}`) ?? { sessions: [], lastPosition: null };
    }
    if (id === 'session' && method === 'POST') {
      const existing = kvGet(`quran:${userId}`) ?? { sessions: [] };
      const session = { id: uid(), ...body, date: now() };
      const updated = { ...existing, sessions: [...existing.sessions, session], lastPosition: body };
      kvSet(`quran:${userId}`, updated);
      return updated;
    }
  }

  // ── memorization ───────────────────────────────────────────────────────────
  if (entity === 'memorization') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`mem:${userId}:`);
      if (method === 'POST') {
        const mid = uid();
        const item = { id: mid, userId, ...body, createdAt: now() };
        kvSet(`mem:${userId}:${mid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`mem:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body, updatedAt: now() };
        kvSet(`mem:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`mem:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── lessons ────────────────────────────────────────────────────────────────
  if (entity === 'lessons') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`lessons:${userId}:`);
      if (method === 'POST') {
        const lid = uid();
        const item = { id: lid, userId, ...body, createdAt: now() };
        kvSet(`lessons:${userId}:${lid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`lessons:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body };
        kvSet(`lessons:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`lessons:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── workouts ───────────────────────────────────────────────────────────────
  if (entity === 'workouts') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`workouts:${userId}:`);
      if (method === 'POST') {
        const wid = uid();
        const item = { id: wid, userId, ...body, createdAt: now() };
        kvSet(`workouts:${userId}:${wid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`workouts:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body };
        kvSet(`workouts:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`workouts:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── weight ─────────────────────────────────────────────────────────────────
  if (entity === 'weight') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`weight:${userId}:`);
      if (method === 'POST') {
        const date = body?.date ?? today();
        const item = { userId, ...body, date };
        kvSet(`weight:${userId}:${date}`, item);
        return item;
      }
    }
  }

  // ── languages ──────────────────────────────────────────────────────────────
  if (entity === 'languages') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`lang:${userId}:`);
      if (method === 'POST') {
        const lid = uid();
        const item = { id: lid, userId, ...body, vocab: [], grammar: [], conversation: [], createdAt: now() };
        kvSet(`lang:${userId}:${lid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`lang:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body };
        kvSet(`lang:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`lang:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── skills ─────────────────────────────────────────────────────────────────
  if (entity === 'skills') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`skills:${userId}:`);
      if (method === 'POST') {
        const sid = uid();
        const item = { id: sid, userId, ...body, hoursLog: [], createdAt: now() };
        kvSet(`skills:${userId}:${sid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`skills:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body };
        kvSet(`skills:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`skills:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── subjects ───────────────────────────────────────────────────────────────
  if (entity === 'subjects') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`subjects:${userId}:`);
      if (method === 'POST') {
        const sid = uid();
        const item = { id: sid, userId, ...body, lessons: [], exams: [], studySessions: [], createdAt: now() };
        kvSet(`subjects:${userId}:${sid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`subjects:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body };
        kvSet(`subjects:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`subjects:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── goals ──────────────────────────────────────────────────────────────────
  if (entity === 'goals') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`goals:${userId}:`);
      if (method === 'POST') {
        const gid = uid();
        const item = { id: gid, userId, ...body, progress: 0, createdAt: now() };
        kvSet(`goals:${userId}:${gid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`goals:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body };
        kvSet(`goals:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`goals:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── events ─────────────────────────────────────────────────────────────────
  if (entity === 'events') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`events:${userId}:`);
      if (method === 'POST') {
        const eid = uid();
        const item = { id: eid, userId, ...body, createdAt: now() };
        kvSet(`events:${userId}:${eid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`events:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body };
        kvSet(`events:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`events:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── agreements ─────────────────────────────────────────────────────────────
  if (entity === 'agreements') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`agreements:${userId}:`);
      if (method === 'POST') {
        const aid = uid();
        const item = { id: aid, userId, ...body, status: body?.status ?? 'active', createdAt: now() };
        kvSet(`agreements:${userId}:${aid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`agreements:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body };
        kvSet(`agreements:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`agreements:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── journal ────────────────────────────────────────────────────────────────
  if (entity === 'journal') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`journal:${userId}:`);
      if (method === 'POST') {
        const date = body?.date ?? today();
        const entry = { userId, ...body, date, updatedAt: now() };
        kvSet(`journal:${userId}:${date}`, entry);
        return entry;
      }
    } else {
      if (method === 'GET') return kvGet(`journal:${userId}:${id}`) ?? null;
    }
  }

  // ── future ─────────────────────────────────────────────────────────────────
  if (entity === 'future') {
    if (method === 'GET') return kvGet(`future:${userId}`) ?? { oneYear: '', fiveYears: '', tenYears: '', notes: '' };
    if (method === 'PUT') {
      const data = { userId, ...body, updatedAt: now() };
      kvSet(`future:${userId}`, data);
      return data;
    }
  }

  // ── documents ──────────────────────────────────────────────────────────────
  if (entity === 'documents') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`docs:${userId}:`);
    } else if (id !== 'url') {
      if (method === 'DELETE') {
        kvDel(`docs:${userId}:${id}`);
        return { success: true };
      }
      if (method === 'GET') {
        const doc = kvGet(`docs:${userId}:${id}`);
        if (!doc) throw new Error('Document not found');
        return { url: doc.url };
      }
    }
  }

  // ── finance: transactions ──────────────────────────────────────────────────
  if (entity === 'transactions') {
    if (!id) {
      if (method === 'GET') return kvGetByPrefix(`txn:${userId}:`);
      if (method === 'POST') {
        const tid = uid();
        const item = { id: tid, userId, ...body, createdAt: now() };
        kvSet(`txn:${userId}:${tid}`, item);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const item = kvGet(`txn:${userId}:${id}`);
        const updated = { ...(item ?? {}), ...body, updatedAt: now() };
        kvSet(`txn:${userId}:${id}`, updated);
        return updated;
      }
      if (method === 'DELETE') { kvDel(`txn:${userId}:${id}`); return { success: true }; }
    }
  }

  // ── finance: accounts ─────────────────────────────────────────────────────
  if (entity === 'accounts') {
    if (!id) {
      if (method === 'GET') return kvGet(`accounts:${userId}`) ?? [];
      if (method === 'POST') {
        const existing = kvGet(`accounts:${userId}`) ?? [];
        const aid = uid();
        const item = { id: aid, ...body };
        kvSet(`accounts:${userId}`, [...existing, item]);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const existing = kvGet(`accounts:${userId}`) ?? [];
        const updated = existing.map((a: any) => a.id === id ? { ...a, ...body } : a);
        kvSet(`accounts:${userId}`, updated);
        return updated.find((a: any) => a.id === id);
      }
      if (method === 'DELETE') {
        const existing = kvGet(`accounts:${userId}`) ?? [];
        kvSet(`accounts:${userId}`, existing.filter((a: any) => a.id !== id));
        return { success: true };
      }
    }
  }

  // ── finance: budgets ───────────────────────────────────────────────────────
  if (entity === 'budgets') {
    if (!id) {
      if (method === 'GET') return kvGet(`budgets:${userId}`) ?? [];
      if (method === 'POST') {
        const existing = kvGet(`budgets:${userId}`) ?? [];
        const bid = uid();
        const item = { id: bid, ...body };
        kvSet(`budgets:${userId}`, [...existing, item]);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const existing = kvGet(`budgets:${userId}`) ?? [];
        const updated = existing.map((b: any) => b.id === id ? { ...b, ...body } : b);
        kvSet(`budgets:${userId}`, updated);
        return updated.find((b: any) => b.id === id);
      }
      if (method === 'DELETE') {
        const existing = kvGet(`budgets:${userId}`) ?? [];
        kvSet(`budgets:${userId}`, existing.filter((b: any) => b.id !== id));
        return { success: true };
      }
    }
  }

  // ── finance: savings goals ─────────────────────────────────────────────────
  if (entity === 'savingsGoals') {
    if (!id) {
      if (method === 'GET') return kvGet(`savingsGoals:${userId}`) ?? [];
      if (method === 'POST') {
        const existing = kvGet(`savingsGoals:${userId}`) ?? [];
        const sgid = uid();
        const item = { id: sgid, ...body, saved: body.saved ?? 0, createdAt: now() };
        kvSet(`savingsGoals:${userId}`, [...existing, item]);
        return item;
      }
    } else {
      if (method === 'PUT') {
        const existing = kvGet(`savingsGoals:${userId}`) ?? [];
        const updated = existing.map((g: any) => g.id === id ? { ...g, ...body } : g);
        kvSet(`savingsGoals:${userId}`, updated);
        return updated.find((g: any) => g.id === id);
      }
      if (method === 'DELETE') {
        const existing = kvGet(`savingsGoals:${userId}`) ?? [];
        kvSet(`savingsGoals:${userId}`, existing.filter((g: any) => g.id !== id));
        return { success: true };
      }
    }
  }

  // ── finance: settings ─────────────────────────────────────────────────────
  if (entity === 'financeSettings') {
    if (method === 'GET') return kvGet(`financeSettings:${userId}`) ?? { baseCurrency: 'USD', rates: {} };
    if (method === 'PUT') {
      const current = kvGet(`financeSettings:${userId}`) ?? { baseCurrency: 'USD', rates: {} };
      const updated = { ...current, ...body };
      kvSet(`financeSettings:${userId}`, updated);
      return updated;
    }
  }

  // ── analytics ──────────────────────────────────────────────────────────────
  if (entity === 'analytics' && method === 'GET') {
    const tasks = kvGetByPrefix(`tasks:${userId}:`);
    const habits = kvGetByPrefix(`habits:${userId}:`);
    const workouts = kvGetByPrefix(`workouts:${userId}:`);
    const dhikrItems = kvGetByPrefix(`dhikr:${userId}:`);
    const quranData = kvGet(`quran:${userId}`);
    const d = today();
    return {
      tasks: { total: tasks.length, doneToday: tasks.filter((t: any) => t.completions?.some((c: any) => c.date === d && c.status === 'completed')).length },
      habits: { total: habits.length },
      workouts: { total: workouts.length },
      dhikr: { total: dhikrItems.reduce((s: number, x: any) => s + (x.count ?? 0), 0) },
      quran: {
        totalPages: (quranData?.sessions ?? []).reduce((s: number, x: any) => s + (x.pages ?? 0), 0),
        pagestoday: (quranData?.sessions ?? []).filter((x: any) => x.date?.startsWith(d)).reduce((s: number, x: any) => s + (x.pages ?? 0), 0),
      },
    };
  }

  throw new Error(`Unhandled: ${method} /${entity}`);
}

// ── Public surface ─────────────────────────────────────────────────────────────

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  let body: any;
  if (options.body) {
    try { body = JSON.parse(options.body as string); } catch { body = options.body; }
  }
  try {
    return await dispatch(method, path, body) as T;
  } catch (err: any) {
    console.error(`[api] ${method} ${path} →`, err?.message ?? err);
    throw err;
  }
}

export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  const userId = await requireUserId();
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No file provided');

  const category = (formData.get('category') as string | null) ?? 'عام';
  const name = (formData.get('name') as string | null) ?? file.name;

  // Store file as a data URL in localStorage
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const docId = uid();
  const doc = { id: docId, userId, name, category, fileType: file.type, fileSize: file.size, url: dataUrl, createdAt: now() };
  kvSet(`docs:${userId}:${docId}`, doc);
  return doc as T;
}
