export type BugReport = {
  _id?: unknown;
  type: string;
  content: string;
  creation_date: Date;
  last_report_date?: Date;
  total_reports?: number;
};
