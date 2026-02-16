import type { Request, Response } from "express";

export function healthCheck(_req: Request, res: Response) {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

export function chefRecipe(req: Request, res: Response) {
  const { ingredients, dietary, cuisine, servings = 4 } = req.body || {};

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({
      error: "ingredients is required and must be a non-empty array of strings",
    });
  }

  res.json({
    recipe: {
      name: `${cuisine ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1) + " " : ""}${ingredients[0].charAt(0).toUpperCase() + ingredients[0].slice(1)} Dish`,
      servings,
      prep_time: "15 min",
      cook_time: "25 min",
      dietary: dietary || "none",
      ingredients: ingredients.map((ing: string) => ({
        item: ing,
        amount: "to taste",
      })),
      steps: [
        `Prepare all ${ingredients.length} ingredients: ${ingredients.join(", ")}`,
        "Heat your cooking surface to medium-high",
        `Combine ingredients and cook${cuisine ? ` ${cuisine}-style` : ""}`,
        `Season to taste and serve ${servings} portions`,
      ],
      nutrition_estimate: {
        calories: Math.floor(200 + Math.random() * 400),
        protein: `${Math.floor(10 + Math.random() * 30)}g`,
        carbs: `${Math.floor(20 + Math.random() * 50)}g`,
        fat: `${Math.floor(5 + Math.random() * 20)}g`,
      },
      note: "This is a demo response. Connect your LLM service for real recipe generation.",
    },
  });
}

export function sunoEnhance(req: Request, res: Response) {
  const { prompt, style, mood } = req.body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "prompt is required and must be a string",
    });
  }

  res.json({
    enhanced_prompt: `${prompt}${style ? `, in the style of ${style}` : ""}${mood ? `, with a ${mood} atmosphere` : ""}, featuring rich instrumentation and dynamic progression`,
    style_tags: [
      style || "indie",
      mood || "reflective",
      "melodic",
      "atmospheric",
    ],
    suggested_title: prompt
      .split(" ")
      .slice(0, 4)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    structure: "verse-chorus-verse-bridge-chorus",
    note: "This is a demo response. Connect your LLM service for real prompt enhancement.",
  });
}

export function brandAnalyse(req: Request, res: Response) {
  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      error: "url is required and must be a valid URL string",
    });
  }

  res.json({
    brand: {
      name: new URL(url).hostname.replace("www.", "").split(".")[0],
      tagline: "Innovation meets simplicity",
      colors: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
      tone: "professional",
      values: ["Innovation", "Reliability", "User-centric"],
      audience: "Tech-savvy professionals aged 25-45",
      voice_guide:
        "Clear, confident, and approachable. Avoid jargon unless addressing technical audiences.",
    },
    meta: {
      title: `${new URL(url).hostname} - Brand Analysis`,
      description: "AI-generated brand identity analysis",
      source_url: url,
    },
    note: "This is a demo response. Connect your LLM + web scraping service for real brand analysis.",
  });
}

export function brandContent(req: Request, res: Response) {
  const { url, platforms = ["twitter", "instagram", "linkedin"], count = 3 } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      error: "url is required and must be a valid URL string",
    });
  }

  const hostname = new URL(url).hostname.replace("www.", "").split(".")[0];

  res.json({
    brand: {
      name: hostname,
      tone: "professional",
    },
    posts: platforms.slice(0, count).map((platform: string) => ({
      platform,
      content: `Discover what makes ${hostname} unique. #${hostname} #brand`,
      hashtags: [`#${hostname}`, "#brand", "#digital"],
      tone_match: 0.92,
    })),
    note: "This is a demo response. Connect your LLM service for real content generation.",
  });
}

