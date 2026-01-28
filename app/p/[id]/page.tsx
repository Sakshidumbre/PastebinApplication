import { notFound } from 'next/navigation';
import { getPaste, incrementViewCount } from '@/lib/kv';
import { isPasteAvailable, escapeHtml, escapeHtmlForCode } from '@/lib/utils';
import { headers } from 'next/headers';
import Script from 'next/script';
import ShareInput from './share-input';
import ExpirationHandler from './expiration-handler';
import CopyContentButton from './copy-content-button';

function getTestTimeFromHeaders(): number {
  const testMode = process.env.TEST_MODE === '1';
  const headersList = headers();
  const testNowMs = headersList.get('x-test-now-ms');
  
  if (testMode && testNowMs) {
    const parsed = Number.parseInt(testNowMs, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  
  return Date.now();
}

function getSyntaxClass(syntax?: string): string {
  if (!syntax) return '';
  const syntaxMap: Record<string, string> = {
    'javascript': 'language-javascript',
    'typescript': 'language-typescript',
    'python': 'language-python',
    'java': 'language-java',
    'cpp': 'language-cpp',
    'c': 'language-c',
    'csharp': 'language-csharp',
    'php': 'language-php',
    'ruby': 'language-ruby',
    'go': 'language-go',
    'rust': 'language-rust',
    'html': 'language-html',
    'css': 'language-css',
    'json': 'language-json',
    'sql': 'language-sql',
    'bash': 'language-bash',
    'markdown': 'language-markdown',
  };
  return syntaxMap[syntax] || '';
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export default async function PastePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const currentTime = getTestTimeFromHeaders();

  const paste = await getPaste(id, currentTime);

  if (!paste) {
    console.error(`Paste not found: ${id}`);
    notFound();
  }

  if (!isPasteAvailable(paste, currentTime)) {
    console.error(`Paste not available: ${id}, viewCount: ${paste.viewCount}, maxViews: ${paste.maxViews}, burnAfterRead: ${paste.burnAfterRead}`);
    notFound();
  }

  await incrementViewCount(id, currentTime);

  // Fetch the updated paste to get the correct viewCount after incrementing
  const updatedPaste = await getPaste(id, currentTime);
  
  // If updatedPaste is null (e.g., burnAfterRead was deleted), use original paste with incremented count
  // This allows displaying the paste on the first view even if it's been deleted
  const displayPaste = updatedPaste ?? { ...paste, viewCount: paste.viewCount + 1 };

  const syntaxClass = getSyntaxClass(displayPaste.syntax);
  const hasSyntax = !!displayPaste.syntax;
  
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const pasteUrl = `${protocol}://${host}/p/${id}`;

  const expiresAt = displayPaste.ttlSeconds 
    ? new Date(displayPaste.createdAt + displayPaste.ttlSeconds * 1000).toISOString()
    : null;
  
  const remainingViews = displayPaste.maxViews !== null 
    ? Math.max(0, displayPaste.maxViews - displayPaste.viewCount)
    : null;

  return (
    <>
      <ExpirationHandler 
        expiresAt={expiresAt} 
        createdAt={displayPaste.createdAt}
        ttlSeconds={displayPaste.ttlSeconds}
      />
      {hasSyntax && (
        <>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" />
          <Script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js" strategy="afterInteractive" />
          <Script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js" strategy="afterInteractive" />
        </>
      )}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className={`bg-gradient-to-r from-blue-600 to-blue-700 px-6 text-white ${displayPaste.title ? 'py-4' : 'py-3'}`}>
              <div className="flex-1">
                {displayPaste.title ? (
                  <>
                    <h1 className="text-2xl font-bold mb-2">{displayPaste.title}</h1>
                    <div className="flex flex-wrap gap-2 items-center text-sm text-blue-100">
                      <span className="font-mono">ID: {id}</span>
                      <span>•</span>
                      <span>Created: {formatDate(displayPaste.createdAt)}</span>
                      {displayPaste.syntax && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-1 bg-blue-500 rounded text-white">{displayPaste.syntax}</span>
                        </>
                      )}
                      {displayPaste.burnAfterRead && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-1 bg-red-500 rounded">Burn after read</span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="font-mono text-base font-semibold">ID: {id}</span>
                    <span className="text-blue-200">•</span>
                    <span className="text-sm">Created: {formatDate(displayPaste.createdAt)}</span>
                    {displayPaste.syntax && (
                      <>
                        <span className="text-blue-200">•</span>
                        <span className="px-2 py-1 bg-blue-500 rounded text-white text-sm">{displayPaste.syntax}</span>
                      </>
                    )}
                    {displayPaste.burnAfterRead && (
                      <>
                        <span className="text-blue-200">•</span>
                        <span className="px-2 py-1 bg-red-500 rounded text-sm">Burn after read</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Views:</span>
                  <span>{displayPaste.viewCount}</span>
                </div>
                {remainingViews !== null && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Remaining:</span>
                    <span className={remainingViews === 0 ? 'text-red-600 font-bold' : 'text-green-600'}>{remainingViews}</span>
                  </div>
                )}
                {expiresAt && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Expires:</span>
                    <span>{new Date(expiresAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
                <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasSyntax && (
                      <span className="text-gray-400 text-sm font-mono">{displayPaste.syntax}</span>
                    )}
                    <CopyContentButton content={displayPaste.content} />
                  </div>
                </div>
                <pre className={`p-6 overflow-x-auto text-gray-100 ${hasSyntax ? syntaxClass : ''}`} style={{ margin: 0 }}>
                  <code 
                    className={hasSyntax ? syntaxClass : 'text-sm'}
                    dangerouslySetInnerHTML={hasSyntax 
                      ? { __html: escapeHtmlForCode(displayPaste.content) }
                      : undefined
                    }
                  >
                    {hasSyntax ? null : escapeHtml(displayPaste.content)}
                  </code>
                </pre>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <ShareInput url={pasteUrl} title={displayPaste.title || 'Untitled Paste'} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { id } = params;
  const paste = await getPaste(id);
  
  if (!paste) {
    return {
      title: 'Paste Not Found',
    };
  }

  return {
    title: paste.title || `Paste ${id}`,
  };
}
