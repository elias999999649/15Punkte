export default async function run(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Note eintragen" }).first().click();
  await page.getByLabel("Fachname").fill("Physik");
  await page.getByRole("button", { name: "Fach hinzufügen" }).last().click();
  await page
    .getByRole("button", { name: "Note für Mathematik bearbeiten" })
    .click();
  await page.getByLabel("Punkte im aktuellen Halbjahr").selectOption("15");
  await page.getByRole("button", { name: "Note speichern" }).click();
  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByRole("button", { name: /Dunkel/ }).click();
  const dark = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: /Sepia/ }).click();
  const sepia = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: "Fächer 6" }).click();
  const physics = await page.getByText("Physik", { exact: true }).count();
  const math = await page
    .locator(".grades-table tbody tr")
    .filter({ hasText: "Mathematik" })
    .locator(".score-pill")
    .innerText();
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("15punkte-subjects") ?? "[]").length,
  );
  return { dark, sepia, physics, math, stored, errors };
}
