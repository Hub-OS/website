import fs from "node:fs";
import _ from "lodash";

const dirPath = "./public/static/tech-yap/posts/";

type YapPostPath = { params: { date: string; name: string } };

export function getStaticPaths() {
  const paths = fs
    .readdirSync(dirPath)
    .filter((path) => path.endsWith(".md"))
    .map((path) => {
      const date = path.slice(0, 10);
      const name = path.slice(11, -3);

      return { params: { date, name } };
    });

  return {
    paths: _.orderBy(paths, (path: YapPostPath) => path.params.date, "desc"),
    fallback: false,
  };
}

export function readPostFile({
  date,
  name,
}: NodeJS.Dict<string | string[]>): string {
  return fs.readFileSync(dirPath + date + "-" + name + ".md", "utf-8");
}
