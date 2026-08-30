import { useEffect, useState } from 'react';
import type { Page } from '../App';
import {
  getDueNotificationRecords, getUpcomingNotificationRecords,
  markAllNotificationsRead, markNotificationRead, setNotificationDeepLinkTarget,
  type LifeOSNotificationRecord,
} from '../../utils/notifications';
import { Bell, CheckCheck, Clock3, X, CheckSquare, Activity, Calendar } from 'lucide-react';

export function NotificationCenter({
  userId,
  open,
  onClose,
  onNavigate,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}) {
  const [due, setDue] = useState<LifeOSNotificationRecord[]>([]);
  const [upcoming, setUpcoming] = useState<LifeOSNotificationRecord[]>([]);

  const refresh = () => {
    setDue(getDueNotificationRecords(userId));
    setUpcoming(getUpcomingNotificationRecords(userId));
  };

  useEffect(() => {
    if (!open) return;
    refresh();
    window.addEventListener('lifeos:notifications-changed', refresh);
    return () => window.removeEventListener('lifeos:notifications-changed', refresh);
  }, [open, userId]);

  if (!open) return null;
  const unread = due.filter(item => !item.read).length;

  const openRecord = (record: LifeOSNotificationRecord) => {
    markNotificationRead(userId, record.key);
    setNotificationDeepLinkTarget(record.entityType, record.entityId);
    onNavigate(record.page);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80]" dir="rtl">
      <button aria-label="إغلاق الإشعارات" className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onClick={onClose} />
      <section className="absolute bottom-0 left-0 right-0 max-h-[78vh] overflow-hidden rounded-t-[28px] border border-border bg-card shadow-2xl md:bottom-auto md:left-6 md:right-auto md:top-16 md:w-[390px] md:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bell size={19} /></div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-foreground">الإشعارات</h3>
            <p className="text-xs text-muted-foreground">{unread ? `${unread} غير مقروء` : 'أنت على اطلاع بكل شيء'}</p>
          </div>
          {unread > 0 && (
            <button onClick={() => { markAllNotificationsRead(userId); refresh(); }} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">
              <CheckCheck size={14} /> قراءة الكل
            </button>
          )}
          <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X size={17} /></button>
        </div>

        <div className="max-h-[calc(78vh-74px)] overflow-y-auto p-3 md:max-h-[560px]">
          {due.length === 0 && upcoming.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Bell size={22} /></div>
              <p className="mt-3 text-sm font-semibold text-foreground">لا توجد تنبيهات</p>
              <p className="mt-1 text-xs text-muted-foreground">أضف وقت تذكير لمهمة أو عادة أو حدث.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {due.length > 0 && (
                <div>
                  <p className="mb-2 px-1 text-[11px] font-bold text-muted-foreground">وصلت إليك</p>
                  <div className="space-y-2">
                    {due.slice(0, 20).map(record => <NotificationRow key={record.key} record={record} onClick={() => openRecord(record)} />)}
                  </div>
                </div>
              )}
              {upcoming.length > 0 && (
                <div>
                  <p className="mb-2 px-1 text-[11px] font-bold text-muted-foreground">القادمة</p>
                  <div className="space-y-2 opacity-85">
                    {upcoming.map(record => <NotificationRow key={record.key} record={record} upcoming onClick={() => openRecord(record)} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function NotificationRow({ record, onClick, upcoming = false }: { record: LifeOSNotificationRecord; onClick: () => void; upcoming?: boolean }) {
  const Icon = record.entityType === 'task' ? CheckSquare : record.entityType === 'habit' ? Activity : Calendar;
  const color = record.entityType === 'task' ? '#3b82f6' : record.entityType === 'habit' ? '#8b5cf6' : '#6366f1';
  const when = new Date(record.scheduledFor);
  return (
    <button onClick={onClick} className={`w-full rounded-2xl border p-3 text-right transition active:scale-[0.99] ${!record.read && !upcoming ? 'border-primary/25 bg-primary/[0.04]' : 'border-border bg-background/50'}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18`, color }}><Icon size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{record.title}</p>
            {!record.read && !upcoming && <span className="h-2 w-2 rounded-full bg-primary" />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{record.body}</p>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 size={10} />{when.toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </button>
  );
}
