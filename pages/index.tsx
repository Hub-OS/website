import Link from "next/link";

export default function Home() {
  return (
    <>
      HubOS
      <br />
      Latest version: 0.5.0
      <br />
      <br />
      Links:
      <br />
      <ul>
        {/* <li>
          <Link href="https://github.com/orgs/Hub-OS/repositories">
            DOWNLOAD
          </Link>
        </li> */}
        <li>
          <Link href="https://hub-os.github.io/documentation-website/client/packages/">
            DOCUMENTATION
          </Link>
        </li>
        <li>
          <Link href="https://github.com/orgs/Hub-OS/repositories">
            CONTRIBUTE
          </Link>
        </li>
      </ul>
    </>
  );
}
