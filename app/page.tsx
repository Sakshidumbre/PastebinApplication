'use client';

import { useState } from 'react';

const SYNTAX_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'markdown', label: 'Markdown' },
];

const EXPIRATION_OPTIONS = [
  { value: '', label: 'Never' },
  { value: '1m', label: '1 Minute' },
  { value: '10m', label: '10 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
  { value: '2w', label: '2 Weeks' },
  { value: '1month', label: '1 Month' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
];

export default function Home() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [syntax, setSyntax] = useState('');
  const [expiration, setExpiration] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [burnAfterRead, setBurnAfterRead] = useState(false);
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
      if (title.trim()) {
        body.title = title.trim();
      }
      if (syntax) {
        body.syntax = syntax;
      }
      if (expiration) {
        body.expiration = expiration;
      }
      if (maxViews) {
        body.max_views = parseInt(maxViews, 10);
      }
      if (burnAfterRead) {
        body.burn_after_read = true;
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
      setTitle('');
      setSyntax('');
      setExpiration('');
      setMaxViews('');
      setBurnAfterRead(false);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Pastebin-Lite</h1>
          <p className="text-gray-600">Create and share your code snippets</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-4">
            <label htmlFor="title" className="block mb-2 font-semibold text-gray-700">
              Paste Name / Title (optional)
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Untitled"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="content" className="block mb-2 font-semibold text-gray-700">
              Content *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={15}
              className="w-full p-3 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your paste content here..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="syntax" className="block mb-2 text-gray-700">
                Syntax Highlighting
              </label>
              <select
                id="syntax"
                value={syntax}
                onChange={(e) => setSyntax(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SYNTAX_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expiration" className="block mb-2 text-gray-700">
                Paste Expiration
              </label>
              <select
                id="expiration"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EXPIRATION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="maxViews" className="block mb-2 text-gray-700">
                Max Views (optional)
              </label>
              <input
                type="number"
                id="maxViews"
                value={maxViews}
                onChange={(e) => setMaxViews(e.target.value)}
                min="1"
                disabled={burnAfterRead}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="e.g., 5"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={burnAfterRead}
                  onChange={(e) => {
                    setBurnAfterRead(e.target.checked);
                    if (e.target.checked) {
                      setMaxViews('');
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">Burn after read</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Creating...' : 'Create New Paste'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 mb-4">
            {error}
          </div>
        )}

        {result && (
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg mb-4">
            <p className="m-0 mb-3 text-lg font-semibold text-green-800">Paste created successfully!</p>
            <div className="mb-3">
              <p className="m-0 mb-1 text-sm text-gray-600">
                <strong>ID:</strong> <span className="font-mono">{result.id}</span>
              </p>
              <p className="m-0 text-sm text-gray-600">
                <strong>URL:</strong>{' '}
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800 break-all"
                >
                  {result.url}
                </a>
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.url);
                alert('URL copied to clipboard!');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition-colors"
            >
              Copy URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
