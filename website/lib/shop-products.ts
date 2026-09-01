export type ShopProductStatus = "coming_soon" | "active" | "hidden";

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  status: ShopProductStatus;
  description: string;
  image: string | null;
  stripePriceId: string | null;
  stripeShippingRateId: string | null;
  allowedShippingCountries: readonly string[];
  stripeAutomaticTax: boolean | null;
};

export const shopProducts: readonly ShopProduct[] = [
  {
    id: "show_day_kit",
    slug: "show-day-kit",
    name: "Show Day Kit",
    status: "coming_soon",
    description: "Final product details and availability will be announced before sales open.",
    image: null,
    stripePriceId: null,
    stripeShippingRateId: null,
    allowedShippingCountries: [],
    stripeAutomaticTax: null,
  },
];

export function getShopProductById(productId: string) {
  return shopProducts.find((product) => product.id === productId);
}

export function getPublicShopProducts() {
  return shopProducts.filter((product) => product.status !== "hidden");
}

export type ShopCheckoutAvailability =
  | { available: true; product: ShopProduct; quantity: number }
  | {
      available: false;
      reason: "not_found" | "not_active" | "invalid_quantity" | "incomplete_configuration";
    };

export function evaluateShopCheckoutAvailability(
  product: ShopProduct | undefined,
  quantity: unknown,
): ShopCheckoutAvailability {
  if (!product || product.status === "hidden") {
    return { available: false, reason: "not_found" };
  }

  if (product.status !== "active") {
    return { available: false, reason: "not_active" };
  }

  if (!Number.isInteger(quantity) || Number(quantity) < 1) {
    return { available: false, reason: "invalid_quantity" };
  }

  if (
    !product.stripePriceId ||
    !product.stripeShippingRateId ||
    product.allowedShippingCountries.length === 0 ||
    product.stripeAutomaticTax === null
  ) {
    return { available: false, reason: "incomplete_configuration" };
  }

  return { available: true, product, quantity: Number(quantity) };
}

export function getShopCheckoutAvailability(
  productId: string,
  quantity: unknown,
): ShopCheckoutAvailability {
  return evaluateShopCheckoutAvailability(getShopProductById(productId), quantity);
}

export type ShopPublicAvailability = "coming_soon" | "available" | "restocking";

export function resolveShopPublicAvailability(
  product: ShopProduct,
  sharedInventoryAvailable: boolean,
): ShopPublicAvailability {
  if (product.status === "coming_soon") return "coming_soon";
  return sharedInventoryAvailable ? "available" : "restocking";
}
