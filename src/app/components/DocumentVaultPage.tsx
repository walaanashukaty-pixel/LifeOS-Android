import { useState, useEffect, useRef } from 'react';
import { api, apiUpload } from '../../utils/api';
import { useMonetization } from '../monetization/MonetizationProvider';
import { RewardCapacityBar } from './RewardCapacityBar';
import { FormModal } from './ui/FormModal';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { LoadingPage, PageHero, SummaryCard } from './ui/LifeOSPrimitives';
import { AnimatedEmptyState } from './ui/AnimatedEmptyState';
import { toast } from 'sonner';
import { Upload, Trash2, Download, Edit3, FolderLock, Search, Loader2, FileText, Image, File } from 'lucide-react';

const CATEGORIES = ['عام', 'شهادات', 'وثائق رسمية', 'صور', 'مشاريع', 'طبي', 'مالي', 'أخرى'];
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);
const CAT_COLORS: Record<string, string> = {
  'عام': 'bg-gray-500/10 text-gray-500',
  'شهادات': 'bg-amber-500/10 text-amber-600',
  'وثائق رسمية': 'bg-blue-500/10 text-blue-500',
  'صور': 'bg-pink-500/10 text-pink-500',
  'مشاريع': 'bg-purple-500/10 text-purple-500',
  'طبي': 'bg-red-500/10 text-red-500',
  'مالي': 'bg-green-500/10 text-green-500',
  'أخرى': 'bg-gray-500/10 text-gray-500',
};

