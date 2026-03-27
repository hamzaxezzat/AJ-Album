// src/components/SlideRenderer/BlockRenderer.tsx
import React from 'react';
import type { ContentBlock, ResolvedTokens, RichTextContent, TypographyProfile } from '@/types/album';
import { normalizedToPixelStyle } from '@/lib/layout/normalizedToPixel';
import { applyKashida } from '@/lib/kashida/kashidaEngine';
import styles from './BlockRenderer.module.css';

interface BlockRendererProps {
  block: ContentBlock;
  tokens: ResolvedTokens;
}

// ─── Rich Text Rendering ─────────────────────────────────────

type DocNode = {
  type: string;
  text?: string;
  content?: DocNode[];
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
  attrs?: Record<string, unknown>;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nodeToHtml(node: DocNode): string {
  switch (node.type) {
    case 'paragraph': {
      const inner = (node.content ?? []).map(n => nodeToHtml(n)).join('');
      return `<p style="margin:0;margin-block-end:0.25em">${inner || '&nbsp;'}</p>`;
    }
    case 'hardBreak':
      return '<br />';
    case 'bulletList': {
      const items = (node.content ?? []).map(n => nodeToHtml(n)).join('');
      return `<ul style="margin:0;padding-inline-end:1.4em;padding-inline-start:0;list-style-type:disc">${items}</ul>`;
    }
    case 'orderedList': {
      const items = (node.content ?? []).map(n => nodeToHtml(n)).join('');
      return `<ol style="margin:0;padding-inline-end:1.4em;padding-inline-start:0">${items}</ol>`;
    }
    case 'listItem': {
      const inner = (node.content ?? []).map(n => nodeToHtml(n)).join('');
      return `<li style="margin-block-end:0.3em">${inner}</li>`;
    }
    case 'text': {
      let html = escapeHtml(node.text ?? '');
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              html = `<strong>${html}</strong>`;
              break;
            case 'italic':
              html = `<em>${html}</em>`;
              break;
            case 'underline':
              html = `<u>${html}</u>`;
              break;
            case 'highlight':
              html = `<mark style="background-color:${mark.attrs?.color ?? 'inherit'};color:inherit;padding:0 0.1em">${html}</mark>`;
              break;
            case 'lang': {
              // Mixed-direction inline run
              const dir = mark.attrs?.lang === 'en' ? 'ltr' : 'rtl';
              const font =
                mark.attrs?.lang === 'en'
                  ? "'Al-Jazeera', Cairo, sans-serif"
                  : "'Al-Jazeera', Cairo, sans-serif";
              html = `<span lang="${mark.attrs?.lang ?? ''}" dir="${dir}" style="font-family:${font}">${html}</span>`;
              break;
            }
            case 'textStyle':
              if (mark.attrs?.color) {
                html = `<span style="color:${mark.attrs.color}">${html}</span>`;
              }
              break;
          }
        }
      }
      return html;
    }
    default:
      // Recurse into any container node we don't explicitly handle
      return (node.content ?? []).map(n => nodeToHtml(n)).join('');
  }
}

function richTextToHtml(content: RichTextContent | null | undefined, kashida?: boolean): string {
  if (!content || content.type !== 'doc' || !content.content) return '';
  let html = (content.content as DocNode[]).map(n => nodeToHtml(n)).join('');
  if (kashida) {
    // Apply kashida to text content OUTSIDE of HTML tags
    html = html.replace(/>([^<]+)</g, (match, text) => {
      return '>' + applyKashida(text) + '<';
    });
  }
  return html;
}

// ─── Typography helper ───────────────────────────────────────

import type { BlockStyleOverride } from '@/types/album';

function typoStyle(
  tokenRef: string,
  typography: TypographyProfile,
  overrides?: BlockStyleOverride,
): React.CSSProperties {
  const token = typography[tokenRef as keyof TypographyProfile];
  if (!token) return {};
  return {
    fontFamily: token.fontFamily,
    fontWeight: overrides?.fontWeight ?? token.fontWeight,
    fontSize: overrides?.fontSize ?? token.fontSize,
    lineHeight: overrides?.lineHeight ?? token.lineHeight,
    letterSpacing: token.letterSpacing !== 0 ? `${token.letterSpacing}em` : undefined,
    textAlign: overrides?.textAlign ?? token.textAlign,
    direction: token.direction,
  };
}

