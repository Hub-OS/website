import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "@/styles/Home.module.css";

import p1 from "@/public/previews/menu-morning.png";
import p2 from "@/public/previews/menu-night.png";
import p3 from "@/public/previews/grand-square-pvp-mat.png";
import p4 from "@/public/previews/grand-square-pvp.png";
import p5 from "@/public/previews/index-meeting.png";
import p6 from "@/public/previews/index-intro.png";
import p7 from "@/public/previews/grand-square-catnip.png";
import p8 from "@/public/previews/mod-downloader.png";
import p9 from "@/public/previews/drives.png";
import p10 from "@/public/previews/blocks.png";
import p11 from "@/public/previews/library.png";

const images = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11];

export default function Home() {
  const [imageIndex, setImageIndex] = useState(() => 0);

  useEffect(() => {
    document.querySelector("." + styles.active_preview_item)?.scrollIntoView({
      behavior: "instant",
    } as unknown as ScrollIntoViewOptions);

    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      switch (event.code) {
        case "ArrowLeft":
          if (imageIndex > 0) {
            setImageIndex(imageIndex - 1);
            event.preventDefault();
          }
          break;
        case "ArrowRight":
          if (imageIndex < images.length - 1) {
            setImageIndex(imageIndex + 1);
            event.preventDefault();
          }
          break;
      }
    };

    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [imageIndex]);

  return (
    <>
      <header className={styles.header}>
        <span>Hub OS</span>
        <span>Latest Version: 0.25.0</span>
      </header>

      <div className={styles.preview_container}>
        <div className={styles.main_preview}>
          <button
            aria-label="Previous Image"
            className={styles.left_arrow}
            onClick={() => {
              if (imageIndex > 0) {
                setImageIndex(imageIndex - 1);
              }
            }}
          >
            {"<"}
          </button>

          <Image src={images[imageIndex]} alt="" unoptimized priority />

          <button
            aria-label="Next Image"
            className={styles.right_arrow}
            onClick={() => {
              if (imageIndex < images.length - 1) {
                setImageIndex(imageIndex + 1);
              }
            }}
          >
            {">"}
          </button>
        </div>
        <div className={styles.preview_list}>
          {images.map((image, i) => (
            <Image
              className={
                i == imageIndex ? styles.active_preview_item : undefined
              }
              key={i}
              src={image}
              alt=""
              height={80}
              onClick={() => {
                setImageIndex(i);
              }}
            />
          ))}
        </div>
      </div>

      <div className={styles.links_container}>
        <ul>
          {/* <li>
            <Link href="https://github.com/Hub-OS/Hub-OS/releases/latest">
              DOWNLOAD
            </Link>
          </li> */}
          <li>
            <Link href="https://discord.hubos.dev">DISCORD</Link>
          </li>
        </ul>
        <ul>
          <li>
            <Link href="https://docs.hubos.dev">DOCUMENTATION</Link>
          </li>
          <li>
            <Link href="https://github.com/orgs/Hub-OS/repositories">
              CONTRIBUTE
            </Link>
          </li>
        </ul>
        <ul>
          <li>
            <Link href="/tech-yap">TECH YAP</Link>
          </li>
          <li>
            <Link href="/cat.png">CAT</Link>
          </li>
        </ul>
      </div>
    </>
  );
}
