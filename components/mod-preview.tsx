import { PackageMeta } from "@/types/package-meta";
import Image from "next/image";
import styles from "@/styles/ModPreview.module.css";
import classNames from "classnames";
import ElementIcon from "./element-icon";

type Props = { meta: PackageMeta; className?: string };

export default function ModPreview({ meta, className }: Props) {
  const encodedId = encodeURIComponent(meta.package.id);

  return (
    <div className={classNames(styles.preview_container, className)}>
      {meta.package.preview_texture_path && (
        <Image
          className={styles.preview_image}
          src={`/api/mods/${encodedId}/preview`}
          alt="preview image"
          fill
          unoptimized
        />
      )}

      {meta.package.category == "player" && (
        <ElementIcon
          className={styles.player_element}
          element={meta.package.element}
        />
      )}

      {meta.package.health && (
        <div className={styles.health}>{meta.package.health}</div>
      )}

      {meta.package.category == "card" && (
        <div className={styles.banner}>
          <ElementIcon element={meta.package.element} />

          {meta.package.secondary_element && (
            <ElementIcon element={meta.package.secondary_element} />
          )}

          {meta.package.codes && (
            <div className={styles.codes}>
              {meta.package.codes.map((code, i) => (
                <div key={i}>{code}</div>
              ))}
            </div>
          )}

          {meta.package.damage != 0 && meta.package.damage != undefined && (
            <div className={styles.damage}>{meta.package.damage}</div>
          )}
        </div>
      )}
    </div>
  );
}
