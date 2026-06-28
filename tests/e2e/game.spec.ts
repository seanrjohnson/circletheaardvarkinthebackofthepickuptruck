import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("draws a lasso on the title screen", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas was not rendered");
  const point = (x: number, y: number): [number, number] => [
    box.x + box.width * (x / 640),
    box.y + box.height * (y / 480),
  ];
  await page.mouse.move(...point(400, 200));
  const before = await canvas.screenshot();
  await page.mouse.down();
  await page.mouse.move(...point(450, 200), { steps: 10 });
  await page.mouse.move(...point(450, 250), { steps: 10 });
  await page.mouse.move(...point(400, 250), { steps: 10 });
  await page.mouse.move(...point(400, 200), { steps: 10 });
  await page.mouse.up();
  const after = await canvas.screenshot();
  expect(after.equals(before)).toBe(false);
});

test("opens the title and starts a round", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("width", "640");
  await expect(canvas).toHaveAttribute("height", "480");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas was not rendered");
  await page.mouse.click(box.x + box.width * 0.09, box.y + box.height * 0.94);
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.8);
  await page.keyboard.press("p");
  await page.keyboard.press("p");
  await expect(canvas).toBeVisible();
});

test("loads a local leaderboard without a server", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "circle-aardvark.highScores.v1",
      JSON.stringify([{ name: "AARDVARK", level: 3, score: 900, timestamp: 1 }]),
    );
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas was not rendered");
  await page.mouse.click(box.x + box.width * 0.29, box.y + box.height * 0.94);
  await expect(canvas).toBeVisible();
});
