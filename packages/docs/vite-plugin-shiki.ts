import { bundledLanguages, codeToHtml, type BundledLanguage } from 'shiki';
import type { Plugin } from 'vite';

/**
 * Syntax-highlights the code samples in index.html at build time.
 *
 * Highlighting happens in `transformIndexHtml`, so the shipped page is plain
 * coloured markup: no highlighter in the bundle, and no flash of unstyled code
 * before it runs. Blocks opt in with `data-lang` on the `<pre>` — anything
 * without it (the `.code-inline` spans, say) is left exactly as authored.
 */

/*
 * Shiki writes both themes' colours as CSS variables on every token and
 * style.css picks one under `prefers-color-scheme` — the same mechanism the
 * rest of the site's dark mode rides on, so there is no theme state to sync.
 */
const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

/**
 * Prettier keeps a `<pre>`'s attributes on their own lines but never breaks the
 * `><code>` seam, since whitespace there would land in the rendered output —
 * hence `[^>]*` across newlines for the attributes, but an exact match after.
 */
const CODE_BLOCK = /<pre\b([^>]*)><code>([\s\S]*?)<\/code><\/pre>/g;

const isBundledLanguage = (lang: string): lang is BundledLanguage =>
  lang in bundledLanguages;

/** Undoes the escaping the sample needs to sit in HTML in the first place. */
const decodeEntities = (html: string) =>
  html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    // Last, so that an escaped `&amp;lt;` survives as the text `&lt;`.
    .replace(/&amp;/g, '&');

export const shikiCodeBlocks = (): Plugin => ({
  name: 'keyrove-docs:shiki-code-blocks',
  transformIndexHtml: {
    order: 'pre',
    async handler(html) {
      const blocks = [...html.matchAll(CODE_BLOCK)];

      const highlighted = await Promise.all(
        blocks.map(async ([, attrs, code]) => {
          const lang = attrs.match(/\bdata-lang="([^"]*)"/)?.[1];
          if (lang === undefined) return null;

          if (!isBundledLanguage(lang)) {
            throw new Error(
              `[shiki-code-blocks] Unknown data-lang="${lang}". Use a language bundled with Shiki.`,
            );
          }

          const classes = attrs.match(/\bclass="([^"]*)"/)?.[1] ?? '';

          return codeToHtml(decodeEntities(code), {
            lang,
            themes: THEMES,
            // Emit the CSS variables only — with no default colour baked in,
            // the media query is what decides which theme applies.
            defaultColor: false,
            transformers: [
              {
                pre(node) {
                  // Carry the authored classes over and drop Shiki's inline
                  // background, so the block keeps the site's panel styling and
                  // its own spacing; only the tokens inside get themed.
                  node.properties.class = `${classes} ${node.properties.class}`;
                  node.properties['data-lang'] = lang;
                  delete node.properties.style;
                },
              },
            ],
          });
        }),
      );

      // Splice from the back, so each replacement leaves earlier offsets intact.
      return blocks.reduceRight((out, block, i) => {
        const replacement = highlighted[i];
        if (replacement === null) return out;

        const start = block.index;
        return (
          out.slice(0, start) + replacement + out.slice(start + block[0].length)
        );
      }, html);
    },
  },
});
