import {
  dependencies,
  hasDependencies,
  PackageMeta,
} from "@/types/package-meta";
import { useState } from "react";
import { NextPageContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import clipboardCopy from "clipboard-copy";
import { useAppContext } from "@/components/context";
import styles from "@/styles/Mod.module.css";
import ModPreview from "@/components/mod-preview";
import { PublicAccountData } from "@/types/public-account-data";

type Props = { meta?: PackageMeta; creator?: PublicAccountData };

export default function ModPage({ meta, creator }: Props) {
  const [hashText, setHashText] = useState("COPY HASH");
  const [deleteText, setDeleteText] = useState("DELETE");
  const context = useAppContext();
  const router = useRouter();

  if (!meta) {
    return <>Package not found.</>;
  }

  const encodedId = encodeURIComponent(meta.package.id);
  const description = meta.package.long_description || meta.package.description;

  return (
    <>
      <div className={styles.top_controls}>
        <Link href={context.modQuery ? `/mods?${context.modQuery}` : "/mods"}>
          {"< MODS"}
        </Link>

        <div className={styles.owner_controls}>
          {meta.creator == context.account?.id && (
            <a
              onClick={async () => {
                setDeleteText("DELETING");

                try {
                  await fetch(`/api/mods/${encodedId}`, { method: "DELETE" });
                  router.push(`/mods`);
                } catch {
                  setDeleteText("DELETE FAILED");
                }
              }}
            >
              {deleteText}
            </a>
          )}
        </div>
      </div>

      <div className={styles.dynamic_container}>
        <ModPreview meta={meta} className={styles.preview} />

        <div className={styles.meta}>
          <div>
            {meta.package.name} - {meta.package.category[0].toUpperCase()}
            {meta.package.category.slice(1)} Package
          </div>

          {description && <div>{description}</div>}
        </div>
      </div>

      <div className={styles.meta}>
        <div>Package ID: {meta.package.id}</div>
        {creator && <div>Author: {creator.username}</div>}

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

      <div className={styles.user_options}>
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
      </div>
    </>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const props: Props = {};

  const requestJSON = async (uri: string) => {
    const res = await fetch(uri);

    if (res.status != 200) {
      return;
    }

    return await res.json();
  };

  const encodedId = encodeURIComponent(context.query.id as string);
  const uri = `${process.env.NEXT_PUBLIC_HOST!}/api/mods/${encodedId}/meta`;
  props.meta = await requestJSON(uri);

  if (props.meta) {
    const creatorId = props.meta.creator;
    const uri = `${process.env.NEXT_PUBLIC_HOST!}/api/users/${creatorId}`;

    props.creator = await requestJSON(uri);
  }

  return {
    props,
  };
}
