import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

// Variants name style.css classes, not utilities, which would outrank the
// components layer. Joined, not merged, so tailwind-merge stays out.
const buttonVariants = cva('', {
  variants: {
    variant: {
      bare: '',
      /** The square, bordered buttons in the header and the search panel. */
      icon: 'icon-button',
      /** The copy button in a code panel's corner. */
      copy: 'code-copy',
    },
  },
  defaultVariants: {
    variant: 'bare',
  },
});

function Button({
  className,
  variant,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({ variant, className: className as string })}
      {...props}
    />
  );
}

export { Button };
