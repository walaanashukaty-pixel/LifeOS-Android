import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Save, Eye, Loader2, Star } from 'lucide-react';

const VISIONS = [
  { key: 'oneYear', label: 'رؤية السنة القادمة', emoji: '🌱', color: 'from-green-500/20 to-emerald-500/10', border: 'border-green-500/30', description: 'أين تريد أن تكون بعد سنة واحدة؟' },
  { key: 'fiveYears', label: 'رؤية 5 سنوات', emoji: '🚀', color: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30', description: 'كيف تتخيل حياتك بعد 5 سنوات؟' },
  { key: 'tenYears', label: 'رؤية 10 سنوات', emoji: '🌟', color: 'from-purple-500/20 to-violet-500/10', border: 'border-purple-500/30', description: 'ما هو الإرث الذي تريد بناءه في 10 سنوات؟' },
];

export function FutureVisionPage() {
  const [data, setData] = useState<any>({ oneYear: '', fiveYears: '', tenYears: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/future').then(d => {
      setData(d || { oneYear: '', fiveYears: '', tenYears: '', notes: '' });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const updated = await api('/future', { method: 'PUT', body: JSON.stringify(data) });
      setData(updated);
      toast.success('تم حفظ رؤيتك المستقبلية');
    } catch { toast.error('فشل الحفظ'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Eye size={20} className="text-cyan-500" /> رؤية المستقبل
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">ارسم مستقبلك وحدد وجهتك</p>
      </div>

      {/* Hero quote */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl border border-amber-500/20 p-6 text-center">
        <Star size={24} className="text-amber-500 mx-auto mb-3" />
        <p className="text-foreground font-semibold text-lg">«من لم يعرف أين يذهب، لن يصل إلى أي مكان»</p>
        <p className="text-muted-foreground text-sm mt-1">الرؤية الواضحة هي أول خطوة نحو النجاح</p>
      </div>

      {/* Vision sections */}
      <div className="space-y-5">
        {VISIONS.map(vision => (
          <div key={vision.key} className={`bg-gradient-to-br ${vision.color} rounded-2xl border ${vision.border} p-5`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{vision.emoji}</span>
              <div>
                <h3 className="font-bold text-foreground">{vision.label}</h3>
                <p className="text-sm text-muted-foreground">{vision.description}</p>
              </div>
            </div>
            <textarea
              value={data[vision.key] || ''}
              onChange={e => setData((d: any) => ({ ...d, [vision.key]: e.target.value }))}
              rows={5}
              placeholder={`اكتب رؤيتك هنا... ${vision.description}`}
              className="w-full bg-card/70 border border-white/10 rounded-xl py-3 px-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all backdrop-blur-sm"
            />
          </div>
        ))}

        {/* Notes */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-3">ملاحظات وأفكار إضافية</h3>
          <textarea
            value={data.notes || ''}
            onChange={e => setData((d: any) => ({ ...d, notes: e.target.value }))}
            rows={4}
            placeholder="أي أفكار أو ملاحظات تريد تدوينها حول مستقبلك..."
            className="w-full bg-input-background border border-border rounded-xl py-3 px-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 shadow-lg shadow-primary/20"
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        حفظ الرؤية المستقبلية
      </button>

      {data.updatedAt && (
        <p className="text-center text-xs text-muted-foreground">
          آخر تحديث: {new Date(data.updatedAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}
