import { Request, Response } from "express";
import {
  callGemini,
  callOpenAI,
  createFallbackDescription,
  DescriptionRequest,
  extractJson,
  fallbackSellerInsight,
  fallbackSmartSearch,
  generateWithGemini,
  generateWithOpenAI,
  normalizeSmartSearch,
  SellerInsightRequest,
  SmartFoodSearchRequest,
  trimField,
} from "../utils/ai.js";

export const generateDescription = async (
  req: Request<unknown, unknown, DescriptionRequest>,
  res: Response
) => {
  const type = trimField(req.body.type, 40) || "menu item";
  const name = trimField(req.body.name);
  const cuisine = trimField(req.body.cuisine);
  const category = trimField(req.body.category);
  const keywords = trimField(req.body.keywords, 240);
  const currentDescription = trimField(req.body.currentDescription, 400);

  if (!name && !keywords && !currentDescription) {
    res.status(400).json({
      message: "Add a name or a few keywords before generating a description",
    });
    return;
  }

  const context = [
    `Type: ${type}`,
    name && `Name: ${name}`,
    cuisine && `Cuisine: ${cuisine}`,
    category && `Category: ${category}`,
    keywords && `Keywords: ${keywords}`,
    currentDescription && `Current description: ${currentDescription}`,
  ]
    .filter(Boolean)
    .join("\n");

  const descriptionContext = {
    type,
    name,
    cuisine,
    category,
    keywords,
    currentDescription,
    promptContext: context,
  };

  try {
    const provider = trimField(process.env.AI_PROVIDER, 20).toLowerCase();
    const description =
      provider === "openai"
        ? await generateWithOpenAI(descriptionContext)
        : await generateWithGemini(descriptionContext);

    if (!description) {
      res.json({
        description: createFallbackDescription(descriptionContext),
        provider: "local",
      });
      return;
    }

    res.json({
      description: description.slice(0, 500),
      provider: provider === "openai" ? "openai" : "gemini",
    });
  } catch (error: any) {
    console.error(
      "AI description generation failed:",
      error.response?.data || error.message
    );
    res.json({
      description: createFallbackDescription(descriptionContext),
      provider: "local",
    });
  }
};

export const smartFoodSearch = async (
  req: Request<unknown, unknown, SmartFoodSearchRequest>,
  res: Response
) => {
  const query = trimField(req.body.query, 220);

  if (!query) {
    res.status(400).json({ message: "Search prompt is required" });
    return;
  }

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

  try {
    const provider = trimField(process.env.AI_PROVIDER, 20).toLowerCase();
    const text =
      provider === "openai"
        ? await callOpenAI(
            "You convert food delivery search text into strict JSON filters. Return JSON only.",
            prompt,
            { maxOutputTokens: 240 }
          )
        : await callGemini(prompt, { maxOutputTokens: 240, temperature: 0.2 });
    const parsed = text ? extractJson(text) : null;

    if (!parsed) {
      res.json({
        ...fallbackSmartSearch(query),
        provider: "local",
      });
      return;
    }

    res.json({
      ...normalizeSmartSearch(parsed, query),
      provider: provider === "openai" ? "openai" : "gemini",
    });
  } catch (error: any) {
    console.error(
      "AI smart food search failed:",
      error.response?.data || error.message
    );
    res.json({
      ...fallbackSmartSearch(query),
      provider: "local",
    });
  }
};

export const sellerPerformanceInsight = async (
  req: Request<unknown, unknown, SellerInsightRequest>,
  res: Response
) => {
  const restaurantName = trimField(req.body.restaurantName, 120);
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
Sales stats: ${JSON.stringify(req.body.stats || {})}
30-day performance: ${JSON.stringify(req.body.performance || {})}
Current menu sample: ${JSON.stringify((req.body.menuItems || []).slice(0, 12))}`;

  try {
    const provider = trimField(process.env.AI_PROVIDER, 20).toLowerCase();
    const text =
      provider === "openai"
        ? await callOpenAI(
            "You turn restaurant sales metrics into strict JSON business insights. Return JSON only.",
            prompt,
            { maxOutputTokens: 320 }
          )
        : await callGemini(prompt, { maxOutputTokens: 320, temperature: 0.4 });
    const parsed = text ? extractJson(text) : null;

    if (!parsed) {
      res.json({
        ...fallbackSellerInsight(req.body),
        provider: "local",
      });
      return;
    }

    const opportunities = Array.isArray(parsed.opportunities)
      ? parsed.opportunities
          .filter((item: unknown): item is string => typeof item === "string")
          .slice(0, 2)
      : fallbackSellerInsight(req.body).opportunities;
    const actions = Array.isArray(parsed.actions)
      ? parsed.actions
          .filter((item: unknown): item is string => typeof item === "string")
          .slice(0, 3)
      : fallbackSellerInsight(req.body).actions;

    res.json({
      summary:
        trimField(parsed.summary, 220) ||
        fallbackSellerInsight(req.body).summary,
      opportunities,
      actions,
      provider: provider === "openai" ? "openai" : "gemini",
    });
  } catch (error: any) {
    console.error(
      "AI seller performance insight failed:",
      error.response?.data || error.message
    );
    res.json({
      ...fallbackSellerInsight(req.body),
      provider: "local",
    });
  }
};
