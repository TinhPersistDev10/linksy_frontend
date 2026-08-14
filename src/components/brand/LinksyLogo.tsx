import Image from "next/image";

type Props = {
  variant?: "icon" | "wordmark";
  theme?: "light" | "dark"; // nền phía sau logo
  size?: number;            // chiều cao icon
  className?: string;
};

export function LinksyLogo({
  variant = "icon",
  theme = "light",
  size = 40,
  className,
}: Props) {
  if (variant === "wordmark") {
    const src =
      theme === "light"
        ? "/brand/logo-wordmark-dark.png"   // nền sáng → chữ tối
        : "/brand/logo-wordmark-light.png"; // nền tối → chữ sáng
    return (
      <Image
        src={src}
        alt="Linksy"
        width={Math.round(size * 3.6)}
        height={size}
        className={className}
        priority
      />
    );
  }

  return (
    <Image
      src="/brand/logo-icon-transparent.png"
      alt="Linksy"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}