// src/config/site.ts
export const siteConfig = {
  name: "Bazaar Vid",
  description: "Create professional motion graphics videos with AI-powered scene generation",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://bazaar.it",
  ogImage: "/og-image.png",
  links: {
    twitter: "https://twitter.com/bazaarvid",
    github: "https://github.com/bazaar-vid/bazaar-vid",
  },
};
