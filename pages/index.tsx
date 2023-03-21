import Link from "next/link";

export default function Home() {
  return (
    <>
      Latest version: Real-PET 0.3.0
      <br />
      <br />
      Links:
      <br />
      <ul>
        {/* <li>
          <Link href="https://github.com/orgs/Real-PET/repositories">
            DOWNLOAD
          </Link>
        </li> */}
        <li>
          <Link href="https://real-pet.github.io/documentation-website/docs/client/lua-api/engine/">
            DOCUMENTATION
          </Link>
        </li>
        <li>
          <Link href="https://github.com/orgs/Real-PET/repositories">
            CONTRIBUTE
          </Link>
        </li>
      </ul>
    </>
  );
}
