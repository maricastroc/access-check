export async function openPanelWindow(ctx, sw) {
  const url = `chrome-extension://${sw.url().split("/")[2]}/panel.html`;
  const [panel] = await Promise.all([
    ctx.waitForEvent("page"),
    sw.evaluate((at) => chrome.windows.create({ url: at, focused: false }), url),
  ]);
  await panel.waitForLoadState("domcontentloaded");
  return panel;
}
