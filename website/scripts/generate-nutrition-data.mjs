import fs from "node:fs/promises";
import path from "node:path";

const projectRef = "yozfzsudbcqjttepjnyg";
const supabaseUrl = process.env.SUPABASE_URL ?? `https://${projectRef}.supabase.co`;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pageSize = 1000;

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required to generate nutrition data from the existing Logbook database.",
  );
}

const generatedDir = path.join(process.cwd(), ".generated");
const publicDir = path.join(process.cwd(), "public");
const generatedDataPath = path.join(generatedDir, "nutrition-data.json");
const searchIndexPath = path.join(publicDir, "nutrition-search-index.json");

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
  return products.map((product) => ({
    id: product.id,
    restaurantName: product.restaurantName,
    productName: product.productName,
    calories: product.calories,
    proteinG: product.proteinG,
    carbsG: product.carbsG,
    fatG: product.fatG,
    category: product.category,
  }));
}

async function main() {
  const products = [];
  let offset = 0;

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
  await fs.writeFile(generatedDataPath, JSON.stringify(products, null, 2));
  await fs.writeFile(searchIndexPath, JSON.stringify(buildSearchIndex(products)));

  console.log(`Generated nutrition data for ${products.length} restaurant items.`);
}

await main();
