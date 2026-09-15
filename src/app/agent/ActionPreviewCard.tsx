import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CalendarClock, Check, Pencil, X } from 'lucide-react';
import type { AgentAction } from './agent-types.ts';

const ACTION_LABELS: Record<AgentAction['type'], string> = {
  CreateTask: 'إضافة مهمة',
  UpdateTask: 'تعديل مهمة',
  CompleteTask: 'إكمال مهمة',
  DeleteTask: 'حذف مهمة',
  CreateHabit: 'إضافة عادة',
  UpdateHabit: 'تعديل عادة',
  DeleteHabit: 'حذف عادة',
  CreateEvent: 'إضافة موعد',
  UpdateEvent: 'تعديل موعد',
  DeleteEvent: 'حذف موعد',
  CreateGoal: 'إضافة هدف',
};

const EDITABLE_FIELDS = ['title', 'name', 'startDate', 'endDate', 'reminderTime', 'plannedTime', 'date', 'time', 'description', 'notes', 'location', 'dailyGoal'] as const;

export function ActionPreviewCard({
  action,
  busy = false,
  onChange,
  onApprove,
  onReject,
}: {
  action: AgentAction;
  busy?: boolean;
  onChange: (action: AgentAction) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const reduceMotion = useReducedMotion();
  const visibleFields = useMemo(
    () => EDITABLE_FIELDS.filter(field => action.payload[field] != null),
    [action.payload],
  );

  const mainText = String(action.payload.title || action.payload.name || 'إجراء مقترح');

  function updateField(field: string, value: string) {
    onChange({ ...action, payload: { ...action.payload, [field]: value } });
  }

  return (
    <motion.div layout className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarClock size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-primary">{ACTION_LABELS[action.type]}</p>
            <span className="rounded-full bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground">معاينة قبل التنفيذ</span>
          </div>
          {!editing && <p className="mt-1 text-sm font-bold text-foreground">{mainText}</p>}

          <AnimatePresence initial={false} mode="wait">
          {editing ? (
            <motion.div key="edit" initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={reduceMotion ? undefined : { opacity: 0, height: 0 }} className="mt-3 grid gap-2">
              {visibleFields.map(field => (
                <label key={field} className="grid gap-1 text-[11px] text-muted-foreground">
                  <span>{fieldLabel(field)}</span>
                  <input
                    value={String(action.payload[field] ?? '')}
                    onChange={event => updateField(field, event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
              ))}
            </motion.div>
          ) : (
            <motion.div key="preview" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }} className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {(action.payload.date || action.payload.startDate) && <span className="rounded-lg bg-background px-2 py-1">📅 {String(action.payload.date || action.payload.startDate)}</span>}
              {(action.payload.time || action.payload.plannedTime || action.payload.reminderTime) && <span className="rounded-lg bg-background px-2 py-1">⏰ {String(action.payload.time || action.payload.plannedTime || action.payload.reminderTime)}</span>}
              {(action.payload.description || action.payload.notes) && <span className="w-full leading-5">{String(action.payload.description || action.payload.notes)}</span>}
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <motion.button whileTap={reduceMotion ? undefined : { scale: 0.95 }} disabled={busy} onClick={() => setEditing(value => !value)} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-foreground disabled:opacity-50">
          <Pencil size={14} /> {editing ? 'تم' : 'تعديل'}
        </motion.button>
        <motion.button whileTap={reduceMotion ? undefined : { scale: 0.95 }} disabled={busy} onClick={onReject} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-muted-foreground disabled:opacity-50">
          <X size={14} /> إلغاء
        </motion.button>
        <motion.button whileTap={reduceMotion ? undefined : { scale: 0.95 }} disabled={busy || editing} onClick={onApprove} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">
          <Check size={14} /> اعتماد
        </motion.button>
      </div>
    </motion.div>
  );
}

function fieldLabel(field: string) {
  if (field === 'title') return 'العنوان';
  if (field === 'name') return 'الاسم';
  if (field === 'date' || field === 'startDate') return 'التاريخ';
  if (field === 'endDate') return 'تاريخ النهاية';
  if (field === 'time' || field === 'reminderTime') return 'الوقت';
  if (field === 'plannedTime') return 'وقت الخطة';
  if (field === 'description' || field === 'notes') return 'التفاصيل';
  if (field === 'location') return 'المكان';
  if (field === 'dailyGoal') return 'الهدف اليومي';
  return field;
}
