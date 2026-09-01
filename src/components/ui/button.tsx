import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

/**
 * shadcn/ui Button.
 *
 * ─── SÖZLEŞME AYNI, RENKLER FARKLI ──────────────────────────────────────────
 * Dışa açılan yüzey shadcn'in standardıyla birebir: `variant`, `size`,
 * `asChild`, `buttonVariants`. Yani yukarıdaki bileşenler hiçbir değişiklik
 * olmadan çalışır.
 *
 * DEĞİŞEN tek şey sınıfların hangi renge bağlandığı. shadcn varsayılanı
 * `bg-primary` / `text-primary-foreground` gibi semantik token'lar bekler;
 * bu projenin Tailwind teması Rasyon'la PAYLAŞILIYOR ve orada `primary` bir
 * SKALA (`primary-600`). `primary`yi tek renge çevirmek Rasyon'daki her
 * `bg-primary-600` kullanımını bozardı.
 *
 * Bu yüzden varyantlar `src/styles/marka-tokens.css` içindeki `--tv-*`
 * değişkenlerine keyfi değerlerle bağlandı. Tema dosyasına dokunulmadı.
 *
 * ─── İTHALAT NOTU ───────────────────────────────────────────────────────────
 * `@/lib/utils` DEĞİL, göreli yol kullanıldı: bu depoda `@` takma adı
 * `src/rasyon`'a çözülüyor (vite.config.ts), `src`'ye değil. `@/lib/utils`
 * yazmak `src/rasyon/lib/utils` arar ve derleme kırılır.
 */

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-vurgu)] focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-[var(--tv-zemin)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--tv-vurgu)] text-[var(--tv-vurgu-ust)] hover:bg-[var(--tv-vurgu-koyu)]',
        destructive: 'bg-[#c0392b] text-white hover:bg-[#a5301f]',
        outline:
          'border border-[var(--tv-cizgi)] bg-transparent text-[var(--tv-murekkep)] hover:bg-[var(--tv-vurgu-sis)]',
        secondary:
          'bg-[var(--tv-zemin-2)] text-[var(--tv-murekkep)] hover:bg-[var(--tv-cizgi)]',
        ghost: 'text-[var(--tv-murekkep)] hover:bg-[var(--tv-vurgu-sis)]',
        link: 'text-[var(--tv-vurgu)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 px-4 text-[13px]',
        lg: 'h-12 px-7 text-[17px]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
