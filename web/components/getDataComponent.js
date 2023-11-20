import { getEsimDataDb } from "./DatabaseComponent.js";

export const getDataComponent = async (_req, res) => {
    let status = 200;
    let error = null;
    let data;
    try {
      data = await getEsimDataDb();
    } catch (e) {
      console.log(`Failed: ${e.message}`);
      error = e.message;
    }
    res.status(status).send({ success: status === 200, error, data: data });
  }