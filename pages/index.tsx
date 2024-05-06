import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
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
  const [currentImage, setCurrentImage] = useState(() => images[0]);

  return (
    <>
      <header className={styles.header}>
        <span>Hub OS</span>
        <span>Latest Version: 0.19.0</span>
      </header>

      <div className={styles.preview_container}>
        <div className={styles.main_preview}>
          <Image src={currentImage} alt="" priority />
        </div>
        <div className={styles.preview_list}>
          {images.map((image, i) => (
            <Image
              key={i}
              src={image}
              alt=""
              height={80}
              onClick={() => {
                setCurrentImage(image);
              }}
            />
          ))}
        </div>
      </div>

      <div className={styles.links_container}>
        <ul>
          <li>
            <Link href="https://github.com/Hub-OS/Hub-OS/releases/latest">
              DOWNLOAD
            </Link>
          </li>
          <li>
            <Link href="https://discord.gg/6mWpQ29nMb">DISCORD</Link>
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
