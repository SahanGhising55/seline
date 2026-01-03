"use client";

import type { FC } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface GlobalBackButtonProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to apply Electron-safe webkit-app-region: no-drag */
  isElectron?: boolean;
}

/**
 * Global back button that appears in the header on non-root pages.
 * Uses router.back() for navigation and is Electron-safe with webkit-app-region: no-drag.
 */
export const GlobalBackButton: FC<GlobalBackButtonProps> = ({
  className,
  isElectron = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");

  // Hide on root path
  if (pathname === "/") {
    return null;
  }

  const handleBack = (): void => {
    router.back();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={cn(
        "flex items-center gap-1 text-terminal-dark hover:bg-terminal-dark/10 h-9 px-3",
        isElectron && "webkit-app-region-no-drag",
        className
      )}
      aria-label={t("goBack")}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden md:inline">{t("back")}</span>
    </Button>
  );
};

