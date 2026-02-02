import { ReactNode } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "@/styles/Layout.module.css";
import AccountBadge from "./account-badge";

type Props = {
  children?: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <>
      <Head>
        <title>Hub OS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content={[
            "Hub OS is an open-source Mega Man Battle Network fan project and",
            "online battle experience that takes place on interconnected servers,",
            "or Hubs.",
          ].join(" ")}
        />
        <link rel="icon" href="/favicon.png" />
      </Head>

      <div className={styles.layout}>
        <div className={styles.navbar}>
          <div className={styles.links}>
            <Link href="/">Home</Link>
            <Link href="/mods">Mods</Link>
            {/* <Link href="/servers">Servers</Link> */}
            <Link href="/about">About</Link>
          </div>

          <AccountBadge />
        </div>
        <main className={styles.main}>{children}</main>
      </div>
    </>
  );
}
