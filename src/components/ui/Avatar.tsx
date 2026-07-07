import { avatarColor } from "@/lib/badges";
import { iniciales } from "@/lib/format";

interface AvatarProps {
  nombre: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

export function Avatar({ nombre, size = "md" }: AvatarProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-heading font-semibold text-white shrink-0 ${SIZES[size]}`}
      style={{ backgroundColor: avatarColor(nombre) }}
      title={nombre}
    >
      {iniciales(nombre)}
    </span>
  );
}
