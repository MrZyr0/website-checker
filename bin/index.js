import { program } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import {
  checkRessourceLoading,
  listAllMedias,
  takeScreenshots,
} from "../utils/puppeteer.js";
import { checkScreenshotSimilarity } from "../utils/img-diff.js";
import { readdirSync } from "fs";
import { sitemapCrawler } from "../utils/sitemap-crawler.js";
import { writeFileSync, mkdirSync } from "fs";
import { formatDateToMaskedString } from "../utils/date.js";

program
  .name("website-checker")
  .description("CLI to compare website rendering")
  .version("0.1.0");

program
  .command("test")
  .option(
    "--ignore-certificate-errors",
    "ignore SSL certificate validation error for the website",
    false
  )
  .argument("<url>", "url to save its rendering")
  .action((data, options) => {
    console.log({ data, options });
  });

program
  .command("snap-page")
  .description("Save current page rendering")
  .option(
    "--ignore-certificate-errors",
    "ignore SSL certificate validation error for the website",
    false
  )
  .argument("<url>", "url to save its rendering")
  .action(async (url, options) => {
    await takeScreenshots(
      url
      // {
      // urls: [url],
      // options: {
      //   browserArgs: ["---ignore-certificate-errors"],
      // },
      // }
    );
    console.log("Rendering saved ✅");
  });

program
  .command("snap")
  .description("Save current site rendering")
  .option(
    "--ignore-certificate-errors",
    "allow any SSL certificate for the website",
    false
  )
  .argument("<sitemapUrl>", "website sitemap url")
  .action(async (sitemapUrl, options) => {
    const siteUrls = await sitemapCrawler(sitemapUrl);

    await takeScreenshots(...siteUrls);
    console.log("Rendering saved ✅");
  });

program
  .command("compare-page")
  .description("Compare current page rendering with previous saved one")
  .option(
    "--ignore-certificate-errors",
    "allow any SSL certificate for the website",
    false
  )
  .argument("<url>", "url to compare its rendering")
  .action(async (url, options) => {
    const { hostname: websiteDomain } = new URL("", url);

    const websitePath = `./data/${websiteDomain}`;
    const snapDates = readdirSync(websitePath);

    const { dateToCompareTo } = await inquirer.prompt({
      type: "list",
      name: "dateToCompareTo",
      message: "to which previous snapshot you want to compare ?",
      choices: snapDates,
    });

    const { screenshotsDate } = await takeScreenshots(url);

    const { similarityReport } = await checkScreenshotSimilarity({
      fromScreenshotsPath: `${websitePath}/${dateToCompareTo}`,
      toScreenshotsPath: `${websitePath}/${screenshotsDate}`,
    });

    console.log("Rendering saved ✅");
    if (similarityReport.length === 0) {
      console.log("All redering are the same, well done 👌");
      return;
    }
    console.log("Differences found :");
    console.log(similarityReport);
  });

program
  .command("compare")
  .description("Compare site current rendering with previous saved one")
  .option(
    "--ignore-certificate-errors",
    "allow any SSL certificate for the website",
    false
  )
  .argument("<sitemapUrl>", "website sitemap url")
  .action(async (sitemapUrl, options) => {
    const { hostname: websiteDomain } = new URL("", sitemapUrl);

    const websitePath = `./data/${websiteDomain}`;
    const snapDates = readdirSync(websitePath);

    const { dateToCompareTo } = await inquirer.prompt({
      type: "list",
      name: "dateToCompareTo",
      message: "to which previous snapshot you want to compare ?",
      choices: snapDates,
    });

    const siteUrls = await sitemapCrawler(sitemapUrl);
    const { screenshotsDate } = await takeScreenshots(...siteUrls);
    console.log("Rendering saved ✅");

    const { similarityReport } = await checkScreenshotSimilarity({
      fromScreenshotsPath: `${websitePath}/${dateToCompareTo}`,
      toScreenshotsPath: `${websitePath}/${screenshotsDate}`,
    });

    if (similarityReport.length === 0) {
      console.log("All redering are the same, well done 👌");
      return;
    }
    console.log("Differences found :");

    writeFileSync(
      `${websitePath}/${dateToCompareTo}/#diff-report.json`,
      JSON.stringify(similarityReport)
    );
    console.log(`${websitePath}/${dateToCompareTo}/#diff-report.json`);
  });

