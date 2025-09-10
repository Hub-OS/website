import { AppContextProvider } from "@/components/context";
import Layout from "@/components/layout";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AppProgressProvider } from "@bprogress/next";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppContextProvider>
      <AppProgressProvider
        height="3px"
        color="white"
        options={{ showSpinner: false }}
        delay={100}
      />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AppContextProvider>
  );
}
