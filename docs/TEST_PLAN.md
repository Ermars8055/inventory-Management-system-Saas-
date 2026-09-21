# StockPilot — Complete Test Plan

**Version:** 1.0
**Date:** 2026-09-21
**Tester:** _______________
**Environment:** Production (stockpilot.ermarscastar.in)

---

## How to Use This Sheet

- For each test case, mark **PASS** or **FAIL** in the Result column
- If FAIL, note the issue in the Notes column
- Test in order — later tests depend on earlier ones
- Use **Chrome Incognito** for clean sessions
- Test on both **Desktop** and **Mobile** (375px width)

---

## Section 1: Signup & Subdomain Creation

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.1 | Visit landing page | Go to `https://stockpilot.ermarscastar.in` | Landing page loads with pricing, features, CTA buttons | | |
| 1.2 | Navigate to signup | Click "Get Started" or go to `/signup` | Signup wizard appears (3 steps) | | |
| 1.3 | Step 1: Account | Enter name, email, password (min 8 chars) → Next | Moves to step 2 | | |
| 1.4 | Step 2: Organization | Enter org name, subdomain (auto-generated), select industry → Next | Subdomain preview shows `{name}.stockpilot.ermarscastar.in`. Moves to step 3 | | |
| 1.5 | Step 3: Plan & Complete | Select plan, fill payment (demo), submit | Success screen with org URL, email, credentials | | |
| 1.6 | Subdomain created | Open `https://{subdomain}.stockpilot.ermarscastar.in` in new tab | Page loads (may take 30-60s for DNS propagation) | | |
| 1.7 | Subdomain shows login | Visit subdomain root `/` | Redirects to `/login`, NOT landing page | | |
| 1.8 | Signup blocked on subdomain | Go to `https://{subdomain}.stockpilot.ermarscastar.in/signup` | Redirects to `/login` | | |
| 1.9 | Welcome email | Check inbox of signup email | Welcome email received with org URL and login link | | |
| 1.10 | Duplicate subdomain | Try signup with same subdomain again | Error: "Subdomain already taken" | | |
| 1.11 | Duplicate email | Try signup with same email again | Error: "Email already registered" | | |

---

## Section 2: Authentication & Security

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.1 | Login on subdomain | Login with the credentials from signup | Dashboard loads, user name in sidebar | | |
| 2.2 | Wrong credentials | Enter wrong password | Error: "Invalid credentials" | | |
| 2.3 | Wrong org login | Login with demo user `priya@abcinternationalschool.edu` on YOUR subdomain | Error: "This account does not belong to this organization" | | |
| 2.4 | Forgot password | Click "Forgot password?" → enter email → submit | "Check your email" confirmation shown | | |
| 2.5 | Reset email received | Check inbox | Password reset email with link | | |
| 2.6 | Reset password | Click reset link → enter new password (min 8 chars) → submit | "Password reset successfully" → can login with new password | | |
| 2.7 | Change password | Profile page → Change Password → enter current + new | "Password changed successfully" | | |
| 2.8 | Logout | Click "Sign out" in sidebar | Redirected to login. Old token no longer works (blacklisted) | | |
| 2.9 | Session expired | Wait for token to expire (or manually delete token from localStorage) | Warning dialog appears → redirects to login with "Session expired" message | | |
| 2.10 | Unauthenticated API | Open browser console → `fetch('/api/inventory')` without token | Returns 401 "Not authenticated" | | |

---

