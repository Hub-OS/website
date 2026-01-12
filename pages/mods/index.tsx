import ModListing from "@/components/mod-listing";
import { PackageMeta } from "@/util/package-meta";
import { NextPageContext } from "next";
import Link from "next/link";
import PageActions from "@/components/page-actions";
import { useAppContext } from "@/components/context";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from "@/styles/ModList.module.css";
import { requestJSON } from "@/util/request";
import _ from "lodash";
import { Result } from "@/util/result";
import { PublicAccountData } from "@/util/public-account-data";
import Head from "next/head";
import { requestUser } from "@/client/api";

type Props = {
  uploader: PublicAccountData | null;
  mods: PackageMeta[];
  moreExist: boolean;
};

type HrefParams = {
  page: number;
  prefix: string | undefined;
  category: string | undefined;
  name: string | undefined;
  uploader: string | undefined;
  sort: string | undefined;
  hidden: boolean;
};

function createHref(params: HrefParams): string {
  const pairs = [];

  const paramsMap = params as {
    [key: string]: string | number | boolean | undefined;
  };

  for (const key in params) {
    const value = paramsMap[key];

    if (!value) {
      // false or undefined
      continue;
    }

    pairs.push(key + "=" + encodeURIComponent(value));
  }

  if (pairs.length == 0) {
    return "/mods";
  }

  return "/mods?" + pairs.join("&");
}

export default function ModList({ uploader, mods, moreExist }: Props) {
  const context = useAppContext();
  const router = useRouter();

  const [_base, queryString] = router.asPath.split("?");

  useEffect(() => {
    if (context.modQuery != queryString) {
      context.setModQuery(queryString);
    }
  }, [context, queryString]);

  const params = {
    page: Math.max(+(router.query.page || 0), 0),
    prefix: router.query.prefix as string | undefined,
    category: router.query.category as string | undefined,
    name: router.query.name as string | undefined,
    uploader: router.query.uploader as string | undefined,
    sort: router.query.sort as string | undefined,
    hidden: router.query.hidden == "true",
  };

  const [name, setName] = useState(params.name);

  const [debouncedPushRoute] = useState(() =>
    _.debounce((href: string) => {
      router.push(href);
    }, 300)
  );

  return (
    <>
      {uploader ? (
        <div className={styles.uploader_section}>
          <Head>
            <title>{`Mods from ${uploader.username} - Hub OS`}</title>
          </Head>

          <div>Mods from {uploader.username}:</div>

          {context.account != undefined &&
            context.account.id == uploader.id &&
            (params.hidden ? (
              <Link href={createHref({ ...params, page: 0, hidden: false })}>
                VIEW PUBLIC
              </Link>
            ) : (
              <Link href={createHref({ ...params, page: 0, hidden: true })}>
                VIEW HIDDEN
              </Link>
            ))}
        </div>
      ) : params.prefix ? (
        <div className={styles.uploader_section}>
          <Head>
            <title>{`${params.prefix}* - Hub OS`}</title>
          </Head>

          <div>
            Mods in{" "}
            <Link href={"/namespaces/" + encodeURIComponent(params.prefix)}>
              {params.prefix}*
            </Link>
            :
          </div>
        </div>
      ) : (
        <Head>
          <title>Mods - Hub OS</title>
        </Head>
      )}

      <div className={styles.control_bar}>
        <select
          value={params.category || ""}
          onChange={(event) => {
            const category = event.target.value;
            const href = createHref({ ...params, category, page: 0 });

            router.push(href);
          }}
        >
          <option value="">All</option>
          <option value="card">Cards</option>
          <option value="recipe">Recipes</option>
          <option value="augment">Augments</option>
          <option value="encounter">Encounters</option>
          <option value="player">Players</option>
          <option value="resource">Resources</option>
          <option value="pack">Packs</option>
          <option value="library">Libraries</option>
          <option value="status">Statuses</option>
          <option value="tile_state">Tile States</option>
        </select>

        <input
          placeholder="name"
          value={name || ""}
          onChange={(event) => {
            const name = event.currentTarget.value;
            const href = createHref({ ...params, name, page: 0 });
            debouncedPushRoute(href);
            setName(name);
          }}
        />

        <select
          value={params.sort || ""}
          onChange={(event) => {
            const sort = event.target.value;
            const href = createHref({ ...params, sort, page: 0 });

            router.push(href);
          }}
        >
          <option value="">Sort: Newest</option>
          <option value="recently_updated">Sort: Updated</option>
          <option value="package_id">Sort: ID</option>
        </select>

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
        {params.page > 0 && (
          <Link
            className={styles.left_arrow}
            href={createHref({ ...params, page: params.page - 1 })}
          >
            {"< PREV"}
          </Link>
        )}

        {moreExist && (
          <Link href={createHref({ ...params, page: params.page + 1 })}>
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
  const props: Props = { mods: [], uploader: null, moreExist: false };

  const [modsResult, uploaderResult] = await Promise.all([
    requestMods(context),
    requestUser(context.query.uploader as string),
  ]);

  if (modsResult.ok) {
    props.mods = modsResult.value;
  }

  if (props.mods.length > mods_per_page) {
    props.mods.pop();
    props.moreExist = true;
  }

  if (uploaderResult.ok) {
    props.uploader = uploaderResult.value;
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
  const forwardedParams = [
    "prefix",
    "category",
    "name",
    "exact_name",
    "uploader",
    "sort",
    "hidden",
  ];

  let url = `${host}/api/mods?skip=${skip}&limit=${limit}`;

  for (const key of forwardedParams) {
    const value = context.query[key];

    if (typeof value == "string") {
      url += "&" + key + "=" + encodeURIComponent(value);
    }
  }

  const requestInit = {
    headers: {
      cookie: context.req?.headers.cookie || "",
    },
  };

  return (await requestJSON(url, requestInit)) as Result<PackageMeta[], string>;
}
