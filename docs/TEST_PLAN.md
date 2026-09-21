# StockPilot — Complete Test Plan

**Version:** 1.0
**Date:** 2026-09-21
**Tester:** _______________
**Environment:** Production

---

## Test Environment

- **Main URL:** https://stockpilot.ermarscastar.in
- **Admin URL:** https://stockpilot-admin.ermarscastar.in
- **Admin Login:** admin@stockpilot.com / admin123
- **Demo Login:** priya@abcinternationalschool.edu / password123
- **Browser:** Chrome latest
- **Mobile:** Chrome DevTools 375px or actual phone

---

## Instructions

- Mark each test: **P** (Pass), **F** (Fail), **B** (Blocked)
- If Fail, write issue in Notes
- Test in order — later tests depend on earlier ones
- Use Chrome Incognito for clean sessions

---

## 1. Signup & Subdomain Creation

**1.1** Visit landing page
- Go to main URL
- Expected: Landing page with pricing and CTA
- Result: ___ Notes: ___

**1.2** Start signup
- Click "Get Started"
- Expected: 3-step signup wizard
- Result: ___ Notes: ___

**1.3** Step 1 — Account
- Enter name, email, password (8+ chars)
- Click Next
- Expected: Moves to step 2
- Result: ___ Notes: ___

**1.4** Step 2 — Organization
- Enter org name, verify subdomain auto-fills
- Select industry, click Next
- Expected: Subdomain preview shows correctly
- Result: ___ Notes: ___

**1.5** Step 3 — Complete
- Select plan, fill demo payment, submit
- Expected: Success screen with org URL
- Result: ___ Notes: ___

**1.6** Subdomain works
- Open subdomain URL in new tab
- Expected: Page loads (allow 60s for DNS)
- Result: ___ Notes: ___

**1.7** Subdomain shows login not landing
- Visit subdomain root /
- Expected: Redirects to /login
- Result: ___ Notes: ___

**1.8** Signup blocked on subdomain
- Go to subdomain/signup
- Expected: Redirects to /login
- Result: ___ Notes: ___

**1.9** Welcome email
- Check signup email inbox
- Expected: Welcome email with org URL
- Result: ___ Notes: ___

**1.10** Duplicate subdomain rejected
- Signup again with same subdomain
- Expected: Error "Subdomain already taken"
- Result: ___ Notes: ___

**1.11** Duplicate email rejected
- Signup again with same email
- Expected: Error "Email already registered"
- Result: ___ Notes: ___

---

## 2. Authentication & Security

**2.1** Login on subdomain
- Login with signup credentials
- Expected: Dashboard loads
- Result: ___ Notes: ___

**2.2** Wrong password
- Enter wrong password
- Expected: "Invalid credentials"
- Result: ___ Notes: ___

**2.3** Wrong org login
- Login with demo user on YOUR subdomain
- Expected: "This account does not belong to this organization"
- Result: ___ Notes: ___

**2.4** Forgot password
- Click "Forgot password?" → enter email → submit
- Expected: "Check your email" shown
- Result: ___ Notes: ___

**2.5** Reset email
- Check inbox
- Expected: Reset link received
- Result: ___ Notes: ___

**2.6** Reset password
- Click link → set new password → submit
- Expected: "Password reset successfully"
- Result: ___ Notes: ___

**2.7** Change password
- Profile → Change Password section
- Expected: "Password changed successfully"
- Result: ___ Notes: ___

**2.8** Logout
- Click "Sign out" in sidebar
- Expected: Redirected to login
- Result: ___ Notes: ___

**2.9** Session expired
- Delete token from localStorage, refresh
- Expected: Redirected to login with "Session expired"
- Result: ___ Notes: ___

**2.10** Unauthenticated API call
- Console: fetch('/api/inventory')
- Expected: 401 "Not authenticated"
- Result: ___ Notes: ___

---

## 3. Organization Settings

**3.1** View settings
- Settings → Organization
- Expected: Profile card loads
- Result: ___ Notes: ___

**3.2** Upload logo
- Hover logo → click → select image under 2MB
- Expected: Logo shows in settings and sidebar
- Result: ___ Notes: ___

