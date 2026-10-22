# HookZ Personal Data Breach Incident Response Runbook
**Statutory Framework:** Digital Personal Data Protection Act, 2023 (DPDP Act, India) — Section 8(5) & Section 8(6)  
**Applicability:** All systems, personnel, databases (Prisma SQLite, Supabase Cloud PostgreSQL), server infrastructure (Render/Vercel), and third-party data processors of HookZ Technologies Inc.  
**Version:** 1.0 (DPDP 2023 Edition)  
**Classification:** Confidential — Internal Operational Runbook  

---

## 1. Statutory Background & Objectives

Under **Section 2(u)** of the Digital Personal Data Protection Act, 2023:
> *"Personal data breach means any unauthorised processing of personal data or accidental disclosure, acquisition, sharing, use, alteration, destruction of or loss of access to personal data, that compromises the confidentiality, integrity or availability of personal data."*

Under **Section 8(6)** of the DPDP Act 2023:
> *"In the event of a personal data breach, the Data Fiduciary shall give the Board and each affected Data Principal intimation of such breach in such form and manner as may be prescribed."*

### Key Compliance Mandates:
1. **Intimation to the Data Protection Board of India (DPBI):** Must occur within **72 hours** of confirming the personal data breach.
2. **Intimation to Affected Data Principals:** Must be provided without undue delay in plain, clear, and unambiguous language.
3. **Cybersecurity Reporting (CERT-In):** Any cyber security incident involving unauthorized access or data leakage must also be reported to CERT-In (Computer Emergency Response Team - India) within 6 hours of discovery pursuant to the CERT-In Directions 2022.

---

## 2. Incident Response Team (IRT) & Roles

| Role | Primary Responsible Person | Contact / Escalation Channel | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Incident Commander (IC)** | Platform Lead / CTO | `incident@hookz.in` / +91-XXXXXXXXXX | Coordinates containment, technical investigation, decision making |
| **Data Protection Officer (DPO)** | Ruthwik Patel (Grievance Officer) | `grievance@hookz.in` / `privacy@hookz.in` | Assesses legal exposure, drafts notifications, interfaces with DPBI |
| **Security & Forensics Lead** | Senior Backend Engineer | `security@hookz.in` | Isolates affected nodes, preserves evidence, analyzes server/db logs |
| **Legal Counsel** | External Legal Advisory | `legal@hookz.in` | Reviews notifications to Board, compliance approvals |
| **Communications Lead** | Operations Lead | `support@hookz.in` | Handles user support queues and communications distribution |

---

## 3. Severity & Classification Matrix

| Level | Severity | Description | Examples | Escalation SLA |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | **Critical** | Large-scale exfiltration or unauthorized exposure of user passwords, database credentials, or private messaging transcripts impacting > 500 users. | Full database dump leaked; service-role Supabase key compromised; unauthenticated API dumping all user tables. | Immediate (15 mins) |
| **P2** | **High** | Exposure of private personal data (resumes, private contact details, unpublished pitch decks) affecting 50 to 500 users. | Broken object level authorization (BOLA) exposing candidate resumes; unauthorized API access to user profiles. | Within 1 hour |
| **P3** | **Medium** | Isolated exposure of non-sensitive personal data or access token leakage affecting a small cohort (< 50 users). | Misconfigured log file containing session tokens; partial profile details visible to unauthorized peers. | Within 4 hours |
| **P4** | **Low** | Near-miss, localized vulnerability, or unauthorized attempt that was stopped before compromise occurred. | Blocked SQL injection probe; failed brute force attempt against rate-limited endpoints. | Within 24 hours |

---

## 4. Operational Step-by-Step Response Phases

