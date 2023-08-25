import * as pathfinder_pkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { pickUpItems } from "./shared";
import * as g from "./globals";
import { getDistances } from "./shared";

const { GoalNear } = pathfinder_pkg.goals;

async function craftBonemeal() {
  console.log("craftBonemeal");
  const bot = g.getBot();
  const bonemeal_id = bot.registry.itemsByName.bone_meal.id;
  const bone_id = bot.registry.itemsByName.bone.id;
  const bone_meal_inv = bot.inventory.findInventoryItem(
    bonemeal_id,
    null,
    false,
  );
  if (!bone_meal_inv || bone_meal_inv.count < 10) {
    await bot.waitForTicks(2);
    let bone_inv = bot.inventory.findInventoryItem(bone_id, null, false);
    if (!bone_inv) {
      console.log("items", bot.inventory.items());
      bot.chat("I'm out of bone");
      return false;
    }
    const recipe = bot.recipesFor(bonemeal_id, null, 1, null)[0];
    for (
      let i = 0;
      i < 5 && bone_inv && bone_inv.count > 0;
      i++, bone_inv = bot.inventory.findInventoryItem(bone_id, null, false)
    ) {
      await bot.craft(recipe);
    }
    return true;
  }
  return true;
}

async function fertilizeCrop(block_vec: Vec3) {
  console.log("fertilizeCrop", block_vec);
  // await sleep(20)
  const bot = g.getBot();
  const bonemeal_id = bot.registry.itemsByName.bone_meal.id;
  const bone_meal_inv = bot.inventory.findInventoryItem(
    bonemeal_id,
    null,
    false,
  );
  if (!bone_meal_inv) {
    bot.chat("I'm out of bonemeal");
    return false;
  }
  await bot.waitForTicks(1);
  const block = bot.blockAt(block_vec);
  if (block._properties.age == 7) {
    return true;
  }
  await bot.equip(bone_meal_inv, "hand");
  await bot.lookAt(block_vec);
  try {
    await bot.activateBlock(block, new Vec3(0, 1, 0));
    await bot.waitForTicks(2);
    await bot.activateBlock(block, new Vec3(0, 1, 0));
    await bot.waitForTicks(2);
    await bot.activateBlock(block, new Vec3(0, 1, 0));
    await bot.waitForTicks(2);
    await bot.activateBlock(block, new Vec3(0, 1, 0));
    await bot.waitForTicks(2);
    await bot.activateBlock(block, new Vec3(0, 1, 0));
  } catch (error) {
    console.log("error", error);
  }
  return true;
}

let breakFarmBlockCount = 0;

async function breakFarmBlock(
  block_vec: Vec3,
  crop_name: string,
  item_name: string,
) {
  console.log("breakFarmBlock", block_vec, crop_name, item_name);
  const bot = g.getBot();
  const block = bot.blockAt(block_vec);
  if (block._properties.age == 7) {
    await bot.dig(block);
    await bot.waitForTicks(1);
    breakFarmBlockCount++;
    if (breakFarmBlockCount % 10 == 0) {
      console.log("start pickup");
      await pickUpItems();
      if (getDistances(block_vec).posdiff > 4) {
        await bot.pathfinder.goto(
          new GoalNear(block_vec.x, block_vec.y, block_vec.z, 2),
        );
      }
    }
  } else {
    console.log("block._properties.age", block._properties.age);
  }
  return true;
}

async function placeFarmBlock(
  block_vec: Vec3,
  crop_name: string,
  item_name: string,
) {
  console.log("placeFarmBlock", block_vec, crop_name, item_name);
  const bot = g.getBot();
  const item_id = bot.registry.itemsByName[item_name].id;
  let item_inv = bot.inventory.findInventoryItem(item_id, null, false);
  const block = bot.blockAt(block_vec);
  const dirt_below = bot.blockAt(
    new Vec3(block_vec.x, block_vec.y - 1, block_vec.z),
  );
  if (dirt_below.name == "dirt") {
    const hoe_id = bot.registry.itemsByName.wooden_hoe.id;
    const hoe_item = bot.inventory.findInventoryItem(hoe_id, null, false);
    if (!hoe_item) {
      bot.chat("I got 99 problems, and a hoe is one.");
      return false;
    }
  }
  if (block.name == crop_name) {
    return true;
  }
  if (!item_inv) {
    await pickUpItems();
    await bot.pathfinder.goto(
      new GoalNear(block_vec.x, block_vec.y, block_vec.z, 2),
    );
    item_inv = bot.inventory.findInventoryItem(item_id, null, false);
    if (!item_inv) {
      bot.chat(`I'm all out of ${item_name}`);
      g.setMode(null);
      return false;
    }
  }

  await bot.waitForTicks(1);
  await bot.lookAt(block_vec);
  try {
    await bot.waitForTicks(10);
    while (bot.blockAt(block_vec).name != crop_name) {
      await bot.equip(item_inv, "hand");
      await bot.waitForTicks(1);
      await bot.activateBlock(bot.blockAt(block_vec), new Vec3(0, 1, 0));
      await bot.waitForTicks(5);
    }
  } catch (error) {
    console.log(error);
  }
  return true;
}

export async function farmCrops(crop_name: string) {
  const bot = g.getBot();
  bot.chat("gonna farm");
  const item_name = {
    carrots: "carrot",
    potatoes: "potato",
    wheat: "wheat_seeds",
  }[crop_name];
  if (item_name === undefined) {
    bot.chat(`What are ${crop_name}?`);
    return;
  }
  const crop_block = bot.registry.blocksByName[crop_name];
  const block_vecs = bot.findBlocks({
    matching: [crop_block.id],
    maxDistance: 10,
    count: 128,
  });
  if (block_vecs.length === 0) {
    bot.chat(`I'm not close to any ${crop_name}`);
    return;
  }
  const block_vec = block_vecs[0];

  let loop = true;
  g.setMode("farmCrops");
  while (loop && g.mode === "farmCrops") {
    console.log("loop start");
    loop = loop && g.mode === "farmCrops" && (await craftBonemeal());
    loop = loop && g.mode === "farmCrops" && (await fertilizeCrop(block_vec));
    loop =
      loop &&
      g.mode === "farmCrops" &&
      (await breakFarmBlock(block_vec, crop_name, item_name));
    loop =
      loop &&
      g.mode === "farmCrops" &&
      (await placeFarmBlock(block_vec, crop_name, item_name));
  }
}
