import pathfinder_pkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { sleep, pickUpItems } from "./shared.js";
import g from "./globals.js";

const { GoalNear } = pathfinder_pkg.goals;

async function craftBonemeal() {
  const bot = g.bot;
  const bonemeal_id = bot.registry.itemsByName.bone_meal.id;
  const bone_id = bot.registry.itemsByName.bone.id;
  const bone_meal_inv = bot.inventory.findInventoryItem(bonemeal_id);
  if (!bone_meal_inv) {
    console.log("bone_id", bone_id);
    const bone_inv = bot.inventory.findInventoryItem(bone_id);
    if (!bone_inv) {
      console.log("items", bot.inventory.items());
      bot.chat("I'm out of bone");
      return false;
    }
    const recipe = bot.recipesFor(bonemeal_id)[0];
    await bot.craft(recipe);
    return true;
  }
  return true;
}

async function fertilizeCrop(block_vec) {
  // await sleep(20)
  const bot = g.bot;
  const bonemeal_id = bot.registry.itemsByName.bone_meal.id;
  const bone_meal_inv = bot.inventory.findInventoryItem(bonemeal_id);
  if (!bone_meal_inv) {
    bot.chat("I'm out of bonemeal");
    return false;
  }
  const block = bot.blockAt(block_vec);
  if (block._properties.age == 7) {
    return true;
  }
  console.log("block", block);
  await bot.equip(bone_meal_inv);
  await bot.lookAt(block_vec);
  try {
    bot.activateBlock(block, new Vec3(0, 1, 0));
    await sleep(50);
    bot.activateBlock(block, new Vec3(0, 1, 0));
    await sleep(50);
    bot.activateBlock(block, new Vec3(0, 1, 0));
    await sleep(50);
    bot.activateBlock(block, new Vec3(0, 1, 0));
  } catch (error) {
    console.log("error", error);
  }
  return true;
}

async function breakFarmBlock(block_vec, crop_name, item_name) {
  const bot = g.bot;
  const block = bot.blockAt(block_vec);
  if (block._properties.age == 7) {
    await bot.dig(block);
    await sleep(100);
    await pickUpItems();
    await bot.pathfinder.goto(
      new GoalNear(block_vec.x, block_vec.y, block_vec.z, 2),
    );
    return await placeFarmBlock(block_vec, crop_name, item_name);
  }
  return true;
}

async function placeFarmBlock(block_vec, crop_name, item_name) {
  const bot = g.bot;
  await sleep(100);
  const item_id = bot.registry.itemsByName[item_name].id;
  const item_inv = bot.inventory.findInventoryItem(item_id);
  const block = bot.blockAt(block_vec);
  console.log("placeFarmBlock", block);
  const dirt_below = bot.blockAt(
    new Vec3(block_vec.x, block_vec.y - 1, block_vec.z),
  );
  if (dirt_below.name == "dirt") {
    const hoe_id = bot.registry.itemsByName.wooden_hoe.id;
    const hoe_item = bot.inventory.findInventoryItem(hoe_id);
    if (!hoe_item) {
      bot.chat("I got 99 problems, and a hoe is one.");
      return false;
    }
  }
  if (block.name == crop_name) {
    return true;
  }
  if (!item_inv) {
    bot.chat(`I'm all out of ${item_name}`);
  }

  await bot.lookAt(block_vec);
  await sleep(100);
  await bot.equip(item_inv, "hand");
  try {
    await bot.placeBlock(bot.blockAt(block_vec), new Vec3(0, 1, 0));
  } catch (error) {
    console.log(error);
  }
  return true;
}

export async function farmCrops(crop_name) {
  const bot = g.bot;
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
  g.mode = "farmCrops";
  while (loop && g.mode === "farmCrops") {
    loop = loop && (await craftBonemeal());
    console.log("craftBonemeal", loop);
    loop = loop && (await fertilizeCrop(block_vec));
    console.log("fertilizeCrop", loop);
    loop = loop && (await breakFarmBlock(block_vec, crop_name, item_name));
    console.log("breakFarmBlock", loop);
  }
}
