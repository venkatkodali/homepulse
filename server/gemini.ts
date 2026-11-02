import { GoogleGenAI, Type } from '@google/genai';

// Initialize the GoogleGenAI instance server-side
const apiKey = process.env.GEMINI_API_KEY;

export const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

export interface CategoryOption {
  id: string;
  name: string;
}

export interface SuggestCategoryInput {
  merchant?: string;
  description?: string;
  transactionType?: 'expense' | 'income';
  amount?: number;
  categories: CategoryOption[];
}

export interface SuggestionResult {
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  confidence: number;
  reasoning: string;
  alternativeCategoryIds: string[];
  source: 'gemini' | 'heuristic';
}

/**
 * High-precision local heuristic fallback when Gemini API key is not present or offline.
 */
export function getHeuristicCategorySuggestion(
  merchant: string = '',
  description: string = '',
  categories: CategoryOption[],
  transactionType: 'expense' | 'income' = 'expense'
): SuggestionResult {
  const combined = `${merchant} ${description}`.toLowerCase().trim();
  const validIds = new Set(categories.map((c) => c.id));

  const pickFirstValid = (preferredIds: string[], defaultId: string = 'other') => {
    for (const id of preferredIds) {
      if (validIds.has(id)) return id;
    }
    return validIds.has(defaultId) ? defaultId : categories[0]?.id || 'other';
  };

  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || id;
  };

  // Income heuristics
  if (transactionType === 'income' || /payroll|direct dep|salary|paycheck|bonus|freelance|dividend|consulting|stipend/.test(combined)) {
    const id = pickFirstValid(['salary', 'income', 'investments', 'other']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.95,
      reasoning: 'Recognized payroll, compensation, or investment inflow keywords.',
      alternativeCategoryIds: ['other'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Groceries / Supermarket
  if (/whole foods|trader joe|safeway|kroger|costco|walmart|aldi|heb|wegmans|publix|supermarket|grocer|market basket|target grocery|fresh produce|sprouts/.test(combined)) {
    const id = pickFirstValid(['groceries', 'food', 'shopping']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.92,
      reasoning: 'Recognized supermarket or grocery retail brand.',
      alternativeCategoryIds: ['food', 'shopping'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Dining & Restaurants / Takeout
  if (/starbucks|mcdonald|chipotle|doordash|uber eats|grubhub|restaurant|cafe|coffee|diner|burger|pizza|sushi|bistro|taco|bakery|bar|pub|sweetgreen|shake shack/.test(combined)) {
    const id = pickFirstValid(['food', 'groceries', 'entertainment']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.91,
      reasoning: 'Matches dining, restaurant, coffee shop, or meal delivery services.',
      alternativeCategoryIds: ['groceries', 'entertainment'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Transportation & Fuel
  if (/uber|lyft|shell|chevron|bp |exxon|mobil|gas station|texaco|subway|mta|metro|transit|caltrain|bart|amtrak|parking|toll|ezpass|valet|auto zone/.test(combined)) {
    const id = pickFirstValid(['transport', 'travel', 'utilities']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.93,
      reasoning: 'Identified fuel, ride-share, transit, or automotive expense.',
      alternativeCategoryIds: ['travel', 'other'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Housing & Real Estate
  if (/rent|mortgage|landlord|leasing|apartment|hoa fee|property management|realty/.test(combined)) {
    const id = pickFirstValid(['housing', 'utilities', 'other']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.96,
      reasoning: 'Matches residential rent, mortgage, or housing obligations.',
      alternativeCategoryIds: ['utilities'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Utilities & Internet / Telecom
  if (/electric|water dept|coned|pg&e|pacific gas|xfinity|comcast|at&t|verizon|t-mobile|spectrum|internet|power & light|waste management/.test(combined)) {
    const id = pickFirstValid(['utilities', 'housing', 'tech']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.94,
      reasoning: 'Matches telecommunications, municipal utilities, or energy provider.',
      alternativeCategoryIds: ['housing', 'tech'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Software & Tech Services
  if (/github|aws|digitalocean|apple\.com\/bill|google cloud|openai|vercel|slack|dropbox|icloud|figma|notion|godaddy|domain|adobe/.test(combined)) {
    const id = pickFirstValid(['tech', 'utilities', 'entertainment', 'shopping']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.93,
      reasoning: 'Identified software subscription, cloud service, or developer tool.',
      alternativeCategoryIds: ['utilities', 'entertainment'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Entertainment, Media & Streaming
  if (/netflix|spotify|hulu|disney\+|hbo|max|apple tv|youtube premium|steam|playstation|nintendo|cinema|amc|theatre|ticketmaster|concert/.test(combined)) {
    const id = pickFirstValid(['entertainment', 'tech', 'shopping']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.95,
      reasoning: 'Identified digital streaming, music, cinema, or gaming platform.',
      alternativeCategoryIds: ['tech', 'shopping'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Health, Fitness & Medical
  if (/gym|equinox|planet fitness|cvs|walgreens|pharmacy|doctor|hospital|clinic|dental|optometry|kaiser|quest diagnostics|labcorp|vitamins/.test(combined)) {
    const id = pickFirstValid(['health', 'personal', 'shopping']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.92,
      reasoning: 'Matches healthcare provider, fitness club, or pharmaceutical dispensary.',
      alternativeCategoryIds: ['shopping', 'other'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Travel, Flights & Hotels
  if (/delta|united airlines|american air|southwest|airbnb|marriott|hilton|hyatt|hotel|booking\.com|expedia|car rental|hertz|enterprise/.test(combined)) {
    const id = pickFirstValid(['travel', 'transport', 'entertainment']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.94,
      reasoning: 'Matches airline, hospitality, or travel booking vendor.',
      alternativeCategoryIds: ['transport', 'entertainment'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Shopping, Retail & Goods
  if (/amazon|best buy|target|ikea|home depot|lowes|zara|nordstrom|nike|apple store|sephora|clothing|electronics/.test(combined)) {
    const id = pickFirstValid(['shopping', 'groceries', 'tech']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.88,
      reasoning: 'Matches general retail merchant or department store.',
      alternativeCategoryIds: ['groceries', 'tech'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Education & Courses
  if (/university|college|coursera|udemy|edx|tuition|textbook|library|audible|school/.test(combined)) {
    const id = pickFirstValid(['education', 'other']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getCategoryName(id),
      confidence: 0.91,
      reasoning: 'Matches university, online courseware, or educational resource.',
      alternativeCategoryIds: ['other'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  // Default fallback
  const fallbackId = pickFirstValid(['other', 'shopping', 'food']);
  return {
    suggestedCategoryId: fallbackId,
    suggestedCategoryName: getCategoryName(fallbackId),
    confidence: 0.5,
    reasoning: 'General fallback category based on available categories.',
    alternativeCategoryIds: categories.slice(0, 2).map((c) => c.id).filter((x) => x !== fallbackId),
    source: 'heuristic',
  };
}

/**
 * Suggests transaction category using Gemini 3.8 Flash model with structured JSON response.
 */
export async function suggestCategoryWithGemini(input: SuggestCategoryInput): Promise<SuggestionResult> {
  const { merchant = '', description = '', transactionType = 'expense', amount, categories } = input;

  if (!categories || categories.length === 0) {
    throw new Error('Categories list is required');
  }

  // If Gemini client is not initialized, use heuristic
  if (!ai || !apiKey) {
    return getHeuristicCategorySuggestion(merchant, description, categories, transactionType);
  }

  const cleanMerchant = merchant.trim();
  const cleanDescription = description.trim();

  // If both are empty, return default heuristic immediately
  if (!cleanMerchant && !cleanDescription) {
    return getHeuristicCategorySuggestion('', '', categories, transactionType);
  }

  const categoryListPrompt = categories.map((c) => `- "${c.id}": ${c.name}`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Please classify the following personal finance transaction into the most suitable category from the provided allowed category list.

Transaction details:
- Merchant / Payee: ${cleanMerchant || 'N/A'}
- Description / Title: ${cleanDescription || 'N/A'}
- Flow Type: ${transactionType}
${amount !== undefined ? `- Amount: $${amount.toFixed(2)}` : ''}

Allowed categories:
${categoryListPrompt}

Select the single best category id from the allowed categories list. Also provide a confidence score between 0.0 and 1.0, concise reasoning (1 short sentence), and up to 2 alternative category ids from the allowed categories.`,
      config: {
        systemInstruction:
          'You are an intelligent, fast financial transaction categorizer. You accurately map merchant names and descriptions to standard personal finance categories. Only output valid JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedCategoryId: {
              type: Type.STRING,
              description: 'The exact id of the most matching category from the allowed categories list',
            },
            suggestedCategoryName: {
              type: Type.STRING,
              description: 'Human-readable name of the suggested category',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score from 0.0 to 1.0',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Short 1-sentence rationale for this category match',
            },
            alternativeCategoryIds: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: 'Up to 2 other plausible category IDs from the allowed list',
            },
          },
          required: ['suggestedCategoryId', 'suggestedCategoryName', 'confidence', 'reasoning'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text);
    const validIds = new Set(categories.map((c) => c.id));

    // Validate that the returned category ID exists in the user's categories
    let finalCategoryId = parsed.suggestedCategoryId;
    if (!validIds.has(finalCategoryId)) {
      // Find category by name match
      const matchingByName = categories.find(
        (c) =>
          c.name.toLowerCase() === (parsed.suggestedCategoryName || '').toLowerCase() ||
          c.id.toLowerCase() === finalCategoryId.toLowerCase()
      );
      if (matchingByName) {
        finalCategoryId = matchingByName.id;
      } else {
        // Fallback to heuristic
        return getHeuristicCategorySuggestion(merchant, description, categories, transactionType);
      }
    }

    const categoryObj = categories.find((c) => c.id === finalCategoryId);
    const finalCategoryName = categoryObj ? categoryObj.name : parsed.suggestedCategoryName || finalCategoryId;

    const validAlternatives = Array.isArray(parsed.alternativeCategoryIds)
      ? parsed.alternativeCategoryIds.filter((id: string) => validIds.has(id) && id !== finalCategoryId).slice(0, 2)
      : [];

    return {
      suggestedCategoryId: finalCategoryId,
      suggestedCategoryName: finalCategoryName,
      confidence: Math.min(1.0, Math.max(0.0, Number(parsed.confidence) || 0.85)),
      reasoning: parsed.reasoning || `Matched based on merchant '${cleanMerchant || cleanDescription}'`,
      alternativeCategoryIds: validAlternatives,
      source: 'gemini',
    };
  } catch (error) {
    console.warn('Gemini categorization failed, falling back to local heuristics:', error);
    return getHeuristicCategorySuggestion(merchant, description, categories, transactionType);
  }
}
