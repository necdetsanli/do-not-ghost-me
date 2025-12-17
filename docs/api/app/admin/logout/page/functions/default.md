[**do-not-ghost-me**](../../../../../README.md)

***

# Function: default()

> **default**(): `Element`

Defined in: [src/app/admin/logout/page.tsx:19](https://github.com/necdetsanli/do-not-ghost-me/blob/2cf27d71497adc408791f4c93d855ac9fd7a3c78/src/app/admin/logout/page.tsx#L19)

Admin logout page.

When a user visits /admin/logout:
- performs a POST request to /api/admin/logout to clear the admin session
  cookie on the server, and
- redirects the user back to the public home page ("/").

This keeps the logout mechanics on the API side (where cookies are
managed) while providing a simple UX-friendly page.

## Returns

`Element`
