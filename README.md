# Antan Batura Watersports Booking Management System

A full-stack web application for Tasik Shah Alam Lake Gardens — streamlining boat rentals, front-desk operations, fleet management, and business reports.

---

## 🚀 One-Click Setup & Launch

### Prerequisites
You **only need one thing pre-installed**:
- **[Laragon](https://laragon.org/download/)** — provides PHP and MySQL locally. *(Free, ~120 MB)*

Node.js and Composer are **automatically downloaded and installed** by the setup script if missing.

---

### 🛠️ First-Time Setup

1. Clone or download and extract this repository to a folder **without parentheses in the path** (e.g. `C:\Projects\ISP550`).
2. Double-click **`setup_and_run.bat`**.

The script will automatically:
- Detect PHP from Laragon or your system PATH
- Download and install **Node.js** if missing
- Download **Composer** if missing
- Start **MySQL** automatically (no need to manually click "Start All" in Laragon)
- Patch `backend/.env` to use MySQL with the correct credentials
- Create the `antan_batura` database
- Install all Composer and npm dependencies
- Run database migrations and seed demo data
- Launch both the Laravel API and React frontend servers
- Open **http://localhost:5173** in your browser

> ⚠️ If a **UAC (User Account Control)** prompt appears asking for admin permission during Node.js install, click **Yes**.

---

### ▶️ Subsequent Runs (Already Set Up)

Once the first-time setup is complete, just double-click **`start_project.bat`** to start the servers without re-running the full setup.

---

## 🔑 Default Login Credentials

Navigate to **http://localhost:5173/login**

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@antanbatura.test` | `password123` |
| **Staff / Operator** | `staff@antanbatura.test` | `password123` |

**Admin** can access: Front Desk, all Bookings, Fleet CRUD, Staff Management, Financial Reports.  
**Staff** can access: Front Desk, Bookings list, Fleet status.

---

## 🗄️ Viewing the Database

1. Open **Laragon** → click **Database** (bottom toolbar).
2. In **HeidiSQL**, click **Open** (default root/no-password connection).
3. Select the **`antan_batura`** database from the left panel.
4. Click any table → **Data** tab to browse records.

---

## 🌟 Feature Overview

| Feature | Description |
|---|---|
| **Customer Landing Page** | Watercraft showcase, pricing, booking flow, social feed |
| **Guest Booking (3-Step)** | Vertical timeline guide → pick craft → select slot → checkout |
| **Front Desk Operations** | Live today board, check-in, safety handover, payment entry, cancellations |
| **Fleet Management** | Admin CRUD for watercraft, rates, maintenance status |
| **Staff Management** | Admin-only user management for staff accounts |
| **Financial Reports** | Revenue by method/type, CSV export, cancellation breakdown |
| **Cruise Boat Boarding** | Per-passenger pricing (Adult: RM 10 / Child: RM 6) |

---

## 🛠️ Troubleshooting

### MySQL won't start
- Open **Laragon** and click **Start All**, then press any key in the setup window to retry.
- Alternatively, run `net start MySQL` in an admin command prompt.

### `composer install` fails
The script automatically retries with `--ignore-platform-reqs`. If it still fails:
1. Right-click **Laragon** → **PHP** → **Extensions**
2. Enable: `openssl`, `pdo_mysql`, `mbstring`, `curl`, `zip`
3. Run `setup_and_run.bat` again.

### Port already in use
- Laravel uses port **8000** — ensure no other PHP process is running.
- Vite uses port **5173** — ensure no other dev server is on that port.

### Path with parentheses
Move the project folder to a path without `(` or `)` characters (e.g. rename `Sem 6 (Main)` to `Sem6`).

---

## ⏹️ Stopping the App

Close the two terminal windows titled:
- `Antan Batura — Laravel API`
- `Antan Batura — Vite Frontend`
