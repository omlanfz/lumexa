'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken, parseStoredUser } from '@/lib/storage';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  age: number | null;
  grade: string | null;
  subjects: string[];
  spaceRank: string;
  rankIcon: string;
  totalSessions: number;
  streakWeeks: number;
  gemBalance: number;
  accountStatus: string;
}

const GRADE_OPTIONS = [
  'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11',
  'Grade 12', 'College / University', 'Other',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      {sub && <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function SaveButton({
  saving,
  saved,
  onClick,
  disabled,
}: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
        saved
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-teal-500 hover:bg-teal-400 text-black disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]'
      }`}
    >
      {saving ? (
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          Saving…
        </span>
      ) : saved ? (
        '✓ Saved'
      ) : (
        'Save Changes'
      )}
    </button>
  );
}

// ─── Avatar upload helper ──────────────────────────────────────────────────────

function AvatarSection({
  avatarUrl,
  fullName,
  onUploaded,
}: {
  avatarUrl: string | null;
  fullName: string;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const initial = fullName ? fullName.charAt(0).toUpperCase() : '?';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('File too large (max 4 MB).');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Only image files allowed.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.post<{ avatarUrl: string }>('/uploads/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data.avatarUrl);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Upload failed.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Avatar"
            width={72}
            height={72}
            className="w-[72px] h-[72px] rounded-full object-cover border-2 border-teal-700/50"
          />
        ) : (
          <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-black text-2xl font-bold border-2 border-teal-700/50">
            {initial}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 border border-teal-600/50 text-teal-400 text-sm font-medium rounded-lg hover:bg-teal-900/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Change Photo'}
        </button>
        <p className="text-gray-500 text-xs mt-1.5">JPG, PNG or GIF · Max 4 MB</p>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Profile section state
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password section state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push('/login'); return; }
    const role = getStoredRole();
    if (role !== 'STUDENT') { router.push('/login'); return; }
    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<StudentProfile>('/students/me');
      const p = res.data;
      setProfile(p);
      setFullName(p.fullName);
      setGrade(p.grade ?? '');
      setAvatarUrl(p.avatarUrl);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load profile.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) { setProfileError('Name is required.'); return; }
    setProfileSaving(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      const res = await api.patch<StudentProfile>('/students/me', {
        fullName: fullName.trim(),
        grade: grade || undefined,
        avatarUrl: avatarUrl ?? undefined,
      });
      setProfile(res.data);
      // Sync fullName in localStorage so the nav updates on next reload
      const stored = parseStoredUser();
      if (stored) {
        localStorage.setItem('user', JSON.stringify({ ...stored, fullName: res.data.fullName }));
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setProfileError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { setPwError('Current password is required.'); return; }
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    setPwSaving(true);
    setPwError('');
    setPwSaved(false);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPwSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setPwError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to change password.'));
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-5xl">🚫</p>
        <p className="text-red-400 text-sm max-w-sm text-center">{error}</p>
        <button onClick={fetchProfile} className="text-teal-400 underline text-sm">
          Try again
        </button>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-2xl space-y-8 pt-6 pb-16 fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your account details</p>
      </div>

      {/* ── Profile section ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 space-y-5 transition-colors">
        <SectionHeader title="Profile" sub="Your identity and learning preferences" />

        {/* Avatar */}
        <AvatarSection
          avatarUrl={avatarUrl}
          fullName={fullName}
          onUploaded={(url) => {
            setAvatarUrl(url);
            setProfileSaved(false);
          }}
        />

        {/* Full name */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5" htmlFor="fullName">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setProfileSaved(false); }}
            maxLength={100}
            className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-500 transition-colors"
            placeholder="Your name"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">
            Email Address
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={profile.email}
              readOnly
              className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500 text-sm rounded-lg px-3 py-2.5 cursor-not-allowed"
            />
            <span className="text-xs text-gray-600 whitespace-nowrap">Cannot change</span>
          </div>
        </div>

        {/* Grade */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5" htmlFor="grade">
            Grade / Year
          </label>
          <select
            id="grade"
            value={grade}
            onChange={(e) => { setGrade(e.target.value); setProfileSaved(false); }}
            className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-500 transition-colors"
          >
            <option value="">Select grade</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Read-only stats */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700/50">
          <p className="text-xs text-gray-500 font-medium mb-3">Account Info</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Space Rank', value: `${profile.rankIcon} ${profile.spaceRank.replace(/_/g, ' ')}` },
              { label: 'Sessions', value: String(profile.totalSessions) },
              { label: 'Streak', value: `${profile.streakWeeks}w` },
            ].map((s) => (
              <div key={s.label} className="bg-gray-100 dark:bg-gray-800/60 rounded-lg px-3 py-2 text-center">
                <p className="text-gray-900 dark:text-white text-sm font-semibold">{s.value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {profileError && (
          <p className="text-red-400 text-sm">{profileError}</p>
        )}

        <div className="flex justify-end pt-1">
          <SaveButton
            saving={profileSaving}
            saved={profileSaved}
            onClick={handleSaveProfile}
          />
        </div>
      </section>

      {/* ── Password section ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 space-y-5">
        <SectionHeader title="Change Password" sub="Update your account password" />

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5" htmlFor="currentPw">
            Current Password
          </label>
          <div className="relative">
            <input
              id="currentPw"
              type={showCurrentPw ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPwSaved(false); }}
              autoComplete="current-password"
              className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-200 text-sm"
            >
              {showCurrentPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5" htmlFor="newPw">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPw"
              type={showNewPw ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwSaved(false); }}
              autoComplete="new-password"
              minLength={8}
              className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="Min. 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowNewPw((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-200 text-sm"
            >
              {showNewPw ? '🙈' : '👁️'}
            </button>
          </div>
          {newPassword.length > 0 && newPassword.length < 8 && (
            <p className="text-orange-400 text-xs mt-1">
              {8 - newPassword.length} more character{8 - newPassword.length !== 1 ? 's' : ''} needed
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5" htmlFor="confirmPw">
            Confirm New Password
          </label>
          <input
            id="confirmPw"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setPwSaved(false); }}
            autoComplete="new-password"
            className={`w-full bg-gray-200 dark:bg-gray-700 border text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-colors ${
              confirmPassword && newPassword !== confirmPassword
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-gray-600 focus:border-teal-500'
            }`}
            placeholder="Re-enter new password"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
          )}
        </div>

        {pwError && <p className="text-red-400 text-sm">{pwError}</p>}

        <div className="flex justify-end pt-1">
          <SaveButton
            saving={pwSaving}
            saved={pwSaved}
            onClick={handleChangePassword}
            disabled={!currentPassword || newPassword.length < 8 || newPassword !== confirmPassword}
          />
        </div>
      </section>
    </div>
  );
}
