# Smart Traffic Management System (STMS)

A modern, responsive, and functional full-stack web application designed for traffic administrators and traffic officers to monitor urban road conditions, detect congestion using deterministic rules, control traffic signals, dispatch emergency priority corridors, track road sensors, and generate analytical reports.

Developed as a college Object-Oriented Analysis & Software Engineering (OOASE) demonstration project.

---

> [!NOTE]  
> **Demonstration Notice**: This application operates using simulated traffic measurements, sensor telemetry, and signal phases across major Chennai arterial junctions. It is not connected to physical municipal traffic hardware.

---

## 🌟 Key Features

### 1. High-Tech Command Dashboard
- Dark navy command-center aesthetic inspired by smart city control portals.
- 6 Real-time KPI summary cards: Monitored Junctions, Vehicle Queue Volume, Normal Flow, Congested Junctions, Severe Bottlenecks, and Active Emergency Dispatches.
- 4 Interactive Chart.js visualizations:
  - Vehicle Volume by Junction (Bar)
  - Congestion Distribution Breakdown (Doughnut)
  - Average Speed Telemetry (Bar)
  - Signal Phase Distribution (Pie)
- Live synchronization ticker with manual simulation single-step advance and pause/resume controls.

### 2. Live Traffic Telemetry & Classification
- Real-time records tracking: Location, GPS Coordinates, Vehicle Count, Average Speed (km/h), Sensor ID, and Timestamps.
- Rule-based congestion classification:
  - **NORMAL**: `< 20` vehicles and `> 40 km/h` average speed.
  - **MODERATE**: `20-39` vehicles or `25-40 km/h` average speed.
  - **HEAVY**: `40-59` vehicles or `15-25 km/h` average speed.
  - **SEVERE**: `≥ 60` vehicles or `< 15 km/h` average speed (or stopped traffic).
- Search, filter by severity, sorting, pagination, manual entry modals, and audit logging.

### 3. Interactive Traffic Map (Leaflet.js & OpenStreetMap)
- Centered on Chennai metropolitan grid (`13.04° N, 80.22° E`).
- Dynamic glowing SVG pulse markers color-coded by congestion level:
  - 🟢 Green: Normal flow
  - 🟡 Yellow: Moderate queue
  - 🟠 Orange: Heavy traffic
  - 🔴 Red: Severe bottleneck
- Interactive popups displaying queue length, speed, signal phase, and sensor heartbeat.
- One-click severity layer filter.

### 4. Traffic Signal Management
- Animated 3-lens traffic light visualizers (Red, Yellow, Green) for monitored intersections.
- Dual operating modes:
  - **AUTOMATIC**: Adaptive timer dynamically extends green phases (up to 80s) to clear severe traffic jams.
  - **MANUAL**: Authorized operators can manually command phase transitions with safety confirmations.
- Audit history modal logging every state transition, operator name, and timestamp.

### 5. Emergency Vehicle Priority (Green Wave Corridors)
- Priority dispatch for Ambulances (`AMB-108`), Fire Engines (`FIR-101`), and Police Escorts (`POL-100`).
- Preemptively locks signals along the emergency corridor to `GREEN` for 90 seconds.
- Interactive route visualizer displaying affected intersections.
- Restoration of automatic signal cycles upon passage completion.

### 6. Incident Alerts & Notification Center
- Severity classifications: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- Event triggers: Severe Congestion, Heavy Congestion, Sensor Offline, Emergency Corridor Requests.
- Intelligent duplicate-suppression engine to prevent alert spamming.
- In-browser toast notifications and acknowledgment/resolution workflows.

### 7. Road Sensor Fleet Diagnostics
- Fleet roster: High-Resolution Cameras, Sub-Pavement Inductive Loops, Microwave Radar, and Thermal Infrared sensors.
- Simulated sensor failure (`OFFLINE`) and recovery (`ONLINE`) controls.

### 8. Analytics & CSV Export
- Historical date range filter and location performance aggregates.
- Direct CSV report streaming export (`/api/reports/export`).
- Dedicated print-friendly layout.

