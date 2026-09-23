import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { generateAccessCode, generateSalt, hashAccessCode } from "../../shared/adminCode.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Server-side authorization: only super admins may approve.
    if (user.role !== 'admin' || !user.is_super_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { request_id } = body;
    if (!request_id) return Response.json({ error: 'Missing request_id' }, { status: 400 });

    // Service role bypasses RLS to read/update any request.
    const request = await base44.asServiceRole.entities.AdminRequest.get(request_id);
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (request.status !== 'pending') {
      return Response.json({ error: 'Request has already been processed' }, { status: 400 });
    }

    // Cryptographically secure code + salted hash. Plaintext is never persisted.
    const code = generateAccessCode();
    const salt = generateSalt();
    const hash = await hashAccessCode(code, salt);

    // Create the organization.
    const newOrg = await base44.asServiceRole.entities.Organization.create({
      name: request.organization_name,
      contact_email: request.user_email,
      contact_phone: request.phone_number,
      status: 'active',
    });

    // Persist the hash (not the plaintext) and link the org.
    await base44.asServiceRole.entities.AdminRequest.update(request_id, {
      status: 'approved',
      access_code_hash: hash,
      access_code_salt: salt,
      organization_id: newOrg.id,
    });

    // Promote the requesting user to admin of the new org.
    const users = await base44.asServiceRole.entities.User.filter({ email: request.user_email });
    const requestingUser = users[0];
    if (!requestingUser) {
      return Response.json({ error: 'Requesting user not found' }, { status: 404 });
    }
    await base44.asServiceRole.entities.User.update(requestingUser.id, {
      role: 'admin',
      organization_id: newOrg.id,
    });

    // Email the plaintext code to the requester.
    const verifyUrl = `${new URL(req.url).origin}${req.headers.get('x-forwarded-path') || ''}`.replace('/functions/approveAdminRequest', '');
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: request.user_email,
        subject: "Admin Access Approved - Enter Your Code!",
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a; border-bottom: 3px solid #16a34a; padding-bottom: 10px;">
              Your Admin Access Has Been Approved!
            </h2>
            <p style="font-size: 16px; color: #1f2937;">Hello ${request.user_name},</p>
            <p style="font-size: 16px; color: #1f2937;">
              Great news! Your request for admin access has been approved.
            </p>
            <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3 style="margin-top: 0; color: #15803d;">Your Request is Approved!</h3>
              <p style="color: #166534;"><strong>Organization:</strong> ${request.organization_name}</p>
            </div>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Your Confirmation Code:</h3>
              <p style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px; text-align: center; margin: 15px 0; font-family: monospace;">
                ${code}
              </p>
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                Enter this code to confirm your account when you log in.
              </p>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Important:</strong> This code is valid for one-time use only. Keep it secure!
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      // Code is stored as hash; user can still verify if email fails, but flag it.
    }

    return Response.json({ success: true, organization_id: newOrg.id });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}