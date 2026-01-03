"use client";

import { Shell } from "@/components/layout/shell";
import { CharacterPicker } from "@/components/character-picker";

export default function HomePage() {
  return (
    <Shell>
      <CharacterPicker />
    </Shell>
  );
}
