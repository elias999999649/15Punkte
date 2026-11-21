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
  await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
  await page.getByRole("button", { name: /Dunkel/ }).click();
  const dark = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: /Sepia/ }).click();
  const sepia = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: "Fächer 6" }).click();
  const physics = await page.getByText("Physik", { exact: true }).count();
  const mathRow = page.locator(".grades-table tbody tr").filter({ hasText: "Mathematik" });
  const math = await mathRow.locator(".grade-cell-button").getAttribute("aria-label");
  const mathNote = await mathRow.locator(".history-grade").first().innerText();
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("15punkte-subjects") ?? "[]").length,
  );
  if (dark !== "dark" || sepia !== "sepia" || physics !== 1 || mathNote !== "15" || stored !== 6 || errors.length) {
    throw new Error(JSON.stringify({ dark, sepia, physics, math, mathNote, stored, errors }));
  }
  return { dark, sepia, physics, math, mathNote, stored, errors };
}
