import { NextRequest, NextResponse } from "next/server";
import { auth } from "@bazaar/auth";
import { db } from "@bazaar/database";
import { users } from "@bazaar/database";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get session from the request
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        isAuthenticated: false, 
        isAdmin: false,
        user: null 
      });
    }

    // Check if user is admin
    const user = await db
      .select({ 
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        isAdmin: users.isAdmin 
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user[0]) {
      return NextResponse.json({ 
        isAuthenticated: false, 
        isAdmin: false,
        user: null 
      });
    }

    return NextResponse.json({
      isAuthenticated: true,
      isAdmin: user[0].isAdmin || false,
      user: user[0]
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ 
      isAuthenticated: false, 
      isAdmin: false,
      user: null 
    }, { status: 500 });
  }
}