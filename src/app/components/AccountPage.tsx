import { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { api } from '../../utils/api';
import {
  Bell, CheckSquare, Activity, Calendar, Moon, Sun, LogOut, ShieldCheck,
  Smartphone, ChevronLeft, UserRound, Mail, Crown, Loader2, Sparkles, Shield, Brain, Trash2, Clock3,
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
  const [aiSettingsSaving, setAISettingsSaving] = useState(false);
  const [memoryDeleteOpen, setMemoryDeleteOpen] = useState(false);
  const { subscription, subscriptionLoading, rewards, openPro, privacyOptionsRequired, openPrivacyOptions, proPreviewActive, proExperienceEnabled, stopProPreview, personalization, personalizationLoading, openProSetup, forgetPersonalization, aiSettings, aiSettingsLoading, saveAISettings } = useMonetization();

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

  async function updateAISettings(patch: Partial<typeof aiSettings>) {
    setAISettingsSaving(true);
    try {
      await saveAISettings({
        aiDataAccessEnabled: patch.aiDataAccessEnabled ?? aiSettings.aiDataAccessEnabled,
        memoryEnabled: patch.memoryEnabled ?? aiSettings.memoryEnabled,
        smartNotificationsEnabled: patch.smartNotificationsEnabled ?? aiSettings.smartNotificationsEnabled,
        quietHoursEnabled: patch.quietHoursEnabled ?? aiSettings.quietHoursEnabled,
        quietHoursStart: patch.quietHoursStart ?? aiSettings.quietHoursStart,
        quietHoursEnd: patch.quietHoursEnd ?? aiSettings.quietHoursEnd,
        maxSmartNotificationsPerDay: patch.maxSmartNotificationsPerDay ?? aiSettings.maxSmartNotificationsPerDay,
      });
    } finally {
      setAISettingsSaving(false);
    }
  }

  async function confirmForgetMemory() {
    setAISettingsSaving(true);
    try {
      await forgetPersonalization();
      setMemoryDeleteOpen(false);
    } finally {
      setAISettingsSaving(false);
    }
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
            <div className="flex items-center gap-2"><p className="text-sm font-bold text-foreground">{subscription.isPro ? 'LifeOS Pro' : proPreviewActive ? 'LifeOS Pro — معاينة' : 'LifeOS Free'}</p>{(subscription.isPro || proPreviewActive) && <Sparkles size={14} className="text-amber-500" />}</div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{subscription.isPro ? 'اشتراك Pro فعّال على حسابك الحالي' : proPreviewActive ? 'معاينة تجريبية للواجهات فقط — اشتراكك الحقيقي ما زال Free' : subscription.available ? 'يمكنك الترقية عندما تصبح باقات Pro جاهزة' : subscription.error || 'نظام الاشتراك غير مهيأ بعد'}</p>
          </div>
          {subscriptionLoading ? (
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          ) : subscription.isPro ? (
            <StatusPill label="Pro" />
          ) : proPreviewActive ? (
            <button onClick={stopProPreview} className="rounded-xl border border-primary/25 bg-card px-3 py-2 text-xs font-semibold text-primary">إيقاف المعاينة</button>
          ) : (
            <button onClick={openPro} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-primary/20">الترقية</button>
          )}
        </div>
      </section>

      {subscription.isPro && (
        <SettingsSection title="LifeOS Pro" icon={<Sparkles size={18} />}>
          <SettingRow
            icon={<UserRound size={17} />}
            title="إعداد LifeOS الشخصي"
            subtitle={personalizationLoading ? 'عم نحمل تفضيلاتك...' : personalization?.onboardingCompleted ? `${personalization.planningStyle || 'مخصص'} · ${personalization.energyPeak || 'حسب يومك'}` : 'كملي إعدادك حتى تصير اقتراحات LifeOS أقرب إلك'}
            action={<button disabled={personalizationLoading} onClick={openProSetup} className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50">{personalization?.onboardingCompleted ? 'تعديل' : 'إعداد'}</button>}
          />
        </SettingsSection>
      )}

      {proExperienceEnabled && (
        <SettingsSection title="🧠 ذاكرة LifeOS" icon={<Brain size={18} />}>
          <div className="px-2 py-3">
            <p className="text-xs font-black text-foreground">ما يعرفه LifeOS عن طريقة تنظيمك</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {personalization?.onboardingCompleted
                ? `${personalization.focusAreas.slice(0, 3).join(' · ') || 'اهتماماتك'} · ${personalization.planningStyle || 'أسلوبك'} · ${personalization.energyPeak || 'وقت طاقتك'}`
                : 'ما في معلومات تخصيص محفوظة حاليًا.'}
            </p>
            {personalization?.primaryGoal && <p className="mt-1 line-clamp-2 text-[11px] text-primary">هدفك الحالي: {personalization.primaryGoal}</p>}
          </div>
          <SettingRow icon={<Shield size={17} />} title="استخدام بيانات LifeOS مع AI" subtitle="إذا طفيتيه، AI ما رح يستخدم مهامك وعاداتك وأهدافك ومواعيدك في الردود" action={<Toggle checked={aiSettings.aiDataAccessEnabled} disabled={aiSettingsLoading || aiSettingsSaving} onChange={value => void updateAISettings({ aiDataAccessEnabled: value })} />} />
          <SettingRow icon={<Brain size={17} />} title="الذاكرة الشخصية" subtitle="يتذكر تفضيلاتك ومراجعاتك السابقة لتحسين الاقتراحات" action={<Toggle checked={aiSettings.memoryEnabled} disabled={aiSettingsLoading || aiSettingsSaving} onChange={value => void updateAISettings({ memoryEnabled: value })} />} />
          <SettingRow icon={<Bell size={17} />} title="الإشعارات الذكية" subtitle="اقتراحات قليلة ومفيدة فوق نظام التذكيرات الحالي" action={<Toggle checked={aiSettings.smartNotificationsEnabled} disabled={aiSettingsLoading || aiSettingsSaving} onChange={value => void updateAISettings({ smartNotificationsEnabled: value })} />} />
          <SettingRow icon={<Clock3 size={17} />} title="ساعات الهدوء" subtitle={`${aiSettings.quietHoursStart} — ${aiSettings.quietHoursEnd}`} action={<Toggle checked={aiSettings.quietHoursEnabled} disabled={aiSettingsLoading || aiSettingsSaving} onChange={value => void updateAISettings({ quietHoursEnabled: value })} />} />
          {aiSettings.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-2 px-2 py-3">
              <label className="text-[10px] font-semibold text-muted-foreground">من<input type="time" value={aiSettings.quietHoursStart} disabled={aiSettingsSaving} onChange={event => void updateAISettings({ quietHoursStart: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-2 py-2 text-xs text-foreground" /></label>
              <label className="text-[10px] font-semibold text-muted-foreground">إلى<input type="time" value={aiSettings.quietHoursEnd} disabled={aiSettingsSaving} onChange={event => void updateAISettings({ quietHoursEnd: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-2 py-2 text-xs text-foreground" /></label>
            </div>
          )}
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">الحد اليومي للإشعارات الذكية</p><p className="mt-0.5 text-[11px] text-muted-foreground">من 1 إلى 3 فقط حتى ما تصير مزعجة</p></div>
            <select value={aiSettings.maxSmartNotificationsPerDay} disabled={aiSettingsSaving} onChange={event => void updateAISettings({ maxSmartNotificationsPerDay: Number(event.target.value) })} className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select>
          </div>
          <SettingRow icon={<Trash2 size={17} />} title="حذف المعلومات المحفوظة" subtitle="يمسح ملف التخصيص الشخصي فقط، بدون حذف مهامك أو أهدافك" action={<button disabled={!personalization || aiSettingsSaving} onClick={() => setMemoryDeleteOpen(true)} className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-40">حذف</button>} />
        </SettingsSection>
      )}

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

      {memoryDeleteOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-base font-black text-foreground">تأكيد حذف ذاكرة LifeOS</h3>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">رح نحذف معلومات التخصيص اللي حفظها LifeOS عن طريقة تنظيمك. مهامك وعاداتك وأهدافك ما رح تنحذف.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button disabled={aiSettingsSaving} onClick={() => setMemoryDeleteOpen(false)} className="rounded-2xl border border-border px-3 py-3 text-xs font-bold text-foreground">إلغاء</button>
              <button disabled={aiSettingsSaving} onClick={() => void confirmForgetMemory()} className="rounded-2xl bg-destructive px-3 py-3 text-xs font-bold text-white">حذف الذاكرة</button>
            </div>
          </div>
        </div>
      )}
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
