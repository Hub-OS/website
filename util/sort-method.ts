import { PackageMeta } from "./package-meta";

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
      packages.sort((metaA, metaB) => {
        return +metaB.creation_date! - +metaA.creation_date!;
      });
      break;
    case SortMethod.RecentlyUpdated:
      packages.sort((metaA, metaB) => {
        return +metaB.updated_date! - +metaA.updated_date!;
      });
      break;
    case SortMethod.PackageId:
      packages.sort((metaA, metaB) => {
        if (metaA.package.id < metaB.package.id) {
          return -1;
        } else {
          return 1;
        }
      });
      break;
    // case SortMethod.Downloads:
    //   packages.sort((a, b) => b.downloads - a.downloads);
    //   break;
  }
}
