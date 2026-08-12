import type { ButtonHTMLAttributes } from "react";
import { buttonStyles, type ButtonVariant, type ButtonSize } from "./buttonStyles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return <button className={buttonStyles(variant, size, className)} {...props} />;
}
