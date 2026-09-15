import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Page } from '../App';
import {
  getDueNotificationRecords, getUpcomingNotificationRecords,
  markAllNotificationsRead, markNotificationRead, setNotificationDeepLinkTarget,
  type LifeOSNotificationRecord,
} from '../../utils/notifications';
import { hapticLight, hapticSelection } from '../../utils/haptics';
import { useIsMobile } from './ui/use-mobile';
import { registerAndroidBackHandler } from '../../utils/android-back';
import { Bell, CheckCheck, Clock3, X, CheckSquare, Activity, Calendar, Sparkles } from 'lucide-react';

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
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
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

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    const unregisterBack = registerAndroidBackHandler(() => { onClose(); return true; });
    if (window.matchMedia('(max-width: 767px)').matches) document.body.style.overflow = 'hidden';
    return () => { unregisterBack(); document.body.style.overflow = previous; };
  }, [open, onClose]);

  const unread = due.filter(item => !item.read).length;

  const openRecord = (record: LifeOSNotificationRecord) => {
    hapticSelection();
    markNotificationRead(userId, record.key);
    if (record.entityType === 'task' || record.entityType === 'habit' || record.entityType === 'event') {
      setNotificationDeepLinkTarget(record.entityType, record.entityId);
    }
    onNavigate(record.page);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80]"
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.08 : 0.16 }}
        >
          <motion.button
            aria-label="إغلاق الإشعارات"
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.section
            className="absolute bottom-0 left-0 right-0 max-h-[78vh] overflow-hidden rounded-t-[28px] border border-b-0 border-border bg-card shadow-2xl md:bottom-auto md:left-6 md:right-auto md:top-16 md:w-[390px] md:rounded-2xl md:border"
            drag={reduceMotion || !isMobile ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.38 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 105 || info.velocity.y > 820) {
                hapticLight();
                onClose();
              }
            }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 64, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 56, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 430, damping: 35, mass: 0.8 }}
          >
            <div className="flex justify-center pb-0 pt-2 md:hidden" aria-hidden="true"><div className="h-1.5 w-11 rounded-full bg-muted-foreground/25" /></div>
            <div className="flex items-center gap-3 border-b border-border px-4 py-4">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                animate={!reduceMotion && unread > 0 ? { rotate: [0, -7, 7, -4, 0] } : undefined}
                transition={{ duration: 0.55, delay: 0.18 }}
              ><Bell size={19} /></motion.div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-foreground">الإشعارات</h3>
                <p className="text-xs text-muted-foreground">{unread ? `${unread} غير مقروء` : 'أنت على اطلاع بكل شيء'}</p>
              </div>
              {unread > 0 && (
                <motion.button
                  whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  onClick={() => { hapticSelection(); markAllNotificationsRead(userId); refresh(); }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <CheckCheck size={14} /> قراءة الكل
                </motion.button>
              )}
              <motion.button whileTap={reduceMotion ? undefined : { scale: 0.9 }} onClick={onClose} className="lifeos-fast-close flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={17} /></motion.button>
            </div>

            <div className="max-h-[calc(78vh-80px)] overflow-y-auto overscroll-contain p-3 md:max-h-[560px]">
              {(due.length > 0 || upcoming.length > 0) && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-3">
                    <p className="text-[10px] font-bold text-muted-foreground">تحتاج انتباهك الآن</p>
                    <p className="mt-1 text-lg font-black text-foreground">{due.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/45 p-3">
                    <p className="text-[10px] font-bold text-muted-foreground">قادمة قريبًا</p>
                    <p className="mt-1 text-lg font-black text-foreground">{upcoming.length}</p>
                  </div>
                </div>
              )}
              {due.length === 0 && upcoming.length === 0 ? (
                <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-12 text-center">
                  <motion.div
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                    animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                    transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
                  ><Bell size={22} /></motion.div>
                  <p className="mt-3 text-sm font-semibold text-foreground">لا توجد تنبيهات</p>
                  <p className="mt-1 text-xs text-muted-foreground">أضف وقت تذكير لمهمة أو عادة أو حدث.</p>
                </motion.div>
              ) : (
                <div className="space-y-5">
                  {due.length > 0 && (
                    <div>
                      <p className="mb-2 px-1 text-[11px] font-bold text-muted-foreground">وصلت إليك</p>
                      <div className="space-y-2">
                        {due.slice(0, 20).map((record, index) => <NotificationRow key={record.key} record={record} index={index} reduceMotion={!!reduceMotion} onClick={() => openRecord(record)} />)}
                      </div>
                    </div>
                  )}
                  {upcoming.length > 0 && (
                    <div>
                      <p className="mb-2 px-1 text-[11px] font-bold text-muted-foreground">القادمة</p>
                      <div className="space-y-2 opacity-85">
                        {upcoming.map((record, index) => <NotificationRow key={record.key} record={record} index={index + due.length} reduceMotion={!!reduceMotion} upcoming onClick={() => openRecord(record)} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NotificationRow({ record, onClick, upcoming = false, index, reduceMotion }: { record: LifeOSNotificationRecord; onClick: () => void; upcoming?: boolean; index: number; reduceMotion: boolean }) {
  const Icon = record.entityType === 'task' ? CheckSquare : record.entityType === 'habit' ? Activity : record.entityType === 'smart' ? Sparkles : Calendar;
  const color = record.entityType === 'task' ? '#3b82f6' : record.entityType === 'habit' ? '#8b5cf6' : record.entityType === 'smart' ? '#10b981' : '#6366f1';
  const when = new Date(record.scheduledFor);
  return (
    <motion.button
      onClick={onClick}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.18), duration: 0.22 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      className={`w-full rounded-2xl border p-3 text-right transition-colors ${!record.read && !upcoming ? 'border-primary/25 bg-primary/[0.04]' : 'border-border bg-background/50'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18`, color }}><Icon size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{record.title}</p>
            {!record.read && !upcoming && <motion.span layoutId={`notification-dot-${record.key}`} className="h-2 w-2 rounded-full bg-primary" />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{record.body}</p>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 size={10} />{when.toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </motion.button>
  );
}
