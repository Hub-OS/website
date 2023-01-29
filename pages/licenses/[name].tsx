import projects from "@/_licenses.json";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "@/styles/Licenses.module.css";

export default function License() {
  const router = useRouter();
  const name = router.query.name;

  const project = projects.find((project) => project.name == name);

  if (!project) {
    return <>Page not found</>;
  }

  return (
    <>
      <div key={project.name} className={styles.list_item}>
        <div className={styles.project_name}>{project.name}</div>

        <div className={styles.links}>
          {project.homepage && <Link href={project.homepage}>HOMEPAGE</Link>}
        </div>
      </div>
      <br />
      <pre>{project.licenseText}</pre>
    </>
  );
}
