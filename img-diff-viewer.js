import express from "express";
import cors from "cors";
import { readdirSync, readFileSync } from "fs";
import path from "path";

const app = express();
app.use(cors());

app.use(express.static(path.resolve("./data/www.vecteur-air.com/")));

app.get("/report", function (req, res) {
  const snapDates = readFileSync(
    "./data/www.vecteur-air.com/2#aws/#diff-report.json",
    {
      encoding: "utf-8",
      flag: "r",
    }
  );

  res.json(JSON.parse(snapDates));
});

const server = app.listen(8081, function () {
  const host = server.address().address;
  const port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port);
});
