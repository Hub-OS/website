import ModListing from "@/components/mod-listing";
import { PackageMeta } from "@/types/package-meta";
import { NextPageContext } from "next";
import Link from "next/link";
import PageActions from "@/components/page-actions";
import { useAppContext } from "@/components/context";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from "@/styles/ModList.module.css";
import { requestJSON } from "@/types/request";
import _ from "lodash";
import { Ok, Result } from "@/types/result";
import { PublicAccountData } from "@/types/public-account-data";

type Props = {
  creator: PublicAccountData | null;
  mods: PackageMeta[];
  moreExist: boolean;
};

function createHref(
  page: number,
  category: string | undefined,
  name: string | undefined,
  creator: string | undefined,
  hidden: boolean
) {
  let query = `/mods?page=${page}`;

  if (category) {
    query += "&category=" + category;
  }

  if (name) {
    query += "&name=" + encodeURIComponent(name);
  }

  if (creator) {
    query += "&creator=" + encodeURIComponent(creator);
  }

  if (hidden) {
    query += "&hidden=true";
  }

  return query;
}

export default function ModList({ creator, mods, moreExist }: Props) {
  const context = useAppContext();
  const router = useRouter();

  const [_base, queryString] = router.asPath.split("?");

  useEffect(() => {
    if (context.modQuery != queryString) {
      context.setModQuery(queryString);
    }
  }, [context, queryString]);

  const page = Math.max(+(router.query.page || 0), 0);
  const category = router.query.category as string | undefined;
  const queryName = router.query.name as string | undefined;
  const creatorId = router.query.creator as string | undefined;
  const hidden = router.query.hidden == "true";

  const [name, setName] = useState(queryName);

  const [debouncedSearchHandler] = useState(() =>
    _.debounce((value: string) => {
      const href = createHref(0, category, value, creatorId, hidden);

      router.push(href);
    }, 300)
  );

  return (
    <>
      {creator && (
        <div className={styles.creator_section}>
          <div>Mods from {creator.username}:</div>

          {context.account != undefined &&
            context.account.id == creator.id &&
            (hidden ? (
              <Link href={createHref(page, category, name, creatorId, false)}>
                VIEW PUBLIC
              </Link>
            ) : (
              <Link href={createHref(page, category, name, creatorId, true)}>
                VIEW HIDDEN
              </Link>
            ))}
        </div>
      )}

      <div className={styles.control_bar}>
        <select
          value={category || "All"}
          onChange={(event) => {
            const href = createHref(
              0,
              event.currentTarget.value,
              name,
              creatorId,
              hidden
            );

            router.push(href);
          }}
        >
          <option value="">All</option>
          <option value="card">Cards</option>
          <option value="augment">Augments</option>
          <option value="encounter">Encounters</option>
          <option value="player">Players</option>
          <option value="resource">Resources</option>
          <option value="pack">Packs</option>
          <option value="library">Libraries</option>
          <option value="status">Statuses</option>
        </select>

        <input
          placeholder="name"
          value={name || ""}
          onChange={(event) => {
            const value = event.currentTarget.value;
            debouncedSearchHandler(value);
            setName(value);
          }}
        />

        {context.account != undefined && (
          <Link className={styles.upload} href="/mods/upload">
            UPLOAD
          </Link>
        )}
      </div>

      <div className={styles.list}>
        {mods.map((meta) => (
          <ModListing key={meta.package.id} meta={meta} />
        ))}
      </div>

      <PageActions>
        {page > 0 && (
          <Link
            className={styles.left_arrow}
            href={createHref(page - 1, category, name, creatorId, hidden)}
          >
            {"< PREV"}
          </Link>
        )}

        {moreExist && (
          <Link href={createHref(page + 1, category, name, creatorId, hidden)}>
            {"NEXT >"}
          </Link>
        )}
      </PageActions>
    </>
  );
}

const host = process.env.NEXT_PUBLIC_HOST!;
const mods_per_page = 25;

export async function getServerSideProps(context: NextPageContext) {
  const props: Props = { mods: [], creator: null, moreExist: false };

  const [modsResult, creatorResult] = await Promise.all([
    requestMods(context),
    requestCreator(context.query),
  ]);

  if (modsResult.ok) {
    props.mods = modsResult.value;
  }

  if (props.mods.length > mods_per_page) {
    props.mods.pop();
    props.moreExist = true;
  }

  if (creatorResult.ok) {
    props.creator = creatorResult.value;
  }

  return {
    props,
  };
}

async function requestMods(
  context: NextPageContext
): Promise<Result<PackageMeta[], string>> {
  const page = +(context.query.page || 0);
  const skip = mods_per_page * page;
  const limit = mods_per_page + 1;
  const { category, name, creator, hidden } = context.query;

  let url = `${host}/api/mods?skip=${skip}&limit=${limit}`;

  if (category) {
    url += `&category=${category}`;
  }

  if (name) {
    url += `&name=${encodeURIComponent(name as string)}`;
  }

  if (creator) {
    url += `&creator=${encodeURIComponent(creator as string)}`;
  }

  if (hidden == "true") {
    url += "&hidden=true";
  }

  const requestInit = {
    headers: {
      cookie: context.req?.headers.cookie || "",
    },
  };

  return (await requestJSON(url, requestInit)) as Result<PackageMeta[], string>;
}

async function requestCreator(
  query: NextPageContext["query"]
): Promise<Result<PublicAccountData | null, string>> {
  if (!query.creator) {
    return Ok(null);
  }

  const uri = `${host}/api/users/${query.creator}`;

  return (await requestJSON(uri)) as Result<PublicAccountData, string>;
}
