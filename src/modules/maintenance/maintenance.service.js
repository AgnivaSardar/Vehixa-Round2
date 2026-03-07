const prisma = require("../../config/db.js");

/**
 * Get maintenance orders with optional filters
 */
async function getMaintenanceOrders(filters = {}) {
  const { status, orderType, vehicleId } = filters;

  const where = {};
  if (status) where.status = status;
  if (orderType) where.orderType = orderType;
  if (vehicleId) where.vehicleId = vehicleId;

  return await prisma.maintenanceOrder.findMany({
    where,
    include: {
      vehicle: {
        select: {
          vehicleId: true,
          vehicleNumber: true,
          manufacturer: true,
          model: true,
          year: true,
          status: true,
        },
      },
    },
    orderBy: {
      scheduledDate: "asc",
    },
  });
}

/**
 * Get maintenance KPI statistics
 */
async function getMaintenanceStats() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    vehiclesInMaintenance,
    activeOrders,
    completedThisMonth,
    totalCostThisMonth,
    overdueOrders,
    highPriorityPending,
  ] = await Promise.all([
    // Vehicles currently in maintenance status
    prisma.vehicle.count({
      where: { status: "UNDER_MAINTENANCE" },
    }),

    // Active maintenance orders (not completed)
    prisma.maintenanceOrder.count({
      where: {
        status: { not: "COMPLETED" },
      },
    }),

    // Completed orders this month
    prisma.maintenanceOrder.count({
      where: {
        status: "COMPLETED",
        completedDate: { gte: firstOfMonth },
      },
    }),

    // Total cost this month
    prisma.maintenanceOrder.aggregate({
      where: {
        completedDate: { gte: firstOfMonth },
      },
      _sum: {
        actualCost: true,
      },
    }),

    // Overdue orders (scheduled date passed but not completed)
    prisma.maintenanceOrder.count({
      where: {
        status: { not: "COMPLETED" },
        scheduledDate: { lt: now },
      },
    }),

    // High priority pending orders
    prisma.maintenanceOrder.count({
      where: {
        priority: "HIGH",
        status: { notIn: ["COMPLETED"] },
      },
    }),
  ]);

  // Calculate average downtime (for completed orders this month)
  const completedOrders = await prisma.maintenanceOrder.findMany({
    where: {
      status: "COMPLETED",
      completedDate: { gte: firstOfMonth },
      scheduledDate: { not: null },
    },
    select: {
      scheduledDate: true,
      completedDate: true,
    },
  });

  let avgDowntimeDays = 0;
  if (completedOrders.length > 0) {
    const totalDowntime = completedOrders.reduce((sum, order) => {
      const days = Math.ceil(
        (new Date(order.completedDate) - new Date(order.scheduledDate)) /
          (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);
    avgDowntimeDays = Math.round(totalDowntime / completedOrders.length);
  }

  return {
    vehiclesInMaintenance,
    activeOrders,
    completedThisMonth,
    totalCostThisMonth: totalCostThisMonth._sum.actualCost || 0,
    overdueOrders,
    highPriorityPending,
    avgDowntimeDays,
  };
}

/**
 * Get 6-month cost trend data
 */
async function getCostChart() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const orders = await prisma.maintenanceOrder.findMany({
    where: {
      completedDate: {
        gte: sixMonthsAgo,
      },
      actualCost: {
        not: null,
      },
    },
    select: {
      completedDate: true,
      actualCost: true,
    },
  });

  // Group by month
  const monthlyData = {};
  orders.forEach((order) => {
    const date = new Date(order.completedDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0;
    }
    monthlyData[monthKey] += order.actualCost;
  });

  // Convert to array format with last 6 months
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthName = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    chartData.push({
      month: monthName,
      cost: monthlyData[monthKey] || 0,
    });
  }

  return chartData;
}

/**
 * Get proactive maintenance orders (scheduled preventive maintenance)
 */
