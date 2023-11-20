// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import shopify from "./shopify.js";
import GDPRWebhookHandlers from "./gdpr.js";
import cors from "cors";
import cron from "node-cron";
import bodyParser from "body-parser";
// components
import { orderCreate } from "./components/esimApiComponent.js";
import { emailResend } from "./components/emailResendComponent.js";
import { excelData } from "./components/ExcelDataComponent.js";
import { getDataComponent } from "./components/getDataComponent.js";
import { getDataPaginationComponent } from "./components/getDataPaginationComponent.js";
import { CreateDatabaseComponent } from "./components/CreateDatabaseComponent.js";
import { getDB } from "./components/DatabaseComponent.js";
import Shopify from "shopify-api-node";
import { checkStock } from "./components/CheckStockComponent.js";
import productCreator from "./product-creator.js";
import { getOrderDataComponent } from "./components/getOrderDataComponent.js";
process.env.TZ = 'Asia/Hong_Kong';
const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

let shopifyy;
const data = await getDB();
if(data){
   shopifyy = new Shopify({
    shopName: data?.shop,
    accessToken: data?.accessToken,
  });
}


const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// api for order and database modification
app.post("/api/webhook", orderCreate);

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);
const addSessionShopToReqParams = (req, res, next) => {
  const shop = res.locals?.shopify?.session?.shop;
  if (shop && !req.query.shop) {
    req.query.shop = shop;
  }
  return next();
}

app.use("/api/*", shopify.validateAuthenticatedSession());
app.use("/*", addSessionShopToReqParams)
app.use(express.json());

// save excel data
app.post("/api/saveExcelData", excelData);
// api to resend the email
app.post("/api/resendMail", emailResend);
// api to create the tables from frontend
app.get("/api/createDb", CreateDatabaseComponent);
// api for page navigation
app.get("/api/getDataPagination", getDataPaginationComponent);
// api for fetching all data of esim from database
app.get("/api/getData", getDataComponent);
// api for fetching order related all data of esim from database
app.get("/api/getDataByOrderId", getOrderDataComponent);

// function to modify products variants at 12.00 AM Daily
cron.schedule("0 0 * * *", async () => {
  productCreator(shopifyy);
});

// productCreator(shopifyy);

// function to check the esim stock and send mail after 12 hours
checkStock();
app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));
app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
   return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
