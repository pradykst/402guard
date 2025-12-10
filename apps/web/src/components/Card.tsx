import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
}

export function Card({ children, className = '', title }: CardProps) {
    return (
        <div className={`bg-card border border-card-border rounded-lg p-6 hover:border-zinc-600 transition-colors ${className}`}>
            {title && <h3 className="text-xl font-bold text-white mb-2">{title}</h3>}
            {children}
        </div>
    );
}
