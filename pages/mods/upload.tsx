import styles from "@/styles/Upload.module.css";
import { useEffect, useState } from "react";
import init, { read_file, rezip_packages, hook_panics } from "zip-utils";
import TOML from "@iarna/toml";
import { PackageMeta, asPackageMeta } from "@/util/package-meta";
import { Result, Ok, Err } from "@/util/result";
import { requestVoid } from "@/util/request";
import Head from "next/head";

let wasmInitiated = false;
let startedInit = false;

type UploadLog = { packageMeta: PackageMeta; url: string }[];

export default function Upload() {
  const [value, setValue] = useState("");
  const [text, setText] = useState("PREPARING...");
  const [preparing, setPreparing] = useState(true);
  let [log, setLog] = useState<UploadLog>([]);

  useEffect(() => {
    if (!startedInit) {
      startedInit = true;

      init().then(() => {
        wasmInitiated = true;
        hook_panics();

        setText("DROP ZIP HERE");
        setPreparing(false);
      });
    }

    if (wasmInitiated && preparing) {
      setText("DROP ZIP HERE");
      setPreparing(false);
    }
  }, [preparing]);

  return (
    <div>
      <Head>
        <title>Upload Mods - Hub OS</title>
      </Head>

      <label className={styles.label}>
        {text}

        <input
          className={styles.input}
          type="file"
          accept=".zip"
          disabled={preparing}
          value={value}
          onChange={async (event) => {
            const files = event.currentTarget.files;

            setValue("");

            if (!files) {
              return;
            }

            const file = files.item(0);

            if (!file) {
              return;
            }

            let rezipped_packages;

            try {
              const buffer = await file.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              rezipped_packages = rezip_packages(bytes) as Uint8Array[];
            } catch {
              setText("FAILED TO READ ZIP");
              return;
            }

            for (const rezipped of rezipped_packages) {
              const packageMetaResult = resolvePackageMeta(rezipped);

              if (!packageMetaResult.ok) {
                // handle error and resolve to a single type
                setText(packageMetaResult.error);
                return;
              }

              const packageMeta = packageMetaResult.value;

              const name =
                packageMeta.package.long_name || packageMeta.package.name;
              setText(`UPLOADING ${name.toUpperCase()}`);

              const urlResult = await uploadPackage(packageMeta, rezipped);

              if (!urlResult.ok) {
                setText(urlResult.error);
                return;
              }

              log = [...log, { packageMeta, url: urlResult.value }];
              setLog(log);
            }

            setText("DROP ZIP HERE");
          }}
        />
      </label>

      <div className={styles.log}>
        Upload Log:
        <ul>
          {log.map(({ packageMeta, url }, i) => (
            <li key={i}>
              <a href={url} target="_blank" rel="noreferrer">
                {packageMeta.package.id}
                {" - "}
                {packageMeta.package.long_name || packageMeta.package.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function resolvePackageMeta(zipBytes: Uint8Array): Result<PackageMeta, string> {
  let text;

  try {
    text = new TextDecoder().decode(read_file(zipBytes, "package.toml"));
  } catch {
    return Err("MISSING PACKAGE.TOML");
  }

  let packageMeta;

  try {
    packageMeta = TOML.parse(text) as any;
  } catch (err) {
    return Err("INVALID PACKAGE.TOML");
  }

  if (!packageMeta?.package?.id) {
    return Err("MISSING ID");
  }

  if (!packageMeta?.package?.name) {
    return Err("MISSING NAME");
  }

  if (!packageMeta?.package?.category) {
    return Err("MISSING CATEGORY");
  }

  packageMeta = asPackageMeta(packageMeta);

  if (!packageMeta) {
    return Err("INVALID PACKAGE.TOML");
  }

  return Ok(packageMeta);
}

async function uploadPackage(
  meta: PackageMeta,
  zipBytes: Uint8Array
): Promise<Result<string, string>> {
  const encodedId = encodeURIComponent(meta.package.id);

  const uploadMetaResponse = await requestVoid(`/api/mods/${encodedId}/meta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meta: meta }),
  });

  if (!uploadMetaResponse.ok) {
    return uploadMetaResponse;
  }

  try {
    await fetch200(`/api/mods/${encodedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: zipBytes,
    });
  } catch (err) {
    console.error(err);
    return Err("FAILED TO UPLOAD PACKAGE");
  }

  try {
    let previewPath = meta.package.preview_texture_path;

    if (!previewPath) {
      if (meta.package.category == "tile_state" && meta.package.texture_path) {
        // special case for tile_states
        previewPath = meta.package.texture_path;
      } else if (
        meta.package.category == "status" &&
        meta.package.icon_texture_path
      ) {
        // special case for statuses
        previewPath = meta.package.icon_texture_path;
      }
    }

    if (previewPath != undefined) {
      const bytes = read_file(zipBytes, previewPath);

      await fetch(`/api/mods/${encodedId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: bytes,
      });
    }
  } catch {
    // ignore preview failure
  }

  return Ok(`/mods/${encodedId}`);
}

async function fetch200(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (!response.ok) {
    let errorText = `"${input.toString()}" (${response.status})`;
    const responseText = await response.text();

    if (responseText) {
      errorText += ": " + responseText;
    }

    throw new Error(errorText);
  }

  return response;
}
