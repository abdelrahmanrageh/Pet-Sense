import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Check if user is verified (temporarily disabled until SMTP is set up)
    // if (!user.verified) {
    //   return NextResponse.json(
    //     { error: "Please verify your email first." },
    //     { status: 401 }
    //   );
    // }

    // Generate JWT token
    const token = jwt.sign(
      { email: user.email, userId: user._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
