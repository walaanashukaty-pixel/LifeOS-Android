import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();
app.use('*', logger(console.log));

// Broad CORS needed for Figma preview domains (*.makeproxy-c.figma.site, *.preview.figma.net)
// and any other origin that might call the function.
// The Supabase JS client always sends x-client-info and apikey on preflights —
// they must be listed here or the preflight fails before the route runs.
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["authorization", "x-client-info", "apikey", "content-type", "Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: false,
}));

// Explicit catch-all OPTIONS handler — ensures preflights for any path get a 204
// even if no route matches (Hono's cors middleware only runs for matched routes).
app.options("*", (c) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  return c.body(null, 204);
});

const PREFIX = "/make-server-3df25961";
const BUCKET = "make-3df25961-docs";

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

async function getUserId(c: any): Promise<string | null> {
  const auth = c.req.header('Authorization');
  const token = auth?.split(' ')[1];
  if (!token) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

function uid() {
  return crypto.randomUUID();
}

// Health
app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok" }));

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post(`${PREFIX}/auth/signup`, async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.admin.createUser({
      email, password,
      user_metadata: { name },
      email_confirm: true,
    });
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ user: data.user });
  } catch (e) {
    console.log('signup error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// ── STORAGE INIT ──────────────────────────────────────────────────────────────
async function ensureBucket() {
  const supabase = getSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) await supabase.storage.createBucket(BUCKET, { public: false });
}

// ── TASKS ─────────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/tasks`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`tasks:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/tasks`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const task = { id, userId, ...body, createdAt: new Date().toISOString(), completions: [] };
  await kv.set(`tasks:${userId}:${id}`, task);
  return c.json(task);
});

app.put(`${PREFIX}/tasks/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`tasks:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
  await kv.set(`tasks:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/tasks/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  await kv.del(`tasks:${userId}:${id}`);
  return c.json({ success: true });
});

app.post(`${PREFIX}/tasks/:id/complete`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const task = await kv.get(`tasks:${userId}:${id}`);
  if (!task) return c.json({ error: 'Not found' }, 404);
  const now = new Date().toISOString();
  const completions = task.completions || [];
  const today = now.split('T')[0];
  const updated = { ...task, completions: [...completions.filter((c: any) => c.date !== today), { date: today, time: now, status: 'completed' }] };
  await kv.set(`tasks:${userId}:${id}`, updated);
  return c.json(updated);
});

app.post(`${PREFIX}/tasks/:id/incomplete`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { reason } = await c.req.json();
  const task = await kv.get(`tasks:${userId}:${id}`);
  if (!task) return c.json({ error: 'Not found' }, 404);
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const completions = task.completions || [];
  const updated = { ...task, completions: [...completions.filter((c: any) => c.date !== today), { date: today, time: now, status: 'incomplete', reason }] };
  await kv.set(`tasks:${userId}:${id}`, updated);
  return c.json(updated);
});

// ── HABITS ────────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/habits`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`habits:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/habits`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const habit = { id, userId, ...body, createdAt: new Date().toISOString(), logs: [] };
  await kv.set(`habits:${userId}:${id}`, habit);
  return c.json(habit);
});

app.put(`${PREFIX}/habits/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`habits:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`habits:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/habits/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`habits:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

app.post(`${PREFIX}/habits/:id/log`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const { date, completed } = await c.req.json();
  const habit = await kv.get(`habits:${userId}:${id}`);
  if (!habit) return c.json({ error: 'Not found' }, 404);
  const logs = habit.logs || [];
  const updated = { ...habit, logs: [...logs.filter((l: any) => l.date !== date), { date, completed }] };
  await kv.set(`habits:${userId}:${id}`, updated);
  return c.json(updated);
});

// ── DHIKR ─────────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/dhikr`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`dhikr:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/dhikr`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, count: 0, history: [], createdAt: new Date().toISOString() };
  await kv.set(`dhikr:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/dhikr/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`dhikr:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`dhikr:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/dhikr/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`dhikr:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

app.post(`${PREFIX}/dhikr/:id/increment`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const item = await kv.get(`dhikr:${userId}:${id}`);
  if (!item) return c.json({ error: 'Not found' }, 404);
  const today = new Date().toISOString().split('T')[0];
  const history = item.history || [];
  const todayEntry = history.find((h: any) => h.date === today) || { date: today, count: 0 };
  const updated = {
    ...item, count: (item.count || 0) + 1,
    history: [...history.filter((h: any) => h.date !== today), { ...todayEntry, count: todayEntry.count + 1 }]
  };
  await kv.set(`dhikr:${userId}:${id}`, updated);
  return c.json(updated);
});

