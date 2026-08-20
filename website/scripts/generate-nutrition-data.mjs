import fs from "node:fs/promises";
import path from "node:path";

const projectRef = "yozfzsudbcqjttepjnyg";
const supabaseUrl = process.env.SUPABASE_URL ?? `https://${projectRef}.supabase.co`;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pageSize = 1000;

const generatedDir = path.join(process.cwd(), ".generated");
const publicDir = path.join(process.cwd(), "public");
const generatedDataPath = path.join(generatedDir, "nutrition-data.json");
const searchIndexPath = path.join(publicDir, "nutrition-search-index.json");

async function readExistingProducts() {
  try {
    return JSON.parse(await fs.readFile(generatedDataPath, "utf8"));
  } catch {
    return null;
  }
}

async function fetchProductsPage(offset) {
  const params = new URLSearchParams({
    select: [
      "id",
      "restaurant_name",
      "product_name",
      "category",
      "calories",
      "protein_g",
      "carbs_g",
      "fat_g",
      "fiber_g",
      "sugar_g",
      "sodium_mg",
      "serving_description",
      "serving_size_value",
      "serving_size_unit",
      "grams_per_serving",
      "brand_name",
      "source_url",
      "updated_at",
      "visibility_status",
      "is_verified",
    ].join(","),
    visibility_status: "eq.public",
    is_verified: "eq.true",
    order: "restaurant_name.asc,product_name.asc",
    limit: String(pageSize),
    offset: String(offset),
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/products?${params.toString()}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch nutrition products: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function normalizeNumber(value) {
  return typeof value === "number" ? value : value == null ? null : Number(value);
}

function sanitizeProduct(product) {
  const restaurantName = typeof product.restaurant_name === "string" ? product.restaurant_name.trim() : "";

  if (!restaurantName) {
    return null;
  }

  return {
    id: product.id,
    restaurantName,
    productName: typeof product.product_name === "string" ? product.product_name.trim() : "",
    category: typeof product.category === "string" && product.category.trim() ? product.category.trim() : null,
    calories: normalizeNumber(product.calories),
    proteinG: normalizeNumber(product.protein_g),
    carbsG: normalizeNumber(product.carbs_g),
    fatG: normalizeNumber(product.fat_g),
    fiberG: normalizeNumber(product.fiber_g),
    sugarG: normalizeNumber(product.sugar_g),
    sodiumMg: normalizeNumber(product.sodium_mg),
    servingDescription:
      typeof product.serving_description === "string" && product.serving_description.trim()
        ? product.serving_description.trim()
        : null,
    servingSizeValue: normalizeNumber(product.serving_size_value),
    servingSizeUnit:
      typeof product.serving_size_unit === "string" && product.serving_size_unit.trim()
        ? product.serving_size_unit.trim()
        : null,
    gramsPerServing: normalizeNumber(product.grams_per_serving),
    brandName:
      typeof product.brand_name === "string" && product.brand_name.trim() ? product.brand_name.trim() : null,
    sourceUrl:
      typeof product.source_url === "string" && product.source_url.trim() ? product.source_url.trim() : null,
    updatedAt: product.updated_at,
  };
}

function buildSearchIndex(products) {
  const restaurants = [...new Set(products.map((product) => product.restaurantName))].sort();
  const restaurantIndex = new Map(restaurants.map((restaurant, index) => [restaurant, index]));

  return {
    r: restaurants,
    i: products.map((product) => [
      restaurantIndex.get(product.restaurantName),
      product.productName,
      product.calories,
      product.proteinG,
      product.carbsG,
      product.fatG,
      product.category,
    ]),
  };
}

async function main() {
  const existingProducts = await readExistingProducts();
  const fallbackProducts = Array.isArray(existingProducts) ? existingProducts : [];

  if (!serviceRoleKey) {
    await fs.mkdir(generatedDir, { recursive: true });
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(generatedDataPath, JSON.stringify(fallbackProducts, null, 2));
    await fs.writeFile(searchIndexPath, JSON.stringify(buildSearchIndex(fallbackProducts)));
    console.log(
      `Skipped nutrition data refresh because SUPABASE_SERVICE_ROLE_KEY is not set. Using ${
        fallbackProducts.length > 0 ? "the existing" : "an empty"
      } nutrition snapshot instead.`,
    );
    return;
  }

  const products = [];
  let offset = 0;

  try {
    while (true) {
      const batch = await fetchProductsPage(offset);

      if (!Array.isArray(batch) || batch.length === 0) {
        break;
      }

      for (const product of batch) {
        const sanitized = sanitizeProduct(product);

        if (sanitized) {
          products.push(sanitized);
        }
      }

      if (batch.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    await fs.mkdir(generatedDir, { recursive: true });
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(generatedDataPath, JSON.stringify(products, null, 2));
    await fs.writeFile(searchIndexPath, JSON.stringify(buildSearchIndex(products)));

    console.log(`Generated nutrition data for ${products.length} restaurant items.`);
  } catch (error) {
    await fs.mkdir(generatedDir, { recursive: true });
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(generatedDataPath, JSON.stringify(fallbackProducts, null, 2));
    await fs.writeFile(searchIndexPath, JSON.stringify(buildSearchIndex(fallbackProducts)));
    console.warn(
      `Fell back to ${
        fallbackProducts.length > 0 ? "the existing" : "an empty"
      } nutrition snapshot because the nutrition data could not be loaded.`,
    );
    console.warn(error instanceof Error ? error.message : error);
  }
}

await main();
