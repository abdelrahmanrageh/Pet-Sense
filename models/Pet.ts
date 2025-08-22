import mongoose, { Document, Schema } from "mongoose";

export interface IPet extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  gender: "male" | "female";
  color: string;
  microchipId?: string;
  avatar?: string;
  medicalHistory: {
    allergies: string[];
    chronicConditions: string[];
    medications: string[];
    vaccinations: {
      name: string;
      date: Date;
      nextDue?: Date;
      veterinarian: string;
    }[];
    surgeries: {
      name: string;
      date: Date;
      veterinarian: string;
      notes?: string;
    }[];
  };
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMedicalRecord extends Document {
  petId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  reservationId?: mongoose.Types.ObjectId;
  visitDate: Date;
  diagnosis: string;
  symptoms: string[];
  treatment: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PetSchema = new Schema<IPet>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    species: {
      type: String,
      required: true,
      trim: true,
    },
    breed: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 0,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    microchipId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    medicalHistory: {
      allergies: [
        {
          type: String,
          trim: true,
        },
      ],
      chronicConditions: [
        {
          type: String,
          trim: true,
        },
      ],
      medications: [
        {
          type: String,
          trim: true,
        },
      ],
      vaccinations: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },
          date: {
            type: Date,
            required: true,
          },
          nextDue: {
            type: Date,
          },
          veterinarian: {
            type: String,
            required: true,
            trim: true,
          },
        },
      ],
      surgeries: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },
          date: {
            type: Date,
            required: true,
          },
          veterinarian: {
            type: String,
            required: true,
            trim: true,
          },
          notes: {
            type: String,
            trim: true,
          },
        },
      ],
    },
    emergencyContact: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      relation: {
        type: String,
        required: true,
        trim: true,
      },
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

const MedicalRecordSchema = new Schema<IMedicalRecord>(
  {
    petId: {
      type: Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: "Reservation",
    },
    visitDate: {
      type: Date,
      required: true,
    },
    diagnosis: {
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
    treatment: {
      type: String,
      required: true,
      trim: true,
    },
    medications: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        dosage: {
          type: String,
          required: true,
          trim: true,
        },
        frequency: {
          type: String,
          required: true,
          trim: true,
        },
        duration: {
          type: String,
          required: true,
          trim: true,
        },
        instructions: {
          type: String,
          trim: true,
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
    attachments: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
PetSchema.index({ ownerId: 1 });
PetSchema.index({ species: 1 });
MedicalRecordSchema.index({ petId: 1, visitDate: -1 });
MedicalRecordSchema.index({ doctorId: 1, visitDate: -1 });

export const Pet =
  mongoose.models.Pet || mongoose.model<IPet>("Pet", PetSchema);
export const MedicalRecord =
  mongoose.models.MedicalRecord ||
  mongoose.model<IMedicalRecord>("MedicalRecord", MedicalRecordSchema);
