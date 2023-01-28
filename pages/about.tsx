import Link from "next/link";
import styles from "@/styles/About.module.css";

export default function Home() {
  return (
    <>
      REAL-PET is derived from{" "}
      <Link href="https://github.com/TheMaverickProgrammer/OpenNetBattle">
        OpenNetBattle
      </Link>
      , splintered off from creative differences.
      <br />
      <br />
      Special Thanks:
      <ul className={styles.thanks_list}>
        <li>Alison Allbright</li>
        <li>Alrysc</li>
        <li>CosmicNobab</li>
        <li>Dawn Elaine</li>
        <li>D3str0y3d255</li>
        <li>DJRezzed</li>
        <li>Dunstan</li>
        <li>FrozenLake</li>
        <li>Gemini</li>
        <li>Gray Nine</li>
        <li>JamesKing</li>
        <li>jontheburger</li>
        <li>Keristero</li>
        <li>Konstinople</li>
        <li>Kuri</li>
        <li>kyqurikan</li>
        <li>Loui</li>
        <li>Mars</li>
        <li>Mint</li>
        <li>Mithalan</li>
        <li>OuroYisus</li>
        <li>Pion</li>
        <li>Salad</li>
        <li>Shale</li>
        <li>theWildSushii</li>
        <li>Pheelbert</li>
        <li>PlayerZero</li>
        <li>Poly</li>
        <li>Weenie</li>
        <li>Zeek</li>
      </ul>
      <br />
      This website was made with{" "}
      <Link href="/licenses">open source software</Link>
    </>
  );
}
