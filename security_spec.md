# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: All unmatched paths in Firestore are strictly denied (`allow read, write: if false;`).
2. **Verified Identity**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Admin Authorization (`isAdmin()`)**: Admin rights are granted only if `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` OR the authenticated user's verified email matches the bootstrapped owner email (`request.auth.token.email == 'weply.my.id@gmail.com' && request.auth.token.email_verified == true`).
4. **StoreProduct (`/storeProducts/{productId}`)**:
   - Public `get` and `list` allowed so visitors can browse the store catalog.
   - Only `isAdmin()` can `create` or `delete` products.
   - `update` is restricted to `isAdmin()` OR tightly scoped customer actions (`stockCount`, `updatedAt` on purchase/refund, or `ratingAvg`, `ratingCount`, `updatedAt` on rating submission) wrapped in `isValidStoreProduct(incoming())` with immutable `title`, `category`, `description`, `price`, `durationLabel`, `badge`, `createdAt`.
5. **StoreStockItem (`/storeStock/{stockId}`)**:
   - Contains sensitive account credentials (`accountEmail`, `accountPassword`).
   - Only `isAdmin()` can `create` or `delete` stock items.
   - `get` and `list` are restricted to `isAdmin()`, the `buyerUid` who purchased the stock (`resource.data.buyerUid == request.auth.uid`), or verified signed-in buyers querying available stock (`resource.data.status == 'available'`) during checkout.
   - Customer `update` is strictly locked to claiming an `'available'` stock item (`resource.data.status == 'available'`, transitioning to `status == 'sold'`, `buyerUid == request.auth.uid`, `updatedAt == request.time`) with immutable `productId`, `productTitle`, `accountEmail`, `accountPassword`, `accountNotes`, `createdAt`.
6. **StoreOrder (`/storeOrders/{orderId}`)**:
   - Contains PII (`buyerEmail`, `deliveredEmail`, `deliveredPassword`).
   - `get` and `list` are strictly restricted to `resource.data.buyerUid == request.auth.uid || isAdmin()`.
   - `create` requires `incoming().buyerUid == request.auth.uid`, `incoming().status == 'paid'`, `incoming().rating == 0`, `incoming().createdAt == request.time`, `incoming().updatedAt == request.time`, and `exists(/databases/$(database)/documents/storeProducts/$(incoming().productId))`.
   - `update` requires `isValidStoreOrder(incoming())` and splits into explicit actions:
     - **Submit Rating Action**: Owner (`existing().buyerUid == request.auth.uid`) can update `['rating', 'reviewComment', 'updatedAt']` only once (`existing().rating == 0` and `incoming().rating >= 1 && incoming().rating <= 5`).
     - **Request Refund Action (Max 3 Days)**: Owner (`existing().buyerUid == request.auth.uid`) can update `['status', 'refundReason', 'refundRequestedAtMs', 'updatedAt']` only when `existing().status == 'paid'` and `incoming().status == 'refund_requested'` and `incoming().refundReason.size() >= 3`.
     - **Admin Resolution Action**: `isAdmin()` can update `status` to `'refunded'` or `'refund_rejected'`.
     - Terminal states `'refunded'` and `'refund_rejected'` lock further non-admin updates.
7. **StoreReview (`/storeReviews/{reviewId}`)**:
   - Public `get` and `list` allowed so shoppers can read product reviews.
   - `create` requires verified signed-in buyer (`incoming().buyerUid == request.auth.uid`), valid parent product & order existence (`exists(...)`), `rating >= 1 && rating <= 5`, and `createdAt == request.time`.
   - Reviews are immutable once created (`allow update: if false;`, `allow delete: if isAdmin();`).
8. **StoreRestockAlert (`/storeRestockAlerts/{alertId}`)**:
   - Contains user email (`userEmail`). `get` and `list` restricted to `resource.data.userUid == request.auth.uid || isAdmin()`.
   - `create` requires `incoming().userUid == request.auth.uid`, `incoming().status == 'waiting'`, `exists(/databases/$(database)/documents/storeProducts/$(incoming().productId))`.
   - `update` allows owner or admin to transition `['status', 'notifiedAtMs', 'updatedAt']`.

---

## 2. The "Dirty Dozen" Payloads

1. **Shadow Field Injection on `StoreProduct`**: Adding `"isFeaturedHack": true` to `/storeProducts/prod_1`. Rejected by `hasOnly()`.
2. **Unverified Email Spoof on Admin**: Authenticated user with `email: "weply.my.id@gmail.com"` but `email_verified: false` attempting to create a product. Rejected by `isVerifiedUser()`.
3. **Identity Spoofing on `StoreOrder` Create**: Authenticated user `uid_attacker` creating `/storeOrders/ord_1` with `buyerUid: "uid_victim"`. Rejected by `incoming().buyerUid == request.auth.uid`.
4. **PII Scraping on `StoreOrder` List**: Authenticated user `uid_attacker` listing `/storeOrders` without filtering by `buyerUid == request.auth.uid`. Rejected by `allow list: if isSignedIn() && (resource.data.buyerUid == request.auth.uid || isAdmin())`.
5. **Client Timestamp Forgery on `StoreOrder`**: Setting `createdAt` to a past timestamp instead of `request.time`. Rejected by `incoming().createdAt == request.time`.
6. **ID Poisoning Attack**: Creating a document with a 200-character or special-character ID. Rejected by `isValidId(id)`.
7. **Value Poisoning on `StoreOrder` Rating Update**: Updating `rating` to `999` or a string `"five"`. Rejected by `isValidStoreOrder(incoming())`.
8. **Price Tampering on `StoreProduct` by Buyer**: Buyer updating `price` alongside `stockCount` during checkout. Rejected by `affectedKeys().hasOnly(['stockCount', 'updatedAt'])`.
9. **Terminal State Bypass on `StoreOrder`**: Buyer attempting to update an order whose `status` is already `'refunded'`. Rejected by terminal state lock `existing().status == 'paid'`.
10. **Orphaned `StoreReview` Creation**: Creating a review referencing a non-existent `productId` or `orderId`. Rejected by `exists()` checks on `/storeProducts/$(incoming().productId)` and `/storeOrders/$(incoming().orderId)`.
11. **Credential Tampering on `StoreStockItem`**: Buyer attempting to overwrite `accountEmail` or `accountPassword` when claiming a stock item. Rejected by `affectedKeys().hasOnly(['status', 'buyerUid', 'orderId', 'updatedAt'])` and immutable field checks.
12. **PII Leak on `StoreRestockAlert`**: User `uid_attacker` attempting `get` on `/storeRestockAlerts/alert_victim`. Rejected by `resource.data.userUid == request.auth.uid || isAdmin()`.
