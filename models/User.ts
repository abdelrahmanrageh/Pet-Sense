import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  verified: boolean;
  userType: "user" | "doctor";
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
  };
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
    address: string;
    city: string;
    country: string;
  };
  isActive: boolean;
  deactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDoctor extends Document {
  userId: mongoose.Types.ObjectId;
  licenseNumber: string;
  specialization: string[];
  experience: number;
  clinicName: string;
  clinicAddress: string;
  workingHours: {
    day: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
  consultationFee: number;
  bio: string;
  education: string[];
  certificates: string[];
  rating: {
    average: number;
    totalReviews: number;
  };
  statistics: {
    totalPatients: number;
    totalReservations: number;
    completedReservations: number;
  };
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVerificationCode extends Document {
  email: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    userType: {
      type: String,
      enum: ["user", "doctor"],
      required: true,
    },
    profile: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
      },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      address: String,
      city: String,
      country: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deactivatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const DoctorSchema = new Schema<IDoctor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    specialization: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    experience: {
      type: Number,
      required: true,
      min: 0,
    },
    clinicName: {
      type: String,
      required: true,
      trim: true,
    },
    clinicAddress: {
      type: String,
      required: true,
      trim: true,
    },
    workingHours: [
      {
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          required: true,
        },
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
      },
    ],
    consultationFee: {
      type: Number,
      required: true,
      min: 0,
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
    education: [
      {
        type: String,
        trim: true,
      },
    ],
    certificates: [
      {
        type: String,
        trim: true,
      },
    ],
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
    },
    statistics: {
      totalPatients: {
        type: Number,
        default: 0,
      },
      totalReservations: {
        type: Number,
        default: 0,
      },
      completedReservations: {
        type: Number,
        default: 0,
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const VerificationCodeSchema = new Schema<IVerificationCode>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export const Doctor =
  mongoose.models.Doctor || mongoose.model<IDoctor>("Doctor", DoctorSchema);
export const VerificationCode =
  mongoose.models.VerificationCode ||
  mongoose.model<IVerificationCode>("VerificationCode", VerificationCodeSchema);
