require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { initSocket } = require('./sockets/socket');
const { startEscalationEngine } = require('./services/escalation.service');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const approvalsRoutes = require('./routes/approvals.routes');
const usersRoutes = require('./routes/users.routes');
const departmentsRoutes = require('./routes/departments.routes');
const teamsRoutes = require('./routes/teams.routes');
const projectsRoutes = require('./routes/projects.routes');
const milestonesRoutes = require('./routes/milestones.routes');
const tasksRoutes = require('./routes/tasks.routes');
const documentsRoutes = require('./routes/documents.routes');
const risksRoutes = require('./routes/risks.routes');
const announcementsRoutes = require('./routes/announcements.routes');
const chatRoutes = require('./routes/chat.routes');
const calendarRoutes = require('./routes/calendar.routes');
const auditRoutes = require('./routes/audit.routes');
const reportsRoutes = require('./routes/reports.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();
const server = http.createServer(app);

// --- Performance & security middleware ---
app.use(helmet({ crossOriginResourcePolicy: false })); // allow serving /uploads across origin
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('tiny'));
}

// Serve uploaded project documents
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- Rate limiting ---
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});
app.use('/api/', apiLimiter);

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/projects/:projectId/milestones', milestonesRoutes);
app.use('/api/milestones', milestonesRoutes.standalone);
app.use('/api/projects/:projectId/tasks', tasksRoutes);
app.use('/api/tasks', tasksRoutes.standalone);
app.use('/api/projects/:projectId/documents', documentsRoutes);
app.use('/api/documents', documentsRoutes.standalone);
app.use('/api/projects/:projectId/risks', risksRoutes);
app.use('/api/risks', risksRoutes.standalone);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

// --- Realtime + Escalation engine ---
initSocket(server);
startEscalationEngine();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`GoalSync Enterprise backend listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = { app, server };