**3.3** Update org name
- Change name → Save Profile
- Expected: Name updates in sidebar
- Result: ___ Notes: ___

**3.4** Set assignment mode
- Assignment Mode → "Distribution" → Save
- Expected: Persists on refresh
- Result: ___ Notes: ___

**3.5** Change language
- Language → Hindi → Save
- Expected: Sidebar labels translate
- Result: ___ Notes: ___

**3.6** Change currency
- Currency → USD → Save
- Expected: $ symbol across app
- Result: ___ Notes: ___

**3.7** Change timezone
- Select timezone → Save
- Expected: Persists on refresh
- Result: ___ Notes: ___

**3.8** Configure labels
- Set Recipient = "Student", Group = "Class"
- Save Configuration
- Expected: Labels update across app
- Result: ___ Notes: ___

**3.9** Toggle features
- Enable/disable Condition Tracking, Fines
- Expected: Related fields show/hide
- Result: ___ Notes: ___

---

## 4. Inventory Management

**4.1** Create category
- Add Item → Category → "+ Create New Category"
- Expected: Category created and selected
- Result: ___ Notes: ___

**4.2** Add general item
- Fill name, SKU, category, qty, location → Add
- Expected: Item in inventory grid
- Result: ___ Notes: ___

**4.3** Add uniform item
- Module = Uniforms → fill Size + Gender → Add
- Expected: Shows in Uniforms page
- Result: ___ Notes: ___

**4.4** Add book item
- Module = Books → fill ISBN + Subject → Add
- Expected: Shows in Books page
- Result: ___ Notes: ___

**4.5** Add medicine item
- Module = Medicines → fill Batch + Expiry → Add
- Expected: Shows in Medicines page
- Result: ___ Notes: ___

**4.6** Duplicate SKU rejected
- Add item with same SKU
- Expected: Error "SKU already exists"
- Result: ___ Notes: ___

**4.7** Edit item
- Item detail → Edit → change fields → Save
- Expected: Changes persist
- Result: ___ Notes: ___

**4.8** Add stock
- Item dropdown → Add Stock → enter qty
- Expected: Stock increases
- Result: ___ Notes: ___

**4.9** Report damage
- Item dropdown → Report Damage → fill form
- Expected: Stock decreases, transaction logged
- Result: ___ Notes: ___

**4.10** Delete item
- Item dropdown → Delete → confirm
- Expected: Item removed
- Result: ___ Notes: ___

**4.11** Low stock notification
- Reduce stock below threshold
- Expected: Bell icon shows notification
- Result: ___ Notes: ___

**4.12** Global search
- Ctrl+K → type item name
- Expected: Results show
- Result: ___ Notes: ___

**4.13** Filter by category
- Select category from dropdown
- Expected: Filtered results
- Result: ___ Notes: ___

**4.14** Filter by status
- Select "Low Stock"
- Expected: Only low stock items
- Result: ___ Notes: ___

**4.15** Grid vs Table view
- Toggle view icons
- Expected: Both views work
- Result: ___ Notes: ___

**4.16** Export CSV
- Click Export
- Expected: CSV downloads
- Result: ___ Notes: ___

**4.17** Import CSV
- Click Import → download template → fill → upload
- Expected: Items imported
- Result: ___ Notes: ___

**4.18** Custom fields
- Click Custom Fields → add field → save
- Expected: Field in add/edit form
- Result: ___ Notes: ___

---

## 5. Recipients

**5.1** Add recipient
- Fill name, ID, class → add
- Expected: Appears grouped by class
- Result: ___ Notes: ___

**5.2** Duplicate ID rejected
- Add with same identifier
- Expected: Error "already exists"
- Result: ___ Notes: ___

**5.3** Edit recipient
- Detail page → Edit → Save
- Expected: Changes persist
- Result: ___ Notes: ___

**5.4** View assignments
- Click recipient → detail page
- Expected: Assignment history shown
- Result: ___ Notes: ___

**5.5** Search
- Type name in search
- Expected: Filters results
- Result: ___ Notes: ___

**5.6** Export CSV
- Click Export
- Expected: CSV downloads
- Result: ___ Notes: ___

