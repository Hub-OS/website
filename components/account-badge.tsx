import { LoginState } from "@/types/login-state";
import Link from "next/link";
import Image from "next/image";
import { useAppContext } from "./context";
import styles from "@/styles/AccountBadge.module.css";

const client_id = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const redirect_uri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

export default function AccountBadge() {
  const { loginState, account } = useAppContext();

  if (loginState == LoginState.Pending) {
    return <Link href="/account" className={styles.link}></Link>;
  }

  // show avatar
  if (account) {
    return (
      <Link href="/account" className={styles.link}>
        <Image
          src={account.avatar}
          width="40"
          height="40"
          alt="discord-avatar"
          unoptimized
        />
      </Link>
    );
  }

  // show login link
  return (
    <Link
      className={styles.link}
      href={`https://discord.com/oauth2/authorize?response_type=token&client_id=${client_id}&scope=identify&redirect_uri=${redirect_uri}`}
    >
      LOGIN
    </Link>
  );
}
