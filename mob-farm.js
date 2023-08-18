import pathfinder_pkg from "mineflayer-pathfinder";
import { sleep } from "./shared.js";
import { getDistances, has_thorns, equip_by_name } from "./shared.js";
import { mVoidDump } from "./inventory.js";
import g from "./globals.js";

const { GoalNear } = pathfinder_pkg.goals;

export async function farmMobs() {
  let loop = true;
  g.mode = "farmMobs";
  while (loop && g.mode === "farmMobs") {
    loop = loop && (await fightPoints());
    console.log("fightPoints", loop);
    loop = loop && (await mwalkPoints());
    console.log("mwalkPoints", loop);
    // loop = loop && (await mDepositItems());
    // console.log("mDepositItems", loop);
    loop = loop && (await mVoidDump());
    console.log("mVoidDump", loop);
  }
}

async function mwalkPoints() {
  const bot = g.bot;
  const mwalk_points = Object.keys(g.named_points).filter((k) =>
    k.startsWith("walkfarm"),
  );
  console.log("mwalk_points", mwalk_points);
  if (mwalk_points.length === 0) {
    bot.chat("Tell me where to stand.");
    return false;
  }
  for (let point_index = 0; point_index < mwalk_points.length; point_index++) {
    const point_name = mwalk_points[point_index];
    const point = g.named_points[point_name];
    await bot.pathfinder.goto(new GoalNear(point.x, point.y, point.z, 1));
    await sleep(500);
  }
  return true;
}

async function fightPoints() {
  const bot = g.bot;
  const farm_points = Object.keys(g.named_points).filter((k) =>
    k.startsWith("mobfarm"),
  );
  console.log("farm_points", farm_points);
  if (farm_points.length === 0) {
    bot.chat("Tell me where to stand.");
    return false;
  }
  for (let point_index = 0; point_index < farm_points.length; point_index++) {
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
    while (saw_mobs) {
      saw_mobs = false;
      for (const entity_id in bot.entities) {
        const entity = bot.entities[entity_id];
        if (!entity) {
          continue;
        }
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
      if (["iron_sword", "wooden_sword"].indexOf(bot.heldItem.name) === -1) {
        await sleep(300);
      } else {
        await sleep(1100);
      }
    }
  }
  return true;
}
