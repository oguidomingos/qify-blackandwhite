# Page snapshot

```yaml
- alert
- dialog "Server Error":
  - navigation:
    - button "previous" [disabled]:
      - img "previous"
    - button "next" [disabled]:
      - img "next"
    - text: 1 of 1 error Next.js (14.2.8) is outdated
    - link "(learn more)":
      - /url: https://nextjs.org/docs/messages/version-staleness
  - heading "Server Error" [level=1]
  - paragraph: "Error: Cannot find module './vendor-chunks/@clerk.js' Require stack: - /Users/oguidomingos/qify/.next/server/webpack-runtime.js - /Users/oguidomingos/qify/.next/server/app/(auth)/sign-in/[[...sign-in]]/page.js - /Users/oguidomingos/qify/node_modules/next/dist/server/require.js - /Users/oguidomingos/qify/node_modules/next/dist/server/load-components.js - /Users/oguidomingos/qify/node_modules/next/dist/build/utils.js - /Users/oguidomingos/qify/node_modules/next/dist/server/dev/static-paths-worker.js - /Users/oguidomingos/qify/node_modules/next/dist/compiled/jest-worker/processChild.js"
  - text: This error happened while generating the page. Any console logs will be displayed in the terminal window.
  - heading "Call Stack" [level=2]
  - group:
    - img
    - img
    - text: Next.js
  - heading "Array.reduce" [level=3]
  - text: <anonymous>
  - group:
    - img
    - img
    - text: Next.js
```