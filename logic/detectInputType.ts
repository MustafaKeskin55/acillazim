interface CategoryNode {
  category_id?: number | string | null;
  parent_id?: number | string | null;
  [key: string]: unknown;
}

interface Categories {
  categories?: Record<string, CategoryNode>;
  [key: string]: unknown;
}

interface CategoryMatch {
  name: string;
  path: string[];
  pathString: string;
  id: number | string | null;
  parent_id: number | string | null;
  score: number;
}

interface DetectResult {
  type: 'empty' | 'category' | 'suggestion' | 'freetext';
  matches: CategoryMatch[];
  score?: number;
}

interface MatchResult {
  exactMatches: CategoryMatch[];
  partialMatches: CategoryMatch[];
}

/**
 * Kullanıcı girişinin türünü tespit eder
 */
const detectInputType = (input: string, categories: Categories): DetectResult => {
  if (!input || typeof input !== 'string' || !categories) {
    return { type: 'empty', matches: [] };
  }

  const cleanInput = input.trim().toLowerCase();
  if (cleanInput.length === 0) return { type: 'empty', matches: [] };

  const categoryMatches = findCategoryMatches(cleanInput, categories);

  if (categoryMatches.exactMatches.length > 0) {
    return { type: 'category', matches: categoryMatches.exactMatches, score: 100 };
  }

  if (categoryMatches.partialMatches.length > 0) {
    return {
      type: 'suggestion',
      matches: categoryMatches.partialMatches,
      score: calculateMatchScore(cleanInput, categoryMatches.partialMatches)
    };
  }

  return { type: 'freetext', matches: [], score: 0 };
};

/**
 * Girişin kategorilerle eşleşmesini kontrol eder
 */
const findCategoryMatches = (input: string, categories: Categories): MatchResult => {
  const exactMatches: CategoryMatch[] = [];
  const partialMatches: CategoryMatch[] = [];

  const searchCategories = (catObj: Record<string, unknown>, parentPath: string[] = []): void => {
    if (!catObj || typeof catObj !== 'object') return;

    Object.keys(catObj).forEach(categoryName => {
      if (categoryName === 'category_id' || categoryName === 'parent_id') return;

      const category = catObj[categoryName] as CategoryNode;
      const currentPath = [...parentPath, categoryName];
      const currentPathStr = currentPath.join(' > ');

      if (categoryName.toLowerCase() === input) {
        exactMatches.push({
          name: categoryName,
          path: currentPath,
          pathString: currentPathStr,
          id: category.category_id ?? null,
          parent_id: category.parent_id ?? null,
          score: 100
        });
      } else if (categoryName.toLowerCase().includes(input)) {
        const score = calculateSimilarityScore(input, categoryName.toLowerCase());
        partialMatches.push({
          name: categoryName,
          path: currentPath,
          pathString: currentPathStr,
          id: category.category_id ?? null,
          parent_id: category.parent_id ?? null,
          score
        });
      }

      searchCategories(category as Record<string, unknown>, currentPath);
    });
  };

  if (categories.categories) {
    searchCategories(categories.categories);
  } else {
    searchCategories(categories as Record<string, unknown>);
  }

  partialMatches.sort((a, b) => b.score - a.score);

  return { exactMatches, partialMatches: partialMatches.slice(0, 10) };
};

/**
 * İki string arasındaki benzerlik puanını hesaplar
 */
const calculateSimilarityScore = (query: string, categoryName: string): number => {
  if (query === categoryName) return 100;

  if (categoryName.includes(query)) {
    const matchRatio = query.length / categoryName.length;
    const positionBonus = categoryName.startsWith(query) ? 15 : 0;
    return Math.round((matchRatio * 80) + positionBonus);
  }

  const queryWords = query.split(/\s+/);
  const categoryWords = categoryName.split(/\s+/);

  let matchCount = 0;
  queryWords.forEach(word => {
    if (word.length > 2 && categoryWords.some(catWord => catWord.includes(word))) {
      matchCount++;
    }
  });

  if (matchCount > 0) return Math.round((matchCount / queryWords.length) * 60);
  return 0;
};

/**
 * Eşleşmeler için toplam skor hesaplar
 */
const calculateMatchScore = (_input: string, matches: CategoryMatch[]): number => {
  if (!matches || !matches.length) return 0;
  return matches[0].score || 0;
};

export { detectInputType, findCategoryMatches, calculateSimilarityScore };
