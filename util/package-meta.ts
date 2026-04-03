import { DB } from "@/storage/db";
import { Account } from "./account";
import * as z from "zod";

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

const CardRecipeValidator = z.union([
  z.object({ id: z.string(), codes: z.array(z.string()) }),
  z.object({ name: z.string(), codes: z.array(z.string()) }),
  z.object({
    mix: z.array(
      z.union([z.object({ name: z.string() }), z.object({ id: z.string() })]),
    ),
    ordered: z.boolean().optional(),
  }),
]);

const PackageMetaValidator = z.object({
  package: z.object({
    category: z.enum(validCategories),
    id: z.string(),
    past_ids: z.array(z.string()).optional(),
    name: z.string(),
    long_name: z.string().optional(),
    description: z.string().optional(),
    long_description: z.string().optional(),

    // block augments
    colors: z.array(z.string()).optional(),
    shape: z.array(z.array(z.number())).optional(),
    shapes: z.array(z.array(z.array(z.number()))).optional(),
    flat: z.boolean().optional(),

    // switch drive augments
    slot: z.string().optional(),

    // cards
    codes: z.array(z.string()).optional(),
    damage: z.number().optional(),
    secondary_element: z.string().optional(),
    card_class: z.string().optional(),
    limit: z.number().optional(),
    hit_flags: z.array(z.string()).optional(),
    can_boost: z.boolean().optional(),
    counterable: z.boolean().optional(),
    time_freeze: z.boolean().optional(),
    skip_time_freeze_intro: z.boolean().optional(),
    meta_classes: z.array(z.string()).optional(),
    recipes: z.array(CardRecipeValidator).optional(),

    // players
    health: z.number().optional(),
    overworld_animation_path: z.string().optional(),
    overworld_texture_path: z.string().optional(),
    mugshot_animation_path: z.string().optional(),
    mugshot_texture_path: z.string().optional(),
    emotions_texture_path: z.string().optional(),

    // cards, enemies, and players
    preview_texture_path: z.string().optional(),

    // players and cards
    element: z.string().optional(),
    icon_texture_path: z.string().optional(),

    // statuses
    flag_name: z.string().optional(),
    blocks_flags: z.array(z.string()).optional(),
    blocked_by: z.array(z.string()).optional(),
    blocks_actions: z.boolean().optional(),
    blocks_mobility: z.boolean().optional(),
    durations: z.array(z.number()).optional(),

    // tile states
    state_name: z.string().optional(),
    texture_path: z.string().optional(),
    animation_path: z.string().optional(),
    max_lifetime: z.number().optional(),
    hide_frame: z.boolean().optional(),
    hide_frame_body: z.boolean().optional(),
    hole: z.boolean().optional(),
    cleanser_element: z.string().optional(),
  }),
  defines: z
    .object({
      characters: z
        .array(z.object({ id: z.string(), path: z.string() }))
        .optional(),
    })
    .optional(),
  dependencies: z
    .object({
      augments: z.array(z.string()).optional(),
      encounters: z.array(z.string()).optional(),
      characters: z.array(z.string()).optional(),
      libraries: z.array(z.string()).optional(),
      statuses: z.array(z.string()).optional(),
      cards: z.array(z.string()).optional(),
    })
    .optional(),
  // storage specific
  creator: z.unknown().optional(),
  creation_date: z.date().optional(),
  updated_date: z.date().optional(),
  hidden: z.boolean().optional(),
  hash: z.string().optional(),
});

export type PackageMeta = z.infer<typeof PackageMetaValidator>;

const dependencyListNames = [
  "augments",
  "encounters",
  "characters",
  "libraries",
  "statuses",
  "cards",
  "tile_states",
];

export function parsePackageMeta(obj: any) {
  return PackageMetaValidator.safeParse(obj);
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
  accountId: Account["id"],
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
    db.compareIds(member.id, accountId),
  );

  if (!member || member.role == "invited") {
    return false;
  }

  return true;
}
