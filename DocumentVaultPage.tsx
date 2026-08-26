import { useState, useEffect, useRef } from 'react';
import { api, apiUpload } from '../../utils/api';
import { toast } from 'sonner';
import { Upload, Trash2, Download, Eye, FolderLock, Search, Loader2, FileText, Image, File } from 'lucide-react';

const CATEGORIES = ['عام', 'شهادات', 'وثائق رسمية', 'صور', 'مشاريع', 'طبي', 'مالي', 'أخرى'];
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
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any>(null);
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
    setSelectedFile(file);
    setUploadName(file.name.replace(/\.[^.]+$/, ''));
  }

  async function uploadDocument() {
    if (!selectedFile) { toast.error('اختر ملفاً'); return; }
    if (!uploadName.trim()) { toast.error('أدخل اسم المستند'); return; }
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

  async function deleteDocument(id: string) {
    if (!confirm('هل تريد حذف هذه الوثيقة نهائياً؟')) return;
    try {
      await api(`/documents/${id}`, { method: 'DELETE' });
      setDocuments(d => d.filter(x => x.id !== id));
      toast.success('تم الحذف');
    } catch { toast.error('فشل الحذف'); }
  }

  async function getDownloadUrl(doc: any) {
    try {
      const { url } = await api(`/documents/${doc.id}/url`);
      window.open(url, '_blank');
    } catch { toast.error('فشل الحصول على الرابط'); }
  }

  const filtered = documents.filter(d => {
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || d.category === filterCat;
    return matchSearch && matchCat;
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FolderLock size={20} className="text-orange-500" /> خزنة الوثائق
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">{documents.length} وثيقة محفوظة</p>
      </div>

      {/* Upload Area */}
      <div className="bg-card rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-all p-5">
        <div className="text-center mb-4">
          <Upload size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">رفع وثيقة جديدة</p>
          <p className="text-xs text-muted-foreground">صور، PDF، وثائق</p>
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
      <div className="flex gap-3 flex-wrap">
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
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <FolderLock size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">{documents.length === 0 ? 'لا توجد وثائق' : 'لا توجد نتائج'}</p>
          <p className="text-sm text-muted-foreground">ارفع وثائقك المهمة لحفظها بأمان</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <div key={doc.id} className="bg-card rounded-xl border border-border hover:border-primary/30 transition-all group">
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
                  <button onClick={() => deleteDocument(doc.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
