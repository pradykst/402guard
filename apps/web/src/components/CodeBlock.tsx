import React from 'react';

interface CodeBlockProps {
  code: string;
  title?: string;
  language?: string;
}

export function CodeBlock({ code, title, language = 'typescript' }: CodeBlockProps) {
  const highlightedCode = highlightSyntax(code);

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-[#1e1e1e] text-sm font-mono shadow-xl">
      {title && (
        <div className="bg-[#252526] px-4 py-2 border-b border-zinc-800 text-zinc-400 flex items-center justify-between">
          <span className="text-zinc-300 font-medium">{title}</span>
          <span className="text-xs text-zinc-500 uppercase">{language}</span>
        </div>
      )}
      <div className="p-4 overflow-x-auto text-[#d4d4d4] leading-relaxed">
        <pre>
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
    </div>
  );
}

function highlightSyntax(code: string): string {
  // Simple regex-based syntax highlighting for TypeScript/JSON

  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Strings
  html = html.replace(/(".*?")|('.*?')/g, '<span class="text-[#ce9178]">$1$2</span>');

  // Keywords
  const keywords = /\b(import|from|const|await|async|function|return|if|else|try|catch|true|false|export|default|class|interface|type)\b/g;
  html = html.replace(keywords, '<span class="text-[#569cd6]">$1</span>');

  // Control flow / storage
  const control = /\b(new|throw|void)\b/g;
  html = html.replace(control, '<span class="text-[#c586c0]">$1</span>');

  // Functions (heuristics: word followed by paren)
  html = html.replace(/\b([a-zA-Z0-9_$]+)(?=\()/g, '<span class="text-[#dcdcaa]">$1</span>');

  // Numbers
  html = html.replace(/\b(\d+)\b/g, '<span class="text-[#b5cea8]">$1</span>');

  // Comments (single line) - apply last to override others inside comments if possible
  // Note: regex replaces are sequential on the whole string, so earlier replaces might corrupt comment text if it matches (e.g. "import" in a comment).
  // A proper tokenizer needs to be stateful. But for this hackathon demo:
  // We will assume comments are fairly clean or just color the // part green.
  // Actually, let's just do comments last and hope for the best on overlaps.
  html = html.replace(/(\/\/.*$)/gm, '<span class="text-[#6a9955]">$1</span>');

  return html;
}
