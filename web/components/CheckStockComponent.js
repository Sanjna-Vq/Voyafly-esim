import cron from "node-cron";
import { getStatusData } from "./DatabaseComponent.js";
import { sendMailToClientWithRetry } from "./stockEmailComponent.js";
process.env.TZ = 'Asia/Hong_Kong';
export const checkStock = async () => {
  const StockProducts = await getStatusData();
  if (StockProducts) {
    const stock = StockProducts.length;
    // stock less than 50
    if (StockProducts.length < 1000) {
      // Cron job to run at 12:00 AM (midnight) daily
      cron.schedule("0 0 * * *", async () => {
        await sendMailToClientWithRetry(stock);
        console.log(stock, "less stock Mail sent at 12.00 AM");
      });
      // Cron job to run at 12:00 PM (noon) daily
      cron.schedule("0 12 * * *", async () => {
        await sendMailToClientWithRetry(stock);
        console.log(stock, "less stock Mail sent at 12:00 PM");
      });
    }
  }
};
