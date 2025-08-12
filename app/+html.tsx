import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background fills viewport and switches with our app color mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
/* Ensure the whole page fills the viewport and inherits background */
html, body { height: 100%; min-height: 100%; }
#root, #app, #__next, body > div { min-height: 100%; background: inherit; }

/* CSS variable driven background, can be overridden at runtime */
:root { --app-bg: #ffffff; }
html[data-theme='dark'], body[data-theme='dark'] { --app-bg: #0b0b0b; }

/* Apply background everywhere with high priority */
html, body, #root, #app, #__next, body > div { background-color: var(--app-bg) !important; }

/* Fallback to system preference for first paint before JS runs */
@media (prefers-color-scheme: dark) {
  html:not([data-theme]), body:not([data-theme]) { background-color: #0b0b0b !important; }
}
`;
