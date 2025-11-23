import { PackageMeta } from "./package-meta";
import _ from "lodash";

export enum SortMethod {
  CreationDate,
  RecentlyUpdated,
  PackageId,
  // Downloads,
  // trending?
}

export function fromString(s?: string | string[]): SortMethod {
  switch (s) {
    case "recently_updated":
      return SortMethod.RecentlyUpdated;
    case "package_id":
      return SortMethod.PackageId;
    default:
      return SortMethod.CreationDate;
  }
}

export function sortBy(packages: PackageMeta[], sortMethod: SortMethod) {
  switch (sortMethod) {
    case SortMethod.CreationDate:
      _.sortBy(packages, (meta) => -meta.creation_date);
      break;
    case SortMethod.RecentlyUpdated:
      _.sortBy(packages, (meta) => -meta.updated_date);
      break;
    case SortMethod.PackageId:
      _.sortBy(packages, (meta) => meta.package.id);
      break;
    // case SortMethod.Downloads:
    //   packages.sort((a, b) => b.downloads - a.downloads);
    //   break;
  }
}
