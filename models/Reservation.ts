import mongoose, { Document, Schema } from "mongoose";

export interface IReservation extends Document {
  userId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  petId: mongoose.Types.ObjectId;
  appointmentDate: Date;
  appointmentTime: string;
  duration: number; // in minutes
  status:
    | "pending"
    | "confirmed"
    | "in-progress"
    | "completed"
    | "cancelled"
    | "no-show";
  type: "consultation" | "checkup" | "vaccination" | "surgery" | "emergency";
  reason: string;
  symptoms?: string[];
  urgency: "low" | "medium" | "high" | "emergency";
  notes?: string;
  fees: {
    consultationFee: number;
    additionalCharges: number;
    totalAmount: number;
    paymentStatus: "pending" | "paid" | "refunded";
    paymentMethod?: string;
  };
  reminders: {
    sent: boolean;
    sentAt?: Date;
  };
  cancellation?: {
    cancelledBy: mongoose.Types.ObjectId;
    cancelledAt: Date;
    reason: string;
    refundAmount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IReview extends Document {
  reservationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  categories: {
    communication: number;
    professionalism: number;
    facilities: number;
    overall: number;
  };
  isVerified: boolean;
  helpfulVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAvailability extends Document {
  doctorId: mongoose.Types.ObjectId;
  date: Date;
  timeSlots: {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    reservationId?: mongoose.Types.ObjectId;
  }[];
  isWorkingDay: boolean;
  specialNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    petId: {
      type: Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 30,
      min: 15,
      max: 180,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in-progress",
        "completed",
        "cancelled",
        "no-show",
      ],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["consultation", "checkup", "vaccination", "surgery", "emergency"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    symptoms: [
      {
        type: String,
        trim: true,
      },
    ],
    urgency: {
      type: String,
      enum: ["low", "medium", "high", "emergency"],
      default: "medium",
    },
    notes: {
      type: String,
      trim: true,
    },
    fees: {
      consultationFee: {
        type: Number,
        required: true,
        min: 0,
      },
      additionalCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      paymentStatus: {
        type: String,
        enum: ["pending", "paid", "refunded"],
        default: "pending",
      },
      paymentMethod: {
        type: String,
        trim: true,
      },
    },
    reminders: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: {
        type: Date,
      },
    },
    cancellation: {
      cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      cancelledAt: {
        type: Date,
      },
      reason: {
        type: String,
        trim: true,
      },
      refundAmount: {
        type: Number,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

const ReviewSchema = new Schema<IReview>(
  {
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    categories: {
      communication: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      professionalism: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      facilities: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      overall: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const AvailabilitySchema = new Schema<IAvailability>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlots: [
      {
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
        reservationId: {
          type: Schema.Types.ObjectId,
          ref: "Reservation",
        },
      },
    ],
    isWorkingDay: {
      type: Boolean,
      default: true,
    },
    specialNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound indexes for better query performance
ReservationSchema.index({ userId: 1, appointmentDate: -1 });
ReservationSchema.index({ doctorId: 1, appointmentDate: -1 });
ReservationSchema.index({ petId: 1, appointmentDate: -1 });
ReservationSchema.index({ status: 1, appointmentDate: 1 });
ReviewSchema.index({ doctorId: 1, createdAt: -1 });
AvailabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true });

export const Reservation =
  mongoose.models.Reservation ||
  mongoose.model<IReservation>("Reservation", ReservationSchema);
export const Review =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);
export const Availability =
  mongoose.models.Availability ||
  mongoose.model<IAvailability>("Availability", AvailabilitySchema);