async function getProactiveMaintenance() {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  return await prisma.maintenanceOrder.findMany({
    where: {
      orderType: "PROACTIVE",
      status: { notIn: ["COMPLETED"] },
      scheduledDate: {
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      vehicle: {
        select: {
          vehicleId: true,
          vehicleNumber: true,
          manufacturer: true,
          model: true,
        },
      },
    },
    orderBy: {
      scheduledDate: "asc",
    },
  });
}

/**
 * Get maintenance alerts (overdue, high priority, etc.)
 */
async function getMaintenanceAlerts() {
  const now = new Date();

  const [overdue, highPriority, awaitingParts] = await Promise.all([
    // Overdue orders
    prisma.maintenanceOrder.findMany({
      where: {
        status: { not: "COMPLETED" },
        scheduledDate: { lt: now },
      },
      include: {
        vehicle: {
          select: {
            vehicleId: true,
            vehicleNumber: true,
            manufacturer: true,
            model: true,
          },
        },
      },
      orderBy: {
        scheduledDate: "asc",
      },
      take: 10,
    }),

    // High priority pending
    prisma.maintenanceOrder.findMany({
      where: {
        priority: "HIGH",
        status: { notIn: ["COMPLETED"] },
      },
      include: {
        vehicle: {
          select: {
            vehicleId: true,
            vehicleNumber: true,
            manufacturer: true,
            model: true,
          },
        },
      },
      orderBy: {
        scheduledDate: "asc",
      },
      take: 10,
    }),

    // Awaiting parts
    prisma.maintenanceOrder.findMany({
      where: {
        status: "AWAITING_PARTS",
      },
      include: {
        vehicle: {
          select: {
            vehicleId: true,
            vehicleNumber: true,
            manufacturer: true,
            model: true,
          },
        },
      },
      take: 10,
    }),
  ]);

  return {
    overdue,
    highPriority,
    awaitingParts,
  };
}

/**
 * Get service history for a vehicle
 */
async function getServiceHistory(vehicleId) {
  return await prisma.maintenanceOrder.findMany({
    where: {
      vehicleId,
    },
    orderBy: {
      completedDate: "desc",
    },
  });
}

/**
 * Create a new maintenance order
 */
async function createMaintenanceOrder(orderData) {
  const {
    vehicleId,
    title,
    description,
    priority = "MEDIUM",
    orderType = "CORRECTIVE",
    mechanicName,
    scheduledDate,
    estimatedCost,
    odometerReading,
    etaParts,
  } = orderData;

  // Create the order
  const order = await prisma.maintenanceOrder.create({
    data: {
      vehicleId,
      title,
      description,
      priority,
      orderType,
      mechanicName,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
      odometerReading: odometerReading ? parseFloat(odometerReading) : null,
      etaParts,
      status: "SCHEDULED",
    },
    include: {
      vehicle: true,
    },
  });

  // Update vehicle status to UNDER_MAINTENANCE if currently ACTIVE
  await prisma.vehicle.updateMany({
    where: {
      vehicleId,
      status: "ACTIVE",
    },
    data: {
      status: "UNDER_MAINTENANCE",
    },
  });

  return order;
}

/**
 * Update Kanban status of a maintenance order
 */
async function updateOrderStatus(orderId, newStatus) {
  const order = await prisma.maintenanceOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Maintenance order not found");
  }

  const updateData = { status: newStatus };

  // If moving to COMPLETED, set completed date
  if (newStatus === "COMPLETED") {
    updateData.completedDate = new Date();

    // Reset vehicle status to ACTIVE
    await prisma.vehicle.update({
      where: { vehicleId: order.vehicleId },
      data: { status: "ACTIVE" },
    });
  }

  return await prisma.maintenanceOrder.update({
    where: { id: orderId },
    data: updateData,
    include: {
      vehicle: true,
    },
  });
}

/**
 * Update maintenance order details
 */
async function updateOrder(orderId, updateData) {
  const {
    title,
    description,
    priority,
    mechanicName,
    scheduledDate,
    estimatedCost,
    actualCost,
    odometerReading,
    etaParts,
    invoiceUrl,
  } = updateData;

  return await prisma.maintenanceOrder.update({
    where: { id: orderId },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(priority && { priority }),
      ...(mechanicName !== undefined && { mechanicName }),
      ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
      ...(estimatedCost !== undefined && {
        estimatedCost: parseFloat(estimatedCost),
      }),
      ...(actualCost !== undefined && { actualCost: parseFloat(actualCost) }),
      ...(odometerReading !== undefined && {
        odometerReading: parseFloat(odometerReading),
      }),
      ...(etaParts !== undefined && { etaParts }),
      ...(invoiceUrl !== undefined && { invoiceUrl }),
    },
    include: {
      vehicle: true,
    },
  });
}

/**
 * Delete a maintenance order
 */
async function deleteOrder(orderId) {
  return await prisma.maintenanceOrder.delete({
    where: { id: orderId },
  });
}

/**
 * Get downtime statistics
 */
async function getDowntimeStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all completed orders in last 30 days
  const recentOrders = await prisma.maintenanceOrder.findMany({
    where: {
      status: "COMPLETED",
      completedDate: {
        gte: thirtyDaysAgo,
      },
      scheduledDate: {
        not: null,
      },
    },
    select: {
      scheduledDate: true,
      completedDate: true,
      vehicleId: true,
      vehicle: {
        select: {
          vehicleNumber: true,
          manufacturer: true,
          model: true,
        },
      },
    },
  });

  // Calculate downtime per vehicle
  const vehicleDowntime = {};
  let totalDowntimeDays = 0;

  recentOrders.forEach((order) => {
    const downtimeDays = Math.ceil(
      (new Date(order.completedDate) - new Date(order.scheduledDate)) /
        (1000 * 60 * 60 * 24)
    );

    totalDowntimeDays += downtimeDays;

    if (!vehicleDowntime[order.vehicleId]) {
      vehicleDowntime[order.vehicleId] = {
        vehicle: order.vehicle,
        downtimeDays: 0,
        ordersCount: 0,
      };
    }

    vehicleDowntime[order.vehicleId].downtimeDays += downtimeDays;
    vehicleDowntime[order.vehicleId].ordersCount += 1;
  });

  const avgDowntimeDays =
    recentOrders.length > 0
      ? Math.round(totalDowntimeDays / recentOrders.length)
      : 0;

  return {
    avgDowntimeDays,
    totalOrders: recentOrders.length,
    vehicleBreakdown: Object.values(vehicleDowntime)
      .sort((a, b) => b.downtimeDays - a.downtimeDays)
      .slice(0, 10), // Top 10 vehicles with most downtime
  };
}

module.exports = {
  getMaintenanceOrders,
  getMaintenanceStats,
  getCostChart,
  getProactiveMaintenance,
  getMaintenanceAlerts,
  getServiceHistory,
  createMaintenanceOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  getDowntimeStats,
};
