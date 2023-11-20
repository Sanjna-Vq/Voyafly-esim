import { getEsimDataPagination } from "./DatabaseComponent.js";

export const getDataPaginationComponent = async (req, res) => {
  const pageQueryParam = req.query.page;
  let data;
  if (typeof pageQueryParam === "string") {
    const currentPage = parseInt(pageQueryParam) || 1;
    const itemsPerPage = 10;
    let status = 200;
    let error = null;
    try {
      getEsimDataPagination;
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      data = await getEsimDataPagination(startIndex, endIndex);
      res.status(status).send({
        success: status === 200,
        error,
        data: data,
      });
    } catch (e) {
      console.log(`Failed pagination: ${e.message}`);
      error = e.message;
      res.status(status).send({ success: false, error });
    }
  } else {
    res
      .status(400)
      .send({ success: false, error: "Invalid 'page' query parameter" });
  }
};
