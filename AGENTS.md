# Integration rules
- Keep external tool credentials in the service-only credentials table; browser forms submit replacement values without reading existing secrets, to prevent credential exposure.
- Resolve WhatsApp deletion credentials from an owned saved connection and remove the local record only after remote success, to avoid cross-tenant deletion and abandoned instances.
- Never adopt arbitrary server instances or retry uncertain instance creation automatically, because these actions can affect another tenant or create duplicates.
- Use the shared integration policy for supported REST methods and public HTTPS destinations; reject redirects before forwarding credentials.
- WhatsApp inbound routing uses the configured welcome menu and assigned AI agent, never retired conversation flows; keep direct-request rules shared between routing and AI instructions to prevent conflicting behavior.