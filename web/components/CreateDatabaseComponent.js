import { createDatabase } from "./DatabaseComponent.js";

export const CreateDatabaseComponent = async (_req, res) => {
    let status = 200;
    let error = null;
    let data;
    try {
      data = await createDatabase();
    } catch (e) {
      console.log(`Failed to /api/createDb: ${e.message}`);
      error = e.message;
    }
    res.status(status).send({ success: status === 200, error, data: data });
  }