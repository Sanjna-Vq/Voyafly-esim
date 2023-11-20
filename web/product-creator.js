import { GraphqlQueryError } from "@shopify/shopify-api";
import shopifyProducts from "./components/product-fetch.js";
import { getAllEsimData } from "./components/esimApiComponent.js";
import sqlite3 from "sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
const dataFolderPath = join("../data");
const dbFilePath = join(dataFolderPath, "database.sqlite");
if (!existsSync(dataFolderPath)) {
  mkdirSync(dataFolderPath);
}
var db1 = new sqlite3.Database(dbFilePath);

export default async function productCreator(shopifyy) {
  try {
    const data = await shopifyProducts(shopifyy);
    const mccCode = [
      { Algeria: "603" },
      { Anguilla: "365" },
      { "Antigua and Barbuda": "344" },
      { Argentina: "722" },
      { Armenia: "283" },
      { Aruba: "363" },
      { Australia: "505" },
      { Austria: "232" },
      { Albania: "276" },
      { Azerbaijan: "400" },
      { Bangladesh: "470" },
      { Barbados: "342" },
      { Belarus: "257" },
      { Belgium: "206" },
      { Bermuda: "350" },
      { "Bonaire and Curacao": "362" },
      { "Bosnia and Herzegovina": "218" },
      { Brazil: "724" },
      { "British Virgin Islands": "348" },
      { Brunei: "528" },
      { Bulgaria: "284" },
      { Cambodia: "456" },
      { Cameroon: "624" },
      { Canada: "302" },
      { "Cayman Islands": "346" },
      { Centrafrique: "623" },
      { Chile: "730" },
      { China: "460" },
      { Colombia: "732" },
      { "Costa Rica": "712" },
      { Croatia: "219" },
      { Cyprus: "280" },
      { "Czech Republic": "230" },
      { "Democratic Republic of Congo": "630" },
      { Denmark: "238" },
      { Dominica: "366" },
      { "Dominican Republic": "370" },
      { Ecuador: "740" },
      { Egypt: "602" },
      { "El Salvador": "706" },
      { Estonia: "248" },
      { Europe: "242" },
      { "Faroe Islands": "288" },
      { Fiji: "542" },
      { Finland: "244" },
      { France: "208" },
      { "French Guiana": "340" },
      { Georgia: "282" },
      { Germany: "262" },
      { Ghana: "620" },
      { Gibraltar: "266" },
      { Greece: "202" },
      { Grenada: "352" },
      { Guam: "310" },
      { Guatemala: "704" },
      { Guyana: "738" },
      { Haiti: "372" },
      { Honduras: "708" },
      { "Hong Kong": "454" },
      { Hungary: "216" },
      { India: "404" },
      { Indonesia: "510" },
      { Iran: "432" },
      { Ireland: "272" },
      { Israel: "425" },
      { Italy: "222" },
      { "Ivory Coast": "612" },
      { Jamaica: "338" },
      { Japan: "440" },
      { Jordan: "416" },
      { Kazakhstan: "401" },
      { Kenya: "639" },
      { Korea: "450" },
      { Kuwait: "419" },
      { Kyrgyzstan: "437" },
      { Laos: "457" },
      { Latvia: "247" },
      { Liberia: "618" },
      { Lithuania: "246" },
      { Luxembourg: "270" },
      { Macau: "455" },
      { Madagascar: "646" },
      { Malaysia: "502" },
      { Malta: "278" },
      { Martinique: "340" },
      { Mauritius: "617" },
      { Mexico: "334" },
      { Moldova: "259" },
      { Mongolia: "428" },
      { Montenegro: "297" },
      { Morocco: "604" },
      { Mozambique: "643" },
      { Nepal: "429" },
      { Netherlands: "204" },
      { "New Zealand": "530" },
      { Nicaragua: "710" },
      { Norway: "242" },
      { Oman: "422" },
      { Pakistan: "410" },
      { Panama: "714" },
      { "Papua New Guinea": "537" },
      { Paraguay: "744" },
      { Peru: "716" },
      { Philippines: "515" },
      { Poland: "260" },
      { Portugal: "268" },
      { Qatar: "427" },
      { Romania: "226" },
      { Russia: "250" },
      { Rwanda: "635" },
      { "Saudi Arabia": "420" },
      { Serbia: "220" },
      { Seychelles: "633" },
      { "Sierra Leone": "619" },
      { Singapore: "525" },
      { Slovakia: "231" },
      { Slovenia: "293" },
      { "South Africa": "655" },
      { Spain: "214" },
      { "Sri Lanka": "413" },
      { "St Kitts & Nevis": "356" },
      { "St Lucia": "358" },
      { "St Vincent": "360" },
      { Sudan: "634" },
      { Swaziland: "653" },
      { Sweden: "240" },
      { Switzerland: "228" },
      { Taiwan: "466" },
      { Tajikistan: "436" },
      { Tanzania: "640" },
      { Thailand: "520" },
      { Tonga: "539" },
      { "Trinidad and Tobago": "374" },
      { Tunisia: "605" },
      { Turkey: "286" },
      { "Turks and Caicos": "376" },
      { UAE: "424" },
      { Uganda: "641" },
      { Ukraine: "255" },
      { "United Kingdom": "234" },
      { Uruguay: "748" },
      { USA: "310" },
      { Uzbekistan: "434" },
      { Vanuatu: "541" },
      { Vietnam: "452" },
      { Yemen: "421" },
      { Zambia: "645" },
    ];
    for (let j = 0; j <= data.countriesValues.length; j++) {
      const dataValue = data.countriesValues[j];
      const data1 = data.variantsValues[j];
      const matchingMCC = mccCode.find((entry) => {
        if (Object.keys(entry)[0] === dataValue) {
          return true;
        }
        return false;
      });
      if (matchingMCC) {
        const matchedValue = Object.values(matchingMCC)[0];
        const matchedCountry = Object.keys(matchingMCC)[0];
        const mockResponse = await getAllEsimData(matchedValue);
        const minPrices = {};
        // extract data bunlde api all data
        for (let i = 0; i < mockResponse.length; i++) {
          const mockData = mockResponse[i];
          const titleValue = mockData.name[0].value;
          const COST_PRICE_CENTS = mockData.originalPriceInfo[2].price;
          const COST_PRICE = (COST_PRICE_CENTS / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          });

          let Data_Bundle_Id = null;

          if (titleValue.includes("Unlimited")) {
            const lines = titleValue.trim().split("\n");
            for (const line of lines) {
                Data_Bundle_Id = mockData.id;
                const titledata = line
                  .split("\n")
                  .filter((line) => line.trim() !== "");
                const keyValue = {
                  titledata: titledata,
                  Data_Bundle_Id: Data_Bundle_Id,
                  matchedCountry: matchedCountry,
                  COST_PRICE: COST_PRICE,
                };
                updateMinPrice(keyValue);
            }
          } else if (titleValue.includes("Days (")) {
            const lines = titleValue.split("\n");
            for (const line of lines) {
                Data_Bundle_Id = mockData.id;
                const titledata1 = line
                  .split("\n")
                  .filter((line) => line.trim() !== "");
                const keyValue = {
                  titledata: titledata1,
                  Data_Bundle_Id: Data_Bundle_Id,
                  matchedCountry: matchedCountry,
                  COST_PRICE: COST_PRICE,
                };
                updateMinPrice(keyValue);
            }
          }
        }
        // remove duplicate days bundle and fetch bundle with min price
        function updateMinPrice(data) {
          const title = data.titledata[0];
          const Data_Bundle_Id = data.Data_Bundle_Id;
          const matchedCountry = data.matchedCountry;
          const price = parseFloat(data.COST_PRICE.replace(/\$/g, ""));
          const match = title.match(/\b(\d+)\s*Days\b/i);
          if (match) {
            const days = parseInt(match[1], 10);
            const key = `${days} Days`;

            if (!(key in minPrices) || price < minPrices[key].minPrice) {
              minPrices[key] = {
                minPrice: price,
                title: title,
                Data_Bundle_Id: Data_Bundle_Id,
                matchedCountry: matchedCountry,
              };
            }
          }
        }

        // Sort data bundle
        const sortedKeys = Object.keys(minPrices).sort((a, b) => {
          const aDays = parseInt(a.split(" ")[0], 10);
          const bDays = parseInt(b.split(" ")[0], 10);
          return aDays - bDays;
        });

        // push data in extracteddata array that will
        const extractedData = [];
        for (const key of sortedKeys) {
          const title = minPrices[key].title;
          const Price = minPrices[key].minPrice.toFixed(2);
          const Data_Bundle_Id = minPrices[key].Data_Bundle_Id;
          const matchedCountry = minPrices[key].matchedCountry;
          const inputArray = title.split("\n").map((str) => str.trim());
          for (const inputString of inputArray) {
            const matches = inputString.match(/(.+)\s(\d+)\sDays\s(.+)/);
            if (matches) {
              const prefix = matches[1];
              const Days = matches[2] + " Days";
              const suffix = matches[3];
              const skuTitle = prefix + " " + suffix + " " + Data_Bundle_Id;
              // api all data needed to match the variant and modify the variant
              extractedData.push({
                Days,
                skuTitle,
                matchedCountry,
                Price,
                Data_Bundle_Id,
              });
            }
          }
        }
        // console.log(extractedData, ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        let matchingVariant;
        // modify variants
        for (let n = 0; n < data1.length; n++) {
          const data2 = data1[n];
          const title1 = data2.title;
          const id = data2.id;
          const matches = title1.match(/(\d+\s*Days)/g);
          const titleToMatch = matches.map((match) => match.trim()).join(" ");
          matchingVariant = extractedData.find((extractedDataItem) => {
            return extractedDataItem.Days === titleToMatch;
          });
          if (matchingVariant) {
            await db1.serialize(async function () {
              const sql3 = `INSERT INTO DATA_BUNDLES(DATA_BUNDLE_ID,MERCHANT_PRICE) VALUES(?,?)`;
              await db1.run(sql3,[matchingVariant.Data_Bundle_Id, matchingVariant.Price],
                function (err) {
                  if (err) {
                  }
                }
              );
            });
            let params = { sku: matchingVariant.skuTitle };
            const variant = await shopifyy.productVariant.update(id, params);
            console.log(
              variant.id,
              variant.sku,
              matchingVariant.Days,
              ">>>>>>>>>>>>>>>>>>"
            );
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof GraphqlQueryError) {
      throw new Error(`${error.message}\n${JSON.stringify(error.response)}`);
    } else {
      throw error;
    }
  }
}