## Section 3: Organization Settings

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.1 | View org settings | Settings → Organization | Profile card with name, email, phone, address | | |
| 3.2 | Upload logo | Hover logo area → click → select JPG/PNG (under 2MB) | Logo appears in settings, sidebar org switcher | | |
| 3.3 | Update org name | Change name → Save Profile | Toast: "Organization profile saved". Name updates in sidebar | | |
| 3.4 | Change assignment mode | Localization section → Assignment Mode → "Distribution" → Save | Toast: "Configuration saved" | | |
| 3.5 | Verify mode persists | Refresh page → check Assignment Mode dropdown | Still shows "Distribution" (not reset to default) | | |
| 3.6 | Change language | Localization → Language → Hindi → Save | Sidebar labels translate to Hindi | | |
| 3.7 | Change currency | Localization → Currency → USD → Save | Currency symbol changes to $ across app | | |
| 3.8 | Change timezone | Localization → Timezone → select timezone → Save | Persists on refresh | | |
| 3.9 | Configure labels | Set Recipient Label = "Student", Group = "Class", Assignment = "Issue" → Save | Labels reflect across the app (sidebar, pages, forms) | | |

---

## Section 4: Inventory Management

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.1 | Create category | Inventory → Add Item → Category dropdown → "+ Create New Category" → enter name | Category created, auto-selected | | |
| 4.2 | Add item (general) | Add Item → fill name, SKU, category, qty, location → Add Item | Item appears in inventory grid. Stock shows correctly | | |
| 4.3 | Add item (uniforms module) | Add Item → Module = "Uniforms" → fill Size + Gender fields → Add | Item created. Shows in Uniforms page | | |
| 4.4 | Add item (books module) | Add Item → Module = "Books" → fill ISBN + Subject → Add | Item shows in Books page | | |
| 4.5 | Add item (pharmacy module) | Add Item → Module = "Medicines" → fill Batch + Expiry → Add | Item shows in Medicines page | | |
| 4.6 | Duplicate SKU | Try adding item with same SKU | Error: "An item with SKU 'X' already exists" | | |
| 4.7 | Edit item | Click item → detail page → Edit button → change fields → Save | Changes persist | | |
| 4.8 | Add stock | Inventory grid → item dropdown → "Add Stock" → enter qty → Add | Stock increases, status updates | | |
| 4.9 | Report damage | Item dropdown → "Report Damage" → fill form → Write Off | Stock decreases, transaction logged | | |
| 4.10 | Delete item | Item dropdown → "Delete Item" → confirm | Item removed from list | | |
| 4.11 | Low stock notification | Reduce item stock below min_quantity (via Add Stock with negative or damage) | Bell icon shows notification: "Low stock: {item name}" | | |
| 4.12 | Search inventory | Type in search bar or Ctrl+K → search item name | Results show with correct item | | |
| 4.13 | Filter by category | Select category from filter dropdown | Only items in that category shown | | |
| 4.14 | Filter by status | Select "Low Stock" from status filter | Only low stock items shown | | |
| 4.15 | Grid vs Table view | Toggle between grid and table view icons | Both views show same data correctly | | |
| 4.16 | Export CSV | Click "Export" button → downloads | CSV file with all inventory data | | |
| 4.17 | Import CSV | Click "Import" → download template → fill 3 items → upload | "3 of 3 imported" message. Items appear in inventory | | |
| 4.18 | Custom fields | Click "Custom Fields" button → add a field → save | Field appears in add/edit item form | | |

---

## Section 5: Recipients (Students/Patients/Employees)

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 5.1 | Add recipient | Click "Add Student" → fill name, ID, class → add | Recipient appears in list, grouped by class | | |
| 5.2 | Duplicate identifier | Add recipient with same ID | Error: "A recipient with identifier 'X' already exists" | | |
| 5.3 | Edit recipient | Click recipient card → detail page → Edit → change name → Save | Name updates | | |
| 5.4 | View assignments | Click recipient → detail page | Shows assignment history for that recipient | | |
| 5.5 | Search recipients | Type name in search bar | Filters results | | |
| 5.6 | Export recipients | Click "Export" | CSV downloaded | | |
| 5.7 | Import recipients | Click "Import" → upload CSV with 3 recipients | "3 of 3 imported" | | |

---

