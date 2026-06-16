import { NextResponse } from 'next/server';
import { sendAlertEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Dedicated test email endpoint — always sends a test email regardless of positions.
// Called by the "Send Test" button in the Alerts UI.
export async function POST(request) {
    try {
          const { secret, email } = await request.json();

          // Verify the CRON_SECRET
          if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
                  return NextResponse.json({ error: 'Unauthorized — CRON_SECRET mismatch' }, { status: 401 });
                }

          const to = email || process.env.ALERT_EMAIL;
          if (!to) {
                  return NextResponse.json({ error: 'No email address provided' }, { status: 400 });
                }

          const date = new Date().toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                });

          // Send a test email with a sample position so the template renders correctly
          await sendAlertEmail({
                  to,
                  subject: `✅ PMCC Test Email — Your alerts are working! — ${date}`,
                  positions: [
                            {
                                        ticker: 'TEST',
                                        leapStrike: '100',
                                        leapExpiry: '2026-01-16',
                                        currentPrice: 105.50,
                                        change1d: 0.75,
                                        dte: 21,
                                        urgency: 'Low',
                                        shortCallStatus: 'Hold',
                                        rollSuggestion: 'N/A',
                                        summary: 'This is a test email — your PMCC alerts are configured correctly!',
                                        totalCollected: '250',
                                        adjustedBasis: '750',
                                      },
                          ],
                  date,
                });

          return NextResponse.json({ sent: true, to });
        } catch (err) {
          console.error('send-test-email failed:', err);
          return NextResponse.json({ error: err.message }, { status: 500 });
        }
  }