### 9. Role-Based Access Control (RBAC) & Self-Healing Auth
- **System Administrator** (`admin`): Full administrative authority, user account creation/deletion, system settings, and audit logs.
- **Traffic Administrator** (`traffic_admin`): Signal management, emergency approvals, sensor fleet, and alert resolution.
- **Traffic Officer** (`officer`): Traffic monitoring, permitted manual simulation commands, and alert acknowledgments.
- **Self-Healing On-Demand Seeding**: Automatically initializes demo accounts if the connected database has 0 users, eliminating "User not found" errors on new deployments.
- **Standalone In-Memory Fallback**: Runs out-of-the-box even if MongoDB Atlas has not yet been linked, so deployed preview sites work immediately!

---

## 🏗 Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom design system), Vanilla JavaScript (Modular ES6), Chart.js 4.4, Leaflet.js 1.9 with OpenStreetMap.
- **Backend**: Node.js, Express.js REST API, CORS, Helmet (Security headers), Express-Rate-Limit.
- **Serverless Integration**: Vercel `@vercel/node` Serverless Function adapter (`api/index.js` + `vercel.json`).
- **PaaS Deployment**: Render / Railway / Heroku compatible via `Procfile`.
- **Security**: Bcrypt password hashing, signed JSON Web Tokens (JWT).
- **Database**: MongoDB with Mongoose ODM (with automatic fallback to embedded in-memory data store for seamless demonstration).
- **Testing**: Node.js native test runner (`node:test`, `node:assert/strict`).

---

## 📁 Project Folder Structure

```
smart-traffic/
├── api/
│   └── index.js                  # Vercel Serverless Function entry point
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection with serverless caching & fallback
│   ├── controllers/              # Business logic controllers
│   │   ├── alertController.js
│   │   ├── authController.js     # Self-healing login & RBAC registration
│   │   ├── congestionController.js
│   │   ├── emergencyController.js
│   │   ├── reportController.js
│   │   ├── sensorController.js
│   │   ├── signalController.js
│   │   ├── systemController.js
│   │   ├── trafficController.js
│   │   ├── userController.js
│   │   └── vehicleController.js
│   ├── middleware/               # Auth, role authorization, validation, error handlers
│   ├── models/                   # 10 Mongoose schemas & models
│   ├── routes/                   # Express REST route mounts
│   ├── scripts/
│   │   └── seed.js               # Demonstration database seed script
│   ├── services/                 # Congestion analysis, simulation ticker, mock store
│   │   └── mockStoreService.js   # Zero-setup in-memory store for serverless previews
│   ├── tests/                    # Integration and unit test suites
│   ├── utils/
│   │   └── logger.js             # Formatted terminal logger
│   ├── .env.example
│   ├── .env
│   └── server.js                 # Express application entry point
├── frontend/
│   ├── index.html                # Main SPA dashboard shell
│   ├── login.html                # High-tech portal login with One-Click Autofill
│   ├── css/
│   │   ├── style.css             # Theme design system & components
│   │   ├── dashboard.css         # Cards, charts, signal lights, map styling
│   │   └── responsive.css        # Responsive layouts & print stylesheets
│   └── js/                       # Modular frontend controllers
│       ├── api.js                # Fetch wrapper with Bearer token & toasts
│       ├── auth.js               # Session checking & RBAC display
│       ├── dashboard.js          # KPI cards & Chart.js rendering
│       ├── traffic.js            # Table, search, pagination, modals
│       ├── map.js                # Leaflet map pins & popups
│       ├── signals.js            # 3-lens signal cards & overrides
│       ├── emergency.js          # Green corridor dispatch
│       ├── alerts.js             # Incident notification center
│       ├── sensors.js            # Sensor fleet & failure simulation
│       ├── reports.js            # Analytics & CSV export
│       ├── users.js              # User management (Admin)
│       └── settings.js           # Thresholds & health diagnostics
├── package.json                  # Root runner configuration
├── Procfile                      # Render / Railway startup process
├── vercel.json                   # Vercel serverless routing & static rewrites
├── README.md
└── .gitignore
```

