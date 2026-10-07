import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * The site's buttons, on Base UI's.
 *
 * The variants name the classes style.css already draws these buttons with,
 * rather than restating them as utilities here: a utility outranks every rule
 * in the components layer, so shadcn's default classes would have repainted
 * the header and the code panels. With no utilities to reconcile, the classes
 * are joined rather than merged, which keeps tailwind-merge out of the bundle.
 */
const buttonVariants = cva('', {
  variants: {
    variant: {
      /** No look of its own: the class the caller passes carries it. */
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

export { Button, buttonVariants };
