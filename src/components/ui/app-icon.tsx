import { cn } from "@/lib/utils";

interface AppIconProps {
  className?: string;
  alt?: string;
  variant?: "default" | "loader";
}

export function AppIcon({
  className,
  alt = "MadVibe",
  variant = "default",
}: AppIconProps) {
  return (
    <img
      src={variant === "loader" ? "/app-icon-loader.svg" : "/app-icon.svg"}
      alt={alt}
      className={cn(
        "shrink-0 rounded-2xl",
        variant === "loader" ? "object-contain" : "object-cover",
        className
      )}
    />
  );
}
