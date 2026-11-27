import 'server-only';
import {launchBlockers,effectiveOpen,mailConfigured,alertEmailConfigured,type LaunchServices} from './launch-policy';
import {scannerConfigured} from './scan-file';
import {turnstileConfig} from './turnstile';
import {secureEndpoint} from './security-runtime';
import type {Settings} from './shared';
export function launchServices():LaunchServices{
 return {approved:process.env.LAUNCH_APPROVED==='true',mailConfigured:mailConfigured(process.env.RESEND_API_KEY,process.env.EMAIL_FROM),captchaEnabled:turnstileConfig().mode==='enabled',scannerConfigured:scannerConfigured(),mfaRequired:process.env.ADMIN_MFA_REQUIRED==='true',cspEnforced:process.env.CSP_NONCE_ENFORCE==='true',incidentNotificationConfigured:alertEmailConfigured(mailConfigured(process.env.RESEND_API_KEY,process.env.EMAIL_FROM),process.env.SECURITY_ALERT_EMAIL)||(!!secureEndpoint(process.env.SECURITY_WEBHOOK_URL)&&!!process.env.SECURITY_WEBHOOK_TOKEN&&process.env.SECURITY_WEBHOOK_TOKEN.length>=32)};
}
export function launchStatus(s:Settings){const services=launchServices();return {services,blockers:launchBlockers(s,services),requestedOpen:s.open,effectiveOpen:effectiveOpen(s,services)};}
