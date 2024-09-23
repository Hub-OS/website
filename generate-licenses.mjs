import fs from "fs/promises";
import { ripAll } from "license-ripper";
import cargoLicenses from "./wasm/licenses.json" with { type: "json" };

const config = {
  exclude: [
    "client-only",
    "zip-util",
    // covered by @next/swc
    "@next/swc-android-arm-eabi",
    "@next/swc-android-arm64",
    "@next/swc-darwin-arm64",
    "@next/swc-darwin-x64",
    "@next/swc-freebsd-x64",
    "@next/swc-linux-arm-gnueabihf",
    "@next/swc-linux-arm64-gnu",
    "@next/swc-linux-arm64-musl",
    "@next/swc-win32-arm64-msvc",
    "@next/swc-win32-ia32-msvc",
    "@next/swc-win32-x64-msvc",
    "@next/swc-linux-x64-gnu",
    "@next/swc-linux-x64-musl",
    "@swc/counter",
  ],
  overrides: {
    "@swc/helpers": { license: "Apache-2.0" },

    // language-tags
    "language-tags": {
      text: `Copyright © 2023 Matthew Caruana Galizia, http://m.cg <m@m.cg>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
    },
    //language-subtag-registry
    "language-subtag-registry": {
      text: `The JSON database is licensed under the [Creative Commons Zero v1.0 Universal (CC0-1.0)](https://creativecommons.org/publicdomain/zero/1.0/legalcode) license.

Comments, feedback and suggestions are welcome. Please feel free to raise an issue or pull request. Enjoy.`,
    },
  },
};

async function main() {
  const { resolved, errors } = await ripAll(".", config);

  if (
    errors.invalidLicense.length > 0 ||
    errors.missingLicenseText.length > 0
  ) {
    console.log("license errors: ", JSON.stringify(errors, null, 2));
  }

  resolved.push(
    ...cargoLicenses.map(({ name, repository, license }) => ({
      name,
      homepage: repository,
      license,
    }))
  );

  resolved.sort((a, b) => {
    if (a.name == b.name) {
      return 0;
    } else if (a.name < b.name) {
      return -1;
    } else {
      return 1;
    }
  });

  await fs.writeFile("_licenses.json", JSON.stringify(resolved, null, 2));
}

main();
