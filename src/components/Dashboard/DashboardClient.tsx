'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSavedAlbums, useDocumentStore } from '@/store/documentStore';
import { createDemoAlbum } from '@/lib/demoAlbum';
import { deleteAlbumImages } from '@/lib/imageStore';
import styles from './Dashboard.module.css';

type AlbumSummary = {
  id: string;
  title: string;
  updatedAt: string;
  slideCount: number;
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-QA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

// ─── Folder management (localStorage) ────────────────────────

type Folder = { id: string; name: string; albumIds: string[] };
const FOLDERS_KEY = 'aj-album-folders';

function loadFolders(): Folder[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) ?? '[]'); } catch { return []; }
}
function saveFolders(folders: Folder[]) {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

// ─── Component ───────────────────────────────────────────────

export function DashboardClient() {
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = all
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const router = useRouter();
  const setAlbum = useDocumentStore((s) => s.setAlbum);

  const refreshAlbums = useCallback(() => {
    setAlbums(getSavedAlbums());
    setFolders(loadFolders());
  }, []);

  useEffect(() => {
    refreshAlbums();
    setLoaded(true);
  }, [refreshAlbums]);

  // ── Selection ──
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(visibleAlbums.map(a => a.id)));
  };

  const clearSelection = () => setSelected(new Set());

  // ── Filtered albums ──
  const visibleAlbums = activeFolder
    ? albums.filter(a => folders.find(f => f.id === activeFolder)?.albumIds.includes(a.id))
    : albums;

  // ── Actions ──
  function handleLoadDemo() {
    const demo = createDemoAlbum();
    setAlbum(demo);
    router.push(`/album/${demo.id}`);
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`حذف ${count} ألبوم؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    for (const id of selected) {
      try {
        const key = `aj-album-${id}`;
        const raw = localStorage.getItem(key);
        if (raw) void deleteAlbumImages(raw);
        localStorage.removeItem(key);
      } catch { /* ignore */ }
    }
    // Remove from folders
    const updatedFolders = folders.map(f => ({
      ...f, albumIds: f.albumIds.filter(id => !selected.has(id)),
    }));
    saveFolders(updatedFolders);
    setSelected(new Set());
    refreshAlbums();
  }

  function handleDeleteAlbum(albumId: string, albumTitle: string) {
    if (!confirm(`حذف "${albumTitle}"؟`)) return;
    try {
      const key = `aj-album-${albumId}`;
      const raw = localStorage.getItem(key);
      if (raw) void deleteAlbumImages(raw);
      localStorage.removeItem(key);
      refreshAlbums();
    } catch { /* ignore */ }
  }

  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const folder: Folder = { id: Math.random().toString(36).slice(2), name, albumIds: [] };
    const updated = [...folders, folder];
    saveFolders(updated);
    setFolders(updated);
    setNewFolderName('');
    setShowFolderInput(false);
  }

  function handleCopyToFolder(folderId: string) {
    if (selected.size === 0) return;
    const updated = folders.map(f => {
      if (f.id !== folderId) return f;
      const newIds = new Set(f.albumIds);
      for (const id of selected) newIds.add(id);
      return { ...f, albumIds: [...newIds] };
    });
    saveFolders(updated);
    setFolders(updated);
    setSelected(new Set());
  }

  function handleDeleteFolder(folderId: string) {
    if (!confirm('حذف هذا المجلد؟ الألبومات لن تُحذف.')) return;
    const updated = folders.filter(f => f.id !== folderId);
    saveFolders(updated);
    setFolders(updated);
    if (activeFolder === folderId) setActiveFolder(null);
  }

  const hasSelection = selected.size > 0;

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.platformTitle}>
            <span className={styles.platformName}>منصة الألبوم التحريري</span>
            <span className={styles.platformSub}>Editorial Album Platform</span>
          </div>
          <div className={styles.channelBadge}>الجزيرة</div>
        </div>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        {/* Section header */}
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>ألبوماتي</h1>
          <div className={styles.headerActions}>
            <Link href="/settings" style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 8,
              color: '#8b949e', padding: '8px 16px', fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--brand-font-family)', display: 'inline-flex', alignItems: 'center', gap: 6,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#30363d'; e.currentTarget.style.color = '#e6edf3'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.color = '#8b949e'; }}
            >
              <span style={{ fontSize: 16 }}>&#9881;</span> إعدادات المنصة
            </Link>
            <button type="button" className={styles.demoBtn} onClick={handleLoadDemo}>تحميل النموذج التجريبي</button>
            <Link href="/album/new" className={styles.newAlbumBtn}>+ ألبوم جديد</Link>
          </div>
        </div>

        {/* Folders bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', direction: 'rtl' }}>
          <button type="button" onClick={() => { setActiveFolder(null); clearSelection(); }}
            style={{
              padding: '6px 14px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
              fontFamily: 'var(--brand-font-family)',
              background: !activeFolder ? '#D32F2F' : '#21262d',
              color: !activeFolder ? '#fff' : '#8b949e',
              border: !activeFolder ? '1px solid #D32F2F' : '1px solid #30363d',
            }}>
            الكل ({albums.length})
          </button>
          {folders.map(f => (
            <div key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
              <button type="button" onClick={() => { setActiveFolder(f.id); clearSelection(); }}
                style={{
                  padding: '6px 14px', fontSize: 12, borderRadius: '20px 0 0 20px', cursor: 'pointer',
                  fontFamily: 'var(--brand-font-family)',
                  background: activeFolder === f.id ? '#D32F2F' : '#21262d',
                  color: activeFolder === f.id ? '#fff' : '#8b949e',
                  border: activeFolder === f.id ? '1px solid #D32F2F' : '1px solid #30363d',
                }}>
                {f.name} ({f.albumIds.length})
              </button>
              <button type="button" onClick={() => handleDeleteFolder(f.id)} title="حذف المجلد"
                style={{
                  padding: '6px 8px', fontSize: 11, borderRadius: '0 20px 20px 0', cursor: 'pointer',
                  background: '#21262d', color: '#484f58', border: '1px solid #30363d', borderRight: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f85149'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#484f58'; }}>
                ×
              </button>
            </div>
          ))}
          {!showFolderInput ? (
            <button type="button" onClick={() => setShowFolderInput(true)}
              style={{
                padding: '6px 12px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
                background: 'transparent', color: '#484f58', border: '1px dashed #30363d',
                fontFamily: 'var(--brand-font-family)',
              }}>
              + مجلد
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); }}
                placeholder="اسم المجلد" dir="rtl" autoFocus
                style={{
                  padding: '5px 10px', fontSize: 12, borderRadius: 6,
                  background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3',
                  fontFamily: 'var(--brand-font-family)', width: 120,
                }} />
              <button type="button" onClick={handleCreateFolder}
                style={{ padding: '5px 10px', fontSize: 12, borderRadius: 6, background: '#D32F2F', color: '#fff', border: 'none', cursor: 'pointer' }}>
                &#10003;
              </button>
              <button type="button" onClick={() => { setShowFolderInput(false); setNewFolderName(''); }}
                style={{ padding: '5px 8px', fontSize: 12, borderRadius: 6, background: '#21262d', color: '#8b949e', border: '1px solid #30363d', cursor: 'pointer' }}>
                &#10005;
              </button>
            </div>
          )}
        </div>

        {/* Selection toolbar */}
        {loaded && albums.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16,
            padding: '8px 14px', background: '#161b22', borderRadius: 8,
            border: '1px solid #21262d', direction: 'rtl',
          }}>
            <button type="button" onClick={hasSelection ? clearSelection : selectAll}
              style={{
                padding: '5px 12px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                background: '#21262d', color: '#8b949e', border: '1px solid #30363d',
                fontFamily: 'var(--brand-font-family)',
              }}>
              {hasSelection ? `إلغاء التحديد (${selected.size})` : 'تحديد الكل'}
            </button>

            {hasSelection && (
              <>
                <button type="button" onClick={handleDeleteSelected}
                  style={{
                    padding: '5px 12px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                    background: 'rgba(244,67,54,0.1)', color: '#f85149', border: '1px solid rgba(244,67,54,0.3)',
                    fontFamily: 'var(--brand-font-family)',
                  }}>
                  حذف المحدد ({selected.size})
                </button>

                {folders.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#7d8590' }}>نسخ إلى:</span>
                    {folders.map(f => (
                      <button key={f.id} type="button" onClick={() => handleCopyToFolder(f.id)}
                        style={{
                          padding: '4px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                          background: '#21262d', color: '#8b949e', border: '1px solid #30363d',
                          fontFamily: 'var(--brand-font-family)',
                        }}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <span style={{ fontSize: 12, color: '#484f58', marginRight: 'auto' }}>
              {visibleAlbums.length} ألبوم
            </span>
          </div>
        )}

        {/* Album grid */}
        {!loaded ? (
          <div className={styles.emptyState}>
            <p style={{ color: '#7d8590' }}>جاري التحميل...</p>
          </div>
        ) : visibleAlbums.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="8" width="32" height="32" rx="4" stroke="#30363d" strokeWidth="2" />
                <path d="M16 20h16M16 26h10" stroke="#30363d" strokeWidth="2" strokeLinecap="round" />
                <path d="M32 32l6 6" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>
              {activeFolder ? 'المجلد فارغ' : 'لا توجد ألبومات بعد'}
            </h2>
            <p className={styles.emptyDesc}>
              {activeFolder ? 'حدد ألبومات من "الكل" وانسخها إلى هذا المجلد' : 'ابدأ بإنشاء ألبومك التحريري الأول من نص السكريبت'}
            </p>
            {!activeFolder && (
              <Link href="/album/new" className={styles.emptyCtaBtn}>إنشاء أول ألبوم</Link>
            )}
          </div>
        ) : (
          <div className={styles.albumGrid}>
            {visibleAlbums.map((album) => {
              const isSelected = selected.has(album.id);
              return (
                <div key={album.id} className={styles.albumCard} style={{
                  outline: isSelected ? '2px solid #D32F2F' : '2px solid transparent',
                  outlineOffset: -2, borderRadius: 12,
                  transition: 'outline-color 0.15s',
                }}>
                  {/* Selection checkbox */}
                  <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5 }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleSelect(album.id); }}
                      style={{
                        width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
                        background: isSelected ? '#D32F2F' : 'rgba(0,0,0,0.5)',
                        border: isSelected ? '2px solid #D32F2F' : '2px solid #8b949e',
                        color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0,
                      }}>
                      {isSelected ? '✓' : ''}
                    </button>
                  </div>

                  <div className={styles.cardThumb} style={{ position: 'relative' }}>
                    <div className={styles.cardThumbInner}>
                      <div className={styles.cardThumbBanner} />
                      <div className={styles.cardThumbTitle}>{album.title.slice(0, 30)}</div>
                      <div className={styles.cardThumbFooter} />
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle} dir="rtl" lang="ar">{album.title}</h3>
                    <div className={styles.cardMeta}>
                      <span>{album.slideCount} شريحة</span>
                      <span className={styles.dot}>&middot;</span>
                      <span>{formatDate(album.updatedAt)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Link href={`/album/${album.id}`} className={styles.openBtn}>فتح</Link>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id, album.title); }}
                        style={{
                          background: 'transparent', border: '1px solid #30363d', borderRadius: 5,
                          color: '#7d8590', padding: '7px 12px', fontSize: 13, cursor: 'pointer',
                          fontFamily: 'var(--brand-font-family)', transition: 'color 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#F44336'; (e.target as HTMLElement).style.borderColor = '#F44336'; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#7d8590'; (e.target as HTMLElement).style.borderColor = '#30363d'; }}
                      >حذف</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
