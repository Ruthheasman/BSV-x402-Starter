import type { EndpointConfig } from "@shared/schema";

export const SERVICE_NAME = process.env.SERVICE_NAME || "bsv-x402-starter";
export const SERVICE_VERSION = "1.0.0";

export const endpoints: EndpointConfig[] = [
  {
    path: "/api/chef/recipe",
    method: "POST",
    price: 1000,
    description: "Generate a recipe from available ingredients",
    handler: "chefRecipe",
    tier: "micro",
    accepts: {
      contentType: "application/json",
      body: {
        ingredients: "string[] (required)",
        dietary: "string (optional)",
        cuisine: "string (optional)",
        servings: "number (optional, default 4)",
      },
    },
    returns: {
      contentType: "application/json",
      body: {
        recipe: "object - full recipe with name, steps, nutrition",
      },
    },
  },
  {
    path: "/api/suno/enhance",
    method: "POST",
    price: 1000,
    description: "Enhance a music generation prompt for Suno AI",
    handler: "sunoEnhance",
    tier: "micro",
    accepts: {
      contentType: "application/json",
      body: {
        prompt: "string (required)",
        style: "string (optional)",
        mood: "string (optional)",
      },
    },
    returns: {
      contentType: "application/json",
      body: {
        enhanced_prompt: "string - improved prompt",
        style_tags: "string[] - genre tags",
        suggested_title: "string",
        structure: "string - song structure",
      },
    },
  },
  {
    path: "/api/brand/analyse",
    method: "POST",
    price: 5000,
    description: "Extract brand identity from a website URL (text only)",
    handler: "brandAnalyse",
    tier: "standard",
    accepts: {
      contentType: "application/json",
      body: {
        url: "string (required) - website URL to analyse",
      },
    },
    returns: {
      contentType: "application/json",
      body: {
        brand: "object - extracted brand identity, colors, tone, audience",
      },
    },
  },
  {
    path: "/api/brand/content",
    method: "POST",
    price: 6500,
    description: "Generate platform-specific social posts from URL",
    handler: "brandContent",
    tier: "standard",
    accepts: {
      contentType: "application/json",
      body: {
        url: "string (required)",
        platforms: "string[] (optional) - e.g. twitter, instagram, linkedin",
        count: "number (optional, default 3)",
      },
    },
    returns: {
      contentType: "application/json",
      body: {
        brand: "object - brand identity",
        posts: "array - platform-specific social content",
      },
    },
  },
  {
    path: "/api/startup/validate",
    method: "POST",
    price: 8000,
    description: "Validate a business idea with SWOT, market sizing, and scoring",
    handler: "startupValidate",
    tier: "standard",
    accepts: {
      contentType: "application/json",
      body: {
        idea: "string (required)",
        target_market: "string (optional)",
        budget: "string (optional)",
      },
    },
    returns: {
      contentType: "application/json",
      body: {
        success_score: "number - 0-100",
        swot: "object - strengths, weaknesses, opportunities, threats",
        market_size: "object - TAM, SAM, SOM",
        elevator_pitch: "string",
      },
    },
  },
  {
    path: "/api/brand/full",
    method: "POST",
    price: 33000,
    description: "Full brand kit: analysis, social content, and 5 generated images",
    handler: "brandFull",
    tier: "premium",
    accepts: {
      contentType: "application/json",
      body: {
        url: "string (required) - website URL to analyse",
      },
    },
    returns: {
      contentType: "application/json",
      body: {
        brand: "object - full brand identity",
        posts: "array - platform-specific social content",
        images: "array - 5 generated brand images with URLs",
      },
    },
  },
  {
    path: "/api/startup/full",
    method: "POST",
    price: 20000,
    description: "Full startup report: validation, personas, business model, roadmap",
    handler: "startupFull",
    tier: "premium",
    accepts: {
      contentType: "application/json",
      body: {
        idea: "string (required)",
        target_market: "string (optional)",
        budget: "string (optional)",
      },
    },
    returns: {
      contentType: "application/json",
      body: {
        validation: "object - full validation report",
        customer_personas: "array - target personas",
        business_model_canvas: "object",
        development_roadmap: "object",
      },
    },
  },
  {
    path: "/api/health",
    method: "GET",
    price: 0,
    description: "Health check - returns server status",
    handler: "healthCheck",
    tier: "free",
  },
];

export function getEndpointPrice(path: string, method: string): number {
  const endpoint = endpoints.find(
    (e) => e.path === path && e.method === method.toUpperCase()
  );
  return endpoint?.price ?? 0;
}
