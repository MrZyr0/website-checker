import { uniq } from "lodash-es";
import puppeteer from "puppeteer";
import { mkdirSync, writeFileSync } from "fs";
import { URL } from "url";
import { formatDateToMaskedString } from "./date.js";

const userAgent = "Mozilla/5.0 (compatible; Webcheckerbot/0.1)";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Only if --ssl-insecure option used

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

  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: ["---ignore-certificate-errors"], // TODO: If --ssl-insecure option used
  });
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
  // TODO: add more optionnal sizes

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

      try {
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

        // TODO: add script to check script all finish to run

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
      } catch (err) {
        console.log(
          `[checkRessourceLoading - FAIL]] taking screenshot for url ${currentUrl}`
        );
        console.log({ err });
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    await browser.close();
    console.log(`[takeScreenshot] browser stoped`);
    return { screenshotsDate: now };
  }
}

export async function checkRessourceLoading(...urls) {
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: ["---ignore-certificate-errors"], // TODO: If --ssl-insecure option used
  });
  const page = await browser.newPage();

  const reqErrors = [];

  function logRequest(interceptedRequest) {
    if (!interceptedRequest.response()) {
      console.log(
        "A request was made on:",
        interceptedRequest.url(),
        " error: ",
        interceptedRequest._failureText
      );
      return;
    }

    if (interceptedRequest.response().status() < 399) {
      return;
    }

    console.log(
      "A request was made:",
      interceptedRequest.url(),
      " status: ",
      interceptedRequest.response().status()
    );

    reqErrors.push(interceptedRequest.url());
  }
  page.on("requestfinished", logRequest);
  page.on("requestfailed", logRequest);

  try {
    console.log(`[checkRessourceLoading] browser up and ready`);

    for (let index = 0; index < urls.length; index++) {
      const currentUrl = urls[index];

      console.log(
        `[checkRessourceLoading] (${index + 1}/${
          urls.length
        }) processing url: ${currentUrl}`
      );

      try {
        await page.goto(currentUrl, {
          timeout: 60000,
          waitUntil: "networkidle0",
        });

        const { origin: websiteOrigin } = new URL("", currentUrl);
        const html = await page.content();
        const urlRegex =
          /("https:?:\/\/(?:www\.)?[\w\d\.\-_\/]+\/[\w\d\.\-\/]+\.\w{1,5}\\?")/gm;
        const regexMatches = html.match(urlRegex);

        if (!regexMatches) {
          continue;
        }

        const result = regexMatches.map((match) => match.replaceAll('"', ""));

        for (let index = 0; index < result.length; index++) {
          const url = result[index];

          if (url.startsWith("data:image/")) {
            continue;
          }

          if (!url.startsWith(websiteOrigin)) {
            continue;
          }

          const res = await fetch(url, {
            method: "GET",
          });

          if (res.status < 399) {
            continue;
          }

          reqErrors.push(url);
        }

        // TODO: add script to check script all finish to run
      } catch (err) {
        console.log({ err });
      }
    }
  } catch (err) {
    if (err.message.includes("net::")) {
      return;
    }
    console.log(err.stack);
  } finally {
    page.off("requestfinished", logRequest);
    page.off("requestfailed", logRequest);
    await browser.close();
    console.log(`[checkRessourceLoading] browser stoped`);

    if (reqErrors.length) {
      const allReqErrorsUniq = uniq(reqErrors);
      return allReqErrorsUniq;
    }

    return [];
  }
}

export async function listAllMedias(...urls) {
  const { origin: websiteOrigin } = new URL("", currentUrl);
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: ["---ignore-certificate-errors"],
  });
  const page = await browser.newPage();

  function logRequest(interceptedRequest) {
    const reqType = interceptedRequest.resourceType();
    const reqUrl = interceptedRequest.url();

    if (
      !["image", "png", "jpg", "jpeg", "gif", "pdf", "document"].includes(
        reqType
      ) &&
      ![".png", ".jpg", ".jpeg", ".gif", ".pdf", ".webp", ".webm"].includes(
        reqUrl
      )
    ) {
      return;
    }

    if (reqUrl.startsWith("data:image/")) {
      return;
    }

    if (!reqUrl.startsWith(websiteOrigin)) {
      return;
    }
    // TODO: early return if url does not begin with site domain
    // TODO: Same for base64 data (begin with data:image/)

    console.log(`Loading ressource: (${reqType}) ${interceptedRequest.url()}`);
  }
  page.on("requestfinished", logRequest);
  page.on("requestfailed", logRequest);

  try {
    console.log(`[listAllMedias] browser up and ready`);

    for (let index = 0; index < urls.length; index++) {
      const currentUrl = urls[index];

      console.log(
        `[listAllMedias] (${index + 1}/${
          urls.length
        }) processing url: ${currentUrl}`
      );

      await page.goto(currentUrl, {
        timeout: 60000,
        waitUntil: "networkidle0",
      });

      const html = await page.content();
      const urlRegex =
        /("https:?:\/\/(?:www\.)?[\w\d\.\-_\/]+\/[\w\d\.\-\/]+\.\w{1,5}\\?")/gm;
      const result = html
        .match(urlRegex)
        .map((match) => match.replaceAll('"', ""));

      result.forEach((url) => {
        if (url.startsWith("data:image/")) {
          return;
        }

        if (!url.startsWith(websiteOrigin)) {
          return;
        }

        console.log(`Need ressource: ${url}`);
      });

      // TODO: add script to check script all finish to run
    }
  } catch (err) {
    if (err.message.includes("net::")) {
      return;
    }
    console.log(err.stack);
  } finally {
    page.off("requestfinished", logRequest);
    page.off("requestfailed", logRequest);
    await browser.close();
    console.log(`[listAllMedias] browser stoped`);
  }
}
