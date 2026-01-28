import { notFound } from 'next/navigation';
import { getPaste, incrementViewCount } from '@/lib/kv';
import { isPasteAvailable, escapeHtml } from '@/lib/utils';
import { headers } from 'next/headers';

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

export default async function PastePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const currentTime = getTestTimeFromHeaders();

  const paste = await getPaste(id, currentTime);

  if (!paste || !isPasteAvailable(paste, currentTime)) {
    notFound();
  }

  await incrementViewCount(id, currentTime);

  const updatedPaste = await getPaste(id, currentTime);
  const displayPaste = updatedPaste ?? paste;

  return (
    <div className="p-8 max-w-3xl mx-auto font-mono">
      <pre className="whitespace-pre-wrap break-words bg-gray-100 p-4 rounded border border-gray-300">
        {escapeHtml(displayPaste.content)}
      </pre>
    </div>
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
    title: `Paste ${id}`,
  };
}

