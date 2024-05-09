import { useAppContext } from "@/components/context";
import Link from "next/link";
import Head from "next/head";
import { NextPageContext } from "next";
import { PublicAccountData } from "@/types/public-account-data";
import { requestMemberOrInvitedNamespaces, requestUser } from "@/client/api";
import { Namespace } from "@/types/namespace";
import { NamespaceLink } from "@/components/namespace-link";

type Message = {
  text: string;
  isError: boolean;
};

type Props = {
  user: PublicAccountData | null;
  namespaces: Namespace[];
};

export default function Profile({ user, namespaces }: Props) {
  const context = useAppContext();

  if (!user) {
    return "No account found";
  }

  return (
    <>
      <Head>
        <title>{`${user.username} - Hub OS`}</title>
      </Head>

      <div>{user.username}</div>

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
          {namespaces.map((namespace) => (
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