app.post(`${PREFIX}/dhikr/:id/decrement`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const item = await kv.get(`dhikr:${userId}:${id}`);
  if (!item) return c.json({ error: 'Not found' }, 404);
  const today = new Date().toISOString().split('T')[0];
  const history = item.history || [];
  const todayEntry = history.find((h: any) => h.date === today) || { date: today, count: 0 };
  const updated = {
    ...item, count: Math.max(0, (item.count || 0) - 1),
    history: [...history.filter((h: any) => h.date !== today), { ...todayEntry, count: Math.max(0, todayEntry.count - 1) }]
  };
  await kv.set(`dhikr:${userId}:${id}`, updated);
  return c.json(updated);
});

app.post(`${PREFIX}/dhikr/:id/reset`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const item = await kv.get(`dhikr:${userId}:${id}`);
  if (!item) return c.json({ error: 'Not found' }, 404);
  const updated = { ...item, count: 0 };
  await kv.set(`dhikr:${userId}:${id}`, updated);
  return c.json(updated);
});

// ── QURAN ─────────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/quran`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const data = await kv.get(`quran:${userId}`);
  return c.json(data || { sessions: [], lastPosition: null });
});

app.post(`${PREFIX}/quran/session`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const existing = await kv.get(`quran:${userId}`) || { sessions: [] };
  const session = { id: uid(), ...body, date: new Date().toISOString() };
  const updated = { ...existing, sessions: [...existing.sessions, session], lastPosition: body };
  await kv.set(`quran:${userId}`, updated);
  return c.json(updated);
});

// ── MEMORIZATION ──────────────────────────────────────────────────────────────
app.get(`${PREFIX}/memorization`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`mem:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/memorization`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, createdAt: new Date().toISOString() };
  await kv.set(`mem:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/memorization/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`mem:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
  await kv.set(`mem:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/memorization/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`mem:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

// ── LESSONS ───────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/lessons`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`lessons:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/lessons`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, createdAt: new Date().toISOString() };
  await kv.set(`lessons:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/lessons/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`lessons:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`lessons:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/lessons/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`lessons:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

// ── WORKOUTS ──────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/workouts`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`workouts:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/workouts`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, createdAt: new Date().toISOString() };
  await kv.set(`workouts:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/workouts/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`workouts:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`workouts:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/workouts/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`workouts:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

app.get(`${PREFIX}/weight`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`weight:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/weight`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const date = body.date || new Date().toISOString().split('T')[0];
  const item = { userId, ...body, date };
  await kv.set(`weight:${userId}:${date}`, item);
  return c.json(item);
});

// ── LANGUAGES ─────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/languages`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`lang:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/languages`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, vocab: [], grammar: [], conversation: [], createdAt: new Date().toISOString() };
  await kv.set(`lang:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/languages/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`lang:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`lang:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/languages/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`lang:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

// ── SKILLS ────────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/skills`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`skills:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/skills`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, hoursLog: [], createdAt: new Date().toISOString() };
  await kv.set(`skills:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/skills/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`skills:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`skills:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/skills/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`skills:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

// ── SUBJECTS (STUDY) ──────────────────────────────────────────────────────────
app.get(`${PREFIX}/subjects`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`subjects:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/subjects`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, lessons: [], exams: [], studySessions: [], createdAt: new Date().toISOString() };
  await kv.set(`subjects:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/subjects/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`subjects:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`subjects:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/subjects/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`subjects:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

// ── GOALS ─────────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/goals`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`goals:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/goals`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, progress: 0, createdAt: new Date().toISOString() };
  await kv.set(`goals:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/goals/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`goals:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`goals:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/goals/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`goals:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

// ── EVENTS ────────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/events`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`events:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/events`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, createdAt: new Date().toISOString() };
  await kv.set(`events:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/events/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`events:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`events:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/events/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`events:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

// ── AGREEMENTS ────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/agreements`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`agreements:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/agreements`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const id = uid();
  const item = { id, userId, ...body, status: 'active', createdAt: new Date().toISOString() };
  await kv.set(`agreements:${userId}:${id}`, item);
  return c.json(item);
});

app.put(`${PREFIX}/agreements/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await kv.get(`agreements:${userId}:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`agreements:${userId}:${id}`, updated);
  return c.json(updated);
});

app.delete(`${PREFIX}/agreements/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  await kv.del(`agreements:${userId}:${c.req.param('id')}`);
  return c.json({ success: true });
});

// ── JOURNAL ───────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/journal`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`journal:${userId}:`);
  return c.json(items);
});

app.get(`${PREFIX}/journal/:date`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const date = c.req.param('date');
  const entry = await kv.get(`journal:${userId}:${date}`);
  return c.json(entry || null);
});

app.post(`${PREFIX}/journal`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const date = body.date || new Date().toISOString().split('T')[0];
  const entry = { userId, ...body, date, updatedAt: new Date().toISOString() };
  await kv.set(`journal:${userId}:${date}`, entry);
  return c.json(entry);
});

