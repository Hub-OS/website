import { PackageMeta } from "./package-meta";
import _ from "lodash";

// valid query examples:
// { ["package.time_freeze"]: true } // $eq
// { ["package.category"]: "augment" } // $eq
// { ["package.codes"]: ["*"] } // $in
// { ["$package.name"]: "te" } // custom case insensitive partial search
// { ["^package.name"]: "dev.konstinople." } // custom case for case insensitive prefix search
// { ["!package.name"]: any } // inverts the expression
// { ["$package.name | $package.long_name"]: any } // tests multiple expressions, and passes if at least one passes
// { ["?package.recipes"]: boolean } // existence check

export type Query = { [key: string]: any };

export function queryTest(query: Query, other: PackageMeta) {
  for (let key in query) {
    const value = query[key];
    const branches = key.split(" | ");

    if (!branches.some((key) => testKey(other, value, key))) {
      return false;
    }
  }

  return true;
}

function testKey(other: PackageMeta, queryValue: any, key: string): boolean {
  let isPartialTextSearch = false;
  let isPrefixSearch = false;

  const firstChar = key[0];

  switch (firstChar) {
    case "!":
      return !testKey(other, queryValue, key.slice(1));
    case "$":
      key = key.slice(1);
      isPartialTextSearch = true;
      break;
    case "^":
      key = key.slice(1);
      isPrefixSearch = true;
      break;
    case "?":
      key = key.slice(1);
      const value = _.get(other, key.slice(0, -1));

      if (queryValue) {
        // truthy means it must exist
        return value != null;
      } else {
        return value == null;
      }
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
    } else if (
      isPrefixSearch &&
      !value.toLowerCase().startsWith(queryValue.toLowerCase())
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

  return true;
}
