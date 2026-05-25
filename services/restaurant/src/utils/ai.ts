import axios from "axios";

export type DescriptionRequest = {
  type?: string;
  name?: string;
  cuisine?: string;
  category?: string;
  keywords?: string;
  currentDescription?: string;
};

export type SmartFoodSearchRequest = {
  query?: string;
};

export type SellerInsightRequest = {
  restaurantName?: string;
  stats?: {
    revenue?: number;
    totalOrdersDelivered?: number;
    topItem?: {
      name?: string;
      quantity?: number;
    };
  };
  performance?: {
    topItems?: { name?: string; quantity?: number; revenue?: number }[];
    lowItems?: { name?: string; quantity?: number; revenue?: number }[];
    payout?: {
      grossRevenue?: number;
      platformFees?: number;
      riderPayouts?: number;
      estimatedSellerPayout?: number;
      deliveredOrders?: number;
    };
  };
  menuItems?: { name?: string; category?: string; price?: number }[];
};

export type DescriptionContext = {
  type: string;
  name: string;
  cuisine: string;
  category: string;
  keywords: string;
  currentDescription: string;
  promptContext: string;
};

const PRICE_RANGES = ["all", "budget", "mid", "premium"] as const;
const COMMON_CUISINES = [
  "Pizza",
  "Biryani",
  "Burger",
  "Chinese",
  "South Indian",
  "Mixed",
];

export const trimField = (value: unknown, maxLength = 180) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const extractOutputText = (response: any) => {
  if (typeof response?.output_text === "string") {
    return response.output_text.trim();
  }

  const content = response?.output?.flatMap((item: any) => item?.content || []);
  const text = content
    ?.map((entry: any) => entry?.text)
    .filter((entry: unknown): entry is string => typeof entry === "string")
    .join(" ")
    .trim();

  return text || "";
};

export const extractJson = (text: string) => {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = jsonBlock || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
};

export const callGemini = async (
  prompt: string,
  { maxOutputTokens = 240, temperature = 0.4 } = {}
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens,
        temperature,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      timeout: 20000,
    }
  );

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text)
    .filter((part: unknown): part is string => typeof part === "string")
    .join(" ")
    .trim();

  return text || "";
};

export const callOpenAI = async (
  instructions: string,
  input: string,
  { maxOutputTokens = 240 } = {}
) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";

  const { data } = await axios.post(
    "https://api.openai.com/v1/responses",
    {
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );

  return extractOutputText(data);
};

export const createFallbackDescription = ({
  type,
  name,
  cuisine,
  category,
  keywords,
  currentDescription,
}: DescriptionContext) => {
  const displayName =
    name || (type === "restaurant" ? "This restaurant" : "This dish");
  const cuisineText = cuisine ? `${cuisine} ` : "";
  const categoryText = category ? ` from our ${category} selection` : "";
  const keywordText = keywords ? `, featuring ${keywords}` : "";

  if (currentDescription) {
    return `${displayName} brings ${cuisineText}flavor${categoryText}${keywordText} with a fresh, satisfying finish. ${currentDescription}`.slice(
      0,
      500
    );
  }

  return `${displayName} serves up ${cuisineText}flavor${categoryText}${keywordText} in a fresh, crave-worthy style customers will love.`.slice(
    0,
    500
  );
};

export const generateWithGemini = async (context: DescriptionContext) => {
  return callGemini(
    `You write concise, appetizing FoodFleet seller descriptions. Return only one polished description, no quotes, no labels, under 45 words. Avoid unsupported health claims.\n\nWrite a catchy customer-facing description using these details:\n${context.promptContext}`,
    { maxOutputTokens: 120, temperature: 0.7 }
  );
};

export const generateWithOpenAI = async (context: DescriptionContext) => {
  return callOpenAI(
    "You write concise, appetizing FoodFleet seller descriptions. Return only one polished description, no quotes, no labels, under 45 words. Avoid unsupported health claims.",
    `Write a catchy customer-facing description using these details:\n${context.promptContext}`,
    { maxOutputTokens: 120 }
  );
};

export const normalizeSmartSearch = (raw: any, query: string) => {
  const cuisine = COMMON_CUISINES.includes(raw?.cuisine) ? raw.cuisine : "all";
  const priceRange = PRICE_RANGES.includes(raw?.priceRange)
    ? raw.priceRange
    : "all";
  const maxDeliveryTime = ["all", "25", "35", "45"].includes(
    String(raw?.maxDeliveryTime)
  )
    ? String(raw.maxDeliveryTime)
    : "all";
  const minRating = ["all", "4", "4.3", "4.5"].includes(String(raw?.minRating))
    ? String(raw.minRating)
    : "all";
  const keywords = Array.isArray(raw?.keywords)
    ? raw.keywords
        .filter((keyword: unknown): keyword is string => typeof keyword === "string")
        .map((keyword: string) => keyword.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];

  return {
    searchText: trimField(raw?.searchText, 80),
    cuisine,
    priceRange,
    maxDeliveryTime,
    minRating,
    openNow: Boolean(raw?.openNow),
    keywords,
    explanation:
      trimField(raw?.explanation, 160) ||
      `Applied smart filters for "${query}".`,
  };
};

export const fallbackSmartSearch = (query: string) => {
  const text = query.toLowerCase();
  const cuisine =
    COMMON_CUISINES.find((option) => text.includes(option.toLowerCase())) ||
    "all";
  const priceRange =
    /\b(cheap|budget|affordable|under 200|low price)\b/.test(text)
      ? "budget"
      : /\b(premium|fancy|expensive)\b/.test(text)
      ? "premium"
      : "all";
  const maxDeliveryTime = /\b(quick|fast|soon|under 25|25 min)\b/.test(text)
    ? "25"
    : /\b(under 35|35 min)\b/.test(text)
    ? "35"
    : "all";
  const minRating = /\b(best|top|high rated|rated)\b/.test(text) ? "4.3" : "all";

  return normalizeSmartSearch(
    {
      searchText: cuisine === "all" ? "" : cuisine,
      cuisine,
      priceRange,
      maxDeliveryTime,
      minRating,
      openNow: /\b(open|available|right now)\b/.test(text),
      keywords: query.split(/\s+/).filter((word) => word.length > 3).slice(0, 5),
      explanation: "Smart filters applied locally from your request.",
    },
    query
  );
};

export const fallbackSellerInsight = (body: SellerInsightRequest) => {
  const topItem = body.stats?.topItem?.name || body.performance?.topItems?.[0]?.name;
  const lowItem = body.performance?.lowItems?.[0]?.name;
  const revenue = Number(body.stats?.revenue || 0);
  const orders = Number(body.stats?.totalOrdersDelivered || 0);

  return {
    summary:
      orders > 0
        ? `${body.restaurantName || "This restaurant"} has ${orders} delivered orders and Rs ${revenue.toFixed(
            2
          )} in recorded revenue.`
        : "No delivered sales yet, so focus on menu completeness and opening status.",
    opportunities: [
      topItem
        ? `Promote ${topItem} more clearly because it is already your strongest item.`
        : "Add clear photos and descriptions to make the menu easier to choose from.",
      lowItem
        ? `Refresh ${lowItem} with a better description, combo, or limited-time offer.`
        : "Create one simple combo to increase average order value.",
    ],
    actions: [
      "Keep best-selling items visible near the top of the menu.",
      "Test one small discount or combo for slower items this week.",
      "Review delivery time and open status before busy meal hours.",
    ],
  };
};
