import { PackageMeta } from "./package-meta";
import _ from "lodash";

// valid query examples:
// { ["package.time_freeze"]: true } // $eq
// { ["package.codes"]: ["*"] } // $in
// { ["package.name"]: "te" } // $text

export type Query = { [key: string]: any };

export function queryTest(query: Query, other: PackageMeta) {
  for (const key in query) {
    const queryValue = query[key];
    const value = _.get(other, key);

    if (Array.isArray(queryValue)) {
      // $in
      for (const expectedValue of queryValue) {
        if (!value.includes(expectedValue)) {
          return false;
        }
      }
    } else if (typeof queryValue == "string") {
      // $text
      if (typeof value != "string") {
        return false;
      }

      // approximation
      if (!value.toLowerCase().includes(queryValue.toLowerCase())) {
        return false;
      }
    } else {
      // $eq
      if (queryValue != value) {
        return false;
      }
    }
  }

  return true;
}
