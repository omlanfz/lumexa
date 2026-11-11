// FILE PATH: client/components/classroom/VideoEffectsPanel.tsx
//
// Background + appearance controls, shared between the pre-join screen and the
// in-call "Video Effects" popover. Purely a controlled view over whatever
// useVideoEffects() state the caller passes in — and an honest one: a choice shows as
// on only while it is on (an effect that could not start is taken back by the
// controller, and the reason shown here), and what is still loading is said.

'use client';

import { Ban, Sparkles, Sun, Wand2, ScanFace, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import { LUMEXA_BACKGROUNDS } from '@/lib/classroom/backgrounds';
import type { BackgroundEffect } from '@/lib/classroom/backgrounds';
import { lightingFromPercent } from '@/lib/classroom/effects/options';
import type { AppearanceOptions } from '@/lib/classroom/effects/options';

export interface VideoEffectsPanelProps {
  background: BackgroundEffect;
  onBackgroundChange: (effect: BackgroundEffect) => void;
  appearance: AppearanceOptions;
  onAppearanceChange: (appearance: AppearanceOptions) => void;
  supported: boolean;
  /** Why effects are not available here, when they are not. */
  unsupportedReason?: string | null;
  /** A model or a picture is being loaded: the first use takes a moment. */
  loading?: boolean;
  /** The last thing that went wrong. */
  error?: string | null;
  onUploadImage?: (file: File) => void;
}

function OptionTile({
  active,
  onClick,
  children,
  label,
  disabled,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      data-testid={testId}
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

/** An on/off switch: a button with the `switch` role, so it is announced as one. */
function Switch({
  checked,
  onChange,
  label,
  icon,
  disabled,
  testId,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      data-testid={testId}
      className="w-full flex items-center justify-between py-2 disabled:opacity-40"
    >
      <span className="text-sm text-[var(--cr-text)] flex items-center gap-1.5">
        {icon} {label}
      </span>
      <span
        aria-hidden="true"
        className={`relative inline-block h-[22px] w-[38px] rounded-full border transition-colors duration-200 ${
          checked ? 'bg-[var(--cr-accent)] border-[var(--cr-accent)]' : 'bg-[var(--cr-surface-3)] border-[var(--cr-border-strong)]'
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

export default function VideoEffectsPanel({
  background,
  onBackgroundChange,
  appearance,
  onAppearanceChange,
  supported,
  unsupportedReason,
  loading,
  error,
  onUploadImage,
}: VideoEffectsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lightingPercent = Math.round(appearance.lighting * 100);

  return (
    <div className="w-[320px] max-w-full" data-testid="effects-panel">
      {!supported && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs" data-testid="effects-unsupported">
          {unsupportedReason ?? "Video effects aren't supported in this browser. Try the latest Chrome or Edge."}
        </div>
      )}

      {supported && loading && (
        <div className="mb-3 flex items-center gap-2 text-xs text-[var(--cr-text-muted)] cr-fade-in" role="status" data-testid="effects-loading">
          <Loader2 size={13} className="animate-spin text-[var(--cr-accent)]" />
          Getting video effects ready…
        </div>
      )}

      {error && (
        <div
          role="alert"
          data-testid="effects-error"
          className="mb-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs cr-fade-in"
        >
          <AlertCircle size={14} className="flex-shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)] mb-2.5">Background</p>
      <div className="grid grid-cols-4 gap-3 mb-1">
        <OptionTile
          active={background.mode === 'none'}
          onClick={() => onBackgroundChange({ mode: 'none' })}
          label="None"
          disabled={!supported}
          testId="bg-none"
        >
          <Ban size={20} className="text-[var(--cr-text-muted)]" />
        </OptionTile>
        <OptionTile
          active={background.mode === 'blur-slight'}
          onClick={() => onBackgroundChange({ mode: 'blur-slight' })}
          label="Slight Blur"
          disabled={!supported}
          testId="bg-blur-slight"
        >
          <Sparkles size={20} className="text-[var(--cr-text-muted)]" />
        </OptionTile>
        <OptionTile
          active={background.mode === 'blur'}
          onClick={() => onBackgroundChange({ mode: 'blur' })}
          label="Blur"
          disabled={!supported}
          testId="bg-blur"
        >
          <Sparkles size={24} className="text-[var(--cr-text-muted)]" />
        </OptionTile>
        <OptionTile
          active={background.mode === 'image' && background.label === 'Custom'}
          onClick={() => fileInputRef.current?.click()}
          label="Upload"
          disabled={!supported || !onUploadImage}
          testId="bg-upload"
        >
          <Upload size={20} className="text-[var(--cr-text-muted)]" />
        </OptionTile>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onUploadImage) onUploadImage(file);
            e.target.value = '';
          }}
        />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)] mt-4 mb-2.5">Lumexa Backgrounds</p>
      <div className="grid grid-cols-4 gap-3 max-h-[168px] overflow-y-auto cr-scroll pr-1">
        {LUMEXA_BACKGROUNDS.map((bg) => (
          <OptionTile
            key={bg.id}
            active={background.mode === 'image' && background.imagePath === bg.imagePath}
            onClick={() => onBackgroundChange({ mode: 'image', imagePath: bg.imagePath, label: bg.label })}
            label={bg.label.replace('Lumexa ', '')}
            disabled={!supported}
            testId={`bg-${bg.id}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail from a fixed local asset, next/image isn't worth the setup here */}
            <img src={bg.thumbnailPath} alt="" className="w-full h-full object-cover" />
          </OptionTile>
        ))}
      </div>

      <div className="border-t border-[var(--cr-border)] mt-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)] mb-3">Appearance</p>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="effects-lighting" className="text-sm text-[var(--cr-text)] flex items-center gap-1.5">
              <Sun size={14} /> Lighting adjustment
            </label>
            <span className="text-xs text-[var(--cr-text-muted)] tabular-nums" data-testid="lighting-value">
              {lightingPercent > 0 ? `Auto · ${lightingPercent}%` : 'Off'}
            </span>
          </div>
          <input
            id="effects-lighting"
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={!supported}
            value={lightingPercent}
            aria-valuetext={lightingPercent > 0 ? `Automatic, ${lightingPercent} percent` : 'Off'}
            data-testid="lighting-slider"
            onChange={(e) => onAppearanceChange({ ...appearance, lighting: lightingFromPercent(Number(e.target.value)) })}
            className="w-full accent-[var(--cr-accent)] disabled:opacity-40"
          />
          <p className="text-[11px] leading-snug text-[var(--cr-text-faint)] mt-1">
            Brightens a dim or unevenly lit picture automatically.
          </p>
        </div>

        <Switch
          checked={appearance.touchUp}
          onChange={(touchUp) => onAppearanceChange({ ...appearance, touchUp })}
          label="Touch-up"
          icon={<Wand2 size={14} />}
          disabled={!supported}
          testId="touch-up-toggle"
        />
        <Switch
          checked={appearance.autoFraming}
          onChange={(autoFraming) => onAppearanceChange({ ...appearance, autoFraming })}
          label="Auto-framing"
          icon={<ScanFace size={14} />}
          disabled={!supported}
          testId="auto-framing-toggle"
        />
      </div>
    </div>
  );
}
