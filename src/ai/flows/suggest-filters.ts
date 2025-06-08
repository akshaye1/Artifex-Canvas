'use server';

/**
 * @fileOverview Suggests unique filter combinations based on the content of an uploaded image.
 *
 * - suggestFilters - A function that suggests filter combinations based on image content.
 * - SuggestFiltersInput - The input type for the suggestFilters function.
 * - SuggestFiltersOutput - The return type for the suggestFilters function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFiltersInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SuggestFiltersInput = z.infer<typeof SuggestFiltersInputSchema>;

const SuggestFiltersOutputSchema = z.object({
  suggestedFilters: z
    .array(z.string())
    .describe('An array of suggested filter combinations.'),
});
export type SuggestFiltersOutput = z.infer<typeof SuggestFiltersOutputSchema>;

export async function suggestFilters(input: SuggestFiltersInput): Promise<SuggestFiltersOutput> {
  return suggestFiltersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFiltersPrompt',
  input: {schema: SuggestFiltersInputSchema},
  output: {schema: SuggestFiltersOutputSchema},
  prompt: `Suggest unique filter combinations based on the content of the uploaded image.

  The filter suggestions should be appropriate for the image and create interesting artistic effects.

  Image: {{media url=photoDataUri}}
  `,
});

const suggestFiltersFlow = ai.defineFlow(
  {
    name: 'suggestFiltersFlow',
    inputSchema: SuggestFiltersInputSchema,
    outputSchema: SuggestFiltersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
