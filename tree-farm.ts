import pathfinder_pkg from "mineflayer-pathfinder";
import { sleep, pickUpItems, equip_by_id } from "./shared.js";
import { goToBed } from "./bed.js";
import { Vec3 } from "vec3";
import * as g from "./globals.js";

const { GoalNear } = pathfinder_pkg.goals;

async function doTreeMining() {
  const bot = g.getBot();
  while (g.mode === "tree") {
    console.log("sleep");
    g.mode === "tree" && (await sleep());
    console.log("mineTree");
    g.mode === "tree" && (await mineTree());
    console.log("placeSaplings");
    g.mode === "tree" && (await placeSaplings());
    console.log("pickUpItems");
    g.mode === "tree" && (await pickUpItems());
    console.log("quitNight");
    g.mode === "tree" && (await goToBed());
    // manageInventoryTree()
  }
  bot.chat("I'm sick of chopping wood");
}

async function mineTree() {
  // Initial search for logs
  const bot = g.getBot();
  const iron_axe_id = bot.registry.itemsByName.iron_axe.id;
  const ids = [bot.registry.blocksByName["oak_log"].id];
  const blocks = bot.findBlocks({
    matching: ids,
    maxDistance: 128,
    count: 1,
  });
  if (blocks.length === 0) {
    await sleep(2000);
    return;
  }
  console.log("Considering block", blocks);
  const p = blocks[0];

  // Find the bottom log in the tree
  // let tb = bot.blockAt(p).name;
  // console.log("tb", tb)
  while (
    bot.blockAt(new Vec3(p.x, p.y - 1, p.z)).name === "oak_log" ||
    bot.blockAt(new Vec3(p.x, p.y - 1, p.z)).name === "air"
  ) {
    //console.log("lowering p", p, bot.blockAt(new Vec3(p.x, p.y - 1, p.z)).name)
    p.y = p.y - 1;
  }

  // Go to tree
  await bot.pathfinder.goto(new GoalNear(p.x, p.y + 1, p.z, 2));
  await sleep(250);

  // Mining bottom two blocks of tree
  let floor_block = bot.blockAt(p);
  // console.log("floor_block", floor_block)
  if (floor_block.name == "oak_log") {
    // console.log("digging bottom")
    await equip_by_id(iron_axe_id);
    await bot.dig(floor_block);
  }
  p.y = p.y + 1;
  let chest_block = bot.blockAt(p);
  if (chest_block.name == "oak_log") {
    // console.log("digging chest")
    await bot.dig(chest_block);
  }
  p.y = p.y + 1;

  // Stand on dirt
  await bot.pathfinder.goto(new GoalNear(p.x, p.y - 1, p.z, 1));
  await sleep(250);

  // Mine all logs above player
  // let pb = bot.blockAt(p);
  // console.log("pb", pb, pb.type)
  while (bot.blockAt(p).name == "oak_log") {
    await equip_by_id(iron_axe_id);
    await bot.dig(bot.blockAt(p));
    p.y = p.y + 1;
  }
}

export async function placeSaplings() {
  const bot = g.getBot();
  const oak_sapling_id = bot.registry.itemsByName.oak_sapling.id;
  const ids = [bot.registry.blocksByName["dirt"].id];
  const dirts = bot.findBlocks({
    matching: ids,
    maxDistance: 40,
    count: 50,
  });
  for (let i = 0; i < dirts.length; i++) {
    const item = bot.inventory.findInventoryItem(oak_sapling_id, null, false);
    if (!item) {
      bot.chat("I don't have any oak saplings");
      return;
    }

    const dirt_vec = dirts[i];
    const above_dirt_vec = new Vec3(dirt_vec.x, dirt_vec.y + 1, dirt_vec.z);
    if (
      bot.blockAt(new Vec3(dirt_vec.x + 1, dirt_vec.y, dirt_vec.z)).name !=
        "oak_slab" ||
      bot.blockAt(new Vec3(dirt_vec.x - 1, dirt_vec.y, dirt_vec.z)).name !=
        "oak_slab" ||
      bot.blockAt(new Vec3(dirt_vec.x, dirt_vec.y, dirt_vec.z + 1)).name !=
        "oak_slab" ||
      bot.blockAt(new Vec3(dirt_vec.x, dirt_vec.y, dirt_vec.z - 1)).name !=
        "oak_slab"
    ) {
      continue;
    }
    const above_dirt_block = bot.blockAt(above_dirt_vec);
    if (above_dirt_block.name != "air") {
      continue;
    }

    await bot.pathfinder.goto(
      new GoalNear(above_dirt_vec.x, above_dirt_vec.y, above_dirt_vec.z, 2),
    );
    await bot.equip(item, "hand");
    await bot.lookAt(dirt_vec, true);
    await bot.placeBlock(bot.blockAt(dirt_vec), new Vec3(0, 1, 0));
    await sleep(350);
  }
}

export { doTreeMining };
