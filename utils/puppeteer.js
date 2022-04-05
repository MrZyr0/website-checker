import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { URL } from "url";
import { formatDateToMaskedString } from "./date.js";

function formatUrlToFilename({ url, websiteDomain }) {
  const hasTrailingSlash = url.substr(url.length - 1);

  const sanitizedUrl = url
    .replace("http://", "")
    .replace("https://", "")
    .replace(`${websiteDomain}/`, "")
    .replaceAll("/", "■");

  if (sanitizedUrl === "") {
    return "index";
  }

  if (hasTrailingSlash) {
    return sanitizedUrl.slice(0, sanitizedUrl.length - 1);
  }

  return sanitizedUrl;
}
export async function takeScreenshots(...urls) {
  const now = formatDateToMaskedString({
    date: new Date(),
    mask: "YYYY-MM-DD_hhhmm",
  });

  const browser = await puppeteer.launch();
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({
    width: 320,
    height: 480,
  });
  const laptopPage = await browser.newPage();
  await laptopPage.setViewport({
    width: 1440,
    height: 900,
  });

  try {
    console.log(`[takeScreenshot] browser up and ready`);
    const { hostname: websiteDomain } = new URL("", urls[0]);
    const saveDirPath = `./data/${websiteDomain}/${now}`;

    mkdirSync(saveDirPath, { recursive: true });

    for (let index = 0; index < urls.length; index++) {
      const currentUrl = urls[index];
      const screenshotFilename = formatUrlToFilename({
        url: currentUrl,
        websiteDomain,
      });

      console.log(
        `[takeScreenshot] (${index + 1}/${
          urls.length
        }) processing url: ${currentUrl}`
      );

      await Promise.all([
        await mobilePage.goto(currentUrl, {
          timeout: 60000,
          waitUntil: "networkidle0",
        }),
        await laptopPage.goto(currentUrl, {
          timeout: 60000,
          waitUntil: "networkidle0",
        }),
      ]);

      await Promise.all([
        await mobilePage.screenshot({
          fullPage: true,
          path: `${saveDirPath}/${screenshotFilename}■mobile.png`,
        }),
        await laptopPage.screenshot({
          fullPage: true,
          path: `${saveDirPath}/${screenshotFilename}■laptop.png`,
        }),
      ]);
    }
  } catch (err) {
    console.log(err);
  } finally {
    await browser.close();
    console.log(`[takeScreenshot] browser stoped`);
    return { screenshotsDate: now };
  }
}
