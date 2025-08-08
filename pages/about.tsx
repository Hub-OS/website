import React from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "@/styles/About.module.css";

export default function About() {
  return (
    <>
      <Head>
        <title>About - Hub OS</title>
      </Head>

      <div>
        <p>
          Hub OS is an open-source Mega Man Battle Network fan project and
          online battle experience that takes place on interconnected servers,
          or Hubs.
        </p>

        <br />

        <p>
          <Link href="/credits">CREDITS!</Link>
        </p>

        <br />

        <div className={styles.dashed_lists}>
          <h2>Highlights</h2>

          <ul>
            <li>Rollback Netcode</li>
            <li>Multi-Battles (3+ players in a battle)</li>
            <li>Cross Platform - Windows, MacOS, Linux</li>
            <li>Custom Content - including mod manager and documentation</li>
            <li>Resource Packs</li>
            <li>Many, many, QOL features</li>
          </ul>
        </div>

        <br />

        <div className={styles.dashed_lists}>
          <h2>How We Think</h2>
          <ul>
            <li>
              Accuracy is not the end goal.
              <ul>
                <li>
                  We don't want to adopt bugs and issues from our inspirations,
                  we want to make something truly better.
                </li>
              </ul>
            </li>
            <br />

            <li>
              Listen to players and focus on QOL.
              <ul>
                <li>
                  Not every idea has to be the default, if someone has a
                  suggestion - no matter how conflicting it may seem: It's worth
                  listening to. <br />
                  <br />
                  Maybe we can find a way to squeeze in an option, or we can
                  search for another solution that works for everyone.
                </li>
              </ul>
            </li>
            <br />

            <li>
              Allow creators to express themselves.
              <ul>
                <li>
                  Restrictions on creations are for security, composability, or
                  lack of time.
                </li>
              </ul>
            </li>
          </ul>
        </div>

        <br />

        <h2>History</h2>

        <p>
          Hub OS has roots in{" "}
          <Link href="https://github.com/TheMaverickProgrammer/OpenNetBattle">
            OpenNetBattle
          </Link>
        </p>

        <br />

        <span>
          This website was made with{" "}
          <Link href="/licenses">open source software</Link>
        </span>
      </div>
    </>
  );
}
