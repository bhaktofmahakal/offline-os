import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface DispatchTable {
  tableNumber: number;
  tableName: string;
  capacity: number;
  seats: Array<{
    seatNumber: number;
    id: number;
    name: string;
    email?: string | null;
    company?: string | null;
    roleTitle?: string | null;
    seniority?: string | null;
    sectorTags?: string[];
    bioNotes?: string | null;
  }>;
  conversationCard?: {
    tableTheme?: string;
    unifyingTopic?: string;
    icebreakerPrompt?: string;
    prompts?: string[];
    bottlenecks?: string[];
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventTitle = 'Offline VIP Founder Dinner',
      eventDate = 'Thursday, October 22, 2026',
      eventTime = '7:30 PM PDT',
      venueAddress = 'The Battery, 717 Battery St, San Francisco, CA 94111',
      venueCode = 'OFFLINE-717',
      dressCode = 'Smart Casual / No Suits',
      notes = 'Strict Chatham House Rule. Off the record.',
      tables = [],
      tableCaptains = {},
      dispatchMethod = 'simulate', // 'simulate' | 'resend' | 'n8n_webhook'
    } = body;

    if (!Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json({ error: 'Please provide at least one table to dispatch.' }, { status: 400 });
    }

    const attendeeInvites: any[] = [];
    const hostBriefings: any[] = [];

    // Process each table and seat
    tables.forEach((table: DispatchTable) => {
      const captainPersonId = tableCaptains[table.tableNumber] || table.seats[0]?.id;
      const captainSeat = table.seats.find(s => s.id === captainPersonId) || table.seats[0];
      const captainName = captainSeat?.name || 'Assigned Table Host';

      // 1. Generate individual attendee invitations
      table.seats.forEach(seat => {
        const otherPeers = table.seats
          .filter(s => s.id !== seat.id)
          .map(s => `${s.name} (${s.roleTitle || 'Founder'} at ${s.company || 'Stealth'})`);

        const isCaptain = seat.id === captainPersonId;

        const subject = `Exclusive Invitation: ${eventTitle} — Table ${table.tableNumber} (${table.tableName})`;
        const emailBody = `Dear ${seat.name},

You are officially confirmed for the ${eventTitle}.

EVENT DETAILS:
- Date: ${eventDate}
- Time: ${eventTime}
- Venue: ${venueAddress}
- Secret Door Code: ${venueCode}
- Dress Code: ${dressCode}
- Protocol: ${notes}

SEATING ARRANGEMENT:
- Table: Table ${table.tableNumber} (${table.tableName})
- Seat: #${seat.seatNumber}
- Table Captain: ${captainName}${isCaptain ? ' (You are designated Table Captain)' : ''}

YOUR DINING PEERS:
${otherPeers.map(p => `  • ${p}`).join('\n')}

${table.conversationCard?.tableTheme ? `TABLE THEME:\n"${table.conversationCard.tableTheme}"\n` : ''}
We have intentionally curated this pod for zero direct competitors and latent operational alignment. Please arrive 15 minutes prior for welcome drinks.

Warm regards,

Aparna Pande
Member Experiences & Retreats
Offline Private Network`;

        attendeeInvites.push({
          recipientId: seat.id,
          recipientName: seat.name,
          recipientEmail: seat.email || `${seat.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@member.offline.club`,
          tableNumber: table.tableNumber,
          tableName: table.tableName,
          seatNumber: seat.seatNumber,
          isCaptain,
          subject,
          body: emailBody,
          status: 'queued',
        });
      });

      // 2. Generate confidential Host Briefing Dossier for the Table Captain
      if (captainSeat) {
        const peerDossiers = table.seats
          .filter(s => s.id !== captainSeat.id)
          .map(s => ({
            name: s.name,
            company: s.company || 'Stealth',
            role: s.roleTitle || 'Founder',
            seniority: s.seniority || 'Senior',
            sectors: s.sectorTags || [],
            bioNotes: s.bioNotes || 'High-conviction tech builder',
          }));

        const hostSubject = `[CONFIDENTIAL HOST DOSSIER] Table ${table.tableNumber} (${table.tableName}) — ${eventTitle}`;
        const hostBody = `CONFIDENTIAL TABLE CAPTAIN BRIEFING
Host: ${captainSeat.name} (${captainSeat.company || 'Stealth'})
Event: ${eventTitle} (${eventDate} at ${eventTime})
Table: #${table.tableNumber} — "${table.tableName}"

DEAR ${captainSeat.name.toUpperCase()},
Thank you for anchoring Table ${table.tableNumber}. Your role is not to speak most, but to facilitate high-vulnerability, off-the-record discourse and draw out quiet brilliance.

UNIFYING DISCUSSION SPARK:
${table.conversationCard?.unifyingTopic || 'Curated peer cohort exploring cross-sector scaling bottlenecks and executive decision-making.'}

PROVOCATIVE CURATOR ICEBREAKER (Host Prompt):
"${table.conversationCard?.icebreakerPrompt || 'What is the single hardest decision you made in the last quarter that you would make differently today?'}"

ADDITIONAL DISCUSSION PROMPTS:
${(table.conversationCard?.prompts || [
  'Where are you spending founder time that is generating negative leverage?',
  'What is an unwritten rule in your industry that is ripe for disruption?',
]).map((p: string, idx: number) => `  ${idx + 1}. ${p}`).join('\n')}

SHARED SCALING BOTTLENECKS:
${(table.conversationCard?.bottlenecks || [
  'Enterprise procurement friction and vendor consolidation cycles',
  'Maintaining technical velocity without diluting engineering quality',
]).map((b: string) => `  • ${b}`).join('\n')}

PEER DOSSIER CHEAT-SHEET:
${peerDossiers.map(p => `• ${p.name} (${p.role} at ${p.company})
  Sectors: ${p.sectors.join(', ') || 'N/A'}
  Background: ${p.bioNotes}`).join('\n\n')}

HOST RULES:
1. Enforce strict Chatham House Rule: nothing said leaves this table.
2. If someone starts pitching their company, gently steer them back to operational realities.
3. If anyone is quiet for more than 15 minutes, invite their perspective on the current topic.

Warmly,
Aparna Pande`;

        hostBriefings.push({
          tableNumber: table.tableNumber,
          tableName: table.tableName,
          captainId: captainSeat.id,
          captainName: captainSeat.name,
          captainEmail: captainSeat.email || `${captainSeat.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@member.offline.club`,
          subject: hostSubject,
          content: hostBody,
          unifyingTopic: table.conversationCard?.unifyingTopic,
          icebreakerPrompt: table.conversationCard?.icebreakerPrompt,
          peers: peerDossiers,
        });
      }
    });

    let liveSentCount = 0;
    let webhookDispatched = false;

    // 3. Live Dispatch Execution (if Resend API Key or n8n Webhook URL is configured)
    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
    const n8nWebhookUrl = (process.env.N8N_WEBHOOK_URL || '').trim();

    if (dispatchMethod === 'resend' && resendApiKey) {
      try {
        const resendBatch = attendeeInvites.slice(0, 10).map(inv => ({
          from: 'Offline Experiences <dinners@offline.club>',
          to: [inv.recipientEmail],
          subject: inv.subject,
          text: inv.body,
        }));

        const resendRes = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify(resendBatch),
        });

        if (resendRes.ok) {
          liveSentCount = resendBatch.length;
        }
      } catch (sendErr) {
        console.warn('Resend batch email dispatch error:', sendErr);
      }
    }

    if (dispatchMethod === 'n8n_webhook' && n8nWebhookUrl) {
      try {
        const n8nRes = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventTitle,
            eventDate,
            eventTime,
            venueAddress,
            venueCode,
            totalAttendees: attendeeInvites.length,
            totalTables: tables.length,
            attendeeInvites,
            hostBriefings,
            dispatchedAt: new Date().toISOString(),
          }),
        });
        if (n8nRes.ok) {
          webhookDispatched = true;
        }
      } catch (n8nErr) {
        console.warn('n8n webhook dispatch error:', n8nErr);
      }
    }

    return NextResponse.json({
      success: true,
      dispatchMethod,
      liveSentCount,
      webhookDispatched,
      totalAttendees: attendeeInvites.length,
      totalTables: tables.length,
      totalCaptains: hostBriefings.length,
      eventDetails: {
        eventTitle,
        eventDate,
        eventTime,
        venueAddress,
        venueCode,
        dressCode,
        notes,
      },
      attendeeInvites,
      hostBriefings,
    });
  } catch (err: any) {
    console.error('Seating Dispatch Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch seating invitations' }, { status: 500 });
  }
}
