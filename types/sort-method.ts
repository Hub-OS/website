import { PackageMeta } from "./package-meta";

export enum SortMethod {
  CreationDate,
  RecentlyUpdated,
  // PackageId
  // Downloads,
  // trending?
}

export function sortBy(packages: PackageMeta[], sortMethod: SortMethod) {
  switch (sortMethod) {
    case SortMethod.CreationDate:
      packages.sort((a, b) => +b.creation_date - +a.creation_date);
      break;
    case SortMethod.RecentlyUpdated:
      packages.sort((a, b) => +b.updated_date - +a.updated_date);
      break;
    // case SortMethod.Downloads:
    //   packages.sort((a, b) => b.downloads - a.downloads);
    //   break;
  }
}
