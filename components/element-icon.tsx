import { CSSProperties } from "react";
import styles from "@/styles/ElementIcon.module.css";
import classNames from "classnames";

const elements = [
  "fire",
  "aqua",
  "elec",
  "wood",
  "sword",
  "wind",
  "cursor",
  "summon",
  "plus",
  "break",
];

type Props = {
  element?: string;
  className?: string;
  style?: CSSProperties;
};

export default function ElementIcon({ element, className, style }: Props) {
  const offset = elements.indexOf(element as string) + 1;

  return (
    <div
      className={classNames(styles.icon, className)}
      style={{ backgroundPosition: `${-offset * 20}px 0`, ...(style || {}) }}
    />
  );
}