// ── FUTURE VISION ─────────────────────────────────────────────────────────────
app.get(`${PREFIX}/future`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const data = await kv.get(`future:${userId}`);
  return c.json(data || { oneYear: '', fiveYears: '', tenYears: '', notes: '' });
});

app.put(`${PREFIX}/future`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json();
  const data = { userId, ...body, updatedAt: new Date().toISOString() };
  await kv.set(`future:${userId}`, data);
  return c.json(data);
});

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/documents`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const items = await kv.getByPrefix(`docs:${userId}:`);
  return c.json(items);
});

app.post(`${PREFIX}/documents`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  try {
    await ensureBucket();
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'عام';
    const name = formData.get('name') as string || file?.name || 'مستند';
    if (!file) return c.json({ error: 'No file provided' }, 400);

    const supabase = getSupabase();
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${uid()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, arrayBuffer, { contentType: file.type });
    if (uploadError) return c.json({ error: uploadError.message }, 500);

    const { data: signedData } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600);
    const id = uid();
    const doc = { id, userId, name, category, filePath, fileType: file.type, fileSize: file.size, url: signedData?.signedUrl, createdAt: new Date().toISOString() };
    await kv.set(`docs:${userId}:${id}`, doc);
    return c.json(doc);
  } catch (e) {
    console.log('document upload error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

app.get(`${PREFIX}/documents/:id/url`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const doc = await kv.get(`docs:${userId}:${id}`);
  if (!doc) return c.json({ error: 'Not found' }, 404);
  const supabase = getSupabase();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.filePath, 3600);
  return c.json({ url: data?.signedUrl });
});

app.delete(`${PREFIX}/documents/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const doc = await kv.get(`docs:${userId}:${id}`);
  if (doc?.filePath) {
    const supabase = getSupabase();
    await supabase.storage.from(BUCKET).remove([doc.filePath]);
  }
  await kv.del(`docs:${userId}:${id}`);
  return c.json({ success: true });
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/analytics`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const [tasks, habits, workouts, dhikrItems, quranData] = await Promise.all([
      kv.getByPrefix(`tasks:${userId}:`),
      kv.getByPrefix(`habits:${userId}:`),
      kv.getByPrefix(`workouts:${userId}:`),
      kv.getByPrefix(`dhikr:${userId}:`),
      kv.get(`quran:${userId}`),
    ]);
    const today = new Date().toISOString().split('T')[0];
    const tasksDoneToday = tasks.filter((t: any) => t.completions?.some((c: any) => c.date === today && c.status === 'completed')).length;
    const totalDhikr = dhikrItems.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
    const totalPages = (quranData?.sessions || []).reduce((sum: number, s: any) => sum + (s.pages || 0), 0);
    const pagestoday = (quranData?.sessions || []).filter((s: any) => s.date?.startsWith(today)).reduce((sum: number, s: any) => sum + (s.pages || 0), 0);
    return c.json({
      tasks: { total: tasks.length, doneToday: tasksDoneToday },
      habits: { total: habits.length },
      workouts: { total: workouts.length },
      dhikr: { total: totalDhikr },
      quran: { totalPages, pagestoday },
    });
  } catch (e) {
    console.log('analytics error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

Deno.serve(app.fetch);
