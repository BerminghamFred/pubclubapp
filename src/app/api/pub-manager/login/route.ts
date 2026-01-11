import { NextRequest, NextResponse } from 'next/server';
import { pubData } from '@/data/pubData';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // First, try to find pub directly by managerEmail (most direct check)
    let pubFromDb = await prisma.pub.findFirst({
      where: {
        managerEmail: emailLower
      }
    });

    if (pubFromDb && pubFromDb.managerPassword) {
      // Verify password
      const isValidPassword = await bcrypt.compare(password, pubFromDb.managerPassword);

      if (isValidPassword) {
        // Find manager record if it exists
        const manager = await prisma.manager.findUnique({
          where: { email: emailLower }
        });

        // Generate JWT token
        const token = jwt.sign(
          { 
            pubId: pubFromDb.id,
            pubName: pubFromDb.name,
            email: emailLower,
            type: 'pub-manager'
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Log the login if manager exists
        if (manager) {
          try {
            await prisma.managerLogin.create({
              data: {
                managerId: manager.id,
                pubId: pubFromDb.id,
              }
            });
          } catch (loginError) {
            console.error('Failed to log manager login:', loginError);
            // Don't fail the login if logging fails
          }
        }

        return NextResponse.json({
          success: true,
          token,
          pubId: pubFromDb.id,
          pubName: pubFromDb.name,
          message: 'Login successful'
        });
      }
    }

    // Second, try to find manager in database (assigned via admin dashboard)
    const manager = await prisma.manager.findUnique({
      where: { email: emailLower },
      include: {
        pubs: {
          include: {
            pub: true
          }
        }
      }
    });

    if (manager && manager.pubs.length > 0) {
      // Manager found in database - check password from pub's managerPassword field
      // Find a pub with a password set
      let pubToUse = manager.pubs.find(pm => 
        pm.pub.managerPassword && pm.pub.managerEmail?.toLowerCase() === emailLower
      )?.pub;

      // If no pub with matching managerEmail and password, try any pub with password
      if (!pubToUse) {
        pubToUse = manager.pubs.find(pm => pm.pub.managerPassword)?.pub;
      }

      // If still no pub with password, use the first pub
      if (!pubToUse) {
        pubToUse = manager.pubs[0].pub;
      }

      // Check if pub has a password set
      if (!pubToUse.managerPassword) {
        return NextResponse.json(
          { success: false, message: 'No password set for this pub. Please contact Pub Club support.' },
          { status: 401 }
        );
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, pubToUse.managerPassword);

      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, message: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          pubId: pubToUse.id,
          pubName: pubToUse.name,
          email: manager.email,
          type: 'pub-manager'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log the login
      try {
        await prisma.managerLogin.create({
          data: {
            managerId: manager.id,
            pubId: pubToUse.id,
          }
        });
      } catch (loginError) {
        console.error('Failed to log manager login:', loginError);
        // Don't fail the login if logging fails
      }

      return NextResponse.json({
        success: true,
        token,
        pubId: pubToUse.id,
        pubName: pubToUse.name,
        message: 'Login successful'
      });
    }

    // Fallback: Check pubData for legacy managers
    const pub = pubData.find(p => 
      p.manager_email && p.manager_email.toLowerCase() === emailLower
    );

    if (!pub) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if pub has a password set
    if (!pub.manager_password) {
      return NextResponse.json(
        { success: false, message: 'No password set for this pub. Please contact Pub Club support.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, pub.manager_password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        pubId: pub.id,
        pubName: pub.name,
        email: pub.manager_email,
        type: 'pub-manager'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      token,
      pubId: pub.id,
      pubName: pub.name,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
