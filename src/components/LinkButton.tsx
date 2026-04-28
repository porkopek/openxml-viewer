import type { ButtonHTMLAttributes } from 'react';

interface LinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function LinkButton({ active = false, className = '', type = 'button', ...props }: LinkButtonProps) {
  const classes = [
    'text-sm text-zinc-600 underline-offset-4 transition hover:text-zinc-950 hover:underline',
    'disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline',
    active ? 'text-zinc-950 underline' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classes} {...props} />;
}
