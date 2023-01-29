import styles from "@/styles/Upload.module.css";
import { useEffect, useState } from "react";
import init, { read_file, rezip, hook_panics } from "zip-utils";
import TOML from "@iarna/toml";
import { asPackageMeta } from "@/types/package-meta";
import { useRouter } from "next/router";

let wasmInitiated = false;
let startedInit = false;

export default function Upload() {
  const [value, setValue] = useState("");
  const [text, setText] = useState("PREPARING...");
  const [preparing, setPreparing] = useState(true);

  const router = useRouter();

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

          let rezipped;

          try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            rezipped = rezip(bytes);
          } catch {
            setText("FAILED TO READ ZIP");
            return;
          }

          let text;

          try {
            text = new TextDecoder().decode(
              read_file(rezipped, "package.toml")
            );
          } catch {
            setText("MISSING PACKAGE.TOML");
            return;
          }

          let packageMeta;

          try {
            packageMeta = TOML.parse(text);
            packageMeta = asPackageMeta(packageMeta);

            if (!packageMeta) {
              throw "Failed asPackageMeta:\n" + text;
            }
          } catch (err) {
            console.error(err);
            setText("INVALID PACKAGE.TOML");
            return;
          }

          setText(`UPLOADING ${packageMeta.package.name.toUpperCase()}`);

          const encodedId = encodeURIComponent(packageMeta.package.id);

          try {
            await fetch(`/api/mods/${encodedId}/meta`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ meta: packageMeta }),
            });

            await fetch(`/api/mods/${encodedId}`, {
              method: "POST",
              headers: { "Content-Type": "application/octet-stream" },
              body: rezipped,
            });
          } catch (err) {
            console.error(err);
            setText("FAILED TO UPLOAD PACKAGE");
            return;
          }

          router.push(`/mods/${encodedId}`);
        }}
      />
    </label>
  );
}
