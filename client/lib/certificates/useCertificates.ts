'use client';

// FILE PATH: client/lib/certificates/useCertificates.ts
//
// Small data hooks for the certificate screens.

import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from './format';
import { fetchBlob, studentCertificates } from './api';
import type { StudentCertificate } from './types';

/** The signed-in student's certificates. `certificates` is null while loading. */
export function useMyCertificates() {
  const [certificates, setCertificates] = useState<StudentCertificate[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setCertificates(await studentCertificates.list());
    } catch (err) {
      setError(
        apiErrorMessage(err, 'We could not load your certificates right now.'),
      );
    }
  }, []);

  useEffect(() => {
    let alive = true;
    studentCertificates
      .list()
      .then((list) => {
        if (alive) setCertificates(list);
      })
      .catch((err) => {
        if (alive)
          setError(
            apiErrorMessage(
              err,
              'We could not load your certificates right now.',
            ),
          );
      });
    return () => {
      alive = false;
    };
  }, []);

  return { certificates, error, reload };
}

/** Fetches an authenticated image (or any blob) and exposes it as an object URL
 * for an <img>. `path` null means "nothing to load". The URL is released when
 * the component unmounts or the path changes. */
export function useBlobUrl(path: string | null) {
  const [state, setState] = useState<{
    path: string | null;
    url: string | null;
    failed: boolean;
  }>({ path: null, url: null, failed: false });

  useEffect(() => {
    if (!path) return;
    let alive = true;
    let objectUrl: string | null = null;
    fetchBlob(path)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (alive) setState({ path, url: objectUrl, failed: false });
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (alive) setState({ path, url: null, failed: true });
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  // A result only counts for the path it was loaded for.
  const current = state.path === path ? state : null;
  return {
    url: current?.url ?? null,
    failed: current?.failed ?? false,
    loading: !!path && !current,
  };
}
