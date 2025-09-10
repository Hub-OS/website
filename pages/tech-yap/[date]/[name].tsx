import { GetStaticPropsContext } from "next";
import Markdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter/dist/cjs/prism-light";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import matter from "gray-matter";
import postStyles from "@/styles/YapPost.module.css";
import markdownStyles from "@/styles/Markdown.module.css";
import Link from "next/link";
import Head from "next/head";
import { readPostFile, getStaticPaths } from "@/tech-yap/lib";

import lua from "react-syntax-highlighter/dist/cjs/languages/prism/lua";
import rust from "react-syntax-highlighter/dist/cjs/languages/prism/rust";
SyntaxHighlighter.registerLanguage("lua", lua);
SyntaxHighlighter.registerLanguage("rust", rust);

type Props = {
  title: string;
  date: string;
  markdown: string;
};

const syntaxStyle = structuredClone(vscDarkPlus);
syntaxStyle['pre[class*="language-"]'].background = "#0006";
syntaxStyle['code[class*="language-"]'].fontSize = 18;
syntaxStyle['code[class*="language-"]'].lineHeight = 1;
syntaxStyle['code[class*="language-"]'].background = undefined;

export default function Post({ title, date, markdown }: Props) {
  return (
    <>
      <Head>
        <title>{`${title} - Hub OS`}</title>
      </Head>

      <div className={postStyles.top_controls}>
        <Link href="/tech-yap">{"< BACK"}</Link>

        <div className={postStyles.meta_data}>{date}</div>
      </div>

      <h1>{title}</h1>

      <div className={markdownStyles.markdown}>
        <Markdown
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
          {markdown}
        </Markdown>
      </div>
    </>
  );
}

export function getStaticProps(context: GetStaticPropsContext): {
  props: Props;
} {
  const fileContent = readPostFile(context.params!);
  const matterResult = matter(fileContent);

  return {
    props: {
      title: matterResult.data.title,
      date: context.params!.date as string,
      markdown: matterResult.content,
    },
  };
}

export { getStaticPaths };
