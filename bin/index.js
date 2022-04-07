import { program } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { takeScreenshots } from "../utils/puppeteer.js";
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
  .command("snap-page")
  .description("Save current page rendering")
  .argument("<url>", "url to save its rendering")
  .action(async (url, options) => {
    await takeScreenshots(url);
    console.log("Rendering saved ✅");
  });

program
  .command("snap")
  .description("Save current site rendering")
  .argument("<sitemapUrl>", "website sitemap url")
  .action(async (sitemapUrl, options) => {
    const siteUrls = await sitemapCrawler(sitemapUrl);

    await takeScreenshots(...siteUrls);
    console.log("Rendering saved ✅");
  });

program
  .command("compare-page")
  .description("Compare current page rendering with previous saved one")
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
  .command("export-sitemap-urls")
  .description("Save current sitemap")
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
    await checkRessourceLoading(url);
  });

program.parse();

// TODO: Create and compare check bad ressource loading (other than 2XX) using reports
