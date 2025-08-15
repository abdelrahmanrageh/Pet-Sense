import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/mongodb";
import { User, VerificationCode } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required." },
        { status: 400 }
      );
    }

    // Find all verification codes for this email
    const storedCodes = await VerificationCode.find({ email });
    if (!storedCodes || storedCodes.length === 0) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    // Check if any of the stored codes match the provided code
    let validCode = null;
    for (const storedCode of storedCodes) {
      const isMatch = await bcrypt.compare(code, storedCode.code);
      if (isMatch) {
        validCode = storedCode;
        break;
      }
    }

    if (!validCode) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (validCode.expiresAt < new Date()) {
      await VerificationCode.deleteOne({ _id: validCode._id });
      return NextResponse.json(
        { error: "Verification code has expired." },
        { status: 400 }
      );
    }

    // Mark user as verified
    const user = await User.findOneAndUpdate(
      { email },
      { verified: true },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Remove the verification code after successful verification
    await VerificationCode.deleteOne({ _id: validCode._id });

    return NextResponse.json({
      message: "Email verified successfully.",
      user: {
        id: user._id,
        email: user.email,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
