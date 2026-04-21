import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let locations = await prisma.location.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (locations.length === 0) {
      await prisma.location.create({ data: { name: 'Graz' } });
      await prisma.location.create({ data: { name: 'Wien' } });
      locations = await prisma.location.findMany({
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const location = await prisma.location.create({
      data: { name: body.name },
    });
    return NextResponse.json(location);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
