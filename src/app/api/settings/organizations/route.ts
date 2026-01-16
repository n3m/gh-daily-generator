import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userOrgs = await prisma.userOrganization.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        organization: true,
      },
    });

    return NextResponse.json({
      organizations: userOrgs.map((uo) => ({
        id: uo.organization.githubId,
        login: uo.organization.login,
        name: uo.organization.name,
        avatarUrl: uo.organization.avatarUrl,
      })),
    });
  } catch (error) {
    console.error("Error fetching user organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizations } = body as {
      organizations: Array<{
        id: number;
        login: string;
        avatar_url: string;
        description?: string;
      }>;
    };

    if (!organizations || !Array.isArray(organizations)) {
      return NextResponse.json(
        { error: "Organizations array is required" },
        { status: 400 }
      );
    }

    // First, deactivate all existing user organizations
    await prisma.userOrganization.updateMany({
      where: {
        userId: session.user.id,
      },
      data: {
        isActive: false,
      },
    });

    // Upsert each organization and create user-organization links
    for (const org of organizations) {
      // Upsert the organization
      const dbOrg = await prisma.organization.upsert({
        where: {
          githubId: org.id,
        },
        update: {
          login: org.login,
          avatarUrl: org.avatar_url,
          name: org.description || org.login,
        },
        create: {
          githubId: org.id,
          login: org.login,
          avatarUrl: org.avatar_url,
          name: org.description || org.login,
        },
      });

      // Upsert the user-organization link
      await prisma.userOrganization.upsert({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: dbOrg.id,
          },
        },
        update: {
          isActive: true,
        },
        create: {
          userId: session.user.id,
          organizationId: dbOrg.id,
          isActive: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving user organizations:", error);
    return NextResponse.json(
      { error: "Failed to save organizations" },
      { status: 500 }
    );
  }
}
