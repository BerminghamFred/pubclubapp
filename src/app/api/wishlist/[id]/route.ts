import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;

    const wishlistItem = await prisma.wishlist.findUnique({
      where: { id },
    });

    if (!wishlistItem) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }

    if (wishlistItem.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this wishlist item' }, { status: 403 });
    }

    await prisma.wishlist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Pub removed from wishlist successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting wishlist item:', error);
    return NextResponse.json({ error: 'Failed to remove pub from wishlist' }, { status: 500 });
  }
}
