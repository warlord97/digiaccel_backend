// server/src/models/Task.js
import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    dueAt: {
      type: Date,
      required: [true, 'Date and time is required'],
    },
    priority: {
      type: String,
      enum: { values: ['low', 'medium', 'high'], message: 'Invalid priority' },
      default: 'medium',
    },
    status: {
      type: String,
      enum: { values: ['in_progress', 'completed'], message: 'Invalid status' },
      default: 'in_progress',
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Weekly summary and week range queries both filter and sort by dueAt
taskSchema.index({ dueAt: 1 });

export default mongoose.model('Task', taskSchema);