"use client";

import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter/dist/cjs/prism-light";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";

import lua from "react-syntax-highlighter/dist/cjs/languages/prism/lua";
import rust from "react-syntax-highlighter/dist/cjs/languages/prism/rust";
SyntaxHighlighter.registerLanguage("lua", lua);
SyntaxHighlighter.registerLanguage("rust", rust);

const syntaxStyle = structuredClone(vscDarkPlus);
syntaxStyle['pre[class*="language-"]'].background = "#0006";
syntaxStyle['code[class*="language-"]'].fontSize = 18;
syntaxStyle['code[class*="language-"]'].lineHeight = 1;
syntaxStyle['code[class*="language-"]'].background = undefined;

export default function Markdown({
  children,
}: {
  children: string | null | undefined;
}) {
  return (
    <ReactMarkdown
      components={{
        code(props) {
          const { children, className, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");

          return match ? (
            // @ts-ignore, {...rest} matches documentation
            <SyntaxHighlighter
              {...rest}
              PreTag="div"
              language={match[1]}
              style={syntaxStyle}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