## Section 6: Item Distribution (Schools — Distribution Mode)

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.1 | Verify distribution mode | Settings → Organization → Assignment Mode = "Distribution" | Saved | | |
| 6.2 | Issue item from inventory | Inventory → item card → "Issue" button → select student → qty → Issue | Status = "Distributed". Stock REDUCED permanently (not reserved). No "Expected Return" field shown | | |
| 6.3 | No return button | Go to Assignments page → Active Issues tab | No "Return" or "Lost" buttons. Shows "Mark Paid" if fee > 0 | | |
| 6.4 | No overdue | Distributed items should NOT show "Overdue" badge | No red overdue badges anywhere | | |
| 6.5 | Fee tracking | Issue item with price → Assignments page | Shows fee amount + "Unpaid" badge | | |
| 6.6 | Mark fee paid | Click "Mark Paid" on an unpaid assignment | Badge changes to "Paid" | | |
| 6.7 | Print receipt | Click printer icon on assignment row | Preview dialog opens with org logo, student info, items table | | |
| 6.8 | Print to paper | Click "Print" in preview | Browser print dialog opens with clean styled receipt | | |
| 6.9 | Bulk issue | Bulk Issue page → select template → select students → confirm | All students get items distributed. Stock reduced for each | | |
| 6.10 | Bulk issue — no return date | Bulk Issue form | "Expected Return" field NOT shown in distribution mode | | |

---

## Section 7: Item Lending (Libraries — Lending Mode)

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.1 | Switch to lending mode | Settings → Organization → Assignment Mode = "Lending" → Save | Saved | | |
| 7.2 | Issue item | Inventory → Issue → select recipient → set expected return date → Issue | Status = "Active". Stock RESERVED (not reduced). "Expected Return" field visible | | |
| 7.3 | Overdue detection | Set expected return to past date | "Overdue" red badge appears | | |
| 7.4 | Return item | Assignments → click "Return" → select condition → confirm | Status = "Returned". Stock released. Transaction logged | | |
| 7.5 | Mark lost | Assignments → click "Lost" → optional fine → confirm | Status = "Lost". Stock permanently reduced | | |
| 7.6 | Fine paid | If fine was set → click "Mark Paid" | Status = "Fine Paid" | | |
| 7.7 | Switch back to distribution | Settings → Assignment Mode = "Distribution" → Save | UI reverts to distribution mode behavior | | |

---

## Section 8: Vendors

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 8.1 | Add vendor | Vendors page → "Add Vendor" → fill form → save | Vendor appears in list | | |
| 8.2 | Duplicate email | Add vendor with same email | Error: "A vendor with email 'X' already exists" | | |
| 8.3 | Edit vendor | Click vendor → detail page → Edit → change phone → Save | Phone updates | | |
| 8.4 | Delete vendor | Vendor card → delete icon → confirm | Vendor removed | | |
| 8.5 | Custom fields on vendor | Add custom field for vendors (e.g. "GST No.") → add vendor → fill field | Custom field value saved and shown on detail page | | |
| 8.6 | Export/Import vendors | Export CSV → verify data → import with new vendors | Both work correctly | | |

---

## Section 9: Procurement & Quotations

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 9.1 | Create quotation | Vendor Quotations → "New Quotation" → add items → save | Quotation created in draft | | |
| 9.2 | Invite vendors | Quotation detail → "Invite Vendor" → select vendor | Vendor added to quotation | | |
| 9.3 | Enter vendor prices | Click "Enter Prices" → fill unit price for each item → save | Vendor status = "Quoted" | | |
| 9.4 | Compare prices | Go to Compare tab | Price grid shows all vendors with prices per item | | |
| 9.5 | Generate POs | Select best vendor per item → "Generate POs" | POs created, quotation status = "Converted" | | |
| 9.6 | Reject ₹0 price | Try generating PO with a vendor who hasn't quoted | Error: "Missing or invalid price" | | |
| 9.7 | Create PO manually | Procurement → "New PO" → fill vendor, items, amounts → create | PO created | | |
| 9.8 | Receive PO | PO detail → "Receive" → enter received quantities → submit | Stock increases. PO status updates. Transaction logged | | |

---

