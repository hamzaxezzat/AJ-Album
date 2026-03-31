'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
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
const PAGE_SIZE = 12;

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

// ─── Component ───────────────────────────────────────────────

export function DashboardClient() {
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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

  // ── Filtered albums ──
  const filteredAlbums = useMemo(() => {
    let list = albums;
    if (activeFolder) {
      const folder = folders.find(f => f.id === activeFolder);
      list = folder ? albums.filter(a => folder.albumIds.includes(a.id)) : [];
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [albums, activeFolder, folders, search]);

  const paginatedAlbums = filteredAlbums.slice(0, visibleCount);
  const hasMore = filteredAlbums.length > visibleCount;
  const recentAlbums = !activeFolder && !search.trim() ? albums.slice(0, 4) : [];

  // Reset pagination when filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeFolder, search]);

  // ── Selection ──
  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const hasSelection = selected.size > 0;

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
    if (!selected.size) return;
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

  function handleDeleteFolder(folderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('حذف المجلد؟')) return;
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

  function handleRemoveFromFolder(albumIds: string[]) {
    const updated = folders.map(f => ({ ...f, albumIds: f.albumIds.filter(id => !albumIds.includes(id)) }));
    saveFolders(updated);
    setFolders(updated);
    setSelected(new Set());
  }

  // ── Drag ──
  function onDragStart(albumId: string) { setDraggingAlbum(albumId); }
  function onDragEnd() { setDraggingAlbum(null); setDragOverFolder(null); }
  function onFolderDrop(folderId: string) {
    const ids = draggingAlbum ? (selected.has(draggingAlbum) ? [...selected] : [draggingAlbum]) : [];
    if (ids.length) handleMoveToFolder(folderId, ids);
    onDragEnd();
  }

  // ── Album card ──
  function AlbumCard({ album }: { album: AlbumSummary }) {
    const isSelected = selected.has(album.id);
    const folder = getAlbumFolder(folders, album.id);
    return (
      <div className={styles.albumCard}
        draggable onDragStart={() => onDragStart(album.id)} onDragEnd={onDragEnd}
        style={{
          outline: isSelected ? '2px solid #D32F2F' : '2px solid transparent',
          outlineOffset: -2, borderRadius: 12, cursor: 'grab',
          opacity: draggingAlbum === album.id ? 0.4 : 1,
          position: 'relative', transition: 'all 0.15s',
        }}>
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
        {folder && (
          <span style={{
            position: 'absolute', top: 8, left: 8, zIndex: 5,
            background: 'rgba(0,0,0,0.6)', color: '#8b949e', fontSize: 10,
            padding: '2px 8px', borderRadius: 10, fontFamily: 'var(--brand-font-family)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            &#128193; {folder.name}
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
              &#9881; إعدادات
            </Link>
            <div className={styles.channelBadge}>الجزيرة</div>
          </div>
        </div>
      </header>

      <main className={styles.main} style={{ overflow: 'auto' }}>
        {/* Header + search */}
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>
            {activeFolder ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => { setActiveFolder(null); setSelected(new Set()); }}
                  style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: 18, cursor: 'pointer' }}>&#8594;</button>
                &#128193; {folders.find(f => f.id === activeFolder)?.name}
              </span>
            ) : 'ألبوماتي'}
          </h1>
          <div className={styles.headerActions}>
            <button type="button" className={styles.demoBtn} onClick={handleLoadDemo}>نموذج تجريبي</button>
            <Link href="/album/new" className={styles.newAlbumBtn}>+ ألبوم جديد</Link>
          </div>
        </div>

        {/* Search bar */}
        {loaded && albums.length > 3 && (
          <div style={{ marginBottom: 16, direction: 'rtl' }}>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم..." dir="rtl"
              style={{
                width: '100%', maxWidth: 400, padding: '10px 14px', fontSize: 14,
                background: '#161b22', border: '1px solid #21262d', borderRadius: 8,
                color: '#e6edf3', fontFamily: 'var(--brand-font-family)',
              }}
            />
          </div>
        )}

        {/* Selection bar */}
        {hasSelection && (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16,
            padding: '8px 14px', background: '#161b22', borderRadius: 8, border: '1px solid #21262d', direction: 'rtl',
          }}>
            <button type="button" onClick={() => setSelected(new Set())}
              style={{ padding: '5px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer', background: '#D32F2F', color: '#fff', border: '1px solid #D32F2F', fontFamily: 'var(--brand-font-family)' }}>
              إلغاء ({selected.size})
            </button>
            <button type="button" onClick={handleDeleteSelected}
              style={{ padding: '5px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer', background: 'rgba(244,67,54,0.1)', color: '#f85149', border: '1px solid rgba(244,67,54,0.3)', fontFamily: 'var(--brand-font-family)' }}>
              حذف ({selected.size})
            </button>
            {activeFolder ? (
              <button type="button" onClick={() => handleRemoveFromFolder([...selected])}
                style={{ padding: '5px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', fontFamily: 'var(--brand-font-family)' }}>
                إزالة من المجلد
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
          </div>
        )}

        {!loaded ? (
          <div className={styles.emptyState}><p style={{ color: '#7d8590' }}>جاري التحميل...</p></div>
        ) : albums.length === 0 ? (
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
        ) : !activeFolder ? (
          /* ── Main view ── */
          <>
            {/* Recent albums */}
            {recentAlbums.length > 0 && !search.trim() && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#7d8590', marginBottom: 12, direction: 'rtl', fontFamily: 'var(--brand-font-family)' }}>
                  الأخيرة
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {recentAlbums.map(a => <AlbumCard key={'r-' + a.id} album={a} />)}
                </div>
              </div>
            )}

            {/* Folders */}
            {folders.length > 0 && !search.trim() && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, direction: 'rtl' }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: '#7d8590', fontFamily: 'var(--brand-font-family)', margin: 0 }}>المجلدات</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {folders.map(f => (
                    <button key={f.id} type="button"
                      onClick={() => { setActiveFolder(f.id); setSelected(new Set()); setSearch(''); }}
                      onDragOver={e => { e.preventDefault(); setDragOverFolder(f.id); }}
                      onDragLeave={() => setDragOverFolder(null)}
                      onDrop={() => onFolderDrop(f.id)}
                      style={{
                        padding: '14px 16px', textAlign: 'right', direction: 'rtl', cursor: 'pointer',
                        background: dragOverFolder === f.id ? 'rgba(33,150,243,0.1)' : '#161b22',
                        border: dragOverFolder === f.id ? '1px solid #2196F3' : '1px solid #21262d',
                        borderRadius: 10, fontFamily: 'var(--brand-font-family)', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1a1f27'; e.currentTarget.style.borderColor = '#30363d'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.borderColor = '#21262d'; }}>
                      <span style={{ fontSize: 24 }}>&#128193;</span>
                      <div>
                        <div style={{ fontSize: 13, color: '#e6edf3', fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: '#484f58' }}>{f.albumIds.length} ألبوم</div>
                      </div>
                      <span onClick={e => handleDeleteFolder(f.id, e)}
                        style={{ marginRight: 'auto', fontSize: 14, color: '#484f58', cursor: 'pointer', padding: '0 4px' }}
                        onMouseEnter={e => { (e.target as HTMLElement).style.color = '#f85149'; }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.color = '#484f58'; }}>×</span>
                    </button>
                  ))}
                  {/* New folder button */}
                  {editingFolder ? (
                    <div style={{ display: 'flex', gap: 4, padding: '14px 12px', background: '#161b22', border: '1px solid #21262d', borderRadius: 10, alignItems: 'center' }}>
                      <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setEditingFolder(false); }}
                        placeholder="اسم المجلد" dir="rtl" autoFocus
                        style={{ flex: 1, padding: '6px 8px', fontSize: 12, borderRadius: 4, background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', fontFamily: 'var(--brand-font-family)' }} />
                      <button type="button" onClick={handleCreateFolder}
                        style={{ padding: '6px 8px', borderRadius: 4, background: '#D32F2F', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}>&#10003;</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setEditingFolder(true)}
                      style={{
                        padding: '14px 16px', textAlign: 'center', cursor: 'pointer',
                        background: 'transparent', border: '1px dashed #30363d', borderRadius: 10,
                        color: '#484f58', fontSize: 13, fontFamily: 'var(--brand-font-family)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                      + مجلد جديد
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* All albums / search results */}
            {filteredAlbums.length > 0 && (
              <div>
                {!search.trim() && recentAlbums.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, direction: 'rtl' }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, color: '#7d8590', fontFamily: 'var(--brand-font-family)', margin: 0 }}>
                      جميع الألبومات
                    </h2>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button type="button" onClick={hasSelection ? () => setSelected(new Set()) : () => setSelected(new Set(filteredAlbums.map(a => a.id)))}
                        style={{ padding: '4px 12px', fontSize: 11, borderRadius: 4, cursor: 'pointer', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', fontFamily: 'var(--brand-font-family)' }}>
                        {hasSelection ? 'إلغاء الكل' : 'تحديد الكل'}
                      </button>
                      <span style={{ fontSize: 12, color: '#484f58' }}>{filteredAlbums.length} ألبوم</span>
                    </div>
                  </div>
                )}
                {search.trim() && (
                  <p style={{ fontSize: 13, color: '#7d8590', marginBottom: 12, direction: 'rtl' }}>
                    {filteredAlbums.length} نتيجة لـ "{search.trim()}"
                  </p>
                )}
                <div className={styles.albumGrid}>
                  {paginatedAlbums.map(a => <AlbumCard key={a.id} album={a} />)}
                </div>
                {hasMore && (
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button type="button" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                      style={{
                        padding: '10px 32px', fontSize: 14, borderRadius: 8, cursor: 'pointer',
                        background: '#21262d', color: '#8b949e', border: '1px solid #30363d',
                        fontFamily: 'var(--brand-font-family)',
                      }}>
                      عرض المزيد ({filteredAlbums.length - visibleCount} متبقي)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* No folders yet — show create button */}
            {folders.length === 0 && albums.length > 0 && !search.trim() && (
              <div style={{ marginTop: 20, direction: 'rtl' }}>
                {editingFolder ? (
                  <div style={{ display: 'flex', gap: 4, maxWidth: 300 }}>
                    <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setEditingFolder(false); }}
                      placeholder="اسم المجلد" dir="rtl" autoFocus
                      style={{ flex: 1, padding: '8px 12px', fontSize: 13, borderRadius: 6, background: '#161b22', border: '1px solid #30363d', color: '#e6edf3', fontFamily: 'var(--brand-font-family)' }} />
                    <button type="button" onClick={handleCreateFolder}
                      style={{ padding: '8px 14px', borderRadius: 6, background: '#D32F2F', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>إنشاء</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setEditingFolder(true)}
                    style={{
                      padding: '8px 16px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                      background: 'transparent', color: '#484f58', border: '1px dashed #30363d',
                      fontFamily: 'var(--brand-font-family)', display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                    &#128193; + إنشاء مجلد
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          /* ── Folder view ── */
          filteredAlbums.length === 0 ? (
            <div className={styles.emptyState}>
              <span style={{ fontSize: 48 }}>&#128193;</span>
              <h2 className={styles.emptyTitle}>المجلد فارغ</h2>
              <p className={styles.emptyDesc}>اسحب ألبومات من الرئيسية إلى هنا</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, direction: 'rtl' }}>
                <span style={{ fontSize: 12, color: '#484f58' }}>{filteredAlbums.length} ألبوم</span>
                <button type="button" onClick={hasSelection ? () => setSelected(new Set()) : () => setSelected(new Set(filteredAlbums.map(a => a.id)))}
                  style={{ padding: '4px 12px', fontSize: 11, borderRadius: 4, cursor: 'pointer', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', fontFamily: 'var(--brand-font-family)' }}>
                  {hasSelection ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
              </div>
              <div className={styles.albumGrid}>
                {paginatedAlbums.map(a => <AlbumCard key={a.id} album={a} />)}
              </div>
              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <button type="button" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    style={{ padding: '10px 32px', fontSize: 14, borderRadius: 8, cursor: 'pointer', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', fontFamily: 'var(--brand-font-family)' }}>
                    عرض المزيد ({filteredAlbums.length - visibleCount} متبقي)
                  </button>
                </div>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}
