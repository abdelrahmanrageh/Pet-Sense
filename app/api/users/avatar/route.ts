import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { User, Doctor } from "@/models/User";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

// Helper function to verify JWT token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string; userId: string };
  } catch {
    return null;
  }
}

// Allowed image types and size limits
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/users/avatar - Upload user avatar
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Create unique filename
    const fileExtension = path.extname(file.name);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update user avatar URL
    const avatarUrl = `/uploads/avatars/${fileName}`;
    await User.findByIdAndUpdate(decoded.userId, {
      "profile.avatar": avatarUrl,
      updatedAt: new Date(),
    });

    // If user is a doctor, update doctor profile avatar too
    if (user.userType === "doctor") {
      await Doctor.findOneAndUpdate(
        { userId: decoded.userId },
        {
          "profile.avatar": avatarUrl,
          updatedAt: new Date(),
        }
      );
    }

    return NextResponse.json({
      message: "Avatar uploaded successfully.",
      avatarUrl,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/users/avatar - Remove user avatar
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Remove avatar from filesystem if it exists
    if (user.profile?.avatar && user.profile.avatar.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", user.profile.avatar);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.error("Error deleting avatar file:", unlinkError);
          // Continue with database update even if file deletion fails
        }
      }
    }

    // Update user to remove avatar
    await User.findByIdAndUpdate(decoded.userId, {
      "profile.avatar": "",
      updatedAt: new Date(),
    });

    // If user is a doctor, remove from doctor profile too
    if (user.userType === "doctor") {
      await Doctor.findOneAndUpdate(
        { userId: decoded.userId },
        {
          "profile.avatar": "",
          updatedAt: new Date(),
        }
      );
    }

    return NextResponse.json({
      message: "Avatar removed successfully.",
    });
  } catch (error) {
    console.error("Avatar removal error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}
