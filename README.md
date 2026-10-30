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
  - **MODERATE**: `20–39` vehicles or `25–40 km/h` average speed.
  - **HEAVY**: `40–59` vehicles or `15–25 km/h` average speed.
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

### 9. Role-Based Access Control (RBAC)
- **System Administrator** (`admin`): Full administrative authority, user account creation/deletion, system settings, and audit logs.
- **Traffic Administrator** (`traffic_admin`): Signal management, emergency approvals, sensor fleet, and alert resolution.
- **Traffic Officer** (`officer`): Traffic monitoring, permitted manual simulation commands, and alert acknowledgments.

---

## 🏗 Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom design system), Vanilla JavaScript (Modular ES6), Chart.js 4.4, Leaflet.js 1.9 with OpenStreetMap.
- **Backend**: Node.js, Express.js REST API, CORS, Helmet (Security headers), Express-Rate-Limit.
- **Security**: Bcrypt password hashing, signed JSON Web Tokens (JWT).
- **Database**: MongoDB with Mongoose ODM (with automatic fallback to embedded in-memory MongoDB for seamless out-of-the-box demonstration).
- **Testing**: Node.js native test runner (`node:test`, `node:assert/strict`).

---

## 📁 Project Folder Structure

```
smart-traffic/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection with MongoMemoryServer fallback
│   ├── controllers/              # Business logic controllers
│   │   ├── alertController.js
│   │   ├── authController.js
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
│   ├── services/                 # Congestion analysis, simulation ticker, audit, alerts
│   ├── tests/                    # Integration and unit test suites
│   ├── utils/
│   │   └── logger.js             # Formatted terminal logger
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── server.js                 # Express application entry point
├── frontend/
│   ├── index.html                # Main SPA dashboard shell
│   ├── login.html                # High-tech portal login
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
├── README.md
└── .gitignore
```

---

## 🚀 Installation & Execution Guide

### Prerequisites
- **Node.js**: Version 18 or higher (Verified on Node.js v24).
- **npm**: Version 9 or higher.
- **VS Code**: Recommended IDE.
- **MongoDB**: Local MongoDB or MongoDB Atlas (Optional: An embedded in-memory MongoDB will launch automatically if no local database is running!).

---

### Step 1: Open the Project in VS Code
1. Launch **Visual Studio Code**.
2. Go to **File &rarr; Open Folder...** and select `c:\Smart traffic`.
3. Open the Integrated Terminal in VS Code:
   - Shortcut: ``Ctrl + ` `` (Backtick)
   - Or click **Terminal &rarr; New Terminal** from the top menu.

---

### Step 2: Verify Node.js and npm
In the VS Code terminal, execute:
```powershell
node -v
npm -v
```
Ensure version numbers are displayed without errors.

---

### Step 3: Install Dependencies
In the VS Code integrated terminal (inside the project root `c:\Smart traffic`):
```powershell
npm install
```

---

### Step 4: Configure Environment Variables
A default `.env` file is already configured in `backend/.env`. You may review or modify it:
```ini
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart_traffic
USE_IN_MEMORY_DB=auto
JWT_SECRET=stms_super_secure_jwt_secret_key_college_project_2026!
SIMULATION_INTERVAL_MS=10000
AUTO_SIMULATION_ENABLED=true
```

> [!TIP]
> If you have a local MongoDB running, it will automatically connect to `mongodb://localhost:27017/smart_traffic`. If not, `USE_IN_MEMORY_DB=auto` will automatically start an embedded in-memory MongoDB database so the project works immediately!

---

### Step 5: Seed Demonstration Data
To seed realistic Chennai junction records, traffic signals, sensors, and demo user accounts:

In the terminal:
```powershell
npm run seed
```

---

### Step 6: Start the Application Server
Run the development server:
```powershell
npm start
```
*(Or use `npm run dev` for auto-reloading with nodemon).*

The terminal will display:
```
========================================================
  Smart Traffic Management System (STMS) Server Running 
  Access Website: http://localhost:5000             
  API Base:       http://localhost:5000/api         
  API Health:     http://localhost:5000/api/health  
========================================================
```

---

