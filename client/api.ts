import { Namespace } from "@/types/namespace";
import { PublicAccountData } from "@/types/public-account-data";
import { requestJSON } from "@/types/request";
import { Ok, Result } from "@/types/result";

const host = process.env.NEXT_PUBLIC_HOST!;

export async function requestUser(
  id: string
): Promise<Result<PublicAccountData | null, string>> {
  if (!id) {
    return Ok(null);
  }

  const uri = `${host}/api/users/${id}`;

  return (await requestJSON(uri)) as Result<PublicAccountData, string>;
}

export async function requestMemberOrInvitedNamespaces(
  id_or_init: string | RequestInit
): Promise<Result<Namespace[], string>> {
  let uri = host + "/api/namespaces/member-or-invited";
  let init;

  if (typeof id_or_init == "string") {
    uri += "?id=" + encodeURIComponent(id_or_init);
  } else {
    init = id_or_init;
  }

  return (await requestJSON(uri, init)) as Result<Namespace[], string>;
}

export async function setBan(
  id: string,
  ban: boolean
): Promise<Result<PublicAccountData, string>> {
  return (await requestJSON(
    "/api/admin/set-ban?ban=" + ban + "&id=" + encodeURIComponent(id)
  )) as Result<PublicAccountData, string>;
}
