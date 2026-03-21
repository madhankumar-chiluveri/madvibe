import { cn } from "@/lib/utils";

interface AppIconProps {
  className?: string;
  alt?: string;
}

export function AppIcon({ className, alt = "MADVERSE" }: AppIconProps) {
  return (
    <img
      src="/app-icon.png"
      alt={alt}
      className={cn("shrink-0 rounded-2xl object-cover", className)}
    />
  );
}
