'use client';

import { useEffect, useRef } from 'react';

interface CodeDisplayProps {
  content: string;
  syntax?: string;
  syntaxClass: string;
  hasSyntax: boolean;
}

export default function CodeDisplay({ content, syntax, syntaxClass, hasSyntax }: CodeDisplayProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hasSyntax && codeRef.current && typeof window !== 'undefined') {
      // Dynamically import Prism if available
      const Prism = (window as any).Prism;
      if (Prism) {
        Prism.highlightElement(codeRef.current);
      }
    }
  }, [hasSyntax, content]);

  if (hasSyntax) {
    return (
      <code ref={codeRef} className={syntaxClass}>
        {content}
      </code>
    );
  }

  return (
    <code className="text-sm">
      {content}
    </code>
  );
}


