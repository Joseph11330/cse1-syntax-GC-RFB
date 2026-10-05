import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  block?: boolean;
}
export default function Button({ variant = 'primary', loading, block, children, disabled, className = '', ...rest }: Props) {
  return (
    <button className={`btn btn--${variant} ${block ? 'btn--block' : ''} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? 'Please wait…' : children}
    </button>
  );
}
