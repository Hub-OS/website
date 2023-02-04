import { PackageMeta } from "./package-meta";
import _ from "lodash";

// valid query examples:
// { ["package.time_freeze"]: true } // $eq
// { ["package.category"]: "block" } // $eq
// { ["package.codes"]: ["*"] } // $in
// { ["$package.name"]: "te" } // custom case insensitive partial search

export type Query = { [key: string]: any };

export function queryTest(query: Query, other: PackageMeta) {
  for (let key in query) {
    const queryValue = query[key];
    let isPartialTextSearch = false;

    if (key.startsWith("$")) {
      key = key.slice(1);
      isPartialTextSearch = true;
    }

    const value = _.get(other, key);

    if (Array.isArray(queryValue)) {
      // $in
      for (const expectedValue of queryValue) {
        if (!value.includes(expectedValue)) {
          return false;
        }
      }
    } else if (typeof queryValue == "string") {
      // $eq, but with a special partial text search case
      if (typeof value != "string") {
        return false;
      }

      if (value != queryValue) {
        return false;
      } else if (
        isPartialTextSearch &&
        !value.toLowerCase().includes(queryValue.toLowerCase())
      ) {
        // special case
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
