import { PackageMeta, hasPreviewTexture } from "@/types/package-meta";
import Image, { StaticImageData } from "next/image";
import classNames from "classnames";
import ElementIcon from "./element-icon";
import { useEffect, useState } from "react";
import styles from "@/styles/ModPreview.module.css";

import switchDriveHeadImage from "@/public/switch-drive-head.png";
import switchDriveArmsImage from "@/public/switch-drive-arms.png";
import switchDriveBodyImage from "@/public/switch-drive-body.png";
import switchDriveLegsImage from "@/public/switch-drive-legs.png";

const switchDriveImageMap: { [slot: string]: StaticImageData } = {
  head: switchDriveHeadImage,
  arms: switchDriveArmsImage,
  body: switchDriveBodyImage,
  legs: switchDriveLegsImage,
};

type Props = {
  meta: PackageMeta;
  mini?: boolean;
  className?: string;
};

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

export default function ModPreview({ meta, mini, className }: Props) {
  const encodedId = encodeURIComponent(meta.package.id);
  const [previewPath, setPreviewUri] = useState(
    hasPreviewTexture(meta) && `/api/mods/${encodedId}/preview`
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
      setPreviewUri(
        hasPreviewTexture(meta) && `/api/mods/${encodedId}/preview`
      );

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
  }, [encodedId, colors, meta]);

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

      {meta.package.card_class == "recipe" && !previewPath && (
        <div className={styles.category_placeholder}>P.A.</div>
      )}

      {meta.package.category == "library" && !previewPath && (
        <div className={styles.category_placeholder}>LIBRARY</div>
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
            <ElementIcon
              className={styles.secondary_element}
              element={meta.package.secondary_element}
            />
          )}

          {!mini && meta.package.codes && (
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

      {meta.package.category == "augment" && meta.package.shape && (
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

      {meta.package.category == "augment" &&
        meta.package.slot &&
        (() => {
          const image = switchDriveImageMap[meta.package.slot.toLowerCase()];

          if (!image) {
            return;
          }

          return (
            <Image
              className={styles.preview_image}
              src={image}
              alt="preview image"
              fill
              unoptimized
            />
          );
        })()}
    </div>
  );
}
