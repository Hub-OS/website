import { BugReport } from "@/util/bug-report";
import { requestJSON } from "@/util/request";
import { Result } from "@/util/result";
import { NextPageContext } from "next";

type Props = {
  reports: Result<BugReport[], string>;
};

export default function BugReports({ reports }: Props) {
  return (
    <>
      {reports.ok
        ? reports.value.map((report) => {
            console.log(report);
            const date = new Date(report.creation_date);

            return (
              <div key={report._id! as string}>
                <div>{date.toLocaleString()}</div>
                <br />

                <div style={{ overflow: "auto", whiteSpace: "pre" }}>
                  {report.content}
                </div>
                <br />
              </div>
            );
          })
        : reports.error}
    </>
  );
}

const host = process.env.NEXT_PUBLIC_HOST!;

export async function getServerSideProps(context: NextPageContext) {
  const requestInit = {
    headers: {
      cookie: context.req?.headers.cookie || "",
    },
  };

  const reports = (await requestJSON(
    `${host}/api/crash-reports`,
    requestInit
  )) as Result<BugReport[], string>;

  const props: Props = { reports };

  return {
    props,
  };
}
