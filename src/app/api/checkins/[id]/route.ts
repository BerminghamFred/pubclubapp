import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const checkin = await prisma.checkin.findUnique({
      where: { id },
    });

    if (!checkin) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
    }

    if (checkin.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this check-in' }, { status: 403 });
    }

    await prisma.checkin.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Check-in removed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting check-in:', error);
    return NextResponse.json({ error: 'Failed to remove check-in' }, { status: 500 });
  }
}
