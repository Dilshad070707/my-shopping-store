# MeeshooShopping deployment

This project is prepared for three Render services from the same GitHub repository:

## 1. Backend
- Service type: Web Service
- Build command: `npm install`
- Start command: `npm start`
- Required environment variables: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, and either `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`.
- Set `FRONTEND_URL` to the customer and admin frontend URLs, comma separated.
- Optional UPI variables: `UPI_ID`, `UPI_NAME`, `UPI_QR_URL`.

## 2. Customer website
- Service type: Static Site
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variables:
  - `VITE_SITE_MODE=customer`
  - `VITE_API_URL=https://YOUR-BACKEND.onrender.com`
- Attach your customer custom domain, for example `MeeshooShopping.com`.

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
