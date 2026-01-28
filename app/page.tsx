'use client';

import { useState } from 'react';

export default function Home() {
  const [content, setContent] = useState('');
  const [ttlSeconds, setTtlSeconds] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: any = { content };
      if (ttlSeconds) {
        body.ttl_seconds = parseInt(ttlSeconds, 10);
      }
      if (maxViews) {
        body.max_views = parseInt(maxViews, 10);
      }

      const response = await fetch('/api/pastes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create paste');
        return;
      }

      setResult(data);
      setContent('');
      setTtlSeconds('');
      setMaxViews('');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto font-sans">
      <h1 className="mb-8 text-3xl font-bold">Pastebin-Lite</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <label htmlFor="content" className="block mb-2 font-semibold">
            Content *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
            className="w-full p-2 border border-gray-300 rounded font-mono text-sm box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your paste content here..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="ttl" className="block mb-2">
              TTL (seconds, optional)
            </label>
            <input
              type="number"
              id="ttl"
              value={ttlSeconds}
              onChange={(e) => setTtlSeconds(e.target.value)}
              min="1"
              className="w-full p-2 border border-gray-300 rounded box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 3600"
            />
          </div>

          <div>
            <label htmlFor="maxViews" className="block mb-2">
              Max Views (optional)
            </label>
            <input
              type="number"
              id="maxViews"
              value={maxViews}
              onChange={(e) => setMaxViews(e.target.value)}
              min="1"
              className="w-full p-2 border border-gray-300 rounded box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 5"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {loading ? 'Creating...' : 'Create Paste'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
          <p className="m-0 mb-2 font-semibold">Paste created successfully!</p>
          <p className="m-0 mb-2">
            <strong>ID:</strong> {result.id}
          </p>
          <p className="m-0 mb-2">
            <strong>URL:</strong>{' '}
            <a 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {result.url}
            </a>
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.url);
              alert('URL copied to clipboard!');
            }}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition-colors"
          >
            Copy URL
          </button>
        </div>
      )}
    </div>
  );
}

