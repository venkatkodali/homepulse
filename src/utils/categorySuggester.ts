import { CategoryInfo } from '../types';

export interface SuggestCategoryParams {
  merchant?: string;
  description?: string;
  transactionType?: 'expense' | 'income';
  amount?: number;
  categories: CategoryInfo[];
}

export interface CategorySuggestion {
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
  alternativeCategoryIds: string[];
  source: 'gemini' | 'heuristic';
}

/**
 * Local client-side instant heuristic fallback when offline or for instant preview.
 */
function localFallbackSuggest(
  merchant: string = '',
  description: string = '',
  categories: CategoryInfo[],
  transactionType: 'expense' | 'income' = 'expense'
): CategorySuggestion {
  const combined = `${merchant} ${description}`.toLowerCase().trim();
  const validIds = new Set(categories.map((c) => c.id));

  const pickValid = (preferred: string[], def = 'other') => {
    for (const p of preferred) {
      if (validIds.has(p)) return p;
    }
    return validIds.has(def) ? def : categories[0]?.id || 'other';
  };

  const getName = (id: string) => categories.find((c) => c.id === id)?.name || id;

  if (transactionType === 'income' || /payroll|direct dep|salary|paycheck|bonus|freelance|dividend/.test(combined)) {
    const id = pickValid(['salary', 'income', 'investments', 'other']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getName(id),
      confidence: 0.95,
      reasoning: 'Recognized income or compensation keyword',
      alternativeCategoryIds: ['other'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  if (/whole foods|trader joe|safeway|kroger|costco|walmart|aldi|supermarket|grocer|sprouts/.test(combined)) {
    const id = pickValid(['groceries', 'food', 'shopping']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getName(id),
      confidence: 0.92,
      reasoning: 'Recognized grocery supermarket',
      alternativeCategoryIds: ['food', 'shopping'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  if (/starbucks|mcdonald|chipotle|doordash|uber eats|restaurant|cafe|coffee|diner|burger|pizza|sushi|bistro/.test(combined)) {
    const id = pickValid(['food', 'groceries', 'entertainment']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getName(id),
      confidence: 0.91,
      reasoning: 'Matches dining, restaurant or cafe',
      alternativeCategoryIds: ['groceries'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  if (/uber|lyft|shell|chevron|bp |exxon|gas station|subway|mta|metro|transit|amtrak|parking|toll/.test(combined)) {
    const id = pickValid(['transport', 'travel', 'utilities']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getName(id),
      confidence: 0.93,
      reasoning: 'Identified ride-share, fuel or transit expense',
      alternativeCategoryIds: ['travel'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  if (/rent|mortgage|landlord|leasing|apartment|hoa/.test(combined)) {
    const id = pickValid(['housing', 'utilities']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getName(id),
      confidence: 0.96,
      reasoning: 'Matches housing or rent payment',
      alternativeCategoryIds: ['utilities'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  if (/electric|water|coned|pg&e|xfinity|comcast|at&t|verizon|spectrum|internet/.test(combined)) {
    const id = pickValid(['utilities', 'housing']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getName(id),
      confidence: 0.94,
      reasoning: 'Matches utility or telecom provider',
      alternativeCategoryIds: ['housing'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  if (/netflix|spotify|hulu|disney\+|steam|playstation|cinema|amc|theatre|ticketmaster/.test(combined)) {
    const id = pickValid(['entertainment', 'tech']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getName(id),
      confidence: 0.94,
      reasoning: 'Identified digital entertainment or media',
      alternativeCategoryIds: ['tech'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  if (/github|aws|apple\.com\/bill|openai|vercel|dropbox|icloud|figma|adobe/.test(combined)) {
    const id = pickValid(['tech', 'utilities', 'entertainment']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getName(id),
      confidence: 0.92,
      reasoning: 'Matches software or cloud service',
      alternativeCategoryIds: ['utilities'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  if (/gym|cvs|walgreens|pharmacy|doctor|hospital|clinic|dental/.test(combined)) {
    const id = pickValid(['health', 'shopping']);
    return {
      suggestedCategoryId: id,
      suggestedCategoryName: getName(id),
      confidence: 0.9,
      reasoning: 'Matches healthcare, wellness or pharmacy',
      alternativeCategoryIds: ['shopping'].filter((x) => x !== id && validIds.has(x)),
      source: 'heuristic',
    };
  }

  const defId = pickValid(['other', 'shopping', 'food']);
  return {
    suggestedCategoryId: defId,
    suggestedCategoryName: getName(defId),
    confidence: 0.45,
    reasoning: 'Default classification',
    alternativeCategoryIds: categories.slice(0, 2).map((c) => c.id).filter((x) => x !== defId),
    source: 'heuristic',
  };
}

/**
 * Primary helper function that suggests categories for new or existing transactions
 * using Gemini 3.8 Flash via the backend Express API, with high resilience fallback.
 *
 * @param params { merchant, description, categories, transactionType, amount }
 * @returns Promise<CategorySuggestion>
 */
export async function suggestCategoryForTransaction(
  params: SuggestCategoryParams
): Promise<CategorySuggestion> {
  const { merchant = '', description = '', transactionType = 'expense', amount, categories } = params;

  if (!categories || categories.length === 0) {
    return {
      suggestedCategoryId: 'other',
      suggestedCategoryName: 'Miscellaneous',
      confidence: 0.5,
      reasoning: 'No categories available',
      alternativeCategoryIds: [],
      source: 'heuristic',
    };
  }

  const cleanMerchant = merchant.trim();
  const cleanDescription = description.trim();

  // If both inputs are blank, return quickly
  if (!cleanMerchant && !cleanDescription) {
    return localFallbackSuggest('', '', categories, transactionType);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch('/api/gemini/suggest-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant: cleanMerchant,
        description: cleanDescription,
        transactionType,
        amount,
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data && data.suggestedCategoryId) {
      return {
        suggestedCategoryId: data.suggestedCategoryId,
        suggestedCategoryName: data.suggestedCategoryName || data.suggestedCategoryId,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.85,
        reasoning: data.reasoning || 'Categorized by Gemini AI',
        alternativeCategoryIds: Array.isArray(data.alternativeCategoryIds) ? data.alternativeCategoryIds : [],
        source: data.source || 'gemini',
      };
    }

    throw new Error('Invalid response structure');
  } catch (err) {
    // Graceful offline fallback
    return localFallbackSuggest(cleanMerchant, cleanDescription, categories, transactionType);
  }
}
