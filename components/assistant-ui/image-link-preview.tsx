"use client";

import type { FC, ReactNode } from "react";
import { ExternalLink, ImageIcon } from "lucide-react";
import { AnimatedCardSpan } from "@/components/ui/card";

interface ImageLinkPreviewProps {
    href?: string;
    children: ReactNode;
    className?: string;
    // Fallback component to render if not an image link
    fallback: FC<any>;
    [key: string]: any;
}

export const ImageLinkPreview: FC<ImageLinkPreviewProps> = ({
    href,
    children,
    className,
    fallback: Fallback,
    ...props
}) => {
    // Check if the href is likely an image
    const isImage = href?.match(/\.(jpeg|jpg|gif|png|webp)$/i);

    if (!isImage || !href) {
        return <Fallback href={href} className={className} {...props}>{children}</Fallback>;
    }

    // Extract filename for display if children is just the URL
    const isUrlText = typeof children === "string" && (children.startsWith("http") || children === href);
    const displayText = isUrlText ? href.split("/").pop() : children;

    // Using <span> with display:block instead of <div> to avoid hydration errors
    // when this component is rendered inside a <p> tag from markdown.
    // HTML spec: <div> cannot be nested inside <p>, but <span style="display:block"> can be styled as block.
    return (
        <span className="block my-3 not-prose">
            <AnimatedCardSpan
                className="overflow-hidden bg-terminal-cream border border-terminal-dark/10 max-w-md"
                hoverLift={true}
                hoverGlow={true}
            >
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                >
                    {/* Image Preview */}
                    <span className="block relative aspect-video w-full bg-terminal-dark/5 overflow-hidden">
                        <img
                            src={href}
                            alt={typeof displayText === 'string' ? displayText : "Image preview"}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                        />

                        {/* Overlay on hover */}
                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="inline-block bg-white/90 rounded-full p-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                <ExternalLink className="w-5 h-5 text-terminal-dark" />
                            </span>
                        </span>
                    </span>

                    {/* Caption / Link Text */}
                    <span className="block p-3 flex items-center gap-2 border-t border-terminal-dark/5 bg-white/50">
                        <ImageIcon className="w-4 h-4 text-terminal-muted shrink-0" />
                        <span className="text-xs font-mono text-terminal-dark truncate flex-1">
                            {displayText}
                        </span>
                        <ExternalLink className="w-3 h-3 text-terminal-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                </a>
            </AnimatedCardSpan>
        </span>
    );
};
