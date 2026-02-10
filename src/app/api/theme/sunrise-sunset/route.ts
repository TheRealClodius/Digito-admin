import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing lat or lng parameter" },
      { status: 400 }
    );
  }

  try {
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch from sunrise-sunset.org");
    }

    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error("Invalid response from sunrise-sunset.org");
    }

    return NextResponse.json({
      sunrise: data.results.sunrise,
      sunset: data.results.sunset,
    });
  } catch (error) {
    console.error("Error fetching sunrise/sunset times:", error);
    return NextResponse.json(
      { error: "Failed to fetch sunrise/sunset times" },
      { status: 500 }
    );
  }
}
