import { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { api } from '../../utils/api';
import {
  Bell, CheckSquare, Activity, Calendar, Moon, Sun, LogOut, ShieldCheck,
  Smartphone, ChevronLeft, UserRound, Mail, Crown, Loader2, Sparkles, Shield,
} from 'lucide-react';
import {
  cancelAllUserReminders, cancelCategoryReminders, getNotificationPermission,
  getNotificationSettings, requestNotificationPermission, saveNotificationSettings,
  scheduleEventReminder, scheduleHabitReminders, scheduleTaskReminders,
  type NotificationSettings,
} from '../../utils/notifications';
import { RewardStatus } from './RewardStatus';
import { useMonetization } from '../monetization/MonetizationProvider';

export function AccountPage() {
  const { user, logout, darkMode, toggleDark } = useAuth();
  const userId = user?.id || '';
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'مستخدم';
  const [settings, setSettings] = useState<NotificationSettings>(() => userId ? getNotificationSettings(userId) : { enabled: true, tasks: true, habits: true, events: true });
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'web'>('prompt');
  const [working, setWorking] = useState(false);
  const { subscription, subscriptionLoading, rewards, openPro, privacyOptionsRequired, openPrivacyOptions } = useMonetization();

  useEffect(() => {
    if (!userId) return;
    setSettings(getNotificationSettings(userId));
    getNotificationPermission().then(setPermission);
  }, [userId]);

  async function rescheduleCategory(type: 'task' | 'habit' | 'event') {
    const path = type === 'task' ? '/tasks' : type === 'habit' ? '/habits' : '/events';
    const data = await api(path).catch(() => []);
    if (!Array.isArray(data)) return;
    for (const item of data) {
      if (type === 'task') await scheduleTaskReminders(userId, item);
      else if (type === 'habit') await scheduleHabitReminders(userId, item);
      else await scheduleEventReminder(userId, item);
    }
  }

  async function updateSettings(next: NotificationSettings, changed?: keyof NotificationSettings) {
    setSettings(next);
    saveNotificationSettings(userId, next);
    setWorking(true);
    try {
      if (!next.enabled) {
        await cancelAllUserReminders(userId);
      } else {
        const status = await requestNotificationPermission();
        setPermission(status);
        if (status === 'granted' || status === 'web') {
          if (changed === 'tasks') next.tasks ? await rescheduleCategory('task') : await cancelCategoryReminders(userId, 'task');
          else if (changed === 'habits') next.habits ? await rescheduleCategory('habit') : await cancelCategoryReminders(userId, 'habit');
          else if (changed === 'events') next.events ? await rescheduleCategory('event') : await cancelCategoryReminders(userId, 'event');
          else {
            if (next.tasks) await rescheduleCategory('task');
            if (next.habits) await rescheduleCategory('habit');
            if (next.events) await rescheduleCategory('event');
          }
        }
      }
    } finally {
      setWorking(false);
    }
  }

  async function enablePermission() {
    setWorking(true);
    try { setPermission(await requestNotificationPermission()); }
    finally { setWorking(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-xl font-black text-white shadow-lg shadow-primary/20">{userName.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><UserRound size={16} className="text-primary" /><h2 className="truncate text-xl font-bold text-foreground">{userName}</h2></div>
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Mail size={12} />{user?.email}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-4 bg-gradient-to-l from-amber-400/10 via-primary/5 to-transparent p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/15"><Crown size={22} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><p className="text-sm font-bold text-foreground">{subscription.isPro ? 'LifeOS Pro' : 'LifeOS Free'}</p>{subscription.isPro && <Sparkles size={14} className="text-amber-500" />}</div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{subscription.isPro ? 'اشتراك Pro فعّال على حسابك الحالي' : subscription.available ? 'يمكنك الترقية عندما تصبح باقات Pro جاهزة' : subscription.error || 'نظام الاشتراك غير مهيأ بعد'}</p>
          </div>
          {subscriptionLoading ? (
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          ) : subscription.isPro ? (
            <StatusPill label="Pro" />
          ) : (
            <button onClick={openPro} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-primary/20">الترقية</button>
          )}
        </div>
      </section>

      {!subscription.isPro && <RewardStatus used={rewards.globalRewardsToday} />}

      {privacyOptionsRequired && (
        <SettingsSection title="الخصوصية" icon={<Shield size={18} />}>
          <SettingRow
            icon={<ShieldCheck size={17} />}
            title="خصوصية الإعلانات"
            subtitle="راجع أو غيّر خيارات موافقة الإعلانات"
            action={<button onClick={() => void openPrivacyOptions()} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">مراجعة</button>}
          />
        </SettingsSection>
      )}

      <SettingsSection title="الإشعارات" icon={<Bell size={18} />}>
        <SettingRow
          icon={<Smartphone size={17} />}
          title="السماح بالإشعارات"
          subtitle={permission === 'granted' ? 'مسموح على هذا الجهاز' : permission === 'web' ? 'تعمل داخل نسخة التطبيق عند البناء' : 'يحتاج موافقة Android'}
          action={permission === 'granted' ? <StatusPill label="مفعّلة" /> : <button disabled={working} onClick={enablePermission} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">تفعيل</button>}
        />
        <SettingRow icon={<Bell size={17} />} title="التنبيهات" subtitle="المفتاح الرئيسي لكل تذكيرات LifeOS" action={<Toggle checked={settings.enabled} disabled={working} onChange={enabled => updateSettings({ ...settings, enabled }, 'enabled')} />} />
        <SettingRow icon={<CheckSquare size={17} />} title="المهام" subtitle="تذكير حسب وقت المهمة" action={<Toggle checked={settings.tasks} disabled={!settings.enabled || working} onChange={tasks => updateSettings({ ...settings, tasks }, 'tasks')} />} />
        <SettingRow icon={<Activity size={17} />} title="العادات" subtitle="استخدام وقت التذكير الموجود بكل عادة" action={<Toggle checked={settings.habits} disabled={!settings.enabled || working} onChange={habits => updateSettings({ ...settings, habits }, 'habits')} />} />
        <SettingRow icon={<Calendar size={17} />} title="الأحداث والمواعيد" subtitle="تنبيه قبل الموعد أو في وقته" action={<Toggle checked={settings.events} disabled={!settings.enabled || working} onChange={events => updateSettings({ ...settings, events }, 'events')} />} />
      </SettingsSection>

      <SettingsSection title="المظهر" icon={darkMode ? <Moon size={18} /> : <Sun size={18} />}>
        <button onClick={toggleDark} className="flex w-full items-center gap-3 rounded-2xl p-3 text-right transition hover:bg-muted/60 active:scale-[0.99]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{darkMode ? <Moon size={17} /> : <Sun size={17} />}</div>
          <div className="flex-1"><p className="text-sm font-semibold text-foreground">{darkMode ? 'الوضع الداكن' : 'الوضع الفاتح'}</p><p className="text-xs text-muted-foreground">غيّر مظهر LifeOS بدون تغيير بياناتك</p></div>
          <ChevronLeft size={16} className="text-muted-foreground" />
        </button>
      </SettingsSection>

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 text-xs leading-6 text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-semibold text-primary"><ShieldCheck size={15} /> التنبيهات على جهازك</div>
        التذكيرات الزمنية تُجدول محليًا على Android، لذلك يمكن أن تظهر حتى عندما يكون LifeOS مغلقًا.
      </div>

      <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 text-sm font-semibold text-destructive transition active:scale-[0.99]"><LogOut size={17} /> تسجيل الخروج</button>
    </div>
  );
}

function SettingsSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-border bg-card p-3 shadow-sm"><div className="flex items-center gap-2 px-2 pb-2 pt-1 text-sm font-bold text-foreground"><span className="text-primary">{icon}</span>{title}</div><div className="divide-y divide-border/70">{children}</div></section>;
}

function SettingRow({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle: string; action: React.ReactNode }) {
  return <div className="flex items-center gap-3 px-2 py-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">{icon}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{subtitle}</p></div>{action}</div>;
}

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
  return <button aria-pressed={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-40 ${checked ? 'bg-primary' : 'bg-muted-foreground/25'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-1' : 'left-6'}`} /></button>;
}

function StatusPill({ label }: { label: string }) {
  return <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">{label}</span>;
}