## Section 10: Modules

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.1 | Enable module | Modules page → toggle "Uniforms" ON | Uniforms appears in sidebar | | |
| 10.2 | Disable module | Toggle "Uniforms" OFF | Uniforms disappears from sidebar | | |
| 10.3 | Module page shows items | Enable Uniforms → Uniforms page | Shows only items with module="uniforms" | | |
| 10.4 | Add from module page | Uniforms page → "Add Uniform" button | Navigates to Inventory with module pre-selected as "Uniforms" | | |
| 10.5 | Plan limit on modules | Check if module count is within plan limit | Error if trying to enable more than plan allows | | |

---

## Section 11: Support & Notifications

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 11.1 | Create ticket | Support page → "New Ticket" → fill subject, description, priority → submit | Ticket created, appears in list | | |
| 11.2 | Reply to ticket | Click ticket → type reply → send | Reply appears in thread | | |
| 11.3 | Notification bell | Trigger a low stock alert (reduce stock) | Bell icon shows red badge with count | | |
| 11.4 | View notifications | Click bell icon | Dropdown shows notification list | | |
| 11.5 | Mark as read | Click checkmark on notification | Notification marked as read, count decreases | | |
| 11.6 | Mark all read | Click "Mark all read" | All notifications marked as read | | |

---

## Section 12: Subscription & Billing

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 12.1 | View plan usage | Settings → Subscription | Usage bars show: X/Y users, X/Y items, X/Y modules | | |
| 12.2 | Plan limit hit | Try adding users beyond plan limit | Error: "Plan limit reached: X/Y users. Upgrade your plan" | | |
| 12.3 | Redeem coupon | Enter coupon code → Apply | "Coupon applied! X% discount" (coupon must exist in admin) | | |
| 12.4 | Invalid coupon | Enter random code → Apply | "Invalid or expired coupon code" | | |
| 12.5 | View invoices | Scroll down to "Billing History" | Invoice list with amounts, status | | |
| 12.6 | Pay invoice | Click "Pay Now" on pending invoice | Status changes to "Paid" | | |

---

## Section 13: Reports & Data

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 13.1 | View reports | Reports page | Charts show: stock by category, status distribution, transaction summary | | |
| 13.2 | Export inventory CSV | Click "Inventory CSV" | Downloads CSV with all items | | |
| 13.3 | Export transactions CSV | Click "Transactions CSV" | Downloads CSV with all transactions | | |
| 13.4 | Activity log | Activity Log page | Shows recent create/update/delete actions with user names | | |
| 13.5 | Transaction history | Transactions page | Shows all stock transactions (received, issued, returned, damaged) | | |

---

## Section 14: Search & Navigation

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 14.1 | Global search | Press Ctrl+K | Command palette opens | | |
| 14.2 | Search items | Type item name | Results show under "Inventory" section | | |
| 14.3 | Search vendors | Type vendor name | Results show under "Vendors" section | | |
| 14.4 | Search recipients | Type student name | Results show under "Recipients" section | | |
| 14.5 | Click result | Click a search result | Navigates to detail page | | |
| 14.6 | Keyboard shortcuts | Press `?` | Shortcuts help dialog appears | | |
| 14.7 | Dark mode | Click sun/moon icon in header | Theme toggles between light and dark | | |

---

## Section 15: Legal & UX

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 15.1 | Terms of Service | Go to `/terms` | ToS page loads with sections | | |
| 15.2 | Privacy Policy | Go to `/privacy` | Privacy policy loads, mentions DPDPA | | |
| 15.3 | Cookie consent | Visit site for first time (clear localStorage) | Cookie banner appears at bottom | | |
| 15.4 | Accept cookies | Click "Accept" | Banner disappears, doesn't show again | | |
| 15.5 | 404 page | Go to `/random-nonexistent-page` | Custom 404 page with "Page not found" | | |
| 15.6 | 403 page | Try accessing wrong org's subdomain with valid token | Custom 403 "Access Denied" page | | |
| 15.7 | Mobile sidebar | Open on mobile (375px) → tap hamburger | Sidebar slides in with overlay | | |
| 15.8 | Mobile tables | View inventory table on mobile | Horizontal scroll works | | |
| 15.9 | Mobile dialogs | Open add item dialog on mobile | Dialog takes full width | | |
| 15.10 | User profile | Click avatar/profile → Profile page | Shows name, email, role. Can edit name and change password | | |

