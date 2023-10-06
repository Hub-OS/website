import { useEffect, useState } from "react";
import { LoginState } from "@/types/login-state";
import { useAppContext } from "@/components/context";
import PageActions from "@/components/page-actions";
import Link from "next/link";
import PageActionMessage from "@/components/page-action-message";

type Message = {
  text: string;
  isError: boolean;
};

const DEFAULT_ACCOUNT_SAVE_ERROR = "Failed to update account data.";

export default function Account() {
  const context = useAppContext();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<Message | undefined>();
  const [saving, setSaving] = useState(false);

  const account = context.account;

  useEffect(() => {
    if (!account) {
      return;
    }

    setUsername(account.username);
  }, [account]);

  switch (context.loginState) {
    case LoginState.Pending:
      return <></>;
    case LoginState.LoggedOut:
      return <>Not logged in.</>;
    case LoginState.LoggedIn:
      return (
        <>
          <div className="input-row">
            Username:
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <br />

          <ul>
            <li>
              <Link href={`/mods?creator=${account!.id}`}>
                View Published Mods
              </Link>
            </li>
            <li>
              <Link href="/mods/upload">Upload New Mods</Link>
            </li>
          </ul>

          <PageActions>
            {message && (
              <PageActionMessage
                className={message.isError ? "error" : undefined}
              >
                {message.text}
              </PageActionMessage>
            )}

            <a
              onClick={async () => {
                setSaving(true);

                try {
                  const response = await fetch("/api/users/me", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username }),
                  });

                  if (response.status == 200) {
                    setMessage(undefined);
                  } else if (response.status >= 400 && response.status < 500) {
                    setMessage({
                      text:
                        (await response.text()) || DEFAULT_ACCOUNT_SAVE_ERROR,
                      isError: true,
                    });
                  } else {
                    throw new Error(await response.text());
                  }
                } catch (err) {
                  console.error(err);
                  setMessage({
                    text: DEFAULT_ACCOUNT_SAVE_ERROR,
                    isError: true,
                  });
                }

                setSaving(false);
              }}
            >
              {saving ? "SAVING" : "SAVE"}
            </a>
          </PageActions>
        </>
      );
  }
}
