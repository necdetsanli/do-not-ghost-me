// postcss.config.mjs

/**
 * PostCSS configuration for the application.
 *
 * - Uses the official Tailwind CSS v4 PostCSS plugin.
 * - Delegates all Tailwind processing (including nesting & autoprefixing)
 *   to `@tailwindcss/postcss`.
 *
 * If you ever need additional PostCSS transforms (e.g. custom
 * post-processing, legacy browser support tweaks), add them to the
 * `plugins` object below in a controlled manner.
 *
 * @type {import('postcss-load-config').Config}
 */
const config = {
  plugins: {
    /**
     * Tailwind v4 PostCSS plugin.
     *
     * This replaces the older manual `tailwindcss`+`autoprefixer`
     * pipeline from Tailwind v3. Keep this as the first plugin so any
     * additional plugins you add later run on the Tailwind output.
     */
    "@tailwindcss/postcss": {},
  },
};

export default config;
