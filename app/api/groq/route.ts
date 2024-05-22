import { NextResponse, NextRequest } from 'next/server';

export const GET = async () => {
  return NextResponse.json({
    apiKey: process.env.GROQ_API_KEY ?? "",
  });
};
