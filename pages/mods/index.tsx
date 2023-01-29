import ModListing from "@/components/mod-listing";
import { PackageMeta } from "@/types/package-meta";
import { NextPageContext } from "next";
import Link from "next/link";
import styles from "@/styles/ModList.module.css";
import { useAppContext } from "@/components/context";
import { useRouter } from "next/router";
import { useEffect } from "react";

type Props = { mods: PackageMeta[]; moreExist: boolean };

export default function ModList({ mods, moreExist }: Props) {
  const context = useAppContext();
  const router = useRouter();

  const [_, queryString] = router.asPath.split("?");

  useEffect(() => {
    if (context.modQuery != queryString) {
      context.setModQuery(queryString);
    }
  }, [context, queryString]);

  const page = Math.max(+(router.query.page || 0), 0);

  return (
    <>
      <div className={styles.control_bar}>
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

      <div className={styles.page_controls}>
        {page > 0 && <Link href={`/mods?page=${page - 1}`}>{"< PREV"}</Link>}

        {moreExist && (
          <Link className={styles.right_arrow} href={`/mods?page=${page + 1}`}>
            {"NEXT >"}
          </Link>
        )}
      </div>
    </>
  );
}

const mods_per_page = 25;

export async function getServerSideProps(context: NextPageContext) {
  const props: Props = { mods: [], moreExist: false };

  const page = +(context.query.page || 0);
  const skip = mods_per_page * page;
  const limit = mods_per_page + 1;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_HOST!}/api/mods?skip=${skip}&limit=${limit}`
  );

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
