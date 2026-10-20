# Social preview images

Link-preview (Open Graph) images for Qlossary, one per platform, in
`static/og/`. The build copies them to `dist/og/`, so they are served at
`https://qlossary.pages.dev/og/<name>.png`.

| File | Size | Platform | How it is used |
| --- | --- | --- | --- |
| `twitter.png` | 1200 × 600 (2:1) | X / Twitter | `twitter:image` in the page, `summary_large_image` card. |
| `facebook.png` | 1200 × 630 (1.91:1) | Facebook, and the default | `og:image` in the page. Also what Discord, Reddit, Slack, WhatsApp and others show for a shared link. |
| `linkedin.png` | 1200 × 627 (1.91:1) | LinkedIn | LinkedIn reads `og:image` (`facebook.png`) for links; use this file when uploading an image to a LinkedIn post or page. |
| `discord.png` | 1200 × 630 | Discord | Same ratio as `og:image`, with larger text and three leaderboard rows, because Discord shows embeds small. Use it when posting the image in a server or as a server banner. |
| `reddit.png` | 1200 × 628 | Reddit | Logo, title and tagline sit in the centre square, because Reddit crops feed thumbnails to it. Use it for image posts or as the link thumbnail. |

A page can only name one `og:image`, so link previews on Facebook, LinkedIn,
Discord and Reddit all use `facebook.png`; it is designed to work on all of
them. The other files are for uploading by hand where a platform allows it.

## Safe zones

Everything important (logo, title, tagline, leaderboard, web address) stays at
least 64 px inside every edge, so nothing is lost to rounded corners, overlays
or small ratio differences. On `reddit.png` the logo and title also fit inside
the centre 628 × 628 square. Open the template with `&guides=1` to see the
zones drawn on the image.

## Changing or regenerating them

The images are drawn by `template.html` (plain HTML and CSS in the site's own
style, using the fonts in `static/fonts/`). Open it in a browser with these
parameters, set the window (or a screenshot tool) to exactly the size, and
save a PNG of the card into `static/og/`:

    template.html?w=1200&h=600&layout=wide          -> twitter.png
    template.html?w=1200&h=630&layout=wide          -> facebook.png
    template.html?w=1200&h=627&layout=wide          -> linkedin.png
    template.html?w=1200&h=630&layout=wide&big=1    -> discord.png
    template.html?w=1200&h=628&layout=center        -> reddit.png

After changing them, rename the files (or add `?v=2` to the URLs in
`src/index.html`) so platforms that cached the old preview fetch the new one.
Facebook's Sharing Debugger, LinkedIn's Post Inspector and X's card preview can
also refresh a cached preview.

The leaderboard names in the images are examples, not real players.
