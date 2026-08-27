import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../App';
import { cancelEntityReminders, consumeNotificationDeepLinkTarget, scheduleEventReminder } from '../../utils/notifications';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Calendar, Clock, Loader2, MapPin } from 'lucide-react';

const EVENT_TYPES = ['موعد', 'مقابلة', 'رحلة', 'اجتماع', 'مناسبة خاصة', 'مهمة', 'أخرى'];

type View = 'upcoming' | 'calendar';

function focusDeepLinkedCard(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
  window.setTimeout(() => element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background'), 2600);
}

export function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('upcoming');
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [form, setForm] = useState({ title: '', type: 'موعد', date: '', time: '', location: '', notes: '', reminder: '' });

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    try {
      const data = await api('/events');
      setEvents(Array.isArray(data) ? data : []);
      const deepLinkId = consumeNotificationDeepLinkTarget('event');
      if (deepLinkId) window.setTimeout(() => focusDeepLinkedCard(`event-${deepLinkId}`), 120);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  }

  async function saveEvent() {
    if (!form.title.trim() || !form.date) { toast.error('أدخل العنوان والتاريخ'); return; }
    if (form.reminder && !form.time) { toast.error('حدد وقت الحدث حتى يعمل التذكير'); return; }
    try {
      let saved: any;
      if (editEvent) {
        saved = await api(`/events/${editEvent.id}`, { method: 'PUT', body: JSON.stringify(form) });
        setEvents(e => e.map(x => x.id === saved.id ? saved : x));
        toast.success('تم التحديث');
      } else {
        saved = await api('/events', { method: 'POST', body: JSON.stringify(form) });
        setEvents(e => [...e, saved]);
        toast.success('تمت الإضافة');
      }
      if (user?.id) await scheduleEventReminder(user.id, saved);
      resetForm();
    } catch { toast.error('فشل الحفظ'); }
  }

  async function deleteEvent(id: string) {
    try {
      await api(`/events/${id}`, { method: 'DELETE' });
      if (user?.id) await cancelEntityReminders(user.id, 'event', id);
      setEvents(e => e.filter(x => x.id !== id));
    } catch { toast.error('فشل الحذف'); }
  }

  function resetForm() {
    setForm({ title: '', type: 'موعد', date: '', time: '', location: '', notes: '', reminder: '' });
    setEditEvent(null);
    setShowForm(false);
  }

  const today = new Date().toISOString().split('T')[0];
  const sorted = [...events].sort((a, b) => a.date?.localeCompare(b.date || '') || 0);
  const upcoming = sorted.filter(e => e.date >= today);
  const past = sorted.filter(e => e.date < today).reverse();
  const todayEvents = events.filter(e => e.date === today);

  // Calendar view
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const monthName = now.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  const getEventsForDay = (day: number) => {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">الأحداث والتذكيرات</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{upcoming.length} حدث قادم</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-muted rounded-xl p-1">
            <button onClick={() => setView('upcoming')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${view === 'upcoming' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>القائمة</button>
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${view === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>التقويم</button>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
            <Plus size={16} /> حدث جديد
          </button>
        </div>
      </div>

      {/* Today's events */}
      {todayEvents.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-primary mb-2">أحداث اليوم</h3>
          <div className="space-y-1">
            {todayEvents.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                <span className="text-primary">•</span>
                <span className="font-medium text-foreground">{e.title}</span>
                {e.time && <span className="text-muted-foreground text-xs">{e.time}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-semibold text-foreground">{editEvent ? 'تعديل الحدث' : 'حدث جديد'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">العنوان *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">النوع</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">التاريخ *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الوقت</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">التذكير</label>
              <select value={form.reminder} onChange={e => setForm(f => ({ ...f, reminder: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">بدون تذكير</option>
                <option value="0">في وقت الحدث</option>
                <option value="10">قبل 10 دقائق</option>
                <option value="30">قبل 30 دقيقة</option>
                <option value="60">قبل ساعة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الموقع</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground">إلغاء</button>
            <button onClick={saveEvent} className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground">حفظ</button>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4 text-center">{monthName}</h3>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'].map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = day === now.getDate();
              return (
                <div key={day} className={`min-h-12 rounded-lg p-1 border transition-all ${isToday ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border'}`}>
                  <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>{day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className="text-xs truncate text-primary bg-primary/10 rounded px-1">{e.title}</div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'upcoming' && (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">الأحداث القادمة ({upcoming.length})</h3>
              <div className="space-y-2.5">
                {upcoming.map(event => <EventCard key={event.id} event={event} onEdit={(e) => { setEditEvent(e); setForm({ title: e.title, type: e.type, date: e.date, time: e.time || '', location: e.location || '', notes: e.notes || '', reminder: e.reminder || '' }); setShowForm(true); }} onDelete={deleteEvent} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">السابقة</h3>
              <div className="space-y-2 opacity-60">
                {past.slice(0, 5).map(event => <EventCard key={event.id} event={event} onEdit={(e) => { setEditEvent(e); setForm({ title: e.title, type: e.type, date: e.date, time: e.time || '', location: e.location || '', notes: e.notes || '', reminder: e.reminder || '' }); setShowForm(true); }} onDelete={deleteEvent} />)}
              </div>
            </div>
          )}
          {events.length === 0 && (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <Calendar size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">لا توجد أحداث</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onEdit, onDelete }: { event: any; onEdit: (e: any) => void; onDelete: (id: string) => void }) {
  const isToday = event.date === new Date().toISOString().split('T')[0];
  const isPast = event.date < new Date().toISOString().split('T')[0];
  const daysUntilRaw = event.date ? Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000) : NaN;
  const daysUntil = isNaN(daysUntilRaw) ? 0 : daysUntilRaw;
  const colorClass = TYPE_COLORS[event.type] || 'bg-gray-500/10 text-gray-500';

  return (
    <div id={`event-${event.id}`} className={`bg-card rounded-xl border p-4 ${isToday ? 'border-primary/30' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className="text-center flex-shrink-0 w-12">
          <p className="text-xs text-muted-foreground">{new Date(event.date + 'T12:00').toLocaleDateString('ar-SA', { month: 'short' })}</p>
          <p className="text-xl font-bold text-foreground">{new Date(event.date + 'T12:00').getDate()}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-foreground text-sm">{event.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>{event.type}</span>
            {isToday && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">اليوم</span>}
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
            {event.time && <span className="flex items-center gap-1"><Clock size={10} />{event.time}</span>}
            {event.location && <span className="flex items-center gap-1"><MapPin size={10} />{event.location}</span>}
            {!isPast && !isToday && daysUntil > 0 && <span className="text-primary">خلال {daysUntil} يوم</span>}
          </div>
          {event.notes && <p className="text-xs text-muted-foreground mt-1">{event.notes}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(event)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><Edit3 size={13} /></button>
          <button onClick={() => onDelete(event.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  'موعد': 'bg-blue-500/10 text-blue-500',
  'مقابلة': 'bg-purple-500/10 text-purple-500',
  'رحلة': 'bg-green-500/10 text-green-500',
  'اجتماع': 'bg-amber-500/10 text-amber-600',
  'مناسبة خاصة': 'bg-pink-500/10 text-pink-500',
  'مهمة': 'bg-red-500/10 text-red-500',
  'أخرى': 'bg-gray-500/10 text-gray-500',
};
