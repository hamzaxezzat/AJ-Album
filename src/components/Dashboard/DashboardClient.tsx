'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSavedAlbums, useDocumentStore } from '@/store/documentStore';
import { createDemoAlbum } from '@/lib/demoAlbum';
import { deleteAlbumImages } from '@/lib/imageStore';
import styles from './Dashboard.module.css';

type AlbumSummary = { id: string; title: string; updatedAt: string; slideCount: number };

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-QA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch { return iso.slice(0, 10); }
}

// ─── Folder management ───────────────────────────────────────

type Folder = { id: string; name: string; albumIds: string[] };
const FOLDERS_KEY = 'aj-album-folders';

function loadFolders(): Folder[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) ?? '[]'); } catch { return []; }
}
function saveFolders(folders: Folder[]) {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

function getAlbumFolder(folders: Folder[], albumId: string): Folder | undefined {
  return folders.find(f => f.albumIds.includes(albumId));
}

function getMovedIds(folders: Folder[]): Set<string> {
  const s = new Set<string>();
  for (const f of folders) for (const id of f.albumIds) s.add(id);
  return s;
}

// ─── Component ───────────────────────────────────────────────

export function DashboardClient() {
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggingAlbum, setDraggingAlbum] = useState<string | null>(null);
  const router = useRouter();
  const setAlbum = useDocumentStore((s) => s.setAlbum);

  const refreshAlbums = useCallback(() => {
    setAlbums(getSavedAlbums());
    setFolders(loadFolders());
  }, []);

  useEffect(() => { refreshAlbums(); setLoaded(true); }, [refreshAlbums]);

  const movedIds = getMovedIds(folders);

  // ── Selection ──
  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const hasSelection = selected.size > 0;

  // ── Visible albums ──
  const visibleAlbums = activeFolder
    ? albums.filter(a => folders.find(f => f.id === activeFolder)?.albumIds.includes(a.id))
    : albums.filter(a => !movedIds.has(a.id));

  // Recent 4 (only when not viewing a folder)
  const recentAlbums = !activeFolder ? albums.slice(0, 4) : [];

  // ── Actions ──
  function handleLoadDemo() {
    const demo = createDemoAlbum();
    setAlbum(demo);
    router.push(`/album/${demo.id}`);
  }

  function handleDeleteAlbum(albumId: string, albumTitle: string) {
    if (!confirm(`حذف "${albumTitle}"؟`)) return;
    try {
      const key = `aj-album-${albumId}`;
      const raw = localStorage.getItem(key);
      if (raw) void deleteAlbumImages(raw);
      localStorage.removeItem(key);
      const updated = folders.map(f => ({ ...f, albumIds: f.albumIds.filter(id => id !== albumId) }));
      saveFolders(updated);
      setSelected(prev => { const n = new Set(prev); n.delete(albumId); return n; });
      refreshAlbums();
    } catch { /* ignore */ }
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`حذف ${selected.size} ألبوم؟`)) return;
    for (const id of selected) {
      try {
        const key = `aj-album-${id}`;
        const raw = localStorage.getItem(key);
        if (raw) void deleteAlbumImages(raw);
        localStorage.removeItem(key);
      } catch { /* ignore */ }
    }
    const updated = folders.map(f => ({ ...f, albumIds: f.albumIds.filter(id => !selected.has(id)) }));
    saveFolders(updated);
    setSelected(new Set());
    refreshAlbums();
  }

  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const updated = [...folders, { id: Math.random().toString(36).slice(2), name, albumIds: [] as string[] }];
    saveFolders(updated);
    setFolders(updated);
    setNewFolderName('');
    setEditingFolder(false);
  }

  function handleDeleteFolder(folderId: string) {
    if (!confirm('حذف المجلد؟ الألبومات سترجع للرئيسية.')) return;
    const updated = folders.filter(f => f.id !== folderId);
    saveFolders(updated);
    setFolders(updated);
    if (activeFolder === folderId) setActiveFolder(null);
  }

  function handleMoveToFolder(folderId: string, albumIds: string[]) {
    const updated = folders.map(f => ({
      ...f,
      albumIds: f.id === folderId
        ? [...new Set([...f.albumIds, ...albumIds])]
        : f.albumIds.filter(id => !albumIds.includes(id)),
    }));
    saveFolders(updated);
    setFolders(updated);
    setSelected(new Set());
  }

  function handleMoveToRoot(albumIds: string[]) {
    const updated = folders.map(f => ({ ...f, albumIds: f.albumIds.filter(id => !albumIds.includes(id)) }));
    saveFolders(updated);
    setFolders(updated);
    setSelected(new Set());
  }

  // ── Drag ──
  function onAlbumDragStart(albumId: string) { setDraggingAlbum(albumId); }
  function onAlbumDragEnd() { setDraggingAlbum(null); setDragOverFolder(null); }
  function onFolderDrop(folderId: string) {
    const ids = draggingAlbum ? (selected.has(draggingAlbum) ? [...selected] : [draggingAlbum]) : [];
    if (ids.length > 0) handleMoveToFolder(folderId, ids);
    onAlbumDragEnd();
  }

  // ── Album card ──
  function AlbumCard({ album, showFolder }: { album: AlbumSummary; showFolder?: boolean }) {
    const isSelected = selected.has(album.id);
    const folder = showFolder ? getAlbumFolder(folders, album.id) : undefined;
    return (
      <div className={styles.albumCard}
        draggable onDragStart={() => onAlbumDragStart(album.id)} onDragEnd={onAlbumDragEnd}
        style={{
          outline: isSelected ? '2px solid #D32F2F' : '2px solid transparent',
          outlineOffset: -2, borderRadius: 12, cursor: 'grab',
          opacity: draggingAlbum === album.id ? 0.4 : 1,
          position: 'relative', transition: 'outline-color 0.15s, opacity 0.15s',
        }}>
        {/* Checkbox */}
        <button type="button" onClick={e => { e.stopPropagation(); toggleSelect(album.id); }}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 5,
            width: 22, height: 22, borderRadius: 5, cursor: 'pointer', padding: 0,
            background: isSelected ? '#D32F2F' : 'rgba(0,0,0,0.5)',
            border: isSelected ? '2px solid #D32F2F' : '2px solid #666',
            color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {isSelected ? '✓' : ''}
        </button>
        {/* Folder badge */}
        {folder && (
          <span style={{
            position: 'absolute', top: 8, left: 8, zIndex: 5,
            background: 'rgba(0,0,0,0.6)', color: '#8b949e', fontSize: 10,
            padding: '2px 8px', borderRadius: 10, fontFamily: 'var(--brand-font-family)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <span style={{ fontSize: 11 }}>&#128193;</span> {folder.name}
          </span>
        )}
        <div className={styles.cardThumb}>
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
            <button type="button" onClick={e => { e.stopPropagation(); handleDeleteAlbum(album.id, album.title); }}
              style={{
                background: 'transparent', border: '1px solid #30363d', borderRadius: 5,
                color: '#7d8590', padding: '7px 12px', fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--brand-font-family)',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#F44336'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#7d8590'; }}>
              حذف
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.platformTitle}>
            <span className={styles.platformName}>منصة الألبوم التحريري</span>
            <span className={styles.platformSub}>Editorial Album Platform</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/settings" style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
              color: '#8b949e', padding: '6px 12px', fontSize: 12, display: 'inline-flex',
              alignItems: 'center', gap: 5, textDecoration: 'none', fontFamily: 'var(--brand-font-family)',
            }}>
              <span style={{ fontSize: 14 }}>&#9881;</span> إعدادات
            </Link>
            <div className={styles.channelBadge}>الجزيرة</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Sidebar (toggle) ── */}
        {showSidebar && (
          <aside style={{
            width: 220, background: '#0d1117', borderLeft: '1px solid #21262d',
            display: 'flex', flexDirection: 'column', flexShrink: 0, direction: 'rtl',
          }}>
            <div style={{ padding: '12px 16px', fontSize: 12, color: '#7d8590', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>المجلدات</span>
              <button type="button" onClick={() => setShowSidebar(false)}
                style={{ background: 'none', border: 'none', color: '#484f58', fontSize: 16, cursor: 'pointer' }}>&#10005;</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              <button type="button"
                onClick={() => { setActiveFolder(null); setSelected(new Set()); }}
                onDragOver={e => { e.preventDefault(); setDragOverFolder('__root__'); }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={() => { const ids = draggingAlbum ? (selected.has(draggingAlbum) ? [...selected] : [draggingAlbum]) : []; if (ids.length) handleMoveToRoot(ids); onAlbumDragEnd(); }}
                style={{
                  width: '100%', padding: '10px 16px', fontSize: 13, cursor: 'pointer', border: 'none', textAlign: 'right',
                  fontFamily: 'var(--brand-font-family)',
                  background: !activeFolder ? 'rgba(211,47,47,0.1)' : dragOverFolder === '__root__' ? 'rgba(33,150,243,0.1)' : 'transparent',
                  color: !activeFolder ? '#ef5350' : '#c9d1d9',
                  borderRight: !activeFolder ? '3px solid #D32F2F' : '3px solid transparent',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                <span>الرئيسية</span>
                <span style={{ fontSize: 11, color: '#484f58' }}>{albums.filter(a => !movedIds.has(a.id)).length}</span>
              </button>
              {folders.map(f => (
                <button key={f.id} type="button"
                  onClick={() => { setActiveFolder(f.id); setSelected(new Set()); }}
                  onDragOver={e => { e.preventDefault(); setDragOverFolder(f.id); }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={() => onFolderDrop(f.id)}
                  style={{
                    width: '100%', padding: '10px 16px', fontSize: 13, cursor: 'pointer', border: 'none', textAlign: 'right',
                    fontFamily: 'var(--brand-font-family)', transition: 'all 0.1s',
                    background: activeFolder === f.id ? 'rgba(211,47,47,0.1)' : dragOverFolder === f.id ? 'rgba(33,150,243,0.15)' : 'transparent',
                    color: activeFolder === f.id ? '#ef5350' : '#c9d1d9',
                    borderRight: activeFolder === f.id ? '3px solid #D32F2F' : dragOverFolder === f.id ? '3px solid #2196F3' : '3px solid transparent',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                  <span>&#128193; {f.name}</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#484f58' }}>{f.albumIds.length}</span>
                    <span onClick={e => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                      style={{ fontSize: 12, color: '#484f58', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.color = '#f85149'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.color = '#484f58'; }}>×</span>
                  </div>
                </button>
              ))}
              {editingFolder ? (
                <div style={{ padding: '8px 12px', display: 'flex', gap: 4 }}>
                  <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setEditingFolder(false); }}
                    placeholder="اسم المجلد" dir="rtl" autoFocus
                    style={{ flex: 1, padding: '6px 8px', fontSize: 12, borderRadius: 4, background: '#161b22', border: '1px solid #30363d', color: '#e6edf3', fontFamily: 'var(--brand-font-family)' }} />
                  <button type="button" onClick={handleCreateFolder}
                    style={{ padding: '6px 8px', fontSize: 12, borderRadius: 4, background: '#D32F2F', color: '#fff', border: 'none', cursor: 'pointer' }}>&#10003;</button>
                </div>
              ) : (
                <button type="button" onClick={() => setEditingFolder(true)}
                  style={{ width: '100%', padding: '10px 16px', fontSize: 12, cursor: 'pointer', background: 'transparent', color: '#484f58', border: 'none', textAlign: 'right', fontFamily: 'var(--brand-font-family)' }}>
                  + مجلد جديد
                </button>
              )}
            </div>
          </aside>
        )}

        {/* ── Main content ── */}
        <main className={styles.main} style={{ flex: 1, overflow: 'auto' }}>
          {/* Header */}
          <div className={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={() => setShowSidebar(!showSidebar)} title="المجلدات"
                style={{
                  background: showSidebar ? '#D32F2F' : '#21262d', border: showSidebar ? '1px solid #D32F2F' : '1px solid #30363d',
                  borderRadius: 6, color: showSidebar ? '#fff' : '#8b949e', padding: '6px 10px', fontSize: 16,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                }}>
                &#128193;
              </button>
              <h1 className={styles.sectionTitle}>
                {activeFolder ? folders.find(f => f.id === activeFolder)?.name ?? 'مجلد' : 'ألبوماتي'}
              </h1>
            </div>
            <div className={styles.headerActions}>
              <button type="button" className={styles.demoBtn} onClick={handleLoadDemo}>نموذج تجريبي</button>
              <Link href="/album/new" className={styles.newAlbumBtn}>+ ألبوم جديد</Link>
            </div>
          </div>

          {/* Selection bar */}
          {loaded && visibleAlbums.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, direction: 'rtl' }}>
              <button type="button" onClick={hasSelection ? () => setSelected(new Set()) : () => setSelected(new Set(visibleAlbums.map(a => a.id)))}
                style={{
                  padding: '5px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                  background: hasSelection ? '#D32F2F' : '#21262d', color: hasSelection ? '#fff' : '#8b949e',
                  border: hasSelection ? '1px solid #D32F2F' : '1px solid #30363d', fontFamily: 'var(--brand-font-family)',
                }}>
                {hasSelection ? `إلغاء (${selected.size})` : 'تحديد الكل'}
              </button>
              {hasSelection && (
                <>
                  <button type="button" onClick={handleDeleteSelected}
                    style={{
                      padding: '5px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                      background: 'rgba(244,67,54,0.1)', color: '#f85149', border: '1px solid rgba(244,67,54,0.3)',
                      fontFamily: 'var(--brand-font-family)',
                    }}>
                    حذف ({selected.size})
                  </button>
                  {activeFolder ? (
                    <button type="button" onClick={() => handleMoveToRoot([...selected])}
                      style={{ padding: '5px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', fontFamily: 'var(--brand-font-family)' }}>
                      نقل للرئيسية
                    </button>
                  ) : folders.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#7d8590' }}>نقل إلى:</span>
                      {folders.map(f => (
                        <button key={f.id} type="button" onClick={() => handleMoveToFolder(f.id, [...selected])}
                          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', fontFamily: 'var(--brand-font-family)' }}>
                          {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <span style={{ fontSize: 12, color: '#484f58', marginRight: 'auto' }}>{visibleAlbums.length} ألبوم</span>
            </div>
          )}

          {!loaded ? (
            <div className={styles.emptyState}><p style={{ color: '#7d8590' }}>جاري التحميل...</p></div>
          ) : !activeFolder ? (
            /* ── Main view: Recent + Folders + All ── */
            <>
              {/* Recent albums (top 4) */}
              {recentAlbums.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#8b949e', marginBottom: 12, fontFamily: 'var(--brand-font-family)', direction: 'rtl' }}>
                    الأخيرة
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {recentAlbums.map(album => <AlbumCard key={album.id} album={album} showFolder />)}
                  </div>
                </div>
              )}

              {/* Folders section */}
              {folders.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#8b949e', marginBottom: 12, fontFamily: 'var(--brand-font-family)', direction: 'rtl' }}>
                    المجلدات
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                    {folders.map(f => (
                      <button key={f.id} type="button"
                        onClick={() => { setActiveFolder(f.id); setSelected(new Set()); }}
                        onDragOver={e => { e.preventDefault(); setDragOverFolder(f.id); }}
                        onDragLeave={() => setDragOverFolder(null)}
                        onDrop={() => onFolderDrop(f.id)}
                        style={{
                          padding: '16px 20px', background: dragOverFolder === f.id ? 'rgba(33,150,243,0.1)' : '#161b22',
                          border: dragOverFolder === f.id ? '1px solid #2196F3' : '1px solid #21262d',
                          borderRadius: 10, cursor: 'pointer', textAlign: 'right', direction: 'rtl',
                          fontFamily: 'var(--brand-font-family)', transition: 'all 0.15s',
                          display: 'flex', flexDirection: 'column', gap: 6,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = '#1a1f27'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.background = '#161b22'; }}>
                        <span style={{ fontSize: 28 }}>&#128193;</span>
                        <span style={{ fontSize: 14, color: '#e6edf3', fontWeight: 600 }}>{f.name}</span>
                        <span style={{ fontSize: 11, color: '#484f58' }}>{f.albumIds.length} ألبوم</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All unfoldered albums */}
              {visibleAlbums.length > 0 && (
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#8b949e', marginBottom: 12, fontFamily: 'var(--brand-font-family)', direction: 'rtl' }}>
                    {folders.length > 0 ? 'بدون مجلد' : 'جميع الألبومات'}
                  </h2>
                  <div className={styles.albumGrid}>
                    {visibleAlbums.map(album => <AlbumCard key={album.id} album={album} />)}
                  </div>
                </div>
              )}

              {albums.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <rect x="8" y="8" width="32" height="32" rx="4" stroke="#30363d" strokeWidth="2" />
                      <path d="M16 20h16M16 26h10" stroke="#30363d" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h2 className={styles.emptyTitle}>لا توجد ألبومات</h2>
                  <p className={styles.emptyDesc}>ابدأ بإنشاء ألبومك الأول</p>
                  <Link href="/album/new" className={styles.emptyCtaBtn}>إنشاء أول ألبوم</Link>
                </div>
              )}
            </>
          ) : (
            /* ── Folder view ── */
            visibleAlbums.length === 0 ? (
              <div className={styles.emptyState}>
                <span style={{ fontSize: 48 }}>&#128193;</span>
                <h2 className={styles.emptyTitle}>المجلد فارغ</h2>
                <p className={styles.emptyDesc}>اسحب ألبومات من الرئيسية إلى هنا</p>
              </div>
            ) : (
              <div className={styles.albumGrid}>
                {visibleAlbums.map(album => <AlbumCard key={album.id} album={album} />)}
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
