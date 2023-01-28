const fs = require("fs/promises");
const _ = require("lodash");
const packageLock = require("./package-lock.json");

async function main() {
  const output = [];

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

      if (typeof licenseText != "string") {
        console.log(licenseText);
        throw "what";
      }

      if (!license) {
        if (licenseText.includes("MIT")) {
          console.warn(
            `${packageMeta.name} does not list license in package.json, assuming MIT from license`
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
