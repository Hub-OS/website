import Link from "next/link";
import { Namespace } from "@/types/namespace";

export function NamespaceLink({ namespace }: { namespace: Namespace }) {
  return (
    <Link
      href={"/namespaces/" + encodeURIComponent(namespace.prefix)}
      style={namespace.registered ? {} : { color: "orange" }}
    >
      {namespace.prefix}*
    </Link>
  );
}
