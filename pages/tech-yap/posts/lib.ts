import fs from "node:fs";

const dirPath = "./pages/tech-yap/posts/";

export function getStaticPaths() {
  return {
    paths: fs
      .readdirSync(dirPath)
      .filter((path) => path.endsWith(".md"))
      .map((path) => {
        const date = path.slice(0, 10);
        const name = path.slice(11, -3);

        return { params: { date, name } };
      }),
    fallback: false,
  };
}

export function readPostFile({
  date,
  name,
}: NodeJS.Dict<string | string[]>): string {
  "use static";

  return fs.readFileSync(dirPath + date + "-" + name + ".md", "utf-8");
}
