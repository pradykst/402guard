import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed font-medium";

    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white border border-transparent",
        secondary: "bg-zinc-800 hover:bg-zinc-700 text-white border border-transparent",
        outline: "bg-transparent border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white",
        ghost: "bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    const activeVariant = variants[variant] || variants.primary;
    const activeSize = sizes[size] || sizes.md;

    return (
        <button
            className={`${baseStyles} ${activeVariant} ${activeSize} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
