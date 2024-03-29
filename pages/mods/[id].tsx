import {
  dependencies,
  hasDependencies,
  PackageMeta,
} from "@/types/package-meta";
import { useEffect, useState } from "react";
import { NextPageContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import clipboardCopy from "clipboard-copy";
import { useAppContext } from "@/components/context";
import ModPreview from "@/components/mod-preview";
import PageActions from "@/components/page-actions";
import { PublicAccountData } from "@/types/public-account-data";
import classNames from "classnames";
import styles from "@/styles/Mod.module.css";
import { requestJSON } from "@/types/request";
import Head from "next/head";

type Props = { meta?: PackageMeta; creator?: PublicAccountData };

function snakeToTitle(text: string) {
  return text
    .split("_")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

export default function ModPage({ meta, creator }: Props) {
  const [hashText, setHashText] = useState("COPY HASH");
  const [hidden, setHidden] = useState(meta?.hidden);
  const [togglingHidden, setTogglingHidden] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatedDate, setUpdatedDate] = useState<string | undefined>(undefined);
  const context = useAppContext();
  const router = useRouter();

  // locale can only be handled on the client, as the server doesn't have this information
  useEffect(() => {
    setUpdatedDate(
      meta ? new Date(meta.updated_date).toLocaleString() : undefined
    );
  }, [meta]);

  if (!meta) {
    return <>Package not found.</>;
  }

  const encodedId = encodeURIComponent(meta.package.id);
  const description = meta.package.long_description || meta.package.description;

  return (
    <>
      <Head>
        <title>
          {meta.package.name} - {snakeToTitle(meta.package.category)} Package -
          Hub OS
        </title>
      </Head>

      <div className={styles.top_controls}>
        <Link href={context.modQuery ? `/mods?${context.modQuery}` : "/mods"}>
          {"< MODS"}
        </Link>

        <div className={styles.owner_controls}>
          {meta.creator == context.account?.id && (
            <a
              className={classNames({
                [styles.disabled_link]: togglingHidden,
              })}
              onClick={async () => {
                setTogglingHidden(true);

                try {
                  const response = await fetch(`/api/mods/${encodedId}/meta`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ hidden: !hidden }),
                  });

                  if (response.ok) {
                    setHidden(!hidden);
                  }
                } finally {
                  setTogglingHidden(false);
                }
              }}
            >
              {hidden ? "PUBLISH" : "UNLIST"}
            </a>
          )}
          {meta.creator == context.account?.id && (
            <a
              className={classNames({
                [styles.disabled_link]: deleting,
              })}
              onClick={async () => {
                setDeleting(true);

                try {
                  await fetch(`/api/mods/${encodedId}`, { method: "DELETE" });
                  router.push(`/mods`);
                } catch {
                  setDeleting(false);
                }
              }}
            >
              DELETE
            </a>
          )}
        </div>
      </div>

      <div className={styles.dynamic_container}>
        <ModPreview meta={meta} className={styles.preview} />

        <div className={styles.meta}>
          <div>
            {meta.package.name} - {snakeToTitle(meta.package.category)} Package
          </div>

          {description && <div>{description}</div>}
        </div>
      </div>

      <div className={styles.meta}>
        {creator && (
          <div>
            Author:
            <ul>
              <li>
                <a
                  href={`/mods?creator=${decodeURIComponent(
                    creator.id as string
                  )}`}
                >
                  {creator.username}
                </a>
              </li>
            </ul>
          </div>
        )}

        {creator && (
          <div>
            Last Update:
            <ul>
              <li>{updatedDate}</li>
            </ul>
          </div>
        )}

        <div>
          Package ID:
          <ul>
            <li>{meta.package.id}</li>
          </ul>
        </div>

        {meta.defines?.characters?.length! > 0 && (
          <div>
            Defines:
            <ul>
              {meta.defines!.characters!.map(({ id }, i) => (
                <li key={i}>{id}</li>
              ))}
            </ul>
          </div>
        )}

        {hasDependencies(meta) && (
          <div>
            Dependencies:
            <ul>
              {dependencies(meta).map((id, i) => (
                <li key={i}>
                  <Link href={`/mods/${encodeURIComponent(id)}`}>{id}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <PageActions>
        {meta.hash && (
          <a
            title={meta.hash}
            onClick={() => {
              clipboardCopy(meta.hash!).then(() => {
                setHashText("COPIED!");
              });
            }}
          >
            {hashText}
          </a>
        )}
        <a href={`/api/mods/${encodedId}`} download={`${meta.package.id}.zip`}>
          DOWNLOAD
        </a>
      </PageActions>
    </>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const props: Props = {};

  const encodedId = encodeURIComponent(context.query.id as string);
  const uri = `${process.env.NEXT_PUBLIC_HOST!}/api/mods/${encodedId}/meta`;

  const metaResult = await requestJSON(uri);

  if (metaResult.ok) {
    props.meta = metaResult.value;
  }

  if (props.meta) {
    const creatorId = props.meta.creator;
    const uri = `${process.env.NEXT_PUBLIC_HOST!}/api/users/${creatorId}`;

    const creatorResult = await requestJSON(uri);

    if (creatorResult.ok) {
      props.creator = creatorResult.value;
    }
  }

  return {
    props,
  };
}
