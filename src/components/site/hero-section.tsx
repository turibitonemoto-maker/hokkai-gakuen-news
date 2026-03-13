
'use client';

import * as React from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface HeroSectionProps {
  images: any[];
}

export function HeroSection({ images }: HeroSectionProps) {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  const displayImages = images.length > 0 ? images : [
    { imageUrl: "https://picsum.photos/seed/hokkai1/1200/600", title: "北海学園大学 キャンパス" }
  ];

  return (
    <section className="relative w-full overflow-hidden bg-slate-900 h-[400px] md:h-[550px]">
      <Carousel
        plugins={[plugin.current]}
        className="w-full h-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent className="h-full">
          {displayImages.map((image, index) => (
            <CarouselItem key={image.id || index} className="relative w-full h-full">
              <div className="relative w-full h-[400px] md:h-[550px]">
                <Image
                  src={image.imageUrl}
                  alt={image.title || ""}
                  fill
                  className="object-cover opacity-70"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 max-w-7xl mx-auto w-full">
                  <div className="max-w-2xl animate-in slide-in-from-bottom-8 duration-700">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                      {image.title || "真実を伝え、未来を創る。"}
                    </h2>
                    <p className="text-lg text-slate-200 font-medium drop-shadow-md">
                      北海学園大学一部新聞会が届ける、キャンパスの今。
                    </p>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="absolute bottom-8 right-16 flex gap-2">
          <CarouselPrevious className="static translate-y-0 bg-white/20 border-white/30 text-white hover:bg-white hover:text-primary" />
          <CarouselNext className="static translate-y-0 bg-white/20 border-white/30 text-white hover:bg-white hover:text-primary" />
        </div>
      </Carousel>
    </section>
  );
}
