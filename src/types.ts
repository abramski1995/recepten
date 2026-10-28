export interface RecipeInput {
  title: string;
  source_url: string | null;
  image_url: string | null;
  description: string | null;
  notes: string | null;
  servings: number | null;
  total_minutes: number | null;
  ingredients: string[];
  steps: string[];
  tags: string[];
}

export interface Recipe extends RecipeInput {
  id: string;
  created_at: string;
  updated_at: string;
}

export const emptyRecipe: RecipeInput = {
  title: "",
  source_url: null,
  image_url: null,
  description: null,
  notes: null,
  servings: null,
  total_minutes: null,
  ingredients: [],
  steps: [],
  tags: [],
};
