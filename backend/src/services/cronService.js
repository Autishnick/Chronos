import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../config/supabase.js';

// Configure Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const initCronJobs = () => {
  if (!supabaseAdmin) {
     console.error('[Cron Job] SUPABASE_SERVICE_ROLE_KEY missing. Automated emails will not be sent.');
     return;
  }

  // Schedule task to run every minute
  cron.schedule('* * * * *', async () => {
    try {
      // Find capsules that reached unlock date and haven't triggered notification
      const { data: capsules, error } = await supabaseAdmin
        .from('capsules')
        .select('*')
        .lte('unlock_date', new Date().toISOString())
        .eq('email_notified', false);

      if (error) {
        // Handle missing column error gracefully
        if (error.code === '42703') {
           console.log('[Cron Job] Waiting for email_notified column to be created in Supabase...'); 
           return;
        }
        throw error;
      }
      
      if (!capsules || capsules.length === 0) return;

      console.log(`[Cron Job] Found ${capsules.length} capsule(s) ready to notify.`);

      for (const capsule of capsules) {
        // Fetch user email via Admin Auth (bypasses RLS)
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(capsule.user_id);
        
        if (userError || !user) {
          console.error(`[Cron Job] Failed to fetch user email for capsule ${capsule.id}`);
          continue;
        }

        const userEmail = user.email;
        let capsuleName = 'Your Capsule';
        try {
          capsuleName = JSON.parse(capsule.location_text).name || capsuleName;
        } catch (e) {
          // Ignore parsing errors for legacy data
        }

        // Send Email
        const mailOptions = {
          from: `"Chronos Time Capsules" <${process.env.EMAIL_USER}>`,
          to: userEmail,
          subject: `⏳ Chronos: Your capsule "${capsuleName}" is unlocked!`,
          html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #030014; color: #ffffff; border-radius: 16px; padding: 40px; text-align: center; border: 1px solid #2D235F;">
              <h1 style="color: #B4E4D9; font-style: italic; font-size: 36px; margin-bottom: 20px;">Chronos</h1>
              <h2 style="font-size: 24px; margin-bottom: 20px;">✨ It's Time! ✨</h2>
              <p style="font-size: 16px; color: #E2E8F0; line-height: 1.6; margin-bottom: 40px;">
                The time has come. The digital capsule <strong>"${capsuleName}"</strong> that you packed in the past is finally ready to be opened. Take a trip down memory lane!
              </p>
              <div style="margin: 40px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/capsule/${capsule.id}" style="background-color: #624BFF; color: white; padding: 16px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(98,75,255,0.4);">
                  Unlock Memory
                </a>
              </div>
              <p style="font-size: 13px; color: #94A3B8; margin-top: 40px;">
                Your past is waiting.<br/>Chronos Team
              </p>
            </div>
          `,
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`[Cron Job] Notification sent for capsule ${capsule.id} to ${userEmail}`);

          // Mark as notified to prevent duplicate emails
          await supabaseAdmin
            .from('capsules')
            .update({ email_notified: true })
            .eq('id', capsule.id);
            
        } catch (mailError) {
          console.error(`[Cron Job] Mail rejected for ${userEmail}:`, mailError.message);
        }
      }
    } catch (err) {
      console.error('[Cron Job] Error:', err);
    }
  });
  console.log('[Cron Job] Initialized. Will check every minute.');
};