program
  .command("compare-screenshots")
  .description("Compare site current rendering with previous saved one")
  .option(
    "--ignore-certificate-errors",
    "allow any SSL certificate for the website",
    false
  )
  .argument("<siteUrl>", "website url")
  .action(async (siteUrl, options) => {
    const { hostname: websiteDomain } = new URL("", siteUrl);

    const websitePath = `./data/${websiteDomain}`;
    const snapDates = readdirSync(websitePath);

    const { dateToCompareFrom } = await inquirer.prompt({
      type: "list",
      name: "dateToCompareFrom",
      message: "to which previous snapshot you want to compare from ?",
      choices: snapDates,
    });

    const { dateToCompareTo } = await inquirer.prompt({
      type: "list",
      name: "dateToCompareTo",
      message: "to which previous snapshot you want to compare to ?",
      choices: snapDates,
    });

    const { similarityReport, notReadablefiles } =
      await checkScreenshotSimilarity({
        fromScreenshotsPath: `${websitePath}/${dateToCompareFrom}`,
        toScreenshotsPath: `${websitePath}/${dateToCompareTo}`,
      });

    console.log("Differences found :");

    writeFileSync(
      `${websitePath}/${dateToCompareTo}/#diff-report.json`,
      JSON.stringify([
        ...similarityReport,
        { notReadablefiles: notReadablefiles },
      ])
    );
    console.log(`${websitePath}/${dateToCompareTo}/#diff-report.json`);
  });

program
  .command("export-sitemap-urls")
  .description("Save current sitemap")
  .option(
    "--ignore-certificate-errors",
    "allow any SSL certificate for the website",
    false
  )
  .argument("<sitemapUrl>", "website sitemap url")
  .action(async (sitemapUrl) => {
    const now = formatDateToMaskedString({
      date: new Date(),
      mask: "YYYY-MM-DD_hhhmm",
    });
    const siteUrls = await sitemapCrawler(sitemapUrl);
    const { hostname: websiteDomain } = new URL("", siteUrls[0]);
    const saveDirPath = `./data/${websiteDomain}/${now}`;
    mkdirSync(saveDirPath, { recursive: true });
    writeFileSync(`${saveDirPath}/site-urls.json`, JSON.stringify(siteUrls));
  });

program
  .command("check-page-ressources-loading")
  .description("Check all request status for a page")
  .option(
    "--ignore-certificate-errors",
    "allow any SSL certificate for the website",
    false
  )
  .argument("<url>", "url to check")
  .action(async (url) => {
    const now = formatDateToMaskedString({
      date: new Date(),
      mask: "YYYY-MM-DD_hhhmm",
    });
    const reqErrors = await checkRessourceLoading(url);

    const { hostname: websiteDomain } = new URL("", url);
    const saveDirPath = `./data/${websiteDomain}/${now}`;
    mkdirSync(saveDirPath, { recursive: true });
    writeFileSync(
      `${saveDirPath}/ressources-failed-to-load-report.json`,
      JSON.stringify(reqErrors)
    );
  });

program
  .command("check-site-ressources-loading")
  .description("Check all request status of all page of a sitemap")
  .option(
    "--ignore-certificate-errors",
    "allow any SSL certificate for the website",
    false
  )
  .argument("<sitemapUrl>", "website sitemap url")
  .action(async (sitemapUrl) => {
    const now = formatDateToMaskedString({
      date: new Date(),
      mask: "YYYY-MM-DD_hhhmm",
    });
    const siteUrls = await sitemapCrawler(sitemapUrl);
    const reqErrors = await checkRessourceLoading(...siteUrls);

    const { hostname: websiteDomain } = new URL("", siteUrls[0]);
    const saveDirPath = `./data/${websiteDomain}/${now}`;
    mkdirSync(saveDirPath, { recursive: true });
    writeFileSync(
      `${saveDirPath}/ressources-failed-to-load-report.json`,
      JSON.stringify(reqErrors)
    );
  });

program
  .command("list-page-medias")
  .description("List all media loaded on a page")
  .option(
    "--ignore-certificate-errors",
    "allow any SSL certificate for the website",
    false
  )
  .argument("<url>", "page url")
  .action(async (url) => {
    await listAllMedias(url);
  });

program
  .command("list-site-medias")
  .description("List all media used by the entire site")
  .option(
    "--ignore-certificate-errors",
    "allow any SSL certificate for the website",
    false
  )
  .argument("<sitemapUrl>", "website sitemap uUrl")
  .action(async (sitemapUrl) => {
    const siteUrls = await sitemapCrawler(sitemapUrl);
    await listAllMedias(...siteUrls);
  });

program.parse();
