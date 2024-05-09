import { useAppContext } from "@/components/context";
import PageActionMessage from "@/components/page-action-message";
import PageActions from "@/components/page-actions";
import { Namespace, Role } from "@/types/namespace";
import { requestJSON, requestVoid } from "@/types/request";
import { NextPageContext } from "next";
import { useState } from "react";
import styles from "@/styles/Namespace.module.css";
import Head from "next/head";
import { requestMemberOrInvitedNamespaces } from "@/client/api";
import { NamespaceLink } from "@/components/namespace-link";

type Props = {
  namespaces: Namespace[];
};

export default function Namespaces(props: Props) {
  const context = useAppContext();
  const [namespaces, setNamespaces] = useState(props.namespaces);
  const [prefix, setPrefix] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [creatingNamespace, setCreatingNamespace] = useState(false);

  const id = context.account?.id;

  const invites = namespaces.filter(
    (namespace) =>
      namespace.members.find((member) => member.id == id)?.role == "invited"
  );
  const memberships = namespaces.filter(
    (namespace) =>
      namespace.members.find((member) => member.id == id)?.role != "invited"
  );

  const updateInvite = async (namespace: Namespace, accept: boolean) => {
    const method = accept ? "PATCH" : "DELETE";
    const prefix = namespace.prefix;

    const response = await requestVoid(
      "/api/namespaces/" + encodeURIComponent(prefix) + "/invite",
      { method }
    );

    if (!response.ok) {
      setErrorMessage(response.error);
      return;
    }

    if (!accept) {
      const updatedNamespaces = namespaces.filter((n) => n != namespace);
      setNamespaces(updatedNamespaces);
    } else {
      const updatedNamespaces = namespaces.map((n) => {
        if (n == namespace) {
          // update namespace
          const members = n.members.map((member) => {
            // update member
            if (member.id == id) {
              return { id, role: "collaborator" as Role };
            } else {
              // keep old member
              return member;
            }
          });

          return { ...n, members };
        } else {
          // keep old namespace
          return n;
        }
      });

      setNamespaces(updatedNamespaces);
    }

    setErrorMessage("");
  };

  const createNamespace = async () => {
    if (!prefix) {
      setErrorMessage("Empty prefix");
      return;
    }

    setCreatingNamespace(true);

    const result = await requestJSON(
      "/api/namespaces/" + encodeURIComponent(prefix),
      { method: "POST" }
    );

    if (result.ok) {
      setNamespaces([...namespaces, result.value]);
      setPrefix("");
      setErrorMessage("");
    } else {
      setErrorMessage(result.error);
    }

    setCreatingNamespace(false);
  };

  return (
    <>
      <Head>
        <title>Namespaces - Hub OS</title>
      </Head>

      {invites.length > 0 && (
        <>
          Namespace Join Requests:
          <table className="table-list">
            <tbody>
              {invites.map((namespace) => (
                <tr key={namespace.prefix}>
                  <td className={styles.namespace_cell}>
                    <NamespaceLink namespace={namespace} />{" "}
                  </td>

                  <td>
                    <a onClick={() => updateInvite(namespace, true)}>Accept</a>{" "}
                    / <a onClick={() => updateInvite(namespace, false)}>Deny</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <br />
        </>
      )}

      <div>
        Namespaces:
        <ul>
          {memberships.map((namespace) => (
            <li key={namespace.prefix}>
              <NamespaceLink key={namespace.prefix} namespace={namespace} />
            </li>
          ))}
          <li className="input-row">
            <input
              placeholder="New Prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
            <a
              className={creatingNamespace ? "disabled" : undefined}
              onClick={createNamespace}
            >
              [+]
            </a>
          </li>
        </ul>
      </div>

      <br />

      <p>
        A namespace is a shared prefix for package IDs. Any uploaded package
        with an ID matching a namespace can be deleted or updated by members of
        a namespace.
      </p>
      <br />
      <p>
        Once a namespace is fully registered, only members of the namespace can
        upload packages with the matching prefix. A namespace can not be
        registered while packages matching the prefix exist by authors outside
        of the namespace&apos;s member list.
      </p>
      <br />
      <p>
        Namespace admins have the power to remove members, change member roles,
        and delete the namespace.
      </p>

      <PageActions>
        <PageActionMessage className={"error"}>
          {errorMessage}
        </PageActionMessage>
      </PageActions>
    </>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const props: Props = { namespaces: [] };

  const requestInit = {
    headers: {
      cookie: context.req?.headers.cookie || "",
    },
  };

  const namespacesResult = await requestMemberOrInvitedNamespaces(requestInit);

  if (namespacesResult.ok) {
    props.namespaces = namespacesResult.value;
  }

  return {
    props,
  };
}