---

## 🚀 Local Execution Guide

### Prerequisites
- **Node.js**: Version 18 or higher (Verified on Node.js v24).
- **npm**: Version 9 or higher.

### Step 1: Install Dependencies
In the project root directory (`c:\Smart traffic`):
```powershell
npm install
```

### Step 2: Start the Application
Run the server:
```powershell
npm start
```
*(Or `npm run dev` for auto-reloading with nodemon).*

### Step 3: Open in Your Browser
Navigate to:
👉 **http://localhost:5000**

---

## ☁️ Cloud Deployment Guide

You can deploy this project completely free on **Vercel** or **Render**.

### Option A: Deploy on Vercel (Fastest Serverless Preview)

1. Push your repository to GitHub:
   ```powershell
   git add .
   git commit -m "Configure Vercel serverless deployment and self-healing auth"
   git push origin main
   ```
2. Log into [vercel.com](https://vercel.com) with GitHub.
3. Click **"Add New Project"** and import `subash0807/Smart-traffic`.
4. Keep the default settings (Framework Preset: **Other**, Root Directory: `./`).
5. Click **"Deploy"**.
6. That's it! Vercel will deploy your site using the bundled `vercel.json` and `api/index.js`.
7. Open the deployed URL and log in immediately using the one-click demo presets!

---

### Option B: Deploy on Render (Recommended for Continuous Simulation)

Render is recommended if you want the traffic simulation engine (`setInterval`) to run continuously in the background 24/7.

1. Push your latest code to GitHub.
2. Go to [render.com](https://render.com) and log in.
3. Click **"New +" &rarr; "Web Service"**.
4. Select your `Smart-traffic` repository.
5. Set:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node backend/server.js`
   - **Plan**: `Free`
6. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = *(Your MongoDB Atlas URI, see below)*
7. Click **"Deploy Web Service"**.

---

## 🗄️ Setting Up Free Cloud MongoDB Atlas (Optional but Recommended)

By default, the project runs in **Standalone In-Memory Demo Mode** so you can log in and test everything immediately without any database setup.

To persist your custom users, new traffic records, and signal histories permanently across restarts:

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free cluster (**M0 Sandbox - Free**).
3. Under **Security &rarr; Database Access**, create a user (e.g. `traffic_user` with a secure password).
4. Under **Security &rarr; Network Access**, click **"Add IP Address"** &rarr; select **"Allow Access from Anywhere" (`0.0.0.0/0`)** &rarr; Confirm.
5. Click **"Connect"** on your Cluster &rarr; choose **"Drivers" (Node.js)** &rarr; copy the connection string:
   ```text
   mongodb+srv://traffic_user:<password>@cluster0.abcde.mongodb.net/smart_traffic?retryWrites=true&w=majority
   ```
6. Paste this URI into your deployment's Environment Variables as `MONGODB_URI` (in Vercel Project Settings or Render Environment).
7. The system will connect, auto-seed all demo accounts, and persist all data permanently!

---

## 🔑 Default Demo Credentials

On the login page, you can use the **One-Click Demo Account Autofill** buttons:

| System Role | Email Address | Password |
|---|---|---|
| **System Administrator** | `admin@stms.gov.in` | `Password123!` |
| **Traffic Administrator** | `trafficadmin@stms.gov.in` | `Password123!` |
| **Traffic Officer** | `officer@stms.gov.in` | `Password123!` |

*(You can also use the **"Register New Account"** tab or the **"↻ Restore / Reseed Demo Accounts"** button anytime).*

---

## 🧪 Automated Testing

To run the unit tests:
```powershell
node --test backend/tests/congestion.test.js
```

---

## 📜 Academic Acknowledgement
Developed for the **Object-Oriented Analysis and Software Engineering (OOASE)** curriculum demonstrating smart city architectural paradigms, micro-services simulation, and RESTful web development.
