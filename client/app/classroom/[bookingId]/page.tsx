"use client";

import { useEffect, useState, use } from "react"; // <--- Added 'use'
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import axios from "axios";
import { useRouter } from "next/navigation";

// Define Props correctly for Next.js 15+
interface PageProps {
  params: Promise<{ bookingId: string }>; // <--- Params is now a Promise
}

export default function StarLabPage({ params }: PageProps) {
  const router = useRouter();

  // 1. Unwrap the params using React.use()
  const { bookingId } = use(params);

  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const authToken = localStorage.getItem("token");
      if (!authToken) return router.push("/login");

      try {
        // Request Entry Pass
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/classroom/join`,
          { bookingId: bookingId }, // <--- Use the unwrapped bookingId
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        setToken(res.data.token);
        setServerUrl(res.data.url);
      } catch (err) {
        console.error(err);
        setError("Star Lab connection failed. Coordinates invalid.");
      }
    };
    init();
  }, [bookingId, router]); // <--- Depend on bookingId

  if (error)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono border border-red-900 m-10 rounded">
        ⚠ {error}
      </div>
    );

  if (!token)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-blue-400 font-mono">
        <div className="animate-spin text-4xl mb-4">🛸</div>
        <p className="tracking-widest animate-pulse">
          ESTABLISHING QUANTUM LINK...
        </p>
      </div>
    );

  return (
    <div className="h-screen w-full bg-black relative">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        style={{ height: "100vh" }}
        onDisconnected={() => router.back()}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
