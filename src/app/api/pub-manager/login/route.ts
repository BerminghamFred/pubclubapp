import { NextRequest, NextResponse } from 'next/server';
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

    // Normalize email and password (trim whitespace)
    const emailLower = email.trim().toLowerCase();
    const passwordTrimmed = password.trim();

    // First, try to find pub directly by managerEmail (most direct check)
    let pubFromDb = await prisma.pub.findFirst({
      where: {
        managerEmail: emailLower
      }
    });

    if (pubFromDb && pubFromDb.managerPassword) {
      // Verify password
      console.log(`[Login] Attempting login for email: ${emailLower}, pub: ${pubFromDb.id} (${pubFromDb.name})`);
      console.log(`[Login] Password hash starts with: ${pubFromDb.managerPassword.substring(0, 20)}...`);
      const isValidPassword = await bcrypt.compare(passwordTrimmed, pubFromDb.managerPassword);
      console.log(`[Login] Password match result: ${isValidPassword}`);

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

        // Always log the login so admin dashboard shows "active" and last login (managerId optional)
        try {
          await prisma.managerLogin.create({
            data: {
              managerId: manager?.id ?? null,
              pubId: pubFromDb.id,
            }
          });
        } catch (loginError) {
          console.error('Failed to log manager login:', loginError);
          // Don't fail the login if logging fails
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

    console.log(`[Login] Looking for manager with email: ${emailLower}`);
    console.log(`[Login] Manager found:`, manager ? {
      id: manager.id,
      email: manager.email,
      pubsCount: manager.pubs.length,
      pubs: manager.pubs.map(pm => ({
        pubId: pm.pub.id,
        pubName: pm.pub.name,
        managerEmail: pm.pub.managerEmail,
        hasPassword: !!pm.pub.managerPassword
      }))
    } : 'NOT FOUND');

    if (manager && manager.pubs.length > 0) {
      // Manager found in database - check password from pub's managerPassword field
      // First, try to find a pub where managerEmail matches (most direct)
      let pubToUse = manager.pubs.find(pm => 
        pm.pub.managerPassword && pm.pub.managerEmail?.toLowerCase() === emailLower
      )?.pub;

      // If no pub with matching managerEmail, try any pub with password
      // This handles the case where manager was added via admin but pub's managerEmail wasn't updated
      if (!pubToUse) {
        pubToUse = manager.pubs.find(pm => pm.pub.managerPassword)?.pub;
      }

      // If still no pub with password, return error
      if (!pubToUse || !pubToUse.managerPassword) {
        return NextResponse.json(
          { success: false, message: 'No password set for this pub. Please contact Pub Club support to set your password.' },
          { status: 401 }
        );
      }

      // Verify password - try all pubs associated with this manager until we find a matching password
      let isValidPassword = false;
      let authenticatedPub = null;

      console.log(`[Login] Checking password against ${manager.pubs.length} pub(s)`);
      for (const pm of manager.pubs) {
        if (pm.pub.managerPassword) {
          console.log(`[Login] Checking password for pub ${pm.pub.id} (${pm.pub.name})`);
          const passwordMatch = await bcrypt.compare(passwordTrimmed, pm.pub.managerPassword);
          console.log(`[Login] Password match for pub ${pm.pub.id}: ${passwordMatch}`);
          if (passwordMatch) {
            isValidPassword = true;
            authenticatedPub = pm.pub;
            break;
          }
        } else {
          console.log(`[Login] Pub ${pm.pub.id} has no password set`);
        }
      }

      if (!isValidPassword || !authenticatedPub) {
        console.log(`[Login] Password verification failed for all pubs`);
        return NextResponse.json(
          { success: false, message: 'Invalid email or password' },
          { status: 401 }
        );
      }

      console.log(`[Login] Authentication successful for pub ${authenticatedPub.id}`);

      // Use the pub where password matched
      pubToUse = authenticatedPub;

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

    return NextResponse.json(
      { success: false, message: 'Invalid email or password' },
      { status: 401 }
    );

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
