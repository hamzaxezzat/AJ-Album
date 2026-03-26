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

export function DashboardClient() {
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const setAlbum = useDocumentStore((s) => s.setAlbum);

  const refreshAlbums = useCallback(() => {
    setAlbums(getSavedAlbums());
  }, []);

  useEffect(() => {
    refreshAlbums();
    setLoaded(true);
  }, [refreshAlbums]);

  function handleLoadDemo() {
    const demo = createDemoAlbum();
    setAlbum(demo);
    router.push(`/album/${demo.id}`);
  }

  function handleDeleteAlbum(albumId: string, albumTitle: string) {
    if (!confirm(`حذف "${albumTitle}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      const key = `aj-album-${albumId}`;
      const raw = localStorage.getItem(key);
      // Clean up IndexedDB images before removing album
      if (raw) void deleteAlbumImages(raw);
      localStorage.removeItem(key);
      refreshAlbums();
    } catch {
      // ignore
    }
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
          <div className={styles.channelBadge}>الجزيرة</div>
        </div>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        {/* Section header */}
        <div className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>ألبوماتي</h1>
          <div className={styles.headerActions}>
            <Link
              href="/settings"
              style={{
                background: '#21262d', border: '1px solid #30363d', borderRadius: 8,
                color: '#8b949e', padding: '8px 16px', fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--brand-font-family)', transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#30363d'; e.currentTarget.style.color = '#e6edf3'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.color = '#8b949e'; }}
            >
              <span style={{ fontSize: 16 }}>&#9881;</span>
              إعدادات المنصة
            </Link>
            <button type="button" className={styles.demoBtn} onClick={handleLoadDemo}>
              تحميل النموذج التجريبي
            </button>
            <Link href="/album/new" className={styles.newAlbumBtn}>
              + ألبوم جديد
            </Link>
          </div>
        </div>

        {/* Album count */}
        {loaded && albums.length > 0 && (
          <p style={{ fontSize: 13, color: '#7d8590', marginBottom: 16, marginTop: -20 }}>
            {albums.length} ألبوم
          </p>
        )}

        {/* Album grid */}
        {!loaded ? (
          <div className={styles.emptyState}>
            <p style={{ color: '#7d8590' }}>جاري التحميل...</p>
          </div>
        ) : albums.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="8" width="32" height="32" rx="4" stroke="#30363d" strokeWidth="2" />
                <path d="M16 20h16M16 26h10" stroke="#30363d" strokeWidth="2" strokeLinecap="round" />
                <path d="M32 32l6 6" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>لا توجد ألبومات بعد</h2>
            <p className={styles.emptyDesc}>ابدأ بإنشاء ألبومك التحريري الأول من نص السكريبت</p>
            <Link href="/album/new" className={styles.emptyCtaBtn}>
              إنشاء أول ألبوم
            </Link>
          </div>
        ) : (
          <div className={styles.albumGrid}>
            {albums.map((album) => (
              <div key={album.id} className={styles.albumCard}>
                <div className={styles.cardThumb}>
                  <div className={styles.cardThumbInner}>
                    <div className={styles.cardThumbBanner} />
                    <div className={styles.cardThumbTitle}>
                      {album.title.slice(0, 30)}
                    </div>
                    <div className={styles.cardThumbFooter} />
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle} dir="rtl" lang="ar">
                    {album.title}
                  </h3>
                  <div className={styles.cardMeta}>
                    <span>{album.slideCount} شريحة</span>
                    <span className={styles.dot}>&middot;</span>
                    <span>{formatDate(album.updatedAt)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Link
                      href={`/album/${album.id}`}
                      className={styles.openBtn}
                    >
                      فتح
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id, album.title); }}
                      style={{
                        background: 'transparent',
                        border: '1px solid #30363d',
                        borderRadius: 5,
                        color: '#7d8590',
                        padding: '7px 12px',
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'var(--brand-font-family)',
                        transition: 'color 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#F44336'; (e.target as HTMLElement).style.borderColor = '#F44336'; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#7d8590'; (e.target as HTMLElement).style.borderColor = '#30363d'; }}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
