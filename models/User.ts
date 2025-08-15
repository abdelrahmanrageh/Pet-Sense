import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  verified: boolean;
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
export const VerificationCode =
  mongoose.models.VerificationCode ||
  mongoose.model<IVerificationCode>("VerificationCode", VerificationCodeSchema);
