import axios from "axios";
import { extractJson, extractOutputText, trimField } from "./ai.js";
const PRICE_RANGES = ["all", "budget", "mid", "premium"];
const COMMON_CUISINES = [
    "Pizza",
    "Biryani",
    "Burger",
    "Chinese",
    "South Indian",
    "Mixed",
];
const callGemini = async (prompt, { maxOutputTokens = 240, temperature = 0.4 } = {}) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        return "";
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        contents: [
            {
                parts: [{ text: prompt }],
            },
        ],
        generationConfig: {
            maxOutputTokens,
            temperature,
        },
    }, {
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
        },
        timeout: 20000,
    });
    const text = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text)
        .filter((part) => typeof part === "string")
        .join(" ")
        .trim();
    return text || "";
};
const callOpenAI = async (instructions, input, { maxOutputTokens = 240 } = {}) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
        return "";
    const { data } = await axios.post("https://api.openai.com/v1/responses", {
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions,
        input,
        max_output_tokens: maxOutputTokens,
    }, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        timeout: 20000,
    });
    return extractOutputText(data);
};
export const createDescriptionContext = (body) => {
    const type = trimField(body.type, 40) || "menu item";
    const name = trimField(body.name);
    const cuisine = trimField(body.cuisine);
    const category = trimField(body.category);
    const keywords = trimField(body.keywords, 240);
    const currentDescription = trimField(body.currentDescription, 400);
    const promptContext = [
        `Type: ${type}`,
        name && `Name: ${name}`,
        cuisine && `Cuisine: ${cuisine}`,
        category && `Category: ${category}`,
        keywords && `Keywords: ${keywords}`,
        currentDescription && `Current description: ${currentDescription}`,
    ]
        .filter(Boolean)
        .join("\n");
    return {
        type,
        name,
        cuisine,
        category,
        keywords,
        currentDescription,
        promptContext,
    };
};
export const createFallbackDescription = ({ type, name, cuisine, category, keywords, currentDescription, }) => {
    const displayName = name || (type === "restaurant" ? "This restaurant" : "This dish");
    const cuisineText = cuisine ? `${cuisine} ` : "";
    const categoryText = category ? ` from our ${category} selection` : "";
    const keywordText = keywords ? `, featuring ${keywords}` : "";
    if (currentDescription) {
        return `${displayName} brings ${cuisineText}flavor${categoryText}${keywordText} with a fresh, satisfying finish. ${currentDescription}`.slice(0, 500);
    }
    return `${displayName} serves up ${cuisineText}flavor${categoryText}${keywordText} in a fresh, crave-worthy style customers will love.`.slice(0, 500);
};
export const generateDescription = async (context, provider) => {
    if (provider === "openai") {
        return callOpenAI("You write concise, appetizing FoodFleet seller descriptions. Return only one polished description, no quotes, no labels, under 45 words. Avoid unsupported health claims.", `Write a catchy customer-facing description using these details:\n${context.promptContext}`, { maxOutputTokens: 120 });
    }
    return callGemini(`You write concise, appetizing FoodFleet seller descriptions. Return only one polished description, no quotes, no labels, under 45 words. Avoid unsupported health claims.\n\nWrite a catchy customer-facing description using these details:\n${context.promptContext}`, { maxOutputTokens: 120, temperature: 0.7 });
};
const normalizeSmartSearch = (raw, query) => {
    const cuisine = COMMON_CUISINES.includes(raw?.cuisine) ? raw.cuisine : "all";
    const priceRange = PRICE_RANGES.includes(raw?.priceRange)
        ? raw.priceRange
        : "all";
    const maxDeliveryTime = ["all", "25", "35", "45"].includes(String(raw?.maxDeliveryTime))
        ? String(raw.maxDeliveryTime)
        : "all";
    const minRating = ["all", "4", "4.3", "4.5"].includes(String(raw?.minRating))
        ? String(raw.minRating)
        : "all";
    const keywords = Array.isArray(raw?.keywords)
        ? raw.keywords
            .filter((keyword) => typeof keyword === "string")
            .map((keyword) => keyword.trim())
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
        explanation: trimField(raw?.explanation, 160) ||
            `Applied smart filters for "${query}".`,
    };
};
export const fallbackSmartSearch = (query) => {
    const text = query.toLowerCase();
    const cuisine = COMMON_CUISINES.find((option) => text.includes(option.toLowerCase())) ||
        "all";
    const priceRange = /\b(cheap|budget|affordable|under 200|low price)\b/.test(text)
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
    return normalizeSmartSearch({
        searchText: cuisine === "all" ? "" : cuisine,
        cuisine,
        priceRange,
        maxDeliveryTime,
        minRating,
        openNow: /\b(open|available|right now)\b/.test(text),
        keywords: query.split(/\s+/).filter((word) => word.length > 3).slice(0, 5),
        explanation: "Smart filters applied locally from your request.",
    }, query);
};
export const buildSmartFoodSearch = async (query, provider) => {
    const prompt = `Convert this FoodFleet customer request into restaurant filters.
Return only valid JSON with this exact shape:
{
  "searchText": "",
  "cuisine": "all|Pizza|Biryani|Burger|Chinese|South Indian|Mixed",
  "priceRange": "all|budget|mid|premium",
  "maxDeliveryTime": "all|25|35|45",
  "minRating": "all|4|4.3|4.5",
  "openNow": false,
  "keywords": ["short", "terms"],
  "explanation": "one short sentence"
}
Use searchText only for a specific restaurant or dish keyword. For vague requests like cheap, fast, best, dinner, or spicy, prefer filters and keywords.
Customer request: ${query}`;
    const text = provider === "openai"
        ? await callOpenAI("You convert food delivery search text into strict JSON filters. Return JSON only.", prompt, { maxOutputTokens: 240 })
        : await callGemini(prompt, { maxOutputTokens: 240, temperature: 0.2 });
    const parsed = text ? extractJson(text) : null;
    return parsed ? normalizeSmartSearch(parsed, query) : null;
};
export const fallbackSellerInsight = (body) => {
    const topItem = body.stats?.topItem?.name || body.performance?.topItems?.[0]?.name;
    const lowItem = body.performance?.lowItems?.[0]?.name;
    const revenue = Number(body.stats?.revenue || 0);
    const orders = Number(body.stats?.totalOrdersDelivered || 0);
    return {
        summary: orders > 0
            ? `${body.restaurantName || "This restaurant"} has ${orders} delivered orders and Rs ${revenue.toFixed(2)} in recorded revenue.`
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
export const buildSellerInsight = async (body, restaurantName, provider) => {
    const prompt = `You are an AI business assistant for a FoodFleet restaurant seller.
Use the provided metrics to create concise, practical performance insight.
Return only valid JSON with this exact shape:
{
  "summary": "one short sentence",
  "opportunities": ["two short opportunity bullets"],
  "actions": ["three short action bullets"]
}
Avoid generic advice. Mention specific item names when available.
Restaurant: ${restaurantName || "Restaurant"}
Sales stats: ${JSON.stringify(body.stats || {})}
30-day performance: ${JSON.stringify(body.performance || {})}
Current menu sample: ${JSON.stringify((body.menuItems || []).slice(0, 12))}`;
    const text = provider === "openai"
        ? await callOpenAI("You turn restaurant sales metrics into strict JSON business insights. Return JSON only.", prompt, { maxOutputTokens: 320 })
        : await callGemini(prompt, { maxOutputTokens: 320, temperature: 0.4 });
    const parsed = text ? extractJson(text) : null;
    if (!parsed)
        return null;
    const fallback = fallbackSellerInsight(body);
    const opportunities = Array.isArray(parsed.opportunities)
        ? parsed.opportunities
            .filter((item) => typeof item === "string")
            .slice(0, 2)
        : fallback.opportunities;
    const actions = Array.isArray(parsed.actions)
        ? parsed.actions
            .filter((item) => typeof item === "string")
            .slice(0, 3)
        : fallback.actions;
    return {
        summary: trimField(parsed.summary, 220) || fallback.summary,
        opportunities,
        actions,
    };
};
export const resolveProviderName = (provider) => {
    return provider === "openai" ? "openai" : "gemini";
};
