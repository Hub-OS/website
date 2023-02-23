import { PackageMeta } from "@/types/package-meta";
import Image from "next/image";
import styles from "@/styles/ModPreview.module.css";
import classNames from "classnames";
import ElementIcon from "./element-icon";
import { useEffect, useState } from "react";

type Props = { meta: PackageMeta; className?: string };

const colorMap: { [key: string]: string } = {
  red: "#F83020",
  green: "#38E008",
  blue: "#48A0F8",
  pink: "#F8A8E0",
  yellow: "#FFFF21",
};

function mapColors(colors: string[] | undefined) {
  return colors?.map((color) => colorMap[color.toLowerCase()] || color);
}

export default function ModPreview({ meta, className }: Props) {
  const encodedId = encodeURIComponent(meta.package.id);
  const [previewPath, setPreviewUri] = useState(
    meta.package.preview_texture_path && `/api/mods/${encodedId}/preview`
  );
  const [colors, setColors] = useState<string[] | undefined>();

  useEffect(() => {
    setColors(mapColors(meta.package.colors));
  }, [meta.package.colors]);

  useEffect(() => {
    const color = colors?.[0];
    const shape = meta.package.shape;
    const flat = meta.package.flat;

    if (!color || !shape) {
      return;
    }

    const blockLen = 3;
    const gridLen = 5;
    const marginX = 6;

    const canvas_len = blockLen * gridLen;

    const canvas = document.createElement("canvas");
    canvas.width = canvas_len + marginX;
    canvas.height = canvas_len;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    ctx.strokeStyle = "#0002";
    ctx.fillStyle = color;

    for (let i = 0; i < gridLen; i++) {
      const y = i * blockLen;

      for (let j = 0; j < gridLen; j++) {
        if (!shape[i][j]) {
          continue;
        }

        const x = j * blockLen + Math.floor(marginX / 2);

        ctx.fillRect(x, y, blockLen, blockLen);

        if (flat) {
          continue;
        }

        const centerX = x + blockLen / 2;
        const centerY = y + blockLen / 2;

        ctx.moveTo(centerX, y);
        ctx.lineTo(centerX, y + blockLen);
        ctx.moveTo(x, centerY);
        ctx.lineTo(x + blockLen, centerY);
      }
    }

    ctx.stroke();

    canvas.toBlob((blob) => {
      if (blob) {
        const uri = URL.createObjectURL(blob);
        setPreviewUri(uri);
      }
    });
    console.log();
  }, [colors, meta]);

  return (
    <div
      className={classNames(styles.preview_container, className, {
        [styles.black_bars]: meta.package.category == "card",
      })}
    >
      {previewPath && (
        <Image
          className={styles.preview_image}
          src={previewPath}
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

      {meta.package.category == "augment" && (
        <div className={styles.banner}>
          {colors?.map((color) => (
            <div
              key={color}
              className={styles.block_color}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
