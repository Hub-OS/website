import ModListing from "@/components/mod-listing";
import { PackageMeta } from "@/types/package-meta";
import { NextPageContext } from "next";
import Link from "next/link";
import PageActions from "@/components/page-actions";
import { useAppContext } from "@/components/context";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from "@/styles/ModList.module.css";
import _ from "lodash";

type Props = { mods: PackageMeta[]; moreExist: boolean };

function createHref(page: number, category?: string, name?: string) {
  let query = `/mods?page=${page}`;

  if (category) {
    query += "&category=" + category;
  }

  if (name) {
    query += "&name=" + encodeURIComponent(name);
  }

  return query;
}

export default function ModList({ mods, moreExist }: Props) {
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

  const [name, setName] = useState(queryName);

  const [debouncedSearchHandler] = useState(() =>
    _.debounce((value: string) => {
      const href = createHref(0, category, value);

      router.push(href);
    }, 300)
  );

  return (
    <>
      <div className={styles.control_bar}>
        <select
          value={category || "All"}
          onChange={(event) => {
            const href = createHref(0, event.currentTarget.value, name);

            router.push(href);
          }}
        >
          <option value="">All</option>
          <option value="card">Cards</option>
          <option value="augment">Augments</option>
          <option value="encounter">Encounters</option>
          <option value="player">Players</option>
          <option value="pack">Packs</option>
          <option value="library">Libraries</option>
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
          <Link href={createHref(page - 1, category, name)}>{"< PREV"}</Link>
        )}

        {moreExist && (
          <Link
            className={styles.right_arrow}
            href={createHref(page + 1, category, name)}
          >
            {"NEXT >"}
          </Link>
        )}
      </PageActions>
    </>
  );
}

const mods_per_page = 25;

export async function getServerSideProps(context: NextPageContext) {
  const props: Props = { mods: [], moreExist: false };

  const host = process.env.NEXT_PUBLIC_HOST!;

  const page = +(context.query.page || 0);
  const skip = mods_per_page * page;
  const limit = mods_per_page + 1;
  const { category, name } = context.query;

  let url = `${host}/api/mods?skip=${skip}&limit=${limit}`;

  if (category) {
    url += `&category=${category}`;
  }

  if (name) {
    url += `&name=${encodeURIComponent(name as string)}`;
  }

  const res = await fetch(url);

  if (res.status == 200) {
    props.mods = (await res.json()) as PackageMeta[];
  }

  if (props.mods.length > mods_per_page) {
    props.mods.pop();
    props.moreExist = true;
  }

  return {
    props,
  };
}
