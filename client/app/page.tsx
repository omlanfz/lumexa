import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-6 text-blue-600">
        Lumexa
      </h1>
      <div className="space-x-4">
        <Link
          href="/login"
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Parent Sign Up
        </Link>
      </div>
    </div>
  );
}
