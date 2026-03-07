const { prisma } = require("../../config/db");

/**
 * Get all support tickets with optional filters
 */
async function getAllTickets(filters = {}) {
  const { status, category, driverId } = filters;

  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (driverId) where.driverId = driverId;

  return await prisma.supportTicket.findMany({
    where,
    include: {
      driver: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });
}

/**
 * Get ticket statistics
 */
async function getTicketStats() {
  const [open, inProgress, resolved, closed, highPriority, emergencySOS] =
    await Promise.all([
      prisma.supportTicket.count({
        where: { status: "OPEN" },
      }),
      prisma.supportTicket.count({
        where: { status: "IN_PROGRESS" },
      }),
      prisma.supportTicket.count({
        where: { status: "RESOLVED" },
      }),
      prisma.supportTicket.count({
        where: { status: "CLOSED" },
      }),
      prisma.supportTicket.count({
        where: { priority: "HIGH", status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      prisma.supportTicket.count({
        where: { category: "EMERGENCY_SOS", status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
    ]);

  return {
    open,
    inProgress,
    resolved,
    closed,
    highPriority,
    emergencySOS,
    total: open + inProgress + resolved + closed,
    active: open + inProgress,
  };
}

/**
 * Create a new support ticket
 */
async function createTicket(ticketData) {
  const {
    driverId,
    category,
    subject,
    description,
    priority = "MEDIUM",
  } = ticketData;

  // If category is EMERGENCY_SOS, automatically set priority to HIGH
  const finalPriority = category === "EMERGENCY_SOS" ? "HIGH" : priority;

  return await prisma.supportTicket.create({
    data: {
      driverId,
      category,
      subject,
      description,
      priority: finalPriority,
      status: "OPEN",
    },
    include: {
      driver: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
}

/**
 * Update a support ticket
 */
async function updateTicket(ticketId, updateData) {
  const { status, priority, description } = updateData;

  return await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(description && { description }),
    },
    include: {
      driver: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
}

/**
 * Delete a support ticket
 */
async function deleteTicket(ticketId) {
  return await prisma.supportTicket.delete({
    where: { id: ticketId },
  });
}

module.exports = {
  getAllTickets,
  getTicketStats,
  createTicket,
  updateTicket,
  deleteTicket,
};
