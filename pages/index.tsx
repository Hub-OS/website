import Link from "next/link";

export default function Home() {
  return (
    <>
      Hub OS
      <br />
      <br />
      Latest version: 0.9.1
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
          <Link href="https://docs.hubos.dev">DOCUMENTATION</Link>
        </li>
        <li>
          <Link href="https://github.com/orgs/Hub-OS/repositories">
            CONTRIBUTE
          </Link>
        </li>
        <li>
          <Link href="/cat.png">CAT</Link>
        </li>
      </ul>
    </>
  );
}
