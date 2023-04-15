import { ReactNode } from "react";
import styles from "@/styles/PageActions.module.css";
import classNames from "classnames";

type Props = {
  className?: string;
  children?: ReactNode;
};

export default function PageActions({ children, className }: Props) {
  return (
    <div className={classNames(styles.container, className)}>{children}</div>
  );
}