export function startupValidate(req: Request, res: Response) {
  const { idea, target_market, budget } = req.body || {};

  if (!idea || typeof idea !== "string") {
    return res.status(400).json({
      error: "idea is required and must be a string",
    });
  }

  res.json({
    success_score: Math.floor(60 + Math.random() * 30),
    swot: {
      strengths: ["Clear value proposition", "Growing market demand"],
      weaknesses: ["Competitive landscape", "Resource constraints"],
      opportunities: ["Market expansion", "Partnership potential"],
      threats: ["Market saturation", "Regulatory changes"],
    },
    market_size: {
      tam: "$10B",
      sam: "$2B",
      som: "$200M",
    },
    competitors: ["Competitor A", "Competitor B"],
    pricing_suggestion: {
      model: "freemium",
      entry_price: "$9/month",
    },
    elevator_pitch: `${idea} - targeting ${target_market || "a broad audience"} with ${budget || "bootstrapped"} funding.`,
    next_steps: [
      "Validate with 10 potential customers",
      "Build MVP",
      "Secure initial funding",
    ],
    note: "This is a demo response. Connect your LLM service for real validation.",
  });
}

export function brandFull(req: Request, res: Response) {
  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      error: "url is required and must be a valid URL string",
    });
  }

  const hostname = new URL(url).hostname.replace("www.", "").split(".")[0];

  res.json({
    brand: {
      name: hostname,
      tagline: "Innovation meets simplicity",
      colors: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
      tone: "professional",
    },
    posts: [
      { platform: "twitter", content: `Check out ${hostname}! #brand`, hashtags: [`#${hostname}`] },
      { platform: "instagram", content: `${hostname} - where innovation lives.`, hashtags: [`#${hostname}`] },
    ],
    images: Array.from({ length: 5 }, (_, i) => ({
      platform: ["instagram", "twitter", "linkedin", "facebook", "pinterest"][i],
      url: `https://placeholder.example.com/${hostname}-image-${i + 1}.png`,
      dimensions: ["1080x1080", "1200x675", "1200x627", "1200x630", "1000x1500"][i],
    })),
    competitor_angles: ["Focus on unique value prop", "Highlight technical advantage"],
    content_calendar: {
      week_1: "Brand awareness campaign",
      week_2: "Product feature highlights",
      week_3: "User testimonials",
      week_4: "Behind the scenes",
    },
    seo_keywords: [hostname, "brand", "digital", "innovation"],
    note: "This is a demo response. Connect your LLM + image generation service for real brand kits.",
  });
}

export function startupFull(req: Request, res: Response) {
  const { idea, target_market, budget } = req.body || {};

  if (!idea || typeof idea !== "string") {
    return res.status(400).json({
      error: "idea is required and must be a string",
    });
  }

  res.json({
    validation: {
      success_score: Math.floor(60 + Math.random() * 30),
      viability: "moderate-high",
    },
    customer_personas: [
      {
        name: "Tech Professional",
        age: "28-40",
        pain_points: ["Time constraints", "Information overload"],
      },
      {
        name: "Small Business Owner",
        age: "35-55",
        pain_points: ["Budget limitations", "Scaling challenges"],
      },
    ],
    business_model_canvas: {
      value_proposition: idea,
      customer_segments: [target_market || "General audience"],
      revenue_streams: ["Subscription", "Pay-per-use"],
      channels: ["Direct", "Partnerships"],
    },
    marketing_plan: {
      phase_1: "Content marketing and SEO",
      phase_2: "Paid acquisition",
      phase_3: "Referral program",
    },
    development_roadmap: {
      month_1: "MVP",
      month_3: "Beta launch",
      month_6: "Public launch",
      month_12: "Scale",
    },
    name_suggestions: [
      idea.split(" ").slice(0, 2).join(""),
      idea.split(" ")[0] + "ly",
      "Go" + idea.split(" ")[0],
    ],
    slogan_options: [
      `${idea} - simplified.`,
      `The future of ${target_market || "your industry"}.`,
    ],
    note: "This is a demo response. Connect your LLM service for real startup analysis.",
  });
}

export const handlers: Record<string, (req: Request, res: Response) => void> = {
  healthCheck,
  chefRecipe,
  sunoEnhance,
  brandAnalyse,
  brandContent,
  startupValidate,
  brandFull,
  startupFull,
};
