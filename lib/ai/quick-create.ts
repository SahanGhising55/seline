import { generateObject } from "ai";
import { z } from "zod";
import { getUtilityModel } from "@/lib/ai/providers";

/**
 * Schema for agent expansion output
 */
export const agentExpansionSchema = z.preprocess(
    (val: any) => {
        if (val && typeof val === 'object') {
            const normalized: any = {};
            for (const key of Object.keys(val)) {
                normalized[key.toLowerCase()] = val[key];
            }
            return normalized;
        }
        return val;
    },
    z.object({
        name: z.string().describe("A creative, professional name for the AI agent"),
        tagline: z.string().describe("A short, catchy one-sentence description of the agent's role"),
        purpose: z.string().describe("A detailed description of the agent's purpose, responsibilities, and instructions"),
    })
);

export type AgentExpansion = z.infer<typeof agentExpansionSchema>;

/**
 * Expand a minimal agent concept into a full profile
 */
export async function expandAgentConcept(concept: string): Promise<AgentExpansion> {
    const { object } = await generateObject({
        model: getUtilityModel(),
        schema: agentExpansionSchema,
        prompt: `
      You are an expert AI agent architect. 
      The user wants to create an AI agent based on this minimal concept:
      
      "${concept}"
      
      Your task is to structure this into an agent profile.
      
      CRITICAL INSTRUCTIONS:
      1. **Be Conservative**: Do NOT add any unrequested personality traits, backstories, or specific rules unless they are directly implied by the user's concept.
      2. **Strict Brevity**: Keep the "purpose" concise and focused. It MUST be under 800 characters.
      3. **No Hallucinations**: Do not make up specific company names, internal policies, or technical stacks unless mentioned.
      4. **Key Format**: Use ONLY lowercase keys in your JSON response ("name", "tagline", "purpose").
      
      - "name": A concise, professional name based on the concept.
      - "tagline": A short one-sentence summary of what it does.
      - "purpose": A clear, directive list of instructions based ONLY on the user's concept.
    `,
    });

    return object;
}
