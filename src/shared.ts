import * as pathfinder_pkg from "mineflayer-pathfinder";
import * as prismarine_entity from "prismarine-entity";
import { Vec3 } from "vec3";
import * as primarine_item from "prismarine-item";
import * as g from "./globals";

const { GoalNear } = pathfinder_pkg.goals;

export async function pickUpItems() {
  const bot = g.getBot();
  // console.log("bot.entities", bot.entities, Object.keys(bot.entities))
  for (const entity_id in bot.entities) {
    const entity = bot.entities[entity_id];
    if (!entity) {
      continue;
    }
    if (entity.type === "mob" || entity.type === "player") {
      continue;
    }
    if (entity.mobType !== "Item") {
      continue;
    }
    // if (filter)
    // console.log("entity_id", entity_id)
    // console.log("entity", entity)
    const diff = getDistances(entity.position);

    if (diff.ydiff < 1 && diff.posdiff < 25) {
      const epos = entity.position;
      await bot.pathfinder.goto(
        new GoalNear(epos.x, bot.entity.position.y, epos.z, 1),
      );
      await sleep(350);
    }
  }
  console.log("Done picking up");
}

export function sleep(timeout: number | undefined = undefined) {
  return new Promise((r) => setTimeout(r, timeout || 1000));
}

export function has_thorns(entity: prismarine_entity.Entity) {
  for (let eq_idq in entity.equipment) {
    let enchant_list =
      // @ts-ignore
      entity.equipment[eq_idq]?.nbt?.value?.Enchantments?.value?.value;
    for (let enchant_idx in enchant_list) {
      if (enchant_list[enchant_idx].id.value === "minecraft:thorns") {
        return true;
      }
    }
  }
}

export function getDistances(vec: Vec3) {
  const bot = g.getBot();
  const ydiff = Math.abs(vec.y - bot.entity.position.y);
  const posdiff = Math.sqrt(
    Math.pow(vec.x - bot.entity.position.x, 2) +
      Math.pow(vec.z - bot.entity.position.z, 2),
  );
  return {
    ydiff: ydiff,
    posdiff: posdiff,
  };
}

export async function drop(filter: string | null = null) {
  const bot = g.getBot();
  console.log("bot.inventory.items", bot.inventory.items());
  for (const item of bot.inventory.items()) {
    if (filter) {
      if (item.name.indexOf(filter) >= 0) {
        console.log("dropping", item, item.type);
        await bot.toss(item.type, null, item.count);
      }
    } else {
      console.log("dropping", item, item.type);
      await bot.toss(item.type, null, item.count);
    }
  }
}

export async function quitNight() {
  const bot = g.getBot();
  if (!bot.time.isDay) {
    bot.chat("Hiding from the night");
    await sleep(500);
    g.setMode(null);
    bot.quit();
  }
}

export function itemToString(item: primarine_item.Item | null) {
  if (item) {
    return `${item.name} x ${item.count}`;
  } else {
    return "(nothing)";
  }
}

export async function equip_by_id(item_id: number) {
  const bot = g.getBot();
  const items = bot.inventory
    .items()
    .filter((item) => item.type == item_id)
    // Always use the most-damaged matching item first
    // @ts-ignore
    .sort(
      (itemA, itemB) =>
        // @ts-ignore
        itemB.nbt?.value?.Damage?.value - itemA.nbt?.value?.Damage?.value,
    );
  if (items.length === 0) {
    return;
  }
  await bot.equip(items[0], "hand");
}

export async function equip_by_name(item_name: string) {
  const bot = g.getBot();
  const item_id = bot.registry.itemsByName[item_name].id;
  await equip_by_id(item_id);
}
