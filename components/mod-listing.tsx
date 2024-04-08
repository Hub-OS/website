import { PackageMeta } from "@/types/package-meta";
import Link from "next/link";
import ModPreview from "./mod-preview";
import styles from "@/styles/ModListing.module.css";

type Props = { meta: PackageMeta };

export default function ModListing({ meta }: Props) {
  const encodedId = encodeURIComponent(meta.package.id);

  return (
    <Link
      className={styles.container}
      title={meta.package.name}
      href={`/mods/${encodedId}`}
    >
      <ModPreview meta={meta} className={styles.preview} mini />
      <span className={styles.name}>{meta.package.name}</span>
    </Link>
  );
}
