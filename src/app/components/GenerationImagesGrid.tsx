"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useMediaQuery } from "usehooks-ts";
import { Maximize2 } from "lucide-react";

interface GenerationImage {
  id: string;
  image_url: string;
  prompt: string;
}

interface GenerationImagesGridProps {
  images: GenerationImage[];
  className?: string;
}

export default function GenerationImagesGrid({ images, className = "" }: GenerationImagesGridProps) {
  const [selectedImage, setSelectedImage] = useState<GenerationImage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!images || images.length === 0) {
    return null;
  }

  const handleImageClick = (image: GenerationImage) => {
    setSelectedImage(image);
    setModalOpen(true);
  };

  return (
    <>
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 ${className}`}>
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => handleImageClick(image)}
          >
            <img
              src={image.image_url}
              alt={image.prompt}
              className="w-full h-full object-cover"
            />
            
            {/* Hover overlay with view icon */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Maximize2 className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal/Drawer for full image view */}
      {isMobile ? (
        <Drawer open={modalOpen} onOpenChange={setModalOpen}>
          <DrawerContent className="max-h-[90vh] overflow-hidden rounded-t-[20px]">
            <DrawerTitle asChild>
              <VisuallyHidden>Generation Image</VisuallyHidden>
            </DrawerTitle>
            <DrawerDescription asChild>
              <VisuallyHidden>View generation image in full size</VisuallyHidden>
            </DrawerDescription>
            <div className="flex flex-col h-full overflow-auto">
              <div className="relative w-full bg-muted mb-2 h-64 flex items-center justify-center flex-shrink-0 rounded-t-[20px] overflow-hidden">
                {/* Perfect Glow Effect - Multiple layers for depth */}
                <div className="absolute inset-0 bg-glow-multi blur-3xl scale-150 opacity-60"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 blur-2xl scale-125 opacity-80"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-primary/25 via-transparent to-primary/15 blur-xl scale-110 opacity-70"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 blur-lg scale-105 opacity-60"></div>
                <div className="absolute inset-0 bg-gradient-to-bl from-primary/15 via-transparent to-primary/5 blur-md scale-100 opacity-50"></div>
                
                {/* Enhanced radial glow for center focus */}
                <div className="absolute inset-0 bg-glow-primary blur-3xl scale-150 opacity-40 glow-animation"></div>
                
                {/* Subtle animated glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-sm scale-110 opacity-30 animate-pulse"></div>
                
                {/* Additional ambient glow */}
                <div className="absolute inset-0 bg-radial-gradient blur-2xl scale-120 opacity-30"></div>
                
                <img 
                  src={selectedImage?.image_url} 
                  alt={selectedImage?.prompt} 
                  className="relative z-10 object-cover w-full h-full rounded-md shadow-2xl"
                />
              </div>
              
              {/* Image details */}
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Prompt:</p>
                <p className="text-sm font-medium">{selectedImage?.prompt}</p>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="w-full max-w-4xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto m-0">
            <DialogTitle asChild>
              <VisuallyHidden>Generation Image</VisuallyHidden>
            </DialogTitle>
            <DialogDescription asChild>
              <VisuallyHidden>View generation image in full size</VisuallyHidden>
            </DialogDescription>
            <div className="relative w-full aspect-[16/9] bg-muted mb-0">
              <img 
                src={selectedImage?.image_url} 
                alt={selectedImage?.prompt} 
                className="object-cover w-full h-full rounded-md" 
              />
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Prompt:</p>
              <p className="text-sm font-medium">{selectedImage?.prompt}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 