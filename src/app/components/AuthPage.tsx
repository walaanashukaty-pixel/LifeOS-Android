import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EmailConfirmationRequiredError, signIn, signInWithGoogle, signUp } from '../../utils/auth';
import { GoogleAuthCancelledError } from '../../utils/google-auth-flow';
import { toast } from 'sonner';
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, User } from 'lucide-react';

interface AuthPageProps { onSuccess: (user: any) => void; }

type Feedback = { type: 'error' | 'info'; text: string } | null;

function friendlyAuthError(error: any) {
  const raw = String(error?.message || error || '');
  if (/invalid login credentials/i.test(raw)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (/email not confirmed/i.test(raw)) return 'أكد بريدك الإلكتروني أولًا، ثم ارجع وسجّل الدخول.';
  if (/user already registered|already been registered/i.test(raw)) return 'هذا البريد مسجّل من قبل. اختر تسجيل الدخول بدل إنشاء حساب.';
  if (/password.*6|weak password/i.test(raw)) return 'كلمة المرور قصيرة جدًا. استخدم 6 أحرف على الأقل.';
  if (/failed to fetch|network|load failed/i.test(raw)) return 'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مجددًا.';
  return raw || 'حدث خطأ، يرجى المحاولة مرة أخرى.';
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const busy = loading || googleLoading;

  function changeMode(next: 'login' | 'signup') {
    if (busy) return;
    setMode(next);
    setFeedback(null);
    setConfirmationEmail('');
    setPassword('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    setFeedback(null);

    if (!cleanEmail || !password) {
      setFeedback({ type: 'error', text: 'اكتب البريد الإلكتروني وكلمة المرور.' });
      return;
    }
    if (mode === 'signup' && !cleanName) {
      setFeedback({ type: 'error', text: 'اكتب اسمك حتى نكمل إنشاء الحساب.' });
      return;
    }

    setLoading(true);
    try {
      const user = mode === 'login'
        ? await signIn(cleanEmail, password)
        : await signUp(cleanEmail, password, cleanName);
      toast.success(mode === 'login' ? 'مرحباً بك في LifeOS!' : 'تم إنشاء حسابك بنجاح!');
      onSuccess(user);
    } catch (err: any) {
      if (err instanceof EmailConfirmationRequiredError) {
        setConfirmationEmail(cleanEmail);
        setMode('login');
        setPassword('');
        setFeedback(null);
      } else {
        setFeedback({ type: 'error', text: friendlyAuthError(err) });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setFeedback(null);
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        toast.success('مرحباً بك في LifeOS!');
        onSuccess(user);
      }
    } catch (err: any) {
      if (err instanceof GoogleAuthCancelledError) return;
      setFeedback({ type: 'error', text: friendlyAuthError(err) || 'تعذر تسجيل الدخول باستخدام Google.' });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="lifeos-auth-shell" dir="rtl">
      <div className="lifeos-auth-orb lifeos-auth-orb-one" aria-hidden="true" />
      <div className="lifeos-auth-orb lifeos-auth-orb-two" aria-hidden="true" />

      <section className="lifeos-auth-story">
        <div className="lifeos-auth-brand"><span>LO</span></div>
        <p className="lifeos-eyebrow">YOUR PERSONAL OPERATING SYSTEM</p>
        <h1>مكان واحد يساعدك تشوف يومك، أولوياتك وتقدمك بوضوح.</h1>
        <p>LifeOS يجمع المهام والعادات والأهداف والمواعيد والتعلم والمالية في تجربة واحدة هادئة بدل عشر تطبيقات منفصلة.</p>
        <div className="lifeos-auth-benefits">
          {[['تنظيم موحّد', 'كل أجزاء حياتك في مساحة واحدة.'], ['خصوصية أولًا', 'بيانات الحساب والمزامنة محمية عبر Supabase.'], ['ذكاء باختيارك', 'أنت تتحكم بما يصل إلى ميزات AI.']].map(([title, text]) => (
            <div key={title}><span><Check size={14} /></span><div><strong>{title}</strong><p>{text}</p></div></div>
          ))}
        </div>
      </section>

      <motion.section
        className="lifeos-auth-card"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
      >
        <div className="lifeos-auth-mobile-brand" aria-hidden="true">
          <span>LO</span>
          <div><strong>LifeOS</strong><small>نظام إدارة حياتك</small></div>
        </div>

        {confirmationEmail ? (
          <div className="lifeos-auth-confirmation" role="status" aria-live="polite">
            <span className="lifeos-auth-confirmation-icon"><CheckCircle2 size={22} /></span>
            <p className="lifeos-eyebrow">CHECK YOUR EMAIL</p>
            <h2>بقي تأكيد البريد فقط</h2>
            <p>أرسلنا رابط تأكيد إلى:</p>
            <strong dir="ltr">{confirmationEmail}</strong>
            <p className="mt-2">افتح الرسالة واضغط رابط التأكيد، وبعدها ارجع وسجّل الدخول. بياناتك ما راحت.</p>
            <button type="button" className="lifeos-auth-primary mt-5" onClick={() => setConfirmationEmail('')}>
              <ArrowLeft size={17} /> العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="lifeos-eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'START YOUR SYSTEM'}</p>
                <h2 className="text-xl font-black text-foreground">{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{mode === 'login' ? 'ادخل بحسابك وكمل من حيث توقفت.' : 'اكتب بياناتك مرة واحدة، وبعدها نبدأ إعداد LifeOS.'}</p>
              </div>
              <div className="lifeos-auth-mini-icon"><Sparkles size={18} /></div>
            </div>

            <div className="lifeos-segmented mb-4" role="tablist" aria-label="نوع الدخول">
              {([['login', 'تسجيل الدخول'], ['signup', 'إنشاء حساب']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  disabled={busy}
                  onClick={() => changeMode(id)}
                  data-active={mode === id}
                  className="lifeos-segmented-item"
                >
                  <span className="relative z-10">{label}</span>
                  {mode === id && <motion.span layoutId="auth-mode" className="lifeos-segmented-indicator" transition={{ duration: reduceMotion ? 0.01 : 0.14 }} />}
                </button>
              ))}
            </div>

            {feedback && (
              <div className={`lifeos-auth-feedback ${feedback.type === 'error' ? 'is-error' : ''}`} role="alert" aria-live="polite">
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5" aria-busy={loading}>
              {mode === 'signup' && (
                <AuthField id="auth-name" label="الاسم الكامل" icon={<User size={16} />}>
                  <input id="auth-name" type="text" autoComplete="name" required maxLength={80} enterKeyHint="next" value={name} onChange={e => setName(e.target.value)} placeholder="أدخل اسمك الكامل" className="lifeos-auth-input" />
                </AuthField>
              )}

              <AuthField id="auth-email" label="البريد الإلكتروني" icon={<Mail size={16} />}>
                <input id="auth-email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="email" required maxLength={254} enterKeyHint="next" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" className="lifeos-auth-input" />
              </AuthField>

              <AuthField id="auth-password" label="كلمة المرور" icon={<Lock size={16} />}>
                <input id="auth-password" type={showPass ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} maxLength={128} enterKeyHint="go" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="lifeos-auth-input pl-12" />
                <button type="button" onClick={() => setShowPass(value => !value)} className="lifeos-auth-password-toggle" aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={showPass}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </AuthField>

              <button type="submit" disabled={busy} className="lifeos-auth-primary">
                {loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowLeft size={17} />}
                {loading ? 'جارٍ المتابعة…' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3" aria-hidden="true"><div className="h-px flex-1 bg-border" /><span className="text-[10px] font-bold text-muted-foreground">أو</span><div className="h-px flex-1 bg-border" /></div>
            <button type="button" disabled={busy} onClick={handleGoogleSignIn} className="lifeos-auth-google">
              {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <span className="lifeos-google-mark">G</span>}
              <span>المتابعة باستخدام Google</span>
            </button>

            <div className="lifeos-auth-trust"><ShieldCheck size={14} /><span>لن نطلب منك مشاركة كلمة مرور Google مع LifeOS.</span></div>
            <p className="sr-only" aria-live="polite">{busy ? 'جارٍ تنفيذ عملية تسجيل الدخول' : ''}</p>
          </>
        )}
      </motion.section>
    </main>
  );
}

function AuthField({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-bold text-foreground">{label}</label><div className="lifeos-auth-field"><span className="lifeos-auth-field-icon">{icon}</span>{children}</div></div>;
}
