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
    element?: string;
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
    overworld_animation_path?: string;
    overworld_texture_path?: string;
    mugshot_animation_path?: string;
    mugshot_texture_path?: string;
    emotions_texture_path?: string;

    // cards, enemies, and players
    preview_texture_path?: string;

    // players and cards
    icon_texture_path?: string;
  };
  defines?: {
    characters?: { id: string; path: string }[];
  };
  dependencies?: {
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

  if (obj.defines) {
    if (typeof obj.defines != "object") {
      return;
    }

    if (obj.defines.characters) {
      if (isDefinitionList(obj.defines.characters)) {
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
        typeof v.id == "string"
    )
  );
}
