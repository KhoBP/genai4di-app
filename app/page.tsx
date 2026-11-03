"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { createBrowserClient } from '@/lib/supabase';

function renderWithBadges(text: string): string {
  const badgeBlock = (active: string) => {
    const levels = [
      { key: 'Well-supported', cls: 'badge-green' },
      { key: 'Limited evidence', cls: 'badge-amber' },
      { key: 'Insufficient evidence', cls: 'badge-red' },
    ];
    const pills = levels.map(l =>
      l.key === active
        ? `<span class="${l.cls}">${l.key}</span>`
        : `<span class="badge-inactive">${l.key}</span>`
    ).join(' ');
    return `<div class="uncertainty-block"><span class="uncertainty-label">Confidence Level</span><div class="uncertainty-pills">${pills}</div></div>`;
  };

  return text
    .replace(/UNCERTAINTY:\s*Well-supported/g, badgeBlock('Well-supported'))
    .replace(/UNCERTAINTY:\s*Limited evidence/g, badgeBlock('Limited evidence'))
    .replace(/UNCERTAINTY:\s*Insufficient evidence/g, badgeBlock('Insufficient evidence'))
    .replace(/(Query Classification|Direct Answer|Clinical Evidence and Details|Malaysia MOH Context[^:]*|Caveats and Monitoring|Uncertainty Level|Verification Checklist|References)[:.]/g, '<strong>$1:</strong>');
}

function FeedbackPanel({ queryLogId }: { queryLogId: string }) {
  const [rating,    setRating]    = useState<number | null>(null);
  const [thumbs,    setThumbs]    = useState<'up' | 'down' | null>(null);
  const [comment,   setComment]   = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function submit() {
    if (!rating && !thumbs) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryLogId, rating: rating ?? 3, thumbs, comment }),
      });
      if (!res.ok) throw new Error('Submit failed');
      setSubmitted(true);
    } catch {
      setError('Could not submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-4 p-3 bg-green-50 rounded-xl text-sm text-green-700 text-center">
        ✅ Thank you for your feedback.
      </div>
    );
  }

  return (
    <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Rate this response
      </p>
      <div className="flex gap-2">
        {(['up', 'down'] as const).map(t => (
          <button
            key={t}
            onClick={() => setThumbs(prev => prev === t ? null : t)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
              ${thumbs === t
                ? t === 'up'
                  ? 'bg-green-100 border-green-400 text-green-700'
                  : 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
          >
            {t === 'up' ? '👍 Helpful' : '👎 Not helpful'}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => setRating(prev => prev === star ? null : star)}
            className={`text-xl transition-transform hover:scale-110
              ${rating !== null && star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </button>
        ))}
        {rating && <span className="ml-1 text-xs text-gray-500 self-center">{rating}/5</span>}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Optional comments on accuracy, completeness, or clinical utility…"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2
                   focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={loading || (!rating && !thumbs)}
        className="px-4 py-1.5 bg-blue-700 text-white text-sm rounded-lg
                   hover:bg-blue-800 disabled:opacity-40 transition-colors"
      >
        {loading ? 'Submitting…' : 'Submit feedback'}
      </button>
    </div>
  );
}

export default function Home() {
  const [query,      setQuery]      = useState("");
  const [response,   setResponse]   = useState("");
  const [queryLogId, setQueryLogId] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [userEmail,  setUserEmail]  = useState<string | null>(null);

  const sessionId = useRef<string>(crypto.randomUUID());
  const supabase  = createBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResponse("");
    setQueryLogId(null);

    try {
      const res = await fetch("/api/drug-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, sessionId: sessionId.current }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResponse(data.response);
      setQueryLogId(data.queryLogId ?? null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header with user info */}
        <div className="mb-8 text-center relative">
          <h1 className="text-3xl font-bold text-blue-800">GenAI4DI</h1>
          <p className="text-gray-500 mt-1">
            AI-Assisted Drug Information Service 
          </p>
          {userEmail && (
            <div className="mt-2 flex items-center justify-center gap-3 text-xs text-gray-400">
              <span>{userEmail}</span>
              <button onClick={signOut}
                className="underline hover:text-gray-600">Sign out</button>
              <a href="/api/export?table=feedback" download
                className="underline hover:text-gray-600">Export CSV</a>
            </div>
          )}
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
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {renderWithBadges(response)}
              </ReactMarkdown>
            </div>
            {queryLogId && <FeedbackPanel queryLogId={queryLogId} />}
          </div>
        )}

      </div>
    </main>
  );
}