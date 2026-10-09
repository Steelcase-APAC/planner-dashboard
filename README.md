# PlannerHub — Executive Overview & Project Dashboard

A modern, high-performance executive dashboard for **Microsoft Planner**, built with Monday.com and Asana-level capabilities.

## 🚀 Live Data Connection
- **Primary Data Source**: Live pCloud Cloud Link (updated automatically every 2 hours):  
  `https://u.pcloud.link/publink/show?code=XZonTYJZHVtopfBfvtyoR2DmV4ctcfrfOPBX`
- **Sync Engine (`server.py`)**: Dedicated local server with `/api/sync` endpoint that pulls the latest `planner_tasks_consolidated.xlsx` from pCloud in real-time, with local drive sync fallback (`~/pCloud Drive/- Ai software/`).
- **Local Fallback**: Instant loads (0ms) using browser cache (`localStorage`) and local cache in `data/planner_tasks.json` and `data/planner_sheet.csv`.

---

## 🌟 Key Features

1. **Executive Overview Dashboard**:
   - Real-time KPI summary (Total Tasks, In Progress, Completed %, Overdue Deliverables, Urgent Items).
   - Task distribution breakdown across your 7 buckets.
   - Project delivery health matrix (gauge & risk score).
   - Attention table highlighting overdue tasks and deliverables due within 7 days.

2. **Interactive Plan Table (Monday.com Style)**:
   - Grouped by project bucket with expandable/collapsible sections.
   - Status pills with color gradients (Not Started, In Progress, Completed, Overdue).
   - Priority badges (Urgent 🔴, Important 🟠, Medium 🔵, Low ⚪).
   - Relative due-date indicators (e.g., `Due in 3 days`, `2d overdue`).

3. **Visual Timeline & Gantt Chart (Asana Style)**:
   - Interactive timeline plotting task start and due dates.
   - Zoom controls (`Days`, `Weeks`, `Months`).
   - "Today" marker to track active sprints.
   - Click any task to inspect details and notes.

4. **Kanban Board**:
   - Dynamic grouping by **Status**, **Bucket**, **Priority**, or **Assignee**.
   - Rich task cards with priority badges, checklist counts, and tags.

5. **Team Workload & Capacity Heatmap**:
   - Resource distribution matrix across team members (**Aisah**, **Adam**, **Rebecca**).
   - Identifies overloaded team members and overdue task concentration.

6. **Instant Search & Multi-Filters**:
   - Sub-10ms fuzzy search across task titles, notes, links, and assignees.
   - Multi-dropdown filter by Bucket, Priority, Status, or Assignee.

7. **Settings & Custom Aliases**:
   - Customize friendly names for your 7 Planner buckets.
   - Customize team member names.
   - Change Google Sheet source URL or sync intervals.

8. **Export**:
   - One-click export of filtered tasks to clean CSV.

---

## 💻 How to Run Locally

You can run this dashboard locally using any simple web server:

### Option A: Using Python Server with Live pCloud Sync (Recommended)
```bash
python3 server.py
```
Then open: **http://localhost:3000** in Chrome, Safari, or Edge.

### Option B: Using Node.js
```bash
npx serve . -p 3000
```

---

## 📂 Project Structure

```
Planner-dashboard/
├── index.html                  # HTML5 markup and view structures
├── styles.css                  # Modern design system (dark/light themes, Monday pills, Gantt)
├── app.js                      # Application engine, CSV parser, and live sync scheduler
├── data/
│   └── planner_sheet.csv       # Local backup snapshot of the Planner data
├── PLANNER_OVERVIEW_SPEC.md    # Architecture and PM feature benchmark matrix
└── README.md                   # Project documentation
```
