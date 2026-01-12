import { DB } from "@/storage/db";
import { Account } from "./account";

type CardRecipe =
  | { id: string; codes: string[] }
  | { name: string; codes: string[] }
  | { mix: ({ name: string } | { id: string })[] };

export type PackageMeta = {
  package: {
    category: string;
    id: string;
    past_ids?: string[];
    name: string;
    long_name?: string;
    description?: string;

    // block augments
    colors?: string[];
    shape?: number[][];
    flat?: boolean;

    // switch drive augments
    slot: string;

    // cards
    codes?: string[];
    long_description?: string;
    damage?: number;
    secondary_element?: string;
    card_class?: string;
    limit?: number;
    hit_flags?: string[];
    can_boost?: boolean;
    counterable?: boolean;
    time_freeze?: boolean;
    skip_time_freeze_intro?: boolean;
    meta_classes?: string[];
    recipes?: CardRecipe[];

    // players
    health?: number;
    overworld_animation_path?: string;
    overworld_texture_path?: string;
    mugshot_animation_path?: string;
    mugshot_texture_path?: string;
    emotions_texture_path?: string;

    // cards, enemies, and players
    preview_texture_path?: string;

    // players and cards
    element?: string;
    icon_texture_path?: string;

    // statuses
    flag_name?: string;
    blocks_flags?: string[];
    blocked_by?: string[];
    blocks_actions?: boolean;
    blocks_mobility?: boolean;
    durations?: number[];

    // tile states
    state_name?: string;
    texture_path?: string;
    animation_path?: string;
    max_lifetime?: number;
    hide_frame?: boolean;
    hide_frame_body?: boolean;
    hole?: boolean;
    cleanser_element?: string;
  };
  defines?: {
    characters?: { id: string; path: string }[];
  };
  dependencies?: {
    augments?: string[];
    encounters?: string[];
    characters?: string[];
    libraries?: string[];
    statuses?: string[];
    cards?: string[];
  };
  // storage specific
  creator: unknown;
  creation_date: Date;
  updated_date: Date;
  hidden?: boolean;
  hash?: string;
};

const validCategories = [
  "augment",
  "card",
  "encounter",
  "library",
  "player",
  "pack",
  "resource",
  "status",
  "tile_state",
];

const dependencyListNames = [
  "augments",
  "encounters",
  "characters",
  "libraries",
  "statuses",
  "cards",
  "tile_states",
];

export function asPackageMeta(obj: any): PackageMeta | undefined {
  if (
    typeof obj != "object" ||
    typeof obj.package != "object" ||
    typeof obj.package.id != "string" ||
    typeof obj.package.name != "string" ||
    typeof obj.package.category != "string"
  ) {
    return;
  }

  if (!validCategories.includes(obj.package.category)) {
    return;
  }

  if (obj.defines) {
    if (typeof obj.defines != "object") {
      return;
    }

    if (obj.defines.characters) {
      if (!isDefinitionList(obj.defines.characters)) {
        return;
      }
    }
  }

  if (obj.dependencies) {
    if (typeof obj.dependencies != "object") {
      return;
    }

    for (const name of dependencyListNames) {
      const list = obj.dependencies[name];

      if (list && !isDependencyList(list)) {
        return;
      }
    }
  }

  return obj as PackageMeta;
}

function isDependencyList(data: any) {
  return Array.isArray(data) && data.every((v: any) => typeof v == "string");
}

function isDefinitionList(data: any) {
  return (
    Array.isArray(data) &&
    data.every(
      (v: any) =>
        typeof v == "object" &&
        typeof v.id == "string" &&
        typeof v.path == "string"
    )
  );
}

export function hasDependencies(meta: PackageMeta) {
  if (!meta.dependencies) {
    return false;
  }

  const dependencyListMap = meta.dependencies as { [key: string]: string[] };

  for (const name of dependencyListNames) {
    const list = dependencyListMap[name];

    if (list?.length > 0) {
      return true;
    }
  }

  return false;
}

export function dependencies(meta: PackageMeta) {
  const dependencies: string[] = [];

  if (!meta.dependencies) {
    return dependencies;
  }

  const dependencyListMap = meta.dependencies as { [key: string]: string[] };

  for (const name of dependencyListNames) {
    const list = dependencyListMap[name];

    if (list) {
      dependencies.push(...list);
    }
  }

  return dependencies;
}

export function hasPreviewTexture(meta: PackageMeta): boolean {
  return (
    meta.package.preview_texture_path != undefined ||
    meta.package.category == "tile_state" ||
    (meta.package.category == "status" &&
      meta.package.icon_texture_path != undefined)
  );
}

// meta passed in should be from the server if availiable,
// otherwise fallback to a new meta object
export async function hasEditPermission(
  db: DB,
  meta: PackageMeta,
  accountId: Account["id"]
): Promise<boolean> {
  if (meta.creator && db.compareIds(meta.creator, accountId)) {
    // is owner
    return true;
  }

  const namespace = await db.findPackageNamespace(meta.package.id);

  if (!namespace) {
    // no restrictive namespace
    return false;
  }

  const member = namespace.members.find((member) =>
    db.compareIds(member.id, accountId)
  );

  if (!member || member.role == "invited") {
    return false;
  }

  return true;
}