**5.7** Import CSV
- Upload CSV with recipients
- Expected: Imported successfully
- Result: ___ Notes: ___

---

## 6. Distribution Mode (Schools)

**6.1** Verify mode is Distribution
- Settings → Organization → Assignment Mode
- Expected: Shows "Distribution"
- Result: ___ Notes: ___

**6.2** Issue item
- Inventory → item → Issue → select student → Issue
- Expected: Status = "Distributed", stock REDUCED
- Result: ___ Notes: ___

**6.3** No expected return field
- Open issue dialog
- Expected: No "Expected Return Date" field
- Result: ___ Notes: ___

**6.4** No return/lost buttons
- Assignments page → Active Issues
- Expected: No Return or Lost buttons
- Result: ___ Notes: ___

**6.5** No overdue badges
- Check all distributed items
- Expected: No red "Overdue" badges
- Result: ___ Notes: ___

**6.6** Fee tracking
- Issue with price set
- Expected: Fee amount + Unpaid badge shown
- Result: ___ Notes: ___

**6.7** Mark fee paid
- Click "Mark Paid"
- Expected: Badge changes to "Paid"
- Result: ___ Notes: ___

**6.8** Print receipt preview
- Click printer icon on assignment
- Expected: Preview with logo, student info, items
- Result: ___ Notes: ___

**6.9** Print to paper
- Click "Print" in preview
- Expected: Browser print dialog, clean layout
- Result: ___ Notes: ___

**6.10** Bulk issue
- Bulk Issue → select template + students → confirm
- Expected: All distributed, stock reduced, no return date
- Result: ___ Notes: ___

---

## 7. Lending Mode (Libraries)

**7.1** Switch to Lending
- Settings → Assignment Mode → Lending → Save
- Result: ___ Notes: ___

**7.2** Issue with return date
- Issue item with expected return date
- Expected: Status = "Active", stock reserved
- Result: ___ Notes: ___

**7.3** Overdue detection
- Set return date to past
- Expected: "Overdue" badge
- Result: ___ Notes: ___

**7.4** Return item
- Click Return → select condition → confirm
- Expected: Status = "Returned", stock released
- Result: ___ Notes: ___

**7.5** Mark lost
- Click Lost → optional fine → confirm
- Expected: Status = "Lost", stock reduced
- Result: ___ Notes: ___

**7.6** Fine paid
- Click "Mark Paid" on fine
- Expected: Status = "Fine Paid"
- Result: ___ Notes: ___

**7.7** Switch back
- Settings → Distribution → Save
- Expected: UI reverts
- Result: ___ Notes: ___

---

## 8. Vendors

**8.1** Add vendor
- Fill form → save
- Expected: Vendor in list
- Result: ___ Notes: ___

**8.2** Duplicate email rejected
- Add with same email
- Expected: Error
- Result: ___ Notes: ___

**8.3** Edit vendor
- Detail → Edit → Save
- Expected: Changes persist
- Result: ___ Notes: ___

**8.4** Delete vendor
- Delete icon → confirm
- Expected: Removed
- Result: ___ Notes: ___

**8.5** Custom fields
- Add custom field for vendors → use in form
- Expected: Saved and shown on detail
- Result: ___ Notes: ___

**8.6** Export/Import
- Export then import vendors
- Expected: Both work
- Result: ___ Notes: ___

---

## 9. Procurement & Quotations

**9.1** Create quotation
- New Quotation → add items → save
- Expected: Draft quotation created
- Result: ___ Notes: ___

**9.2** Invite vendor
- Quotation → Invite Vendor
- Expected: Vendor added
- Result: ___ Notes: ___

**9.3** Enter prices
- Enter Prices → fill amounts → save
- Expected: Vendor status = "Quoted"
- Result: ___ Notes: ___

**9.4** Compare prices
- Compare tab
- Expected: Price grid visible
- Result: ___ Notes: ___

**9.5** Generate POs
- Select vendors → Generate POs
- Expected: POs created, quotation = "Converted"
- Result: ___ Notes: ___