// ─── Block Renderer ──────────────────────────────────────────

export function BlockRenderer({ block, tokens }: BlockRendererProps) {
  const positionStyle = normalizedToPixelStyle(
    block.position,
    tokens.canvasWidth,
    tokens.canvasHeight,
  );

  const baseStyle: React.CSSProperties = {
    ...positionStyle,
    position: 'absolute',
    zIndex: block.zIndex,
    direction: 'rtl',
  };

  switch (block.type) {
    case 'main_title': {
      return (
        <div
          className={styles.titleBlock}
          style={{
            ...baseStyle,
            ...typoStyle(block.typographyTokenRef, tokens.typography, block.styleOverrides),
            color: block.styleOverrides?.color ?? tokens.titleColor,
          }}
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.content) }}
        />
      );
    }

    case 'subtitle': {
      return (
        <div
          className={styles.titleBlock}
          style={{
            ...baseStyle,
            ...typoStyle(block.typographyTokenRef, tokens.typography, block.styleOverrides),
            color: block.styleOverrides?.color ?? tokens.textSecondary,
          }}
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.content) }}
        />
      );
    }

    case 'body_paragraph': {
      const overrideAlign = block.styleOverrides?.textAlign;
      const isJustified = overrideAlign === 'justify' || (!overrideAlign && block.kashidaEnabled);
      return (
        <div
          className={styles.bodyBlock}
          style={{
            ...baseStyle,
            ...typoStyle(block.typographyTokenRef, tokens.typography, block.styleOverrides),
            color: block.styleOverrides?.color ?? tokens.bodyColor,
            textAlign: isJustified ? 'justify' : (overrideAlign ?? undefined),
          }}
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.content, block.kashidaEnabled) }}
        />
      );
    }

    case 'highlighted_phrase': {
      return (
        <div
          className={styles.titleBlock}
          style={{
            ...baseStyle,
            ...typoStyle(block.typographyTokenRef, tokens.typography),
            backgroundColor: block.backgroundColor,
            color: block.textColor,
            padding: '0.2em 0.4em',
          }}
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.content) }}
        />
      );
    }

    case 'bullet_list': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      const bSize = tokens.bulletSize;
      const conn = tokens.bulletConnector;
      return (
        <div style={{ ...baseStyle, position: 'absolute', display: 'flex', direction: 'rtl' }}>
          {/* Connector line + bullets column */}
          {conn.enabled && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: bSize + 8,
              flexShrink: 0,
              position: 'relative',
              marginInlineEnd: 8,
            }}>
              {/* Vertical connector line */}
              <div style={{
                position: 'absolute',
                top: bSize / 2,
                bottom: bSize / 2,
                width: conn.width,
                background: conn.style === 'solid' ? conn.color : 'transparent',
                borderInlineStart: conn.style !== 'solid'
                  ? `${conn.width}px ${conn.style} ${conn.color}`
                  : 'none',
              }} />
              {/* Bullet dots positioned at each item */}
              {block.items.map((item) => (
                <div key={item.id} style={{
                  width: bSize,
                  height: bSize,
                  borderRadius: block.bulletStyle === 'square' ? 2 : '50%',
                  background: block.bulletColor,
                  flexShrink: 0,
                  zIndex: 1,
                  marginBottom: 'auto',
                }} />
              ))}
            </div>
          )}
          {/* Items */}
          <ul
            className={styles.bulletList}
            style={{
              ...typo,
              color: tokens.textPrimary,
              listStyle: 'none',
              paddingInlineEnd: 0,
              paddingInlineStart: 0,
              flex: 1,
            }}
          >
            {block.items.map((item, idx) => (
              <li
                key={item.id}
                className={`${styles.bulletItem} ${
                  block.showDividers && idx > 0 ? styles.bulletDivider : ''
                }`}
                style={{
                  '--bullet-color': block.bulletColor,
                  '--bullet-size': `${bSize}px`,
                } as React.CSSProperties}
                data-bullet-style={block.bulletStyle}
                data-hide-bullet={conn.enabled ? 'true' : undefined}
                dangerouslySetInnerHTML={{ __html: richTextToHtml(item.content) }}
              />
            ))}
          </ul>
        </div>
      );
    }

    case 'numbered_list': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <ol
          style={{
            ...baseStyle,
            ...typo,
            color: tokens.textPrimary,
            paddingInlineStart: '1.5em',
          }}
        >
          {block.items.map(item => (
            <li
              key={item.id}
              style={{ paddingBlock: '0.2em' }}
              dangerouslySetInnerHTML={{ __html: richTextToHtml(item.content) }}
            />
          ))}
        </ol>
      );
    }

    case 'stat_value': {
      const valueTok = tokens.typography['stat-display'];
      const labelTok = tokens.typography['body-m'];
      return (
        <div className={styles.statBlock} style={baseStyle}>
          <div
            className={styles.statValue}
            style={{
              fontFamily: valueTok.fontFamily,
              fontWeight: valueTok.fontWeight,
              fontSize: valueTok.fontSize,
              letterSpacing: `${valueTok.letterSpacing}em`,
              color: block.accentColor,
              direction: 'ltr',
            }}
          >
            {block.value}
          </div>
          <div
            className={styles.statLabel}
            style={{
              fontFamily: labelTok.fontFamily,
              fontSize: labelTok.fontSize,
              lineHeight: labelTok.lineHeight,
              color: tokens.textSecondary,
            }}
          >
            {block.label}
          </div>
        </div>
      );
    }

    case 'quote_block': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <div
          style={{
            ...baseStyle,
            borderInlineEnd: `4px solid ${block.accentColor}`,
            paddingInlineEnd: '0.8em',
          }}
        >
          <div
            style={{ ...typo, color: tokens.textPrimary }}
            dangerouslySetInnerHTML={{ __html: richTextToHtml(block.content) }}
          />
          {block.attribution && (
            <div
              style={{
                fontFamily: tokens.typography['body-s'].fontFamily,
                fontSize: tokens.typography['body-s'].fontSize,
                color: tokens.textSecondary,
                marginBlockStart: '0.5em',
              }}
            >
              — {block.attribution}
            </div>
          )}
        </div>
      );
    }

    case 'callout': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: block.backgroundColor,
            color: block.textColor,
            padding: '0.6em 0.8em',
            borderRadius: 4,
          }}
        >
          {block.label && (
            <div
              style={{
                fontFamily: tokens.typography['label'].fontFamily,
                fontSize: tokens.typography['label'].fontSize,
                fontWeight: 700,
                marginBlockEnd: '0.3em',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {block.label}
            </div>
          )}
          <div
            style={typo}
            dangerouslySetInnerHTML={{ __html: richTextToHtml(block.content) }}
          />
        </div>
      );
    }

    case 'divider': {
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: block.color,
            ...(block.orientation === 'horizontal'
              ? { height: `calc(var(--canvas-height) * ${block.thickness})` }
              : { width: `calc(var(--canvas-width) * ${block.thickness})` }),
          }}
        />
      );
    }

    case 'source_line': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <div style={{ ...baseStyle, ...typo, color: tokens.textSecondary }}>
          {block.text}
        </div>
      );
    }

    case 'credential_row': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <div style={{ ...baseStyle, ...typo }}>
          {block.rows.map(row => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1em',
                paddingBlock: '0.3em',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <span style={{ color: tokens.textSecondary, fontWeight: 600 }}>
                {row.label}
              </span>
              <span
                style={{ color: tokens.textPrimary }}
                dangerouslySetInnerHTML={{ __html: richTextToHtml(row.value) }}
              />
            </div>
          ))}
        </div>
      );
    }

    case 'comparison_block': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <div
          style={{
            ...baseStyle,
            ...typo,
            display: 'flex',
            alignItems: 'center',
            gap: '1em',
          }}
        >
          <div style={{ flex: 1, textAlign: 'right', color: block.leftSide.accentColor }}>
            <div style={{ fontWeight: 700, fontSize: '1.4em' }}>{block.leftSide.value}</div>
            <div style={{ color: tokens.textSecondary }}>{block.leftSide.label}</div>
          </div>
          {block.dividerLabel && (
            <div style={{ color: tokens.textSecondary, fontWeight: 700, fontSize: '0.9em' }}>
              {block.dividerLabel}
            </div>
          )}
          <div style={{ flex: 1, textAlign: 'left', color: block.rightSide.accentColor }}>
            <div style={{ fontWeight: 700, fontSize: '1.4em' }}>{block.rightSide.value}</div>
            <div style={{ color: tokens.textSecondary }}>{block.rightSide.label}</div>
          </div>
        </div>
      );
    }

    case 'timeline_item': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <div style={{ ...baseStyle, display: 'flex', gap: '0.8em', alignItems: 'flex-start' }}>
          <div
            style={{
              width: 3,
              alignSelf: 'stretch',
              backgroundColor: block.accentColor,
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontFamily: tokens.typography['label'].fontFamily,
                fontSize: tokens.typography['label'].fontSize,
                color: block.accentColor,
                fontWeight: 700,
                marginBlockEnd: '0.2em',
              }}
            >
              {block.date}
            </div>
            <div
              style={{ ...typo, color: tokens.textPrimary }}
              dangerouslySetInnerHTML={{ __html: richTextToHtml(block.content) }}
            />
          </div>
        </div>
      );
    }

    case 'infographic_row': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <div
          style={{
            ...baseStyle,
            ...typo,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6em',
            direction: 'rtl',
          }}
        >
          {block.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.icon.url} alt="" style={{ width: '1.4em', height: '1.4em' }} />
          )}
          <span style={{ color: tokens.textSecondary }}>{block.label}</span>
          <span style={{ fontWeight: 700, color: tokens.textPrimary }}>{block.value}</span>
        </div>
      );
    }

    case 'icon_text_row': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <div
          style={{
            ...baseStyle,
            ...typo,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6em',
            direction: 'rtl',
            color: tokens.textPrimary,
          }}
        >
          {block.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.icon.url} alt="" style={{ width: '1.4em', height: '1.4em' }} />
          )}
          <div dangerouslySetInnerHTML={{ __html: richTextToHtml(block.content) }} />
        </div>
      );
    }

    case 'flag_logo_text_row': {
      const typo = typoStyle(block.typographyTokenRef, tokens.typography);
      return (
        <div
          style={{
            ...baseStyle,
            ...typo,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em',
            direction: 'rtl',
          }}
        >
          {block.flag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.flag.url} alt="" style={{ height: '1.2em', width: 'auto' }} />
          )}
          {block.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.logo.url} alt="" style={{ height: '1.2em', width: 'auto' }} />
          )}
          <div>
            <div style={{ color: tokens.textPrimary }}>{block.text}</div>
            {block.subtext && (
              <div
                style={{
                  color: tokens.textSecondary,
                  fontSize: '0.85em',
                }}
              >
                {block.subtext}
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'image_zone': {
      // Inline image zone block (as opposed to the slide-level image)
      const { config } = block;
      return (
        <div
          style={{
            ...baseStyle,
            overflow: 'hidden',
          }}
        >
          {config.asset ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.asset.url}
              alt={config.asset.altText ?? ''}
              style={{
                width: '100%',
                height: '100%',
                objectFit: config.objectFit,
                objectPosition: `${config.focalPoint.x * 100}% ${config.focalPoint.y * 100}%`,
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#E0E0E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9E9E9E',
                fontSize: 14,
              }}
            >
              صورة
            </div>
          )}
        </div>
      );
    }

    case 'rectangle': {
      const s = block.shape;
      return (
        <div style={{
          ...baseStyle,
          backgroundColor: s.fillColor,
          opacity: s.fillOpacity,
          border: s.strokeWidth > 0 ? `${s.strokeWidth}px solid ${s.strokeColor}` : 'none',
          borderRadius: s.borderRadius,
        }} />
      );
    }

    case 'ellipse': {
      const s = block.shape;
      return (
        <div style={{
          ...baseStyle,
          backgroundColor: s.fillColor,
          opacity: s.fillOpacity,
          border: s.strokeWidth > 0 ? `${s.strokeWidth}px solid ${s.strokeColor}` : 'none',
          borderRadius: '50%',
        }} />
      );
    }

    case 'text_box': {
      const overrideAlign = block.styleOverrides?.textAlign;
      const isJustified = overrideAlign === 'justify' || (!overrideAlign && block.kashidaEnabled);
      return (
        <div
          className={styles.bodyBlock}
          style={{
            ...baseStyle,
            ...typoStyle(block.typographyTokenRef, tokens.typography, block.styleOverrides),
            color: block.styleOverrides?.color ?? tokens.textPrimary,
            textAlign: isJustified ? 'justify' : (overrideAlign ?? undefined),
          }}
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.content, block.kashidaEnabled) }}
        />
      );
    }

    default:
      return null;
  }
}
