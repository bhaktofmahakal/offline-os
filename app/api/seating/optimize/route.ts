import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for multi-table Gemini generation

interface Person {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  role_title: string | null;
  role_type: string | null;
  seniority: string | null;
  sector_tags: string[];
  skills?: string[];
  needs?: string[];
  bio_notes: string | null;
  fit_score: number | null;
  clean_summary?: string | null;
}

interface SeatingTable {
  table_number: number;
  table_name: string;
  capacity: number;
  members: Person[];
  conflict_count: number;
  diversity_score: number;
  ai_conversation_card?: {
    theme: string;
    synergy_thesis: string;
    shared_bottlenecks: string[];
    discussion_prompts: string[];
  };
}

// Compute conflict score between two members (0 = no conflict, >0 = competitor conflict)
function computePairConflict(p1: Person, p2: Person): number {
  if (p1.id === p2.id) return 0;

  // Exact company overlap
  const c1 = (p1.company || '').trim().toLowerCase();
  const c2 = (p2.company || '').trim().toLowerCase();
  if (c1 && c2 && (c1 === c2 || c1.includes(c2) || c2.includes(c1))) {
    return 100; // Definite company conflict
  }

  // Direct sub-niche competitor check
  const sensitiveNiches = [
    'voice ai',
    'agent infra',
    'quick commerce',
    'crypto exchange',
    'crypto',
    'autonomous agents',
    'llm evaluation',
    'database',
    'sales engagement',
    'payroll',
  ];

  const s1 = (p1.sector_tags || []).map(t => t.toLowerCase());
  const s2 = (p2.sector_tags || []).map(t => t.toLowerCase());

  for (const niche of sensitiveNiches) {
    const p1Matches = s1.some(t => t.includes(niche)) || (p1.bio_notes || '').toLowerCase().includes(niche);
    const p2Matches = s2.some(t => t.includes(niche)) || (p2.bio_notes || '').toLowerCase().includes(niche);
    if (p1Matches && p2Matches) {
      return 50; // Direct niche rival
    }
  }

  return 0;
}

