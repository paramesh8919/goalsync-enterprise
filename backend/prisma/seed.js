const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n) => new Date(Date.now() + n * DAY);

async function upsertUser({ name, email, role, jobTitle, departmentId, managerId, skills, teamId }) {
  const password = await bcrypt.hash('Password123!', 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      password,
      role,
      isActive: true,
      approvalStatus: 'APPROVED',
      departmentId: departmentId || null,
      managerId: managerId || null,
      teamId: teamId || null,
      jobTitle,
      skills: skills || [],
    },
  });
}

async function main() {
  console.log('Seeding departments...');
  const engineering = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: { name: 'Engineering', description: 'Product engineering' },
  });
  const productDept = await prisma.department.upsert({
    where: { name: 'Product' },
    update: {},
    create: { name: 'Product', description: 'Product management & design' },
  });

  console.log('Seeding admins & managers...');
  const admin1 = await upsertUser({ name: 'Ava Admin', email: 'admin@goalsync.com', role: 'ADMIN', jobTitle: 'System Administrator', departmentId: engineering.id });
  const admin2 = await upsertUser({ name: 'Adrian Ortiz', email: 'admin2@goalsync.com', role: 'ADMIN', jobTitle: 'IT Administrator', departmentId: productDept.id });

  const manager1 = await upsertUser({ name: 'Morgan Manager', email: 'manager@goalsync.com', role: 'MANAGER', jobTitle: 'Engineering Manager', departmentId: engineering.id });
  const manager2 = await upsertUser({ name: 'Maya Reyes', email: 'manager2@goalsync.com', role: 'MANAGER', jobTitle: 'Product Manager', departmentId: productDept.id });

  console.log('Seeding team leaders...');
  const leader1 = await upsertUser({ name: 'Lee Leader', email: 'lead@goalsync.com', role: 'TEAM_LEADER', jobTitle: 'Team Leader', departmentId: engineering.id, managerId: manager1.id });
  const leader2 = await upsertUser({ name: 'Lucia Nunez', email: 'lead2@goalsync.com', role: 'TEAM_LEADER', jobTitle: 'Team Leader', departmentId: engineering.id, managerId: manager2.id });

  console.log('Seeding teams (groups)...');
  const teamAlpha = await prisma.team.upsert({
    where: { leaderId: leader1.id },
    update: {},
    create: { name: 'Platform Squad', description: 'Owns the core platform services', departmentId: engineering.id, leaderId: leader1.id },
  });
  const teamBeta = await prisma.team.upsert({
    where: { leaderId: leader2.id },
    update: {},
    create: { name: 'Growth Squad', description: 'Owns onboarding & growth features', departmentId: productDept.id, leaderId: leader2.id },
  });

  console.log('Seeding 10 employees across the two teams...');
  const employeeDefs = [
    { name: 'Emery Employee', email: 'employee@goalsync.com', team: teamAlpha, manager: manager1, skills: ['React', 'Node.js', 'SQL'], title: 'Software Engineer' },
    { name: 'Noah Patel', email: 'noah.patel@goalsync.com', team: teamAlpha, manager: manager1, skills: ['React', 'TypeScript'], title: 'Frontend Engineer' },
    { name: 'Sofia Alvarez', email: 'sofia.alvarez@goalsync.com', team: teamAlpha, manager: manager1, skills: ['Node.js', 'PostgreSQL'], title: 'Backend Engineer' },
    { name: 'Liam Chen', email: 'liam.chen@goalsync.com', team: teamAlpha, manager: manager1, skills: ['DevOps', 'AWS'], title: 'DevOps Engineer' },
    { name: 'Priya Sharma', email: 'priya.sharma@goalsync.com', team: teamAlpha, manager: manager1, skills: ['Testing', 'Cypress'], title: 'QA Engineer' },
    { name: 'Ethan Brooks', email: 'ethan.brooks@goalsync.com', team: teamBeta, manager: manager2, skills: ['React Native', 'UX'], title: 'Mobile Engineer' },
    { name: 'Zara Malik', email: 'zara.malik@goalsync.com', team: teamBeta, manager: manager2, skills: ['Figma', 'UX Research'], title: 'Product Designer' },
    { name: 'Diego Ramirez', email: 'diego.ramirez@goalsync.com', team: teamBeta, manager: manager2, skills: ['Node.js', 'GraphQL'], title: 'Backend Engineer' },
    { name: 'Hannah Kim', email: 'hannah.kim@goalsync.com', team: teamBeta, manager: manager2, skills: ['Analytics', 'SQL'], title: 'Data Analyst' },
    { name: 'Marcus Webb', email: 'marcus.webb@goalsync.com', team: teamBeta, manager: manager2, skills: ['Testing', 'Automation'], title: 'QA Engineer' },
  ];

  const employees = [];
  for (const e of employeeDefs) {
    const user = await upsertUser({
      name: e.name,
      email: e.email,
      role: 'EMPLOYEE',
      jobTitle: e.title,
      departmentId: e.team.departmentId,
      managerId: e.manager.id,
      skills: e.skills,
      teamId: e.team.id,
    });
    employees.push({ ...user, team: e.team });
  }

  const alphaEmployees = employees.filter((e) => e.team.id === teamAlpha.id);
  const betaEmployees = employees.filter((e) => e.team.id === teamBeta.id);

  // A still-pending applicant, to populate the Approvals screen out of the box.
  await prisma.user.upsert({
    where: { email: 'pending@goalsync.com' },
    update: {},
    create: {
      name: 'Pat Pending',
      email: 'pending@goalsync.com',
      password: await bcrypt.hash('Password123!', 10),
      role: 'EMPLOYEE',
      isActive: false,
      approvalStatus: 'PENDING',
      departmentId: engineering.id,
      jobTitle: 'QA Engineer',
      skills: ['Testing'],
    },
  });

  console.log('Seeding 3 active projects with milestones & tasks...');

  async function seedProject({ title, description, priority, team, leader, dueInDays, employees, taskDefs }) {
    let project = await prisma.project.findFirst({ where: { title } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          title,
          description,
          priority,
          teamId: team.id,
          createdById: leader.id,
          status: 'ACTIVE',
          submittedAt: new Date(),
          managerDecision: 'APPROVED',
          managerDecisionById: manager1.id,
          managerDecisionAt: new Date(),
          adminDecision: 'APPROVED',
          adminDecisionById: admin1.id,
          adminDecisionAt: new Date(),
          dueDate: daysFromNow(dueInDays),
        },
      });

      const milestone = await prisma.milestone.create({
        data: { projectId: project.id, title: 'Phase 1 delivery', dueDate: daysFromNow(Math.round(dueInDays / 2)) },
      });

      for (const t of taskDefs) {
        await prisma.task.create({
          data: {
            projectId: project.id,
            milestoneId: milestone.id,
            title: t.title,
            priority: t.priority || 'MEDIUM',
            status: t.status,
            progress: t.progress,
            assigneeId: employees[t.assigneeIdx % employees.length].id,
            dueDate: t.overdue ? daysFromNow(-2) : daysFromNow(t.due || 10),
          },
        });
      }
    }
    return project;
  }

  await seedProject({
    title: 'Customer Portal Revamp',
    description: 'Rebuild the customer-facing portal with the new design system.',
    priority: 'HIGH',
    team: teamAlpha,
    leader: leader1,
    dueInDays: 30,
    employees: alphaEmployees,
    taskDefs: [
      { title: 'Build the new dashboard layout', priority: 'HIGH', status: 'DONE', progress: 100, assigneeIdx: 0, due: 5 },
      { title: 'Wire up authentication flow', priority: 'HIGH', status: 'IN_PROGRESS', progress: 60, assigneeIdx: 1, due: 8 },
      { title: 'API integration for billing', status: 'IN_PROGRESS', progress: 40, assigneeIdx: 2, due: 12 },
      { title: 'Set up CI/CD pipeline', status: 'DONE', progress: 100, assigneeIdx: 3, due: 3 },
      { title: 'Regression test suite', status: 'TODO', progress: 0, assigneeIdx: 4, overdue: true, priority: 'HIGH' },
    ],
  });

  await seedProject({
    title: 'Internal Analytics Revamp',
    description: 'Modernize the internal analytics pipeline and reporting dashboards.',
    priority: 'MEDIUM',
    team: teamAlpha,
    leader: leader1,
    dueInDays: 45,
    employees: alphaEmployees,
    taskDefs: [
      { title: 'Migrate ETL jobs to new pipeline', status: 'IN_PROGRESS', progress: 30, assigneeIdx: 2, due: 20 },
      { title: 'Design new metrics schema', status: 'DONE', progress: 100, assigneeIdx: 0, due: 6 },
      { title: 'Load-test the ingestion service', status: 'TODO', progress: 0, assigneeIdx: 3, due: 25 },
    ],
  });

  await seedProject({
    title: 'Mobile Onboarding Redesign',
    description: 'Redesign first-run onboarding to improve activation on Android/iOS.',
    priority: 'HIGH',
    team: teamBeta,
    leader: leader2,
    dueInDays: 25,
    employees: betaEmployees,
    taskDefs: [
      { title: 'Ship new onboarding screens', priority: 'HIGH', status: 'IN_PROGRESS', progress: 55, assigneeIdx: 0, due: 10 },
      { title: 'Usability testing round 1', status: 'DONE', progress: 100, assigneeIdx: 1, due: 4 },
      { title: 'Instrument onboarding analytics events', status: 'IN_PROGRESS', progress: 20, assigneeIdx: 3, due: 15 },
      { title: 'Fix drop-off on permissions screen', priority: 'CRITICAL', status: 'TODO', progress: 0, assigneeIdx: 2, overdue: true },
      { title: 'QA pass on Android devices', status: 'TODO', progress: 0, assigneeIdx: 4, due: 18 },
    ],
  });

  console.log('Seed complete.');
  console.log('');
  console.log('Login with password "Password123!" as any of:');
  console.log('  admin@goalsync.com / admin2@goalsync.com          (Admin)');
  console.log('  manager@goalsync.com / manager2@goalsync.com      (Manager)');
  console.log('  lead@goalsync.com / lead2@goalsync.com             (Team Leader)');
  console.log('  employee@goalsync.com, noah.patel@goalsync.com, sofia.alvarez@goalsync.com,');
  console.log('  liam.chen@goalsync.com, priya.sharma@goalsync.com  (Team Alpha — Platform Squad)');
  console.log('  ethan.brooks@goalsync.com, zara.malik@goalsync.com, diego.ramirez@goalsync.com,');
  console.log('  hannah.kim@goalsync.com, marcus.webb@goalsync.com  (Team Beta — Growth Squad)');
  console.log('  pending@goalsync.com — NOT usable yet, shows up on the Approvals screen');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
