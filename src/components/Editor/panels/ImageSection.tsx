'use client';
import { useRef, useState } from 'react';
import { compressImage } from '../lib/compressImage';
import { LABEL_STYLE } from './styles';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ImageSectionProps {
  imageUrl: string | null;
  onUpload: (dataUrl: string) => void;
}

export function ImageSection({ imageUrl, onUpload }: ImageSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('الملف المختار ليس صورة');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`حجم الصورة كبير جداً (${(file.size / 1024 / 1024).toFixed(1)}MB) — الحد الأقصى 10MB`);
      e.target.value = '';
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result;
        if (typeof raw === 'string') onUpload(await compressImage(raw));
      } catch {
        setError('فشل في معالجة الصورة');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setError('فشل في قراءة الملف'); setLoading(false); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div>
      <label style={LABEL_STYLE}>الصورة</label>
      {imageUrl ? (
        <div style={{
          position: 'relative',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid #30363d',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              position: 'absolute', bottom: 6, left: 6,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              border: 'none', borderRadius: 4,
              padding: '4px 10px', fontSize: 12, cursor: 'pointer',
            }}
          >
            استبدال
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', padding: '14px',
            background: '#161b22', border: '2px dashed #30363d',
            borderRadius: 6, color: '#7d8590', fontSize: 13,
            cursor: 'pointer', fontFamily: 'var(--brand-font-family)',
          }}
        >
          + رفع صورة
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {loading && <p style={{ fontSize: 11, color: '#8b949e', marginTop: 6 }}>جاري معالجة الصورة...</p>}
      {error && <p style={{ fontSize: 11, color: '#ef5350', marginTop: 6 }}>{error}</p>}
    </div>
  );
}
