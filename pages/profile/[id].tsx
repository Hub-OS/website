import { useAppContext } from "@/components/context";
import Link from "next/link";
import Head from "next/head";
import { NextPageContext } from "next";
import { PublicAccountData } from "@/util/public-account-data";
import {
  requestMemberOrInvitedNamespaces,
  requestUser,
  setBan,
} from "@/client/api";
import { Namespace } from "@/util/namespace";
import { NamespaceLink } from "@/components/namespace-link";
import styles from "@/styles/Profile.module.css";
import { useEffect, useState } from "react";

type Props = {
  user: PublicAccountData | null;
  namespaces: Namespace[];
};

export default function Profile(props: Props) {
  const context = useAppContext();
  const [user, setUser] = useState(() => props.user);
  const [updatingBan, setUpdatingBan] = useState(() => false);

  useEffect(() => {
    setUser(props.user);
  }, [props.user]);

  if (!user) {
    return "No account found";
  }

  let banText = updatingBan ? "BANNING" : "BAN";

  if (user.banned) {
    // unban
    banText = "UN" + banText;
  }

  return (
    <>
      <Head>
        <title>{`${user.username} - Hub OS`}</title>
      </Head>

      <div className={styles.name_bar}>
        <div>{user.username}</div>

        {context.account?.admin && (
          <a
            className="admin-link"
            onClick={async () => {
              setUpdatingBan(true);
              const response = await setBan(user.id as string, !user.banned);
              setUpdatingBan(false);

              if (response.ok) {
                setUser(response.value);
              } else {
                // todo: display
                console.error(response.error);
              }
            }}
          >
            {banText}
          </a>
        )}
      </div>

      <br />

      <ul>
        <li>
          <Link href={`/mods?uploader=${user.id}`}>View Published Mods</Link>
        </li>
      </ul>

      <br />

      <div>
        Associated Namespaces:
        <ul>
          {props.namespaces.map((namespace) => (
            <li key={namespace.prefix}>
              <NamespaceLink key={namespace.prefix} namespace={namespace} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const props: Props = { user: null, namespaces: [] };

  if (typeof context.query.id != "string") {
    return { props };
  }

  const id = context.query.id;
  const [user, namespaces] = await Promise.all([
    requestUser(id),
    requestMemberOrInvitedNamespaces(id),
  ]);

  if (user.ok) {
    props.user = user.value;
  }

  if (namespaces.ok) {
    props.namespaces = namespaces.value.filter(
      (namespace) =>
        namespace.members.find((member) => member.id == id)?.role != "invited"
    );
  }

  return {
    props,
  };
}
