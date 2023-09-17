import * as pathfinder_pkg from "mineflayer-pathfinder";
import { sleep } from "./shared";
import { getDistances, has_thorns, equip_by_name } from "./shared";
import { mVoidDump } from "./inventory.js";
import * as g from "./globals.js";

const { GoalNear } = pathfinder_pkg.goals;

export async function farmMobs() {
  let loop: boolean | undefined = true;
  g.setMode("farmMobs");
  while (loop && g.mode === "farmMobs") {
    loop = loop && g.mode === "farmMobs" && (await createSwords());
    loop = loop && g.mode === "farmMobs" && (await fightPoints());
    console.log("fightPoints", loop);
    loop = loop && g.mode === "farmMobs" && (await mwalkPoints());
    console.log("mwalkPoints", loop);
    // loop = loop && (await mDepositItems());
    // console.log("mDepositItems", loop);
    loop = loop && g.mode === "farmMobs" && (await mVoidDump());
    console.log("mVoidDump", loop);
  }
}

export async function createSwords() {
  const bot = g.getBot();
  const sword_name = "wooden_sword";
  const sword_log = "oak_log";
  const sword_plank = "oak_planks";
  const sword_stick = "stick";
  const sword_id = bot.registry.itemsByName[sword_name].id;
  const sword_log_id = bot.registry.itemsByName[sword_log].id;
  const sword_plank_id = bot.registry.itemsByName[sword_plank].id;
  const sword_stick_id = bot.registry.itemsByName[sword_stick].id;
  const craftingTableID = bot.registry.blocksByName.crafting_table.id;
  //console.log("sword_type", sword_name, sword_id, sword_id)
  const sword_count = bot.inventory.count(sword_id, null);
  const desired_sword_count = 3;
  if (sword_count >= desired_sword_count) {
    return true;
  }
  while (bot.inventory.count(sword_plank_id, null) < 12) {
    if (bot.inventory.count(sword_log_id, null) < 2) {
      bot.chat("I'm out of logs");
      return false;
    }
    bot.chat("crafting planks");
    let recipes = bot.recipesFor(sword_plank_id, null, null, false);
    //console.log("planks recipe", sword_plank_id, recipes)
    const recipe = recipes[0];
    //console.log(recipes.map((r) => [r.ingredients, r.ingredients[0].id, bot.registry.items[r.ingredients[0].id].displayName]))
    await bot.craft(recipe, 4, null);
    await bot.waitForTicks(10);
  }
  const stick_count = bot.inventory.count(sword_stick_id, null);
  if (stick_count < 3) {
    bot.chat("crafting sticks");
    const recipes = bot.recipesFor(sword_stick_id, null, 1, false);
    //console.log("sticks recipe", sword_stick_id, recipes)
    const recipe = recipes[0];
    await bot.craft(recipe, 1, null);
    await bot.waitForTicks(10);
  }

  const craftingTable = bot.findBlock({
    matching: craftingTableID,
    maxDistance: 40,
  });
  await bot.pathfinder.goto(
    new GoalNear(
      craftingTable.position.x,
      craftingTable.position.y,
      craftingTable.position.z,
      4,
    ),
  );

  const sword_recipes = bot.recipesAll(sword_id, null, true);
  if (sword_recipes.length == 0) {
    bot.chat("I don't know how to craft " + sword_name);
    return false;
  }
  bot.chat("crafting " + sword_name);
  for (let i = sword_count; i < desired_sword_count; i++) {
    await bot.craft(sword_recipes[0], 1, craftingTable);
    await bot.waitForTicks(10);
  }
  bot.chat("Crafted " + sword_name);
  return true;
}

async function mwalkPoints() {
  const bot = g.getBot();
  const mwalk_points = Object.keys(g.named_points).filter((k) =>
    k.startsWith("walkfarm"),
  );
  console.log("mwalk_points", mwalk_points);
  if (mwalk_points.length === 0) {
    bot.chat("Tell me where to stand.");
    return false;
  }
  for (
    let point_index = 0;
    point_index < mwalk_points.length && g.mode === "farmMobs";
    point_index++
  ) {
    const point_name = mwalk_points[point_index];
    const point = g.named_points[point_name];
    await bot.pathfinder.goto(new GoalNear(point.x, point.y, point.z, 1));
    await sleep(500);
  }
  return true;
}

async function fightPoints() {
  const bot = g.getBot();
  const farm_points = Object.keys(g.named_points).filter((k) =>
    k.startsWith("mobfarm"),
  );
  console.log("farm_points", farm_points);
  if (farm_points.length === 0) {
    bot.chat("Tell me where to stand.");
    return false;
  }
  for (
    let point_index = 0;
    point_index < farm_points.length && g.mode === "farmMobs";
    point_index++
  ) {
    const point_name = farm_points[point_index];
    const point = g.named_points[point_name];
    await bot.pathfinder.goto(new GoalNear(point.x, point.y, point.z, 1));
    await sleep(250);
    for (const entity_id in bot.entities) {
      const entity = bot.entities[entity_id];
      if (!entity) {
        continue;
      }
      if (entity.username == bot.username) {
        continue;
      }
      const edist = getDistances(entity.position);
      if (entity.type === "player" && edist.ydiff < 2 && edist.posdiff < 2) {
        console.log("entity.position", entity.position);
        bot.chat("You're standing too close to me, " + entity.username + `!`);
        return;
      }
    }
    let saw_mobs = true;
    while (saw_mobs && g.mode === "farmMobs") {
      saw_mobs = false;
      let saw_tiny = false;
      for (const entity_id in bot.entities) {
        const entity = bot.entities[entity_id];
        if (!entity) {
          continue;
        }
        // @ts-ignore
        if (entity.type !== "hostile") {
          continue;
        }
        if (entity.mobType !== "Zombie") {
          continue;
        }
        // if (!entity.metadata || entity.metadata.length == 0) {
        //   continue;
        // }

        if (
          // @ts-ignore
          !entity.attributes ||
          // @ts-ignore
          !entity.attributes["minecraft:generic.movement_speed"]?.modifiers
            ?.length
        ) {
          continue;
        }
        if (has_thorns(entity)) {
          continue;
        }
        const edist = getDistances(entity.position);
        if (edist.ydiff > 2 || edist.posdiff > 4) {
          continue;
        }
        // console.log("Attacking", entity)
        equip_by_name("iron_sword");
        equip_by_name("wooden_sword");
        bot.attack(entity);
        saw_tiny = true;
        saw_mobs = true;
        break;
      }
      if (!saw_tiny) {
        for (const entity_id in bot.entities) {
          const entity = bot.entities[entity_id];
          if (!entity) {
            continue;
          }
          // @ts-ignore
          if (entity.type !== "hostile") {
            continue;
          }
          if (has_thorns(entity)) {
            continue;
          }
          const edist = getDistances(entity.position);
          if (edist.ydiff > 2 || edist.posdiff > 4) {
            continue;
          }
          // console.log("Attacking", entity)
          equip_by_name("iron_sword");
          equip_by_name("wooden_sword");
          bot.attack(entity);
          saw_mobs = true;
          break;
        }
      }
      if (
        bot.heldItem &&
        ["iron_sword", "wooden_sword"].indexOf(bot.heldItem.name) === -1
      ) {
        await sleep(300);
      } else {
        await sleep(1100);
      }
    }
  }
  return true;
}
