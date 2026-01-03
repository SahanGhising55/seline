"use client";

import { createContext, useContext, type ReactNode, type FC } from "react";

// ============================================================================
// Gallery Context
// ============================================================================
// This context enables gallery components (like ProductGalleryToolUI) to
// communicate with the chat composer, allowing users to attach images from
// galleries as references for their next message.

export interface GalleryContextValue {
    /**
     * Attach an image to the chat composer as a reference.
     * When the user clicks an image in a gallery, this function is called
     * to add it as an attachment above the chat input.
     */
    attachImageToComposer: (imageUrl: string, name: string) => Promise<void>;
}

const GalleryContext = createContext<GalleryContextValue | null>(null);

export const useGallery = (): GalleryContextValue | null => {
    return useContext(GalleryContext);
};

export const useGalleryRequired = (): GalleryContextValue => {
    const context = useContext(GalleryContext);
    if (!context) {
        throw new Error("useGalleryRequired must be used within a GalleryProvider");
    }
    return context;
};

interface GalleryProviderProps {
    children: ReactNode;
    attachImageToComposer: (imageUrl: string, name: string) => Promise<void>;
}

export const GalleryProvider: FC<GalleryProviderProps> = ({
    children,
    attachImageToComposer,
}) => {
    return (
        <GalleryContext.Provider value={{ attachImageToComposer }}>
            {children}
        </GalleryContext.Provider>
    );
};
