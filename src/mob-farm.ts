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
  const craftingTableID = bot.registry.blocksByName.crafting_table.id
  if (bot.inventory.count(sword_name, null) > 5) {
    return true;
  }
  const craftingTable = bot.findBlock({
    matching: craftingTableID,
    maxDistance: 40,
  })
  await bot.pathfinder.goto(new GoalNear(craftingTable.position.x, craftingTable.position.y, craftingTable.position.z, 4));
  const sword_type = bot.registry.itemsByName[sword_name].type;
  const sword_recipes = bot.recipesFor(sword_type, null, 1, bot);
  if (sword_recipes.length == 0) {
    bot.chat("I don't know how to craft " + sword_name);
    return false;
  }
  await bot.craft(sword_recipes[0], 1, craftingTable);
  bot.chat("Crafted " + sword_name);
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
      for (const entity_id in bot.entities) {
        const entity = bot.entities[entity_id];
        if (!entity) {
          continue;
        }
        if (entity.type !== "mob") {
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
