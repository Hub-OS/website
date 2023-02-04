export type PackageMeta = {
  package: {
    category: string;
    id: string;
    name: string;
    description?: string;

    // blocks
    colors?: string[];
    shape?: number[][];
    flat?: boolean;

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
  };
  defines?: {
    characters?: { id: string; path: string }[];
  };
  dependencies?: {
    battles?: string[];
    characters?: string[];
    libraries?: string[];
    cards?: string[];
  };
  // storage specific
  creator: unknown;
  creation_date: Date;
  updated_date: Date;
  hash?: string;
};

const validCategories = [
  "block",
  "card",
  "battle",
  "library",
  "player",
  "pack",
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

    const { characters, libraries, cards } = obj.dependencies;

    if (characters && !isDependencyList(characters)) {
      return;
    }

    if (libraries && !isDependencyList(libraries)) {
      return;
    }

    if (cards && !isDependencyList(cards)) {
      return;
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

  return (
    meta.dependencies.battles?.length! > 0 ||
    meta.dependencies.cards?.length! > 0 ||
    meta.dependencies.characters?.length! > 0 ||
    meta.dependencies.libraries?.length! > 0
  );
}

export function dependencies(meta: PackageMeta) {
  const dependencies: string[] = [];

  if (!meta.dependencies) {
    return dependencies;
  }

  if (meta.dependencies.battles) {
    dependencies.push(...meta.dependencies.battles);
  }

  if (meta.dependencies.cards) {
    dependencies.push(...meta.dependencies.cards);
  }

  if (meta.dependencies.libraries) {
    dependencies.push(...meta.dependencies.libraries);
  }

  return dependencies;
}
