'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
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

// Get all album IDs that are inside any folder (moved albums)
function getMovedAlbumIds(folders: Folder[]): Set<string> {
  const ids = new Set<string>();
  for (const f of folders) for (const id of f.albumIds) ids.add(id);
  return ids;
}

// ─── Component ───────────────────────────────────────────────

export function DashboardClient() {
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
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

  const movedIds = getMovedAlbumIds(folders);

  // Visible albums based on active folder
  const visibleAlbums = activeFolder
    ? albums.filter(a => folders.find(f => f.id === activeFolder)?.albumIds.includes(a.id))
    : albums.filter(a => !movedIds.has(a.id)); // "All" shows only unmoved albums

  // ── Selection ──
  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => setSelected(new Set(visibleAlbums.map(a => a.id)));
  const clearSelection = () => setSelected(new Set());
  const hasSelection = selected.size > 0;

  // ── Album actions ──
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
      // Remove from folders
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

  // ── Folder actions ──
  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const folder: Folder = { id: Math.random().toString(36).slice(2), name, albumIds: [] };
    const updated = [...folders, folder];
    saveFolders(updated);
    setFolders(updated);
    setNewFolderName('');
    setEditingFolder(null);
  }

  function handleDeleteFolder(folderId: string) {
    if (!confirm('حذف المجلد؟ الألبومات سترجع إلى الرئيسية.')) return;
    const updated = folders.filter(f => f.id !== folderId);
    saveFolders(updated);
    setFolders(updated);
    if (activeFolder === folderId) setActiveFolder(null);
  }

  function handleMoveToFolder(folderId: string, albumIds: string[]) {
    // Remove from all folders first, then add to target
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
    // Remove from all folders
    const updated = folders.map(f => ({ ...f, albumIds: f.albumIds.filter(id => !albumIds.includes(id)) }));
    saveFolders(updated);
    setFolders(updated);
    setSelected(new Set());
  }

  // ── Drag & Drop ──
  function handleAlbumDragStart(albumId: string) {
    setDraggingAlbum(albumId);
    // If dragging a selected item, drag all selected
  }

  function handleFolderDragOver(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    setDragOverFolder(folderId);
  }

  function handleFolderDrop(folderId: string) {
    const ids = draggingAlbum
      ? (selected.has(draggingAlbum) ? [...selected] : [draggingAlbum])
      : [];
    if (ids.length > 0) handleMoveToFolder(folderId, ids);
    setDraggingAlbum(null);
    setDragOverFolder(null);
  }

  function handleRootDrop() {
    const ids = draggingAlbum
      ? (selected.has(draggingAlbum) ? [...selected] : [draggingAlbum])
      : [];
    if (ids.length > 0) handleMoveToRoot(ids);
    setDraggingAlbum(null);
    setDragOverFolder(null);
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
              alignItems: 'center', gap: 5, textDecoration: 'none',
              fontFamily: 'var(--brand-font-family)',
            }}>
              <span style={{ fontSize: 14 }}>&#9881;</span> إعدادات
            </Link>
            <div className={styles.channelBadge}>الجزيرة</div>
          </div>
        </div>
      </header>

      {/* Main layout: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar: Folders ── */}
        <aside style={{
          width: 220, background: '#0d1117', borderLeft: '1px solid #21262d',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          direction: 'rtl', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', fontSize: 11, color: '#7d8590', borderBottom: '1px solid #21262d', fontFamily: 'system-ui' }}>
            المجلدات
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {/* All (root) */}
            <button type="button"
              onClick={() => { setActiveFolder(null); clearSelection(); }}
              onDragOver={e => { e.preventDefault(); setDragOverFolder('__root__'); }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={() => handleRootDrop()}
              style={{
                width: '100%', padding: '10px 16px', fontSize: 13, cursor: 'pointer',
                background: !activeFolder ? 'rgba(211,47,47,0.1)' : dragOverFolder === '__root__' ? 'rgba(33,150,243,0.1)' : 'transparent',
                color: !activeFolder ? '#ef5350' : '#c9d1d9',
                border: 'none', textAlign: 'right', fontFamily: 'var(--brand-font-family)',
                borderRight: !activeFolder ? '3px solid #D32F2F' : '3px solid transparent',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
              <span>الرئيسية</span>
              <span style={{ fontSize: 11, color: '#484f58' }}>
                {albums.filter(a => !movedIds.has(a.id)).length}
              </span>
            </button>

            {/* Folder list */}
            {folders.map(f => (
              <button key={f.id} type="button"
                onClick={() => { setActiveFolder(f.id); clearSelection(); }}
                onDragOver={e => handleFolderDragOver(e, f.id)}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={() => handleFolderDrop(f.id)}
                style={{
                  width: '100%', padding: '10px 16px', fontSize: 13, cursor: 'pointer',
                  background: activeFolder === f.id ? 'rgba(211,47,47,0.1)' : dragOverFolder === f.id ? 'rgba(33,150,243,0.15)' : 'transparent',
                  color: activeFolder === f.id ? '#ef5350' : '#c9d1d9',
                  border: 'none', textAlign: 'right', fontFamily: 'var(--brand-font-family)',
                  borderRight: activeFolder === f.id ? '3px solid #D32F2F' : dragOverFolder === f.id ? '3px solid #2196F3' : '3px solid transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.1s',
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>&#128193;</span>
                  {f.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#484f58' }}>{f.albumIds.length}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.color = '#f85149'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.color = '#484f58'; }}
                    style={{ fontSize: 12, color: '#484f58', cursor: 'pointer', padding: '0 2px' }}>
                    ×
                  </span>
                </div>
              </button>
            ))}

            {/* New folder */}
            {editingFolder === 'new' ? (
              <div style={{ padding: '8px 12px', display: 'flex', gap: 4 }}>
                <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setEditingFolder(null); }}
                  placeholder="اسم المجلد" dir="rtl" autoFocus
                  style={{
                    flex: 1, padding: '6px 8px', fontSize: 12, borderRadius: 4,
                    background: '#161b22', border: '1px solid #30363d', color: '#e6edf3',
                    fontFamily: 'var(--brand-font-family)',
                  }} />
                <button type="button" onClick={handleCreateFolder}
                  style={{ padding: '6px 8px', fontSize: 12, borderRadius: 4, background: '#D32F2F', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  &#10003;
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingFolder('new')}
                style={{
                  width: '100%', padding: '10px 16px', fontSize: 12, cursor: 'pointer',
                  background: 'transparent', color: '#484f58', border: 'none', textAlign: 'right',
                  fontFamily: 'var(--brand-font-family)',
                }}>
                + مجلد جديد
              </button>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className={styles.main} style={{ flex: 1, overflow: 'auto' }}>
          {/* Header */}
          <div className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>
              {activeFolder ? folders.find(f => f.id === activeFolder)?.name ?? 'مجلد' : 'ألبوماتي'}
            </h1>
            <div className={styles.headerActions}>
              <button type="button" className={styles.demoBtn} onClick={handleLoadDemo}>نموذج تجريبي</button>
              <Link href="/album/new" className={styles.newAlbumBtn}>+ ألبوم جديد</Link>
            </div>
          </div>

          {/* Selection bar */}
          {loaded && visibleAlbums.length > 0 && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16,
              direction: 'rtl', fontSize: 13,
            }}>
              <button type="button" onClick={hasSelection ? clearSelection : selectAll}
                style={{
                  padding: '5px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                  background: hasSelection ? '#D32F2F' : '#21262d',
                  color: hasSelection ? '#fff' : '#8b949e',
                  border: hasSelection ? '1px solid #D32F2F' : '1px solid #30363d',
                  fontFamily: 'var(--brand-font-family)',
                }}>
                {hasSelection ? `إلغاء (${selected.size})` : 'تحديد الكل'}
              </button>

              {hasSelection && (
                <>
                  <button type="button" onClick={handleDeleteSelected}
                    style={{
                      padding: '5px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                      background: 'rgba(244,67,54,0.1)', color: '#f85149',
                      border: '1px solid rgba(244,67,54,0.3)', fontFamily: 'var(--brand-font-family)',
                    }}>
                    حذف ({selected.size})
                  </button>

                  {/* Move to folder buttons */}
                  {activeFolder ? (
                    <button type="button" onClick={() => handleMoveToRoot([...selected])}
                      style={{
                        padding: '5px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
                        background: '#21262d', color: '#8b949e', border: '1px solid #30363d',
                        fontFamily: 'var(--brand-font-family)',
                      }}>
                      نقل للرئيسية
                    </button>
                  ) : folders.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#7d8590' }}>نقل إلى:</span>
                      {folders.map(f => (
                        <button key={f.id} type="button" onClick={() => handleMoveToFolder(f.id, [...selected])}
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
            <div className={styles.emptyState}><p style={{ color: '#7d8590' }}>جاري التحميل...</p></div>
          ) : visibleAlbums.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="8" y="8" width="32" height="32" rx="4" stroke="#30363d" strokeWidth="2" />
                  <path d="M16 20h16M16 26h10" stroke="#30363d" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className={styles.emptyTitle}>{activeFolder ? 'المجلد فارغ' : 'لا توجد ألبومات'}</h2>
              <p className={styles.emptyDesc}>
                {activeFolder ? 'اسحب ألبومات من الرئيسية إلى هذا المجلد' : 'ابدأ بإنشاء ألبومك الأول'}
              </p>
              {!activeFolder && <Link href="/album/new" className={styles.emptyCtaBtn}>إنشاء أول ألبوم</Link>}
            </div>
          ) : (
            <div className={styles.albumGrid}>
              {visibleAlbums.map(album => {
                const isSelected = selected.has(album.id);
                return (
                  <div key={album.id} className={styles.albumCard}
                    draggable
                    onDragStart={() => handleAlbumDragStart(album.id)}
                    onDragEnd={() => { setDraggingAlbum(null); setDragOverFolder(null); }}
                    style={{
                      outline: isSelected ? '2px solid #D32F2F' : '2px solid transparent',
                      outlineOffset: -2, borderRadius: 12, cursor: 'grab',
                      opacity: draggingAlbum === album.id ? 0.5 : 1,
                      transition: 'outline-color 0.15s, opacity 0.15s',
                      position: 'relative',
                    }}>
                    {/* Checkbox */}
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleSelect(album.id); }}
                      style={{
                        position: 'absolute', top: 8, right: 8, zIndex: 5,
                        width: 22, height: 22, borderRadius: 5, cursor: 'pointer', padding: 0,
                        background: isSelected ? '#D32F2F' : 'rgba(0,0,0,0.5)',
                        border: isSelected ? '2px solid #D32F2F' : '2px solid #666',
                        color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      {isSelected ? '✓' : ''}
                    </button>

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
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id, album.title); }}
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
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
