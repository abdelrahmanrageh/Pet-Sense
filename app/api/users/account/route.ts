import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/mongodb";
import { User, Doctor } from "@/models/User";
import { Pet } from "@/models/Pet";
import { Reservation } from "@/models/Reservation";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Helper function to verify JWT token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string; userId: string };
  } catch {
    return null;
  }
}

// DELETE /api/users/account - Deactivate/Delete user account
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

    const body = await req.json();
    const { password, deleteType } = body;

    // Validate required fields
    if (!password || !deleteType) {
      return NextResponse.json(
        { error: "Password and delete type are required." },
        { status: 400 }
      );
    }

    // Validate delete type
    if (!["deactivate", "permanent"].includes(deleteType)) {
      return NextResponse.json(
        { error: "Delete type must be 'deactivate' or 'permanent'." },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 400 }
      );
    }

    if (deleteType === "deactivate") {
      // Deactivate account (soft delete)
      await User.findByIdAndUpdate(decoded.userId, {
        isActive: false,
        deactivatedAt: new Date(),
        updatedAt: new Date(),
      });

      // If user is a doctor, deactivate doctor profile
      if (user.userType === "doctor") {
        await Doctor.findOneAndUpdate(
          { userId: decoded.userId },
          {
            isActive: false,
            updatedAt: new Date(),
          }
        );
      }

      // Deactivate user's pets
      await Pet.updateMany(
        { ownerId: decoded.userId },
        {
          isActive: false,
          updatedAt: new Date(),
        }
      );

      // Cancel pending/confirmed reservations
      await Reservation.updateMany(
        {
          $or: [
            { userId: decoded.userId },
            {
              doctorId:
                user.userType === "doctor"
                  ? await Doctor.findOne({ userId: decoded.userId }).then(
                      (d) => d?._id
                    )
                  : null,
            },
          ],
          status: { $in: ["pending", "confirmed"] },
        },
        {
          status: "cancelled",
          cancellation: {
            cancelledBy: decoded.userId,
            cancelledAt: new Date(),
            reason: "Account deactivated",
          },
          updatedAt: new Date(),
        }
      );

      return NextResponse.json({
        message:
          "Account deactivated successfully. You can reactivate it by contacting support.",
      });
    } else {
      // Permanent deletion
      // Note: In production, you might want to keep some data for legal/audit purposes
      // and just anonymize it instead of full deletion

      // Cancel all reservations first
      await Reservation.updateMany(
        {
          $or: [
            { userId: decoded.userId },
            {
              doctorId:
                user.userType === "doctor"
                  ? await Doctor.findOne({ userId: decoded.userId }).then(
                      (d) => d?._id
                    )
                  : null,
            },
          ],
          status: { $in: ["pending", "confirmed"] },
        },
        {
          status: "cancelled",
          cancellation: {
            cancelledBy: decoded.userId,
            cancelledAt: new Date(),
            reason: "Account deleted",
          },
        }
      );

      // Delete doctor profile if exists
      if (user.userType === "doctor") {
        await Doctor.findOneAndDelete({ userId: decoded.userId });
      }

      // Delete user's pets
      await Pet.deleteMany({ ownerId: decoded.userId });

      // Finally delete user account
      await User.findByIdAndDelete(decoded.userId);

      return NextResponse.json({
        message: "Account permanently deleted successfully.",
      });
    }
  } catch (error) {
    console.error("Delete account error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/users/account - Reactivate deactivated account
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Check if account is deactivated
    if (user.isActive) {
      return NextResponse.json(
        { error: "Account is already active." },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 400 }
      );
    }

    // Reactivate account
    await User.findByIdAndUpdate(user._id, {
      isActive: true,
      deactivatedAt: undefined,
      updatedAt: new Date(),
    });

    // If user is a doctor, reactivate doctor profile
    if (user.userType === "doctor") {
      await Doctor.findOneAndUpdate(
        { userId: user._id },
        {
          isActive: true,
          updatedAt: new Date(),
        }
      );
    }

    // Reactivate user's pets
    await Pet.updateMany(
      { ownerId: user._id },
      {
        isActive: true,
        updatedAt: new Date(),
      }
    );

    // Generate new JWT token
    const token = jwt.sign(
      { email: user.email, userId: user._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      message: "Account reactivated successfully.",
      token,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("Reactivate account error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error: " + errorMessage },
      { status: 500 }
    );
  }
}
