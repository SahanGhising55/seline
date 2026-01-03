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
import {
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemoryEntry, MemoryCategory } from "@/lib/agent-memory/types";
import { MEMORY_CATEGORIES } from "@/lib/agent-memory/types";
import { useTranslations } from "next-intl";

interface MemoryCardProps {
  memory: MemoryEntry;
  onApprove: (id: string, edits?: { content?: string; category?: MemoryCategory }) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MemoryCard({
  memory,
  onApprove,
  onReject,
  onDelete,
}: MemoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(memory.content);
  const [editedCategory, setEditedCategory] = useState<MemoryCategory>(memory.category);
  const [showDetails, setShowDetails] = useState(false);
  const t = useTranslations("memory");

  const isPending = memory.status === "pending";
  const isApproved = memory.status === "approved";
  const isAuto = memory.source === "auto";

  const tc = useTranslations("memory.categories");
  const getCategoryLabel = (cat: MemoryCategory) => tc(`${cat}.label`);
  const categoryLabel = getCategoryLabel(memory.category);

  const handleApprove = () => {
    if (isEditing) {
      onApprove(memory.id, {
        content: editedContent !== memory.content ? editedContent : undefined,
        category: editedCategory !== memory.category ? editedCategory : undefined,
      });
      setIsEditing(false);
    } else {
      onApprove(memory.id);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(memory.content);
    setEditedCategory(memory.category);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isPending
          ? "border-amber-200 bg-amber-50/50"
          : isApproved
          ? "border-terminal-border bg-terminal-cream/50"
          : "border-red-200 bg-red-50/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          {/* Category badge */}
          <span
            className={cn(
              "px-2 py-1 text-xs font-mono rounded",
              memory.category === "visual_preferences"
                ? "bg-purple-100 text-purple-700"
                : memory.category === "communication_style"
                ? "bg-blue-100 text-blue-700"
                : memory.category === "workflow_patterns"
                ? "bg-green-100 text-green-700"
                : memory.category === "domain_knowledge"
                ? "bg-orange-100 text-orange-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {categoryLabel}
          </span>

          {/* Status badge */}
          {isPending && (
            <span className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded bg-amber-100 text-amber-700">
              <Clock className="h-3 w-3" />
              {t("pending")}
            </span>
          )}

          {/* Source badge */}
          <span
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs font-mono rounded",
              isAuto
                ? "bg-terminal-dark/5 text-terminal-muted"
                : "bg-terminal-green/10 text-terminal-green"
            )}
          >
            {isAuto ? (
              <>
                <Sparkles className="h-3 w-3" />
                {t("auto")}
              </>
            ) : (
              <>
                <User className="h-3 w-3" />
                {t("manual")}
              </>
            )}
          </span>
        </div>

        {/* Importance score */}
        <div
          className="text-xs font-mono text-terminal-muted"
          title={t("importance", { percent: (memory.importance * 100).toFixed(0) })}
        >
          {(memory.importance * 100).toFixed(0)}%
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-3 mb-4">
          <Select
            value={editedCategory}
            onValueChange={(v) => setEditedCategory(v as MemoryCategory)}
          >
            <SelectTrigger className="w-full font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(MEMORY_CATEGORIES).map((key) => (
                <SelectItem key={key} value={key} className="font-mono text-sm">
                  {getCategoryLabel(key as MemoryCategory)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[80px] font-mono text-sm"
          />
        </div>
      ) : (
        <p className="text-sm font-mono text-terminal-dark mb-4">
          {memory.content}
        </p>
      )}

      {/* Details toggle */}
      {memory.reasoning && !isEditing && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs font-mono text-terminal-muted hover:text-terminal-dark mb-3"
        >
          {showDetails ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {showDetails ? t("hideDetails") : t("showDetails")}
        </button>
      )}

      {showDetails && memory.reasoning && (
        <div className="text-xs font-mono text-terminal-muted bg-terminal-dark/5 rounded p-3 mb-4">
          <strong>{t("reasoning")}</strong> {memory.reasoning}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPending && (
            <>
              <Button
                size="sm"
                onClick={handleApprove}
                className="gap-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-3 w-3" />
                {isEditing ? t("saveAndApprove") : t("approve")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(memory.id)}
                className="gap-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-3 w-3" />
                {t("reject")}
              </Button>
            </>
          )}

          {isApproved && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(memory.id)}
              className="gap-1 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
              {t("delete")}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPending && !isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="gap-1 text-terminal-muted hover:text-terminal-dark"
            >
              <Edit2 className="h-3 w-3" />
              {t("edit")}
            </Button>
          )}

          {isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              className="text-terminal-muted"
            >
              {t("cancel")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
