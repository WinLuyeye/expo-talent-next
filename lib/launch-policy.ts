import type {Settings} from './shared';

export type LaunchServices={approved:boolean;mailConfigured:boolean;captchaEnabled:boolean;scannerConfigured:boolean;mfaRequired:boolean;cspEnforced:boolean;incidentNotificationConfigured:boolean};
// These flags describe configuration only, not a successful external health check.
export function launchBlockers(s:Settings,services:LaunchServices,now=Date.now()):string[]{
 const issues:string[]=[];
 if(!services.approved)issues.push('Recette et sauvegarde à valider (LAUNCH_APPROVED).');
 if(!services.mailConfigured)issues.push('Messagerie à configurer.');
 if(!services.captchaEnabled)issues.push('Turnstile à configurer.');
 if(!services.mfaRequired)issues.push('MFA obligatoire à activer après récupération testée.');
 if(!services.cspEnforced)issues.push('CSP stricte à valider puis activer.');
 if(!services.incidentNotificationConfigured)issues.push('Notifications des incidents à configurer.');
 // The optional attachment field is disabled if no scanner is configured; uploads remain fail-closed.
 const date=Date.parse(s.date),deadline=Date.parse(s.deadline);
 if(!Number.isFinite(date)||!Number.isFinite(deadline)||deadline<=now||date<=deadline)issues.push('Dates officielles et clôture à renseigner (clôture future, avant événement).');
 if(!s.venue.trim()||!s.email.trim()||!s.whatsapp.trim())issues.push('Lieu, e-mail et WhatsApp officiels à renseigner.');
 if(!s.categories.length||!s.promotions.length||!s.filieres.length||!s.departements.length)issues.push('Listes de catégories et études à renseigner.');
 if(!s.rules.trim()||!s.privacy.trim()||!s.retention.trim())issues.push('Règlement, confidentialité et conservation à valider.');
 return issues;
}
export function effectiveOpen(s:Settings,services:LaunchServices,now=Date.now()){
 return s.open&&!s.maintenance&&launchBlockers(s,services,now).length===0;
}
export function mailConfigured(key:string|undefined,from:string|undefined){return !!key?.trim()&&!!from?.trim()&&/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/.test(from);}

export function alertEmailConfigured(mailReady:boolean,recipient:string|undefined){return mailReady&&!!recipient&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(recipient);}
