'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Card } from '@/components/admin/AdminUI';
import SimpleMarkdown from '@/components/curriculum/SimpleMarkdown';
import ProjectLinksSection, { ProjectLink } from '@/components/curriculum/ProjectLinksSection';

interface LessonDetails {
  lesson: {
    id: string;
    title: string;
    type: string;
    objectives: string[];
    contentMarkdown: string | null;
    homework: string | null;
    checkpoint: string | null;
    codeSnippets: { label: string; language: string; code: string; part?: string }[];
    projectLinks: ProjectLink[] | null;
  };
  session: { courseTitle: string };
}

// A full page rather than a modal — lesson material and homework are long
// markdown documents, and a cramped popup with tiny textareas makes them
// painful to edit. Mirrors the live lesson page's own markdown rendering so
// the admin can preview formatting while they write.
export default function AdminLessonEditPage() {
  const params = useParams<{ lessonId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [courseTitle, setCourseTitle] = useState('');
  const [title, setTitle] = useState('');
  const [objectives, setObjectives] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [homework, setHomework] = useState('');
  const [codeSnippetCount, setCodeSnippetCount] = useState(0);
  const [projectLinks, setProjectLinks] = useState<ProjectLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<LessonDetails>(`/curriculum/lessons/${params.lessonId}/details`).then((res) => {
      if (cancelled) return;
      const l = res.data.lesson;
      setCourseTitle(res.data.session.courseTitle);
      setTitle(l.title);
      setObjectives(l.objectives.join('\n'));
      setCheckpoint(l.checkpoint ?? '');
      setContentMarkdown(l.contentMarkdown ?? '');
      setHomework(l.homework ?? '');
      setCodeSnippetCount(l.codeSnippets?.length ?? 0);
      setProjectLinks(l.projectLinks ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params.lessonId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.patch(`/curriculum/lessons/${params.lessonId}/content`, {
        title,
        objectives: objectives.split('\n').map((s) => s.trim()).filter(Boolean),
        contentMarkdown,
        homework,
        checkpoint,
        projectLinks: projectLinks
          .map((p) => ({ title: p.title.trim(), url: p.url.trim() }))
          .filter((p) => p.title && p.url),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-[var(--a-text-muted)] p-6">Loading…</p>;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10 bg-[var(--a-bg)] py-3 -mx-1 px-1 border-b border-[var(--a-border)]">
        <div>
          <button onClick={() => router.back()} className="text-sm text-[var(--a-accent)] hover:underline">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-[var(--a-text)] mt-1">
            Edit Lesson <span className="font-normal text-[var(--a-text-muted)]">— {courseTitle}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-[var(--a-success-text)]">Saved ✓</span>}
          {error && <span className="text-sm text-[var(--a-danger)]">{error}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Title and Checkpoint are both single-line fields — pairing them
          keeps two mostly-empty cards from stacking. */}
      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-base a-focus"
          />
        </Section>
        <Section title="Project Checkpoint" hint="What's due by the end of this specific session, if any.">
          <input
            value={checkpoint}
            onChange={(e) => setCheckpoint(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm a-focus"
          />
        </Section>
      </div>

      <Section title="Learning Objectives" hint="One per line — preview updates live on the right.">
        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            rows={7}
            className="w-full px-4 py-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm font-mono leading-relaxed a-focus"
          />
          <div className="rounded-lg border border-[var(--a-border)] p-4 bg-[var(--a-surface)]">
            {objectives.trim() ? (
              <ul className="list-disc list-inside space-y-1 text-sm text-[var(--a-text)]">
                {objectives
                  .split('\n')
                  .map((o) => o.trim())
                  .filter(Boolean)
                  .map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--a-text-faint)] italic">Nothing to preview yet.</p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Lesson Material" hint="Markdown — preview updates live on the right.">
        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            value={contentMarkdown}
            onChange={(e) => setContentMarkdown(e.target.value)}
            rows={24}
            className="w-full px-4 py-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm font-mono leading-relaxed a-focus resize-y"
          />
          <div className="rounded-lg border border-[var(--a-border)] p-4 overflow-y-auto max-h-[38rem] bg-[var(--a-surface)]">
            <SimpleMarkdown content={contentMarkdown || '*Nothing to preview yet.*'} />
          </div>
        </div>
      </Section>

      <Section title="Homework / Practice" hint="Markdown — preview updates live on the right.">
        <div className="grid md:grid-cols-2 gap-4">
          <textarea
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm font-mono leading-relaxed a-focus resize-y"
          />
          <div className="rounded-lg border border-[var(--a-border)] p-4 overflow-y-auto max-h-64 bg-[var(--a-surface)]">
            <SimpleMarkdown content={homework || '*Nothing to preview yet.*'} />
          </div>
        </div>
      </Section>

      <Section
        title="💻 Project"
        hint='Buttons ("Open Project" / "Copy Link") shown on the lesson page in place of the Code section. Leave empty to keep showing the Code section below instead. Add more than one entry (e.g. a recap session) to show each project under its own heading.'
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {projectLinks.map((link, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)]">
                <input
                  value={link.title}
                  onChange={(e) => {
                    const next = [...projectLinks];
                    next[i] = { ...next[i], title: e.target.value };
                    setProjectLinks(next);
                  }}
                  placeholder="Project name"
                  className="w-full sm:w-2/5 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text)] text-sm a-focus"
                />
                <input
                  value={link.url}
                  onChange={(e) => {
                    const next = [...projectLinks];
                    next[i] = { ...next[i], url: e.target.value };
                    setProjectLinks(next);
                  }}
                  placeholder="https://colab.research.google.com/..."
                  className="w-full flex-1 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text)] text-sm a-focus"
                />
                <button
                  onClick={() => setProjectLinks(projectLinks.filter((_, idx) => idx !== i))}
                  className="text-sm text-[var(--a-danger)] hover:underline px-1 self-start sm:self-center"
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => setProjectLinks([...projectLinks, { title: '', url: '' }])}
              className="text-sm text-[var(--a-accent)] hover:underline"
              type="button"
            >
              + Add project
            </button>
          </div>
          <div className="rounded-lg border border-[var(--a-border)] p-4 bg-[var(--a-surface)]">
            {projectLinks.filter((p) => p.title.trim() && p.url.trim()).length > 0 ? (
              <ProjectLinksSection projectLinks={projectLinks.filter((p) => p.title.trim() && p.url.trim())} />
            ) : (
              <p className="text-sm text-[var(--a-text-faint)] italic">
                Nothing to preview yet — the Code section below will show instead.
              </p>
            )}
          </div>
        </div>
      </Section>

      {codeSnippetCount > 0 && (
        <p className="text-xs text-[var(--a-text-faint)]">
          {codeSnippetCount} code snippet(s) attached to this lesson — imported from source content; not editable from this page yet.
          {projectLinks.filter((p) => p.title.trim() && p.url.trim()).length > 0 &&
            ' Currently hidden on the lesson page because a Project section above is set.'}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {saved && <span className="text-sm text-[var(--a-success-text)] self-center">Saved ✓</span>}
        {error && <span className="text-sm text-[var(--a-danger)] self-center">{error}</span>}
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-[var(--a-text)] mb-1">{title}</h2>
      {hint && <p className="text-xs text-[var(--a-text-faint)] mb-3">{hint}</p>}
      {!hint && <div className="mb-1" />}
      {children}
    </Card>
  );
}