### Step 7: Access the Website in Your Browser
Open your web browser (Chrome, Edge, Firefox) and navigate to:
```
http://localhost:5000
```
You will be directed to the **Login Portal**.

#### Default Demo Credentials:
| System Role | Email Address | Password |
|---|---|---|
| **System Administrator** | `admin@stms.gov.in` | `Password123!` |
| **Traffic Administrator** | `trafficadmin@stms.gov.in` | `Password123!` |
| **Traffic Officer** | `officer@stms.gov.in` | `Password123!` |

*(You can also click any of the **One-Click Demo Autofill** buttons on the login page for instant login, or switch to the **"Register New Account"** tab to register any new officer or administrator account!)*

---

## 🧪 Testing the Application

### Running Automated Test Suite
To execute the comprehensive automated test suite covering congestion classification, JWT authentication, user registration, RBAC restrictions, input validation, signals, emergency dispatches, and CSV exports:

In the terminal:
```powershell
npm test
```

---

## 📋 REST API Reference

| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | Public |
| `POST` | `/api/auth/register` | Register a new user account & get JWT token | Public |
| `GET` | `/api/auth/me` | Retrieve profile of authenticated user | Officer+ |
| `GET` | `/api/health` | System health and database connection status | Public |
| `GET` | `/api/traffic` | Paginated traffic telemetry records | Public / Officer+ |
| `POST` | `/api/traffic` | Register manual traffic measurement | Officer+ |
| `PUT` | `/api/traffic/:id` | Update traffic record | Officer+ |
| `DELETE`| `/api/traffic/:id` | Delete traffic record | Traffic Admin+ |
| `GET` | `/api/traffic/latest/junctions` | Aggregated latest status for all junctions | Public |
| `GET` | `/api/signals` | List all simulated traffic signals | Public |
| `PUT` | `/api/signals/:id` | Update signal mode/phase in simulation | Officer+ |
| `GET` | `/api/emergency-requests`| List emergency priority corridor requests | Public |
| `POST`| `/api/emergency-requests`| Dispatch new emergency priority corridor | Officer+ |
| `PUT` | `/api/emergency-requests/:id` | Approve or complete emergency request | Traffic Admin+ |
| `GET` | `/api/alerts` | List operational alerts | Public |
| `PUT` | `/api/alerts/:id/acknowledge` | Acknowledge alert | Officer+ |
| `PUT` | `/api/alerts/:id/resolve` | Resolve alert | Officer+ |
| `GET` | `/api/sensors` | List sensor fleet and statuses | Public |
| `PUT` | `/api/sensors/:id` | Update sensor (simulate failure/recovery) | Traffic Admin+ |
| `GET` | `/api/reports/summary`| Aggregated metrics summary | Public |
| `GET` | `/api/reports/export` | Download traffic report as CSV | Public |
| `GET` | `/api/users` | List user accounts | Admin only |
| `POST`| `/api/users` | Create user account | Admin only |
| `PUT` | `/api/users/:id` | Update user account or role | Admin only |
| `DELETE`| `/api/users/:id` | Delete user account | Admin only |
| `POST`| `/api/simulation/step` | Advance simulation cycle by 1 step | Public |
| `POST`| `/api/simulation/toggle` | Toggle automatic simulation ticker | Public |
| `POST`| `/api/seed` | Reset and reseed demonstration database | Public |

---

## 🛠 Troubleshooting Common Issues

1. **Port 5000 Already in Use**:
   If another application is using port 5000, change `PORT=5001` in `backend/.env`.
2. **Cannot Connect to Local MongoDB**:
   No problem! The application defaults to `USE_IN_MEMORY_DB=auto` which automatically initializes an embedded MongoDB engine.
3. **Map Tiles Not Loading**:
   Ensure internet connectivity so the browser can fetch OpenStreetMap tiles from `openstreetmap.org`.
4. **Token Expired Error**:
   Simply log out and log in again, or use one of the one-click demo presets.

---

## 📜 Academic Acknowledgement
Developed for the **Object-Oriented Analysis and Software Engineering (OOASE)** curriculum demonstrating smart city architectural paradigms, micro-services simulation, and RESTful web development.
#   S m a r t - t r a f f i c  
 