// Character module - centralized exports
// ============================================================================

// Database schema and types
export {
  // Tables
  characters,
  characterImages,
  // Types
  type Character,
  type NewCharacter,
  type CharacterImage,
  type NewCharacterImage,
  type CharacterFull,
  type CharacterStatus,
  type CharacterImageType,
} from "@/lib/db/sqlite-character-schema";

// Validation schemas
export {
  // Enum schemas
  characterStatusSchema,
  characterImageTypeSchema,
  // Object schemas
  createCharacterSchema,
  updateCharacterSchema,
  characterImageSchema,
  // Agent metadata schema (B2B)
  agentMetadataSchema,
  // Input types
  type CreateCharacterInput,
  type UpdateCharacterInput,
  type CharacterImageInput,
  type AgentMetadata,
} from "./validation";

// Query functions
export {
  // Character CRUD
  createCharacter,
  getCharacter,
  getCharacterFull,
  getUserCharacters,
  getUserActiveCharacters,
  getUserDefaultCharacter,
  updateCharacter,
  deleteCharacter,
  archiveCharacter,
  setDefaultCharacter,
  // Images
  createCharacterImage,
  getCharacterImages,
  getPrimaryCharacterImage,
  deleteCharacterImage,
  setPrimaryCharacterImage,
  // Draft/Progress
  getDraftCharacter,
  completeCharacterCreation,
  // Interaction
  updateLastInteraction,
} from "./queries";

// React hooks
export {
  useCharacterImage,
  useCharacters,
} from "./hooks";
