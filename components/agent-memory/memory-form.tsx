"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import type { MemoryCategory } from "@/lib/agent-memory/types";
import { MEMORY_CATEGORIES } from "@/lib/agent-memory/types";
import { useTranslations } from "next-intl";

interface MemoryFormProps {
  onSubmit: (data: { category: MemoryCategory; content: string }) => void;
  onCancel: () => void;
}

export function MemoryForm({ onSubmit, onCancel }: MemoryFormProps) {
  const [category, setCategory] = useState<MemoryCategory>("visual_preferences");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("memory.form");
  const tc = useTranslations("common");
  const tcat = useTranslations("memory.categories");
  const getCategoryInfo = (cat: MemoryCategory) => ({
    label: tcat(`${cat}.label`),
    description: tcat(`${cat}.description`),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ category, content: content.trim() });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-terminal-green/30 bg-terminal-green/5 p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold font-mono text-terminal-dark">
          {t("title")}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0 text-terminal-muted hover:text-terminal-dark"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Category selector */}
        <div className="space-y-2">
          <label className="text-sm font-mono text-terminal-muted">
            {t("category")}
          </label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as MemoryCategory)}
          >
            <SelectTrigger className="w-full font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(MEMORY_CATEGORIES).map((key) => {
                const info = getCategoryInfo(key as MemoryCategory);
                return (
                  <SelectItem key={key} value={key} className="font-mono">
                    <div>
                      <div className="text-sm">{info.label}</div>
                      <div className="text-xs text-terminal-muted">
                        {info.description}
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Content textarea */}
        <div className="space-y-2">
          <label className="text-sm font-mono text-terminal-muted">
            {t("content")}
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("placeholder")}
            className="min-h-[100px] font-mono text-sm placeholder:text-terminal-muted/50"
          />
          <p className="text-xs font-mono text-terminal-muted">
            {t("hint")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="font-mono"
          >
            {tc("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="gap-2 bg-terminal-green hover:bg-terminal-green/90 text-terminal-cream font-mono"
          >
            {isSubmitting ? t("adding") : t("add")}
          </Button>
        </div>
      </div>
    </form>
  );
}
