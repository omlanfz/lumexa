'use client';

import { use, useEffect, useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default function StarLabPage({ params }: PageProps) {
  const router = useRouter();
  const { bookingId } = use(params);

  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const authToken = getStoredToken();
    if (!authToken) {
      const role = getStoredRole();
      router.push('/login');
      return;
    }

    const init = async () => {
      try {
        const res = await api.post('/classroom/join', { bookingId });
        setToken(res.data.token);
        setServerUrl(res.data.url);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        setError(e.response?.data?.message ?? 'Star Lab connection failed. Coordinates invalid.');
      }
    };

    init();
  }, [bookingId, router]);

  const handleDisconnect = () => {
    const role = getStoredRole();
    router.push(role === 'STUDENT' ? '/student-dashboard' : '/dashboard');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono border border-red-900 m-10 rounded">
        ⚠ {error}
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-blue-400 font-mono">
        <div className="animate-spin text-4xl mb-4">🛸</div>
        <p className="tracking-widest animate-pulse">ESTABLISHING QUANTUM LINK...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        style={{ height: '100vh' }}
        onDisconnected={handleDisconnect}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
