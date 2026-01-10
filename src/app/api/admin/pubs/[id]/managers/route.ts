export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pubId } = await params;
    const body = await request.json();
    
    const { email, name, password, role = 'owner' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Find pub by Place ID or database ID
    let pub = await prisma.pub.findUnique({
      where: { placeId: pubId },
    });

    if (!pub) {
      pub = await prisma.pub.findUnique({
        where: { id: pubId },
      });
    }

    if (!pub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find or create manager
    let manager = await prisma.manager.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!manager) {
      manager = await prisma.manager.create({
        data: {
          email: email.toLowerCase(),
          name: name || null,
        },
      });
    }

    // Link manager to pub
    await prisma.pubManager.upsert({
      where: {
        pubId_managerId: {
          pubId: pub.id,
          managerId: manager.id,
        },
      },
      create: {
        pubId: pub.id,
        managerId: manager.id,
        role: role,
      },
      update: {
        role: role,
      },
    });

    // Update pub's legacy manager fields if this is the first manager
    if (!pub.managerEmail) {
      await prisma.pub.update({
        where: { id: pub.id },
        data: {
          managerEmail: email.toLowerCase(),
          managerPassword: hashedPassword,
        },
      });
    }

    // Log audit trail
    try {
      await prisma.adminAudit.create({
        data: {
          actorId: 'admin', // TODO: Get from auth
          action: 'add_manager',
          entity: 'pub',
          entityId: pub.id,
          diff: JSON.parse(JSON.stringify({
            managerEmail: email,
            role: role,
          })),
        }
      });
    } catch (auditError) {
      console.error('Failed to log audit trail:', auditError);
    }

    return NextResponse.json({ 
      success: true,
      manager: {
        id: manager.id,
        email: manager.email,
        name: manager.name,
        role: role,
      }
    });

  } catch (error: any) {
    console.error('Error adding manager:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add manager' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pubId } = await params;
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId');

    if (!managerId) {
      return NextResponse.json(
        { error: 'managerId is required' },
        { status: 400 }
      );
    }

    // Find pub by Place ID or database ID
    let pub = await prisma.pub.findUnique({
      where: { placeId: pubId },
    });

    if (!pub) {
      pub = await prisma.pub.findUnique({
        where: { id: pubId },
      });
    }

    if (!pub) {
      return NextResponse.json(
        { error: 'Pub not found' },
        { status: 404 }
      );
    }

    // Remove manager from pub
    await prisma.pubManager.delete({
      where: {
        pubId_managerId: {
          pubId: pub.id,
          managerId: managerId,
        },
      },
    });

    // Log audit trail
    try {
      await prisma.adminAudit.create({
        data: {
          actorId: 'admin', // TODO: Get from auth
          action: 'remove_manager',
          entity: 'pub',
          entityId: pub.id,
          diff: JSON.parse(JSON.stringify({
            managerId: managerId,
          })),
        }
      });
    } catch (auditError) {
      console.error('Failed to log audit trail:', auditError);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error removing manager:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove manager' },
      { status: 500 }
    );
  }
}


