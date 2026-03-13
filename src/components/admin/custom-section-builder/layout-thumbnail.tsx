'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { CustomSectionLayoutDefinition } from '@/lib/custom-section/layouts';

function Frame({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: 'relative',
        height: 132,
        borderRadius: 18,
        overflow: 'hidden',
        border: active ? '1px solid rgba(167, 139, 250, 0.55)' : '1px solid #dbe3ec',
        background: active
          ? 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: active
          ? '0 18px 36px rgba(124, 58, 237, 0.14)'
          : '0 12px 28px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 22,
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 4,
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fb7185' }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24' }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: '30px 12px 12px',
          borderRadius: 16,
          border: active ? '1px solid #eadcff' : '1px solid #edf2f7',
          background: active ? '#faf5ff' : '#f8fafc',
          padding: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const accentFill = (active: boolean, opacity = 1): CSSProperties => ({
  background: active
    ? `rgba(124, 58, 237, ${0.28 * opacity})`
    : `rgba(148, 163, 184, ${0.45 * opacity})`,
  borderRadius: 999,
});

const inkFill = (active: boolean, width = '100%', height = 8): CSSProperties => ({
  width,
  height,
  borderRadius: 999,
  background: active ? '#8b5cf6' : '#94a3b8',
  opacity: active ? 0.8 : 1,
});

const mutedFill = (active: boolean, width = '100%', height = 8): CSSProperties => ({
  width,
  height,
  borderRadius: 999,
  background: active ? '#d8b4fe' : '#cbd5e1',
  opacity: active ? 0.92 : 1,
});

const mediaSurface = (active: boolean, tall = false): CSSProperties => ({
  borderRadius: 12,
  background: active
    ? 'linear-gradient(135deg, rgba(139,92,246,0.28), rgba(124,58,237,0.1))'
    : 'linear-gradient(135deg, rgba(148,163,184,0.18), rgba(226,232,240,0.7))',
  boxShadow: active
    ? 'inset 0 0 0 1px rgba(196,181,253,0.6)'
    : 'inset 0 0 0 1px rgba(226,232,240,0.9)',
  minHeight: tall ? 68 : 48,
});

function renderSplit(active: boolean, reverse = false, circular = false) {
  const media = (
    <div
      style={{
        ...mediaSurface(active),
        borderRadius: circular ? 999 : 12,
        flex: reverse ? 0.9 : 1,
      }}
    />
  );

  const copy = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: reverse ? 1 : 0.95, justifyContent: 'center' }}>
      <div style={inkFill(active, '78%', 9)} />
      <div style={mutedFill(active, '58%', 7)} />
      <div style={mutedFill(active, '88%', 7)} />
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: reverse ? '1fr 1.05fr' : '1.05fr 1fr', gap: 10, height: '100%' }}>
      {reverse ? copy : media}
      {reverse ? media : copy}
    </div>
  );
}

