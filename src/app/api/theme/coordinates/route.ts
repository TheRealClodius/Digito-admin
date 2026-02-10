import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://ipapi.co/json/");

    if (!response.ok) {
      throw new Error("Failed to fetch from ipapi.co");
    }

    const data = await response.json();

    if (!data.latitude || !data.longitude) {
      throw new Error("Invalid response from ipapi.co");
    }

    return NextResponse.json({
      lat: data.latitude,
      lng: data.longitude,
    });
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return NextResponse.json(
      { error: "Failed to fetch coordinates" },
      { status: 500 }
    );
  }
}
