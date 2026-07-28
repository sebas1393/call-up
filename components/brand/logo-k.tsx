import {
  KORTUMO_PRODUCT_NAME,
} from "@/lib/brand/kortumo";

type LogoKProps = {
  /** Icon size in px */
  size?: number;
  /** Show wordmark next to the K */
  withWordmark?: boolean;
  className?: string;
  /** Kept for API compatibility with next/image call sites */
  priority?: boolean;
};

/**
 * Kortumo K mark (stand-in until Task 22 official vector).
 */
export function LogoK({
  size = 48,
  withWordmark = false,
  className = "",
}: LogoKProps) {
  return (
    <span
      className={`inline-flex items-center gap-3 ${className}`}
      aria-label={KORTUMO_PRODUCT_NAME}
    >
      {/* SVG via <img> — Task 22 may swap for optimized raster/official vector */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-k.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0"
        decoding="async"
      />
      {withWordmark ? (
        <span
          className="font-[family-name:var(--font-montserrat)] font-bold tracking-tight text-inherit"
          style={{ fontSize: Math.max(size * 0.42, 18) }}
        >
          {KORTUMO_PRODUCT_NAME}
        </span>
      ) : null}
    </span>
  );
}
