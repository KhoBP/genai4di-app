"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResponse("");

    try {
      const res = await fetch("/api/drug-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResponse(data.response);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-800">GenAI4DI</h1>
          <p className="text-gray-500 mt-1">
            AI-Assisted Drug Information Service — MOH Malaysia
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Drug Information Query
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What is the dose of IV acyclovir in a patient with CrCl 15 mL/min?"
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {loading ? "Generating response..." : "Submit Query"}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-sm">
            {error}
          </div>
        )}

        {response && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Response
            </h2>
            <div className="prose prose-sm max-w-none text-gray-800">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}