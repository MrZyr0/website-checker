import { readdirSync } from "fs";
import { imgDiff } from "img-diff-js";
import { last } from "lodash-es";

export async function checkScreenshotSimilarity({
  fromScreenshotsPath,
  toScreenshotsPath,
}) {
  return new Promise(async (resolve) => {
    console.log("[checkScreenshotSimilarity] start comparison");
    const expectedScreenshotFiles = readdirSync(fromScreenshotsPath);
    const actualScreenshotFiles = readdirSync(toScreenshotsPath);

    if (
      expectedScreenshotFiles.toString() !== actualScreenshotFiles.toString()
    ) {
      throw new Error("Folders does not includes sames page screenshots.");
    }

    let similarityReport = [];

    for (let index = 0; index < expectedScreenshotFiles.length; index++) {
      console.log(
        `[checkScreenshotSimilarity] (${index + 1}/${
          expectedScreenshotFiles.length
        }) comparing picture : ${toScreenshotsPath}`
      );

      const expectedScreenshotName = expectedScreenshotFiles[index];

      const { imagesAreSame, diffCount } = await imgDiff({
        actualFilename: `${toScreenshotsPath}/${expectedScreenshotName}`,
        expectedFilename: `${fromScreenshotsPath}/${expectedScreenshotName}`,
        diffFilename: `${toScreenshotsPath}/${expectedScreenshotName.replace(
          ".png",
          ""
        )}-diff-with-${last(fromScreenshotsPath.split("/"))}.png`,
      });

      if (!imagesAreSame) {
        similarityReport.push({
          screenshotName: expectedScreenshotName,
          diffCount,
        });
      }
    }

    resolve({ similarityReport });
  });
}
