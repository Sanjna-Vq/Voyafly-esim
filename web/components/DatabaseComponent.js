import sqlite3 from "sqlite3";
import { join } from "path";
import * as xlsx from "xlsx";
import { existsSync, mkdirSync, readFileSync } from "fs";
const dataFolderPath = join("../data");
// const excelFolderPath = join("../excelsheet");
const dbFilePath = join(dataFolderPath, "database.sqlite");
// const excelPath = join(excelFolderPath,"esim.xlsx");

if (!existsSync(dataFolderPath)) {
  mkdirSync(dataFolderPath);
}


var db1 = new sqlite3.Database(dbFilePath);
const dbFilePath1 = join("database.sqlite");
var db2 = new sqlite3.Database(dbFilePath1);

// export const readXlsxFile = async (filePath) => {
//   try {
//     // @ts-ignore
//     const fileData = readFileSync(filePath);
//     const workbook = xlsx.read(fileData, { type: "buffer" });
//     const worksheet = workbook.Sheets[workbook.SheetNames[0]];
//     return worksheet;
//   } catch (error) {
//     console.error("Error reading XLSX file:", error);
//   }
// };


// let worksheet = await readXlsxFile(excelPath);
// let rowValues;
// const range = xlsx.utils.decode_range(worksheet["!ref"]);
// range.s.r = 1;
// range.e.r;
// for (let row = range.s.r; row <= range.e.r; row++) {
//   console.log(row, ">>>>>>>>>>>>>>>>>>");
//   if (row) {
//     rowValues = xlsx.utils.sheet_to_json(worksheet);
//   }
// }

export async function createDatabase(req, res) {
  let status = 200;
  let error = null;
  let ESIM_ICCID, ESIM_URL, ESIM_STATUS;
  try {
    db1.serialize(function () {
      db1.run(
        "CREATE TABLE IF NOT EXISTS DATA_BUNDLES (DATA_BUNDLE_ID TEXT PRIMARY KEY , MERCHANT_PRICE TEXT )"
      );
      // ESIM_PRODUCT_DETAILS CREATION
      const sql2 =
        "CREATE TABLE IF NOT EXISTS ESIM_PRODUCT_DETAILS( ESIM_ICCDI TEXT PRIMARY KEY, CUSTOMER_EMAIL TEXT , DATA_BUNDLE_NAME TEXT , ESIM_STATUS TEXT, ESIM_URL TEXT, ORDER_ID TEXT ,ORDER_CREATE_TIME TEXT, MERCHANT_PRICE TEXT , COST_PRICE TEXT)";
      db1.run(sql2, function (err) {
        if (err) {
          console.error(
            "Error creating ESIM_PRODUCT_DETAILS table:",
            err.message
          );
        }else{
          console.log("ESIM_PRODUCT_DETAILS table gets created");
        }
      });
      db1.run(
        "CREATE TABLE IF NOT EXISTS PROCESSED_ORDERS (ORDER_ID TEXT PRIMARY KEY)"
      );

      // // insert into esim data table
      // for (let i = 0; i < rowValues.length; i++) {
      //   rowValues.forEach((element) => {
      //     ESIM_ICCID = element.ICCID;
      //     ESIM_URL = element.ESIM_URL;
      //     ESIM_STATUS = "UNUSED";
      //     db1.serialize(function () {
      //       // ESIM_PRODUCT_DETAILS
      //       const sql3 = `INSERT INTO ESIM_PRODUCT_DETAILS(ESIM_ICCDI,ESIM_URL,ESIM_STATUS) VALUES(?,?,?)`;
      //       db1.run(sql3, [ESIM_ICCID, ESIM_URL, ESIM_STATUS], function (err) {
      //         if (err) {
      //           status = 500;
      //         } else {
      //           status = 200;
      //         }
      //       });
      //     });
      //   });
      // }
    });
  } catch (error) {}
}

export async function getEsimDataDb(_req, res) {
  let query;
  let data;
  var params = [];
  query = "SELECT * FROM ESIM_PRODUCT_DETAILS";
  try {
    function getAllData(query, params) {
      return new Promise((resolve, reject) => {
        db1.all(query, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }
    data = await getAllData(query, params);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getEsimDataPagination(startIndex, endIndex) {
  let query;
  let data;
  let params = [];

  // Define your SQL query with pagination
  query = "SELECT * FROM ESIM_PRODUCT_DETAILS LIMIT ? OFFSET ?";
  params = [endIndex - startIndex, startIndex];

  function getDataWithPagination(query, params) {
    return new Promise((resolve, reject) => {
      db1.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  data = await getDataWithPagination(query, params);
  return data;
}

export async function getStatusData(_req, res) {
  let query;
  let data;
  var params = [];
try{
  query =
  "SELECT ESIM_STATUS FROM ESIM_PRODUCT_DETAILS WHERE ESIM_STATUS = 'UNUSED' ";
function getAllData(query, params) {
  return new Promise((resolve, reject) => {
    db1.all(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}
data = await getAllData(query, params);
return data;
}catch(e){
  console.log(e)
}
}

export async function getOrderData(order_id) {
  let query;
  let data;
  var params = [order_id];
  query = "SELECT ESIM_ICCDI, ESIM_URL, DATA_BUNDLE_NAME FROM ESIM_PRODUCT_DETAILS WHERE ORDER_ID = ?";
  function getAllData(query, params) {
    return new Promise((resolve, reject) => {
      db1.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  data = await getAllData(query, params);
  return data;
}


export async function getDataBundleMerchantPrice(
  DATA_BUNDLE_ID_FOR_MERCHANT_PRICE
) {
  let query;
  let data;
  var params = [];
  query = "SELECT MERCHANT_PRICE FROM DATA_BUNDLES WHERE DATA_BUNDLE_ID = ?";
  params = [DATA_BUNDLE_ID_FOR_MERCHANT_PRICE];
  function getAllData(query, params) {
    return new Promise((resolve, reject) => {
      db1.all(query, params, (err, rows) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  data = await getAllData(query, params);
  return data;
}

export async function getDB() {
  var params = [];
  let shop ="voyatix-testing.myshopify.com";
  // let shop = "2bf4ff-3.myshopify.com";
  let query = "SELECT * FROM shopify_sessions WHERE shop = ?";
  params = [shop];
  function getAllData(query, params) {
    return new Promise((resolve, reject) => {
      db2.all(query, params, (err, rows) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  const data = await getAllData(query, params);
  if (data.length > 0) {
    const session = {
      shop: data[0].shop,
      accessToken: data[0].accessToken,
    };
    return session;
  }
}
