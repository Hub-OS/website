import { PublicAccountData } from "@/types/public-account-data";
import { LoginState } from "@/types/login-state";
import { useRouter } from "next/router";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type AppContext = {
  account?: PublicAccountData;
  loginState: LoginState;
};

const AppContext = createContext<AppContext>({
  loginState: LoginState.Pending,
});

type Props = { children?: ReactNode };

function processParams() {
  if (typeof window == "undefined") {
    return {};
  }

  const params = window.location.hash.slice(1);

  return Object.fromEntries(
    params.split("&").map((pairStr) => pairStr.split("="))
  );
}

export function AppContextProvider({ children }: Props) {
  const [loginState, setLoginState] = useState(LoginState.Pending);
  const [account, setAccount] = useState(undefined);
  // setting abortController to null as this component renders on the server
  // and the reference would be reset on the client causing a double fetch otherwise
  const [abortController, setAbortController] =
    useState<AbortController | null>();

  const router = useRouter();
  const params = processParams();

  useEffect(() => {
    if (!abortController) {
      return;
    }

    if (params.error) {
      router.replace("/");
    }

    if (params.access_token != undefined && !abortController.signal.aborted) {
      router.replace(router.pathname);
      abortController.abort();

      fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.access_token }),
      })
        .then(() => {
          setAbortController(new AbortController());
          setLoginState(LoginState.Pending);
        })
        .catch(console.error);
    }
  }, [router, params, abortController]);

  useEffect(() => {
    if (!abortController) {
      setAbortController(new AbortController());
      return;
    }

    fetch("/api/me", { signal: abortController.signal })
      .then(async (response) => {
        if (response.status == 200) {
          setAccount(await response.json());
          setLoginState(LoginState.LoggedIn);
        } else {
          setLoginState(LoginState.LoggedOut);
        }
      })
      .catch(() => {
        // ignoring errors, since we'll likely see an error for abortController.abort()
      });
  }, [abortController]);

  return (
    <AppContext.Provider value={{ account, loginState }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
