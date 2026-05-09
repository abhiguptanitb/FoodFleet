import express, { Request, Response } from "express";
import axios from "axios";
import { isAuth, isSeller } from "../middlewares/isAuth.js";

const router = express.Router();

type DescriptionRequest = {
  type?: string;
  name?: string;
  cuisine?: string;
  category?: string;
  keywords?: string;
  currentDescription?: string;
};

type DescriptionContext = {
  type: string;
  name: string;
  cuisine: string;
  category: string;
  keywords: string;
  currentDescription: string;
  promptContext: string;
};

const trimField = (value: unknown, maxLength = 180) => {
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

const createFallbackDescription = ({
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

const generateWithGemini = async (context: DescriptionContext) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      contents: [
        {
          parts: [
            {
              text: `You write concise, appetizing FoodFleet seller descriptions. Return only one polished description, no quotes, no labels, under 45 words. Avoid unsupported health claims.\n\nWrite a catchy customer-facing description using these details:\n${context.promptContext}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 120,
        temperature: 0.7,
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

const generateWithOpenAI = async (context: DescriptionContext) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";

  const { data } = await axios.post(
    "https://api.openai.com/v1/responses",
    {
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions:
        "You write concise, appetizing FoodFleet seller descriptions. Return only one polished description, no quotes, no labels, under 45 words. Avoid unsupported health claims.",
      input: `Write a catchy customer-facing description using these details:\n${context.promptContext}`,
      max_output_tokens: 120,
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

router.post(
  "/generate-description",
  isAuth,
  isSeller,
  async (req: Request<unknown, unknown, DescriptionRequest>, res: Response) => {
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
  }
);

export default router;
