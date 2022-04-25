import { readdirSync, readFileSync } from "fs";
import { imgDiff } from "img-diff-js";
import { last, xor, without } from "lodash-es";

function getExtension(path) {
  let baseName = path.split(/[\\/]/).pop(), // extracts file name from full path
    // (supports separators `\\` and `/`)
    pos = baseName.lastIndexOf("."); // gets the last position of `.`
  if (baseName === "" || pos < 1)
    // if the file name is empty or ...
    return ""; // the dot not found (-1) or comes first (0)
  return baseName.slice(pos + 1); // extracts extension ignoring "."
}

function isFileExist(path) {
  return new Promise((resolve) => {
    try {
      const fileBuffer = readFileSync(path, {
        flag: "r",
      });

      if (!fileBuffer) {
        resolve(false);
      }

      resolve(true);
    } catch (err) {
      resolve(false);
    }
  });
}

export async function checkScreenshotSimilarity({
  fromScreenshotsPath,
  toScreenshotsPath,
}) {
  return new Promise(async (resolve) => {
    console.log("[checkScreenshotSimilarity] start comparison");
    const expectedScreenshotFiles = readdirSync(fromScreenshotsPath).filter(
      (screenshot) => {
        if (screenshot.includes("-diff-with-")) {
          return false;
        }

        if (
          !["png", "jpg", "jpeg", "tiff"].includes(getExtension(screenshot))
        ) {
          return false;
        }

        return true;
      }
    );
    const actualScreenshotFiles = readdirSync(toScreenshotsPath).filter(
      (screenshot) => {
        if (screenshot.includes("-diff-with-")) {
          return false;
        }

        if (
          !["png", "jpg", "jpeg", "tiff"].includes(getExtension(screenshot))
        ) {
          return false;
        }

        return true;
      }
    );

    const missingScreenshots = xor(
      expectedScreenshotFiles,
      actualScreenshotFiles
    );

    if (missingScreenshots.length > 0) {
      // const allFilesStringified = `${expectedScreenshotFiles.toString()},${actualScreenshotFiles.toString()}`
      // const remeaningFilesFromExpectedScreenshots = expectedScreenshotFiles.reduce((prevFile, currentFile) => {
      //   return prevFile.replace(currentFile, '');
      // }, allFilesStringified)
      console.log("Folders does not includes sames page screenshots.");

      console.log({ missingScreenshots });
      // throw new Error("Folders does not includes sames page screenshots.");
    }

    let similarityReport = [];
    let notReadablefiles = [];

    const expectedScreenshotFilesFiltered = without(
      expectedScreenshotFiles,
      ...missingScreenshots
    );

    for (
      let index = 0;
      index < expectedScreenshotFilesFiltered.length;
      index++
    ) {
      const expectedScreenshotName = expectedScreenshotFiles[index];

      console.log(
        `[checkScreenshotSimilarity] (${index + 1}/${
          expectedScreenshotFiles.length
        }) comparing picture : ${expectedScreenshotName}`
      );

      if (
        !(await isFileExist(`${toScreenshotsPath}/${expectedScreenshotName}`))
      ) {
        notReadablefiles.push(`${toScreenshotsPath}/${expectedScreenshotName}`);
        continue;
      }

      if (
        !(await isFileExist(`${fromScreenshotsPath}/${expectedScreenshotName}`))
      ) {
        notReadablefiles.push(
          `${fromScreenshotsPath}/${expectedScreenshotName}`
        );
        continue;
      }

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

    resolve({ similarityReport, notReadablefiles });
  });
}
