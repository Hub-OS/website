const fs = require("fs/promises");
const _ = require("lodash");
const packageLock = require("./package-lock.json");
const cargoLicenses = require("./wasm/licenses.json");

const MIT = [
  "Permission is hereby granted, free of charge, to any person obtaining a copy",
  'of this software and associated documentation files (the "Software"), to',
  "deal in the Software without restriction, including without limitation the",
  "rights to use, copy, modify, merge, publish, distribute, sublicense, and/or",
  "sell copies of the Software, and to permit persons to whom the Software is",
  "furnished to do so, subject to the following conditions:",

  "The above copyright notice and this permission notice shall be included in",
  "all copies or substantial portions of the Software.",

  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
  "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
  "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
  "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
  "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING",
  "FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS",
  "IN THE SOFTWARE.",
];

async function main() {
  const output = cargoLicenses.map(({ name, repository, license }) => ({
    name,
    homepage: repository,
    license,
  }));

  for (const name in packageLock.dependencies) {
    if (name == "" || name.startsWith("node_modules")) {
      continue;
    }

    try {
      const packageJSONBuffer = await fs.readFile(
        `node_modules/${name}/package.json`
      );

      const packageJSON = packageJSONBuffer.toString();
      const packageMeta = JSON.parse(packageJSON);

      const licenseText = await findLicenseText(name);
      let license = packageMeta.license;

      if (!licenseText) {
        throw `Failed to find license text for ${packageMeta.name}`;
      }

      if (!license) {
        if (MIT.every((line) => licenseText.includes(line))) {
          console.warn(
            `${packageMeta.name} does not list license in package.json, assuming MIT from license file`
          );
          license = licenseText;
        } else {
          console.warn(`Failed to resolve license for ${packageMeta.name}`);
        }
      }

      output.push({
        name: packageMeta.name,
        license,
        licenseText,
        homepage: packageMeta.homepage,
      });
    } catch {
      continue;
    }
  }

  output.sort((a, b) => {
    if (a.name == b.name) {
      return 0;
    } else if (a.name < b.name) {
      return -1;
    } else {
      return 1;
    }
  });

  await fs.writeFile("_licenses.json", JSON.stringify(output));
}

async function findLicenseText(packageName) {
  return (
    (await tryRead(`node_modules/${packageName}/LICENSE`)) ||
    (await tryRead(`node_modules/${packageName}/LICENSE.md`))
  );
}

async function tryRead(path) {
  try {
    const buffer = await fs.readFile(path);
    return buffer.toString();
  } catch {}
}

main();
