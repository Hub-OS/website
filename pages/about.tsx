import Link from "next/link";
import styles from "@/styles/About.module.css";

export default function Home() {
  return (
    <>
      <span>
        REAL-PET is derived from{" "}
        <Link href="https://github.com/TheMaverickProgrammer/OpenNetBattle">
          OpenNetBattle
        </Link>
        , splintered off from creative differences.
      </span>
      <br />
      <br />
      Special Thanks:
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
    </>
  );
}
