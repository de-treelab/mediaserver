import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { twMerge } from "tailwind-merge";
import { inputBase } from "./styles";

const sizes = {
  md: "w-full px-3 py-2 text-sm",
  sm: "px-2 py-1 text-xs",
};

type Size = keyof typeof sizes;

export const Input = ({
  className,
  inputSize = "md",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { inputSize?: Size }) => (
  <input
    {...props}
    className={twMerge(inputBase, sizes[inputSize], className)}
  />
);

export const Textarea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={twMerge(inputBase, sizes.md, "resize-none", className)}
  />
);

export const Select = ({
  className,
  inputSize = "md",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { inputSize?: Size }) => (
  <select
    {...props}
    className={twMerge(
      inputBase,
      sizes[inputSize],
      "cursor-pointer",
      className,
    )}
  />
);

type FormFieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

export const FormField = ({
  label,
  hint,
  htmlFor,
  children,
  className,
}: FormFieldProps) => (
  <div className={twMerge("flex flex-col gap-1.5", className)}>
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium text-text-secondary"
    >
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-text-muted">{hint}</p>}
  </div>
);
