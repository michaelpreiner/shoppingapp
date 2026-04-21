import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Security Token to prevent unauthorized posts
// In production, this should be an environment variable.
const API_SECRET = process.env.SIRI_SECRET || "mein-geheimes-passwort";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Simple basic auth via JSON
    if (body.secret !== API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const command = body.text;
    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Bad Request. "text" is required.' }, { status: 400 });
    }

    const locations = await prisma.location.findMany();
    if (locations.length === 0) {
      return NextResponse.json({ error: 'Keine Standorte in der Datenbank gefunden.' }, { status: 404 });
    }

    // NLP Routing
    let targetLocationId = locations[0].id;
    let targetLocationName = locations[0].name;
    let itemName = command;

    for (const loc of locations) {
      const locNameLower = loc.name.toLowerCase();
      if (command.toLowerCase().includes(locNameLower)) {
        targetLocationId = loc.id;
        targetLocationName = loc.name;
        // Strip the location phrase from the item
        itemName = command
          .replace(new RegExp(`für ${locNameLower}`, 'i'), '')
          .replace(new RegExp(`in ${locNameLower}`, 'i'), '')
          .replace(new RegExp(locNameLower, 'i'), '')
          .trim();
        break;
      }
    }

    if (!itemName) {
      return NextResponse.json({ error: 'Artikelname konnte nicht ermittelt werden.' }, { status: 400 });
    }

    const item = await prisma.item.create({
      data: {
        name: itemName,
        locationId: targetLocationId,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `${itemName} wurde zu ${targetLocationName} hinzugefügt.`,
      item 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
