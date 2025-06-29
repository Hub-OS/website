import Link from "next/link";
import Image, { StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import { PlayButton } from "@/components/icons";
import styles from "@/styles/Home.module.css";

import p0 from "@/public/previews/video-thumbnail.png";
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

type CarouselItem = {
  videoSrc?: string;
  preview: StaticImageData;
  description: string;
};

const carouselItems: CarouselItem[] = [
  {
    preview: p0,
    videoSrc: "https://www.youtube.com/embed/m4aw9rzHMH8?si=9A_My13gP4wXq14v",
    description: "Video",
  },
  // images
  ...[p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11].map((image, i) => ({
    preview: image,
    description: "Screenshot " + (i + 1),
  })),
];

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(() => 0);

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
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            event.preventDefault();
          }
          break;
        case "ArrowRight":
          if (currentIndex < carouselItems.length - 1) {
            setCurrentIndex(currentIndex + 1);
            event.preventDefault();
          }
          break;
      }
    };

    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [currentIndex]);

  const item = carouselItems[currentIndex];

  return (
    <>
      <header className={styles.header}>
        <span>Hub OS</span>
      </header>

      <div>
        <div className={styles.main_preview}>
          <button
            aria-label="Previous"
            className={styles.left_arrow}
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
              }
            }}
          >
            {"<"}
          </button>

          {item.videoSrc ? (
            <iframe
              width="480"
              height="320"
              src={item.videoSrc}
              title={item.description}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <Image
              src={item.preview}
              alt={item.description}
              unoptimized
              priority
            />
          )}

          <button
            aria-label="Next"
            className={styles.right_arrow}
            onClick={() => {
              if (currentIndex < carouselItems.length - 1) {
                setCurrentIndex(currentIndex + 1);
              }
            }}
          >
            {">"}
          </button>
        </div>
        <div className={styles.preview_list}>
          {carouselItems.map((item, i) => (
            <div
              key={i}
              className={
                i == currentIndex ? styles.active_preview_item : undefined
              }
              onClick={() => {
                setCurrentIndex(i);
              }}
            >
              <Image src={item.preview} alt={item.description} height={80} />
              {item.videoSrc && (
                <div className={styles.play_circle}>
                  <PlayButton size={22} />
                </div>
              )}
            </div>
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
          <li>
            <Link href="https://bsky.app/profile/hubos.bsky.social">
              BLUESKY
            </Link>
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

      <div className={styles.itch}>
        Download on <Link href="https://hub-os.itch.io/hub-os">itch.io</Link>
        <br />
        Use the <Link href="https://itch.io/app">itch app</Link> for automatic
        updates
      </div>
    </>
  );
}
