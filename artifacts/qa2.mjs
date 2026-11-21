export default async function run(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Alle Fächer" }).click();
  const search = page.getByPlaceholder("Fach suchen");
  await search.fill("Engl");
  const filtered = await page.locator(".full-table tbody tr").count();
  await search.fill("Gibt es nicht");
  const empty = await page
    .getByText("Kein Fach mit diesem Namen gefunden.")
    .count();
  await page.getByRole("button", { name: "Abitur", exact: true }).click();
  const abi = await page.getByRole("heading", { name: /Dein Weg zum/ }).count();
  await page
    .getByRole("button", { name: "Einstellungen", exact: true })
    .click();
  await page.getByRole("button", { name: /Hell/ }).click();
  const theme = await page.locator("html").getAttribute("data-theme");
  const external = await page.evaluate(() =>
    [...document.querySelectorAll("link,script")]
      .map((node) => node.src || node.href)
      .filter(
        (url) => url && url.startsWith("http") && !url.includes(location.host),
      ),
  );
  if (
    filtered !== 1 ||
    empty !== 1 ||
    abi !== 1 ||
    theme !== "light" ||
    external.length ||
    errors.length
  )
    throw new Error(
      JSON.stringify({ filtered, empty, abi, theme, external, errors }),
    );
  return { filtered, empty, abi, theme, external, errors };
}
