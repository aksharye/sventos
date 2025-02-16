"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const [sessionName, setSessionName] = useState("");
  const router = useRouter();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-blue-900 text-white">
      <h1 className="text-4xl font-bold text-center my-4">
        Sventos
      </h1>
      <Input
        type="text"
        className="w-full text-black max-w-xs border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Session Name"
        value={sessionName}
        onChange={(e) => setSessionName(e.target.value)}
      />
      <Button
        className="w-full max-w-xs mt-8 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
        disabled={!sessionName}
        onClick={() => router.push(`/call/${sessionName}`)}
      >
        Create Session
      </Button>
    </main>
  );
}
