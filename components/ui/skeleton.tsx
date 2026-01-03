import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ============================================================================
// BASE SKELETON
// ============================================================================

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

function Skeleton({ className, animate = true }: SkeletonProps) {
  if (!animate) {
    return (
      <div
        className={cn("rounded-md bg-muted", className)}
      />
    );
  }

  return (
    <motion.div
      className={cn("rounded-md bg-muted", className)}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// ============================================================================
// SKELETON VARIANTS
// ============================================================================

function SkeletonText({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} {...props} />;
}

function SkeletonTitle({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-6 w-3/4", className)} {...props} />;
}

function SkeletonCircle({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} {...props} />;
}

function SkeletonButton({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-24 rounded-lg", className)} {...props} />;
}

function SkeletonImage({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn("aspect-square w-full rounded-xl", className)} {...props} />;
}

// ============================================================================
// COMPOUND SKELETON COMPONENTS
// ============================================================================

interface SkeletonCardProps extends SkeletonProps {
  lines?: number;
  showImage?: boolean;
}

function SkeletonCard({ className, lines = 3, showImage = false, ...props }: SkeletonCardProps) {
  return (
    <div className={cn("space-y-4 p-4 rounded-xl bg-card shadow-sm", className)} {...props}>
      {showImage && <SkeletonImage />}
      <div className="space-y-2">
        <SkeletonTitle />
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonText key={i} className={i === lines - 1 ? "w-2/3" : "w-full"} />
        ))}
      </div>
    </div>
  );
}

function SkeletonFormField({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

// ============================================================================
// CHARACTER CREATION SPECIFIC SKELETONS
// ============================================================================

function SkeletonCharacterPreview({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Image placeholder */}
      <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
      {/* Name */}
      <div className="space-y-2 text-center">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      {/* Stats/tags */}
      <div className="flex gap-2 justify-center">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

function SkeletonTemplateCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg bg-card shadow-sm", className)} {...props}>
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonTitle,
  SkeletonCircle,
  SkeletonButton,
  SkeletonImage,
  SkeletonCard,
  SkeletonFormField,
  SkeletonCharacterPreview,
  SkeletonTemplateCard,
};

