4Sworks static business website
===============================

FILES
- index.html: main page and SEO metadata
- styles.css: responsive blue-and-white design
- script.js: mobile navigation and enquiry form setup
- assets/4sworks-logo.png: generated 4Sworks logo
- robots.txt and sitemap.xml: starter files for search engines

BEFORE PUBLISHING (IMPORTANT)
1. Open script.js and replace BUSINESS_EMAIL with the real business email.
2. Replace the placeholder phone and WhatsApp variables. (The current page does not display a fake phone number; add real details to the contact section/footer when available.)
3. Open index.html and replace https://YOUR-DOMAIN.example in the JSON-LD schema with your real HTTPS domain.
4. Replace YOUR-DOMAIN.example in robots.txt and sitemap.xml with your real domain.
5. Replace the illustrative stock gallery images with actual 4Sworks work photos when possible. Do not present stock photos as completed company projects.
6. Confirm the exact towns/districts served, working hours, and the business contact details before launch.

PREVIEW LOCALLY
Open index.html in a modern browser. Internet is needed for the external stock photos and Google Fonts.

PUBLISH FREE ON VERCEL
1. Create/sign in to GitHub at https://github.com and create a new public repository named 4sworks-website.
2. Upload all files and the assets folder from this directory to the repository root (do not upload the ZIP itself).
3. Sign in at https://vercel.com, choose Add New > Project, import the repository and deploy. This is a plain static HTML site; no build command is needed.
4. Vercel gives you a public *.vercel.app URL. Test it on phone and desktop.
5. To use a custom domain, buy one from a registrar, then add it in Vercel > Project > Settings > Domains and follow the DNS instructions. Domain registration/renewal is paid; hosting can remain on the free tier subject to provider terms.

GOOGLE SEARCH CHECKLIST
1. Publish the site and make sure it opens without login.
2. Add the final domain to Google Search Console: https://search.google.com/search-console/ and complete verification.
3. Submit https://YOUR-DOMAIN.example/sitemap.xml after replacing the placeholder domain.
4. Use URL Inspection on the homepage and request indexing. Google says crawling can take days to weeks and indexing/ranking is not guaranteed.
5. Create/claim a Google Business Profile at https://business.google.com/. For a service-area business, set only the areas genuinely served. If customers are not served at a staffed storefront, do not display a home address publicly; configure the profile as a service-area business and follow Google's current verification rules.
6. Use the real business name consistently. Add genuine photos, business hours, phone, services and updates. Never buy fake reviews or stuff location keywords into the business name.

CONTACT FORM LIMITATION
This is a static website. The demo form opens the visitor's email application (mailto) after you configure BUSINESS_EMAIL. It does not store submissions or send them to a server. If you need submissions to work for every visitor regardless of their email-app setup, add a form service or backend later.