export function CustomSectionLayoutThumbnail({
  definition,
  active,
}: {
  definition: CustomSectionLayoutDefinition;
  active: boolean;
}) {
  const value = definition.value;

  const renderBody = () => {
    switch (value) {
      case 'layout-1':
      case 'layout-3':
      case 'layout-24':
      case 'layout-30':
        return (
          <div
            style={{
              height: '100%',
              borderRadius: 14,
              padding: 12,
              display: 'flex',
              alignItems: 'flex-end',
              background: active
                ? 'linear-gradient(140deg, rgba(15,23,42,0.92), rgba(88,28,135,0.9))'
                : 'linear-gradient(140deg, rgba(30,41,59,0.86), rgba(71,85,105,0.92))',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '70%' }}>
              <div style={{ ...mutedFill(true, '26%', 7), background: 'rgba(255,255,255,0.34)' }} />
              <div style={{ ...mutedFill(true, '78%', 10), background: 'rgba(255,255,255,0.82)' }} />
              <div style={{ ...mutedFill(true, '56%', 8), background: 'rgba(255,255,255,0.42)' }} />
            </div>
          </div>
        );
      case 'layout-2':
      case 'layout-7':
      case 'layout-12':
      case 'layout-15':
      case 'layout-16':
      case 'layout-17':
      case 'layout-20':
      case 'layout-27':
      case 'layout-29':
        return renderSplit(active);
      case 'layout-4':
        return (
          <div
            style={{
              height: '100%',
              borderRadius: 16,
              padding: 10,
              background: active
                ? 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(216,180,254,0.4))'
                : 'linear-gradient(135deg, rgba(226,232,240,0.6), rgba(241,245,249,0.9))',
            }}
          >
            {renderSplit(active)}
          </div>
        );
      case 'layout-5':
        return renderSplit(active, false, true);
      case 'layout-6':
        return renderSplit(active, true);
      case 'layout-8':
      case 'layout-13':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 0.8fr', gap: 8, height: '100%' }}>
            <div style={mediaSurface(active)} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 7 }}>
              <div style={inkFill(active, '88%', 10)} />
              <div style={mutedFill(active, '64%', 7)} />
              <div style={accentFill(active, 0.8)} />
            </div>
            <div style={mediaSurface(active)} />
          </div>
        );
      case 'layout-9':
      case 'layout-10':
      case 'layout-21':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
            <div style={{ ...mediaSurface(active, true), minHeight: 58 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={inkFill(active, '74%', 9)} />
              <div style={mutedFill(active, '52%', 7)} />
            </div>
          </div>
        );
      case 'layout-11':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, height: '100%' }}>
            <div style={mediaSurface(active, true)} />
            <div style={mediaSurface(active, true)} />
          </div>
        );
      case 'layout-14':
      case 'layout-28':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, height: '100%' }}>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  borderRadius: 12,
                  background: active ? '#ffffff' : '#ffffff',
                  border: active ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={accentFill(active, 0.82)} />
                <div style={mutedFill(active, '90%', 7)} />
                <div style={inkFill(active, '72%', 8)} />
              </div>
            ))}
          </div>
        );
      case 'layout-18':
        return (
          <div style={{ position: 'relative', height: '100%' }}>
            <div style={{ ...mediaSurface(active, true), position: 'absolute', inset: '0 18% 12px 0' }} />
            <div
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: '48%',
                padding: 10,
                borderRadius: 14,
                background: '#ffffff',
                border: active ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
                boxShadow: active
                  ? '0 18px 36px rgba(109,40,217,0.15)'
                  : '0 12px 26px rgba(15,23,42,0.08)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={inkFill(active, '86%', 8)} />
                <div style={mutedFill(active, '74%', 7)} />
              </div>
            </div>
          </div>
        );
      case 'layout-19':
      case 'layout-23':
      case 'layout-26':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div
              style={{
                width: '74%',
                borderRadius: 16,
                background: '#ffffff',
                border: active ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
                padding: 14,
                boxShadow: active
                  ? '0 18px 34px rgba(109,40,217,0.12)'
                  : '0 12px 24px rgba(15,23,42,0.06)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={inkFill(active, '70%', 10)} />
                <div style={mutedFill(active, '94%', 7)} />
                <div style={accentFill(active, 0.8)} />
              </div>
            </div>
          </div>
        );
      case 'layout-22':
      case 'layout-25':
      case 'layout-31':
      case 'layout-32':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: value === 'layout-25' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 8, height: '100%' }}>
            {(value === 'layout-25' ? [0, 1, 2, 3] : [0, 1, 2]).map((index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={mediaSurface(active)} />
                <div style={inkFill(active, '82%', 8)} />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '72%' }}>
              <div style={inkFill(active, '84%', 10)} />
              <div style={mutedFill(active, '68%', 7)} />
              <div style={accentFill(active, 0.8)} />
            </div>
          </div>
        );
    }
  };

  return <Frame active={active}>{renderBody()}</Frame>;
}
