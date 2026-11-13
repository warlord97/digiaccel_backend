import { Router } from "express";
import {
  getTasks,
  getTaskById,
  getWeeklySummary,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = Router();

// Must be declared before /:id, otherwise 'summary' is read as an id
router.get("/summary/weekly", getWeeklySummary);

router.route("/").get(getTasks).post(createTask);
router.route("/:id").get(getTaskById).patch(updateTask).delete(deleteTask);

export default router;