// Classify seniority into tier (1 = C-Level/Founder, 2 = Operator/Director, 3 = Specialist)
function getSeniorityTier(p: Person): number {
  const sen = (p.seniority || '').toLowerCase();
  const role = (p.role_type || '').toLowerCase();
  const title = (p.role_title || '').toLowerCase();

  if (sen === 'executive' || sen === 'c-level' || role === 'founder' || title.includes('ceo') || title.includes('founder')) {
    return 1;
  }
  if (sen === 'director' || sen === 'vp' || sen === 'senior' || role === 'operator') {
    return 2;
  }
  return 3;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      memberIds,
      tableSize = 8,
      strictCompetitorAvoidance = true,
      generateAiCards = true,
    } = body;

    const parsedTableSize = Math.max(2, Math.min(20, parseInt(tableSize, 10) || 8));

    let targetMemberIds: number[] = Array.isArray(memberIds) ? memberIds : [];

    // If no explicit member IDs provided, dynamically fetch canonical members
    if (targetMemberIds.length === 0 && supabase) {
      const { data: canonicals } = await supabase
        .from('people')
        .select('id')
        .is('is_duplicate_of', null)
        .limit(64);
      targetMemberIds = (canonicals || []).map(c => c.id);
    }

    if (targetMemberIds.length === 0) {
      return NextResponse.json({ error: 'Please provide a valid list of member IDs to seat or ingest canonical members.' }, { status: 400 });
    }

    // 1. Fetch attendee profiles
    let attendees: Person[] = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('people')
        .select('id, name, email, company, role_title, role_type, seniority, sector_tags, skills, needs, bio_notes, fit_score, clean_summary')
        .in('id', targetMemberIds);

      if (error) {
        throw new Error('Supabase fetch failed: ' + error.message);
      }
      attendees = (data || []) as Person[];
    }

    if (attendees.length === 0) {
      return NextResponse.json({ error: 'No member records found matching the provided IDs.' }, { status: 404 });
    }

    // 2. Determine number of tables
    const numTables = Math.max(1, Math.ceil(attendees.length / parsedTableSize));
    const tables: SeatingTable[] = Array.from({ length: numTables }, (_, i) => ({
      table_number: i + 1,
      table_name: `Table ${i + 1}`,
      capacity: parsedTableSize,
      members: [],
      conflict_count: 0,
      diversity_score: 100,
    }));

    // 3. Stage & Seniority Stratified Distribution
    // Sort attendees by seniority tier then sector to ensure balanced initial spread
    const stratifiedAttendees = [...attendees].sort((a, b) => {
      const tierA = getSeniorityTier(a);
      const tierB = getSeniorityTier(b);
      if (tierA !== tierB) return tierA - tierB;
      const secA = (a.sector_tags?.[0] || '');
      const secB = (b.sector_tags?.[0] || '');
      return secA.localeCompare(secB);
    });

    // Round-robin placement with conflict check
    for (const attendee of stratifiedAttendees) {
      let bestTableIdx = 0;
      let minPenalty = Infinity;

      for (let t = 0; t < numTables; t++) {
        const table = tables[t];
        // Capacity check
        if (table.members.length >= parsedTableSize) continue;

        // Calculate potential conflict with members already at table
        let conflictPenalty = 0;
        for (const existing of table.members) {
          const conf = computePairConflict(attendee, existing);
          conflictPenalty += conf;
        }

        // Seniority balance penalty (discourage clumping same tier at one table)
        const myTier = getSeniorityTier(attendee);
        const tierCount = table.members.filter(m => getSeniorityTier(m) === myTier).length;
        const balancePenalty = tierCount * 5;

        // Fill balance penalty (encourage even table sizes)
        const sizePenalty = table.members.length * 2;

        const totalPenalty = conflictPenalty * (strictCompetitorAvoidance ? 10 : 1) + balancePenalty + sizePenalty;

        if (totalPenalty < minPenalty) {
          minPenalty = totalPenalty;
          bestTableIdx = t;
        }
      }

      tables[bestTableIdx].members.push(attendee);
    }

    // 4. Pairwise Local Swap Refinement
    // Attempt greedy swaps to eliminate any remaining competitor conflicts
    let swapsMade = 0;
    for (let iter = 0; iter < 100; iter++) {
      let improved = false;
      for (let t1 = 0; t1 < numTables; t1++) {
        for (let t2 = t1 + 1; t2 < numTables; t2++) {
          for (let i = 0; i < tables[t1].members.length; i++) {
            for (let j = 0; j < tables[t2].members.length; j++) {
              const p1 = tables[t1].members[i];
              const p2 = tables[t2].members[j];

              // Current conflicts
              const currentT1Conf = tables[t1].members.reduce((acc, m) => acc + (m.id !== p1.id ? computePairConflict(p1, m) : 0), 0);
              const currentT2Conf = tables[t2].members.reduce((acc, m) => acc + (m.id !== p2.id ? computePairConflict(p2, m) : 0), 0);

              // Swapped conflicts
              const swappedT1Conf = tables[t1].members.reduce((acc, m) => acc + (m.id !== p1.id ? computePairConflict(p2, m) : 0), 0);
              const swappedT2Conf = tables[t2].members.reduce((acc, m) => acc + (m.id !== p2.id ? computePairConflict(p1, m) : 0), 0);

              if (swappedT1Conf + swappedT2Conf < currentT1Conf + currentT2Conf) {
                // Perform swap
                tables[t1].members[i] = p2;
                tables[t2].members[j] = p1;
                improved = true;
                swapsMade++;
                break;
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (!improved) break;
    }

    // 5. Calculate final table metrics
    let totalConflicts = 0;
    tables.forEach(table => {
      let confCount = 0;
      for (let i = 0; i < table.members.length; i++) {
        for (let j = i + 1; j < table.members.length; j++) {
          if (computePairConflict(table.members[i], table.members[j]) > 0) {
            confCount++;
          }
        }
      }
      table.conflict_count = confCount;
      totalConflicts += confCount;

      // Unique sectors count
      const allSectors = new Set(table.members.flatMap(m => m.sector_tags || []));
      table.diversity_score = Math.min(100, Math.round((allSectors.size / Math.max(1, table.members.length)) * 100));
    });

    // 6. Server-Side Gemini AI Table Conversation Cards (Google REST API, Zero Client Secrets)
    const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

    if (generateAiCards && geminiApiKey && tables.length > 0) {
      try {
        // Process tables in parallel
        await Promise.all(
          tables.map(async table => {
            if (table.members.length === 0) return;

            const rosterSummary = table.members.map(m => ({
              name: m.name,
              company: m.company || 'Independent',
              role: m.role_title || m.role_type || 'Executive',
              sectors: m.sector_tags || [],
              bio: m.clean_summary || m.bio_notes || 'High-conviction tech operator',
            }));

            const prompt = `You are the executive dinner curator for Offline, an invite-only private community for top tech founders and operators.
Aparna Pande (Member Experiences Lead) is hosting a high-stakes ${table.capacity}-person dinner/retreat seating arrangement.

Analyze this curated table roster of ${table.members.length} members:
${JSON.stringify(rosterSummary, null, 2)}

Synthesize an executive briefing card for Table ${table.table_number}. Return strict pure JSON with this structure:
{
  "theme": "A punchy title for this table (e.g. Frontier AI Infra & Enterprise GTM Velocity)",
  "synergy_thesis": "2 concise sentences explaining latent operational synergies and why these founders will unlock mutual value.",
  "shared_bottlenecks": [
    "Specific scaling or operational challenge they share",
    "Another common strategic challenge"
  ],
  "discussion_prompts": [
    "A provocative, off-the-record question that prompts genuine vulnerability",
    "An operational debate question on market dynamics or execution",
    "A future-facing inquiry about frontier opportunities in their spaces"
  ]
}
Return ONLY valid JSON. Zero markdown backticks.`;

            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                      temperature: 0.4,
                      responseMimeType: 'application/json',
                    },
                  }),
                }
              );

              if (res.ok) {
                const aiData = await res.json();
                const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanedText);

                table.table_name = parsed.theme || `Table ${table.table_number}`;
                table.ai_conversation_card = {
                  theme: parsed.theme || `Table ${table.table_number}`,
                  synergy_thesis: parsed.synergy_thesis || 'Curated cohort of high-conviction founders sharing complementary strategic bottlenecks.',
                  shared_bottlenecks: parsed.shared_bottlenecks || [
                    'Scaling enterprise go-to-market in uncertain macroeconomic cycles',
                    'Retaining mission-critical technical talent and founding density',
                  ],
                  discussion_prompts: parsed.discussion_prompts || [
                    'What is an operational conviction you hold deeply that your competitors disagree with?',
                    'Where has your intuition failed you most painfully over the past 12 months?',
                    'If your primary distribution channel vanished tomorrow, what would be your day-one countermove?',
                  ],
                };
              } else {
                throw new Error(`Gemini HTTP error ${res.status}`);
              }
            } catch (cardErr) {
              console.warn(`Gemini table card generation fallback for Table ${table.table_number}:`, cardErr);
              // Deterministic fallback
              table.table_name = `Table ${table.table_number}: High-Synergy Peer Pod`;
              table.ai_conversation_card = {
                theme: `Table ${table.table_number}: High-Synergy Peer Pod`,
                synergy_thesis: 'Stratified cross-functional cohort balancing unicorn/C-level domain leadership with scaling technical execution.',
                shared_bottlenecks: [
                  'Enterprise procurement cycles and contracting friction',
                  'Navigating autonomous agent infrastructure reliability',
                ],
                discussion_prompts: [
                  'What is the single hardest decision you made in the last quarter that you would make differently today?',
                  'How are you architecting your organization for AI-native execution without diluting engineering quality?',
                  'What off-the-record signal in your sector is everyone currently underestimating?',
                ],
              };
            }
          })
        );
      } catch (geminiErr) {
        console.error('Gemini Seating Optimizer Card Generator Error:', geminiErr);
      }
    } else {
      // Deterministic fallback cards if AI generation is disabled or key not present
      tables.forEach(table => {
        table.table_name = `Table ${table.table_number}`;
        table.ai_conversation_card = {
          theme: `Table ${table.table_number}: Peer Discussion Group`,
          synergy_thesis: 'Curated mix of founders and operators optimized for zero competitor conflict and balanced stage distribution.',
          shared_bottlenecks: [
            'Capital allocation across aggressive growth vs operational sustainability',
            'Maintaining cultural velocity as headcount crosses critical inflection points',
          ],
          discussion_prompts: [
            'What is the most non-obvious truth you have learned about your customers this year?',
            'Where are you spending founder time that is generating negative leverage?',
            'What is an unwritten rule in your industry that is ripe for disruption?',
          ],
        };
      });
    }

    // Format tables and seats with both camelCase and snake_case for UI and exports
    const formattedTables = tables.map(table => {
      const seats = table.members.map((m, idx) => ({
        seatNumber: idx + 1,
        seat_number: idx + 1,
        id: m.id,
        name: m.name,
        company: m.company,
        roleTitle: m.role_title,
        role_title: m.role_title,
        roleType: m.role_type,
        seniority: m.seniority,
        sectorTags: m.sector_tags,
        sector_tags: m.sector_tags,
        fitScore: m.fit_score,
        fit_score: m.fit_score,
        bioNotes: m.clean_summary || m.bio_notes,
      }));

      const conversationCard = {
        tableTheme: table.ai_conversation_card?.theme || table.table_name,
        unifyingTopic: table.ai_conversation_card?.synergy_thesis || 'Curated peer cohort exploring cross-sector scaling bottlenecks.',
        icebreakerPrompt: table.ai_conversation_card?.discussion_prompts?.[0] || 'What is an operational conviction you hold deeply that your competitors disagree with?',
        prompts: table.ai_conversation_card?.discussion_prompts || [],
        bottlenecks: table.ai_conversation_card?.shared_bottlenecks || [],
        theme: table.ai_conversation_card?.theme || table.table_name,
        synergy_thesis: table.ai_conversation_card?.synergy_thesis || '',
        discussion_prompts: table.ai_conversation_card?.discussion_prompts || [],
      };

      return {
        tableNumber: table.table_number,
        table_number: table.table_number,
        tableName: table.table_name,
        table_name: table.table_name,
        capacity: table.capacity,
        seats,
        metrics: {
          conflictCount: table.conflict_count,
          conflict_count: table.conflict_count,
          diversityScore: table.diversity_score,
          diversity_score: table.diversity_score,
        },
        conversationCard,
        ai_conversation_card: table.ai_conversation_card,
      };
    });

    const averageDiversity = tables.length > 0
      ? Math.round(tables.reduce((sum, t) => sum + (t.diversity_score || 90), 0) / tables.length)
      : 100;

    return NextResponse.json({
      success: true,
      totalAttendees: attendees.length,
      total_attendees: attendees.length,
      totalTables: tables.length,
      total_tables: tables.length,
      tableSize: parsedTableSize,
      table_size: parsedTableSize,
      totalConflicts: totalConflicts,
      total_conflicts: totalConflicts,
      conflictsAvoided: Math.max(0, attendees.length - totalConflicts),
      averageDiversityScore: averageDiversity,
      summary: {
        total_attendees: attendees.length,
        total_tables: tables.length,
        table_size: parsedTableSize,
        total_conflicts: totalConflicts,
        conflicts_avoided: Math.max(0, attendees.length - totalConflicts),
        swaps_optimized: swapsMade,
        average_diversity_score: averageDiversity,
      },
      tables: formattedTables,
    });
  } catch (err: any) {
    console.error('Seating Optimizer Error:', err);
    return NextResponse.json({ error: err.message || 'Seating optimization failed' }, { status: 500 });
  }
}
