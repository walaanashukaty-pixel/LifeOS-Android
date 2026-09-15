import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EmailConfirmationRequiredError, signIn, signInWithGoogle, signUp } from '../../utils/auth';
import { GoogleAuthCancelledError } from '../../utils/google-auth-flow';
import { toast } from 'sonner';
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, User } from 'lucide-react';

interface AuthPageProps { onSuccess: (user: any) => void; }

export function AuthPage({ onSuccess }: AuthPageProps) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const busy = loading || googleLoading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error('يرجى ملء جميع الحقول'); return; }
    if (mode === 'signup' && !name) { toast.error('يرجى إدخال اسمك'); return; }
    setLoading(true);
    try {
      const user = mode === 'login' ? await signIn(email, password) : await signUp(email, password, name);
      toast.success(mode === 'login' ? 'مرحباً بك في LifeOS!' : 'تم إنشاء حسابك بنجاح!');
      onSuccess(user);
    } catch (err: any) {
      if (err instanceof EmailConfirmationRequiredError) {
        toast.success(err.message);
        setMode('login');
        setPassword('');
      } else {
        toast.error(err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى');
      }
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) { toast.success('مرحباً بك في LifeOS!'); onSuccess(user); }
    } catch (err: any) {
      if (err instanceof GoogleAuthCancelledError) return;
      toast.error(err.message || 'تعذر تسجيل الدخول باستخدام Google');
    } finally { setGoogleLoading(false); }
  }

  return (
    <main className="lifeos-auth-shell" dir="rtl">
      <div className="lifeos-auth-orb lifeos-auth-orb-one" aria-hidden="true" />
      <div className="lifeos-auth-orb lifeos-auth-orb-two" aria-hidden="true" />

      <motion.section className="lifeos-auth-story" initial={reduceMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
        <div className="lifeos-auth-brand"><span>LO</span></div>
        <p className="lifeos-eyebrow">YOUR PERSONAL OPERATING SYSTEM</p>
        <h1>مكان واحد يساعدك تشوف يومك، أولوياتك وتقدمك بوضوح.</h1>
        <p>LifeOS يجمع المهام والعادات والأهداف والمواعيد والتعلم والمالية في تجربة واحدة هادئة بدل عشر تطبيقات منفصلة.</p>
        <div className="lifeos-auth-benefits">
          {[['تنظيم موحّد', 'كل أجزاء حياتك في مساحة واحدة.'], ['خصوصية أولًا', 'بيانات الحساب والمزامنة محمية عبر Supabase.'], ['ذكاء باختيارك', 'أنت تتحكم بما يصل إلى ميزات AI.']].map(([title, text], index) => (
            <motion.div key={title} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : .08 + index * .06 }}>
              <span><Check size={14} /></span><div><strong>{title}</strong><p>{text}</p></div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section className="lifeos-auth-card" initial={reduceMotion ? false : { opacity: 0, y: 16, scale: .99 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><p className="lifeos-eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'START YOUR SYSTEM'}</p><h2 className="text-xl font-black text-foreground">{mode === 'login' ? 'أهلًا برجعتك' : 'أنشئ حساب LifeOS'}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{mode === 'login' ? 'ادخل وكمل يومك من حيث توقفت.' : 'ابدأ ببناء نظامك الشخصي، وبعدها خصّصه كما تريد.'}</p></div>
          <div className="lifeos-auth-mini-icon"><Sparkles size={18} /></div>
        </div>

        <div className="lifeos-segmented mb-5" role="tablist" aria-label="نوع الدخول">
          {([['login', 'تسجيل الدخول'], ['signup', 'إنشاء حساب']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} disabled={busy} onClick={() => setMode(id)} data-active={mode === id} className="lifeos-segmented-item flex-1"><span className="relative z-10">{label}</span>{mode === id && <motion.span layoutId="auth-mode" className="lifeos-segmented-indicator" />}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
          {mode === 'signup' && <AuthField id="auth-name" label="الاسم الكامل" icon={<User size={16} />}><input id="auth-name" type="text" autoComplete="name" required maxLength={80} enterKeyHint="next" value={name} onChange={e => setName(e.target.value)} placeholder="أدخل اسمك الكامل" className="lifeos-auth-input" /></AuthField>}
          <AuthField id="auth-email" label="البريد الإلكتروني" icon={<Mail size={16} />}><input id="auth-email" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" required maxLength={254} enterKeyHint="next" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" className="lifeos-auth-input" /></AuthField>
          <AuthField id="auth-password" label="كلمة المرور" icon={<Lock size={16} />}>
            <input id="auth-password" type={showPass ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} maxLength={128} enterKeyHint="go" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="lifeos-auth-input pl-12" />
            <button type="button" onClick={() => setShowPass(value => !value)} className="lifeos-auth-password-toggle" aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={showPass}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </AuthField>

          <button type="submit" disabled={busy} className="lifeos-auth-primary">
            {loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowLeft size={17} />}
            {loading ? 'جارٍ المتابعة…' : mode === 'login' ? 'الدخول إلى LifeOS' : 'إنشاء الحساب'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3" aria-hidden="true"><div className="h-px flex-1 bg-border" /><span className="text-[10px] font-bold text-muted-foreground">أو تابع بسرعة</span><div className="h-px flex-1 bg-border" /></div>
        <button type="button" disabled={busy} onClick={handleGoogleSignIn} className="lifeos-auth-google">
          {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <span className="lifeos-google-mark">G</span>}
          <span>المتابعة باستخدام Google</span>
        </button>

        <div className="lifeos-auth-trust"><ShieldCheck size={14} /><span>لن نطلب منك مشاركة كلمة مرور Google مع LifeOS.</span></div>
        <p className="sr-only" aria-live="polite">{busy ? 'جارٍ تنفيذ عملية تسجيل الدخول' : ''}</p>
      </motion.section>
    </main>
  );
}

function AuthField({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-bold text-foreground">{label}</label><div className="lifeos-auth-field"><span className="lifeos-auth-field-icon">{icon}</span>{children}</div></div>;
}
