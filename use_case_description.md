# Use Case Description Document: Antan Batura Booking Management System

This document outlines the detailed use case descriptions for the primary system operations.

---

## Use Case Diagram Summary

```mermaid
usecaseDiagram
    actor Customer as "Customer (Guest)"
    actor Staff as "Staff / Operator"
    actor Admin as "Administrator"

    Customer --> (UC-1: Book Watercraft)
    
    Staff --> (UC-2: Check-in Booking)
    Staff --> (UC-3: Handover Equipment)
    Staff --> (UC-4: Return Equipment)
    Staff --> (UC-5: Process Payment)
    Staff --> (UC-6: Cancel Booking)
    
    Admin --> (UC-7: Manage Fleet Inventory)
    Admin --> (UC-8: View Business Reports)
    Admin --|> Staff
```

---

## Detailed Use Case Descriptions

### UC-1: Book Watercraft
* **Actor:** Customer (Guest)
* **Description:** Allows a customer to search watercraft availability and submit a guest rental booking.
* **Preconditions:** Customer is on the customer portal page.
* **Postconditions:** A booking is created in `Pending` or `Confirmed` status and a unique reference code (e.g. `AB-7F3K2Q`) is generated.
* **Flow of Events:**
  1. Customer visits the Booking page.
  2. Customer selects a watercraft type (Kayak, Canoe, Pedal Boat, etc.) and date.
  3. System displays available hourly timeslots for the selected craft.
  4. Customer selects a timeslot and inputs contact details (Name, Email, Phone, and Notes).
  5. Customer reviews details and clicks "Submit Booking".
  6. System creates the booking, assigns a reference code, and displays the success screen.
* **Alternative Flows:**
  * **Slot Conflict (Waitlist Path):** If the timeslot has just been occupied by another customer, the system asks if they wish to join the waitlist. If they accept, booking is flagged as `waitlisted` and saved.

---

### UC-2: Check-in Booking
* **Actor:** Staff / Operator, Administrator
* **Description:** Verifies guest check-in at the front desk, confirms safety briefs, and issues gear.
* **Preconditions:** Staff is logged in; guest has arrived with a reference code.
* **Postconditions:** Booking status is updated to `Checked In`.
* **Flow of Events:**
  1. Staff views the Front Desk Page dashboard.
  2. Staff inputs the booking reference code in the lookup bar.
  3. System displays the matching booking details.
  4. Staff verifies customer details, checks "Safety Briefing Given", and checkmarks "Safety Gear Issued".
  5. Staff clicks "Check In Customer".
  6. System saves check-in timestamp and logs the staff ID.

---

### UC-3: Handover Equipment
* **Actor:** Staff / Operator, Administrator
* **Description:** Records the time the customer takes possession of the watercraft and launches onto the lake.
* **Preconditions:** Booking status is `Checked In`.
* **Postconditions:** Booking status is updated to `In Use`.
* **Flow of Events:**
  1. Staff loads the checked-in booking card on the operations dashboard.
  2. Staff clicks "Hand Over Craft" as the customer leaves the dock.
  3. System records the handover timestamp and starts the rental usage log timer.

---

### UC-4: Return Equipment
* **Actor:** Staff / Operator, Administrator
* **Description:** Logs the boat return time and registers any damages or notes.
* **Preconditions:** Booking status is `In Use`.
* **Postconditions:** Booking status is updated to `Completed` (or `In Maintenance` if damaged).
* **Flow of Events:**
  1. Staff locates the active `In Use` card on the dashboard.
  2. Staff clicks "Log Return" as the customer dock arrives.
  3. Staff inputs notes regarding return condition (e.g. "Perfect return" or "Paddle chipped").
  4. Staff clicks "Confirm Return".
  5. System records return timestamp, calculates total hours, and closes the usage log.

---

### UC-5: Process Payment
* **Actor:** Staff / Operator, Administrator
* **Description:** Records payment logs for the rental fees.
* **Preconditions:** Booking exists (can be processed at check-in or return).
* **Postconditions:** Payment is recorded, and payment status changes to `Paid`.
* **Flow of Events:**
  1. Staff opens the payment modal on the booking card.
  2. System shows the calculated fees (hourly rate * rental hours).
  3. Staff selects payment mode (Cash, Card, or QR).
  4. Staff clicks "Submit Payment".
  5. System creates a payment transaction record linked to the booking.

---

### UC-6: Cancel Booking
* **Actor:** Staff / Operator, Administrator
* **Description:** Cancels a scheduled booking.
* **Preconditions:** Booking status is NOT already in a terminal state (Completed or Cancelled).
* **Postconditions:** Booking status is updated to `Cancelled`.
* **Flow of Events:**
  1. Staff searches for the booking on the All Bookings or Front Desk list.
  2. Staff clicks "Cancel Booking".
  3. System prompt asks for confirmation.
  4. Staff confirms cancellation.
  5. System sets booking status to `Cancelled` and releases the timeslot.

---

### UC-7: Manage Fleet Inventory (Admin Only)
* **Actor:** Administrator
* **Description:** Create, update, or remove watercraft records from the active fleet database.
* **Preconditions:** Admin is logged in.
* **Postconditions:** Fleet database updates.
* **Flow of Events:**
  1. Admin navigates to the Fleet tab.
  2. Admin clicks "Register Watercraft" (or selects "Edit" next to an existing craft).
  3. Admin enters/edits the craft name, category, serial number, hourly rate, and status.
  4. Admin clicks "Save Changes".
  5. System validates inputs and updates the inventory logs.

---

### UC-8: View Business Reports (Admin Only)
* **Actor:** Administrator
* **Description:** Displays graphs and tables showing rental utilization rates, group metrics, and individual craft statistics.
* **Preconditions:** Admin is logged in.
* **Postconditions:** Reports dashboard is rendered.
* **Flow of Events:**
  1. Admin clicks the Reports tab.
  2. System queries the database and renders aggregated utilization counts by boat category.
  3. System renders a status breakdown bar chart.
  4. System shows a scrollable details table containing usage metrics for all 21 rental units.
