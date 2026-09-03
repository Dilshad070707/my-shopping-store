# MeeshooShopping deployment

This project is prepared for three Render services from the same GitHub repository:

## 1. Backend
- Service type: Web Service
- Build command: `npm install`
- Start command: `npm start`
- Required environment variables: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, and either `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`.
- Set `FRONTEND_URL` to the customer and admin frontend URLs, comma separated.
- Optional UPI variables: `UPI_ID`, `UPI_NAME`, `UPI_QR_URL`.
- Customer email OTP variables: `RESEND_API_KEY` and `MAIL_FROM` (required for OTP login).

## 2. Customer website
- Service type: Static Site
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variables:
  - `VITE_SITE_MODE=customer`
  - `VITE_API_URL=https://YOUR-BACKEND.onrender.com`
- Attach your customer custom domain, for example `MeeshooShopping.com`.
- Add Render Rewrite: `/*` → `/index.html` so direct product URLs like `/product/iphone-15` work after refresh and from Instagram.

## 3. Admin website
- Service type: Static Site
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variables:
  - `VITE_SITE_MODE=admin`
  - `VITE_API_URL=https://YOUR-BACKEND.onrender.com`
- Attach a separate admin domain/subdomain, for example `admin.MeeshooShopping.com`.

The customer build contains no Admin navigation. The admin build opens only the Admin Panel.

## Product / homepage features
- Unlimited-style multiple product image fields (no old 8-image application limit; request size is the practical limit).
- Best Selling, New Arrival and Featured flags are controlled from Admin.
- Homepage offer popup and Best Selling title are controlled from Admin.
- Admin login attempts are rate-limited and recorded with time, IP, email, status and user agent.

## Images / banners
- Product photos are uploaded directly from the Admin product form; no image URL is required.
- Homepage banners are uploaded directly from Admin as separate Desktop and Mobile photos; no image URL is required.
- Images are selected directly from the device and compressed in the browser before being saved in the existing product/homepage records. No external image URL is required. For very large catalogs, move image storage to object storage/CDN before scaling production.


## Important production checks
- Do not commit `.env` or real secrets to GitHub.
- Keep a PostgreSQL backup before the first deployment after schema changes.
- On the customer Render Static Site add Rewrite `/*` -> `/index.html` so `/product/<slug>` works on refresh and from Instagram.
- Product/banner images are selected directly from the device, compressed in the browser and stored in the existing application records. For a large catalog, migrate image storage to object storage/CDN before scaling.
- Test one complete path after deployment: category -> product -> direct refresh -> add to cart -> address -> UPI/UTR -> order -> admin verification.

## Customer login
- Customer login uses email OTP. The backend sends a 6-digit OTP, valid for 10 minutes, with a maximum of 5 verification attempts.
- Configure `RESEND_API_KEY` and `MAIL_FROM` on the backend before testing customer login.
