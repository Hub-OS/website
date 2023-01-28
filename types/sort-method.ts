import { PackageMeta } from "./package-meta";

export enum SortMethod {
  CreationDate,
  RecentlyUpdated,
  // Downloads,
  // trending?
}

export function sortBy(packages: PackageMeta[], sortMethod: SortMethod) {
  switch (sortMethod) {
    case SortMethod.CreationDate:
      packages.sort((a, b) => +a.creation_date - +b.creation_date);
      break;
    case SortMethod.RecentlyUpdated:
      packages.sort((a, b) => +a.updated_date - +b.updated_date);
      break;
    // case SortMethod.Downloads:
    //   packages.sort((a, b) => +a.downloads - +b.downloads);
    //   break;
  }
}