### Phase 1: Discovery & Immediate Containment (Hours 0 – 4)
1. **Declare Incident:** Any engineer or staff member discovering a suspected breach alerts the Incident Commander via `incident@hookz.in` or internal high-priority alert.
2. **Isolate Affected Systems:**
   - Revoke compromised API keys (`SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, database connection credentials).
   - Invalidate active sessions by incrementing token versions or updating `JWT_SECRET`.
   - Block malicious IP ranges via Cloudflare / Render reverse proxy firewall.
3. **Evidence Preservation:**
   - Take read-only snapshots of server logs (`/var/log`, Render runtime logs).
   - Export Supabase Auth and database access logs.
   - Do NOT overwrite or delete server state until forensic disk/memory images are preserved.

### Phase 2: Technical Forensics & Impact Assessment (Hours 4 – 24)
1. Identify the root cause (e.g., misconfigured RLS policy, insecure endpoint, compromised administrator credential).
2. Determine exact personal data categories compromised:
   - Identifiers (Names, Email addresses, Usernames)
   - Credentials (Hashed passwords, Session tokens)
   - Builder data (Resumes, Contact details, Pitch decks, Direct messages)
3. Calculate the number of affected Data Principals (users).
4. Evaluate potential risks of harm (identity theft, phishing, unauthorized financial exposure, reputation harm).

### Phase 3: Statutory Intimation to the Data Protection Board of India (Within 72 Hours)
Pursuant to Section 8(6) of the DPDP Act 2023, the DPO transmits the official intimation to the **Data Protection Board of India (DPBI)** using the statutory notification template (Section 5 below).

### Phase 4: Notification to Affected Data Principals (Without Undue Delay)
1. Dispatch direct email notifications to each affected user's registered email address.
2. If account passwords or tokens were exposed, force a mandatory password reset on next authentication.
3. Display an advisory banner on the HookZ platform directing affected users to safety measures.

### Phase 5: Eradication, Remediation & Post-Incident Review (Days 4 – 30)
1. Patch the root-cause vulnerability in codebase; verify with automated test suites.
2. Re-test all sibling endpoints and RLS policies for identical vulnerability patterns.
3. Update `BREACH_RUNBOOK.md` and log lessons learned in `DPDP_PROGRESS.md`.
4. Retain all forensic artifacts, investigation reports, and correspondence with the DPBI for a minimum of 5 years.

---

## 5. Template Notification: Data Protection Board of India (DPBI)
*Must be submitted via the designated DPBI digital portal or official intimation email within 72 hours.*

```text
[LEGAL REVIEW REQUIRED]
FORM OF INTIMATION OF PERSONAL DATA BREACH
TO THE DATA PROTECTION BOARD OF INDIA
(Under Section 8(6) of the Digital Personal Data Protection Act, 2023)

1. DATA FIDUCIARY DETAILS:
   - Name of Data Fiduciary: HookZ Technologies Inc.
   - Platform / Domain: https://hookz.in / startupz
   - Registered Address: Mindspace Cyberabad, Hitech City, Hyderabad, Telangana 500081, India
   - Data Protection / Grievance Officer: Ruthwik Patel
   - Email: grievance@hookz.in / privacy@hookz.in

2. NATURE AND SCOPE OF THE PERSONAL DATA BREACH:
   - Date & Time of Occurrence: [YYYY-MM-DD HH:MM IST]
   - Date & Time of Discovery: [YYYY-MM-DD HH:MM IST]
   - Nature of Incident: [e.g., Unauthorised access / accidental exposure / external cyber attack]
   - Technical Vulnerability / Vector: [e.g., Exploit of API endpoint / Compromised credential]
   - Estimated Number of Affected Data Principals: [Insert number or range]

3. CATEGORIES OF PERSONAL DATA COMPROMISED:
   - [ ] Personal Identifiers (Full Name, Email Address, Username)
   - [ ] Authentication Data (Salted bcrypt password hashes / Session tokens)
   - [ ] Builder & Academic Details (College, Skills, Portfolio URLs)
   - [ ] Communication Records (Direct Messages, Application Notes, Proposals)
   - [ ] Resumes / Pitch Decks

4. POTENTIAL CONSEQUENCES & RISK OF HARM:
   - Assessment of potential harm to Data Principals: [e.g., Phishing risk, spam, confidentiality breach]
   - Likelihood of secondary misuse: [Low / Medium / High]

5. MITIGATION AND CONTAINMENT MEASURES IMPLEMENTED:
   - Technical containment actions taken within [X] hours of discovery:
     a) Compromised endpoint disabled / patched.
     b) Access credentials and JWT signing keys revoked and rotated.
     c) Mandatory session expiration enforced across all affected accounts.
   - Remediation patch deployed: [Commit hash / deployment version].

