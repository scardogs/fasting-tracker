import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            default: 'default-user', // Simple user identification for now
            index: true,
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            default: null,
        },
        duration: {
            type: Number, // Duration in seconds
            default: 0,
        },
        goalHours: {
            type: Number,
            required: true,
            default: 16,
        },
        goalReached: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        notes: {
            type: String,
            default: '',
            maxlength: 500,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

// Create compound index for efficient queries
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);
