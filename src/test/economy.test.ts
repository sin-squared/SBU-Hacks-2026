import { describe, expect, it } from "vitest";
import { applyDistrictUnlocks, buyBusiness, buyUpgrade, businessCost, earn, totalIncome } from "@/game/economy";
import { applyObjectives, initialState } from "@/game/progression";

describe("economy", () => {
  it("starts with 25 coins and only Foundry Row", () => {
    const s = initialState();
    expect(s.coins).toBe(25);
    expect(s.unlockedDistricts).toEqual(["foundry"]);
  });
  it("scales cost by floor(base * 1.15^owned)", () => {
    expect(businessCost(15, 0)).toBe(15);
    expect(businessCost(15, 1)).toBe(17);
    expect(businessCost(50, 3)).toBe(76);
  });
  it("buying deducts cost and adds income", () => {
    const s = buyBusiness(initialState(), "workshop");
    expect(s.coins).toBe(10);
    expect(totalIncome(s)).toBe(1);
  });
  it("blocks unaffordable and locked purchases", () => {
    const s = initialState();
    expect(buyBusiness(s, "bakery")).toBe(s);
    expect(buyBusiness({ ...s, coins: 1e6 }, "factory").owned.factory).toBe(0);
  });
  it("upgrades apply once and multiply", () => {
    let s = { ...buyBusiness(initialState(), "workshop"), coins: 1000 };
    s = buyUpgrade(s, "precision-gears");
    expect(totalIncome(s)).toBe(2);
    expect(s.coins).toBe(925);
    expect(buyUpgrade(s, "precision-gears")).toBe(s);
  });
  it("unlocks districts at 500 and 3000 lifetime and never relocks", () => {
    let s = applyDistrictUnlocks(earn(initialState(), 500));
    expect(s.unlockedDistricts).toContain("industrial");
    s = applyDistrictUnlocks({ ...s, coins: 0 });
    expect(s.unlockedDistricts).toContain("industrial");
    s = applyDistrictUnlocks(earn(s, 2500));
    expect(s.unlockedDistricts).toContain("aetherport");
  });
  it("buying the Great Engine wins", () => {
    let s = applyDistrictUnlocks(earn(initialState(), 10000));
    s = buyBusiness(s, "engine");
    expect(applyObjectives(s).victory).toBe(false); // earlier objectives first
    s = applyObjectives({ ...s, owned: { ...s.owned, workshop: 1, factory: 1 } });
    expect(s.victory).toBe(true);
  });
});
