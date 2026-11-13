import Task from "../models/Task.js";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/tasks?from=&to=&q=&status=
export const getTasks = async (req, res) => {
  const { from, to, q, status } = req.query;
  const filter = {};

  if (status) filter.status = status;

  if (from || to) {
    filter.dueAt = {};
    if (from) filter.dueAt.$gte = new Date(from);
    if (to) filter.dueAt.$lt = new Date(to);
  }

  if (q && q.trim()) {
    const regex = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const tasks = await Task.find(filter).sort({ dueAt: 1 });
  res.json(tasks);
};

// GET /api/tasks/:id
export const getTaskById = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json(task);
};

// GET /api/tasks/summary/weekly?tz=Asia/Kolkata
export const getWeeklySummary = async (req, res) => {
  const timezone = req.query.tz || "UTC";

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return res.status(400).json({ message: "Invalid timezone" });
  }

  const weeks = await Task.aggregate([
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: "$dueAt",
            unit: "week",
            startOfWeek: "monday",
            timezone,
          },
        },
        open: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 0, 1] } },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: -1 } },
    { $project: { _id: 0, weekStart: "$_id", open: 1, completed: 1 } },
  ]);

  res.json(weeks);
};

// POST /api/tasks
export const createTask = async (req, res) => {
  const { title, description, dueAt, priority } = req.body;
  const task = await Task.create({ title, description, dueAt, priority });
  res.status(201).json(task);
};

// PATCH /api/tasks/:id
export const updateTask = async (req, res) => {
  const allowed = ["title", "description", "dueAt", "priority", "status"];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (updates.status) {
    updates.completedAt = updates.status === "completed" ? new Date() : null;
  }

  const task = await Task.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json(task);
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.status(204).end();
};
