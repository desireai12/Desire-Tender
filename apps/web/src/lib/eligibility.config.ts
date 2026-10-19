export interface EligibilityConfig {
  sectionOrder: ('Financial' | 'Technical' | 'Others')[];
  minimumCoverage: {
    minFinancialCriteria: number;
    minTechnicalCriteria: number;
    requiredSectionTypes: ('Financial' | 'Technical')[];
  };
  models: {
    primary: string;
    fallback: string;
    allowed: string[];
  };
  tokenBudget: {
    maxPromptCharacters: number;
    maxPromptTokens: number;
    maxPagesBeforeWindowing: number;
    windowSizeChars: number;
    windowOverlapChars: number;
  };
  pageFinder: {
    contextPaddingPages: number; // two pages on each side
    highValueKeywords: string[];
  };
}

export const ELIGIBILITY_CONFIG: EligibilityConfig = {
  sectionOrder: ['Financial', 'Technical', 'Others'],
  minimumCoverage: {
    minFinancialCriteria: 1,
    minTechnicalCriteria: 1,
    requiredSectionTypes: ['Financial', 'Technical']
  },
  models: {
    primary: 'gemini-3.6-flash',
    fallback: 'gemini-3.5-flash-lite',
    allowed: ['gemini-3.6-flash', 'gemini-3.5-flash-lite']
  },
  tokenBudget: {
    maxPromptCharacters: 38000,
    maxPromptTokens: 9500,
    maxPagesBeforeWindowing: 25,
    windowSizeChars: 35000,
    windowOverlapChars: 4000
  },
  pageFinder: {
    contextPaddingPages: 2,
    highValueKeywords: [
      'turnover',
      'net worth',
      'solvency',
      'bid capacity',
      'similar work',
      'experience',
      'o&m',
      'operation & maintenance',
      'eligibility',
      'qualification',
      'registration',
      'joint venture',
      'blacklist'
    ]
  }
};
