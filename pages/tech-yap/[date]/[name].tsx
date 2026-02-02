import { GetStaticPropsContext } from "next";
import Markdown from "@/components/markdown";
import matter from "gray-matter";
import postStyles from "@/styles/YapPost.module.css";
import markdownStyles from "@/styles/Markdown.module.css";
import Link from "next/link";
import Head from "next/head";
import { readPostFile, getStaticPaths } from "@/tech-yap/lib";

type Props = {
  title: string;
  date: string;
  markdown: string;
};

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
        <Markdown>{markdown}</Markdown>
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