---

## Section 16: Admin Panel

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 16.1 | Admin login | Go to `stockpilot-admin.ermarscastar.in` → login with admin credentials | Admin dashboard loads | | |
| 16.2 | Dashboard stats | View dashboard | Shows: total orgs, items, recipients, MRR, revenue cards | | |
| 16.3 | Organization list | Organizations page | Lists all orgs with user/item/vendor counts + onboarding progress | | |
| 16.4 | Org detail | Click an org | Shows stats, plan selector, modules, onboarding checklist | | |
| 16.5 | Change plan | Org detail → click different plan | Plan updated | | |
| 16.6 | Impersonate | Org detail → "Impersonate" button | Opens tenant app logged in as that org's admin | | |
| 16.7 | Create coupon | Coupons page → "Create Coupon" → fill code, type, value → create | Coupon appears in list | | |
| 16.8 | Generate invoices | Billing page → "Generate Monthly Invoices" | Invoices created for all orgs | | |
| 16.9 | Mark invoice paid | Click "Paid" on an invoice | Status changes to "Paid" | | |
| 16.10 | Send reminder | Click "Remind" on pending invoice | Email sent to org admin | | |
| 16.11 | Support tickets | Support page | Shows tickets from all orgs | | |
| 16.12 | Reply to ticket | Click ticket → type reply → send | Reply sent. Tenant gets email notification | | |
| 16.13 | Audit log | Audit Log page | Shows admin actions (create coupon, mark paid, impersonate, etc.) | | |
| 16.14 | Admin users | Admin Users page → create new admin | New admin can login | | |

---

## Section 17: Account Deletion

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 17.1 | Delete account | Settings → (need to add UI) or call `DELETE /api/organizations/account` | All org data purged. User logged out | | |

---

## Test Summary

| Section | Total Tests | Pass | Fail | Blocked |
|---------|-----------|------|------|---------|
| 1. Signup & Subdomain | 11 | | | |
| 2. Authentication | 10 | | | |
| 3. Org Settings | 9 | | | |
| 4. Inventory | 18 | | | |
| 5. Recipients | 7 | | | |
| 6. Distribution Mode | 10 | | | |
| 7. Lending Mode | 7 | | | |
| 8. Vendors | 6 | | | |
| 9. Procurement | 8 | | | |
| 10. Modules | 5 | | | |
| 11. Support & Notifications | 6 | | | |
| 12. Subscription & Billing | 6 | | | |
| 13. Reports & Data | 5 | | | |
| 14. Search & Navigation | 7 | | | |
| 15. Legal & UX | 10 | | | |
| 16. Admin Panel | 14 | | | |
| 17. Account Deletion | 1 | | | |
| **TOTAL** | **140** | | | |

---

## Test Environment

- **Browser:** Chrome (latest)
- **Mobile:** Chrome DevTools → 375px width OR actual phone
- **Main URL:** `https://stockpilot.ermarscastar.in`
- **Admin URL:** `https://stockpilot-admin.ermarscastar.in`
- **Admin credentials:** admin@stockpilot.com / admin123
- **Demo credentials:** priya@abcinternationalschool.edu / password123

---

## Notes for Tester

1. **Start fresh** — create a new org via signup first, then test everything on that org
2. **Distribution mode is default** — schools don't need return dates
3. **Switch to lending mode** only for Section 7 tests, then switch back
4. **Ctrl+K** opens search from anywhere
5. **?** shows keyboard shortcuts
6. **Dark mode** toggle is the sun/moon icon in header
7. **LibreTranslate** may take 60s to start — Hindi translation may show English briefly on first load
