import sqlite3 from "sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { getEsimDataDb } from "./DatabaseComponent.js";

const dataFolderPath = join("../data");
const dbFilePath = join(dataFolderPath, "database.sqlite");
if (!existsSync(dataFolderPath)) {
  mkdirSync(dataFolderPath);
}

var db1 = new sqlite3.Database(dbFilePath);

// excel
export const excelData = async (req, res) => {
  let DbData;
  let data = req.body.parsedData;
  let status = 200;
  let error = null;
  let ESIM_ICCID, ESIM_URL;
  const ESIM_STATUS = "UNUSED";
  const duplicateIccids = [];

  try {
    if (data) {
      DbData = await getEsimDataDb();
      for (const element of data) {
        ESIM_ICCID = element.ICCID;
        ESIM_URL = element.ESIM_URL;
        if (DbData.length >=0) {
          let matchingData = DbData.find((duplicateIccid) => {
            return duplicateIccid.ESIM_ICCDI == ESIM_ICCID;
          });
          if (matchingData) {
            duplicateIccids.push(ESIM_ICCID);
          } else {
            await new Promise((resolve, reject) => {
              db1.serialize(() => {
                const sql3 = `INSERT INTO ESIM_PRODUCT_DETAILS(ESIM_ICCDI,ESIM_URL,ESIM_STATUS) VALUES(?,?,?)`;
                db1.run(sql3, [ESIM_ICCID, ESIM_URL, ESIM_STATUS], function (err) {
                  if (err) {
                    console.log(`Failed to insert data: ${err.message}`);
                    reject(err);
                  } else {
                    console.log(`Inserted data: ${ESIM_ICCID}`);
                    resolve();
                  }
                });
              });
            });
          }
        }
      }
    }
    res.status(status).send({ success: status === 200, data: duplicateIccids });
  } catch (error) {
    console.error("Error:", error);
    res.status(status).send({ success: status === 500, message: "Server Error" });
  }
};
