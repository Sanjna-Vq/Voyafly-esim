import axios from "axios";
import sqlite3 from "sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import crypto from "crypto";
import { generateQRCodeWithLogo } from "./WebhookContoller.js";
import {
  getDataBundleMerchantPrice,
  getEsimDataDb,
} from "./DatabaseComponent.js";
import path from "path";
import https from "https";
import rootCas from "ssl-root-cas";
import { fileURLToPath } from "url";
import { sendApiFailedMailToClientWithRetry } from "./apiFailedEmailNotificationComponent.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
rootCas.create();
rootCas.addFile(path.resolve(__dirname, "intermediate.pem"));
https.globalAgent.options.ca = rootCas;
const dataFolderPath = join("../data");
const dbFilePath = join(dataFolderPath, "database.sqlite");
let accessTokenResponse;
// const appKey = "210ccb0167e441ba9920014ce396de0c";
const appKey = "7c03bfc12f3a43ad8c8fa2be55196ae9";
const secret = "abbef767412d463ab8194a0da338a896";

if (!existsSync(dataFolderPath)) {
  mkdirSync(dataFolderPath);
}
var db1 = new sqlite3.Database(dbFilePath);

function getPasswordDigest(nonce, created, password) {
  const sha256 = crypto.createHash("sha256");
  const sha256Hex = sha256
    .update(nonce + created + password, "utf8")
    .digest("hex");
  return Buffer.from(sha256Hex, "hex").toString("base64");
}

