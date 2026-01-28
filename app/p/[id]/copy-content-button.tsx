'use client';

interface CopyContentButtonProps {
  content: string;
}

export default function CopyContentButton({ content }: CopyContentButtonProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    const button = document.getElementById('copy-content-btn');
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('bg-green-600', 'hover:bg-green-700');
      button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      setTimeout(() => {
        if (button) {
          button.textContent = originalText;
          button.classList.remove('bg-green-600', 'hover:bg-green-700');
          button.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }
      }, 2000);
    }
  };

  return (
    <button
      id="copy-content-btn"
      onClick={copyToClipboard}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-2 shadow-sm"
      title="Copy paste content"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      Copy Text
    </button>
  );
}