6. COMMUNICATION TO AFFECTED DATA PRINCIPALS:
   - Has intimation been provided to affected users? [Yes / In Progress]
   - Date and manner of notification: [Direct email to registered address on YYYY-MM-DD]
   - Remedial advice provided to users: [Password reset instructions, guidance on spotting phishing]

7. DECLARATION:
   I hereby declare that the particulars furnished above are true and complete to the best of my knowledge and belief.

   Name: Ruthwik Patel
   Designation: Data Protection & Grievance Officer
   Date: [YYYY-MM-DD]
```

---

## 6. Template Notification: Affected Data Principals (Users)
*Dispatched directly to the registered email address of every affected user.*

```text
[LEGAL REVIEW REQUIRED]
Subject: [Important Security Advisory] Notice of Personal Data Incident regarding your HookZ Account

Dear [User Name],

We are writing to inform you of a personal data security incident that may have affected your personal information on the HookZ platform (hookz.in). We take data privacy and security with utmost seriousness and are providing this notice in compliance with Section 8(6) of India's Digital Personal Data Protection Act, 2023 (DPDP Act).

1. WHAT HAPPENED?
On [Date of Discovery], our security monitoring detected an unauthorized incident involving [brief non-technical description, e.g., unauthorized access to an internal API / accidental exposure of profile records]. Upon detection, our engineering and security teams immediately contained the incident within [X] hours by securing the affected systems and rotating all access credentials.

2. WHAT DATA WAS INVOLVED?
Our forensic investigation confirmed that the affected information may have included:
- [List specific data items: e.g., Your full name, registered email address, public profile bio, and resume link].
Importantly, your actual account password was NOT stored in plain text and was protected by strong cryptographic hashing. However, out of an abundance of caution, we have initiated additional safeguards.

3. WHAT MEASURES HAVE WE TAKEN?
- We have completely resolved the underlying technical vulnerability and reinforced our database security controls.
- We have reported this incident to the Data Protection Board of India (DPBI) pursuant to our statutory duties.
- All active sessions for affected accounts have been invalidated to prevent any unauthorized access.

4. WHAT STEPS SHOULD YOU TAKE?
- If you use the same password on other websites, we strongly recommend updating your passwords immediately.
- Be vigilant against unsolicited communications, emails, or messages asking for personal information or credentials (phishing attempts). HookZ will never ask for your password via email or chat.

5. GRIEVANCE REDRESSAL & CONTACT:
If you have any questions, concerns, or wish to exercise your rights under the DPDP Act 2023 (including data access or deletion requests), please contact our designated Grievance Officer:

Ruthwik Patel
Data Protection & Grievance Officer
HookZ Technologies Inc.
Email: grievance@hookz.in / privacy@hookz.in
Address: Mindspace Cyberabad, Hitech City, Hyderabad, Telangana 500081, India
Response SLA: Within 48 hours

Sincerely,  
The HookZ Security & Trust Team  
HookZ Technologies Inc.
```

---

## 7. Mandatory Verification Checklist

- [ ] All P1/P2 incidents reported to Incident Commander within 15 minutes.
- [ ] Root cause identified and technical containment verified.
- [ ] Compromised access tokens / secrets rotated.
- [ ] DPBI notification submitted within 72 hours.
- [ ] CERT-In report submitted within 6 hours (if cyber incident threshold met).
- [ ] Affected users notified via verified email channel.
- [ ] Remediation pull request merged with non-regression tests.
- [ ] Forensic artifacts archived securely for audit purposes.
