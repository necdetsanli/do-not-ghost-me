# Privacy Policy

_Last updated: 2025-12-10_

This document describes how **Do Not Ghost Me** handles data when you use the public instance of the service, and what you should be aware of if you **self-host** this project.

> ⚠️ **Not legal advice**  
> This document is written by a developer, not a lawyer. If you run this project in production or in a regulated environment, you are responsible for ensuring that your deployment complies with applicable laws (e.g. GDPR, local privacy regulations) and for adapting this policy accordingly.

---

## 1. What this project does

Do Not Ghost Me lets job seekers submit **anonymous reports** about companies that ghost candidates during the hiring process. The focus is on **patterns and aggregated statistics** about company behaviour – not on identifying or tracking individual people.

There are **no user accounts** and the application is designed to minimise the amount of personal data that is collected.

---

## 2. Data we collect when you submit a report

When you submit a report through the main form, the application stores the following information in the database:

### 2.1. Report content

- **Company name** (free-text, e.g. “Example Corp”)
- **Country** of the company (selected from a fixed list)
- **Stage** of the process where ghosting happened  
  (e.g. application, screening, interview, offer; chosen from predefined enums)
- **Job level / seniority**  
  (e.g. intern, junior, mid, senior; chosen from predefined enums)
- **Position category**  
  (e.g. software engineering, data, product; chosen from predefined enums)
- **Position detail**  
  (short free-text label such as “Backend Developer”)
- **Days without reply (optional)**  
  (a number like 30, if you choose to provide it)

These fields are used to build **aggregated statistics** (e.g. number of reports per company, by country, by stage, etc.) and to power the **“Top companies”** page.

### 2.2. Technical metadata and rate limiting

To prevent spam and abuse, the backend applies rate limiting when reports are submitted. For that purpose, it may store:

- A **salted hash of your IP address** tied to:
  - the company you reported,
  - the position category / detail, and
  - a **per-day bucket** (e.g. “2025-12-10”).
- Timestamps and counters indicating how many reports have been submitted from the same IP hash in a given period.

The hashing is done with a **secret salt** so that raw IP addresses are not stored in the application database for rate-limit checks. However, because the hash is derived from your IP, it may still be considered personal data in some jurisdictions.

### 2.3. Logs

For operations, debugging and abuse detection, server-side logs may temporarily include:

- Your **IP address** (as provided by the reverse proxy / platform),
- Your **user agent** (browser + OS information),
- Basic request metadata (HTTP method, URL path, status code),
- Error details when something goes wrong (e.g. invalid JSON, validation errors, rate-limit violations).

These logs are used to:

- Keep the service stable and secure,
- Investigate and mitigate abuse or automated spam,
- Diagnose bugs and improve the project.

If you self-host, you can configure your logging stack to **anonymise or drop IPs** according to your own privacy requirements.

---

## 3. What we deliberately do _not_ collect

The project is intentionally designed to avoid collecting unnecessary personal data. In particular, the application:

- Does **not** ask you for:
  - Your name or surname,
  - Your email address or phone number,
  - Your CV, LinkedIn profile, or other identity-linking details.
- Does **not** create user accounts or persistent profiles for candidates.
- Does **not** ask you to upload attachments or documents.
- Does **not** include third-party tracking pixels or ad networks by default
  (no Google Analytics, no social media pixels, etc.).

If you voluntarily include personal information in free-text fields (e.g. company name, position detail), it may be stored in the database as part of the report. You should **avoid including any personal identifiers** about yourself or other individuals.

---

## 4. Cookies and local storage

By default:

- The **public site** does not set any application cookies for regular visitors.
- The **admin area** (restricted to maintainers) uses a **signed, HttpOnly cookie** to store a random session token for authenticated admin users. This token is only used to verify that an admin is logged in; it does not store personal information about regular visitors.

If you deploy this project behind other services (e.g. reverse proxies, analytics tools, SSO providers), those services may set their own cookies. In that case, their privacy policies will also apply.

---

## 5. How data is used

Collected data is used for:

- **Aggregated statistics** and rankings on `/top-companies`,
- **Basic rate limiting** to protect the service from abuse,
- **Security and operations** (via logs),
- **Moderation** in the admin panel (e.g. flagging or removing problematic reports).

Individual reports are **not** exposed with candidate identities. Admins can:

- Review reports (company, stage, category, etc.),
- Flag or remove reports that are clearly abusive, spam, or unsafe.

---

## 6. Data retention

The default open-source implementation does **not** enforce strict automatic deletion policies. In general:

- **Reports** may be stored indefinitely, because long-term data is needed to see trends over time.
  - Admins can mark reports as **active**, **flagged**, or **deleted**.
  - Deleted reports are excluded from public statistics but may be kept for audit / moderation history.
- **Rate-limit entries** (salted IP hashes) are keyed by date; the database schema allows for periodic cleanup of old entries, but the concrete retention period depends on how the maintainer configures their environment and maintenance routines.
- **Logs** are stored according to the logging configuration of the deployment (e.g. container logs, platform logs). In the public open-source code, there is no mandatory central log storage.

If you operate your own instance, you should:

- Define log retention policies that fit your compliance needs,
- Periodically delete old rate-limit and report data if required by law or policy,
- Update this document to reflect your actual retention behaviour.

---

## 7. Self-hosting this project

If you deploy your own instance of Do Not Ghost Me, you become the **data controller** for that deployment. This means:

- You are responsible for:
  - Providing your own privacy notice to your users,
  - Configuring database, logging, and analytics in a privacy-respecting way,
  - Complying with local laws and regulations.
- The default codebase:
  - Uses PostgreSQL and Prisma for storage,
  - Implements rate limiting with salted IP hashes,
  - Provides no built-in third-party analytics.

You are free to modify the code (subject to the project’s license) and the privacy practices, but you must also update your own privacy documentation accordingly.

---

## 8. Third-party services

The core application does not depend on external analytics or ad providers. However, a deployment may be hosted on third-party infrastructure (e.g. a cloud provider, managed Postgres service, logging or monitoring platforms). Those providers may process:

- IP addresses and network metadata,
- Minimal connection logs,
- Resource usage metrics.

Their privacy policies will apply in addition to this document.

---

## 9. Changes to this document

This Privacy Policy may be updated from time to time to reflect:

- Changes in the codebase (e.g. new features or data fields),
- Changes in how the public instance is operated,
- Feedback or legal requirements.

When the public instance is updated in a way that significantly changes data handling, the “Last updated” date at the top of this document will be changed.

---

## 10. Contact

For questions about this project or the public instance:

- Open an issue in the GitHub repository:  
  `https://github.com/necdetsanli/do-not-ghost-me`

If you self-host this project, you should replace this section with your own contact details (e.g. email address or contact form) so that users of your instance can reach you regarding privacy questions or data rights.
