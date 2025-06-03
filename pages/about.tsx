import Link from "next/link";
import styles from "@/styles/About.module.css";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>About - Hub OS</title>
      </Head>

      <div>
        <p>
          Hub OS is an online battle experience that takes place on
          interconnected servers, or Hubs.
        </p>

        <br />

        <div className={styles.dashed_lists}>
          Highlights:
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
          How We Think:
          <br />
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
                  suggestion - no matter how bad it may seem: It's worth
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

        <p>
          Hub OS has roots in{" "}
          <Link href="https://github.com/TheMaverickProgrammer/OpenNetBattle">
            OpenNetBattle
          </Link>
        </p>

        <br />

        <div>Special Thanks:</div>
        <br />

        <ul className={styles.thanks_list}>
          <li>Abigail Allbright</li>
          <li>Alrysc</li>
          <li>cantrem404</li>
          <li>CosmicNobab</li>
          <li>ChordMankey</li>
          <li>Dawn Elaine</li>
          <li>D3str0y3d255</li>
          <li>DJRezzed</li>
          <li>Dunstan</li>
          <li>Ehab2020</li>
          <li>FrozenLake</li>
          <li>Gemini</li>
          <li>Gray Nine</li>
          <li>Gwyneth Hestin</li>
          <li>JamesKing</li>
          <li>JonTheBurger</li>
          <li>KayThree</li>
          <li>Keristero</li>
          <li>Konstinople</li>
          <li>Kuri</li>
          <li>kyqurikan</li>
          <li>Loui</li>
          <li>Mars</li>
          <li>Mint</li>
          <li>Mithalan</li>
          <li>Mx. Claris Glennwood</li>
          <li>nickblock</li>
          <li>OuroYisus</li>
          <li>Pion</li>
          <li>Salad</li>
          <li>Shale</li>
          <li>svenevs</li>
          <li>theWildSushii</li>
          <li>Pheelbert</li>
          <li>PlayerZero</li>
          <li>Poly</li>
          <li>Pyredrid</li>
          <li>Weenie</li>
          <li>Zeek</li>
        </ul>
        <br />
        <span>
          This website was made with{" "}
          <Link href="/licenses">open source software</Link>
        </span>
      </div>
    </>
  );
}
