import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/w/", "/setup", "/settings", "/sso-callback", "/dm/", "/invite/"],
      },
    ],
    sitemap: "https://tryportal.app/sitemap.xml",
  };
}
