import React from "react";
import Head from "next/head";
import Link from "next/link";
import classNames from "classnames";
import styles from "@/styles/Credits.module.css";

const CREDITS_LINKS: { [key: string]: React.JSX.Element } = {
  "mondo.": (
    <Link href="https://www.youtube.com/channel/UC70QE2DBtzkG_W4_NWLvW2A">
      YouTube
    </Link>
  ),
  OpenNetBattle: (
    <Link href="https://github.com/theMaverickProgrammer/opennetbattle">
      GitHub
    </Link>
  ),
};

const CREDITS_LIST: [string, string[]][] = [
  ["Music", ["mondo."]],
  ["Sound Design", ["DJRezzed"]],
  ["Graphics", ["Konst", "Salad"]],
  ["User Experience", ["Gray Nine", "KayThree"]],
  ["Localization", ["Rockin"]],
  [
    "Testers",
    [
      "DeltaFiend",
      "Jack",
      "KayThree",
      "Kyqurikan",
      "PlayerZero",
      "Sefaia",
      "Tim (Tchomp)",
      "Void.ExE",
    ],
  ],
  ["Technical Design", ["Dawn Elaine", "JamesKing", "Mars"]],
  ["Programmers", ["Dawn Elaine", "JamesKing", "Konst"]],
  ["Core Team", ["Dawn Elaine", "Konst", "Mars"]],
  [
    "Special Thanks",
    [
      "Abigail Allbright",
      "Alrysc",
      "cantrem404",
      "CosmicNobab",
      "ChordMankey",
      "Dunstan",
      "Ehab2020",
      "FrozenLake",
      "Gemini",
      "Gwyneth Hestin",
      "JonTheBurger",
      "Keristero",
      "Kuri",
      "Loui",
      "Mint",
      "Mx. Claris Glennwood",
      "Na'Tali",
      "nickblock",
      "OuroYisus",
      "Pion",
      "Pheelbert",
      "Poly",
      "Pyredrid",
      "Shale",
      "svenevs",
      "theWildSushii",
      "Weenie",
      "Zeek",
    ],
  ],
  ["Our Roots", ["OpenNetBattle"]],
  ["Our Inspiration", ["Mega Man Battle Network", "Capcom"]],
];

export default function Credits() {
  return (
    <>
      <Head>
        <title>Credits - Hub OS</title>
      </Head>

      <div className={styles.credits}>
        <h1>Hub OS Credits</h1>

        {CREDITS_LIST.map(([section_name, list]) => (
          <React.Fragment key={section_name}>
            <h2>{section_name}</h2>

            <ul className={classNames(list.length > 12 && styles.long_list)}>
              {list.map((name) => {
                const link = CREDITS_LINKS[name];

                return (
                  <li key={name}>
                    {name}
                    {link && (
                      <>
                        {" ("}
                        {link}
                        {")"}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>

            <br />
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
