// FILE PATH: client/components/classroom/VideoEffectsPanel.tsx
//
// Background + appearance controls, shared between the pre-join screen and
// the in-call "Video Effects" popover. Purely a controlled view over
// whatever useVideoEffects() state the caller passes in.

'use client';

import { Ban, Sparkles, Sun, Wand2, ScanFace, Upload, ToggleLeft, ToggleRight } from 'lucide-react';
import { useRef } from 'react';
import { LUMEXA_BACKGROUNDS } from '@/lib/classroom/backgrounds';
import type { BackgroundEffect } from '@/lib/classroom/backgrounds';
import type { AppearanceOptions } from '@/lib/classroom/appearanceProcessor';

interface VideoEffectsPanelProps {
  backgroundEffect: BackgroundEffect;
  onBackgroundChange: (effect: BackgroundEffect) => void;
  lighting: AppearanceOptions;
  onLightingChange: (lighting: AppearanceOptions) => void;
  supported: boolean;
  pending?: boolean;
  onUploadImage?: (file: File) => void;
}

function OptionTile({
  active,
  onClick,
  children,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex flex-col items-center gap-1.5 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div
        className={`w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center border-2 transition-all ${
          active
            ? 'border-[var(--cr-accent)] ring-2 ring-[var(--cr-accent)]/30'
            : 'border-[var(--cr-border)] group-hover:border-[var(--cr-border-strong)]'
        }`}
        style={{ background: 'var(--cr-surface-2)' }}
      >
        {children}
      </div>
      <span className={`text-[11px] leading-tight text-center max-w-[70px] ${active ? 'text-[var(--cr-accent)]' : 'text-[var(--cr-text-muted)]'}`}>
        {label}
      </span>
    </button>
  );
}

export default function VideoEffectsPanel({
  backgroundEffect,
  onBackgroundChange,
  lighting,
  onLightingChange,
  supported,
  pending,
  onUploadImage,
}: VideoEffectsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLightingActive = lighting.brightness !== 1 || lighting.contrast !== 1;
  const lightingPercent = Math.round(lighting.brightness * 100);

  return (
    <div className="w-[320px] max-w-full">
      {!supported && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
          Video effects aren&apos;t supported in this browser. Try the latest Chrome or Edge.
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)] mb-2.5">
        Background
      </p>
      <div className="grid grid-cols-4 gap-3 mb-1">
        <OptionTile
          active={backgroundEffect.mode === 'none'}
          onClick={() => onBackgroundChange({ mode: 'none' })}
          label="None"
          disabled={!supported || pending}
        >
          <Ban size={20} className="text-[var(--cr-text-muted)]" />
        </OptionTile>
        <OptionTile
          active={backgroundEffect.mode === 'blur-slight'}
          onClick={() => onBackgroundChange({ mode: 'blur-slight' })}
          label="Slight Blur"
          disabled={!supported || pending}
        >
          <Sparkles size={20} className="text-[var(--cr-text-muted)]" />
        </OptionTile>
        <OptionTile
          active={backgroundEffect.mode === 'blur'}
          onClick={() => onBackgroundChange({ mode: 'blur' })}
          label="Blur"
          disabled={!supported || pending}
        >
          <Sparkles size={24} className="text-[var(--cr-text-muted)]" />
        </OptionTile>
        <OptionTile
          active={false}
          onClick={() => fileInputRef.current?.click()}
          label="Upload"
          disabled={!supported || pending || !onUploadImage}
        >
          <Upload size={20} className="text-[var(--cr-text-muted)]" />
        </OptionTile>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadImage) onUploadImage(file);
            e.target.value = '';
          }}
        />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)] mt-4 mb-2.5">
        Lumexa Backgrounds
      </p>
      <div className="grid grid-cols-4 gap-3 max-h-[168px] overflow-y-auto cr-scroll pr-1">
        {LUMEXA_BACKGROUNDS.map((bg) => (
          <OptionTile
            key={bg.id}
            active={backgroundEffect.mode === 'image' && backgroundEffect.imagePath === bg.imagePath}
            onClick={() => onBackgroundChange({ mode: 'image', imagePath: bg.imagePath, label: bg.label })}
            label={bg.label.replace('Lumexa ', '')}
            disabled={!supported || pending}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail from a fixed local asset, next/image isn't worth the setup here */}
            <img src={bg.thumbnailPath} alt="" className="w-full h-full object-cover" />
          </OptionTile>
        ))}
      </div>

      <div className="border-t border-[var(--cr-border)] mt-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)] mb-3">
          Appearance
        </p>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-[var(--cr-text)] flex items-center gap-1.5">
              <Sun size={14} /> Lighting adjustment
            </span>
            <span className="text-xs text-[var(--cr-text-muted)] tabular-nums">
              {isLightingActive ? `${lightingPercent}%` : 'Off'}
            </span>
          </div>
          <input
            type="range"
            min={80}
            max={140}
            step={1}
            disabled={!supported || pending}
            value={lightingPercent}
            onChange={(e) => {
              const brightness = Number(e.target.value) / 100;
              onLightingChange({ ...lighting, brightness, contrast: 1 + (brightness - 1) * 0.5 });
            }}
            className="w-full accent-[var(--cr-accent)] disabled:opacity-40"
          />
        </div>

        <button
          type="button"
          onClick={() => onLightingChange({ ...lighting, touchUp: !lighting.touchUp })}
          disabled={!supported || pending}
          className="w-full flex items-center justify-between py-2 disabled:opacity-40"
        >
          <span className="text-sm text-[var(--cr-text)] flex items-center gap-1.5">
            <Wand2 size={14} /> Touch-up
          </span>
          {lighting.touchUp ? (
            <ToggleRight size={22} className="text-[var(--cr-accent)]" />
          ) : (
            <ToggleLeft size={22} className="text-[var(--cr-text-faint)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onLightingChange({ ...lighting, autoFraming: !lighting.autoFraming })}
          disabled={!supported || pending}
          className="w-full flex items-center justify-between py-2 disabled:opacity-40"
        >
          <span className="text-sm text-[var(--cr-text)] flex items-center gap-1.5">
            <ScanFace size={14} /> Auto-framing
          </span>
          {lighting.autoFraming ? (
            <ToggleRight size={22} className="text-[var(--cr-accent)]" />
          ) : (
            <ToggleLeft size={22} className="text-[var(--cr-text-faint)]" />
          )}
        </button>
      </div>
    </div>
  );
}
