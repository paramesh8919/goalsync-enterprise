import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#2952E3" />
        <meta name="description" content="GoalSync Enterprise — goal and performance management platform" />
        <link rel="icon" href="/favicon.svg" />

        {/* PWA / "Add to Home Screen" support (Android + iOS) */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GoalSync" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
