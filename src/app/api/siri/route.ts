import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Security Token to prevent unauthorized posts
// In production, this should be an environment variable.
const API_SECRET = process.env.SIRI_SECRET || "mein-geheimes-passwort";

// Shared logic for adding an item
async function addItem(command: string) {
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
}

// GET handler - simple URL call from Apple Shortcuts
// Usage: /api/siri?secret=xxx&text=Tomaten+für+Wien
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const command = url.searchParams.get('text');

    console.log("---- INCOMING SIRI GET REQUEST ----");
    console.log("Secret:", secret, "Text:", command);

    if (secret !== API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Bad Request. "text" is required.' }, { status: 400 });
    }

    return addItem(command);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

// POST handler - keep for backward compatibility
export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    console.log("---- INCOMING SIRI POST REQUEST ----");
    console.log("Raw payload from iOS:", rawText);
    
    let body;
    try {
      body = JSON.parse(rawText);
    } catch {
      // Maybe it was sent as form data
      const params = new URLSearchParams(rawText);
      body = {
        secret: params.get('secret'),
        text: params.get('text'),
      };
    }
    console.log("Parsed body:", body);
    
    // Simple basic auth via JSON
    if (body.secret !== API_SECRET) {
      console.log("Auth failed. Expected:", API_SECRET, "Got:", body.secret);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const command = body.text;
    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Bad Request. "text" is required.' }, { status: 400 });
    }

    return addItem(command);
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