**9.6** Reject ₹0 price
- Try with vendor who hasn't quoted
- Expected: Error about missing price
- Result: ___ Notes: ___

**9.7** Create PO manually
- Procurement → New PO → fill → create
- Expected: PO created
- Result: ___ Notes: ___

**9.8** Receive PO
- PO → Receive → enter qty → submit
- Expected: Stock increases, transaction logged
- Result: ___ Notes: ___

---

## 10. Modules

**10.1** Enable module
- Modules → toggle ON
- Expected: Appears in sidebar
- Result: ___ Notes: ___

**10.2** Disable module
- Toggle OFF
- Expected: Disappears from sidebar
- Result: ___ Notes: ___

**10.3** Module shows correct items
- Open module page
- Expected: Only items of that module
- Result: ___ Notes: ___

**10.4** Add from module page
- Click "Add Uniform" on Uniforms page
- Expected: Opens Inventory with module preset
- Result: ___ Notes: ___

**10.5** Plan limit
- Try enabling more modules than plan allows
- Expected: Error about plan limit
- Result: ___ Notes: ___

---

## 11. Support & Notifications

**11.1** Create ticket
- Support → New Ticket → submit
- Expected: Ticket in list
- Result: ___ Notes: ___

**11.2** Reply to ticket
- Click ticket → type reply → send
- Expected: Reply in thread
- Result: ___ Notes: ___

**11.3** Notification appears
- Trigger low stock
- Expected: Bell shows count
- Result: ___ Notes: ___

**11.4** View notifications
- Click bell
- Expected: List of notifications
- Result: ___ Notes: ___

**11.5** Mark read
- Click checkmark
- Expected: Count decreases
- Result: ___ Notes: ___

**11.6** Mark all read
- Click "Mark all read"
- Expected: All cleared
- Result: ___ Notes: ___

---

## 12. Subscription & Billing

**12.1** View usage
- Settings → Subscription
- Expected: Usage bars with counts
- Result: ___ Notes: ___

**12.2** Plan limit
- Exceed user/item limit
- Expected: Error about plan limit
- Result: ___ Notes: ___

**12.3** Redeem coupon
- Enter valid code → Apply
- Expected: "Coupon applied"
- Result: ___ Notes: ___

**12.4** Invalid coupon
- Enter random code
- Expected: "Invalid coupon"
- Result: ___ Notes: ___

**12.5** View invoices
- Scroll to Billing History
- Expected: Invoice list
- Result: ___ Notes: ___

**12.6** Pay invoice
- Click "Pay Now"
- Expected: Status = "Paid"
- Result: ___ Notes: ___

---

## 13. Reports & Data

**13.1** View reports
- Reports page
- Expected: Charts with real data
- Result: ___ Notes: ___

**13.2** Export inventory CSV
- Click "Inventory CSV"
- Expected: Downloads
- Result: ___ Notes: ___

**13.3** Export transactions CSV
- Click "Transactions CSV"
- Expected: Downloads
- Result: ___ Notes: ___

**13.4** Activity log
- Activity Log page
- Expected: Recent actions listed
- Result: ___ Notes: ___

**13.5** Transaction history
- Transactions page
- Expected: All transactions shown
- Result: ___ Notes: ___

---

## 14. Search & Navigation

**14.1** Open search
- Press Ctrl+K
- Expected: Command palette opens
- Result: ___ Notes: ___

**14.2** Search items
- Type item name
- Expected: Results under Inventory
- Result: ___ Notes: ___

**14.3** Search vendors
- Type vendor name
- Expected: Results under Vendors
- Result: ___ Notes: ___

**14.4** Search recipients
- Type student name
- Expected: Results under Recipients
- Result: ___ Notes: ___

**14.5** Click result
- Click a search result
- Expected: Navigates to detail
- Result: ___ Notes: ___

**14.6** Keyboard shortcuts
- Press ?
- Expected: Shortcuts help dialog
- Result: ___ Notes: ___

**14.7** Dark mode
- Click sun/moon icon
- Expected: Theme toggles
- Result: ___ Notes: ___

---

## 15. Legal & UX

**15.1** Terms of Service
- Go to /terms
- Expected: ToS page loads
- Result: ___ Notes: ___

