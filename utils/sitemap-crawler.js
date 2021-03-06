import { get } from "lodash-es";
import xml2js from "xml2js";

const userAgent = "Mozilla/5.0 (compatible; Webcheckerbot/0.1)";

function parseXml(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) {
        return reject(err);
      }

      resolve(result);
    });
  });
}

function getAllUrlFromJsonSitemap(sitemap) {
  if (!sitemap) return undefined;
  return sitemap.flatMap((entry) => entry.loc);
}

export async function sitemapCrawler(sitemapUrl) {
  const res = await fetch(sitemapUrl, {
    headers: {
      userAgent,
    },
    method: "GET",
  });

  const body = await res.text();

  const parsedXml = await parseXml(body);

  const sitemap = get(
    parsedXml,
    "urlset.url",
    get(parsedXml, "sitemapindex.sitemap")
  );

  const sitemapUrls = getAllUrlFromJsonSitemap(sitemap);

  if (!sitemapUrls) {
    return undefined;
  }

  const otherSitemaps = sitemapUrls.filter((url) => url.includes("sitemap"));

  if (!otherSitemaps) {
    return sitemapUrls;
  }

  const otherSitemapsCrawlers = otherSitemaps.map((sitemapUrl) =>
    sitemapCrawler(sitemapUrl)
  );

  const otherSitemapsUrls = await Promise.all(otherSitemapsCrawlers);

  const allSiteUrls = [
    sitemapUrls.filter((url) => !url.includes("sitemap")),
    otherSitemapsUrls,
  ];

  return allSiteUrls.flat(1000);
}
