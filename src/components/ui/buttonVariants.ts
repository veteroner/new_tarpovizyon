/**
 * Button sınıf varyantları.
 *
 * `button.tsx`'ten AYRILDI: bir dosya hem bileşen hem başka şey dışa aktarınca
 * Vite'ın hızlı yenilemesi o dosyada çalışmıyor. shadcn'in özgün düzeninde
 * ikisi aynı dosyadadır; burada yenileme daha değerli.
 */
import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
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
