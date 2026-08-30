import { useState } from 'react';
import { signIn, signInWithGoogle, signUp } from '../../utils/auth';
import { GoogleAuthCancelledError } from '../../utils/google-auth-flow';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react';

interface AuthPageProps {
  onSuccess: (user: any) => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error('يرجى ملء جميع الحقول'); return; }
    if (mode === 'signup' && !name) { toast.error('يرجى إدخال اسمك'); return; }
    setLoading(true);
    try {
      let user;
      if (mode === 'login') user = await signIn(email, password);
      else user = await signUp(email, password, name);
      toast.success(mode === 'login' ? 'مرحباً بك في LifeOS!' : 'تم إنشاء حسابك بنجاح!');
      onSuccess(user);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        toast.success('مرحباً بك في LifeOS!');
        onSuccess(user);
      }
    } catch (err: any) {
      if (err instanceof GoogleAuthCancelledError) return;
      toast.error(err.message || 'تعذر تسجيل الدخول باستخدام Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white text-2xl font-bold mb-4 shadow-lg shadow-primary/30">
            LO
          </div>
          <h1 className="text-3xl font-bold text-foreground">LifeOS</h1>
          <p className="text-muted-foreground mt-1">نظام إدارة حياتك الشخصية</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">الاسم الكامل</label>
                <div className="relative">
                  <User size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    className="w-full bg-input-background border border-border rounded-xl py-2.5 pr-10 pl-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  dir="ltr"
                  className="w-full bg-input-background border border-border rounded-xl py-2.5 pr-10 pl-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Lock size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-input-background border border-border rounded-xl py-2.5 pr-10 pl-10 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute top-1/2 -translate-y-1/2 left-3 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/30 mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium text-muted-foreground">أو</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            disabled={loading || googleLoading}
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 font-semibold text-foreground transition-all hover:bg-muted/60 active:scale-[0.99] disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[13px] font-black leading-none shadow-sm ring-1 ring-black/5">
                <span style={{ color: '#4285F4' }}>G</span>
              </span>
            )}
            <span>المتابعة باستخدام Google</span>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          LifeOS — نظام إدارة الحياة الشخصية المتكامل
        </p>
      </div>
    </div>
  );
}
