import { GraphqlQueryError } from "@shopify/shopify-api";

export default async function shopifyProducts(shopifyy) {
  let countriesValues = [];
  let variantsValues = [];
  let productIdValues = [];
  try {
    let params = { limit: 200 };
    const products = await shopifyy.product.list(params);
    params = products.nextPageParameters;
    let data1 = products;

    data1.forEach((element) => {
      const productId = element.product_id;
      productIdValues.push(productId);
      const title = element.title;
      const variants = element.variants;
      variantsValues.push(variants);
      const countries = title?.split("-")[0].trim();
      countriesValues.push(countries);
    });

    return { countriesValues, variantsValues, productIdValues };
  } catch (error) {
    if (error instanceof GraphqlQueryError) {
      throw new Error(`${error.message}\n${JSON.stringify(error.response)}`);
    } else {
      throw error;
    }
  }
}