**15.2** Privacy Policy
- Go to /privacy
- Expected: Policy page loads
- Result: ___ Notes: ___

**15.3** Cookie consent
- Clear localStorage, revisit
- Expected: Banner at bottom
- Result: ___ Notes: ___

**15.4** Accept cookies
- Click Accept
- Expected: Banner gone, stays gone
- Result: ___ Notes: ___

**15.5** 404 page
- Go to /random-page
- Expected: Custom 404
- Result: ___ Notes: ___

**15.6** 403 page
- Access wrong org subdomain
- Expected: "Access Denied" page
- Result: ___ Notes: ___

**15.7** Mobile sidebar
- 375px → tap hamburger
- Expected: Sidebar slides in
- Result: ___ Notes: ___

**15.8** Mobile tables
- View table on mobile
- Expected: Horizontal scroll
- Result: ___ Notes: ___

**15.9** Mobile dialogs
- Open dialog on mobile
- Expected: Full width
- Result: ___ Notes: ___

**15.10** User profile
- Go to /profile
- Expected: Name, email, role, edit form
- Result: ___ Notes: ___

---

## 16. Admin Panel

**16.1** Admin login
- Login at admin URL
- Expected: Dashboard loads
- Result: ___ Notes: ___

**16.2** Dashboard stats
- View dashboard
- Expected: Org count, MRR, revenue cards
- Result: ___ Notes: ___

**16.3** Organization list
- Organizations page
- Expected: All orgs with counts + onboarding %
- Result: ___ Notes: ___

**16.4** Org detail
- Click an org
- Expected: Stats, plan, modules, onboarding checklist
- Result: ___ Notes: ___

**16.5** Change plan
- Click different plan on org detail
- Expected: Plan updated
- Result: ___ Notes: ___

**16.6** Impersonate
- Click Impersonate
- Expected: Opens tenant app as that org's admin
- Result: ___ Notes: ___

**16.7** Create coupon
- Coupons → Create → fill → submit
- Expected: Coupon in list
- Result: ___ Notes: ___

**16.8** Generate invoices
- Billing → Generate Monthly Invoices
- Expected: Invoices created
- Result: ___ Notes: ___

**16.9** Mark paid
- Click Paid on invoice
- Expected: Status changes
- Result: ___ Notes: ___

**16.10** Send reminder
- Click Remind
- Expected: Email sent
- Result: ___ Notes: ___

**16.11** Support tickets
- Support page
- Expected: Tickets from all orgs
- Result: ___ Notes: ___

**16.12** Reply to ticket
- Reply → send
- Expected: Tenant gets email
- Result: ___ Notes: ___

**16.13** Audit log
- Audit Log page
- Expected: Admin actions listed
- Result: ___ Notes: ___

**16.14** Create admin user
- Admin Users → create
- Expected: New admin can login
- Result: ___ Notes: ___

---

## 17. Account Deletion

**17.1** Delete account
- Call DELETE /api/organizations/account with auth token
- Expected: All org data purged, user logged out
- Result: ___ Notes: ___

---

## Summary

| Section | Tests | P | F | B |
|---------|-------|---|---|---|
| 1. Signup | 11 | | | |
| 2. Auth | 10 | | | |
| 3. Org Settings | 9 | | | |
| 4. Inventory | 18 | | | |
| 5. Recipients | 7 | | | |
| 6. Distribution | 10 | | | |
| 7. Lending | 7 | | | |
| 8. Vendors | 6 | | | |
| 9. Procurement | 8 | | | |
| 10. Modules | 5 | | | |
| 11. Support | 6 | | | |
| 12. Billing | 6 | | | |
| 13. Reports | 5 | | | |
| 14. Search | 7 | | | |
| 15. Legal/UX | 10 | | | |
| 16. Admin | 14 | | | |
| 17. Deletion | 1 | | | |
| **Total** | **140** | | | |

---

**Tester Notes:**
- Start fresh — create new org via signup first
- Distribution mode is default for schools
- Switch to lending only for Section 7, then back
- Ctrl+K = search, ? = shortcuts help
- LibreTranslate may take 60s on first load
