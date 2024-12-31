import Link from "next/link";
import { getStaticPaths, readPostFile } from "@/tech-yap/lib";
import matter from "gray-matter";
import markdownStyles from "@/styles/Markdown.module.css";
import styles from "@/styles/TechYap.module.css";
import Head from "next/head";

type PostMeta = {
  title: string;
  params: {
    name: string;
    date: string;
  };
};

type Props = {
  posts: PostMeta[];
};

export default function TechYap({ posts }: Props) {
  return (
    <>
      <Head>
        <title>Tech Yap - Hub OS</title>
      </Head>
      <h1>Welcome to the Hub OS Technical Yap</h1>
      <div className={markdownStyles.markdown}>
        <p>
          This blog serves to document ideas and details that may be interesting
          to anyone wanting to directly work on the Hub OS project, create a
          similar project, or just have an extra source to follow development.
        </p>
      </div>
      Posts:
      <ul className={styles.link_list}>
        {posts.map(({ title, params }) => {
          const href = `/tech-yap/${params.date}/${params.name}`;

          return (
            <li key={href}>
              <Link href={href}>{title}</Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function getStaticProps(): { props: Props } {
  const posts = getStaticPaths().paths.map(({ params }) => {
    const fileContent = readPostFile(params);
    const matterResult = matter(fileContent);

    return { title: matterResult.data.title, params };
  });

  return {
    props: {
      posts,
    },
  };
}