function getFileIcon(fileType: string) {
  if (fileType?.startsWith('image/')) return <Image size={20} className="text-pink-500" />;
  if (fileType?.includes('pdf')) return <FileText size={20} className="text-red-500" />;
  return <File size={20} className="text-blue-500" />;
}

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentVaultPage() {
  const confirmAction = useConfirmDialog();
  const { guardCreation } = useMonetization();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [editDoc, setEditDoc] = useState<any | null>(null);
  const [editDocForm, setEditDocForm] = useState({ name: '', category: 'عام' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCat, setUploadCat] = useState('عام');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    try {
      const data = await api('/documents');
      setDocuments(Array.isArray(data) ? data : []);
    } catch { toast.error('فشل تحميل الوثائق'); }
    finally { setLoading(false); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
      toast.error('نوع الملف غير مدعوم. استخدم صورة أو PDF أو ملف Office.');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error('حجم الملف أكبر من 20 MB. اختر ملفًا أصغر.');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setUploadName(file.name.replace(/\.[^.]+$/, ''));
  }

  async function uploadDocument() {
    if (!selectedFile) { toast.error('اختر ملفاً'); return; }
    if (!uploadName.trim()) { toast.error('أدخل اسم المستند'); return; }
    if (!await guardCreation({ key: 'documents', currentCount: documents.length })) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', uploadName);
      formData.append('category', uploadCat);
      const doc = await apiUpload('/documents', formData);
      setDocuments(d => [doc, ...d]);
      setSelectedFile(null);
      setUploadName('');
      setUploadCat('عام');
      if (fileRef.current) fileRef.current.value = '';
      toast.success('تم رفع الوثيقة بنجاح');
    } catch (err: any) {
      toast.error(`فشل الرفع: ${err.message}`);
    } finally { setUploading(false); }
  }

  async function saveDocumentMeta() {
    if (!editDoc || !editDocForm.name.trim()) return;
    try {
      const updated = await api(`/documents/${editDoc.id}`, { method: 'PUT', body: JSON.stringify(editDocForm) });
      setDocuments(items => items.map(item => item.id === editDoc.id ? updated : item));
      setEditDoc(null);
      toast.success('تم تعديل الوثيقة');
    } catch {
      toast.error('فشل تعديل الوثيقة');
    }
  }

  async function deleteDocument(id: string) {
    if (!(await confirmAction({ title: 'حذف الوثيقة نهائيًا', description: 'سيتم حذف الملف من خزنتك السحابية نهائيًا ولن يكون بالإمكان استعادته.' }))) return;
    try {
      await api(`/documents/${id}`, { method: 'DELETE' });
      setDocuments(d => d.filter(x => x.id !== id));
      toast.success('تم الحذف');
    } catch { toast.error('فشل الحذف'); }
  }

  async function getDownloadUrl(doc: any) {
    try {
      const { url } = await api(`/documents/${doc.id}/url`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch { toast.error('فشل الحصول على الرابط'); }
  }

  const filtered = documents.filter(d => {
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || d.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalBytes = documents.reduce((sum, doc) => sum + Number(doc.fileSize || 0), 0);
  const categoryCount = new Set(documents.map(doc => doc.category).filter(Boolean)).size;
  const imageCount = documents.filter(doc => doc.fileType?.startsWith('image/')).length;

  if (loading) return <LoadingPage label="جارٍ فتح خزنة الوثائق" />;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHero eyebrow="PRIVATE VAULT" title="خزنة الوثائق" description="مساحة منظمة للملفات المهمة مع بحث وفئات ووصول سريع للتنزيل والتعديل." icon={<FolderLock size={20} />} meta={<div className="lifeos-v3-hero-meta"><span className="lifeos-chip">{documents.length} وثيقة</span><span className="lifeos-chip">{categoryCount} فئة</span><span className="lifeos-chip">{formatSize(totalBytes) || '0 KB'} مخزن</span></div>} />

      <div className="lifeos-v3-summary-grid">
        <SummaryCard value={documents.length} label="كل الوثائق" />
        <SummaryCard value={categoryCount} label="الفئات المستخدمة" />
        <SummaryCard value={imageCount} label="صور محفوظة" />
        <SummaryCard value={formatSize(totalBytes) || '0 KB'} label="الحجم التقريبي" />
      </div>

      <RewardCapacityBar rewardKey="documents" currentCount={documents.length} />

      {/* Upload Area */}
      <div className="lifeos-v3-upload-zone">
        <div className="text-center mb-4">
          <Upload size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">رفع وثيقة جديدة</p>
          <p className="text-xs text-muted-foreground">صور، PDF وملفات Office — حتى 20 MB</p>
        </div>
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none"
          />
          {selectedFile && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5">اسم الوثيقة</label>
                <input value={uploadName} onChange={e => setUploadName(e.target.value)} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">الفئة</label>
                <select value={uploadCat} onChange={e => setUploadCat(e.target.value)} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
          {selectedFile && (
            <button
              onClick={uploadDocument}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'جارٍ الرفع...' : 'رفع الوثيقة'}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="lifeos-toolbar flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الوثائق..." className="w-full bg-input-background border border-border rounded-xl py-2 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-input-background border border-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">كل الفئات</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Documents Grid */}
      {filtered.length === 0 ? (
        <AnimatedEmptyState icon={FolderLock} title={documents.length === 0 ? 'الخزنة جاهزة لأول وثيقة' : 'لا توجد نتائج مطابقة'} description={documents.length === 0 ? 'اختر ملفًا مهمًا وابدأ ببناء خزنتك الرقمية المنظمة.' : 'جرّب تغيير عبارة البحث أو اختيار فئة أخرى.'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <div key={doc.id} className="lifeos-v3-document-card group">
              {/* Preview area */}
              <div className="h-32 bg-muted rounded-t-xl flex items-center justify-center relative overflow-hidden">
                {doc.fileType?.startsWith('image/') && doc.url ? (
                  <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {getFileIcon(doc.fileType)}
                    <span className="text-xs text-muted-foreground">{doc.fileType?.split('/').pop()?.toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-foreground text-sm truncate">{doc.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${CAT_COLORS[doc.category] || 'bg-muted text-muted-foreground'}`}>{doc.category}</span>
                  {doc.fileSize && <span className="text-xs text-muted-foreground">{formatSize(doc.fileSize)}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{new Date(doc.createdAt).toLocaleDateString('ar-SA')}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => getDownloadUrl(doc)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                    <Download size={12} /> تنزيل
                  </button>
                  <button type="button" onClick={() => { setEditDoc(doc); setEditDocForm({ name: doc.name || '', category: doc.category || 'عام' }); }} className="lifeos-icon-action hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label={`تعديل ${doc.name}`}>
                    <Edit3 size={13} />
                  </button>
                  <button type="button" onClick={() => deleteDocument(doc.id)} className="lifeos-icon-action hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" aria-label={`حذف ${doc.name}`}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal open={!!editDoc} title="تعديل الوثيقة" onClose={() => setEditDoc(null)}>
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">اسم الوثيقة</label>
            <input value={editDocForm.name} onChange={e => setEditDocForm(v => ({ ...v, name: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">الفئة</label>
            <select value={editDocForm.category} onChange={e => setEditDocForm(v => ({ ...v, category: e.target.value }))} className="w-full bg-input-background border border-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditDoc(null)} className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground">إلغاء</button>
            <button onClick={saveDocumentMeta} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm">حفظ التعديل</button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
