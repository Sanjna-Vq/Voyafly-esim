import { getOrderData } from "./DatabaseComponent.js";

export const getOrderDataComponent = async (req, res) => {
  const order_id = req.query.OrderID;
  console.log(order_id, ">>>>>>>");
  let data;
  if (typeof order_id === "string") {
    let status = 200;
    let error = null;
    try {
      data = await getOrderData(order_id);
      if (data) {
        const ESIM_ICCDI = [];
        const ESIM_URL = [];
        const DATA_BUNDLE_NAME = [];
        data.forEach((element) => {
          ESIM_ICCDI.push(element.ESIM_ICCDI);
          ESIM_URL.push(element.ESIM_URL);
          DATA_BUNDLE_NAME.push(element.DATA_BUNDLE_NAME);
        });
        res.status(status).send({
          success: status === 200,
          error,
          ESIM_ICCDI: ESIM_ICCDI,
          ESIM_URL: ESIM_URL,
          DATA_BUNDLE_NAME: DATA_BUNDLE_NAME,
        });
      }
    } catch (e) {
      console.log(`Failed order: ${e.message}`);
      error = e.message;
      res.status(status).send({ success: false, error });
    }
  } else {
    res
      .status(400)
      .send({ success: false, error: "Invalid 'order_id' query parameter" });
  }
};
