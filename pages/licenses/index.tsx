import projects from "@/_licenses.json";
import Link from "next/link";
import styles from "@/styles/Licenses.module.css";
import Head from "next/head";

export default function Licenses() {
  return (
    <>
      <Head>
        <title>Licenses - Hub OS</title>
      </Head>

      {projects.map((project) => (
        <div key={project.name} className={styles.list_item}>
          <div className={styles.project_name}>{project.name}</div>

          <div className={styles.links}>
            {project.homepage && <Link href={project.homepage}>HOMEPAGE</Link>}

            <Link href={`/licenses/${encodeURIComponent(project.name)}`}>
              LICENSE
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}