function getRandomNonce() {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

function getCreatedTimestamp() {
  const created = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  return created;
}

async function getAccessToken() {
  const type = "106";
  const requestData = {
    id: appKey,
    type: type,
  };
  const nonce = getRandomNonce();
  const created = getCreatedTimestamp();
  const passwordDigest = getPasswordDigest(nonce, created, secret);
  try {
    // Host: "aep.sdp.com",
    // "http://119.8.233.55:31013/aep/APP_getAccessToken_SBO/v1",

    // Host: "gdschannel.cmlink.com",
    // "https://gdschannel.cmlink.com:39043/aep/APP_getAccessToken_SBO/v1"

    const response = await axios.post(
      "https://gdschannel.cmlink.com:39043/aep/APP_getAccessToken_SBO/v1",
      requestData,
      {
        headers: {
          Host: "gdschannel.cmlink.com",
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization:
            'WSSE realm="SDP", profile="UsernameToken", type="Appkey"',
          "X-WSSE": `UsernameToken Username="${appKey}", PasswordDigest="${passwordDigest}", Nonce="${nonce}", Created="${created}"`,
        },
      }
    );
    if (response.data.code == "0000000") {
      accessTokenResponse = response.data.accessToken;
      return { accessTokenResponse };
    } else {
      const error = response.data.description;
      return { error };
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export async function getAllEsimData(matchedValue) {
  let responseData = [];
  let responseData1;
  let beginIndex = 0;
  let isEmptyResponse = false;
  while (!isEmptyResponse) {
    responseData1 = await getEsimData(matchedValue, beginIndex); // Pass beginIndex
    if (responseData1) {
      console.log(
        ">>>>>>>>>>",
        responseData1.length,
        matchedValue,
        beginIndex,
        ">>>>>>>>>>>>>>>>>>>>>>>>>"
      );
      if (responseData1.length < 50) {
        isEmptyResponse = true;
      } else {
        beginIndex += 1;
      }
      responseData.push(...responseData1);
    }
  }
  return responseData;
}

export async function getEsimData(matchedValue, beginIndex) {
  const nonce = getRandomNonce();
  const created = getCreatedTimestamp();
  const passwordDigest = getPasswordDigest(nonce, created, secret);
  const accessToken = await getAccessToken();
  let apiRequests;
  if (accessToken.accessTokenResponse) {
    const requestData = {
      accessToken: accessToken.accessTokenResponse,
      country: "US",
      mcc: matchedValue,
      beginIndex: beginIndex.toString(),
      cooperationMode: "1",
    };
    const response = await axios.post(
      "https://gdschannel.cmlink.com:39043/aep/app_getDataBundle_SBO/v1",
      requestData,
      {
        headers: {
          Host: "gdschannel.cmlink.com",
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization:
            'WSSE realm="SDP", profile="UsernameToken", type="Appkey"',
          "X-WSSE": `UsernameToken Username="${appKey}", PasswordDigest="${passwordDigest}", Nonce="${nonce}", Created="${created}"`,
        },
      }
    );

    if (response.data.dataBundles) {
      apiRequests = response.data.dataBundles;
      return apiRequests;
    }
  } else {
    return;
  }
}

// api/webhook component
export async function orderCreate(req, res) {
  try {
    if (req.body) {
      const orderNumber = req.body.order_number;
      db1.get(
        "SELECT * FROM PROCESSED_ORDERS WHERE ORDER_ID = ?",
        [orderNumber],
        async (err, row) => {
          if (!row) {
            const esimData = await getEsimDataDb();
            const nonce = getRandomNonce();
            const created = getCreatedTimestamp();
            const passwordDigest = getPasswordDigest(nonce, created, secret);
            const bundle_name = [];
            const quantity = [];
            const price = [];
            const sku = [];
            let finalFormattedTime;
            req.body.line_items.forEach((row) => {
              console.log(row, ">>>>>>>>>>>>>..row>>>>>>>>>>>>");
              bundle_name.push(row.name);
              quantity.push(row.quantity);
              price.push(row.price);
              sku.push(row.sku);
            });
            const customermail = req.body.customer.email;
            const orderID = req.body.order_number;
            const orderCreatedAt = req.body.created_at;
            const expectedFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/;
            // Check if the input time matches the expected format
            if (!expectedFormat.test(orderCreatedAt)) {
              finalFormattedTime = orderCreatedAt;
            } else {
              const parsedTime = new Date(orderCreatedAt);
              const formattedDate = new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }).format(parsedTime);
              const formattedTime = new Intl.DateTimeFormat("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }).format(parsedTime);

              finalFormattedTime = `${formattedDate}\n${formattedTime}`;
            }
            const ESIM_ICCDI = [];
            const ESIM_URL = [];
            const ESIM_STATUS = [];
            let found = false;
            let foundIndexes = [];
            for (let i = 0; i < esimData.length; i++) {
              if (esimData[i].ESIM_STATUS === "UNUSED") {
                ESIM_ICCDI.push(esimData[i].ESIM_ICCDI);
                ESIM_URL.push(esimData[i].ESIM_URL);
                ESIM_STATUS.push(esimData[i].ESIM_STATUS);
                found = true;
                foundIndexes.push(i);
              }
            }

            if (found) {
              const ESIM_URL_ARRAY = [];
              const ESIM_ICCDI_ARRAY = [];
              const bundle_name_ARRAY = [];
              const accessToken = await getAccessToken();
              let apiName;
              const errorArray = [];
              if (accessToken.accessTokenResponse) {
                for (let i = 0; i < bundle_name.length; i++) {
                  const currentBundleName = bundle_name[i];
                  const currentQuantity = quantity[i];
                  const currentPrice = price[i];
                  const currentESIM_ICCDIs = [];
                  const currentESIM_URLs = [];
                  const currentSku = sku[i];
                  let MERCHANT_PRICE;

                  for (let j = 0; j < currentQuantity; j++) {
                    if (foundIndexes.length > 0) {
                      const dataIndex = foundIndexes.shift();
                      currentESIM_ICCDIs.push(esimData[dataIndex].ESIM_ICCDI);
                      currentESIM_URLs.push(esimData[dataIndex].ESIM_URL);
                      esimData[dataIndex].ESIM_STATUS = "USED";
                    }
                  }

                  if (typeof currentSku === "string") {
                    const regex = /D\d{12}_\d{6}/g;
                    const matches = currentSku.match(regex);
                    if (matches) {
                      const DATA_BUNDLE_ID_FOR_MERCHANT_PRICE = matches
                        ? matches.join(" ")
                        : "";

                      if (DATA_BUNDLE_ID_FOR_MERCHANT_PRICE) {
                        const MERCHANT_PRICE_ARRAY = await getDataBundleMerchantPrice(
                          DATA_BUNDLE_ID_FOR_MERCHANT_PRICE
                        );
                        if (MERCHANT_PRICE_ARRAY) {
                          MERCHANT_PRICE =
                            MERCHANT_PRICE_ARRAY &&
                            MERCHANT_PRICE_ARRAY[0] &&
                            MERCHANT_PRICE_ARRAY[0].MERCHANT_PRICE
                              ? MERCHANT_PRICE_ARRAY[0].MERCHANT_PRICE
                              : "0";
                        }
                      }
                    }
                  }

                  for (let k = 0; k < currentESIM_ICCDIs.length; k++) {
                    const currentESIM_ICCDI = currentESIM_ICCDIs[k];
                    const currentESIM_URL = currentESIM_URLs[k];
                    let orderPayload;
                    orderPayload = {
                      accessToken: accessToken.accessTokenResponse,
                      thirdOrderId: req.body.order_number,
                      includeCard: "0",
                      is_Refuel: "1",
                      dataBundleId: currentBundleName,
                      quantity: currentQuantity,
                      address: {
                        Zipcode: req.body.billing_address.zip,
                        countryName: req.body.billing_address.country,
                        province: req.body.billing_address.province_code,
                        email: req.body.customer.email,
                      },
                      ICCID: currentESIM_ICCDI,
                      ext: {
                        price: currentPrice,
                      },
                    };
                    console.log(orderPayload, ">>>>>>>>>>>>>>>>>>>>");
                    const response = await axios.post(
                      "https://gdschannel.cmlink.com:39043/aep/APP_createOrder_SBO/v1",
                      orderPayload,
                      {
                        headers: {
                          Host: "gdschannel.cmlink.com",
                          "Content-Type": "application/json",
                          Accept: "application/json",
                          Authorization:
                            'WSSE realm="SDP", profile="UsernameToken", type="Appkey"',
                          "X-WSSE": `UsernameToken Username="${appKey}", PasswordDigest="${passwordDigest}", Nonce="${nonce}", Created="${created}"`,
                        },
                      }
                    );
                    console.log(
                      response.data.code,
                      ">>>>>>>>>>>>response.data"
                    );
                    // if (response.data.code == '0000000') {
                    if (response.data.code){
                      ESIM_URL_ARRAY.push(currentESIM_URL);
                      ESIM_ICCDI_ARRAY.push(currentESIM_ICCDI);
                      bundle_name_ARRAY.push(currentBundleName);
                      db1.serialize(function () {
                        const query =
                          "UPDATE ESIM_PRODUCT_DETAILS SET ESIM_STATUS = ?, ESIM_URL = ? ,CUSTOMER_EMAIL = ?, ORDER_ID = ?, ORDER_CREATE_TIME = ? , MERCHANT_PRICE = ? , COST_PRICE = ? , DATA_BUNDLE_NAME = ? WHERE ESIM_ICCDI = ?";
                        try {
                          db1.run(
                            query,
                            [
                              "USED",
                              currentESIM_URL,
                              customermail,
                              orderID,
                              finalFormattedTime,
                              MERCHANT_PRICE,
                              currentPrice,
                              currentBundleName,
                              currentESIM_ICCDI,
                            ],
                            function (err) {
                              if (err) {
                                console.error(
                                  "Error updating database:",
                                  err.message
                                );
                              } else {
                                console.log(
                                  "esim table updated",
                                  currentESIM_URL,
                                  customermail,
                                  orderID,
                                  finalFormattedTime,
                                  MERCHANT_PRICE,
                                  currentPrice,
                                  currentBundleName,
                                  currentESIM_ICCDI
                                );
                              }
                            }
                          );
                        } catch (error) {
                          console.error("Error updating database:", error);
                        }
                      });
                    } 
                    // else {
                    //   apiName = "/APP_createOrder_SBO/v1";
                    //   errorArray.push(response.data.description);
                    // }
                  }
                }
                if (errorArray.length > 0) {
                  await sendApiFailedMailToClientWithRetry(
                    orderNumber,
                    apiName,
                    errorArray
                  );
                }

                if (ESIM_URL_ARRAY.length > 0) {
                  console.log(
                    ESIM_URL_ARRAY,
                    ">>>>>>>>>mail send data>>>>>>>>>"
                  );
                  console.log(
                    ESIM_ICCDI_ARRAY,
                    ">>>>>>>>>mail send data>>>>>>>>>"
                  );
                  console.log(
                    bundle_name_ARRAY,
                    ">>>>>>>>>mail send data>>>>>>>>>"
                  );
                  await generateQRCodeWithLogo(
                    ESIM_URL_ARRAY,
                    customermail,
                    orderID,
                    ESIM_ICCDI_ARRAY,
                    bundle_name_ARRAY
                  );
                }

                db1.run(
                  "INSERT INTO PROCESSED_ORDERS (ORDER_ID) VALUES (?)",
                  [orderNumber],
                  (err) => {
                    if (err) {
                      console.error(err.message);
                    }
                  }
                );
              } else if (accessToken.error) {
                console.log(accessToken.error, ">>error");
                let apiName = "/APP_getAccessToken_SBO/v1";
                let error = accessToken.error;
                const errorArray1 = [];
                errorArray1.push(error);
                await sendApiFailedMailToClientWithRetry(
                  orderNumber,
                  apiName,
                  errorArray1
                );
              }
            }
          }
        }
      );
      res.status(200).send({ success: true, message: "Data received." });
    } else {
      res
        .status(400)
        .send({ success: false, message: "Request body is missing." });
      return;
    }
  } catch (error) {
    console.error("Error processing data:", error);
    res.status(500).send({ success: false, error: error.message });
  }
}
