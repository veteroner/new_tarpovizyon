import { buttonVariants } from './buttonVariants';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';

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

export { Button };
