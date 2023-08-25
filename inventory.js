import pathfinder_pkg from "mineflayer-pathfinder";
import { sleep } from "./shared.js";
import { Vec3 } from "vec3";
import g from "./globals.js";

const { GoalNear } = pathfinder_pkg.goals;

async function mDepositItems() {
  const bot = g.bot;
  if (!("dumpinv" in g.named_points)) {
    bot.chat("You haven't told me which chests to use (bot point dumpinv)");
    return;
  }

  const vp = g.named_points["dumpinv"];
  const dump_goal = new GoalNear(vp.x, vp.y, vp.z, 1);
  await bot.pathfinder.goto(dump_goal);
  const CHEST_ID = 176;
  const chests_vecs = bot.findBlocks({
    matching: [CHEST_ID],
    maxDistance: 20,
    count: 128,
  });
  if (chests_vecs.length === 0) {
    bot.chat("I don't see any chests");
    return;
  }
  console.log("chests_vecs", chests_vecs);
  for (let chest_idx = 0; chest_idx < chests_vecs.length; chest_idx++) {
    const chestBlock = bot.blockAt(chests_vecs[chest_idx]);
    // console.log("chest", chestBlock)
    if (chestBlock._properties?.type === "right") {
      continue;
    }
    await bot.waitForTicks(2);
    const inventory = await bot.openChest(chestBlock);
    await bot.waitForTicks(2);
    const chest_items = inventory.containerItems();
    const user_items = bot.inventory.items();
    const overlap_items = [];
    // console.log("chest_items", chest_items.length, chest_items)
    // console.log("user_items", user_items.length, user_items)
    for (
      let chest_item_idx = 0;
      chest_item_idx < chest_items.length;
      chest_item_idx++
    ) {
      const chest_item = chest_items[chest_item_idx];
      for (
        let user_item_idx = 0;
        user_item_idx < user_items.length;
        user_item_idx++
      ) {
        const user_item = user_items[user_item_idx];
        if (!user_item) continue;
        if (user_item.type == chest_item.type) {
          overlap_items.push(user_item.type);
        }
      }
    }

    const deposited = [];
    for (let item_idx = 0; item_idx < overlap_items.length; item_idx++) {
      const deposit_item = overlap_items[item_idx];
      if (deposited.indexOf(deposit_item) != -1) {
        continue;
      }
      deposited.push(deposit_item);
      await Promise.race([
        inventory.deposit(deposit_item),
        bot.waitForTicks(10),
      ]).catch((error) => {
        if (error.message === "destination full") {
          console.log("destination full");
        } else if (error.message.startsWith("Can't find ")) {
          console.log(error.message, "probably due to already deposited");
        } else {
          console.log("error.message", error.message, error);
          throw error;
        }
      });
    }

    inventory.close();
    await bot.waitForTicks(3);
  }
  return true;
}

async function mVoidDump() {
  const bot = g.bot;
  if (!("farmvoid" in g.named_points)) {
    bot.chat("I don't know where to dump items ([bot] point farmvoid)");
    return;
  }

  const vp = g.named_points["farmvoid"];
  const void_goal = new GoalNear(vp.x, vp.y, vp.z, 1);
  await bot.pathfinder.goto(void_goal);

  const fence_vecs = bot.findBlocks({
    matching: [bot.registry.blocksByName.oak_fence.id],
    maxDistance: 3,
    count: 60,
  });
  for (let fence_vec_id = 0; fence_vec_id < fence_vecs.length; fence_vec_id++) {
    const fence_vec = fence_vecs[0];
    const below_fence_vec = new Vec3(fence_vec.x, fence_vec.y - 1, fence_vec.z);
    const below_block = bot.blockAt(below_fence_vec);
    if (below_block.name == "air") {
      const items = bot.inventory.items();
      for (let item_idx = 0; item_idx < items.length; item_idx++) {
        const item = items[item_idx];
        console.log("item", item);
        if (!item) continue;
        if (
          item.name === "gunpowder" ||
          item.name === "arrow" ||
          // item.name === "bone" ||
          item.name === "rotten_flesh" ||
          item.name.indexOf("leather") != -1 ||
          item.name.indexOf("golden") != -1
        ) {
          await void_throw(fence_vec, item);
        } else if (item.name.indexOf("chainmail") != -1 || item.name == "bow") {
          console.log(
            "damage",
            item.nbt?.value?.Damage.value,
            item.nbt?.value?.Damage.value > 10,
          );
          console.log(
            "enchantments",
            item.nbt?.value?.Enchantments?.value?.value,
            !item.nbt?.value?.Enchantments?.value?.value?.length,
          );
          if (
            item.nbt?.value?.Damage.value > 40 ||
            (item.nbt?.value?.Enchantments?.value?.value?.length || 0) < 2
          ) {
            await void_throw(fence_vec, item);
          }
        }
      }
      await sleep(1000);
      return true;
    }
  }
  bot.chat("I don't see where to throw stuff.");
  return false;
}

async function void_throw(fence_vec, item) {
  const bot = g.bot;
  await bot.lookAt(
    new Vec3(fence_vec.x, fence_vec.y - 1, fence_vec.z + 1),
    true,
  );
  await bot.tossStack(item);
}

export { mDepositItems, mVoidDump };
