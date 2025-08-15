import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/mongodb";
import { User, VerificationCode } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    if (!req.body) {
      return NextResponse.json(
        { error: "Request body is required." },
        { status: 400 }
      );
    }
    const body = await req.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
    });
    await user.save();

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Hash the verification code before storing
    // const hashedVerificationCode = await bcrypt.hash(verificationCode, 10);

    // await VerificationCode.create({
    //   email,
    //   code: hashedVerificationCode,
    // });
    
    // In a real app, send verification email here
    console.log(`Verification code for ${email}: ${verificationCode}`);

    return NextResponse.json({
      message: "Signup successful.",
      // verificationCode, // Remove this in production
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
