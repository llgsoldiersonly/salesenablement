interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  size?: number;
  alt?: string;
}

export function Logo({
  variant = "mark",
  className = "",
  size,
  alt = "Legal Leads Sales Slayers",
}: LogoProps) {
  const src = variant === "full" ? "/logo.png" : "/logo-square.png";
  const style: React.CSSProperties = size
    ? variant === "full"
      ? { height: size, width: "auto" }
      : { height: size, width: size }
    : {};

  return (
    <img
      src={src}
      alt={alt}
      className={["select-none", className].filter(Boolean).join(" ")}
      style={style}
      draggable={false}
    />
  );
}
