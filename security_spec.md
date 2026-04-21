# Security Specification for Librería "El Estudiante"

## 1. Data Invariants
- Products must have a valid name, category, price >= 0, and stock >= 0.
- Only authenticated administrators can write to the `/products/` and `/admins/` collections.
- Any user (even unauthenticated) can read the `/products/` collection to browse the catalog.
- Administrators are defined in the `/admins/` collection by their UID.

## 2. The "Dirty Dozen" Payloads (WIP)
- Payload 1: Unauthorized user trying to create a product. (Expected: DENIED)
- Payload 2: Admin creating a product with negative price. (Expected: DENIED)
- Payload 3: Admin creating a product with negative stock. (Expected: DENIED)
- Payload 4: Admin updating a product's name to a 2MB string. (Expected: DENIED)
- Payload 5: User trying to elevate themselves to admin by writing to `/admins/`. (Expected: DENIED)
- Payload 6: Admin creating a product missing the 'category' field. (Expected: DENIED)
- Payload 7: Admin updating a product and injecting a hidden 'hacker' field. (Expected: DENIED)
- Payload 8: Admin setting 'imageUrl' to a non-URL string. (Expected: DENIED)
- Payload 9: Unauthorized user trying to delete a product. (Expected: DENIED)
- Payload 10: Admin setting 'createdAt' to a client-side timestamp instead of server time. (Expected: DENIED)
- Payload 11: Admin deleting the 'price' field on update. (Expected: DENIED)
- Payload 12: Admin updating 'role' in the admin document. (Expected: DENIED)

## 3. Test Runner
(Tests would be implemented in `firestore.rules.test.ts` if needed for further validation)
